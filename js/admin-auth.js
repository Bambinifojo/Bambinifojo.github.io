// Admin Panel Authentication Module
// Session yönetimi, login, logout işlemleri

/**
 * Şifre hash fonksiyonu
 */
async function hashPassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

/**
 * Admin session kontrolü
 */
function checkAdminSession() {
  const adminSession = sessionStorage.getItem('adminSession');
  const adminLoginTime = sessionStorage.getItem('adminLoginTime');
  
  if (!adminSession || !adminLoginTime) {
    redirectToLogin();
    return false;
  }
  
  const loginTime = parseInt(adminLoginTime);
  const currentTime = Date.now();
  
  if ((currentTime - loginTime) > AdminState.CONSTANTS.SESSION_TIMEOUT) {
    // Session süresi dolmuş
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

/**
 * Login sayfasına yönlendir
 */
function redirectToLogin() {
  if (window.location.pathname.includes('admin-login.html')) {
    return;
  }
  
  // Mevcut section'ı kaydet (login sonrası geri dönmek için)
  const currentHash = window.location.hash.replace('#', '');
  const currentSection = currentHash || 'dashboard';
  localStorage.setItem('lastAdminSection', currentSection);
  
  const message = 'Oturum süreniz dolmuş. Lütfen tekrar giriş yapın.';
  sessionStorage.setItem('sessionTimeoutMessage', message);
  // Hash'i temizle ve admin-login sayfasına yönlendir
  window.location.replace('/admin-login.html');
}

/**
 * Session kontrolünü throttle ile optimize et
 */
function checkAdminSessionThrottled() {
  const now = Date.now();
  if (now - AdminState.lastSessionCheck < 5000) {
    return true;
  }
  AdminState.lastSessionCheck = now;
  return checkAdminSession();
}

/**
 * Son aktivite zamanını güncelle
 */
function updateLastActivity() {
  if (sessionStorage.getItem('adminSession')) {
    sessionStorage.setItem('adminLastActivity', Date.now().toString());
  }
}

/**
 * Admin giriş formunu göster/gizle
 */
function toggleAdminLoginForm() {
  const hasSession = checkAdminSession();
  const passwordForm = document.getElementById('passwordLoginForm');
  const dataLoadSection = document.getElementById('dataLoadSection');
  const loginSection = document.getElementById('adminLoginSection');
  const logoutBtn = document.getElementById('logoutBtn');
  
  if (hasSession) {
    if (loginSection) loginSection.classList.add('hidden');
    if (passwordForm) passwordForm.classList.add('hidden');
    if (dataLoadSection) dataLoadSection.classList.add('hidden');
    if (logoutBtn) logoutBtn.classList.remove('hidden');
    const topbarMenuLogoutBtn = document.getElementById('topbarMenuLogoutBtn');
    if (topbarMenuLogoutBtn) topbarMenuLogoutBtn.classList.remove('hidden');
    
    // Kullanıcı bilgilerini güncelle
    const adminUsername = sessionStorage.getItem('adminUsername') || 'Admin';
    const adminUserNameEl = document.getElementById('adminUserName');
    const adminUserAvatarEl = document.getElementById('adminUserAvatar');
    if (adminUserNameEl) {
      adminUserNameEl.textContent = adminUsername;
    }
    if (adminUserAvatarEl) {
      adminUserAvatarEl.textContent = adminUsername.charAt(0).toUpperCase();
    }
  } else {
    if (loginSection) loginSection.classList.remove('hidden');
    if (passwordForm) passwordForm.classList.remove('hidden');
    if (dataLoadSection) dataLoadSection.classList.add('hidden');
    if (logoutBtn) logoutBtn.classList.add('hidden');
    const topbarMenuLogoutBtn = document.getElementById('topbarMenuLogoutBtn');
    if (topbarMenuLogoutBtn) topbarMenuLogoutBtn.classList.add('hidden');
  }
}

/**
 * Admin şifre girişi
 */
async function handleAdminLogin() {
  const passwordInput = document.getElementById('adminPassword');
  const errorMessage = document.getElementById('adminPasswordError');
  const loginBtn = document.getElementById('adminLoginBtn');
  
  if (!passwordInput || !errorMessage || !loginBtn) return;
  
  const password = passwordInput.value.trim();
  
  if (!password || password.length === 0) {
    errorMessage.textContent = '⚠️ Lütfen şifrenizi girin.';
    passwordInput.classList.add('error');
    passwordInput.focus();
    return;
  }
  
  loginBtn.disabled = true;
  const originalText = loginBtn.querySelector('span')?.textContent || '🔐 Admin Girişi';
  loginBtn.querySelector('span').textContent = '⏳ Kontrol ediliyor...';
  errorMessage.textContent = '';
  passwordInput.classList.remove('error');
  
  try {
    // Kullanıcıları yükle (AdminData modülünden)
    if (typeof loadUsers === 'function') {
      loadUsers();
    }
    
    const hashedPassword = await hashPassword(password);
    let authenticatedUser = null;
    
    // Kullanıcı listesinde ara
    authenticatedUser = AdminState.usersData.find(user => user.passwordHash === hashedPassword);
    
    // Bulunamazsa varsayılan admin şifresini kontrol et
    if (!authenticatedUser && hashedPassword === AdminState.ADMIN_PASSWORD_HASH) {
      authenticatedUser = AdminState.usersData.find(user => user.username === 'admin');
      if (!authenticatedUser) {
        authenticatedUser = {
          id: Date.now().toString(),
          username: 'admin',
          email: 'admin@example.com',
          passwordHash: AdminState.ADMIN_PASSWORD_HASH,
          role: 'admin',
          createdAt: new Date().toISOString(),
          lastLogin: null
        };
        AdminState.usersData.push(authenticatedUser);
        if (typeof saveUsers === 'function') {
          saveUsers();
        }
      }
    }
    
    if (authenticatedUser) {
      const sessionToken = btoa(Date.now().toString() + Math.random().toString() + Math.random().toString());
      sessionStorage.setItem('adminSession', sessionToken);
      sessionStorage.setItem('adminLoginTime', Date.now().toString());
      sessionStorage.setItem('adminLastActivity', Date.now().toString());
      sessionStorage.setItem('adminUsername', authenticatedUser.username);
      sessionStorage.setItem('adminRole', authenticatedUser.role || 'admin');
      
      // Topbar'daki kullanıcı bilgilerini güncelle
      const adminUserNameEl = document.getElementById('adminUserName');
      const adminUserAvatarEl = document.getElementById('adminUserAvatar');
      if (adminUserNameEl) {
        adminUserNameEl.textContent = authenticatedUser.username || 'Admin';
      }
      if (adminUserAvatarEl) {
        adminUserAvatarEl.textContent = (authenticatedUser.username || 'A').charAt(0).toUpperCase();
      }
      
      // Logout butonunu göster
      const logoutBtn = document.getElementById('logoutBtn');
      const topbarMenuLogoutBtn = document.getElementById('topbarMenuLogoutBtn');
      if (logoutBtn) logoutBtn.classList.remove('hidden');
      if (topbarMenuLogoutBtn) topbarMenuLogoutBtn.classList.remove('hidden');
      sessionStorage.setItem('adminRole', authenticatedUser.role);
      
      authenticatedUser.lastLogin = new Date().toISOString();
      if (typeof saveUsers === 'function') {
        saveUsers();
      }
      
      loginBtn.querySelector('span').textContent = '✅ Başarılı!';
      loginBtn.style.background = 'linear-gradient(135deg, #00c853 0%, #00a043 100%)';
      
      setTimeout(() => {
        toggleAdminLoginForm();
        passwordInput.value = '';
        loginBtn.querySelector('span').textContent = originalText;
        loginBtn.style.background = '';
        loginBtn.disabled = false;
        
        const loginSection = document.getElementById('adminLoginSection');
        if (loginSection) {
          loginSection.classList.add('hidden');
        }
        
        // Verileri yükle (AdminData modülünden)
        if (typeof autoLogin === 'function') {
          autoLogin().then(() => {
            // Son bulunulan section'ı yükle
            const lastSection = localStorage.getItem('lastAdminSection') || 'dashboard';
            if (typeof showSection === 'function') {
              // Hash'i güncelle
              window.location.hash = lastSection;
              // Section'ı göster
              setTimeout(() => {
                showSection(lastSection);
              }, 100);
            }
          });
        } else {
          // autoLogin yoksa direkt section'ı göster
          const lastSection = localStorage.getItem('lastAdminSection') || 'dashboard';
          if (typeof showSection === 'function') {
            window.location.hash = lastSection;
            setTimeout(() => {
              showSection(lastSection);
            }, 100);
          }
        }
      }, 800);
    } else {
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

/**
 * Çıkış yap
 */
function logout() {
  if (confirm('Çıkış yapmak istediğinize emin misiniz?')) {
    // Mevcut section'ı kaydet (login sonrası geri dönmek için)
    const currentHash = window.location.hash.replace('#', '');
    const currentSection = currentHash || 'dashboard';
    localStorage.setItem('lastAdminSection', currentSection);
    
    // Tüm session verilerini temizle
    sessionStorage.removeItem('adminSession');
    sessionStorage.removeItem('adminLoginTime');
    sessionStorage.removeItem('adminLastActivity');
    sessionStorage.removeItem('adminUsername');
    sessionStorage.removeItem('adminRole');
    sessionStorage.removeItem('sessionTimeoutMessage');
    
    // Hash'i temizle ve admin-login sayfasına yönlendir
    // replace kullanarak history'den admin panel sayfasını kaldır
    window.location.replace('/admin-login.html');
  }
}

/**
 * Şifre göster/gizle (genel fonksiyon)
 */
function togglePasswordVisibility(inputId, iconId) {
  const passwordInput = document.getElementById(inputId);
  const eyeIcon = document.getElementById(iconId);
  
  if (!passwordInput || !eyeIcon) return;
  
  if (passwordInput.type === 'password') {
    passwordInput.type = 'text';
    eyeIcon.innerHTML = AdminState.PASSWORD_ICONS.visible;
  } else {
    passwordInput.type = 'password';
    eyeIcon.innerHTML = AdminState.PASSWORD_ICONS.hidden;
  }
}

/**
 * Şifre göster/gizle (admin login)
 */
function toggleAdminPassword() {
  togglePasswordVisibility('adminPassword', 'adminEyeIcon');
}

// Global scope'a ekle (browser için)
if (typeof window !== 'undefined') {
  window.logout = logout;
  window.redirectToLogin = redirectToLogin;
}

// Export functions
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    hashPassword,
    checkAdminSession,
    checkAdminSessionThrottled,
    updateLastActivity,
    redirectToLogin,
    toggleAdminLoginForm,
    handleAdminLogin,
    logout,
    togglePasswordVisibility,
    toggleAdminPassword
  };
}

