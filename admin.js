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
  window.location.replace('admin-login.html');
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
    
    // Bulunamazsa varsayılan admin şifresini kontrol et
    if (!authenticatedUser && hashedPassword === ADMIN_PASSWORD_HASH) {
      authenticatedUser = usersData.find(user => user.username === 'admin');
      // Eğer admin kullanıcısı yoksa oluştur
      if (!authenticatedUser) {
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
  
  // Tüm nav item'ları pasif yap
  document.querySelectorAll('.admin-nav-item').forEach(item => {
    item.classList.remove('active');
  });
  
  // Seçilen section'ı göster
  const targetSection = document.getElementById(section + 'Section');
  if (targetSection) {
    targetSection.classList.remove('hidden');
  }
  
  // Seçilen nav item'ı aktif yap
  const navItem = document.querySelector(`.admin-nav-item[onclick="showSection('${section}')"]`);
  if (navItem) {
    navItem.classList.add('active');
  }
  
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
  
  // Path-based routing kullan (admin/dashboard formatı)
  const currentPath = window.location.pathname;
  const newPath = `/admin/${section}`;
  
  // History API ile path'i güncelle (sayfa yenilenmeden)
  if (currentPath !== newPath) {
    window.history.pushState({ section: section }, '', newPath);
  }
}

// Path-based routing: URL'den section'ı oku
function getSectionFromPath() {
  const path = window.location.pathname;
  const pathMatch = path.match(/\/admin\/([^\/]+)/);
  if (pathMatch) {
    return pathMatch[1];
  }
  // Hash fallback
  const hash = window.location.hash.replace('#', '');
  return hash || 'dashboard';
}

// Sidebar toggle (Mobile)
function toggleSidebar() {
  const sidebar = document.getElementById('adminSidebar');
  const overlay = document.querySelector('.admin-sidebar-overlay');
  const menuToggle = document.querySelector('.admin-menu-toggle');
  
  if (sidebar && overlay) {
    const isOpen = sidebar.classList.toggle('open');
    overlay.classList.toggle('active');
    
    // Body scroll lock
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      document.body.classList.add('sidebar-open');
    } else {
      document.body.style.overflow = '';
      document.body.classList.remove('sidebar-open');
    }
    
    // Menu toggle button active state
    if (menuToggle) {
      menuToggle.classList.toggle('active');
    }
  }
}

// Sidebar'ı kapat (dışarıdan çağrılabilir)
function closeSidebar() {
  const sidebar = document.getElementById('adminSidebar');
  const overlay = document.querySelector('.admin-sidebar-overlay');
  const menuToggle = document.querySelector('.admin-menu-toggle');
  
  if (sidebar && overlay) {
    sidebar.classList.remove('open');
    overlay.classList.remove('active');
    document.body.style.overflow = '';
    document.body.classList.remove('sidebar-open');
    
    if (menuToggle) {
      menuToggle.classList.remove('active');
    }
  }
}

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

// Sayfa yüklendiğinde otomatik giriş (LocalStorage modunda)
document.addEventListener('DOMContentLoaded', () => {
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
  
  // Browser back/forward butonları için
  window.addEventListener('popstate', (e) => {
    const section = getSectionFromPath();
    if (section) {
      showSection(section);
    }
  });
  
  // Session varsa verileri yükle
  if (checkAdminSession()) {
    // LocalStorage modunda otomatik giriş yap
    if (localStorage.getItem('appsData')) {
      autoLogin();
    } else {
      // İlk kez, apps.json'dan yükle
      fetch('data/apps.json')
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
  
  // Overlay'e tıklandığında sidebar'ı kapat
  const overlay = document.querySelector('.admin-sidebar-overlay');
  if (overlay) {
    overlay.addEventListener('click', () => {
      toggleSidebar();
    });
  }
});

// Otomatik giriş (event olmadan)
function autoLogin() {
  const saved = localStorage.getItem('appsData');
  if (saved) {
    appsData = JSON.parse(saved);
  } else {
    // İlk kez, apps.json'dan yükle
    fetch('data/apps.json')
      .then(res => res.json())
      .then(data => {
        appsData = data;
        if (!appsData.site) {
          // Eski format, site verisi yok, site.json'dan yükle
          fetch('data/site.json')
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
        const res = await fetch('data/apps.json');
        appsData = await res.json();
        if (!appsData.site) {
          // Site verisi yoksa site.json'dan yükle
          try {
            const siteRes = await fetch('data/site.json');
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
    window.location.replace('admin-login.html');
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

    showAlert('✅ GitHub\'a başarıyla kaydedildi!', 'success');
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

  container.innerHTML = appsData.apps.map((app, index) => {
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
  
  if (appNotificationIdEl) appNotificationIdEl.value = app.appId || '';
  if (appNotificationPackageEl) appNotificationPackageEl.value = app.package || '';
  if (appNotificationVersionEl) appNotificationVersionEl.value = notification.latest_version || '';
  if (appNotificationForceUpdateEl) appNotificationForceUpdateEl.value = String(notification.force_update || false);
  if (appNotificationMessageEl) appNotificationMessageEl.value = notification.update_message || '';
  if (appNotificationEnabledEl) appNotificationEnabledEl.value = String(notification.enabled || false);
  
  if (formTitleEl) formTitleEl.textContent = 'Uygulama Düzenle';
  
  // Kısa bir gecikme ile modal'ı aç
  setTimeout(() => {
    showAppModal();
  }, 100);
}

// Uygulama kaydet
async function saveApp(event) {
  event.preventDefault();
  
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
  
  if (notificationEnabled && (notificationVersion || notificationMessage)) {
    // Bildirim aktif ve bilgiler doluysa ekle
    app.notification = {
      latest_version: notificationVersion || '1.0.0',
      force_update: appNotificationForceUpdateEl?.value === 'true',
      update_message: notificationMessage || 'Yeni sürüm mevcut! Lütfen uygulamayı güncelleyin.',
      enabled: true
    };
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

  // Otomatik olarak GitHub'a deploy et (Netlify Function ile)
  try {
    const response = await fetch('/.netlify/functions/updateApps', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(appsData)
    });
    
    const result = await response.json();
    
    if (response.ok) {
      // GitHub'a başarıyla kaydedildi
      saveToLocal(); // LocalStorage'a da kaydet (backup)
      showAlert('✅ Değişiklikler GitHub\'a kaydedildi ve deploy edildi! Site birkaç saniye içinde güncellenecek.', 'success');
      // Önizlemeyi otomatik yenile
      autoRefreshPreview();
    } else {
      // Netlify Function çalışmıyorsa fallback
      throw new Error(result.error || 'GitHub kaydetme başarısız');
    }
  } catch (error) {
    // Hata yönetimi - kullanıcı dostu mesajlar
    const errorMessage = error instanceof Error ? error.message : 'Bilinmeyen bir hata oluştu';
    console.error('Netlify Function hatası:', error);
    
    // Netlify Function çalışmıyor - kullanıcıyı uyar
    saveToLocal(); // LocalStorage'a backup olarak kaydet
    showAlert('⚠️ Otomatik deploy çalışmıyor! Değişiklikler sadece LocalStorage\'a kaydedildi. Site güncellenmeyecek. Lütfen Netlify Function ayarlarını kontrol edin veya manuel olarak GitHub\'a push yapın.', 'error');
    
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

  updateStats();
  renderApps();
  closeAppModal();
  
  // LocalStorage'a kaydedildiyse önizlemeyi yenile (anında görüntüleme için)
  if (currentMode === 'local') {
    setTimeout(() => {
      refreshPreview(false);
    }, 500);
  }
}

// Modal Functions
function showAppModal() {
  const modal = document.getElementById('appFormModal');
  if (modal) {
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

  // Otomatik olarak GitHub'a deploy et (Netlify Function ile)
  try {
    const response = await fetch('/.netlify/functions/updateApps', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(appsData)
    });
    
    const result = await response.json();
    
    if (response.ok) {
      // GitHub'a başarıyla kaydedildi
      saveToLocal(); // LocalStorage'a da kaydet (backup)
      showAlert('✅ Uygulama silindi ve GitHub\'a kaydedildi! Site birkaç saniye içinde güncellenecek.', 'success');
      // Önizlemeyi otomatik yenile
      autoRefreshPreview();
    } else {
      // Netlify Function çalışmıyorsa fallback
      throw new Error(result.error || 'GitHub kaydetme başarısız');
    }
  } catch (error) {
    console.error('Netlify Function hatası:', error);
    // Netlify Function çalışmıyor - kullanıcıyı uyar
    saveToLocal(); // LocalStorage'a backup olarak kaydet
    showAlert('⚠️ Otomatik deploy çalışmıyor! Değişiklikler sadece LocalStorage\'a kaydedildi. Site güncellenmeyecek. Lütfen Netlify Function ayarlarını kontrol edin.', 'error');
    
    // Eğer GitHub modu aktifse ve token varsa, manuel kaydetmeyi dene
    if (currentMode === 'github' && token) {
      try {
        await saveToGitHub();
        showAlert('✅ Uygulama silindi ve GitHub\'a manuel olarak kaydedildi!', 'success');
      } catch (githubError) {
        console.error('GitHub kaydetme hatası:', githubError);
      }
    }
  }

  updateStats();
  renderApps();
  
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
    renderContactList();
  }
}

async function saveSiteSection(section) {
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
    
    const skills = [];
    document.querySelectorAll('.skill-edit-item').forEach(item => {
      const nameInput = item.querySelector('.skill-name-input');
      const iconInput = item.querySelector('.skill-icon-input');
      const levelInput = item.querySelector('.skill-level-input');
      if (nameInput && iconInput && levelInput) {
        skills.push({
          name: nameInput.value.trim(),
          icon: iconInput.value.trim(),
          level: parseInt(levelInput.value) || 0
        });
      }
    });
    
    appsData.site.skills = {
      title: titleEl.value.trim(),
      items: skills
    };
  } else if (section === 'contact') {
    const titleEl = document.getElementById('siteContactTitle');
    const subtitleEl = document.getElementById('siteContactSubtitle');
    if (!titleEl || !subtitleEl) {
      showAlert('❌ Form elemanları bulunamadı!', 'error');
      return;
    }
    
    const contacts = [];
    document.querySelectorAll('.contact-edit-item').forEach(item => {
      const typeInput = item.querySelector('.contact-type-input');
      const iconInput = item.querySelector('.contact-icon-input');
      const titleInput = item.querySelector('.contact-title-input');
      const valueInput = item.querySelector('.contact-value-input');
      const linkInput = item.querySelector('.contact-link-input');
      const descInput = item.querySelector('.contact-desc-input');
      
      if (typeInput && iconInput && titleInput && valueInput && linkInput && descInput) {
        contacts.push({
          type: typeInput.value.trim(),
          icon: iconInput.value.trim(),
          title: titleInput.value.trim(),
          value: valueInput.value.trim(),
          link: linkInput.value.trim(),
          description: descInput.value.trim()
        });
      }
    });
    
    appsData.site.contact = {
      title: titleEl.value.trim(),
      subtitle: subtitleEl.value.trim(),
      items: contacts
    };
  }
  
  // Otomatik olarak GitHub'a deploy et (Netlify Function ile)
  try {
    const response = await fetch('/.netlify/functions/updateApps', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(appsData)
    });
    
    const result = await response.json();
    
    if (response.ok) {
      // GitHub'a başarıyla kaydedildi
      saveToLocal(); // LocalStorage'a da kaydet (backup)
      showAlert('✅ Site ayarları GitHub\'a kaydedildi ve deploy edildi! Site birkaç saniye içinde güncellenecek.', 'success');
      // Önizlemeyi otomatik yenile
      autoRefreshPreview();
    } else {
      throw new Error(result.error || 'GitHub kaydetme başarısız');
    }
  } catch (error) {
    console.error('Netlify Function hatası:', error);
    // Netlify Function çalışmıyor - kullanıcıyı uyar
    saveToLocal(); // LocalStorage'a backup olarak kaydet
    showAlert('⚠️ Otomatik deploy çalışmıyor! Değişiklikler sadece LocalStorage\'a kaydedildi. Site güncellenmeyecek. Lütfen Netlify Function ayarlarını kontrol edin.', 'error');
    
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
  const skills = appsData.site?.skills?.items || [];
  
  container.innerHTML = skills.map((skill, index) => `
    <div class="skill-edit-item" style="background: #f9f9f9; padding: 15px; border-radius: 10px; margin-bottom: 10px;">
      <div style="display: grid; grid-template-columns: 1fr 80px 100px auto; gap: 10px; align-items: center;">
        <input type="text" class="skill-name-input" value="${skill.name || ''}" placeholder="Yetenek adı" style="padding: 8px; border: 1px solid #ddd; border-radius: 5px;"/>
        <input type="text" class="skill-icon-input" value="${skill.icon || ''}" placeholder="Icon" maxlength="2" style="padding: 8px; border: 1px solid #ddd; border-radius: 5px; text-align: center;"/>
        <input type="number" class="skill-level-input" value="${skill.level || 0}" min="0" max="100" placeholder="Seviye" style="padding: 8px; border: 1px solid #ddd; border-radius: 5px;"/>
        <button type="button" class="btn btn-danger btn-sm" onclick="removeSkillItem(${index})">🗑️</button>
      </div>
    </div>
  `).join('');
}

function addSkillItem() {
  const container = document.getElementById('skillsListContainer');
  const newItem = document.createElement('div');
  newItem.className = 'skill-edit-item';
  newItem.style.cssText = 'background: #f9f9f9; padding: 15px; border-radius: 10px; margin-bottom: 10px;';
  newItem.innerHTML = `
    <div style="display: grid; grid-template-columns: 1fr 80px 100px auto; gap: 10px; align-items: center;">
      <input type="text" class="skill-name-input" placeholder="Yetenek adı" style="padding: 8px; border: 1px solid #ddd; border-radius: 5px;"/>
      <input type="text" class="skill-icon-input" placeholder="Icon" maxlength="2" style="padding: 8px; border: 1px solid #ddd; border-radius: 5px; text-align: center;"/>
      <input type="number" class="skill-level-input" value="0" min="0" max="100" placeholder="Seviye" style="padding: 8px; border: 1px solid #ddd; border-radius: 5px;"/>
      <button type="button" class="btn btn-danger btn-sm" onclick="this.closest('.skill-edit-item').remove()">🗑️</button>
    </div>
  `;
  container.appendChild(newItem);
}

function removeSkillItem(index) {
  if (appsData.site?.skills?.items) {
    appsData.site.skills.items.splice(index, 1);
    renderSkillsList();
  }
}

function renderContactList() {
  const container = document.getElementById('contactListContainer');
  const contacts = appsData.site?.contact?.items || [];
  
  container.innerHTML = contacts.map((contact, index) => `
    <div class="contact-edit-item" style="background: #f9f9f9; padding: 15px; border-radius: 10px; margin-bottom: 10px;">
      <div style="display: grid; gap: 10px;">
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
          <input type="text" class="contact-type-input" value="${contact.type || ''}" placeholder="Tip (email, github, vb.)" style="padding: 8px; border: 1px solid #ddd; border-radius: 5px;"/>
          <input type="text" class="contact-icon-input" value="${contact.icon || ''}" placeholder="Icon" maxlength="2" style="padding: 8px; border: 1px solid #ddd; border-radius: 5px; text-align: center;"/>
        </div>
        <input type="text" class="contact-title-input" value="${contact.title || ''}" placeholder="Başlık" style="padding: 8px; border: 1px solid #ddd; border-radius: 5px;"/>
        <input type="text" class="contact-value-input" value="${contact.value || ''}" placeholder="Değer (örn: email adresi)" style="padding: 8px; border: 1px solid #ddd; border-radius: 5px;"/>
        <input type="url" class="contact-link-input" value="${contact.link || ''}" placeholder="Link URL" style="padding: 8px; border: 1px solid #ddd; border-radius: 5px;"/>
        <textarea class="contact-desc-input" placeholder="Açıklama" style="padding: 8px; border: 1px solid #ddd; border-radius: 5px; min-height: 60px;">${contact.description || ''}</textarea>
        <button type="button" class="btn btn-danger btn-sm" onclick="this.closest('.contact-edit-item').remove()">🗑️ Sil</button>
      </div>
    </div>
  `).join('');
}

function addContactItem() {
  const container = document.getElementById('contactListContainer');
  const newItem = document.createElement('div');
  newItem.className = 'contact-edit-item';
  newItem.style.cssText = 'background: #f9f9f9; padding: 15px; border-radius: 10px; margin-bottom: 10px;';
  newItem.innerHTML = `
    <div style="display: grid; gap: 10px;">
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
        <input type="text" class="contact-type-input" placeholder="Tip (email, github, vb.)" style="padding: 8px; border: 1px solid #ddd; border-radius: 5px;"/>
        <input type="text" class="contact-icon-input" placeholder="Icon" maxlength="2" style="padding: 8px; border: 1px solid #ddd; border-radius: 5px; text-align: center;"/>
      </div>
      <input type="text" class="contact-title-input" placeholder="Başlık" style="padding: 8px; border: 1px solid #ddd; border-radius: 5px;"/>
      <input type="text" class="contact-value-input" placeholder="Değer (örn: email adresi)" style="padding: 8px; border: 1px solid #ddd; border-radius: 5px;"/>
      <input type="url" class="contact-link-input" placeholder="Link URL" style="padding: 8px; border: 1px solid #ddd; border-radius: 5px;"/>
      <textarea class="contact-desc-input" placeholder="Açıklama" style="padding: 8px; border: 1px solid #ddd; border-radius: 5px; min-height: 60px;"></textarea>
      <button type="button" class="btn btn-danger btn-sm" onclick="this.closest('.contact-edit-item').remove()">🗑️ Sil</button>
    </div>
  `;
  container.appendChild(newItem);
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
  localStorage.setItem('adminUsers', JSON.stringify(usersData));
}

// Kullanıcıları listele
function renderUsers() {
  const container = document.getElementById('usersList');
  const countEl = document.getElementById('usersCount');
  
  if (!container) return;
  
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
      showAlert('✅ Kullanıcı başarıyla eklendi!', 'success');
    } else {
      // Kullanıcı güncelle
      usersData[index] = userData;
      showAlert('✅ Kullanıcı başarıyla güncellendi!', 'success');
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
    showAlert('✅ Kullanıcı başarıyla silindi!', 'success');
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
  
  const currentPassword = document.getElementById('currentPassword').value;
  const newPassword = document.getElementById('newPassword').value;
  const confirmPassword = document.getElementById('confirmNewPassword').value;
  
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
  const currentUser = usersData.find(user => user.passwordHash === hashedCurrentPassword);
  
  if (!currentUser && hashedCurrentPassword !== ADMIN_PASSWORD_HASH) {
    currentPasswordError.textContent = '❌ Mevcut şifre hatalı.';
    document.getElementById('currentPassword').classList.add('error');
    return;
  }
  
  // Şifreyi güncelle
  const hashedNewPassword = await hashPassword(newPassword);
  
  if (currentUser) {
    currentUser.passwordHash = hashedNewPassword;
    saveUsers();
  } else {
    // Varsayılan admin şifresi değiştiriliyor
    const adminUser = usersData.find(user => user.username === 'admin');
    if (adminUser) {
      adminUser.passwordHash = hashedNewPassword;
      saveUsers();
    }
  }
  
  showAlert('✅ Şifre başarıyla değiştirildi!', 'success');
  closeChangePasswordModal();
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
  if (!container) return;
  
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
  if (!container) return;
  
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
    // Sadece Netlify'dan yükle (CORS sorunu nedeniyle GitHub'dan yükleme kaldırıldı)
    const response = await fetch('https://bambinifojo.netlify.app/app_config.json?t=' + Date.now());
    let config = {};
    
    if (response.ok) {
      config = await response.json();
    } else {
      // Eğer Netlify'da yoksa varsayılan değerleri kullan
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
    const broadcastTitleEl = document.getElementById('broadcast_title');
    const broadcastMessageEl = document.getElementById('broadcast_message');
    const broadcastEnabledEl = document.getElementById('broadcast_enabled');
    const maintenanceEl = document.getElementById('maintenance');
    const maintenanceMessageEl = document.getElementById('maintenance_message');
    
    if (latestVersionEl) latestVersionEl.value = config.latest_version || "1.0.0";
    if (forceUpdateEl) forceUpdateEl.value = String(config.force_update || false);
    if (updateMessageEl) updateMessageEl.value = config.update_message || "";
    if (broadcastTitleEl) broadcastTitleEl.value = config.broadcast_title || "";
    if (broadcastMessageEl) broadcastMessageEl.value = config.broadcast_message || "";
    if (broadcastEnabledEl) broadcastEnabledEl.value = String(config.broadcast_enabled || false);
    if (maintenanceEl) maintenanceEl.value = String(config.maintenance || false);
    if (maintenanceMessageEl) maintenanceMessageEl.value = config.maintenance_message || "";
    
  } catch (error) {
    console.error('Config yükleme hatası:', error);
    showAlert('⚠️ Config yüklenirken hata oluştu. Varsayılan değerler kullanılıyor.', 'error');
    
    // Hata durumunda varsayılan değerleri form'a yükle
    const latestVersionEl = document.getElementById('latest_version');
    const forceUpdateEl = document.getElementById('force_update');
    const updateMessageEl = document.getElementById('update_message');
    const broadcastTitleEl = document.getElementById('broadcast_title');
    const broadcastMessageEl = document.getElementById('broadcast_message');
    const broadcastEnabledEl = document.getElementById('broadcast_enabled');
    const maintenanceEl = document.getElementById('maintenance');
    const maintenanceMessageEl = document.getElementById('maintenance_message');
    
    if (latestVersionEl) latestVersionEl.value = "1.0.0";
    if (forceUpdateEl) forceUpdateEl.value = "false";
    if (updateMessageEl) updateMessageEl.value = "Yeni sürüm mevcut! Lütfen uygulamayı güncelleyin.";
    if (broadcastTitleEl) broadcastTitleEl.value = "Yeni Görev Yayınlandı!";
    if (broadcastMessageEl) broadcastMessageEl.value = "Yeni bölümler aktif! Hemen kontrol edin.";
    if (broadcastEnabledEl) broadcastEnabledEl.value = "false";
    if (maintenanceEl) maintenanceEl.value = "false";
    if (maintenanceMessageEl) maintenanceMessageEl.value = "Bakım çalışmaları sürüyor. Lütfen daha sonra tekrar deneyin.";
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
      
      showAlert('✅ Ayarlar başarıyla GitHub\'a kaydedildi!', 'success');
    } catch (error) {
      // Netlify Function çalışmıyorsa fallback
      console.warn('Netlify Function hatası, fallback kullanılıyor:', error);
      if (currentMode === 'github' && token) {
        await saveConfigToGitHub(config);
      } else {
        localStorage.setItem('app_config', JSON.stringify(config));
        showAlert('⚠️ Netlify Function kullanılamıyor. LocalStorage\'a kaydedildi.', 'info');
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
    
    showAlert('✅ Ayarlar GitHub\'a başarıyla kaydedildi!', 'success');
    
  } catch (error) {
    console.error('GitHub kaydetme hatası:', error);
    throw error;
  }
}
