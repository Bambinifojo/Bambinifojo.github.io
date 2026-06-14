// Admin Panel JavaScript

// ==================== SABİTLER ====================
const DEBUG = false; // Production: false, Development: true
const CONSTANTS = {
  SESSION_TIMEOUT: 8 * 60 * 60 * 1000, // 8 saat (milisaniye)
  MOBILE_BREAKPOINT: 768, // px
  MODAL_ANIMATION_DURATION: 300, // ms
  ALERT_DISPLAY_DURATION: 3000, // ms
  MIN_PASSWORD_LENGTH: 8, // Minimum 8 karakter (güvenlik için artırıldı)
  MAX_ACTIVITIES: 20,
  RECENT_ACTIVITIES_LIMIT: 5
};

// Debug logger fonksiyonu
function debugLog(...args) {
  if (DEBUG) console.log(...args);
}

function debugWarn(...args) {
  if (DEBUG) console.warn(...args);
}

function debugError(...args) {
  if (DEBUG) console.error(...args);
}

// ==================== DEĞİŞKENLER ====================
let currentMode = 'firebase'; // 'local', 'github' veya 'firebase' - Varsayılan: Firebase
let token = '';
let firebaseConfig = null;
let firebaseApp = null;
let firebaseAuth = null;
let firebaseDatabase = null;
let appsData = { apps: [], site: null };
let currentFeatures = [];
let currentFeatureCards = []; // Detaylı özellik kartları (icon, title, description)
let currentScreenshots = []; // Ekran görüntüleri (icon, title, image)
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

// Şifre güvenlik kontrolü
function validatePasswordStrength(password) {
  const errors = [];
  
  if (password.length < CONSTANTS.MIN_PASSWORD_LENGTH) {
    errors.push(`En az ${CONSTANTS.MIN_PASSWORD_LENGTH} karakter olmalıdır`);
  }
  
  if (!/[a-z]/.test(password)) {
    errors.push('En az bir küçük harf içermelidir');
  }
  
  if (!/[A-Z]/.test(password)) {
    errors.push('En az bir büyük harf içermelidir');
  }
  
  if (!/[0-9]/.test(password)) {
    errors.push('En az bir rakam içermelidir');
  }
  
  if (!/[^a-zA-Z0-9]/.test(password)) {
    errors.push('En az bir özel karakter içermelidir (!@#$%^&* vb.)');
  }
  
  return {
    isValid: errors.length === 0,
    errors: errors
  };
}

// Admin şifre hash (varsayılan: "Admin@2025Secure!")
// Güvenli varsayılan şifre: Büyük harf, küçük harf, rakam ve özel karakter içerir
// Environment variable'dan yükle veya varsayılan değeri kullan
// İlk girişte mutlaka şifrenizi değiştirin!
const ADMIN_PASSWORD_HASH = 
  (typeof process !== 'undefined' && process.env && process.env.ADMIN_PASSWORD_HASH) ||
  window.__adminPasswordHash ||
  '20f46ed4821a3cae172ba46638433dd35356ec26bdb14980abd3bd84bab4deee';

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
  const currentPath = window.location.pathname || window.location.href;
  if (currentPath.includes('admin-login.html') || currentPath.includes('admin-login')) {
    return;
  }
  
  // Session timeout mesajı göster
  const message = 'Oturum süreniz dolmuş. Lütfen tekrar giriş yapın.';
  sessionStorage.setItem('sessionTimeoutMessage', message);
  
  // Login sayfasına yönlendir (localhost için relative path kullan)
  const loginPath = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') 
    ? 'admin-login.html' 
    : '/admin-login.html';
  window.location.replace(loginPath);
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
    // NOT: Admin kullanıcısı varsa, varsayılan şifre ile giriş yapılmasına izin verilmez
    // Bu, şifre değiştirme işleminin çalışması için gereklidir
    if (!authenticatedUser) {
      const adminUserExists = usersData.find(user => user.username === 'admin');
      
      if (hashedPassword === ADMIN_PASSWORD_HASH) {
        // Varsayılan şifre ile giriş yapılıyor
        if (!adminUserExists) {
          // Admin kullanıcısı yok - yeni admin kullanıcısı oluştur (sadece ilk kurulumda)
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
          await saveUsers();
          debugLog('✅ Yeni admin kullanıcısı oluşturuldu (varsayılan şifre ile)');
        } else {
          // Admin kullanıcısı var - varsayılan şifre ile giriş yapılmasına izin verilmez
          // Kullanıcı şifresini değiştirdiyse, varsayılan şifre ile giriş yapamaz
          debugLog('❌ Admin kullanıcısı mevcut. Varsayılan şifre ile giriş yapılamaz.');
          debugLog('💡 İpucu: Şifrenizi değiştirdiyseniz, yeni şifrenizle giriş yapın.');
        }
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
      await saveUsers();
      
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
  console.log('🔵 showSection çağrıldı:', section);
  
  // Tüm section'ları gizle
  document.querySelectorAll('.admin-section').forEach(sec => {
    sec.classList.add('hidden');
  });
  
  // Seçilen section'ı göster (section ID'sini oluştur)
  let sectionId = section + 'Section';
  if (section === 'ai-settings') {
    sectionId = 'aiSettingsSection';
    // AI ayarlarını yükle
    if (typeof loadAISettings === 'function') {
      loadAISettings();
    }
  }
  if (section === 'settings') {
    sectionId = 'siteSection';
  }
  if (section === 'github-settings') {
    sectionId = 'githubSettingsSection';
  }
  
  console.log('🔍 Aranan section ID:', sectionId);
  const targetSection = document.getElementById(sectionId);
  if (targetSection) {
    try {
      targetSection.classList.remove('hidden');
      // display: none !important override için style ekle
      targetSection.style.display = 'block';
      console.log('✅ Section gösterildi:', sectionId);
    } catch (error) {
      console.error('❌ Section gösterilirken hata:', error);
      // Hata durumunda bile göster
      targetSection.style.display = 'block';
      targetSection.classList.remove('hidden');
    }
  } else {
    console.error('❌ Section bulunamadı:', sectionId);
    console.log('🔍 Mevcut section ID\'leri:', Array.from(document.querySelectorAll('.admin-section')).map(s => s.id));
    
    // Fallback: Dashboard'u göster
    if (section !== 'dashboard') {
      console.warn('⚠️ Fallback: Dashboard gösteriliyor');
      const dashboardSection = document.getElementById('dashboardSection');
      if (dashboardSection) {
        dashboardSection.classList.remove('hidden');
        dashboardSection.style.display = 'block';
      }
    }
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
      // Bildirim geçmişini yükle
      if (typeof loadNotificationHistory === 'function') {
        loadNotificationHistory();
      }
    }, 100);
    // Süre tipi değişikliği için event listener ekle
    const durationTypeEl = document.getElementById('notification_duration_type');
    if (durationTypeEl) {
      durationTypeEl.addEventListener('change', onNotificationDurationTypeChange);
    }
  }
  
  // Site section'ı açıldığında direkt içeriği göster
  if (section === 'site' || section === 'settings') {
    setTimeout(() => {
      // İlk section'ı göster (header)
      if (typeof showSiteSection === 'function') {
        showSiteSection('header');
      } else if (typeof loadSiteData === 'function') {
        loadSiteData();
      }
    }, 100);
  }

  // Slider section'ı açıldığında verileri yükle
  if (section === 'slider') {
    setTimeout(() => {
      // appsData'nın yüklü olduğundan emin ol
      if (!appsData || !appsData.apps) {
        console.warn('⚠️ appsData henüz yüklenmedi, yükleniyor...');
        // localStorage'dan yükle
        const saved = localStorage.getItem('appsData');
        if (saved) {
          try {
            appsData = JSON.parse(saved);
          } catch (e) {
            console.error('appsData parse hatası:', e);
            appsData = { apps: [], site: null };
          }
        } else {
          appsData = { apps: [], site: null };
        }
      }
      
      if (typeof onSliderSectionShow === 'function') {
        onSliderSectionShow();
      } else {
        console.warn('⚠️ onSliderSectionShow fonksiyonu bulunamadı');
      }
    }, 100);
  }
  
  // GitHub Settings section'ı açıldığında ayarları yükle
  if (section === 'github-settings') {
    setTimeout(() => {
      try {
        if (typeof loadGitHubSettings === 'function') {
          loadGitHubSettings();
        } else {
          console.warn('⚠️ loadGitHubSettings fonksiyonu bulunamadı');
          // Fallback: UI'ı manuel güncelle
          if (typeof updateGitHubSettingsUI === 'function') {
            updateGitHubSettingsUI();
          }
        }
      } catch (error) {
        console.error('❌ GitHub Settings yükleme hatası:', error);
        // Hata durumunda bile section'ı göster
        const githubSection = document.getElementById('githubSettingsSection');
        if (githubSection) {
          githubSection.classList.remove('hidden');
        }
      }
    }, 100);
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
  console.log('📱 toggleSidebar çağrıldı');
  
  const sidebar = document.getElementById('adminSidebar');
  const overlay = document.getElementById('adminSidebarOverlay');
  const hamburgerBtn = document.getElementById('hamburgerMenuBtn');
  
  if (!sidebar || !overlay) {
    console.error('❌ Sidebar veya overlay bulunamadı');
    return;
  }
  
  const isOpen = sidebar.classList.contains('open');
  
  if (isOpen) {
    // Kapat
    sidebar.classList.remove('open');
    overlay.classList.remove('active');
    document.body.classList.remove('sidebar-open');
    
    // Scroll'u serbest bırak
    const scrollY = document.body.style.top;
    document.body.style.top = '';
    document.body.style.overflow = '';
    document.body.style.position = '';
    document.body.style.width = '';
    if (scrollY) {
      window.scrollTo(0, parseInt(scrollY || '0') * -1);
    }
    
    // Buton durumunu güncelle
    if (hamburgerBtn) {
      hamburgerBtn.classList.remove('active');
    }
    
    console.log('📱 Sidebar kapatıldı');
  } else {
    // Aç
    sidebar.classList.add('open');
    overlay.classList.add('active');
    document.body.classList.add('sidebar-open');
    
    // Scroll'u kilitle
    const scrollY = window.scrollY;
    document.body.style.top = `-${scrollY}px`;
    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.width = '100%';
    
    // Buton durumunu güncelle
    if (hamburgerBtn) {
      hamburgerBtn.classList.add('active');
    }
    
    console.log('📱 Sidebar açıldı');
  }
}

// Overlay overlay'e tıklandığında sidebar'ı kapat
setTimeout(() => {
  const overlay = document.getElementById('adminSidebarOverlay');
  if (overlay) {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        console.log('📍 Overlay tıklandı, sidebar kapatılıyor');
        const sidebar = document.getElementById('adminSidebar');
        if (sidebar && sidebar.classList.contains('open')) {
          toggleSidebar();
        }
      }
    });
  }
}, 500);

// Global scope'a ekle (HTML onclick için) - İlk ekleme
if (typeof window !== 'undefined') {
  window.toggleSidebar = toggleSidebar;
  window.openSidebar = openSidebar;
  window.closeSidebar = closeSidebar;
  window.toggleTopbarMenu = toggleTopbarMenu;
  window.closeTopbarMenu = closeTopbarMenu;
  console.log('✅ Sidebar fonksiyonları global scope\'a eklendi');
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

// Topbar Menu Toggle (Mobile) - Sadece mobilde çalış
function toggleTopbarMenu() {
  try {
    // Sadece mobil cihazlarda çalış
    if (window.innerWidth > 768) {
      console.log('📱 toggleTopbarMenu sadece mobil cihazlarda çalışır');
      return;
    }
    
    const modal = document.getElementById('topbarMenuModal');
    const overlay = document.getElementById('topbarMenuOverlay');
    
    if (!modal || !overlay) {
      console.warn('⚠️ Topbar menu modal veya overlay bulunamadı');
      // Fallback: sidebar'ı kullan
      const sidebar = document.getElementById('adminSidebar');
      const sidebarOverlay = document.getElementById('adminSidebarOverlay');
      if (sidebar && sidebarOverlay) {
        toggleSidebar();
        return;
      }
    }
    
    const isOpen = modal.classList.contains('active');
    
    if (isOpen) {
      // Kapat
      modal.classList.remove('active');
      overlay.classList.remove('active');
      document.body.classList.remove('topbar-menu-open');
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.width = '';
    } else {
      // Aç
      modal.classList.add('active');
      overlay.classList.add('active');
      document.body.classList.add('topbar-menu-open');
      
      // Scroll'u kilitle
      const scrollY = window.scrollY;
      document.body.style.top = `-${scrollY}px`;
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.width = '100%';
    }
    
    console.log('📱 Topbar menu toggle edildi:', !isOpen);
  } catch (error) {
    console.error('❌ toggleTopbarMenu hatası:', error);
  }
}

// Topbar Menu'yu kapat
function closeTopbarMenu() {
  try {
    const modal = document.getElementById('topbarMenuModal');
    const overlay = document.getElementById('topbarMenuOverlay');
    const menuBtn = document.getElementById('topbarMenuBtn');
    const sidebar = document.getElementById('adminSidebar');
    
    // Mobilde sidebar varsa sidebar'ı kapat
    if (window.innerWidth <= 768 && sidebar) {
      closeSidebar();
      return;
    }
    
    if (modal && overlay) {
      modal.classList.remove('active');
      overlay.classList.remove('active');
      document.body.style.overflow = '';
      document.body.classList.remove('topbar-menu-open');
      
      if (menuBtn) {
        menuBtn.classList.remove('active');
      }
    }
  } catch (error) {
    console.error('❌ closeTopbarMenu hatası:', error);
  }
}

// Global scope'a ekle (HTML onclick için)
if (typeof window !== 'undefined') {
  window.toggleSidebar = toggleSidebar;
  window.openSidebar = openSidebar;
  window.closeSidebar = closeSidebar;
}

// Hamburger menü event listener'larını ekle (her zaman çalışmalı)
let hamburgerMenuSetup = false; // Çift event listener eklenmesini önle

function setupHamburgerMenu() {
  // Çift çalışmayı önle
  if (hamburgerMenuSetup) {
    console.log('⚠️ Hamburger menü zaten kurulmuş');
    return;
  }
  
  const sidebar = document.getElementById('adminSidebar');
  const overlay = document.getElementById('adminSidebarOverlay');
  const hamburger = document.getElementById('hamburgerMenuBtn');
  
  if (!sidebar || !overlay) {
    console.warn('⚠️ Sidebar veya overlay bulunamadı');
    return;
  }
  
  console.log('✅ Admin hamburger menü kurulumu başlatılıyor...');
  
  // Hamburger menüsü (tüm cihazlar için)
  if (hamburger) {
    hamburger.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      console.log('🍔 Hamburger menü tıklandı');
      toggleSidebar();
    });
    console.log('✅ Hamburger menü event listener eklendi');
  }
  
  // Overlay event listener
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      console.log('🌑 Overlay tıklandı, menü kapatılıyor');
      closeSidebar();
    }
  });
  
  // ESC tuşu ile kapat
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
      const sidebar = document.getElementById('adminSidebar');
      if (sidebar && sidebar.classList.contains('open')) {
        toggleSidebar();
      }
    }
  });
  
  hamburgerMenuSetup = true;
  console.log('✅ Admin hamburger menü kurulumu tamamlandı');
}

// Sayfa yüklendiğinde otomatik giriş (LocalStorage modunda)
document.addEventListener('DOMContentLoaded', () => {
  console.log('📄 DOMContentLoaded event tetiklendi');
  debugLog('📄 DOMContentLoaded event tetiklendi');
  
  // Mod ve token'ı localStorage'dan yükle (GitHub modu devre dışı, varsayılan Firebase)
  const savedMode = localStorage.getItem('currentMode');
  if (savedMode && (savedMode === 'local' || savedMode === 'firebase')) {
    currentMode = savedMode;
  } else {
    // GitHub modu artık desteklenmiyor, Firebase'e geç
    if (savedMode === 'github') {
      currentMode = 'firebase';
      localStorage.setItem('currentMode', 'firebase');
    } else {
      // Varsayılan mod Firebase
      currentMode = 'firebase';
      localStorage.setItem('currentMode', 'firebase');
    }
  }
  
  // UI'ı varsayılan moda göre güncelle
  setTimeout(() => {
    setMode(currentMode);
    updateGitHubSettingsUI();
  }, 100);
  
  const savedToken = localStorage.getItem('githubToken');
  if (savedToken) {
    token = savedToken;
  }
  
  // Firebase config'i yükle ve otomatik başlat
  const savedFirebaseConfig = localStorage.getItem('firebaseConfig');
  if (savedFirebaseConfig) {
    try {
      firebaseConfig = JSON.parse(savedFirebaseConfig);
      console.log('🔥 Firebase config yüklendi, otomatik başlatılıyor...');
      
      // Firebase modunda ise otomatik başlat
      if (currentMode === 'firebase') {
        initializeFirebase(firebaseConfig).then(() => {
          console.log('✅ Firebase otomatik başlatıldı');
          
          // Firebase auth state kontrolü ve otomatik giriş
          if (firebaseAuth) {
            const savedEmail = localStorage.getItem('firebaseEmail');
            const savedPassword = localStorage.getItem('firebasePassword');
            
            if (savedEmail && savedPassword) {
              firebaseAuth.signInWithEmailAndPassword(savedEmail, savedPassword)
                .then(() => {
                  console.log('✅ Firebase\'e otomatik giriş yapıldı');
                })
                .catch((error) => {
                  console.warn('⚠️ Firebase otomatik giriş hatası:', error);
                });
            }
          }
        }).catch((error) => {
          console.error('❌ Firebase otomatik başlatma hatası:', error);
        });
      }
    } catch (error) {
      console.error('Firebase config parse hatası:', error);
    }
  } else {
    // Firebase config yoksa varsayılan olarak Firebase modunu kullan
    console.log('ℹ️ Firebase config bulunamadı, Firebase modu varsayılan olarak aktif');
  }
  
  // Kategorileri yükle (appsData yüklendikten sonra)
  setTimeout(() => {
    loadCategories();
  }, 500);
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
  console.log('📍 Section from path:', section);
  if (section) {
    console.log('✅ Showing section:', section);
    showSection(section);
  } else {
    // Section yoksa varsayılan olarak dashboard'u göster
    console.log('⚠️ No section found, showing dashboard');
    showSection('dashboard');
  }
  
  // Eğer hiçbir section görünmüyorsa dashboard'u göster (güvenlik)
  setTimeout(() => {
    const visibleSections = document.querySelectorAll('.admin-section:not(.hidden)');
    if (visibleSections.length === 0) {
      console.warn('⚠️ No visible sections found, forcing dashboard display');
      showSection('dashboard');
    }
  }, 100);
  
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
            // Bildirim geçmişini yükle
            if (typeof loadNotificationHistory === 'function') {
              loadNotificationHistory();
            }
            // Bildirim istatistiklerini yükle
            if (typeof loadNotificationStats === 'function') {
              loadNotificationStats();
            }
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
      // İlk kez, apps.json'dan yükle (localhost için relative path)
      const dataPath = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
        ? 'data/apps.json'
        : '/data/apps.json';
      fetch(dataPath)
        .then(res => {
          if (!res.ok) throw new Error('Veri yüklenemedi');
          return res.json();
        })
        .then(data => {
          appsData = data;
          saveToLocal();
          autoLogin();
        })
        .catch((error) => {
          console.warn('⚠️ Veri yüklenemedi, boş veri ile başlatılıyor:', error);
          appsData = { apps: [], site: null };
          autoLogin();
        });
    }
  } else {
    // Session yoksa sayfa içeriğini gizle ve loading göster
    console.log('⚠️ Session yok, login sayfasına yönlendiriliyor...');
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
  
  // Enter tuşu ile özellik ekleme
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
async function autoLogin() {
  // Firebase modunda ise Firebase'den yükle
  if (currentMode === 'firebase') {
    const savedConfig = localStorage.getItem('firebaseConfig');
    if (savedConfig) {
      try {
        const config = JSON.parse(savedConfig);
        await initializeFirebase(config);
        
        // Firebase auth state kontrolü ve otomatik giriş
        const savedEmail = localStorage.getItem('firebaseEmail');
        const savedPassword = localStorage.getItem('firebasePassword');
        
        // Email ve password varsa otomatik giriş yap
        if (savedEmail && savedPassword && firebaseAuth) {
          try {
            await firebaseAuth.signInWithEmailAndPassword(savedEmail, savedPassword);
            console.log('✅ Firebase\'e otomatik giriş yapıldı');
          } catch (authError) {
            console.warn('⚠️ Firebase otomatik giriş hatası:', authError);
            // Giriş hatası durumunda devam et, auth state listener çalışacak
          }
        }
        
        // Firebase auth state kontrolü
        firebaseAuth.onAuthStateChanged(async (user) => {
          if (user) {
            // Giriş yapılmış - verileri yükle
            try {
              await loadFromFirebase();
              updateStats();
              renderApps();
              startFirebaseRealtimeListener();
            } catch (error) {
              console.error('Firebase\'den yükleme hatası:', error);
              // Hata durumunda LocalStorage'dan yükle
              const saved = localStorage.getItem('appsData');
              if (saved) {
                appsData = JSON.parse(saved);
              }
            }
          } else {
            // Giriş yapılmamış - LocalStorage'dan yükle
            const saved = localStorage.getItem('appsData');
            if (saved) {
              appsData = JSON.parse(saved);
            }
          }
        });
      } catch (error) {
        console.error('Firebase başlatma hatası:', error);
        // Hata durumunda LocalStorage'dan yükle
        const saved = localStorage.getItem('appsData');
        if (saved) {
          appsData = JSON.parse(saved);
        }
      }
    } else {
      // Firebase config yok - LocalStorage'dan yükle
      const saved = localStorage.getItem('appsData');
      if (saved) {
        appsData = JSON.parse(saved);
      }
    }
  } else {
    // LocalStorage veya GitHub modu
    const saved = localStorage.getItem('appsData');
    if (saved) {
      appsData = JSON.parse(saved);
    } else {
      // İlk kez, apps.json'dan yükle (localhost için relative path)
      const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      const dataPath = isLocalhost ? 'data/apps.json' : '/data/apps.json';
      const sitePath = isLocalhost ? 'data/site.json' : '/data/site.json';
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
  }
  
  const tokenInput = document.getElementById('token');
  if (tokenInput) {
    tokenInput.disabled = currentMode === 'local' || currentMode === 'firebase';
  }
  
  // Dashboard'u göster
  showSection('dashboard');
  
  updateStats();
  renderApps();
  // Bildirim ayarları bölümündeyse dropdown'ı da güncelle
  const notificationsSection = document.getElementById('notificationsSection');
  if (notificationsSection && !notificationsSection.classList.contains('hidden')) {
    populateAppNotificationSelect();
    renderActiveNotifications();
  }
  
  // Token kontrolünü başlat (GitHub modunda ise)
  if (currentMode === 'github' && token) {
    startTokenValidityCheck();
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
  // GitHub modu artık desteklenmiyor, Firebase'e yönlendir
  if (mode === 'github') {
    mode = 'firebase';
    showAlert('⚠️ GitHub modu artık desteklenmiyor. Firebase moduna geçiliyor.', 'warning');
  }
  
  currentMode = mode;
  const localModeBtn = document.getElementById('localModeBtn');
  const githubModeBtn = document.getElementById('githubModeBtn');
  const firebaseModeBtn = document.getElementById('firebaseModeBtn');
  
  if (localModeBtn) localModeBtn.classList.toggle('active', mode === 'local');
  if (githubModeBtn) githubModeBtn.classList.toggle('active', mode === 'github');
  if (firebaseModeBtn) firebaseModeBtn.classList.toggle('active', mode === 'firebase');
  
  const saveGitHubBtn = document.getElementById('saveGitHubBtn');
  if (saveGitHubBtn) {
    // GitHub butonu artık gösterilmiyor
    saveGitHubBtn.classList.add('hidden');
  }
  
  // Topbar ve mobile butonlarını güncelle (GitHub butonları gizle)
  const saveGitHubBtnTopbar = document.getElementById('saveGitHubBtnTopbar');
  const saveGitHubBtnMobile = document.getElementById('saveGitHubBtnMobile');
  if (saveGitHubBtnTopbar) {
    saveGitHubBtnTopbar.classList.add('hidden');
  }
  if (saveGitHubBtnMobile) {
    saveGitHubBtnMobile.classList.add('hidden');
  }
  
  // Token alanını göster/gizle (login formunda)
  const tokenGroup = document.getElementById('tokenGroupInLogin');
  const localModeInfo = document.getElementById('localModeInfo');
  const firebaseModeInfo = document.getElementById('firebaseModeInfoInLogin');
  const tokenInput = document.getElementById('token');
  
  if (mode === 'local') {
    // LocalStorage modunda token alanını gizle
    if (tokenGroup) tokenGroup.style.display = 'none';
    if (localModeInfo) localModeInfo.style.display = 'block';
    if (firebaseModeInfo) firebaseModeInfo.style.display = 'none';
    if (tokenInput) {
      tokenInput.value = ''; // Token'ı temizle
      tokenInput.disabled = true;
    }
    token = ''; // Token değişkenini temizle
  } else if (mode === 'firebase') {
    // Firebase modunda token alanını gizle
    if (tokenGroup) tokenGroup.style.display = 'none';
    if (localModeInfo) localModeInfo.style.display = 'none';
    if (firebaseModeInfo) firebaseModeInfo.style.display = 'block';
    if (tokenInput) {
      tokenInput.value = '';
      tokenInput.disabled = true;
    }
    token = '';
  } else {
    // GitHub modu (artık kullanılmıyor ama yine de gizle)
    if (tokenGroup) tokenGroup.style.display = 'none';
    if (localModeInfo) localModeInfo.style.display = 'none';
    if (firebaseModeInfo) firebaseModeInfo.style.display = 'none';
  }
  
  // GitHub Settings sayfasındaki butonları da güncelle
  updateGitHubSettingsUI();
}

// GitHub Settings sayfası için mod değiştirme
function setGitHubSettingsMode(mode) {
  // GitHub modu artık desteklenmiyor, Firebase'e yönlendir
  if (mode === 'github') {
    mode = 'firebase';
    showAlert('⚠️ GitHub modu artık desteklenmiyor. Firebase moduna geçiliyor.', 'warning');
  }
  
  currentMode = mode;
  const localBtn = document.getElementById('githubSettingsLocalModeBtn');
  const githubBtn = document.getElementById('githubSettingsGithubModeBtn');
  const tokenGroup = document.getElementById('githubTokenGroup');
  const saveBtn = document.getElementById('githubSettingsSaveBtn');
  const statusText = document.getElementById('githubModeStatus');
  
  if (localBtn) localBtn.classList.toggle('active', mode === 'local');
  if (githubBtn) githubBtn.classList.toggle('active', mode === 'github');
  
  if (mode === 'github') {
    if (tokenGroup) tokenGroup.style.display = 'block';
    if (saveBtn) saveBtn.style.display = 'inline-flex';
    if (statusText) {
      statusText.innerHTML = 'Şu anda <strong>GitHub API</strong> modu aktif. Değişiklikler GitHub\'a kaydedilir.';
      statusText.style.color = '#10b981';
    }
  } else {
    if (tokenGroup) tokenGroup.style.display = 'none';
    if (saveBtn) saveBtn.style.display = 'none';
    if (statusText) {
      statusText.innerHTML = 'Şu anda <strong>LocalStorage</strong> modu aktif. Değişiklikler sadece tarayıcınızda saklanır.';
      statusText.style.color = '#6b7280';
    }
  }
}

// GitHub Settings UI'ı güncelle
function updateGitHubSettingsUI() {
  try {
    const localBtn = document.getElementById('githubSettingsLocalModeBtn');
    const githubBtn = document.getElementById('githubSettingsGithubModeBtn');
    const firebaseBtn = document.getElementById('githubSettingsFirebaseModeBtn');
    const tokenGroup = document.getElementById('githubTokenGroup');
    const firebaseConfigGroup = document.getElementById('firebaseConfigGroup');
    const firebaseAuthGroup = document.getElementById('firebaseAuthGroup');
    const saveBtn = document.getElementById('githubSettingsSaveBtn');
    const statusText = document.getElementById('githubModeStatus');
    const tokenInput = document.getElementById('githubSettingsToken');
    
    if (localBtn) localBtn.classList.toggle('active', currentMode === 'local');
    if (githubBtn) githubBtn.classList.toggle('active', currentMode === 'github');
    if (firebaseBtn) firebaseBtn.classList.toggle('active', currentMode === 'firebase');
    
    const testBtn = document.getElementById('testTokenBtn');
    const githubModeInfo = document.getElementById('githubModeInfo');
    const firebaseModeInfo = document.getElementById('firebaseModeInfo');
    const localModeInfoInSettings = document.getElementById('localModeInfoInSettings');
    
    const saveLocalToGitHubBtn = document.getElementById('saveLocalToGitHubBtn');
    
    if (currentMode === 'github') {
      if (tokenGroup) tokenGroup.style.display = 'block';
      if (firebaseConfigGroup) firebaseConfigGroup.style.display = 'none';
      if (firebaseAuthGroup) firebaseAuthGroup.style.display = 'none';
      if (testBtn) testBtn.style.display = 'inline-flex';
      if (githubModeInfo) githubModeInfo.style.display = 'block';
      if (firebaseModeInfo) firebaseModeInfo.style.display = 'none';
      if (localModeInfoInSettings) localModeInfoInSettings.style.display = 'none';
      if (tokenInput) {
        tokenInput.value = token || '';
        tokenInput.classList.remove('error', 'success');
      }
      if (token) {
        if (saveBtn) saveBtn.style.display = 'inline-flex';
        if (saveLocalToGitHubBtn && appsData && Object.keys(appsData).length > 0) {
          saveLocalToGitHubBtn.style.display = 'inline-flex';
        }
        if (statusText) {
          statusText.innerHTML = 'Şu anda <strong>GitHub API</strong> modu aktif. Değişiklikler GitHub\'a kaydedilir.';
          statusText.style.color = '#10b981';
        }
      } else {
        if (saveBtn) saveBtn.style.display = 'none';
        if (saveLocalToGitHubBtn) saveLocalToGitHubBtn.style.display = 'none';
        if (statusText) {
          statusText.innerHTML = 'GitHub modu aktif ama token gerekli. Token\'ı girin ve "Token\'ı Test Et" butonuna tıklayın.';
          statusText.style.color = '#f59e0b';
        }
      }
    } else if (currentMode === 'firebase') {
      if (tokenGroup) tokenGroup.style.display = 'none';
      if (firebaseConfigGroup) firebaseConfigGroup.style.display = 'block';
      if (firebaseAuthGroup) firebaseAuthGroup.style.display = 'block';
      if (testBtn) testBtn.style.display = 'none';
      if (githubModeInfo) githubModeInfo.style.display = 'none';
      if (firebaseModeInfo) firebaseModeInfo.style.display = 'block';
      if (localModeInfoInSettings) localModeInfoInSettings.style.display = 'none';
      if (saveLocalToGitHubBtn) saveLocalToGitHubBtn.style.display = 'none';
      
      // Firebase config değerlerini yükle
      if (firebaseConfig) {
        const apiKeyInput = document.getElementById('firebaseApiKey');
        const authDomainInput = document.getElementById('firebaseAuthDomain');
        const databaseURLInput = document.getElementById('firebaseDatabaseURL');
        const projectIdInput = document.getElementById('firebaseProjectId');
        const storageBucketInput = document.getElementById('firebaseStorageBucket');
        const messagingSenderIdInput = document.getElementById('firebaseMessagingSenderId');
        const appIdInput = document.getElementById('firebaseAppId');
        
        if (apiKeyInput) apiKeyInput.value = firebaseConfig.apiKey || '';
        if (authDomainInput) authDomainInput.value = firebaseConfig.authDomain || '';
        if (databaseURLInput) databaseURLInput.value = firebaseConfig.databaseURL || '';
        if (projectIdInput) projectIdInput.value = firebaseConfig.projectId || '';
        if (storageBucketInput) storageBucketInput.value = firebaseConfig.storageBucket || '';
        if (messagingSenderIdInput) messagingSenderIdInput.value = firebaseConfig.messagingSenderId || '';
        if (appIdInput) appIdInput.value = firebaseConfig.appId || '';
      }
      
      if (firebaseApp && firebaseAuth) {
        if (saveBtn) saveBtn.style.display = 'inline-flex';
        if (statusText) {
          statusText.innerHTML = 'Şu anda <strong>Firebase</strong> modu aktif. Değişiklikler gerçek zamanlı olarak Firebase\'e kaydedilir.';
          statusText.style.color = '#ff9800';
        }
      } else {
        if (saveBtn) saveBtn.style.display = 'inline-flex';
        if (statusText) {
          statusText.innerHTML = 'Firebase modu aktif. Config bilgilerini girin ve Firebase\'e giriş yapın.';
          statusText.style.color = '#f59e0b';
        }
      }
    } else {
      if (tokenGroup) tokenGroup.style.display = 'none';
      if (firebaseConfigGroup) firebaseConfigGroup.style.display = 'none';
      if (firebaseAuthGroup) firebaseAuthGroup.style.display = 'none';
      if (saveBtn) saveBtn.style.display = 'none';
      if (testBtn) testBtn.style.display = 'none';
      if (saveLocalToGitHubBtn) saveLocalToGitHubBtn.style.display = 'none';
      if (githubModeInfo) githubModeInfo.style.display = 'none';
      if (firebaseModeInfo) firebaseModeInfo.style.display = 'none';
      if (localModeInfoInSettings) localModeInfoInSettings.style.display = 'block';
      if (statusText) {
        statusText.innerHTML = 'Şu anda <strong>LocalStorage</strong> modu aktif. Değişiklikler sadece tarayıcınızda saklanır. Yayın için Firebase veya GitHub modunu kullanın.';
        statusText.style.color = '#6b7280';
      }
    }
  } catch (error) {
    console.error('❌ updateGitHubSettingsUI hatası:', error);
    // Hata durumunda bile section'ı göster
    const githubSection = document.getElementById('githubSettingsSection');
    if (githubSection) {
      githubSection.classList.remove('hidden');
      githubSection.style.display = 'block';
    }
  }
}

// GitHub ayarlarını yükle
function loadGitHubSettings() {
  try {
    const tokenInput = document.getElementById('githubSettingsToken');
    if (tokenInput) {
      tokenInput.value = token || '';
    }
    
    // UI'ı güncelle
    if (typeof updateGitHubSettingsUI === 'function') {
      updateGitHubSettingsUI();
    } else {
      console.warn('⚠️ updateGitHubSettingsUI fonksiyonu bulunamadı');
    }
  } catch (error) {
    console.error('❌ GitHub Settings yükleme hatası:', error);
    // Hata durumunda bile section'ı göster
    const githubSection = document.getElementById('githubSettingsSection');
    if (githubSection) {
      githubSection.classList.remove('hidden');
      githubSection.style.display = 'block';
    }
  }
}

// LocalStorage'daki verileri GitHub'a kaydet (LocalStorage modundan GitHub moduna geçerken kullanılır)
async function saveLocalStorageToGitHub() {
  if (currentMode !== 'github' || !token) {
    showAlert('❌ GitHub modunda ve token gerekli!', 'error');
    return;
  }
  
  if (!appsData || Object.keys(appsData).length === 0) {
    showAlert('⚠️ LocalStorage\'da kaydedilecek veri yok!', 'warning');
    return;
  }
  
  // Token geçerliliğini kontrol et
  const tokenValid = await checkTokenBeforeSave();
  if (!tokenValid) {
    return;
  }
  
  try {
    showAlert('⏳ LocalStorage\'daki veriler GitHub\'a kaydediliyor...', 'info');
    await saveToGitHub();
    showAlert('✅ LocalStorage\'daki tüm değişiklikler GitHub\'a kaydedildi! Artık yayında görünecek.', 'success');
    
    // GitHub'dan güncel verileri yükle
    await loadFromGitHub();
    updateStats();
    renderApps();
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Bilinmeyen hata';
    console.error('GitHub kaydetme hatası:', error);
    showAlert(`❌ GitHub'a kaydetme hatası: ${errorMessage}`, 'error');
  }
}

// GitHub token'ı UI'dan test et
async function testGitHubTokenFromUI() {
  const tokenInput = document.getElementById('githubSettingsToken');
  const testBtn = document.getElementById('testTokenBtn');
  
  if (!tokenInput) {
    showAlert('❌ Token alanı bulunamadı!', 'error');
    return;
  }
  
  const testToken = tokenInput.value.trim();
  
  if (!testToken) {
    showAlert('⚠️ Önce token girin!', 'warning');
    tokenInput.focus();
    return;
  }
  
  // Token format kontrolü
  if (!testToken.startsWith('ghp_') && !testToken.startsWith('github_pat_')) {
    showAlert('⚠️ Token formatı hatalı!\n\nGitHub Personal Access Token "ghp_" veya "github_pat_" ile başlamalıdır.\n\nŞifre değil, token girmelisiniz!', 'error');
    tokenInput.focus();
    tokenInput.classList.add('error');
    return;
  }
  
  // Loading state
  if (testBtn) {
    testBtn.disabled = true;
    const btnSpan = testBtn.querySelector('span');
    if (btnSpan) btnSpan.textContent = '⏳ Test ediliyor...';
  }
  
  try {
    const result = await testGitHubToken(testToken);
    
    if (result.valid) {
      showAlert('✅ Token geçerli! GitHub API\'ye erişim başarılı.', 'success');
      tokenInput.classList.remove('error');
      tokenInput.classList.add('success');
      setTimeout(() => {
        tokenInput.classList.remove('success');
      }, 2000);
    } else {
      showAlert(`❌ Token hatası: ${result.error}\n\nLütfen:\n1. Token\'ın doğru kopyalandığından emin olun\n2. Token\'ın "repo" iznine sahip olduğunu kontrol edin\n3. Token\'ın süresinin dolmadığını kontrol edin`, 'error');
      tokenInput.focus();
      tokenInput.classList.add('error');
    }
  } catch (error) {
    showAlert(`❌ Test hatası: ${error.message}`, 'error');
    tokenInput.classList.add('error');
  } finally {
    // Loading state'i kaldır
    if (testBtn) {
      testBtn.disabled = false;
      const btnSpan = testBtn.querySelector('span');
      if (btnSpan) btnSpan.textContent = '🔍 Token\'ı Test Et';
    }
  }
}

// GitHub token'ı test et
async function testGitHubToken(testToken) {
  if (!testToken || testToken.trim() === '') {
    return { valid: false, error: 'Token boş olamaz' };
  }
  
  const REPO_OWNER = 'Bambinifojo';
  const REPO_NAME = 'Bambinifojo.github.io';
  const TEST_URL = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}`;
  
  try {
    const response = await fetch(TEST_URL, {
      headers: {
        'Authorization': `token ${testToken.trim()}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    });
    
    if (response.status === 401) {
      return { valid: false, error: 'Token geçersiz veya süresi dolmuş', expired: true };
    }
    
    if (response.status === 403) {
      return { valid: false, error: 'Token yetersiz izinlere sahip. "repo" izni gerekli!' };
    }
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Bilinmeyen hata' }));
      return { valid: false, error: errorData.message || `HTTP ${response.status}` };
    }
    
    return { valid: true, message: 'Token geçerli!' };
  } catch (error) {
    return { valid: false, error: error.message || 'Bağlantı hatası' };
  }
}

// Token kontrolü yap ve süresi dolmuşsa uyar
async function checkTokenValidity() {
  if (currentMode !== 'github' || !token) {
    return; // GitHub modunda değilse veya token yoksa kontrol etme
  }
  
  try {
    const result = await testGitHubToken(token);
    
    if (!result.valid) {
      if (result.expired) {
        // Token süresi dolmuş - kullanıcıya seçenek sun
        const alertMessage = '⚠️ TOKEN SÜRESİ DOLMUŞ!\n\n' +
          'Değişiklikler GitHub\'a kaydedilemez ve yayında görünmez.\n\n' +
          'Seçenekleriniz:\n' +
          '1. LocalStorage moduna geçip çalışmaya devam edin (sonra token yenileyip GitHub\'a kaydedebilirsiniz)\n' +
          '2. Token\'ı şimdi yenileyin';
        
        // Kullanıcıya seçenek sun
        const userChoice = confirm(alertMessage + '\n\n"Tamam" = LocalStorage moduna geç\n"İptal" = Token yenileme sayfasına git');
        
        if (userChoice) {
          // LocalStorage moduna geç - çalışmaya devam et
          currentMode = 'local';
          token = '';
          localStorage.setItem('currentMode', 'local');
          localStorage.removeItem('githubToken');
          
          // UI'ı güncelle
          updateGitHubSettingsUI();
          
          // GitHub'a Kaydet butonlarını gizle
          const saveGitHubBtnTopbar = document.getElementById('saveGitHubBtnTopbar');
          const saveGitHubBtnMobile = document.getElementById('saveGitHubBtnMobile');
          if (saveGitHubBtnTopbar) saveGitHubBtnTopbar.classList.add('hidden');
          if (saveGitHubBtnMobile) saveGitHubBtnMobile.classList.add('hidden');
          
          showAlert('✅ LocalStorage moduna geçildi. Çalışmaya devam edebilirsiniz. Token yeniledikten sonra GitHub\'a kaydedebilirsiniz.', 'success');
        } else {
          // Token yenileme sayfasına git
          showAlert('💡 GitHub Ayarları bölümünden yeni token oluşturun ve girin.', 'info');
          setTimeout(() => {
            if (typeof showSection === 'function') {
              showSection('github-settings');
            }
          }, 1000);
          
          // Status mesajını güncelle
          const statusText = document.getElementById('githubModeStatus');
          if (statusText) {
            statusText.innerHTML = '⚠️ <strong>TOKEN SÜRESİ DOLMUŞ!</strong> Yeni token gerekli!';
            statusText.style.color = '#f59e0b';
            statusText.style.fontWeight = 'bold';
          }
          
          // GitHub'a Kaydet butonlarını devre dışı bırak
          const saveGitHubBtnTopbar = document.getElementById('saveGitHubBtnTopbar');
          const saveGitHubBtnMobile = document.getElementById('saveGitHubBtnMobile');
          if (saveGitHubBtnTopbar) {
            saveGitHubBtnTopbar.disabled = true;
            saveGitHubBtnTopbar.title = 'Token süresi dolmuş! Yeni token gerekli.';
            saveGitHubBtnTopbar.style.opacity = '0.5';
            saveGitHubBtnTopbar.style.cursor = 'not-allowed';
          }
          if (saveGitHubBtnMobile) {
            saveGitHubBtnMobile.disabled = true;
            saveGitHubBtnMobile.title = 'Token süresi dolmuş! Yeni token gerekli.';
            saveGitHubBtnMobile.style.opacity = '0.5';
            saveGitHubBtnMobile.style.cursor = 'not-allowed';
          }
        }
      }
    } else {
      // Token geçerli - butonları aktif et
      const saveGitHubBtnTopbar = document.getElementById('saveGitHubBtnTopbar');
      const saveGitHubBtnMobile = document.getElementById('saveGitHubBtnMobile');
      if (saveGitHubBtnTopbar) {
        saveGitHubBtnTopbar.disabled = false;
        saveGitHubBtnTopbar.style.opacity = '1';
        saveGitHubBtnTopbar.style.cursor = 'pointer';
      }
      if (saveGitHubBtnMobile) {
        saveGitHubBtnMobile.disabled = false;
        saveGitHubBtnMobile.style.opacity = '1';
        saveGitHubBtnMobile.style.cursor = 'pointer';
      }
    }
  } catch (error) {
    console.error('Token kontrolü hatası:', error);
  }
}

// Sayfa yüklendiğinde ve periyodik olarak token kontrolü yap
let tokenCheckInterval = null;
function startTokenValidityCheck() {
  // İlk kontrolü hemen yap
  checkTokenValidity();
  
  // Her 30 dakikada bir kontrol et
  if (tokenCheckInterval) {
    clearInterval(tokenCheckInterval);
  }
  
  tokenCheckInterval = setInterval(() => {
    checkTokenValidity();
  }, 30 * 60 * 1000); // 30 dakika
}

// Token kaydetme işlemlerinden önce kontrol yap
async function checkTokenBeforeSave() {
  if (currentMode === 'github' && token) {
    const result = await testGitHubToken(token);
    if (!result.valid) {
      if (result.expired) {
        // Token süresi dolmuş - kullanıcıya seçenek sun
        const userChoice = confirm('⚠️ Token süresi dolmuş!\n\nGitHub\'a kaydedemezsiniz.\n\nLocalStorage moduna geçip çalışmaya devam etmek ister misiniz?\n\n"Tamam" = LocalStorage moduna geç\n"İptal" = Token yenileme sayfasına git');
        
        if (userChoice) {
          // LocalStorage moduna geç
          currentMode = 'local';
          token = '';
          localStorage.setItem('currentMode', 'local');
          localStorage.removeItem('githubToken');
          updateGitHubSettingsUI();
          
          const saveGitHubBtnTopbar = document.getElementById('saveGitHubBtnTopbar');
          const saveGitHubBtnMobile = document.getElementById('saveGitHubBtnMobile');
          if (saveGitHubBtnTopbar) saveGitHubBtnTopbar.classList.add('hidden');
          if (saveGitHubBtnMobile) saveGitHubBtnMobile.classList.add('hidden');
          
          showAlert('✅ LocalStorage moduna geçildi. Çalışmaya devam edebilirsiniz. Token yeniledikten sonra GitHub\'a kaydedebilirsiniz.', 'success');
        } else {
          // Token yenileme sayfasına git
          setTimeout(() => {
            if (typeof showSection === 'function') {
              showSection('github-settings');
            }
          }, 500);
        }
        
        return false;
      } else {
        showAlert(`❌ Token hatası: ${result.error}`, 'error');
        return false;
      }
    }
  }
  return true;
}

// GitHub ayarlarını kaydet
async function saveGitHubSettings() {
  const tokenInput = document.getElementById('githubSettingsToken');
  const newToken = tokenInput ? tokenInput.value.trim() : '';
  const newMode = currentMode;
  
  if (newMode === 'github' && !newToken) {
    showAlert('❌ GitHub modu için token gerekli!', 'error');
    if (tokenInput) {
      tokenInput.focus();
      tokenInput.classList.add('error');
    }
    return;
  }
  
  // Firebase modu
  if (newMode === 'firebase') {
    // Firebase config bilgilerini al
    const apiKey = document.getElementById('firebaseApiKey')?.value.trim() || '';
    const authDomain = document.getElementById('firebaseAuthDomain')?.value.trim() || '';
    const databaseURL = document.getElementById('firebaseDatabaseURL')?.value.trim() || '';
    const projectId = document.getElementById('firebaseProjectId')?.value.trim() || '';
    const storageBucket = document.getElementById('firebaseStorageBucket')?.value.trim() || '';
    const messagingSenderId = document.getElementById('firebaseMessagingSenderId')?.value.trim() || '';
    const appId = document.getElementById('firebaseAppId')?.value.trim() || '';
    
    // Firebase email ve password
    const firebaseEmail = document.getElementById('firebaseEmail')?.value.trim() || '';
    const firebasePassword = document.getElementById('firebasePassword')?.value.trim() || '';
    
    // Config kontrolü
    if (!apiKey || !authDomain || !databaseURL || !projectId) {
      showAlert('❌ Firebase config bilgileri eksik! Lütfen tüm alanları doldurun.', 'error');
      return;
    }
    
    // Firebase config oluştur
    const config = {
      apiKey,
      authDomain,
      databaseURL,
      projectId,
      storageBucket,
      messagingSenderId,
      appId
    };
    
    // Config'i kaydet
    firebaseConfig = config;
    localStorage.setItem('firebaseConfig', JSON.stringify(config));
    
    // Email ve password'ü kaydet (admin login'de kullanılacak)
    if (firebaseEmail && firebasePassword) {
      localStorage.setItem('firebaseEmail', firebaseEmail);
      localStorage.setItem('firebasePassword', firebasePassword);
    }
    
    // Firebase'i başlat ve giriş yap
    try {
      showAlert('⏳ Firebase başlatılıyor...', 'info');
      await initializeFirebase(config);
      
      if (firebaseEmail && firebasePassword) {
        showAlert('⏳ Firebase\'e giriş yapılıyor...', 'info');
        await firebaseAuth.signInWithEmailAndPassword(firebaseEmail, firebasePassword);
        console.log('✅ Firebase\'e giriş yapıldı');
        
        // Verileri yükle
        await loadFromFirebase();
        updateStats();
        renderApps();
        startFirebaseRealtimeListener();
        
        showAlert('✅ Firebase ayarları kaydedildi ve veriler yüklendi!', 'success');
      } else {
        showAlert('✅ Firebase config kaydedildi! Email ve şifre ile giriş yapabilirsiniz.', 'success');
      }
    } catch (error) {
      console.error('Firebase başlatma/giriş hatası:', error);
      const errorMessage = error.message || 'Bilinmeyen hata';
      showAlert(`❌ Firebase hatası: ${errorMessage}`, 'error');
      return;
    }
  }
  // Token validasyonu
  else if (newMode === 'github' && newToken) {
    // Token format kontrolü
    if (!newToken.startsWith('ghp_') && !newToken.startsWith('github_pat_')) {
      showAlert('⚠️ Token formatı hatalı! GitHub Personal Access Token "ghp_" veya "github_pat_" ile başlamalıdır.', 'warning');
      if (tokenInput) {
        tokenInput.focus();
        tokenInput.classList.add('error');
      }
      return;
    }
    
    // Token'ı test et
    showAlert('⏳ Token test ediliyor...', 'info');
    const tokenTest = await testGitHubToken(newToken);
    
    if (!tokenTest.valid) {
      showAlert(`❌ Token hatası: ${tokenTest.error}\n\nLütfen:\n1. Token\'ın doğru kopyalandığından emin olun\n2. Token\'ın "repo" iznine sahip olduğunu kontrol edin\n3. Token\'ın süresinin dolmadığını kontrol edin`, 'error');
      if (tokenInput) {
        tokenInput.focus();
        tokenInput.classList.add('error');
      }
      return;
    }
    
    // Token geçerli - kaydet
    token = newToken;
    
    // GitHub'dan veri yüklemeyi dene
    try {
      await loadFromGitHub();
      showAlert('✅ GitHub ayarları kaydedildi ve veriler yüklendi!', 'success');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Bilinmeyen hata';
      showAlert(`⚠️ Token geçerli ama veri yüklenemedi: ${errorMessage}`, 'warning');
    }
  } else {
    showAlert('✅ LocalStorage modu aktif edildi!', 'success');
  }
  
  // UI'ı güncelle
  updateGitHubSettingsUI();
  
  // Topbar butonlarını güncelle
  const saveGitHubBtnTopbar = document.getElementById('saveGitHubBtnTopbar');
  const saveGitHubBtnMobile = document.getElementById('saveGitHubBtnMobile');
  if (saveGitHubBtnTopbar) {
    if ((currentMode === 'github' && token) || currentMode === 'firebase') {
      saveGitHubBtnTopbar.classList.remove('hidden');
    } else {
      saveGitHubBtnTopbar.classList.add('hidden');
    }
  }
  if (saveGitHubBtnMobile) {
    if ((currentMode === 'github' && token) || currentMode === 'firebase') {
      saveGitHubBtnMobile.classList.remove('hidden');
    } else {
      saveGitHubBtnMobile.classList.add('hidden');
    }
  }
}

// Firebase'i başlat
async function initializeFirebase(config) {
  if (!config) {
    throw new Error('Firebase config bulunamadı');
  }
  
  try {
    // Firebase SDK'yı kontrol et
    if (typeof firebase === 'undefined') {
      throw new Error('Firebase SDK yüklenemedi. Firebase SDK script tag\'ini eklediğinizden emin olun.');
    }
    
    // Firebase'i başlat
    if (!firebaseApp) {
      firebaseApp = firebase.initializeApp(config);
      firebaseAuth = firebase.auth();
      firebaseDatabase = firebase.database();
      firebaseConfig = config;
      console.log('✅ Firebase başlatıldı');
    }
    
    return { firebaseApp, firebaseAuth, firebaseDatabase };
  } catch (error) {
    console.error('Firebase başlatma hatası:', error);
    throw error;
  }
}

// Firebase'den veri yükle
async function loadFromFirebase() {
  if (!firebaseDatabase) {
    throw new Error('Firebase database başlatılmamış');
  }
  
  try {
    // Apps verilerini yükle
    const appsSnapshot = await firebaseDatabase.ref('apps').once('value');
    const appsDataFromFirebase = appsSnapshot.val();
    
    // Site verilerini yükle
    const siteSnapshot = await firebaseDatabase.ref('site').once('value');
    const siteDataFromFirebase = siteSnapshot.val();
    
    // Verileri birleştir
    if (appsDataFromFirebase) {
      appsData = appsDataFromFirebase;
    } else {
      appsData = { apps: [], site: null };
    }
    
    if (siteDataFromFirebase) {
      appsData.site = siteDataFromFirebase;
    }
    
    // LocalStorage'a da kaydet (fallback için)
    saveToLocal();
    
    console.log('✅ Firebase\'den veri yüklendi');
    return appsData;
  } catch (error) {
    console.error('Firebase\'den yükleme hatası:', error);
    throw error;
  }
}

// Firebase'e kaydet
async function saveToFirebase(silent = false) {
  if (currentMode !== 'firebase') {
    return false;
  }
  
  if (!firebaseDatabase) {
    if (!silent) {
      showAlert('❌ Firebase database başlatılmamış!', 'error');
    }
    return false;
  }
  
  try {
    // Apps verilerini kaydet
    await firebaseDatabase.ref('apps').set(appsData);
    
    // Site verilerini kaydet
    if (appsData.site) {
      await firebaseDatabase.ref('site').set(appsData.site);
    }
    
    if (!silent) {
      console.log('✅ Firebase\'e kaydedildi');
    }
    return true;
  } catch (error) {
    console.error('Firebase\'e kaydetme hatası:', error);
    if (!silent) {
      showAlert('❌ Firebase\'e kaydetme hatası: ' + error.message, 'error');
    }
    return false;
  }
}

// Firebase realtime listener başlat
function startFirebaseRealtimeListener() {
  if (!firebaseDatabase || currentMode !== 'firebase') {
    return;
  }
  
  try {
    // Apps verilerini dinle
    firebaseDatabase.ref('apps').on('value', (snapshot) => {
      const data = snapshot.val();
      if (data) {
        appsData = data;
        updateStats();
        renderApps();
      }
    });
    
    // Site verilerini dinle
    firebaseDatabase.ref('site').on('value', (snapshot) => {
      const data = snapshot.val();
      if (data && appsData) {
        appsData.site = data;
      }
    });
    
    console.log('✅ Firebase realtime listener başlatıldı');
  } catch (error) {
    console.error('Firebase listener başlatma hatası:', error);
  }
}

// Giriş
async function login() {
  if (currentMode === 'firebase') {
    // Firebase modunda - config ve auth bilgileri gerekli
    const savedConfig = localStorage.getItem('firebaseConfig');
    if (savedConfig) {
      try {
        const config = JSON.parse(savedConfig);
        await initializeFirebase(config);
        
        // Firebase auth state kontrolü
        firebaseAuth.onAuthStateChanged(async (user) => {
          if (user) {
            // Giriş yapılmış - verileri yükle
            try {
              await loadFromFirebase();
              updateStats();
              renderApps();
              startFirebaseRealtimeListener();
            } catch (error) {
              console.error('Firebase\'den yükleme hatası:', error);
              // Hata durumunda LocalStorage'dan yükle
              const saved = localStorage.getItem('appsData');
              if (saved) {
                appsData = JSON.parse(saved);
                updateStats();
                renderApps();
              }
            }
          } else {
            // Giriş yapılmamış - LocalStorage'dan yükle
            const saved = localStorage.getItem('appsData');
            if (saved) {
              appsData = JSON.parse(saved);
              updateStats();
              renderApps();
            } else {
              // LocalStorage'da da yoksa varsayılan veriler
              appsData = { apps: [], site: getDefaultSiteData() };
              updateStats();
              renderApps();
            }
            showAlert('💡 Firebase\'e giriş yapmak için GitHub Ayarları bölümünden email/password girin.', 'info');
          }
        });
      } catch (error) {
        console.error('Firebase başlatma hatası:', error);
        // Hata durumunda LocalStorage'dan yükle
        const saved = localStorage.getItem('appsData');
        if (saved) {
          appsData = JSON.parse(saved);
          updateStats();
          renderApps();
        }
      }
    } else {
      // Firebase config yok - LocalStorage'dan yükle
      const saved = localStorage.getItem('appsData');
      if (saved) {
        appsData = JSON.parse(saved);
        updateStats();
        renderApps();
      } else {
        // İlk kez, data/apps.json'dan yükle
        try {
          const dataPath = '/data/apps.json';
          const sitePath = '/data/site.json';
          const res = await fetch(dataPath);
          appsData = await res.json();
          if (!appsData.site) {
            try {
              const siteRes = await fetch(sitePath);
              const siteData = await siteRes.json();
              appsData.site = siteData.site;
            } catch {
              appsData.site = getDefaultSiteData();
            }
          }
          saveToLocal();
          updateStats();
          renderApps();
        } catch (error) {
          console.error('Veri yüklenirken hata:', error);
          appsData = { apps: [], site: getDefaultSiteData() };
          updateStats();
          renderApps();
        }
      }
      showAlert('💡 Firebase modunu kullanmak için GitHub Ayarları bölümünden Firebase config bilgilerini girin.', 'info');
    }
  } else if (currentMode === 'github') {
    // GitHub modu artık desteklenmiyor, Firebase'e yönlendir
    showAlert('⚠️ GitHub modu artık desteklenmiyor. Firebase moduna geçiliyor.', 'warning');
    currentMode = 'firebase';
    localStorage.setItem('currentMode', 'firebase');
    setMode('firebase');
    
    // Firebase modunda devam et
    const savedConfig = localStorage.getItem('firebaseConfig');
    if (savedConfig) {
      try {
        const config = JSON.parse(savedConfig);
        await initializeFirebase(config);
        showAlert('💡 Firebase modunda çalışmak için GitHub Ayarları bölümünden Firebase config ve email/password girin.', 'info');
      } catch (error) {
        console.error('Firebase başlatma hatası:', error);
      }
    } else {
      showAlert('💡 Firebase modunu kullanmak için GitHub Ayarları bölümünden Firebase config bilgilerini girin.', 'info');
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
  
  // GitHub'a Kaydet butonlarını göster/gizle
  const saveGitHubBtnTopbar = document.getElementById('saveGitHubBtnTopbar');
  const saveGitHubBtnMobile = document.getElementById('saveGitHubBtnMobile');
  if (saveGitHubBtnTopbar) {
    if ((currentMode === 'github' && token) || currentMode === 'firebase') {
      saveGitHubBtnTopbar.classList.remove('hidden');
    } else {
      saveGitHubBtnTopbar.classList.add('hidden');
    }
  }
  if (saveGitHubBtnMobile) {
    if ((currentMode === 'github' && token) || currentMode === 'firebase') {
      saveGitHubBtnMobile.classList.remove('hidden');
    } else {
      saveGitHubBtnMobile.classList.add('hidden');
    }
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
  
  // Token kontrolünü başlat (GitHub modunda ise)
  if (currentMode === 'github' && token) {
    startTokenValidityCheck();
  }
  
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

// Veri kaydetme (moda göre otomatik)
async function saveData() {
  if (currentMode === 'firebase') {
    try {
      await saveToFirebase();
      showAlert('✅ Firebase\'e kaydedildi! Yayında görünecek.', 'success');
      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Bilinmeyen hata';
      showAlert(`❌ Firebase kaydetme hatası: ${errorMessage}`, 'error');
      return false;
    }
  } else if (currentMode === 'github') {
    return await saveToGitHub();
  } else {
    saveToLocal();
    return true;
  }
}

// GitHub'a kaydet
async function saveToGitHub() {
  if (currentMode !== 'github') {
    alert('GitHub modunda değilsiniz!');
    return false;
  }

  if (!token) {
    alert('Token gerekli!');
    return false;
  }
  
  // Token geçerliliğini kontrol et
  const tokenValid = await checkTokenBeforeSave();
  if (!tokenValid) {
    setTimeout(() => {
      if (typeof showSection === 'function') {
        showSection('github-settings');
      }
    }, 1000);
    return false;
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
      // Token süresi dolmuşsa özel mesaj göster
      if (res.status === 401) {
        throw new Error('Token süresi dolmuş! Lütfen GitHub Ayarları bölümünden yeni token girin.');
      }
      throw new Error(error.message || 'Kayıt başarısız');
    }

    // SHA'yı güncelle
    const result = await res.json();
    window.githubSha = result.content.sha;

    showAlert('✅ Kaydedildi!', 'success');
    await loadFromGitHub();
    updateStats();
    renderApps();
    return true;
  } catch (error) {
    alert('❌ Hata: ' + error.message);
    return false;
  }
}

// LocalStorage'a kaydet
function saveToLocal() {
  localStorage.setItem('appsData', JSON.stringify(appsData));
  
  // Firebase modunda ise otomatik olarak Firebase'e de kaydet (sessiz mod)
  if (currentMode === 'firebase') {
    // Firebase config varsa ve database başlatılmışsa kaydet
    if (firebaseConfig && firebaseDatabase) {
      // Async işlem olduğu için hata yakalama ile sessizce devam et
      saveToFirebase(true).catch((error) => {
        console.warn('⚠️ Firebase otomatik kaydetme hatası (sessizce devam ediliyor):', error);
      });
    } else if (firebaseConfig && !firebaseDatabase) {
      // Firebase config var ama database başlatılmamışsa başlat ve kaydet
      initializeFirebase(firebaseConfig).then(() => {
        if (firebaseDatabase) {
          saveToFirebase(true).catch((error) => {
            console.warn('⚠️ Firebase otomatik kaydetme hatası:', error);
          });
        }
      }).catch((error) => {
        console.warn('⚠️ Firebase otomatik başlatma hatası:', error);
      });
    }
  }
}

// İstatistikleri güncelle
function updateStats() {
  // appsData kontrolü
  if (!appsData || !appsData.apps || !Array.isArray(appsData.apps)) {
    console.warn('⚠️ appsData henüz yüklenmedi veya geçersiz');
    appsData = appsData || { apps: [], site: null };
    appsData.apps = appsData.apps || [];
  }
  
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

  if (typeof refreshAdminDashboard === 'function') {
    refreshAdminDashboard();
  }
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
  // appsData kontrolü
  if (!appsData || !appsData.apps || !Array.isArray(appsData.apps)) {
    console.warn('⚠️ Grafikler için appsData henüz yüklenmedi');
    renderCategoryChart({});
    renderRatingChart({});
    return;
  }
  
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
  if (!container) {
    console.warn('⚠️ categoryChart container bulunamadı');
    return;
  }
  
  const entries = Object.entries(categories).sort((a, b) => b[1] - a[1]);
  if (entries.length === 0) {
    container.innerHTML = '<p class="chart-empty-message">Henüz kategori yok</p>';
    return;
  }
  
  const maxValue = Math.max(...entries.map(e => e[1]));
  const totalApps = (appsData && appsData.apps && appsData.apps.length) || entries.reduce((sum, e) => sum + e[1], 0);
  
  container.innerHTML = entries.map(([category, count]) => {
    const percentage = totalApps > 0 ? (count / totalApps) * 100 : 0;
    const barWidth = maxValue > 0 ? (count / maxValue) * 100 : 0;
    
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
  if (!container) {
    console.warn('⚠️ ratingChart container bulunamadı');
    return;
  }
  
  const entries = Object.entries(ratingRanges).reverse();
  const maxValue = Math.max(...entries.map(e => e[1]), 1);
  
  // Eğer hiç rating yoksa boş mesaj göster
  const totalRatings = entries.reduce((sum, e) => sum + e[1], 0);
  if (totalRatings === 0) {
    container.innerHTML = '<p class="chart-empty-message">Henüz rating yok</p>';
    return;
  }
  
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
function syncAppsManagerStore() {
  if (typeof AppsManagerStore === 'undefined' || !appsData?.apps) return;
  try {
    AppsManagerStore.save(AppsManagerStore.syncFromLegacyApps(appsData.apps));
  } catch (e) {
    console.warn('Apps manager senkronizasyonu atlandı:', e.message);
  }
}

function renderApps() {
  if (typeof AdminAppsManager !== 'undefined' && document.getElementById('adminAppsList')) {
    AdminAppsManager.refreshApps();
    return;
  }

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

  // Helper function: Icon'un URL mi emoji mi olduğunu kontrol et
  const renderIcon = (icon) => {
    const iconValue = icon || '📱';
    // URL kontrolü: http veya https ile başlıyorsa URL'dir
    if (iconValue.startsWith('http://') || iconValue.startsWith('https://')) {
      return `<img src="${escapeHtml(iconValue)}" alt="App icon" class="app-icon-image" style="width: 100%; height: 100%; object-fit: contain; border-radius: 12px;" onerror="this.style.display='none'; this.parentElement.innerHTML='📱';" />`;
    }
    return iconValue;
  };
  
  // Uygulamaları render et
  const appsHTML = appsData.apps.map((app, index) => {
    const icon = app.icon || '📱';
    const title = app.title || 'İsimsiz';
    const description = app.description || 'Açıklama yok';
    const category = app.category || 'Kategori yok';
    const rating = app.rating || '0';
    const downloads = app.downloads || '0';
    // details linki # veya boş ise soluk görün
    const hasDetails = app.details && app.details.trim() !== '' && app.details.trim() !== '#';
    const isComingSoon = !hasDetails;
    
    return `
    <div class="app-item${isComingSoon ? ' app-item-coming-soon' : ''}">
      <div class="app-item-icon">${renderIcon(icon)}</div>
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

// Kategorileri yükle ve dropdown'ı doldur
function loadCategories(preserveSelection = false) {
  const categorySelect = document.getElementById('appCategory');
  if (!categorySelect) return;
  
  // Mevcut seçili değeri koru
  const currentValue = preserveSelection ? (categorySelect.value || lastCategoryValue || '') : '';
  const valueToPreserve = currentValue && currentValue.trim() ? currentValue.trim() : '';
  
  console.log('📂 Kategoriler yükleniyor, korunacak değer:', valueToPreserve || 'yok');
  
  // Mevcut kategorileri apps.json'dan çıkar
  const categories = new Set();
  if (appsData && appsData.apps) {
    appsData.apps.forEach(app => {
      if (app.category && app.category.trim()) {
        categories.add(app.category.trim());
      }
    });
  }
  
  // Eğer mevcut seçili değer varsa ve kategorilerde yoksa, ekle
  if (valueToPreserve && !categories.has(valueToPreserve)) {
    categories.add(valueToPreserve);
    console.log('➕ Kategori dropdown\'a eklendi:', valueToPreserve);
  }
  
  // Dropdown'ı temizle ve seçenekleri ekle
  categorySelect.innerHTML = '<option value="">Kategori Seçin</option>';
  
  // Alfabetik sırayla ekle
  Array.from(categories).sort().forEach(category => {
    const option = document.createElement('option');
    option.value = category;
    option.textContent = category;
    categorySelect.appendChild(option);
  });
  
  // Mevcut seçili değeri geri yükle
  if (valueToPreserve) {
    categorySelect.value = valueToPreserve;
    lastCategoryValue = valueToPreserve;
    console.log('✅ Kategori geri yüklendi:', valueToPreserve);
  } else {
    // Eğer korunacak değer yoksa, dropdown'ı boş bırak
    categorySelect.value = '';
    console.log('ℹ️ Kategori dropdown temizlendi');
  }
}

// Yeni kategori ekleme modal'ını göster
function showAddCategoryModal() {
  const modal = document.getElementById('addCategoryModal');
  if (modal) {
    modal.classList.add('active');
    document.body.classList.add('modal-open');
    const input = document.getElementById('newCategoryName');
    if (input) {
      input.value = '';
      setTimeout(() => input.focus(), 100);
    }
  }
}

// Yeni kategori ekleme modal'ını kapat
function closeAddCategoryModal() {
  const modal = document.getElementById('addCategoryModal');
  if (modal) {
    modal.classList.remove('active');
    document.body.classList.remove('modal-open');
    const input = document.getElementById('newCategoryName');
    if (input) input.value = '';
  }
}

// Yeni kategori ekle
function addNewCategory() {
  const input = document.getElementById('newCategoryName');
  if (!input) return;
  
  const newCategory = input.value.trim();
  if (!newCategory) {
    showAlert('⚠️ Kategori adı girin!', 'error');
    input.focus();
    return;
  }
  
  const categorySelect = document.getElementById('appCategory');
  if (!categorySelect) return;
  
  // Kategori zaten var mı kontrol et
  const existingOptions = Array.from(categorySelect.options).map(opt => opt.value);
  if (existingOptions.includes(newCategory)) {
    showAlert('⚠️ Bu kategori zaten mevcut!', 'error');
    categorySelect.value = newCategory;
    closeAddCategoryModal();
    return;
  }
  
  // Yeni kategoriyi dropdown'a ekle
  const option = document.createElement('option');
  option.value = newCategory;
  option.textContent = newCategory;
  option.selected = true;
  
  // Alfabetik sıraya göre ekle
  const options = Array.from(categorySelect.options);
  let insertIndex = 1; // İlk option "Kategori Seçin" olduğu için 1'den başla
  for (let i = 1; i < options.length; i++) {
    if (options[i].value > newCategory) {
      insertIndex = i;
      break;
    }
    insertIndex = i + 1;
  }
  
  categorySelect.insertBefore(option, options[insertIndex] || null);
  categorySelect.value = newCategory;
  
  showAlert('✅ Kategori eklendi!', 'success');
  closeAddCategoryModal();
  
  // Otomatik kaydet (eğer form doluysa)
  autoSaveApp();
}

// Kategori değiştiğinde otomatik kaydet
function handleCategoryChange() {
  autoSaveApp();
}

// Kategori dropdown blur event - değeri koru
let lastCategoryValue = '';
function handleCategoryBlur(event) {
  const categorySelect = document.getElementById('appCategory');
  if (!categorySelect) return;
  
  // Eğer bir değer seçildiyse, son değeri kaydet
  if (categorySelect.value && categorySelect.value !== '') {
    lastCategoryValue = categorySelect.value;
  } else if (lastCategoryValue && categorySelect.value === '') {
    // Eğer boş değer seçildiyse ama önceki değer varsa, eski değeri geri yükle
    setTimeout(() => {
      if (categorySelect.value === '' && lastCategoryValue) {
        categorySelect.value = lastCategoryValue;
        handleCategoryChange(); // Değişikliği kaydet
      }
    }, 50);
  }
  
  // Düzenleme modunda, uygulamanın mevcut kategorisini koru
  const appIndexEl = document.getElementById('appIndex');
  if (appIndexEl && appIndexEl.value !== '-1') {
    const index = parseInt(appIndexEl.value);
    const app = appsData.apps?.[index];
    if (app && app.category && !categorySelect.value) {
      // Eğer boş değer seçildiyse ve uygulamada kategori varsa, eski değeri geri yükle
      setTimeout(() => {
        if (categorySelect.value === '') {
          categorySelect.value = app.category;
          lastCategoryValue = app.category;
        }
      }, 50);
    }
  }
}

// Google Play Store URL'si değiştiğinde
function handlePlayStoreUrlChange() {
  const urlInput = document.getElementById('appDetails');
  if (urlInput && urlInput.value.trim()) {
    // URL geçerli mi kontrol et
    const url = urlInput.value.trim();
    if (url.includes('play.google.com/store/apps/details')) {
      // URL geçerli, app ID'yi parse et
      const match = url.match(/[?&]id=([^&]+)/);
      if (match && match[1]) {
        console.log('📱 Play Store App ID:', match[1]);
      }
    }
  }
}

// Google Play Store'dan veri çek
async function fetchPlayStoreData() {
  const urlInput = document.getElementById('appDetails');
  const fetchBtn = document.getElementById('fetchPlayStoreBtn');
  
  if (!urlInput || !urlInput.value.trim()) {
    showAlert('⚠️ Lütfen önce Play Store URL\'sini girin!', 'error');
    return;
  }
  
  const url = urlInput.value.trim();
  if (!url.includes('play.google.com/store/apps/details')) {
    showAlert('⚠️ Geçerli bir Play Store URL\'si girin!', 'error');
    return;
  }
  
  // App ID'yi parse et
  const match = url.match(/[?&]id=([^&]+)/);
  if (!match || !match[1]) {
    showAlert('⚠️ URL\'den uygulama ID\'si çıkarılamadı!', 'error');
    return;
  }
  
  const appId = match[1];
  
  // Loading state
  if (fetchBtn) {
    fetchBtn.disabled = true;
    const originalHTML = fetchBtn.innerHTML;
    fetchBtn.innerHTML = '<span class="spinner"></span> Çekiliyor...';
    
    try {
      // Localhost kontrolü - Netlify function'ları sadece Netlify'da çalışır
      const isLocalhost = window.location.hostname === 'localhost' || 
                         window.location.hostname === '127.0.0.1' ||
                         window.location.hostname === '';
      
      if (isLocalhost) {
        showAlert('⚠️ Play Store veri çekme özelliği sadece Netlify\'da çalışır. Lütfen bilgileri manuel olarak girin.', 'warning');
        if (fetchBtn) {
          fetchBtn.disabled = false;
          fetchBtn.innerHTML = originalHTML;
        }
        return;
      }
      
      // Netlify Function kullanarak veri çek
      const functionUrl = `/.netlify/functions/fetchPlayStore?appId=${encodeURIComponent(appId)}`;
      console.log('📱 Play Store veri çekiliyor:', functionUrl);
      
      const response = await fetch(functionUrl);
      
      if (!response.ok) {
        // 404 hatası için özel mesaj
        if (response.status === 404) {
          throw new Error('Play Store veri çekme servisi bulunamadı. Lütfen bilgileri manuel olarak girin.');
        }
        const errorText = await response.text().catch(() => 'Bilinmeyen hata');
        // HTML yanıtı yerine sadece status kodu göster
        const isHtmlResponse = errorText.trim().startsWith('<!DOCTYPE') || errorText.trim().startsWith('<html');
        const errorMessage = isHtmlResponse 
          ? `Sunucu hatası: ${response.status}`
          : `Sunucu hatası: ${response.status} - ${errorText.substring(0, 100)}`;
        console.error('❌ HTTP Hatası:', response.status);
        throw new Error(errorMessage);
      }
      
      const data = await response.json();
      console.log('✅ Play Store verisi alındı:', data);
      
      if (data.error) {
        throw new Error(data.error);
      }
      
      // Form alanlarını doldur
      if (data.title) {
        const titleEl = document.getElementById('appTitle');
        if (titleEl && !titleEl.value.trim()) {
          titleEl.value = data.title;
        }
      }
      
      if (data.description) {
        const descEl = document.getElementById('appDescription');
        if (descEl && !descEl.value.trim()) {
          descEl.value = data.description;
        }
      }
      
      if (data.rating !== undefined) {
        const ratingEl = document.getElementById('appRating');
        if (ratingEl && !ratingEl.value) {
          ratingEl.value = data.rating;
        }
      }
      
      if (data.downloads) {
        const downloadsEl = document.getElementById('appDownloads');
        if (downloadsEl && !downloadsEl.value.trim()) {
          downloadsEl.value = data.downloads;
        }
      }
      
      if (data.icon) {
        const iconEl = document.getElementById('appIcon');
        if (iconEl) {
          // Icon alanı boşsa veya sadece varsayılan emoji varsa, Play Store'dan gelen icon'u kullan
          if (!iconEl.value.trim() || iconEl.value.trim() === '📱') {
            iconEl.value = data.icon;
            console.log('✅ Icon güncellendi:', data.icon);
          }
        }
      }
      
      // Ekran görüntülerini ekle
      if (data.screenshots && data.screenshots.length > 0) {
        // Mevcut ekran görüntülerini temizle (opsiyonel - kullanıcı isterse koruyabilir)
        // currentScreenshots = [];
        
        // Yeni ekran görüntülerini ekle
        data.screenshots.forEach((screenshot, index) => {
          currentScreenshots.push({
            icon: screenshot.icon || '📱',
            title: screenshot.title || `Ekran Görüntüsü ${index + 1}`,
            image: screenshot.image || ''
          });
        });
        
        renderScreenshots();
        showAlert(`✅ Play Store'dan bilgiler çekildi! ${data.screenshots.length} ekran görüntüsü eklendi.`, 'success');
      } else {
        showAlert('✅ Play Store\'dan bilgiler çekildi!', 'success');
      }
      
      // Otomatik kaydet
      autoSaveApp();
      
    } catch (error) {
      console.error('❌ Play Store veri çekme hatası:', error);
      console.error('Hata detayları:', {
        message: error.message,
        stack: error.stack,
        appId: appId
      });
      
      let errorMessage = `⚠️ Veri çekilemedi: ${error.message}`;
      
      // Özel hata mesajları
      if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
        errorMessage = '⚠️ Ağ hatası: Netlify Function\'a bağlanılamadı. Lütfen internet bağlantınızı kontrol edin.';
      } else if (error.message.includes('404')) {
        errorMessage = '⚠️ Netlify Function bulunamadı. Lütfen site yöneticisine bildirin.';
      } else if (error.message.includes('500')) {
        errorMessage = '⚠️ Sunucu hatası: Play Store\'dan veri çekilemedi. Google Play Store\'un HTML yapısı değişmiş olabilir.';
      }
      
      showAlert(`${errorMessage}\n\nLütfen bilgileri manuel olarak girin.`, 'error');
    } finally {
      if (fetchBtn) {
        fetchBtn.disabled = false;
        fetchBtn.innerHTML = originalHTML;
      }
    }
  } else {
    // Netlify Function yoksa, basit bir uyarı göster
    showAlert('ℹ️ Otomatik veri çekme özelliği şu anda aktif değil. Lütfen bilgileri manuel olarak girin.', 'info');
  }
}

// Otomatik kaydetme (debounce ile)
let autoSaveTimeout = null;
function autoSaveApp() {
  // Sadece düzenleme modunda ve form doluysa otomatik kaydet
  const appIndexEl = document.getElementById('appIndex');
  const appTitleEl = document.getElementById('appTitle');
  
  if (!appIndexEl || !appTitleEl) return;
  
  const index = parseInt(appIndexEl.value || '-1');
  const title = appTitleEl.value.trim();
  
  // Yeni ekleme modunda veya başlık boşsa otomatik kaydetme
  if (index === -1 || !title) return;
  
  // Debounce: 2 saniye bekle, sonra kaydet
  clearTimeout(autoSaveTimeout);
  autoSaveTimeout = setTimeout(async () => {
    try {
      // Form verilerini topla ve kaydet
      const app = appsData.apps[index];
      if (!app) return;
      
      // Tüm form alanlarını güncelle
      const appDescriptionEl = document.getElementById('appDescription');
      const appIconEl = document.getElementById('appIcon');
      const appCategoryEl = document.getElementById('appCategory');
      const appRatingEl = document.getElementById('appRating');
      const appDownloadsEl = document.getElementById('appDownloads');
      const appDetailsEl = document.getElementById('appDetails');
      const appPrivacyEl = document.getElementById('appPrivacy');
      
      // Hakkında sayfası içeriği
      const appAboutTitleEl = document.getElementById('appAboutTitle');
      const appAboutSubtitleEl = document.getElementById('appAboutSubtitle');
      const appAboutDescriptionEl = document.getElementById('appAboutDescription');
      const appFeaturesSubtitleEl = document.getElementById('appFeaturesSubtitle');
      const appFeaturesTitleEl = document.getElementById('appFeaturesTitle');
      const appScreenshotsTitleEl = document.getElementById('appScreenshotsTitle');
      const appScreenshotsSubtitleEl = document.getElementById('appScreenshotsSubtitle');
      
      // Uygulama bilgilerini güncelle
      app.title = title;
      if (appDescriptionEl) app.description = appDescriptionEl.value.trim();
      if (appIconEl) app.icon = appIconEl.value.trim();
      // Kategori kaydet - boş değilse kaydet
      if (appCategoryEl) {
        const categoryValue = appCategoryEl.value.trim();
        app.category = categoryValue || '';
        if (categoryValue) {
          lastCategoryValue = categoryValue; // Son değeri kaydet
          console.log('💾 Kategori kaydedildi:', categoryValue);
        }
      }
      if (appRatingEl) app.rating = parseFloat(appRatingEl.value || 0);
      if (appDownloadsEl) app.downloads = appDownloadsEl.value.trim();
      if (appDetailsEl) app.details = appDetailsEl.value.trim() || '#';
      if (appPrivacyEl) app.privacy = appPrivacyEl.value.trim() || '#';
      
      // Hakkında sayfası içeriği
      const aboutTitle = appAboutTitleEl?.value.trim() || '';
      const aboutSubtitle = appAboutSubtitleEl?.value.trim() || '';
      const aboutDescription = appAboutDescriptionEl?.value.trim() || '';
      const featuresSubtitle = appFeaturesSubtitleEl?.value.trim() || '';
      const featuresTitle = appFeaturesTitleEl?.value.trim() || '';
      const screenshotsTitle = appScreenshotsTitleEl?.value.trim() || '';
      const screenshotsSubtitle = appScreenshotsSubtitleEl?.value.trim() || '';
      
      if (aboutTitle || aboutSubtitle || aboutDescription) {
        app.about = {
          title: aboutTitle || 'Hakkında',
          subtitle: aboutSubtitle || '',
          description: aboutDescription || ''
        };
      }
      
      if (featuresTitle) {
        app.featuresTitle = featuresTitle;
      }
      
      if (featuresSubtitle) {
        app.featuresSubtitle = featuresSubtitle;
      }
      
      // Detaylı özellik kartları (boş olsa bile kaydet - silme işlemi için)
      if (currentFeatureCards !== undefined) {
        app.featureCards = currentFeatureCards.length > 0 ? currentFeatureCards : [];
      }
      
      // Ekran görüntüleri (boş olsa bile kaydet - silme işlemi için)
      if (screenshotsTitle || screenshotsSubtitle || currentScreenshots !== undefined) {
        app.screenshots = {
          title: screenshotsTitle || 'Ekran Görüntüleri',
          subtitle: screenshotsSubtitle || '',
          items: currentScreenshots && currentScreenshots.length > 0 ? currentScreenshots : []
        };
      }
      
      // Otomatik kaydet
      const isGitHubPages = window.location.hostname.includes('github.io') || 
                            window.location.hostname.includes('github.com') ||
                            currentMode === 'local';
      
      if (isGitHubPages) {
        saveToLocal();
        
        // Firebase modunda ise Firebase'e de kaydet
        if (currentMode === 'firebase' && firebaseDatabase) {
          try {
            await saveToFirebase();
            console.log('✅ Firebase\'e otomatik kaydedildi');
          } catch (firebaseError) {
            console.warn('⚠️ Firebase\'e otomatik kaydetme hatası:', firebaseError);
          }
        } else if (currentMode === 'github' && token) {
          await saveToGitHub();
        }
      } else {
        // Netlify'da ise Netlify Function'ı kullan
        await fetch('/.netlify/functions/updateApps', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(appsData)
        });
        saveToLocal();
      }
      
      console.log('✅ Otomatik kaydedildi');
      console.log('📱 Kaydedilen uygulama:', {
        title: app.title,
        about: app.about,
        featuresTitle: app.featuresTitle,
        featuresSubtitle: app.featuresSubtitle,
        featureCards: app.featureCards,
        screenshots: app.screenshots
      });
      updateStats();
      renderApps();
      // Kategorileri yeniden yükle ama mevcut seçili kategoriyi koru
      const categorySelect = document.getElementById('appCategory');
      if (categorySelect && categorySelect.value) {
        loadCategories(true);
      } else {
        loadCategories();
      }
    } catch (error) {
      console.error('⚠️ Otomatik kaydetme hatası:', error);
    }
  }, 2000); // 2 saniye bekle
}

// Form göster
function showAddForm() {
  if (typeof AdminAppsManager !== 'undefined' && document.getElementById('adminAppsRoot')) {
    if (typeof showSection === 'function') showSection('apps');
    setTimeout(() => AdminAppsManager.openCreate(), 120);
    return;
  }

  // Apps section'ına geç
  showSection('apps');
  
  // Kısa bir gecikme ile modal'ı aç (section değişimi animasyonu için)
  setTimeout(() => {
    const formTitleEl = document.getElementById('formTitle');
    const appFormEl = document.getElementById('appForm');
    const appIndexEl = document.getElementById('appIndex');
    
    if (formTitleEl) formTitleEl.textContent = 'Yeni Uygulama Ekle';
    if (appFormEl) appFormEl.reset();
    if (appIndexEl) appIndexEl.value = '-1';
    
    // Kategorileri yükle
    loadCategories();
    currentFeatures = [];
    currentFeatureCards = [];
    currentScreenshots = [];
    renderFeatures();
    renderFeatureCards();
    renderScreenshots();
    
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
  
  // Kategorileri yükle ve seçili kategoriyi ayarla
  // Önce kategoriyi geçici olarak set et (loadCategories bunu koruyacak)
  const categoryToSet = app.category && app.category.trim() ? app.category.trim() : '';
  if (appCategoryEl && categoryToSet) {
    // Geçici olarak kategoriyi set et (loadCategories bunu koruyacak)
    appCategoryEl.value = categoryToSet;
    lastCategoryValue = categoryToSet;
  }
  
  // Kategorileri yükle (mevcut seçili kategoriyi koru)
  loadCategories(true);
  
  // Kategori dropdown'ında yoksa ekle ve set et
  if (appCategoryEl && categoryToSet) {
    const categoryExists = Array.from(appCategoryEl.options).some(opt => opt.value === categoryToSet);
    if (!categoryExists) {
      const option = document.createElement('option');
      option.value = categoryToSet;
      option.textContent = categoryToSet;
      // Alfabetik sıraya göre ekle
      const options = Array.from(appCategoryEl.options);
      let insertIndex = 1;
      for (let i = 1; i < options.length; i++) {
        if (options[i].value > categoryToSet) {
          insertIndex = i;
          break;
        }
        insertIndex = i + 1;
      }
      appCategoryEl.insertBefore(option, options[insertIndex] || null);
    }
    // Kategoriyi set et (tekrar, emin olmak için)
    appCategoryEl.value = categoryToSet;
    lastCategoryValue = categoryToSet;
    console.log('✅ Kategori yüklendi:', categoryToSet);
  } else if (!categoryToSet) {
    // Kategori yoksa normal yükle
    loadCategories();
    console.log('ℹ️ Kategori yok, dropdown temizlendi');
  }
  
  if (appRatingEl) appRatingEl.value = app.rating || 4.5;
  if (appDownloadsEl) appDownloadsEl.value = app.downloads || '';
  if (appDetailsEl) appDetailsEl.value = app.details && app.details !== '#' ? app.details : '';
  if (appPrivacyEl) appPrivacyEl.value = app.privacy && app.privacy !== '#' ? app.privacy : '';
  
  currentFeatures = [...(app.features || [])];
  currentFeatureCards = [...(app.featureCards || [])];
  currentScreenshots = [...(app.screenshots?.items || [])];
  renderFeatures();
  renderFeatureCards();
  renderScreenshots();
  
  // Hakkında sayfası içeriği
  const appAboutTitleEl = document.getElementById('appAboutTitle');
  const appAboutSubtitleEl = document.getElementById('appAboutSubtitle');
  const appAboutDescriptionEl = document.getElementById('appAboutDescription');
  const appFeaturesSubtitleEl = document.getElementById('appFeaturesSubtitle');
  
  if (appAboutTitleEl) appAboutTitleEl.value = app.about?.title || '';
  if (appAboutSubtitleEl) appAboutSubtitleEl.value = app.about?.subtitle || '';
  if (appAboutDescriptionEl) appAboutDescriptionEl.value = app.about?.description || '';
  if (appFeaturesSubtitleEl) appFeaturesSubtitleEl.value = app.featuresSubtitle || '';
  
  // Özellikler başlığı
  const appFeaturesTitleEl = document.getElementById('appFeaturesTitle');
  if (appFeaturesTitleEl) appFeaturesTitleEl.value = app.featuresTitle || '';
  
  // Detaylı özellik kartları
  currentFeatureCards = [...(app.featureCards || [])];
  renderFeatureCards();
  
  // Ekran görüntüleri
  const appScreenshotsTitleEl = document.getElementById('appScreenshotsTitle');
  const appScreenshotsSubtitleEl = document.getElementById('appScreenshotsSubtitle');
  if (appScreenshotsTitleEl) appScreenshotsTitleEl.value = app.screenshots?.title || '';
  if (appScreenshotsSubtitleEl) appScreenshotsSubtitleEl.value = app.screenshots?.subtitle || '';
  currentScreenshots = [...(app.screenshots?.items || [])];
  renderScreenshots();
  
  // Modal açıldığında "Hakkında Sayfası İçeriği" bölümüne scroll yap
  setTimeout(() => {
    const aboutSection = document.querySelector('.notification-section-title');
    if (aboutSection) {
      aboutSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, 300);
  
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
    
    // Form alanlarına otomatik kaydetme event listener'ları ekle
    setupAutoSaveListeners();
  }, 100);
}

// Otomatik kaydetme için event listener'ları kur
function setupAutoSaveListeners() {
  // Sadece düzenleme modunda otomatik kaydetme aktif
  const appIndexEl = document.getElementById('appIndex');
  if (!appIndexEl) return;
  
  const index = parseInt(appIndexEl.value || '-1');
  if (index === -1) return; // Yeni ekleme modunda otomatik kaydetme yok
  
  // Form alanlarına change event listener ekle
  const fieldsToWatch = [
    'appTitle', 'appDescription', 'appIcon', 'appCategory', 
    'appRating', 'appDownloads', 'appDetails', 'appPrivacy',
    'appAboutTitle', 'appAboutSubtitle', 'appAboutDescription', 'appFeaturesSubtitle'
  ];
  
  fieldsToWatch.forEach(fieldId => {
    const field = document.getElementById(fieldId);
    if (field) {
      // Mevcut listener'ları kaldır (tekrar eklememek için)
      field.removeEventListener('input', autoSaveApp);
      field.removeEventListener('change', autoSaveApp);
      
      // Yeni listener ekle
      if (field.tagName === 'SELECT' || field.type === 'checkbox' || field.type === 'radio') {
        field.addEventListener('change', autoSaveApp);
      } else {
        field.addEventListener('input', autoSaveApp);
      }
    }
  });
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
  
  // Hakkında sayfası içeriği
  const appAboutTitleEl = document.getElementById('appAboutTitle');
  const appAboutSubtitleEl = document.getElementById('appAboutSubtitle');
  const appAboutDescriptionEl = document.getElementById('appAboutDescription');
  const appFeaturesSubtitleEl = document.getElementById('appFeaturesSubtitle');
  
  const aboutTitle = appAboutTitleEl?.value.trim() || '';
  const aboutSubtitle = appAboutSubtitleEl?.value.trim() || '';
  const aboutDescription = appAboutDescriptionEl?.value.trim() || '';
  const featuresSubtitle = appFeaturesSubtitleEl?.value.trim() || '';
  const appFeaturesTitleEl = document.getElementById('appFeaturesTitle');
  const appScreenshotsTitleEl = document.getElementById('appScreenshotsTitle');
  const appScreenshotsSubtitleEl = document.getElementById('appScreenshotsSubtitle');
  
  const featuresTitle = appFeaturesTitleEl?.value.trim() || '';
  const screenshotsTitle = appScreenshotsTitleEl?.value.trim() || '';
  const screenshotsSubtitle = appScreenshotsSubtitleEl?.value.trim() || '';
  
  if (aboutTitle || aboutSubtitle || aboutDescription) {
    app.about = {
      title: aboutTitle || 'Hakkında',
      subtitle: aboutSubtitle || '',
      description: aboutDescription || ''
    };
  }
  
  if (featuresTitle) {
    app.featuresTitle = featuresTitle;
  }
  
  if (featuresSubtitle) {
    app.featuresSubtitle = featuresSubtitle;
  }
  
  // Detaylı özellik kartları (boş olsa bile kaydet - silme işlemi için)
  if (currentFeatureCards !== undefined) {
    app.featureCards = currentFeatureCards.length > 0 ? currentFeatureCards : [];
  }
  
  // Ekran görüntüleri (boş olsa bile kaydet - silme işlemi için)
  if (screenshotsTitle || screenshotsSubtitle || currentScreenshots !== undefined) {
    app.screenshots = {
      title: screenshotsTitle || 'Ekran Görüntüleri',
      subtitle: screenshotsSubtitle || '',
      items: currentScreenshots && currentScreenshots.length > 0 ? currentScreenshots : []
    };
  }
  
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

  // Kategorileri yeniden yükle (yeni kategori eklenmiş olabilir)
  loadCategories();

  // GitHub Pages kontrolü - Netlify Functions çalışmaz, direkt LocalStorage'a kaydet
  const isGitHubPages = window.location.hostname.includes('github.io') || 
                        window.location.hostname.includes('github.com') ||
                        currentMode === 'local';
  
  if (isGitHubPages) {
    // GitHub Pages'deyse direkt LocalStorage'a kaydet
    saveToLocal();
    console.log('💾 LocalStorage\'a kaydedildi:', {
      title: app.title,
      about: app.about,
      featuresTitle: app.featuresTitle,
      featuresSubtitle: app.featuresSubtitle,
      featureCards: app.featureCards,
      screenshots: app.screenshots
    });
    
    // Firebase modunda ise Firebase'e de kaydet
    if (currentMode === 'firebase' && firebaseDatabase) {
      try {
        await saveToFirebase();
        console.log('✅ Firebase\'e kaydedildi');
        showAlert('✅ Firebase\'e kaydedildi! Yayında görünecek.', 'success');
      } catch (firebaseError) {
        const firebaseErrorMessage = firebaseError instanceof Error ? firebaseError.message : 'Bilinmeyen hata';
        console.error('Firebase kaydetme hatası:', firebaseError);
        showAlert(`⚠️ LocalStorage'a kaydedildi ama Firebase'e kaydedilemedi: ${firebaseErrorMessage}`, 'warning');
      }
    } else if (currentMode === 'github' && token) {
      // Eğer GitHub modu aktifse ve token varsa, manuel kaydetmeyi dene
      try {
        await saveToGitHub();
        showAlert('✅ GitHub\'a manuel olarak kaydedildi!', 'success');
      } catch (githubError) {
        const githubErrorMessage = githubError instanceof Error ? githubError.message : 'Bilinmeyen hata';
        console.error('GitHub kaydetme hatası:', githubError);
        showAlert(`❌ GitHub kaydetme hatası: ${githubErrorMessage}`, 'error');
      }
    } else {
      showAlert('✅ LocalStorage\'a kaydedildi! (Firebase veya GitHub moduna geçerek yayında görünebilir)', 'success');
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
  syncAppsManagerStore();
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
  
  // Kategorileri yükle
  loadCategories();
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
  syncAppsManagerStore();
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
  if (!container) return;
  container.innerHTML = currentFeatures.map((feature, index) => `
    <div class="feature-tag-input">
      <span>${feature}</span>
      <button type="button" onclick="removeFeature(${index})">×</button>
    </div>
  `).join('');
}

// Detaylı özellik kartlarını render et
function renderFeatureCards() {
  const container = document.getElementById('featureCardsList');
  if (!container) return;
  
  if (currentFeatureCards.length === 0) {
    container.innerHTML = '<p style="color: #6b7280; font-size: 0.9rem; padding: 10px;">Henüz özellik kartı eklenmemiş</p>';
    return;
  }
  
  container.innerHTML = currentFeatureCards.map((card, index) => `
    <div class="feature-card-item" style="border: 1px solid #e5e7eb; border-radius: 8px; padding: 15px; margin-bottom: 10px; background: #f9fafb;">
      <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 8px;">
        <div style="font-size: 2rem;">${card.icon || '📱'}</div>
        <div style="flex: 1;">
          <div style="font-weight: 600; color: #1a1a1a; margin-bottom: 4px;">${escapeHtml(card.title || '')}</div>
          <div style="font-size: 0.85rem; color: #6b7280;">${escapeHtml(card.description || '').substring(0, 60)}${card.description && card.description.length > 60 ? '...' : ''}</div>
        </div>
        <button type="button" class="btn btn-danger btn-sm" onclick="removeFeatureCard(${index})" title="Sil">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
            <polyline points="3 6 5 6 21 6"></polyline>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
          </svg>
        </button>
      </div>
    </div>
  `).join('');
}

// Ekran görüntülerini render et
function renderScreenshots() {
  const container = document.getElementById('screenshotsList');
  if (!container) return;
  
  if (currentScreenshots.length === 0) {
    container.innerHTML = '<p style="color: #6b7280; font-size: 0.9rem; padding: 10px;">Henüz ekran görüntüsü eklenmemiş</p>';
    return;
  }
  
  container.innerHTML = currentScreenshots.map((screenshot, index) => `
    <div class="screenshot-item" style="border: 1px solid #e5e7eb; border-radius: 8px; padding: 15px; margin-bottom: 10px; background: #f9fafb;">
      <div style="display: flex; align-items: flex-start; gap: 15px;">
        ${screenshot.image ? `
          <div class="screenshot-container" style="width: 90px; height: 160px; min-width: 90px; max-width: 90px; flex-shrink: 0;">
            <img src="${escapeHtml(screenshot.image)}" alt="${escapeHtml(screenshot.title || 'Ekran Görüntüsü')}" class="auto-scale-image" loading="lazy" style="width: 100%; height: 100%; object-fit: contain;" onerror="this.onerror=null; this.parentElement.innerHTML='<div style=\\'font-size: 1.5rem; display: flex; align-items: center; justify-content: center; height: 100%;\\'>${screenshot.icon || '📱'}</div>';"/>
          </div>
        ` : `<div style="font-size: 1.5rem; flex-shrink: 0;">${screenshot.icon || '📱'}</div>`}
        <div style="flex: 1;">
          <div style="font-weight: 600; color: #1a1a1a;">${escapeHtml(screenshot.title || '')}</div>
          ${screenshot.image ? `<div style="font-size: 0.85rem; color: #6b7280; margin-top: 4px; word-break: break-all;">${escapeHtml(screenshot.image)}</div>` : ''}
        </div>
        <button type="button" class="btn btn-danger btn-sm" onclick="removeScreenshot(${index})" title="Sil">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
            <polyline points="3 6 5 6 21 6"></polyline>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
          </svg>
        </button>
      </div>
    </div>
  `).join('');
}

// Yeni özellik kartı ekleme modal'ını göster
function showAddFeatureCardModal() {
  const modal = document.getElementById('addFeatureCardModal');
  if (modal) {
    modal.classList.add('active');
    document.body.classList.add('modal-open');
    const iconInput = document.getElementById('newFeatureCardIcon');
    if (iconInput) {
      iconInput.value = '';
      setTimeout(() => iconInput.focus(), 100);
    }
  }
}

// Yeni özellik kartı ekleme modal'ını kapat
function closeAddFeatureCardModal() {
  const modal = document.getElementById('addFeatureCardModal');
  if (modal) {
    modal.classList.remove('active');
    document.body.classList.remove('modal-open');
    const iconInput = document.getElementById('newFeatureCardIcon');
    const titleInput = document.getElementById('newFeatureCardTitle');
    const descInput = document.getElementById('newFeatureCardDescription');
    if (iconInput) iconInput.value = '';
    if (titleInput) titleInput.value = '';
    if (descInput) descInput.value = '';
  }
}

// Yeni özellik kartı ekle
function addNewFeatureCard() {
  const iconInput = document.getElementById('newFeatureCardIcon');
  const titleInput = document.getElementById('newFeatureCardTitle');
  const descInput = document.getElementById('newFeatureCardDescription');
  
  if (!iconInput || !titleInput || !descInput) return;
  
  const icon = iconInput.value.trim();
  const title = titleInput.value.trim();
  const description = descInput.value.trim();
  
  if (!icon || !title || !description) {
    showAlert('⚠️ Tüm alanları doldurun!', 'error');
    return;
  }
  
  currentFeatureCards.push({
    icon: icon,
    title: title,
    description: description
  });
  
  renderFeatureCards();
  showAlert('✅ Özellik kartı eklendi!', 'success');
  closeAddFeatureCardModal();
  autoSaveApp();
}

// Özellik kartı sil
function removeFeatureCard(index) {
  currentFeatureCards.splice(index, 1);
  renderFeatureCards();
  autoSaveApp();
}

// Yeni ekran görüntüsü ekleme modal'ını göster
function showAddScreenshotModal() {
  const modal = document.getElementById('addScreenshotModal');
  if (modal) {
    modal.classList.add('active');
    document.body.classList.add('modal-open');
    const iconInput = document.getElementById('newScreenshotIcon');
    if (iconInput) {
      iconInput.value = '';
      setTimeout(() => iconInput.focus(), 100);
    }
  }
}

// Yeni ekran görüntüsü ekleme modal'ını kapat
function closeAddScreenshotModal() {
  const modal = document.getElementById('addScreenshotModal');
  if (modal) {
    modal.classList.remove('active');
    document.body.classList.remove('modal-open');
    const iconInput = document.getElementById('newScreenshotIcon');
    const titleInput = document.getElementById('newScreenshotTitle');
    const imageInput = document.getElementById('newScreenshotImage');
    if (iconInput) iconInput.value = '';
    if (titleInput) titleInput.value = '';
    if (imageInput) imageInput.value = '';
  }
}

// Yeni ekran görüntüsü ekle
function addNewScreenshot() {
  const iconInput = document.getElementById('newScreenshotIcon');
  const titleInput = document.getElementById('newScreenshotTitle');
  const imageInput = document.getElementById('newScreenshotImage');
  
  if (!iconInput || !titleInput) return;
  
  const icon = iconInput.value.trim();
  const title = titleInput.value.trim();
  const image = imageInput?.value.trim() || '';
  
  if (!icon || !title) {
    showAlert('⚠️ İkon ve başlık gereklidir!', 'error');
    return;
  }
  
  currentScreenshots.push({
    icon: icon,
    title: title,
    image: image
  });
  
  renderScreenshots();
  showAlert('✅ Ekran görüntüsü eklendi!', 'success');
  closeAddScreenshotModal();
  autoSaveApp();
}

// Ekran görüntüsü sil
function removeScreenshot(index) {
  currentScreenshots.splice(index, 1);
  renderScreenshots();
  autoSaveApp();
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
  // Site section'ına geç (settings değil, site)
  showSection('site');
  
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
    
    // Moda göre otomatik kaydet
    if (currentMode === 'firebase') {
      // Firebase modunda - otomatik kaydet
      try {
        await saveToFirebase();
        showAlert('✅ Firebase\'e otomatik kaydedildi! Yayında görünecek.', 'success');
      } catch (firebaseError) {
        const firebaseErrorMessage = firebaseError instanceof Error ? firebaseError.message : 'Bilinmeyen hata';
        console.error('Firebase kaydetme hatası:', firebaseError);
        showAlert(`⚠️ LocalStorage'a kaydedildi ama Firebase'e kaydedilemedi: ${firebaseErrorMessage}`, 'warning');
      }
    } else if (currentMode === 'github' && token) {
      // Önce token geçerliliğini kontrol et
      const tokenValid = await checkTokenBeforeSave();
      if (tokenValid) {
        try {
          await saveToGitHub();
          showAlert('✅ GitHub\'a otomatik kaydedildi! Yayında görünecek.', 'success');
        } catch (githubError) {
          const githubErrorMessage = githubError instanceof Error ? githubError.message : 'Bilinmeyen hata';
          console.error('GitHub kaydetme hatası:', githubError);
          
          // Token süresi dolmuşsa özel mesaj ve LocalStorage'a geçme seçeneği
          if (githubErrorMessage.includes('401') || githubErrorMessage.includes('süresi dolmuş')) {
            const userChoice = confirm('⚠️ Token süresi dolmuş!\n\nGitHub\'a kaydedilemedi.\n\nLocalStorage moduna geçip çalışmaya devam etmek ister misiniz?\n\n"Tamam" = LocalStorage moduna geç\n"İptal" = Token yenileme sayfasına git');
            
            if (userChoice) {
              // LocalStorage moduna geç
              currentMode = 'local';
              token = '';
              localStorage.setItem('currentMode', 'local');
              localStorage.removeItem('githubToken');
              updateGitHubSettingsUI();
              
              const saveGitHubBtnTopbar = document.getElementById('saveGitHubBtnTopbar');
              const saveGitHubBtnMobile = document.getElementById('saveGitHubBtnMobile');
              if (saveGitHubBtnTopbar) saveGitHubBtnTopbar.classList.add('hidden');
              if (saveGitHubBtnMobile) saveGitHubBtnMobile.classList.add('hidden');
              
              showAlert('✅ LocalStorage moduna geçildi. Çalışmaya devam edebilirsiniz. Token yeniledikten sonra GitHub\'a kaydedebilirsiniz.', 'success');
            } else {
              showAlert('💡 GitHub Ayarları bölümünden token yenileyin.', 'info');
              setTimeout(() => {
                if (typeof showSection === 'function') {
                  showSection('github-settings');
                }
              }, 1000);
            }
          } else {
            showAlert(`⚠️ LocalStorage'a kaydedildi ama GitHub'a kaydedilemedi: ${githubErrorMessage}`, 'warning');
          }
        }
      }
      // Token geçersiz durumunda checkTokenBeforeSave zaten kullanıcıya seçenek sunuyor
    }
    
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
      
      // Moda göre otomatik kaydet
      if (currentMode === 'firebase') {
        // Firebase modunda - otomatik kaydet
        try {
          await saveToFirebase();
          showAlert('✅ Firebase\'e otomatik kaydedildi! Yayında görünecek.', 'success');
        } catch (firebaseError) {
          const firebaseErrorMessage = firebaseError instanceof Error ? firebaseError.message : 'Bilinmeyen hata';
          console.error('Firebase kaydetme hatası:', firebaseError);
          showAlert(`⚠️ LocalStorage'a kaydedildi ama Firebase'e kaydedilemedi: ${firebaseErrorMessage}`, 'warning');
        }
      } else if (currentMode === 'github' && token) {
        // Önce token geçerliliğini kontrol et
        const tokenValid = await checkTokenBeforeSave();
        if (tokenValid) {
          try {
            await saveToGitHub();
            showAlert('✅ GitHub\'a otomatik kaydedildi! Yayında görünecek.', 'success');
          } catch (githubError) {
            const githubErrorMessage = githubError instanceof Error ? githubError.message : 'Bilinmeyen hata';
            console.error('GitHub kaydetme hatası:', githubError);
            
            // Token süresi dolmuşsa özel mesaj ve LocalStorage'a geçme seçeneği
            if (githubErrorMessage.includes('401') || githubErrorMessage.includes('süresi dolmuş')) {
              const userChoice = confirm('⚠️ Token süresi dolmuş!\n\nGitHub\'a kaydedilemedi.\n\nLocalStorage moduna geçip çalışmaya devam etmek ister misiniz?\n\n"Tamam" = LocalStorage moduna geç\n"İptal" = Token yenileme sayfasına git');
              
              if (userChoice) {
                // LocalStorage moduna geç
                currentMode = 'local';
                token = '';
                localStorage.setItem('currentMode', 'local');
                localStorage.removeItem('githubToken');
                updateGitHubSettingsUI();
                
                const saveGitHubBtnTopbar = document.getElementById('saveGitHubBtnTopbar');
                const saveGitHubBtnMobile = document.getElementById('saveGitHubBtnMobile');
                if (saveGitHubBtnTopbar) saveGitHubBtnTopbar.classList.add('hidden');
                if (saveGitHubBtnMobile) saveGitHubBtnMobile.classList.add('hidden');
                
                showAlert('✅ LocalStorage moduna geçildi. Çalışmaya devam edebilirsiniz. Token yeniledikten sonra GitHub\'a kaydedebilirsiniz.', 'success');
              } else {
                showAlert('💡 GitHub Ayarları bölümünden token yenileyin.', 'info');
                setTimeout(() => {
                  if (typeof showSection === 'function') {
                    showSection('github-settings');
                  }
                }, 1000);
              }
            } else {
              showAlert(`⚠️ GitHub kaydetme hatası: ${githubErrorMessage}`, 'warning');
            }
          }
        }
        // Token geçersiz durumunda checkTokenBeforeSave zaten kullanıcıya seçenek sunuyor
      }
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

// ==================== KULLANICI YÖNETİMİ ====================

// Kullanıcıları LocalStorage'dan yükle
async function loadUsers() {
  // Önce Firebase'den yüklemeyi dene (eğer Firebase modu aktifse)
  if (currentMode === 'firebase' && firebaseDatabase) {
    try {
      const firebaseUsers = await loadUsersFromFirebase();
      if (firebaseUsers && firebaseUsers.length > 0) {
        usersData = firebaseUsers;
        // LocalStorage'a da kaydet (senkronizasyon için)
        localStorage.setItem('adminUsers', JSON.stringify(usersData));
        console.log('✅ Kullanıcılar Firebase\'den yüklendi:', usersData.length, 'kullanıcı');
        renderUsers();
        return;
      }
    } catch (error) {
      console.warn('⚠️ Firebase\'den yükleme başarısız, localStorage\'dan yükleniyor:', error);
    }
  }
  
  // GitHub'dan yüklemeyi dene (eğer GitHub modu aktifse ve token varsa)
  if (currentMode === 'github' && token) {
    try {
      const githubUsers = await loadUsersFromGitHub();
      if (githubUsers && githubUsers.length > 0) {
        usersData = githubUsers;
        // LocalStorage'a da kaydet (senkronizasyon için)
        localStorage.setItem('adminUsers', JSON.stringify(usersData));
        console.log('✅ Kullanıcılar GitHub\'dan yüklendi:', usersData.length, 'kullanıcı');
        renderUsers();
        return;
      }
    } catch (error) {
      console.warn('⚠️ GitHub\'dan yükleme başarısız, localStorage\'dan yükleniyor:', error);
    }
  }

  // Netlify'da ise Netlify Function'dan yüklemeyi dene
  if (window.location.hostname.includes('netlify.app')) {
    try {
      const netlifyUsers = await loadUsersFromNetlify();
      if (netlifyUsers && netlifyUsers.length > 0) {
        usersData = netlifyUsers;
        localStorage.setItem('adminUsers', JSON.stringify(usersData));
        console.log('✅ Kullanıcılar Netlify üzerinden yüklendi:', usersData.length, 'kullanıcı');
        renderUsers();
        return;
      }
    } catch (error) {
      console.warn('⚠️ Netlify\'dan yükleme başarısız, localStorage\'dan yükleniyor:', error);
    }
  }

  // LocalStorage'dan yükle
  const saved = localStorage.getItem('adminUsers');
  if (saved) {
    try {
      usersData = JSON.parse(saved);
      console.log('✅ Kullanıcılar localStorage\'dan yüklendi:', usersData.length, 'kullanıcı');
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
    await saveUsers();
  }
  renderUsers();
}

// Kullanıcıları Firebase'den yükle
async function loadUsersFromFirebase() {
  if (!firebaseDatabase || currentMode !== 'firebase') {
    throw new Error('Firebase database başlatılmamış veya Firebase modu aktif değil');
  }
  
  try {
    const snapshot = await firebaseDatabase.ref('adminUsers').once('value');
    const users = snapshot.val();
    if (users && Array.isArray(users)) {
      console.log('✅ Kullanıcılar Firebase\'den yüklendi:', users.length);
      return users;
    }
    return [];
  } catch (error) {
    console.error('Firebase\'den kullanıcı yükleme hatası:', error);
    throw error;
  }
}

// Kullanıcıları GitHub'dan yükle
async function loadUsersFromGitHub() {
  if (!token) return null;

  const REPO_OWNER = 'Bambinifojo';
  const REPO_NAME = 'Bambinifojo.github.io';
  const FILE_PATH = 'data/adminUsers.json';
  const FILE_URL = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${FILE_PATH}`;

  try {
    const response = await fetch(FILE_URL, {
      headers: {
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    });

    if (!response.ok) {
      if (response.status === 404) {
        // Dosya yoksa null döndür (ilk kurulum)
        return null;
      }
      throw new Error(`GitHub API hatası: ${response.status}`);
    }

    const fileData = await response.json();
    const content = atob(fileData.content.replace(/\s/g, ''));
    const users = JSON.parse(content);
    
    return Array.isArray(users) ? users : null;
  } catch (error) {
    console.error('GitHub\'dan yükleme hatası:', error);
    throw error;
  }
}

// Kullanıcıları Netlify Function'dan yükle
async function loadUsersFromNetlify() {
  try {
    const response = await fetch('/.netlify/functions/getAdminUsers', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    });

    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      throw new Error(`Netlify Function hatası: ${response.status}`);
    }

    const data = await response.json();
    return Array.isArray(data.users) ? data.users : null;
  } catch (error) {
    console.error('Netlify\'dan yükleme hatası:', error);
    throw error;
  }
}

// Kullanıcıları LocalStorage'a kaydet
async function saveUsers() {
  try {
    const jsonData = JSON.stringify(usersData);
    localStorage.setItem('adminUsers', jsonData);
    console.log('✅ Kullanıcılar localStorage\'a kaydedildi:', usersData.length, 'kullanıcı');
    
    // Firebase modu aktifse Firebase'e kaydet
    if (currentMode === 'firebase' && firebaseDatabase) {
      try {
        await saveUsersToFirebase();
        console.log('✅ Kullanıcılar Firebase\'e kaydedildi');
      } catch (error) {
        console.error('⚠️ Firebase kaydetme hatası (localStorage başarılı):', error);
        // Hata olsa bile localStorage'a kaydedildiği için devam et
        throw error; // Hata fırlat ki çağıran fonksiyon bilgilendirilebilsin
      }
    }
    
    // GitHub'a da kaydet (eğer GitHub modu aktifse ve token varsa)
    if (currentMode === 'github' && token) {
      try {
        await saveUsersToGitHub();
        console.log('✅ Kullanıcılar GitHub\'a kaydedildi');
      } catch (error) {
        console.error('⚠️ GitHub kaydetme hatası (localStorage başarılı):', error);
        // Hata olsa bile localStorage'a kaydedildiği için devam et
        throw error; // Hata fırlat ki çağıran fonksiyon bilgilendirilebilsin
      }
    }
    
    // Netlify'da ise Netlify Function kullan
    if (window.location.hostname.includes('netlify.app')) {
      try {
        await saveUsersToNetlify();
        console.log('✅ Kullanıcılar Netlify üzerinden kaydedildi');
      } catch (error) {
        console.error('⚠️ Netlify kaydetme hatası (localStorage başarılı):', error);
      }
    }
    
    return true;
  } catch (error) {
    console.error('❌ Kullanıcılar kaydedilirken hata:', error);
    const errorMessage = error instanceof Error ? error.message : 'Bilinmeyen hata';
    
    // localStorage başarısızsa hata göster
    if (!localStorage.getItem('adminUsers')) {
      showAlert(`❌ Veriler kaydedilemedi: ${errorMessage}`, 'error');
      return false;
    }
    
    // localStorage başarılı ama Firebase başarısızsa uyarı göster
    if (currentMode === 'firebase' && firebaseDatabase) {
      showAlert(`⚠️ Veriler localStorage'a kaydedildi ama Firebase'e kaydedilemedi: ${errorMessage}. Lütfen Firebase bağlantınızı kontrol edin.`, 'warning');
    }
    
    // localStorage başarılı ama GitHub başarısızsa uyarı göster
    if (currentMode === 'github' && token) {
      showAlert(`⚠️ Veriler localStorage'a kaydedildi ama GitHub'a kaydedilemedi: ${errorMessage}. Lütfen GitHub Ayarları bölümünden kontrol edin.`, 'warning');
    }
    
    return true; // localStorage başarılı olduğu için true döndür
  }
}

// Kullanıcıları Firebase'e kaydet
async function saveUsersToFirebase() {
  if (!firebaseDatabase || currentMode !== 'firebase') {
    throw new Error('Firebase database başlatılmamış veya Firebase modu aktif değil');
  }
  
  try {
    await firebaseDatabase.ref('adminUsers').set(usersData);
    console.log('✅ Kullanıcılar Firebase\'e kaydedildi');
    return true;
  } catch (error) {
    console.error('Firebase\'e kullanıcı kaydetme hatası:', error);
    throw error;
  }
}

// Kullanıcıları GitHub'a kaydet
async function saveUsersToGitHub() {
  if (!token) {
    console.log('⚠️ GitHub token yok, kullanıcılar sadece localStorage\'a kaydedildi');
    return;
  }

  const REPO_OWNER = 'Bambinifojo';
  const REPO_NAME = 'Bambinifojo.github.io';
  const FILE_PATH = 'data/adminUsers.json';
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
    const content = JSON.stringify(usersData, null, 2);
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
        message: `Admin kullanıcıları güncellendi - ${new Date().toLocaleString('tr-TR')}`,
        content: encodedContent,
        sha: sha // Mevcut dosya varsa SHA gerekli
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'GitHub\'a kaydetme başarısız oldu.');
    }

    console.log('✅ Kullanıcılar GitHub\'a kaydedildi');
    showAlert('✅ Kullanıcılar GitHub\'a başarıyla kaydedildi!', 'success');
    return true;
  } catch (error) {
    console.error('GitHub kaydetme hatası:', error);
    const errorMessage = error instanceof Error ? error.message : 'Bilinmeyen hata';
    const errorDetails = error.response ? await error.response.json().catch(() => null) : null;
    
    // Daha detaylı hata mesajı
    let detailedError = errorMessage;
    if (errorDetails && errorDetails.message) {
      detailedError = errorDetails.message;
    }
    
    throw new Error(`GitHub kaydetme hatası: ${detailedError}`);
  }
}

// Kullanıcıları Netlify Function ile kaydet
async function saveUsersToNetlify() {
  try {
    const response = await fetch('/.netlify/functions/updateAdminUsers', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(usersData)
    });

    if (!response.ok) {
      throw new Error(`Netlify Function hatası: ${response.status}`);
    }

    console.log('✅ Kullanıcılar Netlify üzerinden GitHub\'a kaydedildi');
    return true;
  } catch (error) {
    console.error('Netlify kaydetme hatası:', error);
    throw error;
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
    const userFormTitleEl = document.getElementById('userFormTitle');
    const userFormEl = document.getElementById('userForm');
    const userIndexEl = document.getElementById('userIndex');
    
    if (userFormTitleEl) userFormTitleEl.textContent = 'Yeni Kullanıcı Ekle';
    if (userFormEl) userFormEl.reset();
    if (userIndexEl) userIndexEl.value = '-1';
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
  
  const userFormTitleEl = document.getElementById('userFormTitle');
  const userIndexEl = document.getElementById('userIndex');
  const userNameEl = document.getElementById('userName');
  const userEmailEl = document.getElementById('userEmail');
  const userRoleEl = document.getElementById('userRole');
  const userPasswordEl = document.getElementById('userPassword');
  const userPasswordConfirmEl = document.getElementById('userPasswordConfirm');
  
  if (userFormTitleEl) userFormTitleEl.textContent = 'Kullanıcı Düzenle';
  if (userIndexEl) userIndexEl.value = index;
  if (userNameEl) userNameEl.value = user.username || '';
  if (userEmailEl) userEmailEl.value = user.email || '';
  if (userRoleEl) userRoleEl.value = user.role || 'viewer';
  if (userPasswordEl) userPasswordEl.value = '';
  if (userPasswordConfirmEl) userPasswordConfirmEl.value = '';
  
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
    if (userNameEl) {
      userNameEl.focus();
      userNameEl.classList.add('error');
    }
    return;
  }
  
  if (username.length < 3) {
    showAlert('⚠️ Kullanıcı adı en az 3 karakter olmalıdır!', 'error');
    if (userNameEl) {
      userNameEl.focus();
      userNameEl.classList.add('error');
    }
    return;
  }
  
  // Kullanıcı adı benzersizlik kontrolü
  const existingUser = usersData.find((u, i) => u.username.toLowerCase() === username.toLowerCase() && i !== index);
  if (existingUser) {
    showAlert(`❌ "${username}" kullanıcı adı zaten kullanılıyor!`, 'error');
    if (userNameEl) {
      userNameEl.focus();
      userNameEl.classList.add('error');
    }
    return;
  }
  
  // Şifre kontrolü
  if (index === -1) {
    // Yeni kullanıcı - şifre zorunlu
    if (!password) {
      showAlert('⚠️ Şifre gereklidir!', 'error');
      if (userPasswordEl) {
        userPasswordEl.focus();
        userPasswordEl.classList.add('error');
      }
      return;
    }
    
    // Şifre güvenlik kontrolü
    const passwordValidation = validatePasswordStrength(password);
    if (!passwordValidation.isValid) {
      showAlert(`⚠️ Şifre gereksinimleri:\n${passwordValidation.errors.join('\n')}`, 'error');
      if (userPasswordEl) {
        userPasswordEl.focus();
        userPasswordEl.classList.add('error');
      }
      return;
    }
    
    if (password !== passwordConfirm) {
      showAlert('❌ Şifreler eşleşmiyor!', 'error');
      if (userPasswordConfirmEl) {
        userPasswordConfirmEl.focus();
        userPasswordConfirmEl.classList.add('error');
      }
      if (userPasswordEl) {
        userPasswordEl.classList.add('error');
      }
      return;
    }
  } else {
    // Düzenleme - şifre değiştiriliyorsa kontrol et
    if (password) {
      // Şifre güvenlik kontrolü
      const passwordValidation = validatePasswordStrength(password);
      if (!passwordValidation.isValid) {
        showAlert(`⚠️ Şifre gereksinimleri:\n${passwordValidation.errors.join('\n')}`, 'error');
        if (userPasswordEl) {
          userPasswordEl.focus();
          userPasswordEl.classList.add('error');
        }
        return;
      }
      
      if (password !== passwordConfirm) {
        showAlert('❌ Şifreler eşleşmiyor!', 'error');
        if (userPasswordConfirmEl) {
          userPasswordConfirmEl.focus();
          userPasswordConfirmEl.classList.add('error');
        }
        if (userPasswordEl) {
          userPasswordEl.classList.add('error');
        }
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
    
    // Loading state göster
    const submitBtn = event.target.querySelector('button[type="submit"]');
    const originalBtnText = submitBtn ? submitBtn.querySelector('span')?.textContent : '';
    if (submitBtn) {
      submitBtn.disabled = true;
      const btnSpan = submitBtn.querySelector('span');
      if (btnSpan) btnSpan.textContent = '⏳ Kaydediliyor...';
    }
    
    try {
      if (index === -1) {
        // Yeni kullanıcı ekle
        usersData.push(userData);
        console.log('📝 Yeni kullanıcı eklendi:', userData.username);
      } else {
        // Kullanıcı güncelle
        usersData[index] = userData;
        console.log('📝 Kullanıcı güncellendi:', userData.username);
      }
      
      // Kaydet
      const saveResult = await saveUsers();
      
      if (!saveResult) {
        throw new Error('Kullanıcı kaydedilemedi');
      }
      
      // Başarı mesajı
      if (index === -1) {
        if (currentMode === 'github' && token) {
          showAlert('✅ Kullanıcı başarıyla eklendi ve GitHub\'a kaydedildi!', 'success');
        } else {
          showAlert('✅ Kullanıcı başarıyla eklendi! (LocalStorage)', 'success');
        }
      } else {
        if (currentMode === 'github' && token) {
          showAlert('✅ Kullanıcı başarıyla güncellendi ve GitHub\'a kaydedildi!', 'success');
        } else {
          showAlert('✅ Kullanıcı başarıyla güncellendi! (LocalStorage)', 'success');
        }
      }
      
      renderUsers();
      closeUserModal();
    } catch (saveError) {
      console.error('Kaydetme hatası:', saveError);
      throw saveError; // Hata yukarıdaki catch bloğuna gidecek
    } finally {
      // Loading state'i kaldır
      if (submitBtn) {
        submitBtn.disabled = false;
        const btnSpan = submitBtn.querySelector('span');
        if (btnSpan && originalBtnText) btnSpan.textContent = originalBtnText;
      }
    }
  } catch (error) {
    console.error('Kullanıcı kaydedilirken hata:', error);
    const errorMessage = error instanceof Error ? error.message : 'Bilinmeyen bir hata oluştu';
    showAlert(`❌ Bir hata oluştu: ${errorMessage}`, 'error');
  }
}

// Kullanıcı sil
async function deleteUser(index) {
  const user = usersData[index];
  if (!user) return;
  
  // Son admin kullanıcısını silmeyi engelle
  if (user.username === 'admin' && usersData.length === 1) {
    showAlert('⚠️ Son admin kullanıcısı silinemez!', 'error');
    return;
  }
  
  if (confirm(`"${user.username}" kullanıcısını silmek istediğinize emin misiniz?`)) {
    usersData.splice(index, 1);
    await saveUsers();
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
    
    // Form alanlarını temizle
    const form = document.getElementById('changePasswordForm');
    if (form) {
      form.reset();
    }
    
    // Şifre alanlarını manuel olarak temizle (autocomplete'i bypass etmek için)
    const currentPasswordEl = document.getElementById('currentPassword');
    const newPasswordEl = document.getElementById('newPassword');
    const confirmPasswordEl = document.getElementById('confirmNewPassword');
    
    if (currentPasswordEl) {
      currentPasswordEl.value = '';
      currentPasswordEl.type = 'password'; // Şifre tipini sıfırla
      currentPasswordEl.classList.remove('error');
    }
    if (newPasswordEl) {
      newPasswordEl.value = '';
      newPasswordEl.classList.remove('error');
    }
    if (confirmPasswordEl) {
      confirmPasswordEl.value = '';
      confirmPasswordEl.classList.remove('error');
    }
    
    // Hata mesajlarını temizle
    const currentPasswordError = document.getElementById('currentPasswordError');
    const newPasswordError = document.getElementById('newPasswordError');
    const confirmPasswordError = document.getElementById('confirmPasswordError');
    
    if (currentPasswordError) currentPasswordError.textContent = '';
    if (newPasswordError) newPasswordError.textContent = '';
    if (confirmPasswordError) confirmPasswordError.textContent = '';
    
    modal.classList.add('active');
    document.body.classList.add('modal-open');
    const scrollY = window.scrollY;
    document.body.style.top = `-${scrollY}px`;
    
    // Focus'u mevcut şifre alanına ver
    setTimeout(() => {
      if (currentPasswordEl) {
        currentPasswordEl.focus();
      }
    }, 100);
  }
}

function closeChangePasswordModal() {
  closeModal('changePasswordModal', 'changePasswordForm');
  
  // Form alanlarını temizle
  const form = document.getElementById('changePasswordForm');
  if (form) {
    form.reset();
  }
  
  // Şifre alanlarını manuel olarak temizle
  const currentPasswordEl = document.getElementById('currentPassword');
  const newPasswordEl = document.getElementById('newPassword');
  const confirmPasswordEl = document.getElementById('confirmNewPassword');
  
  if (currentPasswordEl) {
    currentPasswordEl.value = '';
    currentPasswordEl.type = 'password';
    currentPasswordEl.classList.remove('error');
  }
  if (newPasswordEl) {
    newPasswordEl.value = '';
    newPasswordEl.classList.remove('error');
  }
  if (confirmPasswordEl) {
    confirmPasswordEl.value = '';
    confirmPasswordEl.classList.remove('error');
  }
  
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
  
  const currentPasswordEl = document.getElementById('currentPassword');
  const newPasswordEl = document.getElementById('newPassword');
  const confirmPasswordEl = document.getElementById('confirmNewPassword');
  
  if (!currentPasswordEl || !newPasswordEl || !confirmPasswordEl) {
    console.error('❌ Şifre form elemanları bulunamadı!');
    showAlert('❌ Form elemanları bulunamadı. Sayfayı yenileyin.', 'error');
    return;
  }
  
  const currentPassword = currentPasswordEl.value;
  const newPassword = newPasswordEl.value;
  const confirmPassword = confirmPasswordEl.value;
  
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
  if (currentPasswordError) currentPasswordError.textContent = '';
  if (newPasswordError) newPasswordError.textContent = '';
  if (confirmPasswordError) confirmPasswordError.textContent = '';
  
  // Validasyon
  if (!currentPassword) {
    if (currentPasswordError) currentPasswordError.textContent = '⚠️ Mevcut şifrenizi girin.';
    if (currentPasswordEl) currentPasswordEl.classList.add('error');
    return;
  }
  
  if (!newPassword) {
    if (newPasswordError) newPasswordError.textContent = '⚠️ Yeni şifre gereklidir.';
    if (newPasswordEl) newPasswordEl.classList.add('error');
    return;
  }
  
  // Şifre güvenlik kontrolü
  const passwordValidation = validatePasswordStrength(newPassword);
  if (!passwordValidation.isValid) {
    if (newPasswordError) {
      newPasswordError.textContent = `⚠️ Şifre gereksinimleri:\n${passwordValidation.errors.join('\n')}`;
    }
    if (newPasswordEl) newPasswordEl.classList.add('error');
    return;
  }
  
  if (newPassword !== confirmPassword) {
    if (confirmPasswordError) confirmPasswordError.textContent = '❌ Şifreler eşleşmiyor.';
    if (confirmPasswordEl) confirmPasswordEl.classList.add('error');
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
      } else if (hashedCurrentPassword === ADMIN_PASSWORD_HASH && currentUser.passwordHash === ADMIN_PASSWORD_HASH) {
        // Sadece kullanıcının şifresi hala varsayılan şifre ise, varsayılan şifre ile değiştirmesine izin ver
        // Bu, ilk kurulumda şifre değiştirme için gereklidir
        isPasswordValid = true;
      }
    } else {
      // Kullanıcı bulunamadıysa ve varsayılan şifre ile giriş yapılıyorsa,
      // sadece admin kullanıcısı yoksa oluştur (ilk kurulum)
      if (hashedCurrentPassword === ADMIN_PASSWORD_HASH) {
        const adminUserExists = usersData.find(user => user.username === 'admin');
        if (!adminUserExists) {
          // İlk kurulum - varsayılan admin kullanıcısını oluştur
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
          isPasswordValid = true;
        }
        // Admin kullanıcısı varsa ama session'daki kullanıcı adı eşleşmiyorsa, hata ver
      }
    }
  } else {
    // Session yoksa, önce şifre hash'ine göre kullanıcıyı bul
    currentUser = usersData.find(user => user.passwordHash === hashedCurrentPassword);
    
    if (currentUser) {
      isPasswordValid = true;
    } else if (hashedCurrentPassword === ADMIN_PASSWORD_HASH) {
      // Varsayılan admin şifresi kontrolü - sadece ilk kurulum için
      currentUser = usersData.find(user => user.username === 'admin');
      if (!currentUser) {
        // İlk kurulum - varsayılan admin kullanıcısını oluştur
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
        isPasswordValid = true;
      } else if (currentUser.passwordHash === ADMIN_PASSWORD_HASH) {
        // Admin kullanıcısı var ve şifresi hala varsayılan şifre - şifre değiştirmesine izin ver
        isPasswordValid = true;
      }
      // Admin kullanıcısı var ama şifresi varsayılan şifre değil - hata (isPasswordValid zaten false)
    }
  }
  
  // Şifre kontrolü başarısızsa hata ver
  if (!isPasswordValid || !currentUser) {
    console.error('❌ Şifre kontrolü başarısız:', {
      isPasswordValid,
      currentUser: currentUser ? currentUser.username : null,
      loggedInUsername
    });
    if (currentPasswordError) currentPasswordError.textContent = '❌ Mevcut şifre hatalı.';
    if (currentPasswordEl) currentPasswordEl.classList.add('error');
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
    const saveSuccess = await saveUsers();
    if (!saveSuccess) {
      throw new Error('Şifre kaydedilemedi!');
    }
    
    // Firebase modu aktifse Firebase'e kaydet
    if (currentMode === 'firebase' && firebaseDatabase) {
      try {
        await saveUsersToFirebase();
        console.log('✅ Şifre Firebase\'e başarıyla kaydedildi');
      } catch (error) {
        console.warn('⚠️ Firebase\'e kaydetme hatası (localStorage başarılı):', error);
        showAlert('⚠️ Şifre localStorage\'a kaydedildi ama Firebase\'e kaydedilemedi. Lütfen Firebase bağlantınızı kontrol edin.', 'warning');
      }
    }
    
    // GitHub modu aktifse GitHub'a kaydetmeyi bekle
    if (currentMode === 'github' && token) {
      try {
        await saveUsersToGitHub();
        console.log('✅ Şifre GitHub\'a başarıyla kaydedildi');
      } catch (error) {
        console.warn('⚠️ GitHub\'a kaydetme hatası (localStorage başarılı):', error);
        showAlert('⚠️ Şifre localStorage\'a kaydedildi ama GitHub\'a kaydedilemedi. Lütfen GitHub Ayarları bölümünden tekrar deneyin.', 'warning');
      }
    }
    
    // Netlify'da ise Netlify Function'a kaydet
    if (window.location.hostname.includes('netlify.app')) {
      try {
        await saveUsersToNetlify();
        console.log('✅ Şifre Netlify üzerinden başarıyla kaydedildi');
      } catch (error) {
        console.warn('⚠️ Netlify\'a kaydetme hatası (localStorage başarılı):', error);
      }
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
    // Firebase modu aktifse Firebase'den yükle, GitHub modu aktifse GitHub'dan yükle, değilse localStorage'dan
    if (currentMode === 'firebase' && firebaseDatabase) {
      try {
        await loadUsers();
        console.log('✅ Kullanıcılar Firebase\'den yeniden yüklendi');
      } catch (error) {
        console.warn('⚠️ Firebase\'den yükleme başarısız, localStorage\'dan yükleniyor:', error);
        await loadUsers();
      }
    } else if (currentMode === 'github' && token) {
      try {
        await loadUsers();
        console.log('✅ Kullanıcılar GitHub\'dan yeniden yüklendi');
      } catch (error) {
        console.warn('⚠️ GitHub\'dan yükleme başarısız, localStorage\'dan yükleniyor:', error);
        await loadUsers();
      }
    } else {
      await loadUsers();
    }
    
    // Form'u temizle
    document.getElementById('changePasswordForm').reset();
    
    // Hata sınıflarını temizle
    const currentPasswordEl = document.getElementById('currentPassword');
    const newPasswordEl = document.getElementById('newPassword');
    const confirmPasswordEl = document.getElementById('confirmNewPassword');
    
    if (currentPasswordEl) currentPasswordEl.classList.remove('error');
    if (newPasswordEl) newPasswordEl.classList.remove('error');
    if (confirmPasswordEl) confirmPasswordEl.classList.remove('error');
    
    console.log('✅ Şifre başarıyla değiştirildi. Kullanıcı:', currentUser.username);
    
    // Şifre değiştirildikten sonra kullanıcıyı bilgilendir ve çıkış yapmasını öner
    showAlert('✅ Şifre başarıyla değiştirildi! Güvenlik için lütfen çıkış yapıp yeni şifrenizle tekrar giriş yapın.', 'success');
    
    // 3 saniye sonra çıkış yapmayı öner
    setTimeout(() => {
      if (confirm('Şifreniz başarıyla değiştirildi. Güvenlik için şimdi çıkış yapıp yeni şifrenizle tekrar giriş yapmak ister misiniz?')) {
        logout();
      }
    }, 2000);
    
    closeChangePasswordModal();
  } catch (error) {
    console.error('❌ Şifre değiştirme hatası:', error);
    const currentPasswordError = document.getElementById('currentPasswordError');
    const currentPasswordEl = document.getElementById('currentPassword');
    if (currentPasswordError) currentPasswordError.textContent = '❌ Şifre değiştirilemedi. Lütfen tekrar deneyin.';
    if (currentPasswordEl) currentPasswordEl.classList.add('error');
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
  console.log('📥 loadAppNotificationSettings çağrıldı, appIndex:', appIndex, typeof appIndex);
  
  const settingsDiv = document.getElementById('appNotificationSettings');
  const actionsDiv = document.getElementById('appNotificationActions');
  
  if (!appIndex || appIndex === '') {
    console.log('⚠️ appIndex boş, form gizleniyor');
    if (settingsDiv) settingsDiv.classList.add('hidden');
    if (actionsDiv) actionsDiv.classList.add('hidden');
    return;
  }
  
  // appIndex'i integer'a çevir
  const index = parseInt(appIndex);
  if (isNaN(index)) {
    console.error('❌ Geçersiz appIndex:', appIndex);
    showAlert('❌ Geçersiz uygulama indeksi!', 'error');
    return;
  }
  
  // appsData kontrolü
  if (!appsData || !appsData.apps) {
    console.warn('⚠️ appsData yüklenmemiş, yükleniyor...');
    const saved = localStorage.getItem('appsData');
    if (saved) {
      try {
        appsData = JSON.parse(saved);
      } catch (e) {
        console.error('❌ LocalStorage\'dan appsData parse edilemedi:', e);
        showAlert('❌ Veri yüklenemedi!', 'error');
        return;
      }
    } else {
      showAlert('❌ Uygulama verileri bulunamadı!', 'error');
      return;
    }
  }
  
  const app = appsData.apps[index];
  if (!app) {
    console.error('❌ Uygulama bulunamadı, index:', index, 'toplam:', appsData.apps.length);
    showAlert('❌ Uygulama bulunamadı!', 'error');
    return;
  }
  
  console.log('✅ Uygulama bulundu:', app.title, 'Bildirim:', app.notification);
  
  // Form alanlarını göster
  if (settingsDiv) {
    settingsDiv.classList.remove('hidden');
    console.log('✅ Form alanları gösterildi');
  } else {
    console.error('❌ appNotificationSettings elementi bulunamadı!');
  }
  
  if (actionsDiv) {
    actionsDiv.classList.remove('hidden');
    console.log('✅ Form butonları gösterildi');
  } else {
    console.error('❌ appNotificationActions elementi bulunamadı!');
  }
  
  // Mevcut bildirim ayarlarını yükle
  const notification = app.notification || {};
  console.log('📋 Bildirim ayarları yükleniyor:', notification);
  
  const latestVersionEl = document.getElementById('latest_version');
  const forceUpdateEl = document.getElementById('force_update');
  const updateMessageEl = document.getElementById('update_message');
  const playStoreUrlEl = document.getElementById('play_store_url');
  const notificationEnabledEl = document.getElementById('notification_enabled');
  const durationTypeEl = document.getElementById('notification_duration_type');
  const durationValueEl = document.getElementById('notification_duration_value');
  const durationValueGroup = document.getElementById('notification_duration_value_group');
  const durationHint = document.getElementById('notification_duration_hint');
  
  // Form elemanlarını kontrol et
  if (!latestVersionEl) console.error('❌ latest_version elementi bulunamadı!');
  if (!forceUpdateEl) console.error('❌ force_update elementi bulunamadı!');
  if (!updateMessageEl) console.error('❌ update_message elementi bulunamadı!');
  if (!notificationEnabledEl) console.error('❌ notification_enabled elementi bulunamadı!');
  
  // Form alanlarını doldur
  if (latestVersionEl) {
    latestVersionEl.value = notification.latest_version || '';
    console.log('✅ latest_version dolduruldu:', latestVersionEl.value);
  }
  
  if (forceUpdateEl) {
    forceUpdateEl.value = String(notification.force_update || false);
    console.log('✅ force_update dolduruldu:', forceUpdateEl.value);
  }
  
  if (updateMessageEl) {
    updateMessageEl.value = notification.update_message || '';
    console.log('✅ update_message dolduruldu:', updateMessageEl.value);
  }
  
  if (playStoreUrlEl) {
    playStoreUrlEl.value = app.details && app.details !== '#' ? app.details : '';
    console.log('✅ play_store_url dolduruldu:', playStoreUrlEl.value);
  }
  
  if (notificationEnabledEl) {
    notificationEnabledEl.value = String(notification.enabled || false);
    console.log('✅ notification_enabled dolduruldu:', notificationEnabledEl.value);
  }
  
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
    const wasEnabled = app.notification?.enabled || false;
    if (notificationEnabled) {
      app.notification = notification;
      
      // Bildirim geçmişine kaydet (yeni bildirim veya güncelleme)
      if (!wasEnabled || !app.notification.duration?.start_time) {
        // Yeni bildirim veya süre başlangıcı yoksa, geçmişe ekle
        const expiredAt = notification.duration ? 
          new Date(new Date(notification.duration.start_time).getTime() + 
            (notification.duration.type === 'hours' ? notification.duration.value * 60 * 60 * 1000 :
             notification.duration.type === 'days' ? notification.duration.value * 24 * 60 * 60 * 1000 : 0)
          ).toISOString() : null;
        
        saveNotificationHistory({
          type: 'app',
          app_id: app.appId || app.title?.toLowerCase().replace(/\s+/g, '-'),
          app_name: app.title,
          title: 'Versiyon Güncelleme',
          message: updateMessage,
          status: 'active',
          latest_version: latestVersion,
          force_update: forceUpdateEl.value === 'true',
          duration: notification.duration || null,
          expired_at: expiredAt
        });
      }
    } else {
      // Bildirim kapalıysa, sadece enabled false yap, diğer ayarları koru
      if (app.notification) {
        app.notification.enabled = false;
        
        // Bildirim geçmişini güncelle (kapatıldı olarak işaretle)
        if (wasEnabled) {
          // En son aktif bildirimi bul ve kapat
          const history = JSON.parse(localStorage.getItem('notificationHistory') || '{"history":[]}');
          const lastActive = history.history?.find(h => 
            h.app_id === (app.appId || app.title?.toLowerCase().replace(/\s+/g, '-')) && 
            h.status === 'active'
          );
          
          if (lastActive) {
            updateNotificationHistory(lastActive.id, {
              status: 'deactivated',
              deactivated_at: new Date().toISOString()
            });
          }
        }
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
    
    // Bildirim geçmişini yenile
    if (typeof loadNotificationHistory === 'function') {
      loadNotificationHistory();
    }
    
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
  
  // Sayfanın yüklenmesini bekle - daha uzun süre bekle
  setTimeout(() => {
    const appSelect = document.getElementById('notification_app_select');
    if (appSelect) {
      console.log('✅ notification_app_select bulundu, değer ayarlanıyor:', index);
      
      // Uygulamayı seç (onchange event'ini tetiklemeden)
      appSelect.value = String(index);
      console.log('✅ Dropdown değeri ayarlandı:', appSelect.value);
      
      // Ayarları yükle (onchange event'ini tetikleme, direkt yükle)
      // loadAppNotificationSettings fonksiyonu zaten onNotificationDurationTypeChange() çağırıyor
      loadAppNotificationSettings(String(index));
      
      // Form alanlarına scroll yap
      setTimeout(() => {
        const settingsDiv = document.getElementById('appNotificationSettings');
        if (settingsDiv) {
          settingsDiv.scrollIntoView({ behavior: 'smooth', block: 'start' });
          console.log('✅ Form alanlarına scroll yapıldı');
        }
      }, 200);
    } else {
      console.warn('⚠️ notification_app_select elementi bulunamadı, tekrar deneniyor...');
      // Tekrar dene
      setTimeout(() => {
        editAppNotification(index);
      }, 200);
    }
  }, 500); // Daha uzun bekleme süresi
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
  
  // Bildirim geçmişini güncelle (kapatıldı olarak işaretle)
  const history = JSON.parse(localStorage.getItem('notificationHistory') || '{"history":[]}');
  const lastActive = history.history?.find(h => 
    h.app_id === (app.appId || app.title?.toLowerCase().replace(/\s+/g, '-')) && 
    h.status === 'active'
  );
  
  if (lastActive && typeof updateNotificationHistory === 'function') {
    updateNotificationHistory(lastActive.id, {
      status: 'deactivated',
      deactivated_at: new Date().toISOString()
    });
  }
  
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

// ==================== BİLDİRİM GEÇMİŞİ FONKSİYONLARI ====================

let notificationHistoryData = { history: [], last_updated: null };
let filteredNotificationHistory = [];
let currentHistoryPage = 1;
const HISTORY_ITEMS_PER_PAGE = 10;

// Bildirim geçmişi verilerini yükle
async function loadNotificationHistory() {
  try {
    // LocalStorage'dan yükle
    const saved = localStorage.getItem('notificationHistory');
    if (saved) {
      notificationHistoryData = JSON.parse(saved);
    } else {
      // JSON dosyasından yükle
      try {
        const response = await fetch('/data/notification_history.json?t=' + Date.now());
        if (response.ok) {
          notificationHistoryData = await response.json();
          // LocalStorage'a kaydet
          localStorage.setItem('notificationHistory', JSON.stringify(notificationHistoryData));
        }
      } catch (error) {
        console.warn('Bildirim geçmişi dosyası yüklenemedi, yeni oluşturuluyor:', error);
        notificationHistoryData = { history: [], last_updated: new Date().toISOString() };
      }
    }
    
    // Uygulama filtre dropdown'unu doldur
    populateHistoryAppFilter();
    
    // Geçmişi render et
    filterNotificationHistory();
  } catch (error) {
    console.error('Bildirim geçmişi yükleme hatası:', error);
    notificationHistoryData = { history: [], last_updated: new Date().toISOString() };
  }
}

// Bildirim geçmişine kayıt ekle
async function saveNotificationHistory(notificationData) {
  try {
    // Geçmiş verilerini yükle
    if (!notificationHistoryData || !notificationHistoryData.history) {
      await loadNotificationHistory();
    }
    
    const historyEntry = {
      id: generateNotificationId(),
      type: notificationData.type || 'app', // 'app', 'general', 'broadcast', 'maintenance'
      app_id: notificationData.app_id || null,
      app_name: notificationData.app_name || null,
      title: notificationData.title || 'Bildirim',
      message: notificationData.message || '',
      status: notificationData.status || 'active', // 'active', 'expired', 'deactivated'
      created_at: notificationData.created_at || new Date().toISOString(),
      activated_at: notificationData.activated_at || new Date().toISOString(),
      expired_at: notificationData.expired_at || null,
      deactivated_at: notificationData.deactivated_at || null,
      created_by: 'admin', // Gelecekte kullanıcı bilgisi eklenebilir
      duration: notificationData.duration || null,
      latest_version: notificationData.latest_version || null,
      force_update: notificationData.force_update || false,
      stats: {
        views: 0,
        clicks: 0,
        update_clicks: 0,
        dismiss_clicks: 0
      }
    };
    
    // Geçmişe ekle (en yeni başta)
    notificationHistoryData.history.unshift(historyEntry);
    
    // Son güncelleme zamanını güncelle
    notificationHistoryData.last_updated = new Date().toISOString();
    
    // LocalStorage'a kaydet
    localStorage.setItem('notificationHistory', JSON.stringify(notificationHistoryData));
    
    // Geçmişi render et
    filterNotificationHistory();
    
    console.log('✅ Bildirim geçmişi kaydedildi:', historyEntry.id);
  } catch (error) {
    console.error('Bildirim geçmişi kaydetme hatası:', error);
  }
}

// Bildirim geçmişini güncelle (durum değişikliği için)
async function updateNotificationHistory(notificationId, updates) {
  try {
    if (!notificationHistoryData || !notificationHistoryData.history) {
      await loadNotificationHistory();
    }
    
    const index = notificationHistoryData.history.findIndex(h => h.id === notificationId);
    if (index !== -1) {
      notificationHistoryData.history[index] = {
        ...notificationHistoryData.history[index],
        ...updates
      };
      
      notificationHistoryData.last_updated = new Date().toISOString();
      localStorage.setItem('notificationHistory', JSON.stringify(notificationHistoryData));
      filterNotificationHistory();
    }
  } catch (error) {
    console.error('Bildirim geçmişi güncelleme hatası:', error);
  }
}

// Bildirim geçmişini render et
function renderNotificationHistory() {
  const container = document.getElementById('notificationHistoryList');
  if (!container) return;
  
  if (!filteredNotificationHistory || filteredNotificationHistory.length === 0) {
    container.innerHTML = '<p class="empty-state">Henüz bildirim geçmişi yok</p>';
    document.getElementById('notificationHistoryPagination').style.display = 'none';
    return;
  }
  
  // Sayfalama
  const totalPages = Math.ceil(filteredNotificationHistory.length / HISTORY_ITEMS_PER_PAGE);
  const startIndex = (currentHistoryPage - 1) * HISTORY_ITEMS_PER_PAGE;
  const endIndex = startIndex + HISTORY_ITEMS_PER_PAGE;
  const pageItems = filteredNotificationHistory.slice(startIndex, endIndex);
  
  let html = '';
  
  pageItems.forEach(entry => {
    const statusClass = entry.status === 'active' ? 'text-success' : 
                       entry.status === 'expired' ? 'text-warning' : 'text-danger';
    const statusIcon = entry.status === 'active' ? '✅' : 
                      entry.status === 'expired' ? '⏰' : '❌';
    const statusText = entry.status === 'active' ? 'Aktif' : 
                      entry.status === 'expired' ? 'Süresi Doldu' : 'Kapatıldı';
    
    const createdDate = new Date(entry.created_at).toLocaleString('tr-TR');
    const activatedDate = entry.activated_at ? new Date(entry.activated_at).toLocaleString('tr-TR') : '-';
    const expiredDate = entry.expired_at ? new Date(entry.expired_at).toLocaleString('tr-TR') : '-';
    const deactivatedDate = entry.deactivated_at ? new Date(entry.deactivated_at).toLocaleString('tr-TR') : '-';
    
    let durationText = 'Süresiz';
    if (entry.duration) {
      if (entry.duration.type === 'hours') {
        durationText = `${entry.duration.value} saat`;
      } else if (entry.duration.type === 'days') {
        durationText = `${entry.duration.value} gün`;
      }
    }
    
    html += `
      <div class="notification-history-item" data-id="${entry.id}">
        <div class="notification-history-header">
          <div class="notification-history-title">
            <span class="notification-history-icon">${entry.type === 'app' ? '📱' : entry.type === 'broadcast' ? '📢' : entry.type === 'maintenance' ? '🔧' : '📦'}</span>
            <div>
              <h4>${entry.title || 'Bildirim'}</h4>
              <p class="notification-history-meta">
                ${entry.app_name ? `<span>📱 ${entry.app_name}</span>` : ''}
                <span>📅 ${createdDate}</span>
                <span class="${statusClass}">${statusIcon} ${statusText}</span>
              </p>
            </div>
          </div>
        </div>
        <div class="notification-history-body">
          <p class="notification-history-message">${entry.message || ''}</p>
          <div class="notification-history-details">
            ${entry.latest_version ? `<div><strong>Versiyon:</strong> ${entry.latest_version}</div>` : ''}
            ${entry.force_update !== undefined ? `<div><strong>Zorunlu Güncelleme:</strong> ${entry.force_update ? 'Evet' : 'Hayır'}</div>` : ''}
            <div><strong>Süre:</strong> ${durationText}</div>
            <div><strong>Oluşturulma:</strong> ${createdDate}</div>
            <div><strong>Aktifleştirme:</strong> ${activatedDate}</div>
            ${expiredDate !== '-' ? `<div><strong>Bitiş:</strong> ${expiredDate}</div>` : ''}
            ${deactivatedDate !== '-' ? `<div><strong>Kapatılma:</strong> ${deactivatedDate}</div>` : ''}
          </div>
        </div>
      </div>
    `;
  });
  
  container.innerHTML = html;
  
  // Sayfalama butonlarını render et
  if (totalPages > 1) {
    renderHistoryPagination(totalPages);
  } else {
    document.getElementById('notificationHistoryPagination').style.display = 'none';
  }
}

// Sayfalama butonlarını render et
function renderHistoryPagination(totalPages) {
  const container = document.getElementById('notificationHistoryPagination');
  if (!container) return;
  
  container.style.display = 'flex';
  container.style.justifyContent = 'center';
  container.style.gap = '10px';
  container.style.alignItems = 'center';
  
  let html = '';
  
  // Önceki sayfa butonu
  html += `<button class="btn btn-sm ${currentHistoryPage === 1 ? 'btn-disabled' : 'btn-secondary'}" 
                   onclick="changeHistoryPage(${currentHistoryPage - 1})" 
                   ${currentHistoryPage === 1 ? 'disabled' : ''}>
            ← Önceki
          </button>`;
  
  // Sayfa numaraları
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || (i >= currentHistoryPage - 2 && i <= currentHistoryPage + 2)) {
      html += `<button class="btn btn-sm ${i === currentHistoryPage ? 'btn-primary' : 'btn-secondary'}" 
                       onclick="changeHistoryPage(${i})">
                ${i}
              </button>`;
    } else if (i === currentHistoryPage - 3 || i === currentHistoryPage + 3) {
      html += `<span>...</span>`;
    }
  }
  
  // Sonraki sayfa butonu
  html += `<button class="btn btn-sm ${currentHistoryPage === totalPages ? 'btn-disabled' : 'btn-secondary'}" 
                   onclick="changeHistoryPage(${currentHistoryPage + 1})" 
                   ${currentHistoryPage === totalPages ? 'disabled' : ''}>
            Sonraki →
          </button>`;
  
  html += `<span style="margin-left: 10px; color: #666;">
            Toplam: ${filteredNotificationHistory.length} kayıt
          </span>`;
  
  container.innerHTML = html;
}

// Sayfa değiştir
function changeHistoryPage(page) {
  const totalPages = Math.ceil(filteredNotificationHistory.length / HISTORY_ITEMS_PER_PAGE);
  if (page < 1 || page > totalPages) return;
  
  currentHistoryPage = page;
  renderNotificationHistory();
  
  // Sayfayı yukarı kaydır
  const container = document.getElementById('notificationHistoryList');
  if (container) {
    container.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

// Bildirim geçmişini filtrele
function filterNotificationHistory() {
  const searchTerm = document.getElementById('notificationHistorySearch')?.value.toLowerCase() || '';
  const statusFilter = document.getElementById('notificationHistoryFilter')?.value || 'all';
  const appFilter = document.getElementById('notificationHistoryAppFilter')?.value || 'all';
  
  filteredNotificationHistory = (notificationHistoryData.history || []).filter(entry => {
    // Arama filtresi
    const matchesSearch = !searchTerm || 
      entry.title?.toLowerCase().includes(searchTerm) ||
      entry.message?.toLowerCase().includes(searchTerm) ||
      entry.app_name?.toLowerCase().includes(searchTerm);
    
    // Durum filtresi
    const matchesStatus = statusFilter === 'all' || entry.status === statusFilter;
    
    // Uygulama filtresi
    const matchesApp = appFilter === 'all' || entry.app_id === appFilter;
    
    return matchesSearch && matchesStatus && matchesApp;
  });
  
  // Sayfayı sıfırla
  currentHistoryPage = 1;
  
  // Render et
  renderNotificationHistory();
}

// Uygulama filtre dropdown'unu doldur
function populateHistoryAppFilter() {
  const select = document.getElementById('notificationHistoryAppFilter');
  if (!select) return;
  
  // Mevcut seçimi sakla
  const currentValue = select.value;
  
  // Tüm uygulamaları topla
  const apps = new Set();
  (notificationHistoryData.history || []).forEach(entry => {
    if (entry.app_id && entry.app_name) {
      apps.add(JSON.stringify({ id: entry.app_id, name: entry.app_name }));
    }
  });
  
  // Dropdown'u temizle (ilk seçeneği koru)
  const firstOption = select.querySelector('option[value="all"]');
  select.innerHTML = '';
  if (firstOption) {
    select.appendChild(firstOption);
  } else {
    const allOption = document.createElement('option');
    allOption.value = 'all';
    allOption.textContent = 'Tüm Uygulamalar';
    select.appendChild(allOption);
  }
  
  // Uygulamaları ekle
  apps.forEach(appStr => {
    const app = JSON.parse(appStr);
    const option = document.createElement('option');
    option.value = app.id;
    option.textContent = app.name;
    select.appendChild(option);
  });
  
  // Önceki seçimi geri yükle
  if (currentValue && currentValue !== 'all') {
    select.value = currentValue;
  }
}

// Bildirim geçmişini export et
function exportNotificationHistory() {
  try {
    const data = filteredNotificationHistory.length > 0 ? filteredNotificationHistory : notificationHistoryData.history;
    
    // CSV formatına çevir
    let csv = 'ID,Tip,Uygulama,Başlık,Mesaj,Durum,Oluşturulma,Aktifleştirme,Bitiş,Kapatılma\n';
    
    data.forEach(entry => {
      const row = [
        entry.id || '',
        entry.type || '',
        entry.app_name || '',
        `"${(entry.title || '').replace(/"/g, '""')}"`,
        `"${(entry.message || '').replace(/"/g, '""')}"`,
        entry.status || '',
        entry.created_at || '',
        entry.activated_at || '',
        entry.expired_at || '',
        entry.deactivated_at || ''
      ];
      csv += row.join(',') + '\n';
    });
    
    // Dosyayı indir
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `bildirim_gecmisi_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showAlert('✅ Bildirim geçmişi export edildi!', 'success');
  } catch (error) {
    console.error('Export hatası:', error);
    showAlert('❌ Export sırasında hata oluştu!', 'error');
  }
}

// Bildirim ID oluştur
function generateNotificationId() {
  return 'notif_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

// Global scope'a ekle
if (typeof window !== 'undefined') {
  window.filterNotificationHistory = filterNotificationHistory;
  window.changeHistoryPage = changeHistoryPage;
  window.exportNotificationHistory = exportNotificationHistory;
}

// ==================== BİLDİRİM ÖNİZLEME FONKSİYONLARI ====================

let currentPreviewView = 'mobile';

// Bildirim önizlemesini göster
function previewAppNotification() {
  const appSelect = document.getElementById('notification_app_select');
  if (!appSelect || !appSelect.value) {
    showAlert('⚠️ Lütfen önce bir uygulama seçin!', 'error');
    return;
  }

  const appIndex = parseInt(appSelect.value);
  const app = appsData.apps[appIndex];
  if (!app) {
    showAlert('❌ Uygulama bulunamadı!', 'error');
    return;
  }

  // Form verilerini topla
  const latestVersion = document.getElementById('latest_version')?.value.trim() || '';
  const updateMessage = document.getElementById('update_message')?.value.trim() || '';
  const forceUpdate = document.getElementById('force_update')?.value === 'true';
  const notificationEnabled = document.getElementById('notification_enabled')?.value === 'true';

  if (!notificationEnabled) {
    showAlert('⚠️ Bildirim kapalı! Önizleme için bildirimi açın.', 'error');
    return;
  }

  if (!latestVersion || !updateMessage) {
    showAlert('⚠️ Lütfen tüm zorunlu alanları doldurun!', 'error');
    return;
  }

  // Önizlemeyi render et
  renderNotificationPreview({
    type: 'app',
    app_name: app.title,
    latest_version: latestVersion,
    update_message: updateMessage,
    force_update: forceUpdate
  });

  // Modal'ı göster
  const modal = document.getElementById('notificationPreviewModal');
  if (modal) {
    modal.classList.add('active');
    document.body.classList.add('modal-open');
  }
}

// Genel bildirim önizlemesi (broadcast, maintenance)
function previewGeneralNotification(type) {
  let title, message, enabled;

  if (type === 'broadcast') {
    title = document.getElementById('broadcast_title')?.value.trim() || '';
    message = document.getElementById('broadcast_message')?.value.trim() || '';
    enabled = document.getElementById('broadcast_enabled')?.value === 'true';
  } else if (type === 'maintenance') {
    title = '🔧 Bakım Modu';
    message = document.getElementById('maintenance_message')?.value.trim() || '';
    enabled = document.getElementById('maintenance')?.value === 'true';
  }

  if (!enabled) {
    showAlert(`⚠️ ${type === 'broadcast' ? 'Yayın' : 'Bakım modu'} kapalı! Önizleme için açın.`, 'error');
    return;
  }

  if (!message) {
    showAlert('⚠️ Lütfen mesaj alanını doldurun!', 'error');
    return;
  }

  renderNotificationPreview({
    type: type,
    title: title,
    message: message
  });

  // Modal'ı göster
  const modal = document.getElementById('notificationPreviewModal');
  if (modal) {
    modal.classList.add('active');
    document.body.classList.add('modal-open');
  }
}

// Önizlemeyi render et
function renderNotificationPreview(data) {
  const mobileContent = document.getElementById('previewMobileContent');
  const desktopContent = document.getElementById('previewDesktopContent');

  if (!mobileContent || !desktopContent) return;

  let html = '';

  if (data.type === 'app') {
    // Versiyon güncelleme modal önizlemesi
    html = `
      <div class="preview-dialog preview-update">
        <div class="preview-dialog-title">🔄 Güncelleme Mevcut</div>
        <div class="preview-dialog-message">${escapeHtml(data.update_message)}</div>
        <div class="preview-dialog-actions">
          ${data.force_update ? '' : '<button class="preview-dialog-btn preview-dialog-btn-secondary">Daha Sonra</button>'}
          <button class="preview-dialog-btn preview-dialog-btn-primary">Güncelle</button>
        </div>
        ${data.latest_version ? `<div style="margin-top: 12px; font-size: 0.85rem; color: #6b7280;">Versiyon: ${escapeHtml(data.latest_version)}</div>` : ''}
      </div>
    `;
  } else if (data.type === 'broadcast') {
    // Broadcast dialog önizlemesi
    html = `
      <div class="preview-dialog preview-broadcast">
        <div class="preview-dialog-title">${escapeHtml(data.title)}</div>
        <div class="preview-dialog-message">${escapeHtml(data.message)}</div>
        <div class="preview-dialog-actions">
          <button class="preview-dialog-btn preview-dialog-btn-primary">Tamam</button>
        </div>
      </div>
    `;
  } else if (data.type === 'maintenance') {
    // Bakım modu dialog önizlemesi
    html = `
      <div class="preview-dialog preview-maintenance">
        <div class="preview-dialog-title">🔧 Bakım Modu</div>
        <div class="preview-dialog-message">${escapeHtml(data.message)}</div>
        <div class="preview-dialog-actions">
          <button class="preview-dialog-btn preview-dialog-btn-primary">Tamam</button>
        </div>
      </div>
    `;
  }

  mobileContent.innerHTML = html;
  desktopContent.innerHTML = html;
}

// Görünüm değiştir (mobil/desktop)
function switchPreviewView(view) {
  currentPreviewView = view;

  // Butonları güncelle
  document.querySelectorAll('.view-toggle-btn').forEach(btn => {
    btn.classList.remove('active');
    if (btn.dataset.view === view) {
      btn.classList.add('active');
    }
  });

  // Görünümleri güncelle
  document.querySelectorAll('.preview-container').forEach(container => {
    container.classList.remove('active');
  });

  if (view === 'mobile') {
    document.getElementById('previewMobile')?.classList.add('active');
  } else {
    document.getElementById('previewDesktop')?.classList.add('active');
  }
}

// Önizleme modal'ını kapat
function closeNotificationPreview(event) {
  if (event && event.target !== event.currentTarget) {
    return; // Modal içeriğine tıklanırsa kapatma
  }

  const modal = document.getElementById('notificationPreviewModal');
  if (modal) {
    modal.classList.remove('active');
    document.body.classList.remove('modal-open');
  }
}

// HTML escape fonksiyonu
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Global scope'a ekle
if (typeof window !== 'undefined') {
  window.previewAppNotification = previewAppNotification;
  window.previewGeneralNotification = previewGeneralNotification;
  window.switchPreviewView = switchPreviewView;
  window.closeNotificationPreview = closeNotificationPreview;
}

// ==================== BİLDİRİM İSTATİSTİKLERİ FONKSİYONLARI ====================

// notificationStatsData değişkeni zaten tanımlı mı kontrol et
if (typeof notificationStatsData === 'undefined') {
  var notificationStatsData = { stats: {}, last_updated: null };
}

let statsCharts = {
  viewsChart: null,
  clicksChart: null,
  performanceChart: null
};

// Bildirim istatistiklerini yükle
async function loadNotificationStats() {
  try {
    // LocalStorage'dan yükle
    const saved = localStorage.getItem('notificationStats');
    if (saved) {
      notificationStatsData = JSON.parse(saved);
    } else {
      // JSON dosyasından yükle
      try {
        const response = await fetch('/data/notification_stats.json?t=' + Date.now());
        if (response.ok) {
          notificationStatsData = await response.json();
          localStorage.setItem('notificationStats', JSON.stringify(notificationStatsData));
        }
      } catch (error) {
        console.warn('Bildirim istatistikleri dosyası yüklenemedi:', error);
        notificationStatsData = { stats: {}, last_updated: new Date().toISOString() };
      }
    }
    
    // Filtreleri doldur
    populateStatsFilters();
    
    // İstatistikleri render et
    renderNotificationStats();
  } catch (error) {
    console.error('Bildirim istatistikleri yükleme hatası:', error);
    notificationStatsData = { stats: {}, last_updated: new Date().toISOString() };
  }
}

// İstatistik filtrelerini doldur
function populateStatsFilters() {
  const select = document.getElementById('statsNotificationFilter');
  if (!select) return;
  
  // Tüm bildirimleri topla
  const notifications = new Set();
  if (notificationHistoryData && notificationHistoryData.history) {
    notificationHistoryData.history.forEach(entry => {
      if (entry.app_name) {
        notifications.add(entry.app_name);
      }
    });
  }
  
  // Dropdown'u temizle
  select.innerHTML = '<option value="all">Tüm Bildirimler</option>';
  
  // Bildirimleri ekle
  notifications.forEach(name => {
    const option = document.createElement('option');
    option.value = name;
    option.textContent = name;
    select.appendChild(option);
  });
}

// İstatistikleri render et
function renderNotificationStats() {
  const notificationFilter = document.getElementById('statsNotificationFilter')?.value || 'all';
  const dateRange = parseInt(document.getElementById('statsDateRange')?.value || '30');
  
  // Filtrelenmiş istatistikleri hesapla
  const filteredStats = calculateFilteredStats(notificationFilter, dateRange);
  
  // İstatistik kartlarını güncelle
  updateStatsCards(filteredStats);
  
  // Grafikleri render et
  renderStatsCharts(filteredStats);
}

// Filtrelenmiş istatistikleri hesapla
function calculateFilteredStats(notificationFilter, dateRange) {
  const now = new Date();
  const startDate = dateRange === 0 || dateRange === 'all' ? null : new Date(now.getTime() - dateRange * 24 * 60 * 60 * 1000);
  
  let totalViews = 0;
  let totalClicks = 0;
  let totalUpdateClicks = 0;
  const dailyStats = {};
  
  // Eğer istatistik yoksa boş veri döndür
  if (!notificationStatsData || !notificationStatsData.stats) {
    return {
      totalViews: 0,
      totalClicks: 0,
      totalUpdateClicks: 0,
      conversionRate: 0,
      dailyStats: []
    };
  }
  
  // Tüm bildirimlerin istatistiklerini topla
  Object.keys(notificationStatsData.stats || {}).forEach(notificationId => {
    const stat = notificationStatsData.stats[notificationId];
    
    // Bildirim filtresi kontrolü
    if (notificationFilter !== 'all') {
      const historyEntry = (notificationHistoryData && notificationHistoryData.history) ? 
        notificationHistoryData.history.find(h => h.id === notificationId) : null;
      if (!historyEntry || historyEntry.app_name !== notificationFilter) {
        return;
      }
    }
    
    // Tarih filtresi kontrolü
    if (startDate && stat.daily_stats && stat.daily_stats.length > 0) {
      stat.daily_stats.forEach(daily => {
        const dailyDate = new Date(daily.date);
        if (dailyDate >= startDate) {
          totalViews += daily.views || 0;
          totalClicks += daily.clicks || 0;
          
          const dateKey = daily.date;
          if (!dailyStats[dateKey]) {
            dailyStats[dateKey] = { views: 0, clicks: 0, date: dateKey };
          }
          dailyStats[dateKey].views += daily.views || 0;
          dailyStats[dateKey].clicks += daily.clicks || 0;
        }
      });
    } else if (!startDate) {
      // Tarih filtresi yoksa tüm istatistikleri topla
      totalViews += stat.views || 0;
      totalClicks += stat.clicks || 0;
      totalUpdateClicks += stat.update_clicks || 0;
      
      // Günlük istatistikleri de ekle
      if (stat.daily_stats && stat.daily_stats.length > 0) {
        stat.daily_stats.forEach(daily => {
          const dateKey = daily.date;
          if (!dailyStats[dateKey]) {
            dailyStats[dateKey] = { views: 0, clicks: 0, date: dateKey };
          }
          dailyStats[dateKey].views += daily.views || 0;
          dailyStats[dateKey].clicks += daily.clicks || 0;
        });
      }
    }
  });
  
  // Günlük istatistikleri tarihe göre sırala
  const sortedDailyStats = Object.values(dailyStats).sort((a, b) => 
    new Date(a.date) - new Date(b.date)
  );
  
  const conversionRate = totalViews > 0 ? ((totalClicks / totalViews) * 100).toFixed(1) : 0;
  
  return {
    totalViews,
    totalClicks,
    totalUpdateClicks,
    conversionRate,
    dailyStats: sortedDailyStats
  };
}

// İstatistik kartlarını güncelle
function updateStatsCards(stats) {
  const totalViewsEl = document.getElementById('statTotalViews');
  const totalClicksEl = document.getElementById('statTotalClicks');
  const updateClicksEl = document.getElementById('statUpdateClicks');
  const conversionRateEl = document.getElementById('statConversionRate');
  
  if (totalViewsEl) totalViewsEl.textContent = stats.totalViews.toLocaleString('tr-TR');
  if (totalClicksEl) totalClicksEl.textContent = stats.totalClicks.toLocaleString('tr-TR');
  if (updateClicksEl) updateClicksEl.textContent = stats.totalUpdateClicks.toLocaleString('tr-TR');
  if (conversionRateEl) conversionRateEl.textContent = stats.conversionRate + '%';
}

// Grafikleri render et
function renderStatsCharts(stats) {
  // Chart.js yüklü mü kontrol et
  if (typeof Chart === 'undefined') {
    console.warn('Chart.js yüklenmedi, grafikler gösterilemiyor');
    return;
  }
  
  // Görüntülenme grafiği
  renderViewsChart(stats.dailyStats);
  
  // Tıklama grafiği
  renderClicksChart(stats.dailyStats);
  
  // Performans grafiği
  renderPerformanceChart(stats);
}

// Görüntülenme grafiği
function renderViewsChart(dailyStats) {
  const ctx = document.getElementById('viewsChart');
  if (!ctx) return;
  
  // Mevcut grafiği yok et
  if (statsCharts.viewsChart) {
    statsCharts.viewsChart.destroy();
  }
  
  const labels = dailyStats.map(d => {
    const date = new Date(d.date);
    return date.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit' });
  });
  const data = dailyStats.map(d => d.views || 0);
  
  statsCharts.viewsChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{
        label: 'Görüntülenme',
        data: data,
        borderColor: 'rgb(102, 126, 234)',
        backgroundColor: 'rgba(102, 126, 234, 0.1)',
        tension: 0.4,
        fill: true
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: {
          display: false
        }
      },
      scales: {
        y: {
          beginAtZero: true
        }
      }
    }
  });
}

// Tıklama grafiği
function renderClicksChart(dailyStats) {
  const ctx = document.getElementById('clicksChart');
  if (!ctx) return;
  
  // Mevcut grafiği yok et
  if (statsCharts.clicksChart) {
    statsCharts.clicksChart.destroy();
  }
  
  // Eğer veri yoksa boş grafik göster
  if (!dailyStats || dailyStats.length === 0) {
    statsCharts.clicksChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: ['Henüz veri yok'],
        datasets: [{
          label: 'Tıklama',
          data: [0],
          backgroundColor: 'rgba(16, 185, 129, 0.8)',
          borderColor: 'rgb(16, 185, 129)',
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          legend: {
            display: false
          }
        },
        scales: {
          y: {
            beginAtZero: true
          }
        }
      }
    });
    return;
  }
  
  const labels = dailyStats.map(d => {
    const date = new Date(d.date);
    return date.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit' });
  });
  const data = dailyStats.map(d => d.clicks || 0);
  
  statsCharts.clicksChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{
        label: 'Tıklama',
        data: data,
        backgroundColor: 'rgba(16, 185, 129, 0.8)',
        borderColor: 'rgb(16, 185, 129)',
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: {
          display: false
        }
      },
      scales: {
        y: {
          beginAtZero: true
        }
      }
    }
  });
}

// Performans grafiği
function renderPerformanceChart(stats) {
  const ctx = document.getElementById('performanceChart');
  if (!ctx) return;
  
  // Mevcut grafiği yok et
  if (statsCharts.performanceChart) {
    statsCharts.performanceChart.destroy();
  }
  
  // Eğer veri yoksa boş grafik göster
  if (stats.totalViews === 0 && stats.totalClicks === 0 && stats.totalUpdateClicks === 0) {
    statsCharts.performanceChart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['Henüz veri yok'],
        datasets: [{
          data: [1],
          backgroundColor: ['rgba(200, 200, 200, 0.5)'],
          borderColor: ['rgb(200, 200, 200)'],
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          legend: {
            position: 'bottom'
          }
        }
      }
    });
    return;
  }
  
  statsCharts.performanceChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['Görüntülenme', 'Tıklama', 'Güncelleme Tıklama'],
      datasets: [{
        data: [
          stats.totalViews,
          stats.totalClicks,
          stats.totalUpdateClicks
        ],
        backgroundColor: [
          'rgba(102, 126, 234, 0.8)',
          'rgba(16, 185, 129, 0.8)',
          'rgba(59, 130, 246, 0.8)'
        ],
        borderColor: [
          'rgb(102, 126, 234)',
          'rgb(16, 185, 129)',
          'rgb(59, 130, 246)'
        ],
        borderWidth: 2
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: {
          position: 'bottom'
        }
      }
    }
  });
}

// İstatistik kaydet (tracking için)
function trackNotificationStat(notificationId, statType) {
  try {
    if (!notificationStatsData.stats) {
      notificationStatsData.stats = {};
    }
    
    if (!notificationStatsData.stats[notificationId]) {
      notificationStatsData.stats[notificationId] = {
        views: 0,
        clicks: 0,
        update_clicks: 0,
        dismiss_clicks: 0,
        daily_stats: []
      };
    }
    
    const stat = notificationStatsData.stats[notificationId];
    const today = new Date().toISOString().split('T')[0];
    
    // Günlük istatistik bul veya oluştur
    let dailyStat = stat.daily_stats.find(d => d.date === today);
    if (!dailyStat) {
      dailyStat = { date: today, views: 0, clicks: 0 };
      stat.daily_stats.push(dailyStat);
    }
    
    // İstatistiği güncelle
    if (statType === 'view') {
      stat.views++;
      dailyStat.views++;
    } else if (statType === 'click') {
      stat.clicks++;
      dailyStat.clicks++;
    } else if (statType === 'update_click') {
      stat.update_clicks++;
      stat.clicks++;
      dailyStat.clicks++;
    } else if (statType === 'dismiss_click') {
      stat.dismiss_clicks++;
      stat.clicks++;
      dailyStat.clicks++;
    }
    
    notificationStatsData.last_updated = new Date().toISOString();
    localStorage.setItem('notificationStats', JSON.stringify(notificationStatsData));
  } catch (error) {
    console.error('İstatistik kaydetme hatası:', error);
  }
}

// İstatistikleri export et
function exportNotificationStats() {
  try {
    const notificationFilter = document.getElementById('statsNotificationFilter')?.value || 'all';
    const dateRange = parseInt(document.getElementById('statsDateRange')?.value || '30');
    const filteredStats = calculateFilteredStats(notificationFilter, dateRange);
    
    // CSV formatına çevir
    let csv = 'Tarih,Görüntülenme,Tıklama\n';
    
    filteredStats.dailyStats.forEach(daily => {
      csv += `${daily.date},${daily.views},${daily.clicks}\n`;
    });
    
    // Özet istatistikler
    csv += `\nÖzet\n`;
    csv += `Toplam Görüntülenme,${filteredStats.totalViews}\n`;
    csv += `Toplam Tıklama,${filteredStats.totalClicks}\n`;
    csv += `Güncelleme Tıklama,${filteredStats.totalUpdateClicks}\n`;
    csv += `Dönüşüm Oranı,${filteredStats.conversionRate}%\n`;
    
    // Dosyayı indir
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `bildirim_istatistikleri_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showAlert('✅ İstatistikler export edildi!', 'success');
  } catch (error) {
    console.error('Export hatası:', error);
    showAlert('❌ Export sırasında hata oluştu!', 'error');
  }
}

// Global scope'a ekle
if (typeof window !== 'undefined') {
  window.loadNotificationStats = loadNotificationStats;
  window.exportNotificationStats = exportNotificationStats;
  window.trackNotificationStat = trackNotificationStat;
}

// ==================== AI ASISTAN AYARLARI ====================

// AI Ayarlarını Kaydet
function saveAISettings(event) {
  if (event) event.preventDefault();
  
  const aiEnabled = document.getElementById('ai_enabled')?.checked || false;
  const aiModel = document.getElementById('ai_model')?.value || 'gpt-3.5-turbo';
  const aiApiKey = document.getElementById('ai_api_key')?.value.trim() || '';
  const aiDailyCredit = parseInt(document.getElementById('ai_daily_credit')?.value || '5');
  const aiMaxTokens = parseInt(document.getElementById('ai_max_tokens')?.value || '400');
  const aiSystemPrompt = document.getElementById('ai_system_prompt')?.value.trim() || '';
  const aiFloatingButton = document.getElementById('ai_floating_button')?.checked || false;
  const aiShowOnHome = document.getElementById('ai_show_on_home')?.checked || false;
  const aiSaveChatHistory = document.getElementById('ai_save_chat_history')?.checked || false;
  
  // EmailJS ayarları
  const emailEnabled = document.getElementById('ai_email_enabled')?.checked || false;
  const emailjsServiceId = document.getElementById('emailjs_service_id')?.value.trim() || '';
  const emailjsTemplateId = document.getElementById('emailjs_template_id')?.value.trim() || '';
  const emailjsPublicKey = document.getElementById('emailjs_public_key')?.value.trim() || '';
  const emailjsToEmail = document.getElementById('emailjs_to_email')?.value.trim() || 'bambinifojo@gmail.com';
  
  // EmailJS ayarlarını kaydet
  if (emailEnabled && emailjsServiceId && emailjsTemplateId && emailjsPublicKey) {
    const emailjsConfig = {
      serviceId: emailjsServiceId,
      templateId: emailjsTemplateId,
      publicKey: emailjsPublicKey,
      toEmail: emailjsToEmail || 'bambinifojo@gmail.com',
      enabled: emailEnabled
    };
    localStorage.setItem('emailjsConfig', JSON.stringify(emailjsConfig));
    console.log('✅ EmailJS ayarları kaydedildi');
  } else if (emailEnabled) {
    showAlert('⚠️ E-posta aktif ama EmailJS bilgileri eksik!', 'warning');
  } else {
    // E-posta kapalıysa config'i temizle
    localStorage.removeItem('emailjsConfig');
  }
  
  // AI ayarlarını kaydet
  const aiConfig = {
    enabled: aiEnabled,
    model: aiModel,
    apiKey: aiApiKey,
    dailyCredit: aiDailyCredit,
    maxTokens: aiMaxTokens,
    systemPrompt: aiSystemPrompt,
    floatingButton: aiFloatingButton,
    showOnHome: aiShowOnHome,
    saveChatHistory: aiSaveChatHistory,
    emailEnabled: emailEnabled
  };
  
  localStorage.setItem('aiConfig', JSON.stringify(aiConfig));
  
  // Firebase'e kaydet (eğer Firebase modu aktifse)
  if (currentMode === 'firebase' && firebaseDatabase) {
    try {
      firebaseDatabase.ref('aiConfig').set(aiConfig);
      if (emailEnabled) {
        firebaseDatabase.ref('emailjsConfig').set(emailjsConfig);
      }
    } catch (error) {
      console.error('Firebase kaydetme hatası:', error);
    }
  }
  
  showAlert('✅ AI ayarları kaydedildi!', 'success');
}

// AI Ayarlarını Yükle
function loadAISettings() {
  if (typeof initAdminAiSettings === 'function' && document.getElementById('adminAiSettingsRoot')) {
    initAdminAiSettings();
    return;
  }

  // LocalStorage'dan yükle
  const saved = localStorage.getItem('aiConfig');
  if (saved) {
    try {
      const config = JSON.parse(saved);
      if (document.getElementById('ai_enabled')) document.getElementById('ai_enabled').checked = config.enabled || false;
      if (document.getElementById('ai_model')) document.getElementById('ai_model').value = config.model || 'gpt-3.5-turbo';
      if (document.getElementById('ai_api_key')) document.getElementById('ai_api_key').value = config.apiKey || '';
      if (document.getElementById('ai_daily_credit')) document.getElementById('ai_daily_credit').value = config.dailyCredit || 5;
      if (document.getElementById('ai_max_tokens')) document.getElementById('ai_max_tokens').value = config.maxTokens || 400;
      if (document.getElementById('ai_system_prompt')) document.getElementById('ai_system_prompt').value = config.systemPrompt || '';
      if (document.getElementById('ai_floating_button')) document.getElementById('ai_floating_button').checked = config.floatingButton || false;
      if (document.getElementById('ai_show_on_home')) document.getElementById('ai_show_on_home').checked = config.showOnHome || false;
      if (document.getElementById('ai_save_chat_history')) document.getElementById('ai_save_chat_history').checked = config.saveChatHistory || false;
    } catch (e) {
      console.error('AI config parse hatası:', e);
    }
  }
  
  // EmailJS ayarlarını yükle
  const emailjsSaved = localStorage.getItem('emailjsConfig');
  if (emailjsSaved) {
    try {
      const emailjsConfig = JSON.parse(emailjsSaved);
      if (document.getElementById('ai_email_enabled')) document.getElementById('ai_email_enabled').checked = emailjsConfig.enabled || false;
      if (document.getElementById('emailjs_service_id')) document.getElementById('emailjs_service_id').value = emailjsConfig.serviceId || '';
      if (document.getElementById('emailjs_template_id')) document.getElementById('emailjs_template_id').value = emailjsConfig.templateId || '';
      if (document.getElementById('emailjs_public_key')) document.getElementById('emailjs_public_key').value = emailjsConfig.publicKey || '';
      if (document.getElementById('emailjs_to_email')) document.getElementById('emailjs_to_email').value = emailjsConfig.toEmail || 'bambinifojo@gmail.com';
    } catch (e) {
      console.error('EmailJS config parse hatası:', e);
    }
  }
}

// EmailJS Public Key göster/gizle
function toggleEmailJSKey() {
  const input = document.getElementById('emailjs_public_key');
  const icon = document.getElementById('emailjsKeyEyeIcon');
  if (!input || !icon) return;
  
  if (input.type === 'password') {
    input.type = 'text';
    icon.innerHTML = '<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line>';
  } else {
    input.type = 'password';
    icon.innerHTML = '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle>';
  }
}

// AI API Key göster/gizle
function toggleAIApiKey() {
  const input = document.getElementById('ai_api_key');
  const icon = document.getElementById('aiApiKeyEyeIcon');
  if (!input || !icon) return;
  
  if (input.type === 'password') {
    input.type = 'text';
    icon.innerHTML = '<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line>';
  } else {
    input.type = 'password';
    icon.innerHTML = '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle>';
  }
}

// apps.json'dan veriyi yeniden yükle
async function reloadAppsFromJSON() {
  if (!confirm('apps.json dosyasından veriyi yeniden yüklemek istediğinize emin misiniz? Mevcut değişiklikler kaybolabilir.')) {
    return;
  }
  
  try {
    showAlert('⏳ apps.json yükleniyor...', 'info');
    
    // LocalStorage'ı temizle
    localStorage.removeItem('appsData');
    localStorage.removeItem('appData');
    
    // apps.json'dan yükle
    const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    const dataPath = isLocalhost ? 'data/apps.json' : '/data/apps.json';
    
    const response = await fetch(dataPath + '?t=' + Date.now());
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    appsData = data;
    
    // LocalStorage'a kaydet
    saveToLocal();
    
    // Firebase'e kaydet (eğer Firebase modu aktifse)
    if (currentMode === 'firebase' && firebaseDatabase) {
      await saveToFirebase(true);
      showAlert('✅ apps.json yüklendi ve Firebase\'e kaydedildi!', 'success');
    } else {
      showAlert('✅ apps.json yüklendi ve LocalStorage\'a kaydedildi!', 'success');
    }
    
    // UI'ı güncelle
    updateStats();
    renderApps();
    
    console.log('✅ apps.json yüklendi:', appsData.apps?.length || 0, 'uygulama');
  } catch (error) {
    console.error('❌ apps.json yüklenirken hata:', error);
    showAlert(`❌ Hata: ${error.message}`, 'error');
  }
}

// Global scope'a ekle
if (typeof window !== 'undefined') {
  window.saveAISettings = saveAISettings;
  window.loadAISettings = loadAISettings;
  window.toggleEmailJSKey = toggleEmailJSKey;
  window.toggleAIApiKey = toggleAIApiKey;
  window.reloadAppsFromJSON = reloadAppsFromJSON;
}
