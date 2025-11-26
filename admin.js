// Admin Panel JavaScript

// ==================== SABİTLER ====================
const CONSTANTS = {
  SESSION_TIMEOUT: 8 * 60 * 60 * 1000, // 8 saat (milisaniye)
  MOBILE_BREAKPOINT: 768, // px
  MODAL_ANIMATION_DURATION: 300, // ms
  ALERT_DISPLAY_DURATION: 3000, // ms
  MIN_PASSWORD_LENGTH: 6,
  MAX_ACTIVITIES: 20,
  RECENT_ACTIVITIES_LIMIT: 5
};

// ==================== DEĞİŞKENLER ====================
let currentMode = 'local'; // 'local' veya 'github'
let token = '';
let appsData = { apps: [], site: null };
let currentFeatures = [];
let currentSiteSection = 'header';
let usersData = []; // Kullanıcı verileri
let lastSessionCheck = 0; // Session kontrolü için throttle

// Şifre hash fonksiyonu
async function hashPassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

// Admin şifre hash (varsayılan: "admin123")
const ADMIN_PASSWORD_HASH = '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9';

// Admin giriş kontrolü
function checkAdminSession() {
  const adminSession = sessionStorage.getItem('adminSession');
  const adminLoginTime = sessionStorage.getItem('adminLoginTime');
  
  if (!adminSession || !adminLoginTime) {
    // Session yok - yönlendir
    redirectToLogin();
    return false;
  }
  
  const loginTime = parseInt(adminLoginTime);
  const currentTime = Date.now();
  
  if ((currentTime - loginTime) > CONSTANTS.SESSION_TIMEOUT) {
    // Session süresi dolmuş - temizle ve yönlendir
    sessionStorage.removeItem('adminSession');
    sessionStorage.removeItem('adminLoginTime');
    sessionStorage.removeItem('adminLastActivity');
    sessionStorage.removeItem('adminUsername');
    sessionStorage.removeItem('adminRole');
    redirectToLogin();
    return false;
  }
  
  return true;
}

// Login sayfasına yönlendir
function redirectToLogin() {
  // Eğer zaten login sayfasındaysak yönlendirme yapma
  if (window.location.pathname.includes('admin-login.html')) {
    return;
  }
  
  // Session timeout mesajı göster
  const message = 'Oturum süreniz dolmuş. Lütfen tekrar giriş yapın.';
  sessionStorage.setItem('sessionTimeoutMessage', message);
  
  // Login sayfasına yönlendir (replace kullanarak history'yi temizle)
  window.location.replace('/admin-login.html');
}

// Admin giriş formunu göster/gizle
function toggleAdminLoginForm() {
  const hasSession = checkAdminSession();
  const passwordForm = document.getElementById('passwordLoginForm');
  const dataLoadSection = document.getElementById('dataLoadSection');
  const loginSection = document.getElementById('adminLoginSection');
  const logoutBtn = document.getElementById('logoutBtn');
  
  if (hasSession) {
    // Session var - login section'ı gizle, logout butonunu göster
    if (loginSection) loginSection.classList.add('hidden');
    if (passwordForm) passwordForm.classList.add('hidden');
    if (dataLoadSection) dataLoadSection.classList.add('hidden');
    if (logoutBtn) logoutBtn.classList.remove('hidden');
    // Mobile menu logout butonunu da göster
    const topbarMenuLogoutBtn = document.getElementById('topbarMenuLogoutBtn');
    if (topbarMenuLogoutBtn) topbarMenuLogoutBtn.classList.remove('hidden');
  } else {
    // Session yok - login section'ı göster, logout butonunu gizle
    if (loginSection) loginSection.classList.remove('hidden');
    if (passwordForm) passwordForm.classList.remove('hidden');
    if (dataLoadSection) dataLoadSection.classList.add('hidden');
    if (logoutBtn) logoutBtn.classList.add('hidden');
    // Mobile menu logout butonunu da gizle
    const topbarMenuLogoutBtn = document.getElementById('topbarMenuLogoutBtn');
    if (topbarMenuLogoutBtn) topbarMenuLogoutBtn.classList.add('hidden');
  }
}

// Admin şifre girişi
async function handleAdminLogin() {
  const passwordInput = document.getElementById('adminPassword');
  const errorMessage = document.getElementById('adminPasswordError');
  const loginBtn = document.getElementById('adminLoginBtn');
  
  if (!passwordInput || !errorMessage || !loginBtn) return;
  
  const password = passwordInput.value.trim();
  
  // Validasyon
  if (!password || password.length === 0) {
    errorMessage.textContent = '⚠️ Lütfen şifrenizi girin.';
    passwordInput.classList.add('error');
    passwordInput.focus();
    return;
  }
  
  // Loading state
  loginBtn.disabled = true;
  const originalText = loginBtn.querySelector('span')?.textContent || '🔐 Admin Girişi';
  loginBtn.querySelector('span').textContent = '⏳ Kontrol ediliyor...';
  errorMessage.textContent = '';
  passwordInput.classList.remove('error');
  
  try {
    // Kullanıcıları yükle
    loadUsers();
    
    // Şifreyi hash'le
    const hashedPassword = await hashPassword(password);
    
    // Kullanıcıları kontrol et (önce kullanıcı adı ile, sonra varsayılan admin şifresi ile)
    let authenticatedUser = null;
    
    // Önce kullanıcı listesinde ara
    authenticatedUser = usersData.find(user => user.passwordHash === hashedPassword);
    
    // Bulunamazsa ve usersData içinde admin kullanıcısı yoksa, varsayılan admin şifresini kontrol et
    // Eğer admin kullanıcısı zaten varsa, varsayılan şifre ile giriş yapıldığında şifresini güncelle
    if (!authenticatedUser) {
      const adminUserExists = usersData.find(user => user.username === 'admin');
      
      if (hashedPassword === ADMIN_PASSWORD_HASH) {
        // Varsayılan şifre ile giriş yapılıyor
        if (!adminUserExists) {
          // Admin kullanıcısı yok - yeni admin kullanıcısı oluştur
          authenticatedUser = {
            id: Date.now().toString(),
            username: 'admin',
            email: 'admin@example.com',
            passwordHash: ADMIN_PASSWORD_HASH,
            role: 'admin',
            createdAt: new Date().toISOString(),
            lastLogin: null
          };
          usersData.push(authenticatedUser);
          saveUsers();
          console.log('✅ Yeni admin kullanıcısı oluşturuldu (varsayılan şifre ile)');
        } else {
          // Admin kullanıcısı var ama şifre eşleşmiyor - varsayılan şifre ile giriş yapıldığında şifresini güncelle
          console.log('⚠️ Admin kullanıcısı mevcut ama şifre eşleşmiyor - varsayılan şifre ile güncelleniyor');
          adminUserExists.passwordHash = ADMIN_PASSWORD_HASH;
          usersData = usersData.map(user => 
            user.username === 'admin' ? adminUserExists : user
          );
          saveUsers();
          authenticatedUser = adminUserExists;
          console.log('✅ Admin kullanıcısı şifresi varsayılan şifre ile güncellendi');
        }
      } else if (adminUserExists) {
        // Admin kullanıcısı var ama şifre eşleşmiyor ve varsayılan şifre değil - hata
        console.log('❌ Admin kullanıcısı mevcut ama şifre eşleşmiyor');
        console.log('💡 İpucu: Varsayılan şifre "admin123" ile giriş yaparak şifrenizi sıfırlayabilirsiniz');
      }
    }
    
    if (authenticatedUser) {
      // Başarılı giriş - session oluştur
      const sessionToken = btoa(Date.now().toString() + Math.random().toString() + Math.random().toString());
      sessionStorage.setItem('adminSession', sessionToken);
      sessionStorage.setItem('adminLoginTime', Date.now().toString());
      sessionStorage.setItem('adminLastActivity', Date.now().toString());
      sessionStorage.setItem('adminUsername', authenticatedUser.username);
      sessionStorage.setItem('adminRole', authenticatedUser.role);
      
      // Son giriş zamanını güncelle
      authenticatedUser.lastLogin = new Date().toISOString();
      saveUsers();
      
      // Başarı mesajı
      loginBtn.querySelector('span').textContent = '✅ Başarılı!';
      loginBtn.style.background = 'linear-gradient(135deg, #00c853 0%, #00a043 100%)';
      
      // Form'u güncelle
      setTimeout(() => {
        toggleAdminLoginForm();
        passwordInput.value = '';
        loginBtn.querySelector('span').textContent = originalText;
        loginBtn.style.background = '';
        loginBtn.disabled = false;
        
        // Login section'ı gizle
        const loginSection = document.getElementById('adminLoginSection');
        if (loginSection) {
          loginSection.classList.add('hidden');
        }
        
        // Verileri yükle
        autoLogin();
      }, 800);
    } else {
      // Hatalı şifre
      errorMessage.textContent = '❌ Hatalı şifre! Lütfen tekrar deneyin.';
      passwordInput.classList.add('error');
      passwordInput.value = '';
      passwordInput.focus();
      loginBtn.querySelector('span').textContent = originalText;
      loginBtn.disabled = false;
      passwordInput.style.animation = 'shake 0.5s';
      setTimeout(() => { passwordInput.style.animation = ''; }, 500);
    }
  } catch (error) {
    console.error('Giriş hatası:', error);
    errorMessage.textContent = '❌ Bir hata oluştu. Lütfen tekrar deneyin.';
    loginBtn.querySelector('span').textContent = originalText;
    loginBtn.disabled = false;
  }
}

// Şifre göster/gizle ikonları
const PASSWORD_ICONS = {
  visible: '<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line>',
  hidden: '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle>'
};

// Şifre göster/gizle (genel fonksiyon)
function togglePasswordVisibility(inputId, iconId) {
  const passwordInput = document.getElementById(inputId);
  const eyeIcon = document.getElementById(iconId);
  
  if (!passwordInput || !eyeIcon) return;
  
  if (passwordInput.type === 'password') {
    passwordInput.type = 'text';
    eyeIcon.innerHTML = PASSWORD_ICONS.visible;
  } else {
    passwordInput.type = 'password';
    eyeIcon.innerHTML = PASSWORD_ICONS.hidden;
  }
}

// Şifre göster/gizle (admin login)
function toggleAdminPassword() {
  togglePasswordVisibility('adminPassword', 'adminEyeIcon');
}

// Section yönetimi
function showSection(section) {
  // Tüm section'ları gizle
  document.querySelectorAll('.admin-section').forEach(sec => {
    sec.classList.add('hidden');
  });
  
  // Seçilen section'ı göster (section ID'sini oluştur)
  let sectionId = section + 'Section';
  if (section === 'ai-settings') {
    sectionId = 'aiSettingsSection';
  }
  
  const targetSection = document.getElementById(sectionId);
  if (targetSection) {
    targetSection.classList.remove('hidden');
  }
  
  // Tüm nav item'ları pasif yap ve seçileni aktif yap (hash-based routing için)
  document.querySelectorAll('.admin-nav-item').forEach(item => {
    item.classList.remove('active');
    // Hash-based link kontrolü
    const href = item.getAttribute('href');
    const dataSection = item.getAttribute('data-section');
    if (href === `#${section}` || dataSection === section) {
      item.classList.add('active');
    }
  });
  
  // Kullanıcılar bölümüne geçildiğinde listeyi yenile
  if (section === 'users') {
    renderUsers();
  }
  
  // Geri bildirimler bölümüne geçildiğinde listeyi yenile
  if (section === 'feedback') {
    renderFeedback();
    renderVotes();
  }
  
  // Bildirim ayarları bölümüne geçildiğinde config'i yükle
  if (section === 'notifications') {
    loadNotificationsConfig();
    // appsData yüklenmesini bekle, sonra dropdown'ı doldur
    setTimeout(() => {
      populateAppNotificationSelect();
      renderActiveNotifications();
    }, 100);
    // Süre tipi değişikliği için event listener ekle
    const durationTypeEl = document.getElementById('notification_duration_type');
    if (durationTypeEl) {
      durationTypeEl.addEventListener('change', onNotificationDurationTypeChange);
    }
  }
  
  // Dashboard'a geçildiğinde istatistikleri güncelle ve önizlemeyi yenile
  if (section === 'dashboard') {
    updateStats();
    // Önizlemeyi otomatik yenile (dashboard'a geçildiğinde)
    setTimeout(() => {
      refreshPreview(false);
    }, 500);
  }
  
  // Mobile'da sidebar'ı kapat
  if (window.innerWidth <= CONSTANTS.MOBILE_BREAKPOINT) {
    closeSidebar();
  }
  
  // Hash-based routing kullan (GitHub Pages uyumlu)
  const currentHash = window.location.hash.replace('#', '');
  const newHash = section;
  
  // Hash değişikliği sadece gerekirse yap
  if (currentHash !== newHash) {
    window.location.hash = newHash;
  }
}

// Hash-based routing: URL'den section'ı oku (GitHub Pages uyumlu)
function getSectionFromPath() {
  // Önce hash'i kontrol et (öncelikli)
  const hash = window.location.hash.replace('#', '');
  if (hash) {
    return hash;
  }
  
  // Hash yoksa path'ten oku (geriye dönük uyumluluk)
  const path = window.location.pathname;
  const pathMatch = path.match(/\/admin\/([^\/]+)/);
  if (pathMatch) {
    // Path'ten section bulundu, hash'e çevir
    const section = pathMatch[1];
    window.location.hash = section;
    return section;
  }
  
  // Varsayılan olarak dashboard
  return 'dashboard';
}

// Sidebar state kontrolü
function isSidebarOpen() {
  const sidebar = document.getElementById('adminSidebar');
  return sidebar && sidebar.classList.contains('open');
}

// Sidebar toggle (Mobile) - Basit versiyon
function toggleSidebar() {
  const sidebar = document.getElementById('adminSidebar');
  const overlay = document.getElementById('adminSidebarOverlay');
  const hamburger = document.getElementById('hamburgerMenuBtn') || document.getElementById('topbarMenuBtn');
  
  if (!sidebar || !overlay) {
    console.error('❌ Sidebar veya overlay bulunamadı');
    return;
  }
  
  const isOpen = sidebar.classList.contains('open');
  
  if (isOpen) {
    // Sidebar açık - kapat
    sidebar.classList.remove('open');
    overlay.classList.remove('active');
    document.body.style.overflow = '';
    document.body.classList.remove('sidebar-open');
    
    // Hamburger butonunu güncelle
    if (hamburger) {
      hamburger.classList.remove('active');
    }
  } else {
    // Sidebar kapalı - aç
    sidebar.classList.add('open');
    overlay.classList.add('active');
    document.body.style.overflow = 'hidden';
    document.body.classList.add('sidebar-open');
    
    // Hamburger butonunu güncelle
    if (hamburger) {
      hamburger.classList.add('active');
    }
  }
}

// Global scope'a ekle (HTML onclick için)
if (typeof window !== 'undefined') {
  window.toggleSidebar = toggleSidebar;
  window.openSidebar = openSidebar;
  window.closeSidebar = closeSidebar;
  console.log('✅ toggleSidebar global scope\'a eklendi');
}

// Sidebar'ı aç
function openSidebar() {
  const sidebar = document.getElementById('adminSidebar');
  const overlay = document.getElementById('adminSidebarOverlay');
  const hamburger = document.getElementById('hamburgerMenuBtn') || document.getElementById('topbarMenuBtn');
  
  if (sidebar && overlay) {
    if (!sidebar.classList.contains('open')) {
      sidebar.classList.add('open');
      overlay.classList.add('active');
      document.body.style.overflow = 'hidden';
      document.body.classList.add('sidebar-open');
      
      if (hamburger) {
        hamburger.classList.add('active');
      }
    }
  }
}

// Sidebar'ı kapat (dışarıdan çağrılabilir)
function closeSidebar() {
  const sidebar = document.getElementById('adminSidebar');
  const overlay = document.getElementById('adminSidebarOverlay');
  const hamburger = document.getElementById('hamburgerMenuBtn') || document.getElementById('topbarMenuBtn');
  
  if (sidebar && overlay) {
    sidebar.classList.remove('open');
    overlay.classList.remove('active');
    document.body.style.overflow = '';
    document.body.classList.remove('sidebar-open');
    
    if (hamburger) {
      hamburger.classList.remove('active');
    }
  }
}

// ESC tuşu ile sidebar'ı kapat
document.addEventListener('keydown', function(e) {
  // ESC tuşu basıldığında sidebar açıksa kapat
  if (e.key === 'Escape' && isSidebarOpen()) {
    closeSidebar();
  }
});

// Topbar Menu Toggle (Mobile)
function toggleTopbarMenu() {
  const modal = document.getElementById('topbarMenuModal');
  const overlay = document.getElementById('topbarMenuOverlay');
  const menuBtn = document.getElementById('topbarMenuBtn');
  
  if (modal && overlay) {
    const isOpen = modal.classList.toggle('active');
    overlay.classList.toggle('active');
    
    // Body scroll lock
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      document.body.classList.add('topbar-menu-open');
    } else {
      document.body.style.overflow = '';
      document.body.classList.remove('topbar-menu-open');
    }
    
    // Menu button active state
    if (menuBtn) {
      menuBtn.classList.toggle('active');
    }
  }
}

// Topbar Menu'yu kapat
function closeTopbarMenu() {
  const modal = document.getElementById('topbarMenuModal');
  const overlay = document.getElementById('topbarMenuOverlay');
  const menuBtn = document.getElementById('topbarMenuBtn');
  
  if (modal && overlay) {
    modal.classList.remove('active');
    overlay.classList.remove('active');
    document.body.style.overflow = '';
    document.body.classList.remove('topbar-menu-open');
    
    if (menuBtn) {
      menuBtn.classList.remove('active');
    }
  }
}

// Hamburger menü event listener'larını ekle (her zaman çalışmalı)
let hamburgerMenuSetup = false; // Çift event listener eklenmesini önle

function setupHamburgerMenu() {
  const sidebar = document.getElementById('adminSidebar');
  const overlay = document.getElementById('adminSidebarOverlay');
  const hamburger = document.getElementById('hamburgerMenuBtn') || document.getElementById('topbarMenuBtn');
  
  if (!sidebar || !overlay) {
    console.warn('⚠️ Sidebar veya overlay bulunamadı');
    return;
  }
  
  // Çift event listener eklenmesini önle
  if (hamburgerMenuSetup) {
    return;
  }
  
  // Hamburger butonuna event listener ekle
  if (hamburger) {
    hamburger.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      toggleSidebar();
    });
  }
  
  // Overlay'e tıklandığında sidebar'ı kapat (sadece kapat, toggle değil)
  overlay.addEventListener('click', (e) => {
    // Overlay'e tıklandığında sidebar'ı kapat
    if (sidebar.classList.contains('open')) {
      e.preventDefault();
      e.stopPropagation();
      closeSidebar();
    }
  });
  
  hamburgerMenuSetup = true;
}

// Sayfa yüklendiğinde otomatik giriş (LocalStorage modunda)
document.addEventListener('DOMContentLoaded', () => {
  console.log('📄 DOMContentLoaded event tetiklendi');
  // Hamburger menü event listener'larını hemen ekle (session kontrolünden önce)
  // Biraz gecikme ile ekle ki DOM tamamen yüklensin
  setTimeout(() => {
    console.log('⏱️ setupHamburgerMenu çağrılıyor (100ms gecikme ile)');
    setupHamburgerMenu();
    // Global scope'a toggleSidebar'ı ekle (js/admin-ui.js'den sonra override et)
    if (typeof window !== 'undefined') {
      window.toggleSidebar = toggleSidebar;
      window.openSidebar = openSidebar;
      window.closeSidebar = closeSidebar;
      console.log('✅ toggleSidebar admin.js versiyonu ile override edildi');
    }
  }, 100);
  
  // Önce session kontrolü yap - eğer timeout varsa yönlendir
  if (!checkAdminSession()) {
    return; // checkAdminSession içinde yönlendirme yapıldı
  }
  
  // Admin giriş formunu kontrol et
  toggleAdminLoginForm();
  
  // Path'den section'ı oku ve göster
  const section = getSectionFromPath();
  if (section) {
    showSection(section);
  }
  
  // Browser back/forward butonları için (hash-based routing)
  window.addEventListener('hashchange', (e) => {
    const section = getSectionFromPath();
    if (section) {
      // showSection'ı çağırmadan sadece section'ı göster (sonsuz döngüyü önle)
      let sectionId = section + 'Section';
      if (section === 'ai-settings') {
        sectionId = 'aiSettingsSection';
      }
      
      const sectionEl = document.getElementById(sectionId);
      if (sectionEl) {
        // Tüm section'ları gizle
        document.querySelectorAll('.admin-section').forEach(sec => {
          sec.classList.add('hidden');
        });
        // Seçilen section'ı göster
        sectionEl.classList.remove('hidden');
        
        // Nav item'ları güncelle
        document.querySelectorAll('.admin-nav-item').forEach(item => {
          item.classList.remove('active');
        });
        // Nav item'ı aktif yap (hash-based routing için)
        document.querySelectorAll('.admin-nav-item').forEach(item => {
          const href = item.getAttribute('href');
          const dataSection = item.getAttribute('data-section');
          if (href === `#${section}` || dataSection === section) {
            item.classList.add('active');
          }
        });
        
        // Section'a özel işlemler
        if (section === 'users') {
          renderUsers();
        } else if (section === 'feedback') {
          renderFeedback();
          renderVotes();
        } else if (section === 'notifications') {
          loadNotificationsConfig();
          // appsData yüklenmesini bekle, sonra dropdown'ı doldur
          // Önce appsData'nın yüklendiğinden emin ol
          if (!appsData || !appsData.apps || appsData.apps.length === 0) {
            const saved = localStorage.getItem('appsData');
            if (saved) {
              try {
                appsData = JSON.parse(saved);
              } catch (e) {
                console.error('LocalStorage\'dan appsData parse edilemedi:', e);
              }
            }
          }
          setTimeout(() => {
            populateAppNotificationSelect();
            renderActiveNotifications();
          }, 200);
          // Süre tipi değişikliği için event listener ekle
          const durationTypeEl = document.getElementById('notification_duration_type');
          if (durationTypeEl) {
            durationTypeEl.addEventListener('change', onNotificationDurationTypeChange);
          }
        } else if (section === 'dashboard') {
          updateStats();
          setTimeout(() => {
            refreshPreview(false);
          }, 500);
        }
      }
    }
  });
  
  // Session varsa verileri yükle
  if (checkAdminSession()) {
    // LocalStorage modunda otomatik giriş yap
    if (localStorage.getItem('appsData')) {
      autoLogin();
    } else {
      // İlk kez, apps.json'dan yükle
      const dataPath = '/data/apps.json';
      fetch(dataPath)
        .then(res => res.json())
        .then(data => {
          appsData = data;
          saveToLocal();
          autoLogin();
        })
        .catch(() => {
          appsData = { apps: [] };
        });
    }
  }
  
  // Enter tuşu ile admin girişi
  const adminPasswordInput = document.getElementById('adminPassword');
  if (adminPasswordInput) {
    adminPasswordInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        handleAdminLogin();
      }
    });
  }
  
  // Hamburger menü event listener'larını tekrar ekle (güvenlik için)
  setupHamburgerMenu();
  
  // Sidebar linklerine click event listener ekle (hash-based routing için)
  document.querySelectorAll('.admin-nav-item[href^="#"]').forEach(link => {
    link.addEventListener('click', (e) => {
      const href = link.getAttribute('href');
      if (href && href.startsWith('#')) {
        const section = href.replace('#', '');
        // Hash değişikliği otomatik olarak hashchange event'ini tetikleyecek
        // Ancak preventDefault yapmıyoruz, böylece hash değişikliği normal şekilde çalışır
        // showSection fonksiyonu hashchange event'inde çağrılacak
      }
    });
  });
  
  // Hızlı işlemler linklerine click event listener ekle
  document.querySelectorAll('.admin-nav-item[data-action]').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const action = link.getAttribute('data-action');
      if (action === 'showAddForm' && typeof showAddForm === 'function') {
        showAddForm();
      } else if (action === 'exportData' && typeof exportData === 'function') {
        exportData();
      } else if (action === 'importData' && typeof importData === 'function') {
        importData();
      }
    });
  });
});

// Otomatik giriş (event olmadan)
function autoLogin() {
  const saved = localStorage.getItem('appsData');
  if (saved) {
    appsData = JSON.parse(saved);
  } else {
    // İlk kez, apps.json'dan yükle
    const dataPath = '/data/apps.json';
    const sitePath = '/data/site.json';
    fetch(dataPath)
      .then(res => res.json())
      .then(data => {
        appsData = data;
        if (!appsData.site) {
          // Eski format, site verisi yok, site.json'dan yükle
          fetch(sitePath)
            .then(res => res.json())
            .then(siteData => {
              appsData.site = siteData.site;
              saveToLocal();
            })
            .catch(() => {
              // Site.json yoksa varsayılan değerler
              appsData.site = getDefaultSiteData();
            });
        }
        saveToLocal();
      })
      .catch(() => {
        appsData = { apps: [], site: getDefaultSiteData() };
      });
  }
  
  const tokenInput = document.getElementById('token');
  if (tokenInput) {
    tokenInput.disabled = currentMode === 'local';
  }
  
  updateStats();
  renderApps();
  // Bildirim ayarları bölümündeyse dropdown'ı da güncelle
  const notificationsSection = document.getElementById('notificationsSection');
  if (notificationsSection && !notificationsSection.classList.contains('hidden')) {
    populateAppNotificationSelect();
    renderActiveNotifications();
  }
}

// Varsayılan site verisi
function getDefaultSiteData() {
  return {
    header: { logo: "Bambinifojo", tagline: "Mobil Uygulama Geliştirici" },
    hero: {
      title: "Bambinifojo",
      tagline: "Android cihazlar için güzel ve kullanımı kolay arayüzlere sahip uygulamalar geliştiriyoruz",
      playStoreUrl: "https://play.google.com/store/apps/developer?id=Bambinifojo",
      stats: [
        { number: "2+", label: "Uygulama" },
        { number: "100%", label: "Kalite" },
        { number: "∞", label: "İnovasyon" }
      ]
    },
    about: {
      title: "Hakkımda",
      texts: [
        "Bağımsız bir mobil uygulama geliştiricisiyim. Android, Flutter, Firebase ve oyun motorları ile uygulamalar ve mini oyunlar geliştiriyorum.",
        "Amacım, herkesin kolayca kullanabileceği sade ve işlevsel deneyimler oluşturmak."
      ],
      technologies: [
        { icon: "🤖", name: "Android" },
        { icon: "🎨", name: "Flutter" },
        { icon: "🔥", name: "Firebase" },
        { icon: "🎮", name: "Oyun Motorları" }
      ]
    },
    skills: {
      title: "Teknolojiler & Yetenekler",
      items: [
        { name: "Android Development", icon: "🤖", level: 90 },
        { name: "Flutter", icon: "🎨", level: 85 },
        { name: "Firebase", icon: "🔥", level: 80 },
        { name: "UI/UX Design", icon: "✨", level: 75 },
        { name: "Game Development", icon: "🎮", level: 70 },
        { name: "Backend Development", icon: "⚙️", level: 65 }
      ]
    },
    contact: {
      title: "İletişim",
      subtitle: "Projeleriniz veya işbirliği için benimle iletişime geçebilirsiniz",
      items: [
        {
          type: "email",
          icon: "📧",
          title: "E-posta",
          value: "bambinifojo@gmail.com",
          link: "mailto:bambinifojo@gmail.com",
          description: "En hızlı yanıt için e-posta gönderebilirsiniz"
        },
        {
          type: "github",
          icon: "💻",
          title: "GitHub",
          value: "github.com/Bambinifojo",
          link: "https://github.com/Bambinifojo",
          description: "Açık kaynak projelerimi inceleyebilirsiniz"
        },
        {
          type: "portfolio",
          icon: "🌐",
          title: "Portfolio",
          value: "bambinifojo.github.io",
          link: "https://bambinifojo.netlify.app",
          description: "Web sitemi ziyaret ederek daha fazla bilgi alın"
        }
      ]
    }
  };
}

// Mode değiştirme
function setMode(mode) {
  currentMode = mode;
  document.getElementById('localModeBtn').classList.toggle('active', mode === 'local');
  document.getElementById('githubModeBtn').classList.toggle('active', mode === 'github');
  const saveGitHubBtn = document.getElementById('saveGitHubBtn');
  if (saveGitHubBtn) {
    if (mode === 'github') {
      saveGitHubBtn.classList.remove('hidden');
    } else {
      saveGitHubBtn.classList.add('hidden');
    }
  }
}

// Giriş
async function login() {
  if (currentMode === 'github') {
    token = document.getElementById('token').value.trim();
    if (!token) {
      alert('GitHub Token girin!');
      return;
    }
    try {
      await loadFromGitHub();
    } catch (error) {
      alert('GitHub\'dan veri yüklenirken hata: ' + error.message);
      return;
    }
  } else {
    // LocalStorage'dan yükle
    const saved = localStorage.getItem('appsData');
    if (saved) {
      appsData = JSON.parse(saved);
    } else {
      // İlk kez, data/apps.json'dan yükle
      try {
        const dataPath = '/data/apps.json';
        const sitePath = '/data/site.json';
        const res = await fetch(dataPath);
        appsData = await res.json();
        if (!appsData.site) {
          // Site verisi yoksa site.json'dan yükle
          try {
            const siteRes = await fetch(sitePath);
            const siteData = await siteRes.json();
            appsData.site = siteData.site;
          } catch {
            appsData.site = getDefaultSiteData();
          }
        }
        saveToLocal();
      } catch (error) {
        console.error('Veri yüklenirken hata:', error);
        appsData = { apps: [], site: getDefaultSiteData() };
      }
    }
  }

  // Giriş yapıldı, butonları güncelle
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.classList.remove('hidden');
    // Mobile menu logout butonunu da göster
    const topbarMenuLogoutBtn = document.getElementById('topbarMenuLogoutBtn');
    if (topbarMenuLogoutBtn) topbarMenuLogoutBtn.classList.remove('hidden');
  }
  const loginSection = document.getElementById('adminLoginSection');
  if (loginSection) {
    loginSection.classList.add('hidden');
  }
  const tokenInput = document.getElementById('token');
  if (tokenInput) {
    tokenInput.disabled = currentMode === 'local';
  }
  
  // Dashboard'u göster
  showSection('dashboard');
  
  updateStats();
  renderApps();
  
  // Bildirim bölümündeyse dropdown'ı da güncelle
  setTimeout(() => {
    populateAppNotificationSelect();
    renderActiveNotifications();
  }, 100);
  
  // Başarı mesajı
  const btn = document.querySelector('button[onclick="login()"]');
  if (btn) {
    const originalText = btn.innerHTML;
    btn.innerHTML = '<span>✅ Başarılı!</span>';
    btn.style.background = '#00c853';
    setTimeout(() => {
      btn.innerHTML = originalText;
      btn.style.background = '';
    }, 2000);
  }
}

// Çıkış
function logout() {
  if (confirm('Çıkış yapmak istediğinize emin misiniz?')) {
    // Tüm sessionStorage'ı temizle (auth ile ilgili tüm veriler)
    sessionStorage.removeItem('adminSession');
    sessionStorage.removeItem('adminLoginTime');
    sessionStorage.removeItem('adminLastActivity');
    sessionStorage.removeItem('adminUsername');
    sessionStorage.removeItem('adminRole');
    sessionStorage.removeItem('sessionTimeoutMessage');
    
    // localStorage'dan auth ile ilgili verileri temizle
    // Not: appsData, adminUsers gibi veriler kalabilir (opsiyonel - isterseniz bunları da temizleyebilirsiniz)
    // localStorage.removeItem('appsData');
    // localStorage.removeItem('adminUsers');
    // localStorage.removeItem('adminActivities');
    
    // Login ekranına yönlendir (replace kullanarak history'yi temizle)
    // admin-login.html kullan (redirectToLogin ile tutarlı)
    window.location.replace('/admin-login.html');
  }
}

// GitHub'dan yükle
async function loadFromGitHub() {
  const repo = 'bambinifojo.github.io';
  const user = 'bambinifojo';
  const path = 'data/apps.json';

  const res = await fetch(`https://api.github.com/repos/${user}/${repo}/contents/${path}`, {
    headers: { Authorization: `token ${token}` }
  });

  if (!res.ok) {
    throw new Error('GitHub API hatası: ' + res.status);
  }

  const json = await res.json();
  const content = atob(json.content);
  appsData = JSON.parse(content);
  
  // Site verisi yoksa varsayılan değerler ekle
  if (!appsData.site) {
    appsData.site = getDefaultSiteData();
  }
  
  window.githubSha = json.sha;
}

// GitHub'a kaydet
async function saveToGitHub() {
  if (currentMode !== 'github') {
    alert('GitHub modunda değilsiniz!');
    return;
  }

  if (!token) {
    alert('Token gerekli!');
    return;
  }

  const repo = 'bambinifojo.github.io';
  const user = 'bambinifojo';
  const path = 'data/apps.json';

  try {
    // Önce mevcut SHA'yı al
    if (!window.githubSha) {
      await loadFromGitHub();
    }

    const res = await fetch(`https://api.github.com/repos/${user}/${repo}/contents/${path}`, {
      method: 'PUT',
      headers: {
        Authorization: `token ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: 'Admin panelinden site ve uygulama verileri güncellendi',
        content: btoa(JSON.stringify(appsData, null, 2)),
        sha: window.githubSha
    })
  });

    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.message || 'Kayıt başarısız');
    }

    // SHA'yı güncelle
    const result = await res.json();
    window.githubSha = result.content.sha;

    showAlert('✅ Kaydedildi!', 'success');
    await loadFromGitHub();
    updateStats();
    renderApps();
  } catch (error) {
    alert('❌ Hata: ' + error.message);
  }
}

// LocalStorage'a kaydet
function saveToLocal() {
  localStorage.setItem('appsData', JSON.stringify(appsData));
}

// İstatistikleri güncelle
function updateStats() {
  const total = appsData.apps.length;
  const published = appsData.apps.filter(app => app.details && app.details !== '#').length;
  const comingSoon = total - published;

  // Ortalama rating hesapla
  const ratings = appsData.apps.map(app => parseFloat(app.rating) || 0).filter(r => r > 0);
  const avgRating = ratings.length > 0 
    ? (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1)
    : '0.0';

  const totalAppsEl = document.getElementById('totalApps');
  const publishedAppsEl = document.getElementById('publishedApps');
  const comingSoonAppsEl = document.getElementById('comingSoonApps');
  const avgRatingEl = document.getElementById('avgRating');
  const appsCountEl = document.getElementById('appsCount');
  
  if (totalAppsEl) {
    totalAppsEl.textContent = total;
    animateValue(totalAppsEl, 0, total, 500);
  }
  if (publishedAppsEl) {
    publishedAppsEl.textContent = published;
    animateValue(publishedAppsEl, 0, published, 500);
  }
  if (comingSoonAppsEl) {
    comingSoonAppsEl.textContent = comingSoon;
    animateValue(comingSoonAppsEl, 0, comingSoon, 500);
  }
  if (avgRatingEl) {
    avgRatingEl.textContent = avgRating;
  }
  if (appsCountEl) {
    appsCountEl.textContent = `(${total} uygulama)`;
  }
  
  // Trend göstergeleri (basit animasyon)
  updateTrends();
  
  // Grafikleri güncelle
  updateCharts();
  
  // Play Store entegrasyonu
  updatePlayStoreApps();
  
  // Son aktiviteler
  updateRecentActivities();
}

// Sayı animasyonu
function animateValue(element, start, end, duration) {
  const startTime = performance.now();
  const isFloat = parseFloat(end) % 1 !== 0;
  
  function update(currentTime) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const current = start + (end - start) * progress;
    
    if (isFloat) {
      element.textContent = current.toFixed(1);
    } else {
      element.textContent = Math.floor(current);
    }
    
    if (progress < 1) {
      requestAnimationFrame(update);
    } else {
      if (isFloat) {
        element.textContent = parseFloat(end).toFixed(1);
      } else {
        element.textContent = end;
      }
    }
  }
  
  requestAnimationFrame(update);
}

// Trend göstergeleri
function updateTrends() {
  // Basit trend gösterimi (ileride daha gelişmiş olabilir)
  const totalTrend = document.getElementById('totalAppsTrend');
  if (totalTrend) {
    totalTrend.className = 'stat-card-trend neutral';
    totalTrend.innerHTML = '<span>📊 Toplam</span>';
  }
  
  const publishedTrend = document.getElementById('publishedAppsTrend');
  if (publishedTrend) {
    publishedTrend.className = 'stat-card-trend up';
    publishedTrend.innerHTML = '<span>↑ Yayında</span>';
  }
  
  const comingSoonTrend = document.getElementById('comingSoonAppsTrend');
  if (comingSoonTrend) {
    comingSoonTrend.className = 'stat-card-trend neutral';
    comingSoonTrend.innerHTML = '<span>⏳ Beklemede</span>';
  }
  
  const ratingTrend = document.getElementById('avgRatingTrend');
  if (ratingTrend) {
    ratingTrend.className = 'stat-card-trend up';
    ratingTrend.innerHTML = '<span>⭐ Ortalama</span>';
  }
}

// Grafikleri güncelle
function updateCharts() {
  // Kategori dağılımı
  const categories = {};
  appsData.apps.forEach(app => {
    const cat = app.category || 'Diğer';
    categories[cat] = (categories[cat] || 0) + 1;
  });
  
  renderCategoryChart(categories);
  
  // Rating dağılımı
  const ratingRanges = {
    '5.0': 0,
    '4.0-4.9': 0,
    '3.0-3.9': 0,
    '2.0-2.9': 0,
    '1.0-1.9': 0
  };
  
  appsData.apps.forEach(app => {
    const rating = parseFloat(app.rating) || 0;
    if (rating >= 5.0) ratingRanges['5.0']++;
    else if (rating >= 4.0) ratingRanges['4.0-4.9']++;
    else if (rating >= 3.0) ratingRanges['3.0-3.9']++;
    else if (rating >= 2.0) ratingRanges['2.0-2.9']++;
    else if (rating >= 1.0) ratingRanges['1.0-1.9']++;
  });
  
  renderRatingChart(ratingRanges);
}

// Kategori grafiği
function renderCategoryChart(categories) {
  const container = document.getElementById('categoryChart');
  if (!container) return;
  
  const entries = Object.entries(categories).sort((a, b) => b[1] - a[1]);
  if (entries.length === 0) {
    container.innerHTML = '<p style="color: #6b7280; text-align: center; padding: 40px;">Henüz kategori yok</p>';
    return;
  }
  
  const maxValue = Math.max(...entries.map(e => e[1]));
  
  container.innerHTML = entries.map(([category, count]) => {
    const percentage = (count / appsData.apps.length) * 100;
    const barWidth = (count / maxValue) * 100;
    
    return `
      <div class="chart-item">
        <div class="chart-item-header">
          <span class="chart-item-label">${category}</span>
          <span class="chart-item-value">${count} (${percentage.toFixed(1)}%)</span>
        </div>
        <div class="chart-bar-container">
          <div class="chart-bar chart-bar-primary" style="width: ${barWidth}%;"></div>
        </div>
      </div>
    `;
  }).join('');
}

// Rating grafiği
function renderRatingChart(ratingRanges) {
  const container = document.getElementById('ratingChart');
  if (!container) return;
  
  const entries = Object.entries(ratingRanges).reverse();
  const maxValue = Math.max(...entries.map(e => e[1]), 1);
  
  container.innerHTML = entries.map(([range, count]) => {
    const barWidth = (count / maxValue) * 100;
    const stars = range === '5.0' ? '⭐⭐⭐⭐⭐' : 
                  range === '4.0-4.9' ? '⭐⭐⭐⭐' :
                  range === '3.0-3.9' ? '⭐⭐⭐' :
                  range === '2.0-2.9' ? '⭐⭐' : '⭐';
    
    return `
      <div class="chart-item chart-item-small">
        <div class="chart-item-header">
          <span class="chart-item-label">${stars} ${range}</span>
          <span class="chart-item-value">${count}</span>
        </div>
        <div class="chart-bar-container chart-bar-container-small">
          <div class="chart-bar chart-bar-warning" style="width: ${barWidth}%;"></div>
        </div>
      </div>
    `;
  }).join('');
}

// Play Store uygulamalarını güncelle
function updatePlayStoreApps() {
  const container = document.getElementById('playStoreApps');
  if (!container) return;
  
  const playStoreApps = appsData.apps.filter(app => app.details && app.details !== '#' && app.details.includes('play.google.com'));
  
  if (playStoreApps.length === 0) {
    container.innerHTML = '<p class="playstore-empty">Play Store linki olan uygulama yok</p>';
    return;
  }
  
  container.innerHTML = playStoreApps.map(app => {
    const rating = parseFloat(app.rating) || 0;
    const downloads = app.downloads || '0';
    
    return `
      <div class="playstore-card">
        <div class="playstore-header">
          <div class="playstore-icon">${app.icon || '📱'}</div>
          <div class="playstore-info">
            <h3 class="playstore-title">${app.title || 'İsimsiz'}</h3>
            <div class="playstore-meta">
              <span>⭐ ${rating.toFixed(1)}</span>
              <span>•</span>
              <span>📥 ${downloads}</span>
            </div>
          </div>
        </div>
        <a href="${app.details}" target="_blank" class="btn btn-primary btn-sm playstore-link">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16" class="icon-spacing">
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
            <polyline points="15 3 21 3 21 9"></polyline>
            <line x1="10" y1="14" x2="21" y2="3"></line>
          </svg>
          Play Store'da Görüntüle
        </a>
      </div>
    `;
  }).join('');
}

// Son aktiviteleri güncelle
function updateRecentActivities() {
  const container = document.getElementById('recentActivities');
  if (!container) return;
  
  // LocalStorage'dan aktiviteleri al
  const activities = JSON.parse(localStorage.getItem('adminActivities') || '[]');
  
  if (activities.length === 0) {
    container.innerHTML = '<p style="color: #6b7280; text-align: center; padding: 20px; margin: 0;">Henüz aktivite yok</p>';
    return;
  }
  
  container.innerHTML = activities.slice(0, CONSTANTS.RECENT_ACTIVITIES_LIMIT).map(activity => {
    const timeAgo = getTimeAgo(new Date(activity.timestamp));
    const icon = activity.type === 'create' ? '➕' : activity.type === 'update' ? '✏️' : activity.type === 'delete' ? '🗑️' : '📝';
    
    return `
      <div class="activity-item">
        <div class="activity-icon">${icon}</div>
        <div class="activity-content">
          <p class="activity-message">${activity.message}</p>
          <p class="activity-time">${timeAgo}</p>
        </div>
      </div>
    `;
  }).join('');
}

// Zaman farkı hesapla
function getTimeAgo(date) {
  const now = new Date();
  const diff = now - date;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  
  if (minutes < 1) return 'Az önce';
  if (minutes < 60) return `${minutes} dakika önce`;
  if (hours < 24) return `${hours} saat önce`;
  if (days < 7) return `${days} gün önce`;
  return date.toLocaleDateString('tr-TR');
}

// Aktivite kaydet
function logActivity(type, message) {
  const activities = JSON.parse(localStorage.getItem('adminActivities') || '[]');
  activities.unshift({
    type,
    message,
    timestamp: new Date().toISOString()
  });
  
  // Son N aktiviteyi sakla
  if (activities.length > CONSTANTS.MAX_ACTIVITIES) {
    activities.pop();
  }
  
  localStorage.setItem('adminActivities', JSON.stringify(activities));
  updateRecentActivities();
}

// Güvenli HTML escape fonksiyonu (XSS koruması için)
function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = String(text);
  return div.innerHTML;
}

// Önizlemeyi yenile (cache bypass ile)
function refreshPreview(showNotification = true) {
  const frame = document.getElementById('homePreviewFrame');
  if (frame) {
    // Cache'i bypass etmek için timestamp ekle
    const timestamp = new Date().getTime();
    const currentSrc = frame.src.split('?')[0]; // Mevcut query string'i temizle
    frame.src = `${currentSrc}?preview=${timestamp}`;
    
    if (showNotification) {
      showAlert('✅ Önizleme yenilendi!', 'success');
    }
  }
}

// Önizlemeyi otomatik yenile (değişikliklerden sonra)
function autoRefreshPreview() {
  // Kısa bir gecikme ile yenile (deploy'un tamamlanması için)
  setTimeout(() => {
    refreshPreview(false); // Bildirim gösterme
  }, 2000); // 2 saniye bekle
}

// Uygulamaları listele
function renderApps() {
  const container = document.getElementById('appsList');
  if (!container) {
    console.warn('⚠️ appsList container bulunamadı');
    return;
  }
  
  // appsData kontrolü
  if (!appsData || !appsData.apps) {
    container.innerHTML = '<p class="loading-text">Yükleniyor...</p>';
    return;
  }
  
  if (appsData.apps.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; padding: 60px 20px;">
        <div style="font-size: 4rem; margin-bottom: 20px; opacity: 0.3;">📱</div>
        <h3 style="color: #1a1a1a; margin: 0 0 12px 0; font-size: 1.25rem; font-weight: 600;">Henüz uygulama yok</h3>
        <p style="color: #6b7280; margin: 0 0 24px 0; font-size: 0.95rem;">Yeni uygulama ekleyerek başlayın</p>
        <button class="btn btn-primary" onclick="showAddForm()">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18" style="margin-right: 6px;">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
          <span>İlk Uygulamayı Ekle</span>
        </button>
      </div>
    `;
    return;
  }

  // Uygulamaları render et
  const appsHTML = appsData.apps.map((app, index) => {
    const icon = app.icon || '📱';
    const title = app.title || 'İsimsiz';
    const description = app.description || 'Açıklama yok';
    const category = app.category || 'Kategori yok';
    const rating = app.rating || '0';
    const downloads = app.downloads || '0';
    const hasDetails = app.details && app.details.trim() !== '';
    
    return `
    <div class="app-item">
      <div class="app-item-icon">${icon}</div>
      <div class="app-item-info">
        <div class="app-item-title">
          <span class="app-item-title-text">${title}</span>
        </div>
        <div class="app-item-desc">${description}</div>
        <div class="app-item-meta">
          <div class="app-item-meta-item">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
            </svg>
            <span>${category}</span>
          </div>
          <div class="app-item-meta-item">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
            </svg>
            <span>${rating} ⭐</span>
          </div>
          <div class="app-item-meta-item">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="7 10 12 15 17 10"></polyline>
              <line x1="12" y1="15" x2="12" y2="3"></line>
            </svg>
            <span>${downloads}</span>
          </div>
          ${hasDetails ? `
          <div class="app-item-meta-item" style="color: #10b981;">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
            <span>Yayında</span>
          </div>
          ` : `
          <div class="app-item-meta-item" style="color: #f59e0b;">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"></circle>
              <polyline points="12 6 12 12 16 14"></polyline>
            </svg>
            <span>Yakında</span>
          </div>
          `}
        </div>
      </div>
      <div class="app-item-actions">
        <button class="btn btn-secondary btn-sm" onclick="editApp(${index})" title="Düzenle">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16" style="margin-right: 4px;">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
          </svg>
          Düzenle
        </button>
        ${app.notification && app.notification.enabled === true ? `
        <button class="btn btn-info btn-sm" onclick="editApp(${index})" title="Bildirim Aktif - v${app.notification.latest_version || '1.0.0'}" style="background: #10b981; color: white; border: none;">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16" style="margin-right: 4px;">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
            <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
          </svg>
          Bildirim
        </button>
        ` : ''}
        <button class="btn btn-danger btn-sm" onclick="deleteApp(${index})" title="Sil">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16" style="margin-right: 4px;">
            <polyline points="3 6 5 6 21 6"></polyline>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
          </svg>
          Sil
        </button>
      </div>
    </div>
    `;
  }).join('');
  
  container.innerHTML = appsHTML;
}

// Form göster
function showAddForm() {
  // Apps section'ına geç
  showSection('apps');
  
  // Kısa bir gecikme ile modal'ı aç (section değişimi animasyonu için)
  setTimeout(() => {
    document.getElementById('formTitle').textContent = 'Yeni Uygulama Ekle';
    document.getElementById('appForm').reset();
    document.getElementById('appIndex').value = '-1';
    currentFeatures = [];
    renderFeatures();
    
    // Select elementlerini varsayılan değerlere sıfırla
    const appNotificationForceUpdateEl = document.getElementById('appNotificationForceUpdate');
    const appNotificationEnabledEl = document.getElementById('appNotificationEnabled');
    const appNotificationDurationTypeEl = document.getElementById('appNotificationDurationType');
    const appNotificationDurationValueGroup = document.getElementById('appNotificationDurationValueGroup');
    if (appNotificationForceUpdateEl) appNotificationForceUpdateEl.value = 'false';
    if (appNotificationEnabledEl) appNotificationEnabledEl.value = 'false';
    if (appNotificationDurationTypeEl) appNotificationDurationTypeEl.value = 'none';
    if (appNotificationDurationValueGroup) appNotificationDurationValueGroup.style.display = 'none';
    
    // Textarea'yı varsayılan mesajla doldur
    const appNotificationMessageEl = document.getElementById('appNotificationMessage');
    if (appNotificationMessageEl) {
      appNotificationMessageEl.value = 'Yeni sürüm mevcut! Lütfen uygulamayı güncelleyin.';
    }
    
    showAppModal();
  }, 100);
}

// Uygulama düzenle
function editApp(index) {
  // Apps section'ına geç
  showSection('apps');
  
  const app = appsData.apps?.[index];
  if (!app) {
    showAlert('❌ Uygulama bulunamadı!', 'error');
    return;
  }
  
  // Null kontrolleri ile form alanlarını doldur
  const appIndexEl = document.getElementById('appIndex');
  const appTitleEl = document.getElementById('appTitle');
  const appDescriptionEl = document.getElementById('appDescription');
  const appIconEl = document.getElementById('appIcon');
  const appCategoryEl = document.getElementById('appCategory');
  const appRatingEl = document.getElementById('appRating');
  const appDownloadsEl = document.getElementById('appDownloads');
  const appDetailsEl = document.getElementById('appDetails');
  const appPrivacyEl = document.getElementById('appPrivacy');
  const formTitleEl = document.getElementById('formTitle');
  
  if (appIndexEl) appIndexEl.value = index;
  if (appTitleEl) appTitleEl.value = app.title || '';
  if (appDescriptionEl) appDescriptionEl.value = app.description || '';
  if (appIconEl) appIconEl.value = app.icon || '';
  if (appCategoryEl) appCategoryEl.value = app.category || '';
  if (appRatingEl) appRatingEl.value = app.rating || 4.5;
  if (appDownloadsEl) appDownloadsEl.value = app.downloads || '';
  if (appDetailsEl) appDetailsEl.value = app.details && app.details !== '#' ? app.details : '';
  if (appPrivacyEl) appPrivacyEl.value = app.privacy && app.privacy !== '#' ? app.privacy : '';
  
  currentFeatures = [...(app.features || [])];
  renderFeatures();
  
  // Bildirim ayarları
  const notification = app.notification || {};
  const appNotificationIdEl = document.getElementById('appNotificationId');
  const appNotificationPackageEl = document.getElementById('appNotificationPackage');
  const appNotificationVersionEl = document.getElementById('appNotificationVersion');
  const appNotificationForceUpdateEl = document.getElementById('appNotificationForceUpdate');
  const appNotificationMessageEl = document.getElementById('appNotificationMessage');
  const appNotificationEnabledEl = document.getElementById('appNotificationEnabled');
  const appNotificationDurationTypeEl = document.getElementById('appNotificationDurationType');
  const appNotificationDurationValueEl = document.getElementById('appNotificationDurationValue');
  const appNotificationDurationValueGroup = document.getElementById('appNotificationDurationValueGroup');
  const appNotificationDurationHint = document.getElementById('appNotificationDurationHint');
  
  if (appNotificationIdEl) appNotificationIdEl.value = app.appId || '';
  if (appNotificationPackageEl) appNotificationPackageEl.value = app.package || '';
  if (appNotificationVersionEl) appNotificationVersionEl.value = notification.latest_version || '';
  if (appNotificationForceUpdateEl) appNotificationForceUpdateEl.value = String(notification.force_update || false);
  if (appNotificationMessageEl) appNotificationMessageEl.value = notification.update_message || '';
  if (appNotificationEnabledEl) appNotificationEnabledEl.value = String(notification.enabled || false);
  
  // Süreli bildirim ayarları
  if (notification.duration) {
    if (notification.duration.type === 'hours') {
      if (appNotificationDurationTypeEl) appNotificationDurationTypeEl.value = 'hours';
      if (appNotificationDurationValueEl) appNotificationDurationValueEl.value = notification.duration.value || '';
      if (appNotificationDurationValueGroup) appNotificationDurationValueGroup.style.display = 'block';
      if (appNotificationDurationHint) appNotificationDurationHint.textContent = 'Bildirimin kaç saat gösterileceğini girin';
    } else if (notification.duration.type === 'days') {
      if (appNotificationDurationTypeEl) appNotificationDurationTypeEl.value = 'days';
      if (appNotificationDurationValueEl) appNotificationDurationValueEl.value = notification.duration.value || '';
      if (appNotificationDurationValueGroup) appNotificationDurationValueGroup.style.display = 'block';
      if (appNotificationDurationHint) appNotificationDurationHint.textContent = 'Bildirimin kaç gün gösterileceğini girin';
    } else {
      if (appNotificationDurationTypeEl) appNotificationDurationTypeEl.value = 'none';
      if (appNotificationDurationValueGroup) appNotificationDurationValueGroup.style.display = 'none';
    }
  } else {
    if (appNotificationDurationTypeEl) appNotificationDurationTypeEl.value = 'none';
    if (appNotificationDurationValueGroup) appNotificationDurationValueGroup.style.display = 'none';
  }
  
  if (formTitleEl) formTitleEl.textContent = 'Uygulama Düzenle';
  
  // Kısa bir gecikme ile modal'ı aç
  setTimeout(() => {
    showAppModal();
  }, 100);
}

// Uygulama kaydet
async function saveApp(event) {
  event.preventDefault();
  
  // Loading state başlat
  const submitBtn = event.target.querySelector('button[type="submit"]');
  const originalBtnText = submitBtn ? submitBtn.querySelector('span')?.textContent || 'Kaydet' : 'Kaydet';
  if (submitBtn) {
    submitBtn.disabled = true;
    if (submitBtn.querySelector('span')) {
      submitBtn.querySelector('span').innerHTML = '<span class="spinner"></span> Kaydediliyor...';
    }
  }
  
  // Form elemanlarını güvenli şekilde al
  const appIndexEl = document.getElementById('appIndex');
  const appTitleEl = document.getElementById('appTitle');
  const appDescriptionEl = document.getElementById('appDescription');
  const appIconEl = document.getElementById('appIcon');
  const appCategoryEl = document.getElementById('appCategory');
  const appRatingEl = document.getElementById('appRating');
  const appDownloadsEl = document.getElementById('appDownloads');
  const appDetailsEl = document.getElementById('appDetails');
  const appPrivacyEl = document.getElementById('appPrivacy');
  const appNotificationIdEl = document.getElementById('appNotificationId');
  const appNotificationPackageEl = document.getElementById('appNotificationPackage');
  const appNotificationVersionEl = document.getElementById('appNotificationVersion');
  const appNotificationMessageEl = document.getElementById('appNotificationMessage');
  const appNotificationEnabledEl = document.getElementById('appNotificationEnabled');
  const appNotificationForceUpdateEl = document.getElementById('appNotificationForceUpdate');
  
  if (!appTitleEl || !appDescriptionEl) {
    showAlert('❌ Form elemanları bulunamadı!', 'error');
    return;
  }
  
  const index = parseInt(appIndexEl?.value || '-1');
  const detailsValue = appDetailsEl?.value.trim() || '';
  const privacyValue = appPrivacyEl?.value.trim() || '';
  
  // Validasyon
  const title = appTitleEl.value.trim();
  if (!title) {
    showAlert('⚠️ Uygulama adı gereklidir!', 'error');
    appTitleEl.focus();
    return;
  }
  
  const app = {
    title,
    description: appDescriptionEl.value.trim(),
    icon: appIconEl?.value.trim() || '',
    category: appCategoryEl?.value.trim() || '',
    rating: parseFloat(appRatingEl?.value || 0),
    downloads: appDownloadsEl?.value.trim() || '',
    details: detailsValue || '#', // Boşsa otomatik olarak "#" (Yakında)
    privacy: privacyValue || '#',
    features: currentFeatures
  };
  
  // AppId ve Package bilgileri (bildirim sistemi için)
  const appId = appNotificationIdEl?.value.trim();
  const appPackage = appNotificationPackageEl?.value.trim();
  if (appId) app.appId = appId;
  if (appPackage) app.package = appPackage;
  
  // Bildirim ayarları
  const notificationVersion = appNotificationVersionEl?.value.trim() || '';
  const notificationMessage = appNotificationMessageEl?.value.trim() || '';
  const notificationEnabled = appNotificationEnabledEl?.value === 'true';
  const notificationDurationType = document.getElementById('appNotificationDurationType')?.value || 'none';
  const notificationDurationValue = document.getElementById('appNotificationDurationValue')?.value || '';
  
  if (notificationEnabled && (notificationVersion || notificationMessage)) {
    // Bildirim aktif ve bilgiler doluysa ekle
    app.notification = {
      latest_version: notificationVersion || '1.0.0',
      force_update: appNotificationForceUpdateEl?.value === 'true',
      update_message: notificationMessage || 'Yeni sürüm mevcut! Lütfen uygulamayı güncelleyin.',
      enabled: true
    };
    
    // Süreli bildirim ayarları
    if (notificationDurationType !== 'none' && notificationDurationValue) {
      app.notification.duration = {
        type: notificationDurationType,
        value: parseInt(notificationDurationValue),
        start_time: new Date().toISOString() // Bildirim başlangıç zamanı
      };
    }
  } else if (index !== -1 && appsData.apps?.[index]?.notification) {
    // Düzenleme modunda ve bildirim kapatıldıysa veya boşsa, mevcut bildirimi sil
    if (!notificationEnabled || (!notificationVersion && !notificationMessage)) {
      delete app.notification;
    }
  }

  if (index === -1) {
    // Yeni ekle
    appsData.apps.push(app);
    logActivity('create', `"${app.title}" uygulaması eklendi`);
  } else {
    // Güncelle
    const oldTitle = appsData.apps[index]?.title || 'Bilinmeyen';
    appsData.apps[index] = app;
    logActivity('update', `"${app.title}" uygulaması güncellendi`);
  }

  // GitHub Pages kontrolü - Netlify Functions çalışmaz, direkt LocalStorage'a kaydet
  const isGitHubPages = window.location.hostname.includes('github.io') || 
                        window.location.hostname.includes('github.com') ||
                        currentMode === 'local';
  
  if (isGitHubPages) {
    // GitHub Pages'deyse direkt LocalStorage'a kaydet
    saveToLocal();
    showAlert('✅ Kaydedildi!', 'success');
    
    // Eğer GitHub modu aktifse ve token varsa, manuel kaydetmeyi dene
    if (currentMode === 'github' && token) {
      try {
        await saveToGitHub();
        showAlert('✅ GitHub\'a manuel olarak kaydedildi!', 'success');
      } catch (githubError) {
        const githubErrorMessage = githubError instanceof Error ? githubError.message : 'Bilinmeyen hata';
        console.error('GitHub kaydetme hatası:', githubError);
        showAlert(`❌ GitHub kaydetme hatası: ${githubErrorMessage}`, 'error');
      }
    }
    
    // Önizlemeyi otomatik yenile
    autoRefreshPreview();
  } else {
    // Netlify'da ise Netlify Function'ı kullan
    try {
      const response = await fetch('/.netlify/functions/updateApps', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(appsData)
      });
      
      const contentType = response.headers.get('content-type');
      let result;
      
      if (contentType && contentType.includes('application/json')) {
        result = await response.json();
      } else {
        const text = await response.text();
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
          console.warn('Netlify Function HTML response:', text.substring(0, 200));
        }
        throw new Error(`Netlify Function çalışmıyor (${response.status}): ${response.statusText}`);
      }
      
      if (response.ok) {
        saveToLocal();
        showAlert('✅ Kaydedildi!', 'success');
        autoRefreshPreview();
      } else {
        throw new Error(result.error || `GitHub kaydetme başarısız (${response.status})`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Bilinmeyen bir hata oluştu';
      if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        console.warn('Netlify Function hatası:', errorMessage);
      }
      
      saveToLocal();
      showAlert('ℹ️ LocalStorage\'a kaydedildi', 'info');
      
      if (currentMode === 'github' && token) {
        try {
          await saveToGitHub();
          showAlert('✅ GitHub\'a manuel olarak kaydedildi!', 'success');
        } catch (githubError) {
          const githubErrorMessage = githubError instanceof Error ? githubError.message : 'Bilinmeyen hata';
          console.error('GitHub kaydetme hatası:', githubError);
          showAlert(`❌ GitHub kaydetme hatası: ${githubErrorMessage}`, 'error');
        }
      }
    }
  }

  updateStats();
  renderApps();
  
  // Tüm bölümleri otomatik güncelle
  setTimeout(() => {
    populateAppNotificationSelect(); // Bildirim bölümü dropdown'ını güncelle
    renderActiveNotifications(); // Aktif bildirimler listesini güncelle
    renderFeedback(); // Geri bildirimler bölümünü güncelle
    renderVotes(); // Oylar bölümünü güncelle
  }, 100);
  
  closeAppModal();
  
  // LocalStorage'a kaydedildiyse önizlemeyi yenile (anında görüntüleme için)
  if (currentMode === 'local') {
    setTimeout(() => {
      refreshPreview(false);
    }, 500);
  }
  
  // Loading state bitir
  if (submitBtn) {
    submitBtn.disabled = false;
    if (submitBtn.querySelector('span')) {
      submitBtn.querySelector('span').textContent = originalBtnText;
    }
  }
}

// Modal Functions
function showAppModal() {
  const modal = document.getElementById('appFormModal');
  if (modal) {
    // Modal açılmadan önce sidebar overlay'i gizle
    const sidebarOverlay = document.querySelector('.admin-sidebar-overlay');
    if (sidebarOverlay) {
      sidebarOverlay.style.display = 'none';
    }
    
    modal.classList.add('active');
    document.body.classList.add('modal-open');
    // Scroll pozisyonunu kaydet
    const scrollY = window.scrollY;
    document.body.style.top = `-${scrollY}px`;
  }
}

// Modal kapatma yardımcı fonksiyonu (tekrar kullanılabilir)
function closeModal(modalId, formId = null) {
  const modal = document.getElementById(modalId);
  if (!modal) return;
  
  const modalContent = modal.querySelector('.modal-content');
  if (modalContent) {
    // Kapanış animasyonu
    modalContent.style.animation = `modalSlideOut ${CONSTANTS.MODAL_ANIMATION_DURATION}ms cubic-bezier(0.4, 0, 0.2, 1) forwards`;
    modal.style.animation = `fadeOutOverlay ${CONSTANTS.MODAL_ANIMATION_DURATION}ms cubic-bezier(0.4, 0, 0.2, 1) forwards`;
  }
  
  setTimeout(() => {
    modal.classList.remove('active');
    document.body.classList.remove('modal-open');
    
    // Modal kapandıktan sonra sidebar overlay'i geri getir (eğer sidebar açıksa)
    const sidebarOverlay = document.querySelector('.admin-sidebar-overlay');
    const sidebar = document.getElementById('adminSidebar');
    if (sidebarOverlay && sidebar && sidebar.classList.contains('open')) {
      sidebarOverlay.style.display = '';
    }
    
    // Scroll pozisyonunu geri yükle
    const scrollY = document.body.style.top;
    document.body.style.top = '';
    if (scrollY) {
      window.scrollTo(0, parseInt(scrollY || '0') * -1);
    }
    // Animasyon stillerini sıfırla
    if (modalContent) {
      modalContent.style.animation = '';
      modal.style.animation = '';
    }
    // Form'u temizle
    if (formId) {
      const form = document.getElementById(formId);
      if (form) form.reset();
    }
  }, CONSTANTS.MODAL_ANIMATION_DURATION);
}

function closeAppModal() {
  closeModal('appFormModal');
}

function showSiteModal() {
  const modal = document.getElementById('siteSettingsModal');
  if (modal) {
    // Modal açılmadan önce sidebar overlay'i gizle
    const sidebarOverlay = document.querySelector('.admin-sidebar-overlay');
    if (sidebarOverlay) {
      sidebarOverlay.style.display = 'none';
    }
    
    modal.classList.add('active');
    document.body.classList.add('modal-open');
    // Scroll pozisyonunu kaydet
    const scrollY = window.scrollY;
    document.body.style.top = `-${scrollY}px`;
    loadSiteData();
    showSiteSection('header');
  }
}

function closeSiteModal() {
  closeModal('siteSettingsModal');
}

// Session kontrolünü throttle ile optimize et
function checkAdminSessionThrottled() {
  const now = Date.now();
  // Her 5 saniyede bir kontrol et (performans için)
  if (now - lastSessionCheck < 5000) {
    return true; // Son kontrol çok yakınsa geç
  }
  lastSessionCheck = now;
  return checkAdminSession();
}

// Son aktivite zamanını güncelle
function updateLastActivity() {
  if (sessionStorage.getItem('adminSession')) {
    sessionStorage.setItem('adminLastActivity', Date.now().toString());
  }
}

// Overlay click to close
// Kullanıcı aktivitesi olduğunda session'ı güncelle
document.addEventListener('click', (e) => {
  // Session kontrolü yap (throttled)
  if (!checkAdminSessionThrottled()) {
    e.preventDefault();
    e.stopPropagation();
    return false;
  }
  // Son aktivite zamanını güncelle
  updateLastActivity();
  
  if (e.target.classList.contains('modal-overlay')) {
    closeAllModals();
  }
});

// ESC key to close modals
document.addEventListener('keydown', (e) => {
  // Session kontrolü yap (throttled)
  if (!checkAdminSessionThrottled()) {
    e.preventDefault();
    e.stopPropagation();
    return false;
  }
  // Son aktivite zamanını güncelle
  updateLastActivity();
  
  if (e.key === 'Escape') {
    closeAllModals();
  }
});

// Tüm modalları kapat (tek bir fonksiyon)
function closeAllModals() {
  closeAppModal();
  closeSiteModal();
  closeUserModal();
  closeChangePasswordModal();
}

// Form iptal
function cancelForm() {
  closeAppModal();
}

// Uygulama sil
async function deleteApp(index) {
  const app = appsData.apps[index];
  if (!app) return;
  
  if (!confirm('Bu uygulamayı silmek istediğinize emin misiniz?')) {
    return;
  }

  const appTitle = app.title || 'İsimsiz';
  appsData.apps.splice(index, 1);
  logActivity('delete', `"${appTitle}" uygulaması silindi`);
  
  // Tüm bölümleri otomatik güncelle
  populateAppNotificationSelect(); // Bildirim bölümü dropdown'ını güncelle
  renderActiveNotifications(); // Aktif bildirimler listesini güncelle
  renderFeedback(); // Geri bildirimler bölümünü güncelle
  renderVotes(); // Oylar bölümünü güncelle

  // GitHub Pages kontrolü - Netlify Functions çalışmaz, direkt LocalStorage'a kaydet
  const isGitHubPages = window.location.hostname.includes('github.io') || 
                        window.location.hostname.includes('github.com') ||
                        currentMode === 'local';
  
  if (isGitHubPages) {
    // GitHub Pages'deyse direkt LocalStorage'a kaydet
    saveToLocal();
    showAlert('✅ Silindi!', 'success');
    
    // Eğer GitHub modu aktifse ve token varsa, manuel kaydetmeyi dene
    if (currentMode === 'github' && token) {
      try {
        await saveToGitHub();
        showAlert('✅ Uygulama silindi ve GitHub\'a manuel olarak kaydedildi!', 'success');
      } catch (githubError) {
        console.error('GitHub kaydetme hatası:', githubError);
      }
    }
    
    // Önizlemeyi otomatik yenile
    autoRefreshPreview();
  } else {
    // Netlify'da ise Netlify Function'ı kullan
    try {
      const response = await fetch('/.netlify/functions/updateApps', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(appsData)
      });
      
      const contentType = response.headers.get('content-type');
      let result;
      
      if (contentType && contentType.includes('application/json')) {
        result = await response.json();
      } else {
        const text = await response.text();
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
          console.warn('Netlify Function HTML response:', text.substring(0, 200));
        }
        throw new Error(`Netlify Function çalışmıyor (${response.status}): ${response.statusText}`);
      }
      
      if (response.ok) {
        saveToLocal();
        showAlert('✅ Silindi!', 'success');
        autoRefreshPreview();
      } else {
        throw new Error(result.error || `GitHub kaydetme başarısız (${response.status})`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Bilinmeyen hata';
      if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        console.warn('Netlify Function hatası:', errorMessage);
      }
      
      saveToLocal();
      showAlert('ℹ️ LocalStorage\'a kaydedildi', 'info');
      
      if (currentMode === 'github' && token) {
        try {
          await saveToGitHub();
          showAlert('✅ Uygulama silindi ve GitHub\'a manuel olarak kaydedildi!', 'success');
        } catch (githubError) {
          console.error('GitHub kaydetme hatası:', githubError);
        }
      }
    }
  }

  updateStats();
  renderApps();
  
  // Tüm bölümleri otomatik güncelle
  setTimeout(() => {
    populateAppNotificationSelect(); // Bildirim bölümü dropdown'ını güncelle
    renderActiveNotifications(); // Aktif bildirimler listesini güncelle
    renderFeedback(); // Geri bildirimler bölümünü güncelle
    renderVotes(); // Oylar bölümünü güncelle
  }, 100);
  
  // LocalStorage'a kaydedildiyse önizlemeyi yenile (anında görüntüleme için)
  if (currentMode === 'local') {
    setTimeout(() => {
      refreshPreview(false);
    }, 500);
  }
}

// Özellik ekle
function addFeature() {
  const input = document.getElementById('newFeature');
  const feature = input.value.trim();
  
  if (feature && !currentFeatures.includes(feature)) {
    currentFeatures.push(feature);
    renderFeatures();
    input.value = '';
  }
}

// Özellik sil
function removeFeature(index) {
  currentFeatures.splice(index, 1);
  renderFeatures();
}

// Özellikleri render et
function renderFeatures() {
  const container = document.getElementById('featuresList');
  container.innerHTML = currentFeatures.map((feature, index) => `
    <div class="feature-tag-input">
      <span>${feature}</span>
      <button type="button" onclick="removeFeature(${index})">×</button>
    </div>
  `).join('');
}

// Veriyi dışa aktar
function exportData() {
  const dataStr = JSON.stringify(appsData, null, 2);
  const dataBlob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(dataBlob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'apps-backup.json';
  link.click();
  URL.revokeObjectURL(url);
}

// Veriyi içe aktar
function importData() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'application/json';
  input.onchange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const imported = JSON.parse(event.target.result);
        if (imported.apps && Array.isArray(imported.apps)) {
          if (confirm('Mevcut verilerin üzerine yazılacak. Devam etmek istiyor musunuz?')) {
            appsData = imported;
            if (currentMode === 'local') {
              saveToLocal();
            }
            updateStats();
            renderApps();
            alert('✅ Veri içe aktarıldı!');
          }
        } else {
          alert('❌ Geçersiz dosya formatı!');
        }
      } catch (error) {
        alert('❌ Dosya okunamadı: ' + error.message);
      }
    };
    reader.readAsText(file);
  };
  input.click();
}

// Site Ayarları Fonksiyonları
function showSiteSettings() {
  // Settings section'ına geç
  showSection('settings');
  
  // Kısa bir gecikme ile modal'ı aç
  setTimeout(() => {
  showSiteModal();
  }, 100);
}

function cancelSiteSettings() {
  closeSiteModal();
}

function showSiteSection(section) {
  // Tüm formları gizle
  document.querySelectorAll('.site-form-section').forEach(el => el.classList.add('hidden'));
  // Tüm tabları pasif yap
  document.querySelectorAll('.section-tab').forEach(tab => tab.classList.remove('active'));
  // Seçilen formu göster
  document.getElementById(`site${section.charAt(0).toUpperCase() + section.slice(1)}Form`).classList.remove('hidden');
  // Seçilen tabı aktif yap
  const tabs = document.querySelectorAll('.section-tab');
  const sectionNames = ['header', 'hero', 'about', 'skills', 'contact'];
  const index = sectionNames.indexOf(section);
  if (index !== -1 && tabs[index]) {
    tabs[index].classList.add('active');
  }
  currentSiteSection = section;
  loadSiteSectionData(section);
}

function loadSiteData() {
  if (!appsData.site) {
    appsData.site = getDefaultSiteData();
  }
}

function loadSiteSectionData(section) {
  if (!appsData.site) return;
  
  const site = appsData.site;
  
  if (section === 'header') {
    const logoEl = document.getElementById('siteHeaderLogo');
    const taglineEl = document.getElementById('siteHeaderTagline');
    if (logoEl) logoEl.value = site.header?.logo || '';
    if (taglineEl) taglineEl.value = site.header?.tagline || '';
  } else if (section === 'hero') {
    const titleEl = document.getElementById('siteHeroTitle');
    const taglineEl = document.getElementById('siteHeroTagline');
    const urlEl = document.getElementById('siteHeroPlayStoreUrl');
    const statsEl = document.getElementById('siteHeroStats');
    if (titleEl) titleEl.value = site.hero?.title || '';
    if (taglineEl) taglineEl.value = site.hero?.tagline || '';
    if (urlEl) urlEl.value = site.hero?.playStoreUrl || '';
    if (statsEl) statsEl.value = JSON.stringify(site.hero?.stats || [], null, 2);
  } else if (section === 'about') {
    const titleEl = document.getElementById('siteAboutTitle');
    const textsEl = document.getElementById('siteAboutTexts');
    const techEl = document.getElementById('siteAboutTech');
    if (titleEl) titleEl.value = site.about?.title || '';
    if (textsEl) textsEl.value = site.about?.texts?.join('\n') || '';
    if (techEl) techEl.value = site.about?.technologies?.map(t => `${t.icon}|${t.name}`).join('\n') || '';
  } else if (section === 'skills') {
    const titleEl = document.getElementById('siteSkillsTitle');
    if (titleEl) titleEl.value = site.skills?.title || '';
    renderSkillsList();
  } else if (section === 'contact') {
    const titleEl = document.getElementById('siteContactTitle');
    const subtitleEl = document.getElementById('siteContactSubtitle');
    if (titleEl) titleEl.value = site.contact?.title || '';
    if (subtitleEl) subtitleEl.value = site.contact?.subtitle || '';
    
    // Container'ın var olduğundan emin ol (modal açılmış olmalı)
    const container = document.getElementById('contactListContainer');
    if (container) {
      // Sadece appsData'dan oku ve render et (duplicate'leri önlemek için)
      renderContactList();
    }
  }
}

async function saveSiteSection(section, event) {
  if (event) {
    event.preventDefault();
  }
  
  // Loading state başlat
  let saveBtn = null;
  let originalBtnText = '💾 Kaydet';
  if (event && event.target) {
    saveBtn = event.target;
    if (saveBtn.tagName === 'SPAN') {
      saveBtn = saveBtn.closest('button');
    }
    if (saveBtn) {
      originalBtnText = saveBtn.textContent || '💾 Kaydet';
      saveBtn.disabled = true;
      saveBtn.innerHTML = '<span class="spinner"></span> Kaydediliyor...';
    }
  }
  
  if (!appsData.site) {
    appsData.site = getDefaultSiteData();
  }
  
  // Form elemanlarını güvenli şekilde al
  if (section === 'header') {
    const logoEl = document.getElementById('siteHeaderLogo');
    const taglineEl = document.getElementById('siteHeaderTagline');
    if (!logoEl || !taglineEl) {
      showAlert('❌ Form elemanları bulunamadı!', 'error');
      return;
    }
    appsData.site.header = {
      logo: logoEl.value.trim(),
      tagline: taglineEl.value.trim()
    };
  } else if (section === 'hero') {
    const titleEl = document.getElementById('siteHeroTitle');
    const taglineEl = document.getElementById('siteHeroTagline');
    const urlEl = document.getElementById('siteHeroPlayStoreUrl');
    const statsEl = document.getElementById('siteHeroStats');
    
    if (!titleEl || !taglineEl || !urlEl || !statsEl) {
      showAlert('❌ Form elemanları bulunamadı!', 'error');
      return;
    }
    
    let stats = [];
    try {
      stats = JSON.parse(statsEl.value);
    } catch (e) {
      showAlert('❌ İstatistikler JSON formatında olmalı!', 'error');
      return;
    }
    appsData.site.hero = {
      title: titleEl.value.trim(),
      tagline: taglineEl.value.trim(),
      playStoreUrl: urlEl.value.trim(),
      stats: stats
    };
  } else if (section === 'about') {
    const titleEl = document.getElementById('siteAboutTitle');
    const textsEl = document.getElementById('siteAboutTexts');
    const techEl = document.getElementById('siteAboutTech');
    
    if (!titleEl || !textsEl || !techEl) {
      showAlert('❌ Form elemanları bulunamadı!', 'error');
      return;
    }
    
    const texts = textsEl.value.split('\n').filter(t => t.trim());
    const techLines = techEl.value.split('\n').filter(t => t.trim());
    const technologies = techLines.map(line => {
      const [icon, ...nameParts] = line.split('|');
      return { icon: icon.trim(), name: nameParts.join('|').trim() };
    });
    
    appsData.site.about = {
      title: titleEl.value.trim(),
      texts: texts,
      technologies: technologies
    };
  } else if (section === 'skills') {
    const titleEl = document.getElementById('siteSkillsTitle');
    if (!titleEl) {
      showAlert('❌ Form elemanları bulunamadı!', 'error');
      return;
    }
    
    // Sadece skillsListContainer içindeki item'ları oku (duplicate'leri önlemek için)
    const container = document.getElementById('skillsListContainer');
    if (!container) {
      showAlert('❌ Yetenek listesi container\'ı bulunamadı!', 'error');
      return;
    }
    
    const skills = [];
    // Container içindeki item'ları data-index'e göre sıralı oku
    const skillItems = Array.from(container.querySelectorAll('.skill-edit-item'))
      .sort((a, b) => {
        const indexA = parseInt(a.getAttribute('data-index') || '999999');
        const indexB = parseInt(b.getAttribute('data-index') || '999999');
        return indexA - indexB;
      });
    
    skillItems.forEach((item) => {
      const nameInput = item.querySelector('.skill-name-input');
      const iconInput = item.querySelector('.skill-icon-input');
      const levelInput = item.querySelector('.skill-level-input');
      if (nameInput && iconInput && levelInput) {
        // Boş item'ları atla (tüm alanlar boşsa)
        const isEmpty = !nameInput.value.trim() && 
                       !iconInput.value.trim() && 
                       (!levelInput.value || parseInt(levelInput.value) === 0);
        
        if (!isEmpty) {
          skills.push({
            name: nameInput.value.trim(),
            icon: iconInput.value.trim(),
            level: parseInt(levelInput.value) || 0
          });
        }
      }
    });
    
    appsData.site.skills = {
      title: titleEl.value.trim(),
      items: skills
    };
    
    // appsData güncellendi, DOM'u da güncelle (duplicate'leri temizle ve sıralamayı düzelt)
    renderSkillsList();
  } else if (section === 'contact') {
    const titleEl = document.getElementById('siteContactTitle');
    const subtitleEl = document.getElementById('siteContactSubtitle');
    if (!titleEl || !subtitleEl) {
      showAlert('❌ Form elemanları bulunamadı!', 'error');
      return;
    }
    
    // DOM'dan oku ama duplicate kontrolü yap
    // data-index attribute'u ile sıralı okuma yap
    // Sadece contactListContainer içindeki item'ları oku (duplicate'leri önlemek için)
    const container = document.getElementById('contactListContainer');
    if (!container) {
      showAlert('❌ İletişim listesi container\'ı bulunamadı!', 'error');
      return;
    }
    
    const contacts = [];
    // Container içindeki item'ları data-index'e göre sıralı oku
    const contactItems = Array.from(container.querySelectorAll('.contact-edit-item'))
      .sort((a, b) => {
        const indexA = parseInt(a.getAttribute('data-index') || '999999');
        const indexB = parseInt(b.getAttribute('data-index') || '999999');
        return indexA - indexB;
      });
    
    contactItems.forEach((item) => {
      const typeInput = item.querySelector('.contact-type-input');
      const iconInput = item.querySelector('.contact-icon-input');
      const titleInput = item.querySelector('.contact-title-input');
      const valueInput = item.querySelector('.contact-value-input');
      const linkInput = item.querySelector('.contact-link-input');
      const descInput = item.querySelector('.contact-desc-input');
      
      if (typeInput && iconInput && titleInput && valueInput && linkInput && descInput) {
        // Boş item'ları atla (tüm alanlar boşsa)
        const isEmpty = !typeInput.value.trim() && 
                       !iconInput.value.trim() && 
                       !titleInput.value.trim() && 
                       !valueInput.value.trim() && 
                       !linkInput.value.trim() && 
                       !descInput.value.trim();
        
        if (!isEmpty) {
          contacts.push({
            type: typeInput.value.trim(),
            icon: iconInput.value.trim(),
            title: titleInput.value.trim(),
            value: valueInput.value.trim(),
            link: linkInput.value.trim(),
            description: descInput.value.trim()
          });
        }
      }
    });
    
    appsData.site.contact = {
      title: titleEl.value.trim(),
      subtitle: subtitleEl.value.trim(),
      items: contacts
    };
    
    // appsData güncellendi, DOM'u da güncelle (duplicate'leri temizle ve sıralamayı düzelt)
    renderContactList();
  }
  
  // GitHub Pages kontrolü - Netlify Functions çalışmaz, direkt LocalStorage'a kaydet
  const isGitHubPages = window.location.hostname.includes('github.io') || 
                        window.location.hostname.includes('github.com') ||
                        currentMode === 'local';
  
  if (isGitHubPages) {
    // GitHub Pages'deyse direkt LocalStorage'a kaydet
    saveToLocal();
    showAlert('✅ Kaydedildi!', 'success');
    autoRefreshPreview();
  } else {
    // Netlify'da ise Netlify Function'ı kullan
    try {
      const response = await fetch('/.netlify/functions/updateApps', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(appsData)
      });
      
      const contentType = response.headers.get('content-type');
      let result;
      
      if (contentType && contentType.includes('application/json')) {
        result = await response.json();
      } else {
        const text = await response.text();
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
          console.warn('Netlify Function HTML response:', text.substring(0, 200));
        }
        throw new Error(`Netlify Function çalışmıyor (${response.status}): ${response.statusText}`);
      }
      
      if (response.ok) {
        saveToLocal();
        showAlert('✅ Kaydedildi!', 'success');
        autoRefreshPreview();
      } else {
        throw new Error(result.error || `GitHub kaydetme başarısız (${response.status})`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Bilinmeyen hata';
      if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        console.warn('Netlify Function hatası:', errorMessage);
      }
      
      saveToLocal();
      showAlert('ℹ️ LocalStorage\'a kaydedildi', 'info');
    }
    
    // Eğer GitHub modu aktifse ve token varsa, manuel kaydetmeyi dene
    if (currentMode === 'github' && token) {
      try {
        await saveToGitHub();
        showAlert('✅ Site ayarları GitHub\'a manuel olarak kaydedildi!', 'success');
      } catch (githubError) {
        console.error('GitHub kaydetme hatası:', githubError);
      }
    }
  }
  
  // LocalStorage'a kaydedildiyse önizlemeyi yenile (anında görüntüleme için)
  if (currentMode === 'local') {
    setTimeout(() => {
      refreshPreview(false);
    }, 500);
  }
  
  // Loading state bitir
  if (saveBtn) {
    saveBtn.disabled = false;
    saveBtn.innerHTML = originalBtnText;
  }
}

// Alert göster (XSS korumalı)
function showAlert(message, type = 'success') {
  const container = document.getElementById('alertContainer');
  if (!container) return;
  
  const alert = document.createElement('div');
  alert.className = `alert alert-${type}`;
  // XSS koruması için textContent kullan
  const span = document.createElement('span');
  span.textContent = message;
  alert.appendChild(span);
  
  container.appendChild(alert);
  
  setTimeout(() => {
    alert.style.opacity = '0';
    alert.style.transform = 'translateX(100px)';
    setTimeout(() => alert.remove(), CONSTANTS.MODAL_ANIMATION_DURATION);
  }, CONSTANTS.ALERT_DISPLAY_DURATION);
}

function renderSkillsList() {
  const container = document.getElementById('skillsListContainer');
  if (!container) return;
  
  // appsData'dan oku (tek kaynak)
  if (!appsData.site) {
    appsData.site = getDefaultSiteData();
  }
  const skills = appsData.site?.skills?.items || [];
  
  if (skills.length === 0) {
    container.innerHTML = '<p style="color: #6b7280; text-align: center; padding: 20px;">Henüz yetenek eklenmemiş. "Yetenek Ekle" butonuna tıklayarak ekleyebilirsiniz.</p>';
    return;
  }
  
  container.innerHTML = skills.map((skill, index) => `
    <div class="skill-edit-item" data-index="${index}">
      <div class="skill-edit-grid" style="display: grid; grid-template-columns: 1fr 80px 100px auto; gap: 12px; align-items: center;">
        <input type="text" class="skill-name-input" value="${escapeHtml(skill.name || '')}" placeholder="Yetenek adı"/>
        <input type="text" class="skill-icon-input" value="${escapeHtml(skill.icon || '')}" placeholder="Icon" maxlength="2"/>
        <input type="number" class="skill-level-input" value="${skill.level || 0}" min="0" max="100" placeholder="Seviye"/>
        <button type="button" class="btn btn-danger btn-sm" onclick="removeSkillItem(${index})" title="Sil">🗑️</button>
      </div>
    </div>
  `).join('');
}

function addSkillItem() {
  // appsData.site.skills.items array'ine yeni boş item ekle
  if (!appsData.site) {
    appsData.site = getDefaultSiteData();
  }
  if (!appsData.site.skills) {
    appsData.site.skills = { title: '', items: [] };
  }
  if (!appsData.site.skills.items) {
    appsData.site.skills.items = [];
  }
  
  // Yeni boş skill item ekle
  appsData.site.skills.items.push({
    name: '',
    icon: '',
    level: 0
  });
  
  // Listeyi yeniden render et (tek kaynak olarak appsData kullan)
  renderSkillsList();
  
  // Son eklenen item'ın ilk input'una focus
  const items = document.querySelectorAll('.skill-edit-item');
  if (items.length > 0) {
    const lastItem = items[items.length - 1];
    const firstInput = lastItem.querySelector('.skill-name-input');
    if (firstInput) {
      setTimeout(() => firstInput.focus(), 100);
    }
  }
}

function removeSkillItem(index) {
  if (appsData.site?.skills?.items) {
    appsData.site.skills.items.splice(index, 1);
    renderSkillsList();
  }
}

// renderContactList için debounce kontrolü (çoklu çağrıları önlemek için)
let renderContactListTimeout = null;

function renderContactList() {
  const container = document.getElementById('contactListContainer');
  if (!container) {
    console.warn('⚠️ contactListContainer bulunamadı, renderContactList atlanıyor');
    return;
  }
  
  // Eğer zaten bir render işlemi bekliyorsa, onu iptal et
  if (renderContactListTimeout) {
    clearTimeout(renderContactListTimeout);
  }
  
  // Kısa bir gecikme ile render et (çoklu çağrıları birleştir)
  renderContactListTimeout = setTimeout(() => {
    renderContactListTimeout = null;
    
    // appsData'dan oku (tek kaynak)
    if (!appsData.site) {
      appsData.site = getDefaultSiteData();
    }
    if (!appsData.site.contact) {
      appsData.site.contact = { title: '', subtitle: '', items: [] };
    }
    let contacts = appsData.site.contact.items || [];
    
    // Duplicate kontrolü - aynı item'ları filtrele (sadece boş olmayan item'lar için)
    const uniqueContacts = [];
    const seen = new Set();
    contacts.forEach((contact, originalIndex) => {
      // Boş item'lar için özel kontrol (birden fazla boş item olabilir, ama duplicate olmamalı)
      const isEmpty = !contact.type && !contact.icon && !contact.title && 
                     !contact.value && !contact.link && !contact.description;
      
      if (isEmpty) {
        // Boş item'lar için sadece bir tane ekle
        if (!seen.has('__empty__')) {
          seen.add('__empty__');
          uniqueContacts.push(contact);
        }
      } else {
        // Dolu item'lar için unique key kontrolü
        const key = `${contact.type || ''}_${contact.title || ''}_${contact.value || ''}_${contact.link || ''}`;
        if (!seen.has(key)) {
          seen.add(key);
          uniqueContacts.push(contact);
        } else {
          console.log(`⚠️ Duplicate contact item atlandı: ${key}`);
        }
      }
    });
    
    // Eğer uniqueContacts farklıysa, appsData'yı güncelle
    if (uniqueContacts.length !== contacts.length) {
      console.log(`⚠️ Duplicate contact item'lar temizlendi: ${contacts.length} -> ${uniqueContacts.length}`);
      appsData.site.contact.items = uniqueContacts;
      contacts = uniqueContacts;
    }
    
    if (contacts.length === 0) {
      container.innerHTML = '<p style="color: #6b7280; text-align: center; padding: 20px;">Henüz iletişim bilgisi eklenmemiş. "İletişim Ekle" butonuna tıklayarak ekleyebilirsiniz.</p>';
      return;
    }
    
    container.innerHTML = contacts.map((contact, index) => `
      <div class="contact-edit-item" data-index="${index}">
        <div class="contact-edit-container" style="display: grid; gap: 12px;">
          <div class="contact-edit-row" style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
            <input type="text" class="contact-type-input" value="${escapeHtml(contact.type || '')}" placeholder="Tip (email, github, vb.)"/>
            <input type="text" class="contact-icon-input" value="${escapeHtml(contact.icon || '')}" placeholder="Icon" maxlength="2" style="text-align: center; font-size: 1.2rem;"/>
          </div>
          <input type="text" class="contact-title-input" value="${escapeHtml(contact.title || '')}" placeholder="Başlık"/>
          <input type="text" class="contact-value-input" value="${escapeHtml(contact.value || '')}" placeholder="Değer (örn: email adresi)"/>
          <input type="url" class="contact-link-input" value="${escapeHtml(contact.link || '')}" placeholder="Link URL"/>
          <textarea class="contact-desc-input" placeholder="Açıklama" style="min-height: 80px; resize: vertical;">${escapeHtml(contact.description || '')}</textarea>
          <button type="button" class="btn btn-danger btn-sm" onclick="removeContactItem(${index})" title="Sil">🗑️ Sil</button>
        </div>
      </div>
    `).join('');
  }, 50); // 50ms debounce
}

function removeContactItem(index) {
  if (!appsData.site?.contact?.items) return;
  
  // appsData'dan sil
  appsData.site.contact.items.splice(index, 1);
  
  // Listeyi yeniden render et
  renderContactList();
}

// addContactItem için debounce kontrolü (çift tıklamayı önlemek için)
let addContactItemLastCall = 0;
const ADD_CONTACT_ITEM_DEBOUNCE = 500; // 500ms

function addContactItem() {
  // Debounce kontrolü - çift tıklamayı önle
  const now = Date.now();
  if (now - addContactItemLastCall < ADD_CONTACT_ITEM_DEBOUNCE) {
    console.log('⚠️ addContactItem çok hızlı çağrıldı, atlanıyor...');
    return;
  }
  addContactItemLastCall = now;
  
  // appsData.site.contact.items array'ine yeni boş item ekle
  if (!appsData.site) {
    appsData.site = getDefaultSiteData();
  }
  if (!appsData.site.contact) {
    appsData.site.contact = { title: '', subtitle: '', items: [] };
  }
  if (!appsData.site.contact.items) {
    appsData.site.contact.items = [];
  }
  
  // Yeni boş contact item ekle
  appsData.site.contact.items.push({
    type: '',
    icon: '',
    title: '',
    value: '',
    link: '',
    description: ''
  });
  
  // Listeyi yeniden render et (tek kaynak olarak appsData kullan)
  renderContactList();
  
  // Son eklenen item'ın ilk input'una focus
  const items = document.querySelectorAll('.contact-edit-item');
  if (items.length > 0) {
    const lastItem = items[items.length - 1];
    const firstInput = lastItem.querySelector('.contact-type-input');
    if (firstInput) {
      setTimeout(() => firstInput.focus(), 100);
    }
  }
}

// Enter tuşu ile özellik ekleme
document.addEventListener('DOMContentLoaded', () => {
  const newFeatureInput = document.getElementById('newFeature');
  if (newFeatureInput) {
    newFeatureInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        addFeature();
      }
    });
  }
  
  // Kullanıcı verilerini yükle
  loadUsers();
  
  // Kullanıcılar bölümüne geçildiğinde listeyi yenile
  const usersSection = document.getElementById('usersSection');
  if (usersSection) {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
          if (!usersSection.classList.contains('hidden')) {
            renderUsers();
          }
        }
      });
    });
    observer.observe(usersSection, { attributes: true });
  }
});

// ==================== KULLANICI YÖNETİMİ ====================

// Kullanıcıları LocalStorage'dan yükle
function loadUsers() {
  const saved = localStorage.getItem('adminUsers');
  if (saved) {
    try {
      usersData = JSON.parse(saved);
    } catch (e) {
      console.error('Kullanıcı verileri yüklenirken hata:', e);
      usersData = [];
    }
  } else {
    // İlk kurulum - varsayılan admin kullanıcısı ekle
    usersData = [{
      id: Date.now().toString(),
      username: 'admin',
      email: 'admin@example.com',
      passwordHash: ADMIN_PASSWORD_HASH, // "admin123"
      role: 'admin',
      createdAt: new Date().toISOString(),
      lastLogin: null
    }];
    saveUsers();
  }
  renderUsers();
}

// Kullanıcıları LocalStorage'a kaydet
function saveUsers() {
  try {
    const jsonData = JSON.stringify(usersData);
    localStorage.setItem('adminUsers', jsonData);
    console.log('✅ Kullanıcılar kaydedildi:', usersData.length, 'kullanıcı');
    return true;
  } catch (error) {
    console.error('❌ Kullanıcılar kaydedilemedi:', error);
    showAlert('❌ Veriler kaydedilemedi. Lütfen tekrar deneyin.', 'error');
    return false;
  }
}

// Kullanıcıları listele
function renderUsers() {
  const container = document.getElementById('usersList');
  const countEl = document.getElementById('usersCount');
  
  if (!container) {
    console.warn('⚠️ usersList container bulunamadı');
    return;
  }
  
  // Loading state
  if (!usersData || usersData.length === 0) {
    container.innerHTML = '<p class="loading-text">Yükleniyor...</p>';
    // usersData yüklenene kadar bekle
    setTimeout(() => {
      if (usersData && usersData.length > 0) {
        renderUsers();
      }
    }, 100);
    return;
  }
  
  if (usersData.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; padding: 60px 20px;">
        <div style="font-size: 4rem; margin-bottom: 20px; opacity: 0.3;">👤</div>
        <h3 style="color: #1a1a1a; margin: 0 0 12px 0; font-size: 1.25rem; font-weight: 600;">Henüz kullanıcı yok</h3>
        <p style="color: #6b7280; margin: 0 0 24px 0; font-size: 0.95rem;">Yeni kullanıcı ekleyerek başlayın</p>
        <button class="btn btn-primary" onclick="showAddUserForm()">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18" style="margin-right: 6px;">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
          <span>İlk Kullanıcıyı Ekle</span>
        </button>
      </div>
    `;
    if (countEl) countEl.textContent = '';
    return;
  }
  
  if (countEl) {
    countEl.textContent = `(${usersData.length} kullanıcı)`;
  }
  
  container.innerHTML = usersData.map((user, index) => {
    const roleColors = {
      admin: '#667eea',
      editor: '#10b981',
      viewer: '#6b7280'
    };
    const roleNames = {
      admin: 'Admin',
      editor: 'Editör',
      viewer: 'Görüntüleyici'
    };
    
    return `
    <div class="app-item">
      <div class="app-item-icon" style="background: linear-gradient(135deg, ${roleColors[user.role] || '#667eea'}15 0%, ${roleColors[user.role] || '#667eea'}25 100%); border-color: ${roleColors[user.role] || '#667eea'}30;">
        👤
      </div>
      <div class="app-item-info">
        <div class="app-item-title">
          <span class="app-item-title-text">${user.username || 'İsimsiz'}</span>
        </div>
        <div class="app-item-desc">${user.email || 'E-posta yok'}</div>
        <div class="app-item-meta">
          <div class="app-item-meta-item" style="color: ${roleColors[user.role] || '#667eea'};">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 2L2 7l10 5 10-5-10-5z"></path>
              <path d="M2 17l10 5 10-5"></path>
              <path d="M2 12l10 5 10-5"></path>
            </svg>
            <span>${roleNames[user.role] || 'Bilinmeyen'}</span>
          </div>
          <div class="app-item-meta-item">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"></circle>
              <polyline points="12 6 12 12 16 14"></polyline>
            </svg>
            <span>${user.lastLogin ? new Date(user.lastLogin).toLocaleDateString('tr-TR') : 'Hiç giriş yapmadı'}</span>
          </div>
        </div>
      </div>
      <div class="app-item-actions">
        <button class="btn btn-secondary btn-sm" onclick="editUser(${index})" title="Düzenle">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16" style="margin-right: 4px;">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
          </svg>
          Düzenle
        </button>
        <button class="btn btn-danger btn-sm" onclick="deleteUser(${index})" title="Sil" ${user.username === 'admin' && usersData.length === 1 ? 'disabled style="opacity: 0.5; cursor: not-allowed;"' : ''}>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16" style="margin-right: 4px;">
            <polyline points="3 6 5 6 21 6"></polyline>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
          </svg>
          Sil
        </button>
      </div>
    </div>
    `;
  }).join('');
}

// Kullanıcı ekleme formunu göster
function showAddUserForm() {
  showSection('users');
  setTimeout(() => {
    document.getElementById('userFormTitle').textContent = 'Yeni Kullanıcı Ekle';
    document.getElementById('userForm').reset();
    document.getElementById('userIndex').value = '-1';
    document.getElementById('userPasswordConfirmGroup').style.display = 'block';
    document.getElementById('userPassword').required = true;
    document.getElementById('userPasswordConfirm').required = true;
    
  const modal = document.getElementById('userFormModal');
  if (modal) {
    // Modal açılmadan önce sidebar overlay'i gizle
    const sidebarOverlay = document.querySelector('.admin-sidebar-overlay');
    if (sidebarOverlay) {
      sidebarOverlay.style.display = 'none';
    }
    
    modal.classList.add('active');
    document.body.classList.add('modal-open');
  }
}, 100);
}

// Kullanıcı düzenleme formunu göster
function editUser(index) {
  const user = usersData[index];
  if (!user) return;
  
  document.getElementById('userFormTitle').textContent = 'Kullanıcı Düzenle';
  document.getElementById('userIndex').value = index;
  document.getElementById('userName').value = user.username || '';
  document.getElementById('userEmail').value = user.email || '';
  document.getElementById('userRole').value = user.role || 'viewer';
  document.getElementById('userPassword').value = '';
  document.getElementById('userPasswordConfirm').value = '';
  
  // Düzenleme modunda şifre opsiyonel
  document.getElementById('userPasswordConfirmGroup').style.display = 'block';
  document.getElementById('userPassword').required = false;
  document.getElementById('userPasswordConfirm').required = false;
  document.getElementById('userPassword').placeholder = 'Değiştirmek için yeni şifre girin (opsiyonel)';
  
  const modal = document.getElementById('userFormModal');
  if (modal) {
    // Modal açılmadan önce sidebar overlay'i gizle
    const sidebarOverlay = document.querySelector('.admin-sidebar-overlay');
    if (sidebarOverlay) {
      sidebarOverlay.style.display = 'none';
    }
    
    modal.classList.add('active');
    document.body.classList.add('modal-open');
  }
}

// Kullanıcı kaydet
async function saveUser(event) {
  event.preventDefault();
  
  // Form elemanlarını güvenli şekilde al
  const userIndexEl = document.getElementById('userIndex');
  const userNameEl = document.getElementById('userName');
  const userEmailEl = document.getElementById('userEmail');
  const userPasswordEl = document.getElementById('userPassword');
  const userPasswordConfirmEl = document.getElementById('userPasswordConfirm');
  const userRoleEl = document.getElementById('userRole');
  
  if (!userIndexEl || !userNameEl || !userEmailEl || !userPasswordEl || !userPasswordConfirmEl || !userRoleEl) {
    showAlert('❌ Form elemanları bulunamadı!', 'error');
    return;
  }
  
  const index = parseInt(userIndexEl.value);
  const username = userNameEl.value.trim();
  const email = userEmailEl.value.trim();
  const password = userPasswordEl.value;
  const passwordConfirm = userPasswordConfirmEl.value;
  const role = userRoleEl.value;
  
  // Validasyon
  if (!username) {
    showAlert('⚠️ Kullanıcı adı gereklidir!', 'error');
    return;
  }
  
  // Kullanıcı adı benzersizlik kontrolü
  const existingUser = usersData.find((u, i) => u.username.toLowerCase() === username.toLowerCase() && i !== index);
  if (existingUser) {
    showAlert('❌ Bu kullanıcı adı zaten kullanılıyor!', 'error');
    return;
  }
  
  // Şifre kontrolü
  if (index === -1) {
    // Yeni kullanıcı - şifre zorunlu
    if (!password || password.length < CONSTANTS.MIN_PASSWORD_LENGTH) {
      showAlert(`⚠️ Şifre en az ${CONSTANTS.MIN_PASSWORD_LENGTH} karakter olmalıdır!`, 'error');
      return;
    }
    if (password !== passwordConfirm) {
      showAlert('❌ Şifreler eşleşmiyor!', 'error');
      return;
    }
  } else {
    // Düzenleme - şifre değiştiriliyorsa kontrol et
    if (password) {
      if (password.length < CONSTANTS.MIN_PASSWORD_LENGTH) {
        showAlert(`⚠️ Şifre en az ${CONSTANTS.MIN_PASSWORD_LENGTH} karakter olmalıdır!`, 'error');
        return;
      }
      if (password !== passwordConfirm) {
        showAlert('❌ Şifreler eşleşmiyor!', 'error');
        return;
      }
    }
  }
  
  try {
    const userData = {
      id: index === -1 ? Date.now().toString() : usersData[index].id,
      username,
      email: email || null,
      role: role || 'viewer',
      createdAt: index === -1 ? new Date().toISOString() : usersData[index].createdAt,
      lastLogin: index === -1 ? null : usersData[index].lastLogin
    };
    
    // Şifre hash'le
    if (password) {
      userData.passwordHash = await hashPassword(password);
    } else if (index !== -1) {
      // Düzenleme modunda şifre değiştirilmediyse eski hash'i koru
      userData.passwordHash = usersData[index].passwordHash;
    }
    
    if (index === -1) {
      // Yeni kullanıcı ekle
      usersData.push(userData);
      showAlert('✅ Eklendi!', 'success');
    } else {
      // Kullanıcı güncelle
      usersData[index] = userData;
      showAlert('✅ Güncellendi!', 'success');
    }
    
    saveUsers();
    renderUsers();
    closeUserModal();
  } catch (error) {
    console.error('Kullanıcı kaydedilirken hata:', error);
    showAlert('❌ Bir hata oluştu!', 'error');
  }
}

// Kullanıcı sil
function deleteUser(index) {
  const user = usersData[index];
  if (!user) return;
  
  // Son admin kullanıcısını silmeyi engelle
  if (user.username === 'admin' && usersData.length === 1) {
    showAlert('⚠️ Son admin kullanıcısı silinemez!', 'error');
    return;
  }
  
  if (confirm(`"${user.username}" kullanıcısını silmek istediğinize emin misiniz?`)) {
    usersData.splice(index, 1);
    saveUsers();
    renderUsers();
    showAlert('✅ Silindi!', 'success');
  }
}

// Kullanıcı modal'ını kapat
function closeUserModal() {
  closeModal('userFormModal', 'userForm');
  const userIndex = document.getElementById('userIndex');
  if (userIndex) userIndex.value = '-1';
}

// Şifre değiştirme modal fonksiyonları
function showChangePasswordModal() {
  const modal = document.getElementById('changePasswordModal');
  if (modal) {
    // Modal açılmadan önce sidebar overlay'i gizle
    const sidebarOverlay = document.querySelector('.admin-sidebar-overlay');
    if (sidebarOverlay) {
      sidebarOverlay.style.display = 'none';
    }
    
    modal.classList.add('active');
    document.body.classList.add('modal-open');
    const scrollY = window.scrollY;
    document.body.style.top = `-${scrollY}px`;
  }
}

function closeChangePasswordModal() {
  closeModal('changePasswordModal', 'changePasswordForm');
  // Hata mesajlarını temizle
  document.querySelectorAll('.error-message').forEach(el => {
    el.textContent = '';
  });
}

// Şifre değiştirme
async function changePassword(event) {
  event.preventDefault();
  
  console.log('🔐 Şifre değiştirme işlemi başlatıldı');
  
  // usersData'nın yüklendiğinden emin ol
  if (!usersData || usersData.length === 0) {
    console.log('⚠️ usersData boş, yükleniyor...');
    loadUsers();
  }
  
  const currentPassword = document.getElementById('currentPassword').value;
  const newPassword = document.getElementById('newPassword').value;
  const confirmPassword = document.getElementById('confirmNewPassword').value;
  
  console.log('📝 Form verileri:', {
    currentPasswordLength: currentPassword.length,
    newPasswordLength: newPassword.length,
    confirmPasswordLength: confirmPassword.length,
    usersDataLength: usersData ? usersData.length : 0
  });
  
  const currentPasswordError = document.getElementById('currentPasswordError');
  const newPasswordError = document.getElementById('newPasswordError');
  const confirmPasswordError = document.getElementById('confirmPasswordError');
  
  // Hata mesajlarını temizle
  currentPasswordError.textContent = '';
  newPasswordError.textContent = '';
  confirmPasswordError.textContent = '';
  
  // Validasyon
  if (!currentPassword) {
    currentPasswordError.textContent = '⚠️ Mevcut şifrenizi girin.';
    document.getElementById('currentPassword').classList.add('error');
    return;
  }
  
  if (!newPassword || newPassword.length < CONSTANTS.MIN_PASSWORD_LENGTH) {
    newPasswordError.textContent = `⚠️ Yeni şifre en az ${CONSTANTS.MIN_PASSWORD_LENGTH} karakter olmalıdır.`;
    document.getElementById('newPassword').classList.add('error');
    return;
  }
  
  if (newPassword !== confirmPassword) {
    confirmPasswordError.textContent = '❌ Şifreler eşleşmiyor.';
    document.getElementById('confirmNewPassword').classList.add('error');
    return;
  }
  
  // Mevcut şifreyi kontrol et
  const hashedCurrentPassword = await hashPassword(currentPassword);
  
  // Önce session'dan giriş yapan kullanıcıyı bul
  const loggedInUsername = sessionStorage.getItem('adminUsername');
  let currentUser = null;
  let isPasswordValid = false;
  
  if (loggedInUsername) {
    // Session'dan kullanıcı adını al ve kullanıcıyı bul
    currentUser = usersData.find(user => user.username === loggedInUsername);
    
    // Eğer kullanıcı bulunduysa, mevcut şifresini kontrol et
    if (currentUser) {
      if (currentUser.passwordHash === hashedCurrentPassword) {
        isPasswordValid = true;
      } else if (hashedCurrentPassword === ADMIN_PASSWORD_HASH) {
        // Varsayılan admin şifresi kontrolü (geriye dönük uyumluluk için)
        isPasswordValid = true;
      }
    } else {
      // Kullanıcı bulunamadıysa, varsayılan admin şifresi kontrolü
      if (hashedCurrentPassword === ADMIN_PASSWORD_HASH) {
        // Varsayılan admin kullanıcısını oluştur veya bul
        currentUser = usersData.find(user => user.username === 'admin');
        if (!currentUser) {
          currentUser = {
            id: Date.now().toString(),
            username: 'admin',
            email: 'admin@example.com',
            passwordHash: ADMIN_PASSWORD_HASH,
            role: 'admin',
            createdAt: new Date().toISOString(),
            lastLogin: null
          };
          usersData.push(currentUser);
        }
        isPasswordValid = true;
      }
    }
  } else {
    // Session yoksa, önce şifre hash'ine göre kullanıcıyı bul
    currentUser = usersData.find(user => user.passwordHash === hashedCurrentPassword);
    
    if (currentUser) {
      isPasswordValid = true;
    } else if (hashedCurrentPassword === ADMIN_PASSWORD_HASH) {
      // Varsayılan admin şifresi kontrolü
      currentUser = usersData.find(user => user.username === 'admin');
      if (!currentUser) {
        currentUser = {
          id: Date.now().toString(),
          username: 'admin',
          email: 'admin@example.com',
          passwordHash: ADMIN_PASSWORD_HASH,
          role: 'admin',
          createdAt: new Date().toISOString(),
          lastLogin: null
        };
        usersData.push(currentUser);
      }
      isPasswordValid = true;
    }
  }
  
  // Şifre kontrolü başarısızsa hata ver
  if (!isPasswordValid || !currentUser) {
    console.error('❌ Şifre kontrolü başarısız:', {
      isPasswordValid,
      currentUser: currentUser ? currentUser.username : null,
      loggedInUsername
    });
    currentPasswordError.textContent = '❌ Mevcut şifre hatalı.';
    document.getElementById('currentPassword').classList.add('error');
    return;
  }
  
  console.log('✅ Kullanıcı bulundu ve şifre doğrulandı:', {
    username: currentUser.username,
    userId: currentUser.id
  });
  
  // Şifreyi güncelle
  const hashedNewPassword = await hashPassword(newPassword);
  console.log('🔐 Yeni şifre hash\'lendi');
  
  try {
    // Kullanıcı şifresini güncelle
    const oldHash = currentUser.passwordHash;
    currentUser.passwordHash = hashedNewPassword;
    console.log('🔄 Şifre güncellendi:', {
      username: currentUser.username,
      oldHash: oldHash ? oldHash.substring(0, 10) + '...' : 'null',
      newHash: hashedNewPassword.substring(0, 10) + '...'
    });
    
    // Değişiklikleri kaydet
    const saveSuccess = saveUsers();
    if (!saveSuccess) {
      throw new Error('Şifre kaydedilemedi!');
    }
    
    // Kayıt başarılı mı kontrol et
    const saved = localStorage.getItem('adminUsers');
    if (!saved) {
      throw new Error('Şifre kaydedilemedi!');
    }
    
    // Kaydedilen veriyi doğrula
    const savedData = JSON.parse(saved);
    const savedUser = savedData.find(u => u.id === currentUser.id);
    if (savedUser && savedUser.passwordHash === hashedNewPassword) {
      console.log('✅ Şifre localStorage\'a başarıyla kaydedildi ve doğrulandı');
    } else {
      console.error('❌ Şifre kaydedildi ama doğrulama başarısız!', {
        savedUserFound: !!savedUser,
        hashMatch: savedUser ? savedUser.passwordHash === hashedNewPassword : false
      });
    }
    
    // Kullanıcı listesini yeniden yükle (güncel veriler için)
    loadUsers();
    
    // Form'u temizle
    document.getElementById('changePasswordForm').reset();
    
    // Hata sınıflarını temizle
    document.getElementById('currentPassword').classList.remove('error');
    document.getElementById('newPassword').classList.remove('error');
    document.getElementById('confirmNewPassword').classList.remove('error');
    
    console.log('✅ Şifre başarıyla değiştirildi. Kullanıcı:', currentUser.username);
    showAlert('✅ Şifre değiştirildi!', 'success');
    closeChangePasswordModal();
  } catch (error) {
    console.error('❌ Şifre değiştirme hatası:', error);
    currentPasswordError.textContent = '❌ Şifre değiştirilemedi. Lütfen tekrar deneyin.';
    document.getElementById('currentPassword').classList.add('error');
  }
}

// Şifre göster/gizle (kullanıcı formu)
function toggleUserPassword() {
  togglePasswordVisibility('userPassword', 'userEyeIcon');
}

function toggleUserPasswordConfirm() {
  togglePasswordVisibility('userPasswordConfirm', 'userEyeIconConfirm');
}

// ==================== GERİ BİLDİRİM & OY YÖNETİMİ ====================

// Geri bildirimleri göster
function renderFeedback() {
  const container = document.getElementById('feedbackList');
  if (!container) {
    console.warn('⚠️ feedbackList container bulunamadı');
    return;
  }
  
  // Loading state
  container.innerHTML = '<p class="loading-text">Yükleniyor...</p>';
  
  const feedback = JSON.parse(localStorage.getItem('aiFeedback') || '[]');
  
  if (feedback.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; padding: 60px 20px;">
        <div style="font-size: 4rem; margin-bottom: 20px; opacity: 0.3;">💬</div>
        <h3 style="color: #1a1a1a; margin: 0 0 12px 0; font-size: 1.25rem; font-weight: 600;">Henüz geri bildirim yok</h3>
        <p style="color: #6b7280; margin: 0; font-size: 0.95rem;">Kullanıcılar AI Asistan üzerinden geri bildirim gönderdiğinde burada görünecek</p>
      </div>
    `;
    return;
  }
  
  container.innerHTML = feedback.reverse().map((item, index) => {
    const date = new Date(item.timestamp);
    const timeAgo = getTimeAgo(date);
    
    return `
      <div class="app-item">
        <div class="app-item-icon" style="background: linear-gradient(135deg, #667eea15 0%, #764ba215 100%);">
          💬
        </div>
        <div class="app-item-info">
          <div class="app-item-title">
            <span class="app-item-title-text">Geri Bildirim #${feedback.length - index}</span>
          </div>
          <div class="app-item-desc">${item.message}</div>
          <div class="app-item-meta">
            <div class="app-item-meta-item">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"></circle>
                <polyline points="12 6 12 12 16 14"></polyline>
              </svg>
              <span>${timeAgo}</span>
            </div>
            <div class="app-item-meta-item">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
                <line x1="8" y1="21" x2="16" y2="21"></line>
                <line x1="12" y1="17" x2="12" y2="21"></line>
              </svg>
              <span>${date.toLocaleDateString('tr-TR')} ${date.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
          </div>
        </div>
        <div class="app-item-actions">
          <button class="btn btn-danger btn-sm" onclick="deleteFeedback(${feedback.length - 1 - index})" title="Sil">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16" style="margin-right: 4px;">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            </svg>
            Sil
          </button>
        </div>
      </div>
    `;
  }).join('');
}

// Oyları göster
function renderVotes() {
  const container = document.getElementById('votesList');
  if (!container) {
    console.warn('⚠️ votesList container bulunamadı');
    return;
  }
  
  // Loading state
  container.innerHTML = '<p class="loading-text">Yükleniyor...</p>';
  
  const votes = JSON.parse(localStorage.getItem('aiVotes') || '{}');
  const voteEntries = Object.entries(votes);
  
  if (voteEntries.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; padding: 60px 20px;">
        <div style="font-size: 4rem; margin-bottom: 20px; opacity: 0.3;">⭐</div>
        <h3 style="color: #1a1a1a; margin: 0 0 12px 0; font-size: 1.25rem; font-weight: 600;">Henüz oy yok</h3>
        <p style="color: #6b7280; margin: 0; font-size: 0.95rem;">Kullanıcılar uygulamalara oy verdiğinde burada görünecek</p>
      </div>
    `;
    return;
  }
  
  container.innerHTML = voteEntries.map(([appName, voteData]) => {
    const totalVotes = voteData.upvotes + voteData.downvotes;
    const upvotePercent = totalVotes > 0 ? Math.round((voteData.upvotes / totalVotes) * 100) : 0;
    
    return `
      <div class="app-item">
        <div class="app-item-icon" style="background: linear-gradient(135deg, #10b98115 0%, #05966915 100%);">
          ⭐
        </div>
        <div class="app-item-info">
          <div class="app-item-title">
            <span class="app-item-title-text">${appName}</span>
          </div>
          <div class="app-item-desc">
            <div style="display: flex; gap: 20px; margin-top: 8px;">
              <div style="display: flex; align-items: center; gap: 6px; color: #10b981;">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
                  <path d="M14 9V5a3 3 0 0 0-6 0v4"></path>
                  <rect x="2" y="9" width="20" height="11" rx="2" ry="2"></rect>
                  <path d="M12 14v3"></path>
                </svg>
                <span><strong>${voteData.upvotes}</strong> Beğeni</span>
              </div>
              <div style="display: flex; align-items: center; gap: 6px; color: #ef4444;">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16" style="transform: rotate(180deg);">
                  <path d="M14 9V5a3 3 0 0 0-6 0v4"></path>
                  <rect x="2" y="9" width="20" height="11" rx="2" ry="2"></rect>
                  <path d="M12 14v3"></path>
                </svg>
                <span><strong>${voteData.downvotes}</strong> Beğenmeme</span>
              </div>
            </div>
            <div style="margin-top: 12px;">
              <div style="background: #e5e7eb; height: 8px; border-radius: 4px; overflow: hidden;">
                <div style="background: linear-gradient(90deg, #10b981 0%, #059669 100%); height: 100%; width: ${upvotePercent}%; transition: width 0.3s ease;"></div>
              </div>
              <div style="font-size: 0.85rem; color: #6b7280; margin-top: 4px;">
                %${upvotePercent} olumlu (${totalVotes} toplam oy)
              </div>
            </div>
          </div>
        </div>
        <div class="app-item-actions">
          <button class="btn btn-danger btn-sm" onclick="deleteVote('${appName}')" title="Oyları Sıfırla">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16" style="margin-right: 4px;">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            </svg>
            Sıfırla
          </button>
        </div>
      </div>
    `;
  }).join('');
}

// Geri bildirim sil
function deleteFeedback(index) {
  const feedback = JSON.parse(localStorage.getItem('aiFeedback') || '[]');
  if (confirm('Bu geri bildirimi silmek istediğinize emin misiniz?')) {
    feedback.splice(index, 1);
    localStorage.setItem('aiFeedback', JSON.stringify(feedback));
    renderFeedback();
    showAlert('✅ Geri bildirim silindi!', 'success');
  }
}

// Oy sil
function deleteVote(appName) {
  const votes = JSON.parse(localStorage.getItem('aiVotes') || '{}');
  if (confirm(`"${appName}" için tüm oyları sıfırlamak istediğinize emin misiniz?`)) {
    delete votes[appName];
    localStorage.setItem('aiVotes', JSON.stringify(votes));
    renderVotes();
    showAlert('✅ Oylar sıfırlandı!', 'success');
  }
}

// ==================== BİLDİRİM & VERSİYON YÖNETİMİ ====================

// Bildirim config'ini yükle
async function loadNotificationsConfig() {
  try {
    // GitHub Pages'den yükle (öncelikli)
    let config = {};
    let response = null;
    
    // Önce GitHub Pages'den dene
    try {
      response = await fetch('https://bambinifojo.github.io/app_config.json?t=' + Date.now());
      if (response.ok) {
        config = await response.json();
      }
    } catch (githubError) {
      console.warn('GitHub Pages\'den config yüklenemedi, Netlify deneniyor...', githubError);
    }
    
    // Eğer GitHub Pages'den yüklenemediyse Netlify'dan dene
    if (!config.latest_version) {
      try {
        response = await fetch('https://bambinifojo.netlify.app/app_config.json?t=' + Date.now());
        if (response && response.ok) {
          config = await response.json();
        }
      } catch (netlifyError) {
        console.warn('Netlify\'dan config yüklenemedi, varsayılan değerler kullanılıyor...', netlifyError);
      }
    }
    
    // Eğer hiçbirinden yüklenemediyse varsayılan değerleri kullan
    if (!config.latest_version) {
      config = {
        latest_version: "1.0.0",
        force_update: false,
        update_message: "Yeni sürüm mevcut! Lütfen uygulamayı güncelleyin.",
        broadcast_enabled: false,
        broadcast_title: "Yeni Görev Yayınlandı!",
        broadcast_message: "Yeni bölümler aktif! Hemen kontrol edin.",
        maintenance: false,
        maintenance_message: "Bakım çalışmaları sürüyor. Lütfen daha sonra tekrar deneyin."
      };
    }
    
    // Form alanlarını güvenli şekilde doldur
    const latestVersionEl = document.getElementById('latest_version');
    const forceUpdateEl = document.getElementById('force_update');
    const updateMessageEl = document.getElementById('update_message');
    const playStoreUrlEl = document.getElementById('play_store_url');
    const broadcastTitleEl = document.getElementById('broadcast_title');
    const broadcastMessageEl = document.getElementById('broadcast_message');
    const broadcastEnabledEl = document.getElementById('broadcast_enabled');
    const maintenanceEl = document.getElementById('maintenance');
    const maintenanceMessageEl = document.getElementById('maintenance_message');
    
    if (latestVersionEl) latestVersionEl.value = config.latest_version || "1.0.0";
    if (forceUpdateEl) forceUpdateEl.value = String(config.force_update || false);
    if (updateMessageEl) updateMessageEl.value = config.update_message || "";
    if (playStoreUrlEl) playStoreUrlEl.value = config.play_store_url || "https://play.google.com/store/apps/details?id=com.taskcosmos.app";
    if (broadcastTitleEl) broadcastTitleEl.value = config.broadcast_title || "";
    if (broadcastMessageEl) broadcastMessageEl.value = config.broadcast_message || "";
    if (broadcastEnabledEl) broadcastEnabledEl.value = String(config.broadcast_enabled || false);
    if (maintenanceEl) maintenanceEl.value = String(config.maintenance || false);
    if (maintenanceMessageEl) maintenanceMessageEl.value = config.maintenance_message || "";
    
  } catch (error) {
    // Hata durumunda sessizce varsayılan değerleri kullan (kullanıcıyı rahatsız etme)
    // Sadece geliştirme modunda log göster
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      console.warn('Config yükleme hatası (varsayılan değerler kullanılıyor):', error);
    }
    
    // Varsayılan config değerleri
    const config = {
      latest_version: "1.0.0",
      force_update: false,
      update_message: "Yeni sürüm mevcut! Lütfen uygulamayı güncelleyin.",
      broadcast_enabled: false,
      broadcast_title: "Yeni Görev Yayınlandı!",
      broadcast_message: "Yeni bölümler aktif! Hemen kontrol edin.",
      maintenance: false,
      maintenance_message: "Bakım çalışmaları sürüyor. Lütfen daha sonra tekrar deneyin."
    };
    
    // Hata durumunda varsayılan değerleri form'a yükle
    const latestVersionEl = document.getElementById('latest_version');
    const forceUpdateEl = document.getElementById('force_update');
    const updateMessageEl = document.getElementById('update_message');
    const playStoreUrlEl = document.getElementById('play_store_url');
    const broadcastTitleEl = document.getElementById('broadcast_title');
    const broadcastMessageEl = document.getElementById('broadcast_message');
    const broadcastEnabledEl = document.getElementById('broadcast_enabled');
    const maintenanceEl = document.getElementById('maintenance');
    const maintenanceMessageEl = document.getElementById('maintenance_message');
    
    // Form alanlarını varsayılan değerlerle doldur
    if (latestVersionEl) latestVersionEl.value = config.latest_version || "1.0.0";
    if (forceUpdateEl) forceUpdateEl.value = String(config.force_update || false);
    if (updateMessageEl) updateMessageEl.value = config.update_message || "";
    if (playStoreUrlEl) playStoreUrlEl.value = config.play_store_url || "https://play.google.com/store/apps/details?id=com.taskcosmos.app";
    if (broadcastTitleEl) broadcastTitleEl.value = config.broadcast_title || "";
    if (broadcastMessageEl) broadcastMessageEl.value = config.broadcast_message || "";
    if (broadcastEnabledEl) broadcastEnabledEl.value = String(config.broadcast_enabled || false);
    if (maintenanceEl) maintenanceEl.value = String(config.maintenance || false);
    if (maintenanceMessageEl) maintenanceMessageEl.value = config.maintenance_message || "";
  }
}

// Bildirim config'ini kaydet
async function saveNotificationsConfig(event) {
  event.preventDefault();
  
  const saveBtn = document.getElementById('saveNotificationsBtn');
  const originalText = saveBtn.querySelector('span')?.textContent || '💾 Kaydet';
  
  // Loading state
  saveBtn.disabled = true;
  saveBtn.querySelector('span').textContent = '⏳ Kaydediliyor...';
  
  try {
    // Form verilerini güvenli şekilde topla
    const latestVersionEl = document.getElementById('latest_version');
    const forceUpdateEl = document.getElementById('force_update');
    const updateMessageEl = document.getElementById('update_message');
    const playStoreUrlEl = document.getElementById('play_store_url');
    const broadcastEnabledEl = document.getElementById('broadcast_enabled');
    const broadcastTitleEl = document.getElementById('broadcast_title');
    const broadcastMessageEl = document.getElementById('broadcast_message');
    const maintenanceEl = document.getElementById('maintenance');
    const maintenanceMessageEl = document.getElementById('maintenance_message');
    
    if (!latestVersionEl || !forceUpdateEl || !updateMessageEl || !broadcastEnabledEl || 
        !broadcastTitleEl || !broadcastMessageEl || !maintenanceEl || !maintenanceMessageEl) {
      throw new Error('Form elemanları bulunamadı!');
    }
    
    const config = {
      latest_version: latestVersionEl.value.trim(),
      force_update: forceUpdateEl.value === 'true',
      update_message: updateMessageEl.value.trim(),
      play_store_url: playStoreUrlEl ? playStoreUrlEl.value.trim() || "https://play.google.com/store/apps/details?id=com.taskcosmos.app" : "https://play.google.com/store/apps/details?id=com.taskcosmos.app",
      broadcast_enabled: broadcastEnabledEl.value === 'true',
      broadcast_title: broadcastTitleEl.value.trim(),
      broadcast_message: broadcastMessageEl.value.trim(),
      maintenance: maintenanceEl.value === 'true',
      maintenance_message: maintenanceMessageEl.value.trim()
    };
    
    // Validasyon - boş string kontrolü
    if (!config.latest_version.trim() || !config.update_message.trim() || !config.broadcast_title.trim() || 
        !config.broadcast_message.trim() || !config.maintenance_message.trim()) {
      throw new Error('Lütfen tüm zorunlu alanları doldurun.');
    }
    
    // Versiyon format kontrolü
    if (!/^\d+\.\d+\.\d+$/.test(config.latest_version)) {
      throw new Error('Versiyon formatı hatalı. Format: X.Y.Z (örn: 1.0.0)');
    }
    
    // Netlify Function ile GitHub'a kaydet
    try {
      const response = await fetch('/.netlify/functions/updateConfig', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(config)
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Kaydetme başarısız oldu');
      }
      
      showAlert('✅ Kaydedildi!', 'success');
    } catch (error) {
      // Netlify Function çalışmıyorsa fallback
      console.warn('Netlify Function hatası, fallback kullanılıyor:', error);
      if (currentMode === 'github' && token) {
        await saveConfigToGitHub(config);
      } else {
        localStorage.setItem('app_config', JSON.stringify(config));
        showAlert('⚠️ LocalStorage\'a kaydedildi', 'info');
      }
    }
    
    saveBtn.querySelector('span').textContent = '✅ Kaydedildi!';
    setTimeout(() => {
      saveBtn.querySelector('span').textContent = originalText;
      saveBtn.disabled = false;
    }, 2000);
    
  } catch (error) {
    console.error('Kaydetme hatası:', error);
    showAlert('❌ Hata: ' + error.message, 'error');
    saveBtn.querySelector('span').textContent = originalText;
    saveBtn.disabled = false;
  }
}

// GitHub'a config kaydet
async function saveConfigToGitHub(config) {
  const REPO_OWNER = 'Bambinifojo';
  const REPO_NAME = 'Bambinifojo.github.io';
  const FILE_PATH = 'app_config.json';
  const FILE_URL = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${FILE_PATH}`;
  
  try {
    // Önce mevcut dosyayı al (SHA için)
    let sha = null;
    try {
      const getResponse = await fetch(FILE_URL, {
        headers: {
          'Authorization': `token ${token}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      });
      
      if (getResponse.ok) {
        const fileData = await getResponse.json();
        sha = fileData.sha;
      }
    } catch (e) {
      // Dosya yoksa SHA null kalır (yeni dosya oluşturulacak)
    }
    
    // JSON'u string'e çevir
    const content = JSON.stringify(config, null, 2);
    const encodedContent = btoa(unescape(encodeURIComponent(content)));
    
    // GitHub API'ye gönder
    const response = await fetch(FILE_URL, {
      method: 'PUT',
      headers: {
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: `Bildirim ayarları güncellendi - ${new Date().toLocaleString('tr-TR')}`,
        content: encodedContent,
        sha: sha // Mevcut dosya varsa SHA gerekli
      })
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'GitHub\'a kaydetme başarısız oldu.');
    }
    
    showAlert('✅ Kaydedildi!', 'success');
    
  } catch (error) {
    console.error('GitHub kaydetme hatası:', error);
    throw error;
  }
}

// ==================== UYGULAMA BAZLI BİLDİRİM YÖNETİMİ ====================

// Uygulamalar listesini dropdown'a yükle
function populateAppNotificationSelect() {
  const select = document.getElementById('notification_app_select');
  if (!select) {
    console.warn('⚠️ notification_app_select elementi bulunamadı');
    return;
  }
  
  // Mevcut seçenekleri temizle (ilk seçenek hariç)
  while (select.children.length > 1) {
    select.removeChild(select.lastChild);
  }
  
  // appsData yüklenmemişse, yüklemeyi dene
  if (!appsData || !appsData.apps) {
    console.warn('⚠️ appsData henüz yüklenmemiş, yükleniyor...');
    
    // LocalStorage'dan yükle
    const saved = localStorage.getItem('appsData');
    if (saved) {
      try {
        appsData = JSON.parse(saved);
      } catch (e) {
        console.error('LocalStorage\'dan appsData parse edilemedi:', e);
        appsData = { apps: [] };
      }
    }
    
    // Hala yoksa, JSON dosyasından yükle
    if (!appsData || !appsData.apps || appsData.apps.length === 0) {
      console.log('📥 apps.json dosyasından yükleniyor...');
      fetch('/data/apps.json')
        .then(res => {
          if (!res.ok) {
            throw new Error(`HTTP ${res.status}: ${res.statusText}`);
          }
          return res.json();
        })
        .then(data => {
          console.log('✅ apps.json yüklendi:', data.apps?.length || 0, 'uygulama');
          appsData = data;
          saveToLocal();
          populateAppNotificationSelect(); // Tekrar çağır
        })
        .catch(error => {
          console.error('❌ apps.json yüklenirken hata:', error);
          appsData = { apps: [] };
          populateAppNotificationSelect(); // Tekrar çağır (boş liste ile)
        });
      return; // Async işlem devam ediyor, şimdilik çık
    }
  }
  
  // appsData yüklü, kontrol et
  console.log('📊 appsData durumu:', {
    appsDataVar: !!appsData,
    appsArray: !!appsData?.apps,
    appsCount: appsData?.apps?.length || 0,
    apps: appsData?.apps?.map(a => a.title) || []
  });
  
  // Uygulamaları ekle
  if (appsData && appsData.apps && appsData.apps.length > 0) {
    appsData.apps.forEach((app, index) => {
      const option = document.createElement('option');
      option.value = index;
      option.textContent = `${app.icon || '📱'} ${app.title || 'İsimsiz'}`;
      select.appendChild(option);
    });
    console.log(`✅ ${appsData.apps.length} uygulama dropdown'a eklendi:`, appsData.apps.map(a => a.title));
  } else {
    const option = document.createElement('option');
    option.value = '';
    option.textContent = 'Henüz uygulama yok';
    option.disabled = true;
    select.appendChild(option);
    console.warn('⚠️ Uygulama bulunamadı, dropdown boş. appsData:', appsData);
  }
}

// Seçilen uygulama için bildirim ayarlarını yükle
function loadAppNotificationSettings(appIndex) {
  const settingsDiv = document.getElementById('appNotificationSettings');
  const actionsDiv = document.getElementById('appNotificationActions');
  
  if (!appIndex || appIndex === '') {
    if (settingsDiv) settingsDiv.classList.add('hidden');
    if (actionsDiv) actionsDiv.classList.add('hidden');
    return;
  }
  
  const app = appsData.apps[parseInt(appIndex)];
  if (!app) {
    showAlert('❌ Uygulama bulunamadı!', 'error');
    return;
  }
  
  // Form alanlarını göster
  if (settingsDiv) settingsDiv.classList.remove('hidden');
  if (actionsDiv) actionsDiv.classList.remove('hidden');
  
  // Mevcut bildirim ayarlarını yükle
  const notification = app.notification || {};
  
  const latestVersionEl = document.getElementById('latest_version');
  const forceUpdateEl = document.getElementById('force_update');
  const updateMessageEl = document.getElementById('update_message');
  const playStoreUrlEl = document.getElementById('play_store_url');
  const notificationEnabledEl = document.getElementById('notification_enabled');
  const durationTypeEl = document.getElementById('notification_duration_type');
  const durationValueEl = document.getElementById('notification_duration_value');
  const durationValueGroup = document.getElementById('notification_duration_value_group');
  const durationHint = document.getElementById('notification_duration_hint');
  
  if (latestVersionEl) latestVersionEl.value = notification.latest_version || '';
  if (forceUpdateEl) forceUpdateEl.value = String(notification.force_update || false);
  if (updateMessageEl) updateMessageEl.value = notification.update_message || '';
  if (playStoreUrlEl) playStoreUrlEl.value = app.details && app.details !== '#' ? app.details : '';
  if (notificationEnabledEl) notificationEnabledEl.value = String(notification.enabled || false);
  
  // Süreli bildirim ayarları
  if (notification.duration) {
    if (notification.duration.type === 'hours') {
      if (durationTypeEl) durationTypeEl.value = 'hours';
      if (durationValueEl) durationValueEl.value = notification.duration.value || '';
      if (durationValueGroup) durationValueGroup.classList.remove('hidden');
      if (durationHint) durationHint.textContent = 'Bildirimin kaç saat gösterileceğini girin';
    } else if (notification.duration.type === 'days') {
      if (durationTypeEl) durationTypeEl.value = 'days';
      if (durationValueEl) durationValueEl.value = notification.duration.value || '';
      if (durationValueGroup) durationValueGroup.classList.remove('hidden');
      if (durationHint) durationHint.textContent = 'Bildirimin kaç gün gösterileceğini girin';
    } else {
      if (durationTypeEl) durationTypeEl.value = 'none';
      if (durationValueGroup) durationValueGroup.classList.add('hidden');
    }
  } else {
    if (durationTypeEl) durationTypeEl.value = 'none';
    if (durationValueGroup) durationValueGroup.classList.add('hidden');
  }
  
  // Süre tipi değişikliği event'ini tetikle (UI güncellemesi için)
  if (durationTypeEl) {
    setTimeout(() => {
      onNotificationDurationTypeChange();
    }, 50);
  }
}

// Uygulama formu için süre tipi değiştiğinde input'u göster/gizle
function onAppNotificationDurationTypeChange() {
  const durationTypeEl = document.getElementById('appNotificationDurationType');
  const durationValueGroup = document.getElementById('appNotificationDurationValueGroup');
  const durationHint = document.getElementById('appNotificationDurationHint');
  const durationValueEl = document.getElementById('appNotificationDurationValue');
  
  if (!durationTypeEl || !durationValueGroup) return;
  
  const type = durationTypeEl.value;
  
  if (type === 'none') {
    durationValueGroup.classList.add('hidden');
    if (durationValueEl) durationValueEl.required = false;
  } else {
    durationValueGroup.classList.remove('hidden');
    if (durationValueEl) durationValueEl.required = true;
    
    if (type === 'hours') {
      if (durationHint) durationHint.textContent = 'Bildirimin kaç saat gösterileceğini girin';
      if (durationValueEl) durationValueEl.placeholder = 'Örn: 24';
    } else if (type === 'days') {
      if (durationHint) durationHint.textContent = 'Bildirimin kaç gün gösterileceğini girin';
      if (durationValueEl) durationValueEl.placeholder = 'Örn: 7';
    }
  }
}

// Süre tipi değiştiğinde input'u göster/gizle
function onNotificationDurationTypeChange() {
  const durationTypeEl = document.getElementById('notification_duration_type');
  const durationValueGroup = document.getElementById('notification_duration_value_group');
  const durationHint = document.getElementById('notification_duration_hint');
  const durationValueEl = document.getElementById('notification_duration_value');
  
  if (!durationTypeEl || !durationValueGroup) return;
  
  const type = durationTypeEl.value;
  
  if (type === 'none') {
    durationValueGroup.classList.add('hidden');
    if (durationValueEl) durationValueEl.required = false;
  } else {
    durationValueGroup.classList.remove('hidden');
    if (durationValueEl) durationValueEl.required = true;
    
    if (type === 'hours') {
      if (durationHint) durationHint.textContent = 'Bildirimin kaç saat gösterileceğini girin';
      if (durationValueEl) durationValueEl.placeholder = 'Örn: 24';
    } else if (type === 'days') {
      if (durationHint) durationHint.textContent = 'Bildirimin kaç gün gösterileceğini girin';
      if (durationValueEl) durationValueEl.placeholder = 'Örn: 7';
    }
  }
}

// Uygulama bildirim ayarlarını kaydet
async function saveAppNotification(event) {
  event.preventDefault();
  
  const appSelect = document.getElementById('notification_app_select');
  if (!appSelect || !appSelect.value) {
    showAlert('⚠️ Lütfen bir uygulama seçin!', 'error');
    return;
  }
  
  const appIndex = parseInt(appSelect.value);
  const app = appsData.apps[appIndex];
  if (!app) {
    showAlert('❌ Uygulama bulunamadı!', 'error');
    return;
  }
  
  const saveBtn = document.getElementById('saveAppNotificationBtn');
  const originalText = saveBtn.querySelector('span')?.textContent || '💾 Kaydet';
  
  // Loading state
  saveBtn.disabled = true;
  saveBtn.querySelector('span').textContent = '⏳ Kaydediliyor...';
  
  try {
    // Form verilerini topla
    const latestVersionEl = document.getElementById('latest_version');
    const forceUpdateEl = document.getElementById('force_update');
    const updateMessageEl = document.getElementById('update_message');
    const playStoreUrlEl = document.getElementById('play_store_url');
    const notificationEnabledEl = document.getElementById('notification_enabled');
    const durationTypeEl = document.getElementById('notification_duration_type');
    const durationValueEl = document.getElementById('notification_duration_value');
    
    if (!latestVersionEl || !forceUpdateEl || !updateMessageEl || !notificationEnabledEl) {
      throw new Error('Form elemanları bulunamadı!');
    }
    
    const latestVersion = latestVersionEl.value.trim();
    const updateMessage = updateMessageEl.value.trim();
    const notificationEnabled = notificationEnabledEl.value === 'true';
    
    // Validasyon
    if (!latestVersion || !updateMessage) {
      throw new Error('Lütfen tüm zorunlu alanları doldurun.');
    }
    
    // Versiyon format kontrolü
    if (!/^\d+\.\d+\.\d+$/.test(latestVersion)) {
      throw new Error('Versiyon formatı hatalı. Format: X.Y.Z (örn: 1.0.0)');
    }
    
    // Süreli bildirim kontrolü
    const durationType = durationTypeEl?.value || 'none';
    const durationValue = durationValueEl?.value || '';
    
    if ((durationType === 'hours' || durationType === 'days') && !durationValue) {
      throw new Error('Lütfen bildirim süresini girin.');
    }
    
    // Bildirim objesi oluştur
    const notification = {
      latest_version: latestVersion,
      force_update: forceUpdateEl.value === 'true',
      update_message: updateMessage,
      enabled: notificationEnabled
    };
    
    // Süreli bildirim ayarları
    if (durationType !== 'none' && durationValue) {
      notification.duration = {
        type: durationType,
        value: parseInt(durationValue),
        start_time: new Date().toISOString() // Bildirim başlangıç zamanı
      };
    }
    
    // Play Store URL'i güncelle
    if (playStoreUrlEl && playStoreUrlEl.value.trim()) {
      app.details = playStoreUrlEl.value.trim();
    }
    
    // Uygulama bildirim ayarlarını güncelle
    if (notificationEnabled) {
      app.notification = notification;
    } else {
      // Bildirim kapalıysa, sadece enabled false yap, diğer ayarları koru
      if (app.notification) {
        app.notification.enabled = false;
      } else {
        app.notification = { enabled: false };
      }
    }
    
    // GitHub Pages kontrolü - Netlify Functions çalışmaz, direkt LocalStorage'a kaydet
    const isGitHubPages = window.location.hostname.includes('github.io') || 
                          window.location.hostname.includes('github.com') ||
                          currentMode === 'local';
    
    if (isGitHubPages) {
      // GitHub Pages'deyse direkt LocalStorage'a kaydet
      saveToLocal();
      showAlert('✅ Bildirim ayarları kaydedildi!', 'success');
      
      // Eğer GitHub modu aktifse ve token varsa, manuel kaydetmeyi dene
      if (currentMode === 'github' && token) {
        try {
          await saveToGitHub();
          showAlert('✅ GitHub\'a manuel olarak kaydedildi!', 'success');
        } catch (githubError) {
          const githubErrorMessage = githubError instanceof Error ? githubError.message : 'Bilinmeyen hata';
          console.error('GitHub kaydetme hatası:', githubError);
          showAlert(`❌ GitHub kaydetme hatası: ${githubErrorMessage}`, 'error');
        }
      }
    } else {
      // Netlify'da ise Netlify Function'ı kullan
      try {
        const response = await fetch('/.netlify/functions/updateApps', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(appsData)
        });
        
        const contentType = response.headers.get('content-type');
        let result;
        
        if (contentType && contentType.includes('application/json')) {
          result = await response.json();
        } else {
          const text = await response.text();
          if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            console.warn('Netlify Function HTML response:', text.substring(0, 200));
          }
          throw new Error(`Netlify Function çalışmıyor (${response.status}): ${response.statusText}`);
        }
        
        if (response.ok) {
          saveToLocal();
          showAlert('✅ Bildirim ayarları kaydedildi!', 'success');
          autoRefreshPreview();
        } else {
          throw new Error(result.error || `GitHub kaydetme başarısız (${response.status})`);
        }
      } catch (error) {
        // Hata yönetimi - kullanıcı dostu mesajlar
        const errorMessage = error instanceof Error ? error.message : 'Bilinmeyen hata';
        
        // Sadece localhost'ta logla
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
          console.warn('Netlify Function hatası:', errorMessage);
        }
        
        saveToLocal(); // LocalStorage'a backup olarak kaydet
        showAlert('ℹ️ LocalStorage\'a kaydedildi', 'info');
        
        // Eğer GitHub modu aktifse ve token varsa, manuel kaydetmeyi dene
        if (currentMode === 'github' && token) {
          try {
            await saveToGitHub();
            showAlert('✅ GitHub\'a manuel olarak kaydedildi!', 'success');
          } catch (githubError) {
            const githubErrorMessage = githubError instanceof Error ? githubError.message : 'Bilinmeyen hata';
            console.error('GitHub kaydetme hatası:', githubError);
            showAlert(`❌ GitHub kaydetme hatası: ${githubErrorMessage}`, 'error');
          }
        }
      }
    }
    
    // Aktif bildirimler listesini güncelle
    renderActiveNotifications();
    
    saveBtn.querySelector('span').textContent = '✅ Kaydedildi!';
    setTimeout(() => {
      saveBtn.querySelector('span').textContent = originalText;
      saveBtn.disabled = false;
    }, 2000);
  
} catch (error) {
    console.error('Bildirim kaydetme hatası:', error);
    const errorMessage = error instanceof Error ? error.message : 'Bilinmeyen bir hata oluştu';
    showAlert(`❌ ${errorMessage}`, 'error');
    saveBtn.querySelector('span').textContent = originalText;
    saveBtn.disabled = false;
  }
}

// Bildirim formunu sıfırla
function resetAppNotificationForm() {
  const appSelect = document.getElementById('notification_app_select');
  if (appSelect) appSelect.value = '';
  
  const settingsDiv = document.getElementById('appNotificationSettings');
  const actionsDiv = document.getElementById('appNotificationActions');
  
  if (settingsDiv) settingsDiv.classList.add('hidden');
  if (actionsDiv) actionsDiv.classList.add('hidden');
  
  // Form'u temizle
  const form = document.getElementById('notificationsForm');
  if (form) form.reset();
  
  // Süre input'unu gizle
  const durationValueGroup = document.getElementById('notification_duration_value_group');
  if (durationValueGroup) durationValueGroup.classList.add('hidden');
}

// Aktif bildirimleri listele
function renderActiveNotifications() {
  const container = document.getElementById('activeNotificationsList');
  if (!container) return;
  
  if (!appsData || !appsData.apps || appsData.apps.length === 0) {
    container.innerHTML = '<p class="empty-state">Henüz bildirim yok</p>';
    return;
  }
  
  const now = new Date();
  const activeNotifications = [];
  
  // Tüm uygulamaları kontrol et
  appsData.apps.forEach((app, index) => {
    if (app.notification && app.notification.enabled) {
      const notification = app.notification;
      let isActive = true;
      let remainingTime = null;
      let statusText = 'Aktif';
      
      // Süreli bildirim kontrolü
      if (notification.duration) {
        const duration = notification.duration;
        const startTime = new Date(duration.start_time);
        let durationInMs = 0;
        
        if (duration.type === 'hours') {
          durationInMs = duration.value * 60 * 60 * 1000;
        } else if (duration.type === 'days') {
          durationInMs = duration.value * 24 * 60 * 60 * 1000;
        }
        
        const elapsed = now.getTime() - startTime.getTime();
        const remaining = durationInMs - elapsed;
        
        if (remaining <= 0) {
          isActive = false;
          statusText = 'Süresi Doldu';
        } else {
          // Kalan süreyi hesapla
          if (duration.type === 'hours') {
            const hours = Math.floor(remaining / (60 * 60 * 1000));
            const minutes = Math.floor((remaining % (60 * 60 * 1000)) / (60 * 1000));
            remainingTime = `${hours} saat ${minutes} dakika`;
          } else if (duration.type === 'days') {
            const days = Math.floor(remaining / (24 * 60 * 60 * 1000));
            const hours = Math.floor((remaining % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
            remainingTime = `${days} gün ${hours} saat`;
          }
        }
      } else {
        statusText = 'Süresiz';
      }
      
      if (isActive) {
        activeNotifications.push({
          app,
          index,
          notification,
          remainingTime,
          statusText
        });
      }
    }
  });
  
  if (activeNotifications.length === 0) {
    container.innerHTML = '<p class="empty-state">Şu anda aktif bildirim yok</p>';
    return;
  }
  
  // Bildirimleri render et
  const notificationsHTML = activeNotifications.map(({ app, index, notification, remainingTime, statusText }) => {
    const startTime = notification.duration ? new Date(notification.duration.start_time) : null;
    const startTimeStr = startTime ? startTime.toLocaleString('tr-TR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    }) : '-';
    
    return `
      <div class="notification-item">
        <div class="notification-item-header">
          <div class="notification-item-title">
            <span class="notification-app-icon">${app.icon || '📱'}</span>
            <div>
              <h3>${app.title || 'İsimsiz Uygulama'}</h3>
              <p class="notification-item-subtitle">${notification.update_message || 'Bildirim mesajı yok'}</p>
            </div>
          </div>
          <div class="notification-item-actions">
            <button class="btn btn-small btn-secondary" onclick="editAppNotification(${index})" title="Düzenle">
              <span>✏️ Düzenle</span>
            </button>
            <button class="btn btn-small btn-danger" onclick="deactivateNotification(${index})" title="Kapat">
              <span>❌ Kapat</span>
            </button>
          </div>
        </div>
        <div class="notification-item-details">
          <div class="notification-detail-item">
            <span class="notification-detail-label">Versiyon:</span>
            <span class="notification-detail-value">${notification.latest_version || '1.0.0'}</span>
          </div>
          <div class="notification-detail-item">
            <span class="notification-detail-label">Zorunlu Güncelleme:</span>
            <span class="notification-detail-value">${notification.force_update ? '✅ Evet' : '❌ Hayır'}</span>
          </div>
          <div class="notification-detail-item">
            <span class="notification-detail-label">Durum:</span>
            <span class="notification-detail-value ${statusText === 'Süresi Doldu' ? 'text-danger' : 'text-success'}">${statusText}</span>
          </div>
          ${remainingTime ? `
          <div class="notification-detail-item">
            <span class="notification-detail-label">Kalan Süre:</span>
            <span class="notification-detail-value text-warning">⏰ ${remainingTime}</span>
          </div>
          ` : ''}
          <div class="notification-detail-item">
            <span class="notification-detail-label">Başlangıç:</span>
            <span class="notification-detail-value">${startTimeStr}</span>
          </div>
        </div>
      </div>
    `;
  }).join('');
  
  container.innerHTML = notificationsHTML;
}

// Bildirimi düzenle
function editAppNotification(appIndex) {
  console.log('🔧 editAppNotification çağrıldı, appIndex:', appIndex, typeof appIndex);
  
  // appIndex'i integer'a çevir
  const index = parseInt(appIndex);
  if (isNaN(index)) {
    console.error('❌ Geçersiz appIndex:', appIndex);
    showAlert('❌ Geçersiz uygulama indeksi!', 'error');
    return;
  }
  
  // Uygulama var mı kontrol et
  if (!appsData || !appsData.apps || !appsData.apps[index]) {
    console.error('❌ Uygulama bulunamadı, index:', index, 'toplam uygulama:', appsData?.apps?.length || 0);
    showAlert('❌ Uygulama bulunamadı!', 'error');
    return;
  }
  
  // Bildirim ayarları formuna geç ve uygulamayı seç
  showSection('notifications');
  
  // Sayfanın yüklenmesini bekle
  setTimeout(() => {
    const appSelect = document.getElementById('notification_app_select');
    if (appSelect) {
      console.log('✅ notification_app_select bulundu, değer ayarlanıyor:', index);
      
      // Uygulamayı seç
      appSelect.value = String(index);
      
      // onchange event'ini manuel tetikle (dropdown değişikliği için)
      const changeEvent = new Event('change', { bubbles: true });
      appSelect.dispatchEvent(changeEvent);
      
      // Ayarları yükle
      loadAppNotificationSettings(String(index));
      
      // Süre tipi değişikliği event'ini de tetikle
      setTimeout(() => {
        const durationTypeEl = document.getElementById('notification_duration_type');
        if (durationTypeEl) {
          const durationChangeEvent = new Event('change', { bubbles: true });
          durationTypeEl.dispatchEvent(durationChangeEvent);
        }
        
        // Form alanlarına scroll yap
        const settingsDiv = document.getElementById('appNotificationSettings');
        if (settingsDiv) {
          settingsDiv.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 100);
    } else {
      console.warn('⚠️ notification_app_select elementi bulunamadı');
    }
  }, 300);
}

// Global scope'a ekle (HTML onclick için)
if (typeof window !== 'undefined') {
  window.editAppNotification = editAppNotification;
  window.deactivateNotification = deactivateNotification;
  console.log('✅ editAppNotification ve deactivateNotification global scope\'a eklendi');
}

// Bildirimi devre dışı bırak
async function deactivateNotification(appIndex) {
  if (!confirm('Bu bildirimi kapatmak istediğinizden emin misiniz?')) {
    return;
  }
  
  const app = appsData.apps[appIndex];
  if (!app || !app.notification) {
    showAlert('❌ Bildirim bulunamadı!', 'error');
    return;
  }
  
  // Bildirimi kapat
  app.notification.enabled = false;
  
  // GitHub Pages kontrolü - Netlify Functions çalışmaz, direkt LocalStorage'a kaydet
  const isGitHubPages = window.location.hostname.includes('github.io') || 
                        window.location.hostname.includes('github.com') ||
                        currentMode === 'local';
  
  if (isGitHubPages) {
    // GitHub Pages'deyse direkt LocalStorage'a kaydet
    saveToLocal();
    showAlert('✅ Bildirim kapatıldı!', 'success');
    renderActiveNotifications();
    autoRefreshPreview();
  } else {
    // Netlify'da ise Netlify Function'ı kullan
    try {
      const response = await fetch('/.netlify/functions/updateApps', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(appsData)
      });
      
      const contentType = response.headers.get('content-type');
      let result;
      
      if (contentType && contentType.includes('application/json')) {
        result = await response.json();
      } else {
        const text = await response.text();
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
          console.warn('Netlify Function HTML response:', text.substring(0, 200));
        }
        throw new Error(`Netlify Function çalışmıyor (${response.status})`);
      }
      
      if (response.ok) {
        saveToLocal();
        showAlert('✅ Bildirim kapatıldı!', 'success');
        renderActiveNotifications();
        autoRefreshPreview();
      } else {
        throw new Error(result.error || `GitHub kaydetme başarısız (${response.status})`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Bilinmeyen hata';
      if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        console.warn('Netlify Function hatası:', errorMessage);
      }
      
      saveToLocal();
      showAlert('⚠️ LocalStorage\'a kaydedildi', 'info');
    }
  }
}

