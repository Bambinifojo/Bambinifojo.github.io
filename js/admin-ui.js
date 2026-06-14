// Admin Panel UI Management Module
// Section yönetimi, sidebar, modals, alerts

/**
 * Section göster/gizle
 */
function showSection(section) {
  console.log('🔵 showSection çağrıldı:', section);
  
  // Tüm section'ları gizle
  document.querySelectorAll('.admin-section').forEach(sec => {
    sec.classList.add('hidden');
  });
  
  // Tüm nav item'ları pasif yap
  document.querySelectorAll('.admin-nav-item').forEach(item => {
    item.classList.remove('active');
  });
  
  // Section ID'sini oluştur (kebab-case'den camelCase'e çevir)
  let sectionId = section + 'Section';
  // Özel durumlar: kebab-case'den camelCase'e çevir
  if (section === 'ai-settings') {
    sectionId = 'aiSettingsSection';
    console.log('🟢 AI Settings için sectionId:', sectionId);
  }
  if (section === 'settings') {
    sectionId = 'siteSection';
    console.log('🟢 Settings için siteSection kullanılıyor');
  }
  if (section === 'github-settings') {
    sectionId = 'githubSettingsSection';
    console.log('🟢 GitHub Settings için sectionId:', sectionId);
  }
  
  // Seçilen section'ı göster
  const targetSection = document.getElementById(sectionId);
  if (targetSection) {
    try {
      targetSection.classList.remove('hidden');
      // display: none !important override için style ekle
      targetSection.style.display = 'block';
      console.log('✅ Section gösterildi:', section, 'ID:', sectionId);
    } catch (error) {
      console.error('❌ Section gösterilirken hata:', error);
      // Hata durumunda bile göster
      targetSection.style.display = 'block';
      targetSection.classList.remove('hidden');
    }
  } else {
    console.error('❌ Section bulunamadı:', sectionId);
    console.log('🔍 Mevcut section ID\'leri:', Array.from(document.querySelectorAll('.admin-section')).map(s => s.id));
  }
  
  // Seçilen nav item'ı aktif yap - data-section attribute'una göre
  let navItem = document.querySelector(`.admin-nav-item[data-section="${section}"]`);
  if (!navItem) {
    navItem = document.querySelector(`.admin-nav-item[href="#${section}"]`);
  }
  if (navItem) {
    navItem.classList.add('active');
    console.log('Nav item aktif yapıldı:', section);
  } else {
    console.warn('Nav item bulunamadı:', section);
  }
  
  // Section'a özel işlemler
  if (section === 'dashboard' && typeof refreshAdminDashboard === 'function') {
    setTimeout(() => refreshAdminDashboard(), 100);
  }

  if (section === 'users' && typeof renderUsers === 'function') {
    renderUsers();
  }
  
  if (section === 'feedback') {
    setTimeout(() => {
      if (typeof initAdminMessagesManager === 'function') initAdminMessagesManager();
      if (typeof renderVotes === 'function') renderVotes();
    }, 100);
  }
  
  if (section === 'notifications') {
    // Section gösterildikten sonra config yükle (DOM hazır olsun)
    setTimeout(() => {
      if (typeof loadNotificationsConfig === 'function') {
        loadNotificationsConfig();
      }
    }, 100);
  }
  
  if (section === 'ai-settings') {
    setTimeout(() => {
      if (typeof initAdminAiSettings === 'function') {
        initAdminAiSettings();
      } else if (typeof loadAISettings === 'function') {
        loadAISettings();
      }
    }, 100);
  }
  
  if (section === 'slider') {
    setTimeout(() => {
      if (typeof initAdminSliderManager === 'function') initAdminSliderManager();
      else if (typeof onSliderSectionShow === 'function') onSliderSectionShow();
    }, 100);
  }

  if (section === 'apps') {
    setTimeout(() => {
      if (typeof initAdminAppsManager === 'function') initAdminAppsManager();
      else if (typeof renderApps === 'function') renderApps();
    }, 100);
  }

  if (section === 'site' || section === 'settings') {
    setTimeout(() => {
      if (typeof initAdminSiteSettings === 'function') {
        initAdminSiteSettings();
      }
      if (typeof loadSiteSectionData === 'function') {
        loadSiteSectionData('header');
      } else if (typeof loadSiteData === 'function') {
        loadSiteData();
      }
    }, 100);
  }
  
  if (section === 'github-settings') {
    // GitHub Settings section'ı açıldığında ayarları yükle
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
          githubSection.style.display = 'block';
        }
      }
    }, 100);
  }
  
  if (section === 'dashboard') {
    // Veri yüklendikten sonra istatistikleri güncelle
    setTimeout(() => {
      if (typeof updateStats === 'function') {
        updateStats();
      }
      if (typeof renderApps === 'function') {
        renderApps();
      }
      if (typeof refreshPreview === 'function') {
        refreshPreview(false);
      }
    }, 100);
  }
  
  // 📌 Menüden seçince otomatik sidebar'ı kapat (mobilde)
  if (window.innerWidth < 1200) {
    if (typeof toggleSidebar === 'function') {
      toggleSidebar(false);
    } else if (typeof closeSidebar === 'function') {
      closeSidebar();
    }
  }
  
  // Hash-based routing (SPA için daha uygun)
  const currentHash = window.location.hash.replace('#', '');
  const newHash = section;
  
  // Hash değişikliği sadece gerekirse yap
  if (currentHash !== newHash) {
    // Hash'i değiştir - bu otomatik olarak hashchange event'ini tetikler
    window.location.hash = newHash;
  }
  
  // Mevcut section'ı localStorage'a kaydet (logout sonrası geri dönmek için)
  localStorage.setItem('lastAdminSection', section);
}

/**
 * Hash'den section'ı oku
 */
function getSectionFromPath() {
  const hash = window.location.hash.replace('#', '');
  if (hash) {
    return hash;
  }
  // Varsayılan olarak dashboard
  return 'dashboard';
}

/**
 * Sidebar state kontrolü
 */
function isSidebarOpen() {
  const sidebar = document.getElementById('adminSidebar');
  return sidebar && sidebar.classList.contains('open');
}

/**
 * Sidebar toggle
 * @param {boolean|null} forceState - null: toggle, true: aç, false: kapat
 */
function toggleSidebar(forceState = null) {
  // Basit versiyon - admin.js'deki versiyon kullanılacak
  const sidebar = document.getElementById('adminSidebar');
  const overlay = document.getElementById('adminSidebarOverlay');
  
  if (!sidebar || !overlay) {
    // Fallback: Eski yöntem
    const oldOverlay = document.querySelector('.admin-sidebar-overlay');
    if (oldOverlay) {
      sidebar.classList.toggle('active');
      oldOverlay.classList.toggle('active');
    }
    return;
  }
  
  // Basit toggle - active class kullan
  sidebar.classList.toggle('active');
  overlay.classList.toggle('active');
}

/**
 * Sidebar'ı aç
 */
function openSidebar() {
  const sidebar = document.getElementById('adminSidebar');
  const overlay = document.querySelector('.admin-sidebar-overlay');
  const menuToggle = document.querySelector('.admin-menu-toggle');
  
  if (sidebar && overlay) {
    if (!sidebar.classList.contains('open')) {
      sidebar.classList.add('open');
      overlay.classList.add('active');
      document.body.style.overflow = 'hidden';
      document.body.classList.add('sidebar-open');
      
      if (menuToggle) {
        menuToggle.classList.add('active');
      }
    }
  }
}

/**
 * Sidebar'ı kapat
 */
function closeSidebar() {
  // toggleSidebar(false) kullanarak kapat (daha tutarlı)
  const toggleFn = window.toggleSidebar || (typeof toggleSidebar !== 'undefined' ? toggleSidebar : null);
  
  if (typeof toggleFn === 'function') {
    toggleFn(false);
  } else {
    // Fallback: manuel kapatma
    const sidebar = document.getElementById('adminSidebar');
    const overlay = document.querySelector('.admin-sidebar-overlay');
    const menuToggle = document.querySelector('.admin-menu-toggle') || document.getElementById('hamburgerMenuBtn');
    
    if (sidebar) {
      sidebar.classList.remove('open');
      sidebar.style.transform = 'translateX(-100%)';
      
      if (overlay) {
        overlay.classList.remove('active');
      }
      
      document.body.style.overflow = '';
      document.body.classList.remove('sidebar-open');
      
      if (menuToggle) {
        menuToggle.classList.remove('active');
      }
    }
  }
}

/**
 * Topbar Menu Toggle
 */
function toggleTopbarMenu() {
  const modal = document.getElementById('topbarMenuModal');
  const overlay = document.getElementById('topbarMenuOverlay');
  const menuBtn = document.getElementById('topbarMenuBtn');
  
  if (modal && overlay) {
    const isOpen = modal.classList.toggle('active');
    overlay.classList.toggle('active');
    
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      document.body.classList.add('topbar-menu-open');
    } else {
      document.body.style.overflow = '';
      document.body.classList.remove('topbar-menu-open');
    }
    
    if (menuBtn) {
      menuBtn.classList.toggle('active');
    }
  }
}

/**
 * Topbar Menu'yu kapat
 */
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

/**
 * Modal göster
 */
function showModal(modalId) {
  const modal = document.getElementById(modalId);
  if (!modal) return;
  
  // Sidebar'ı kapat (modal açıldığında)
  if (typeof closeSidebar === 'function') {
    closeSidebar();
  }
  
  // Sidebar overlay'i gizle
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

/**
 * Modal kapat
 */
function closeModal(modalId, formId = null) {
  const modal = document.getElementById(modalId);
  if (!modal) return;
  
  const modalContent = modal.querySelector('.modal-content');
  if (modalContent) {
    modalContent.style.animation = `modalSlideOut ${AdminState.CONSTANTS.MODAL_ANIMATION_DURATION}ms cubic-bezier(0.4, 0, 0.2, 1) forwards`;
    modal.style.animation = `fadeOutOverlay ${AdminState.CONSTANTS.MODAL_ANIMATION_DURATION}ms cubic-bezier(0.4, 0, 0.2, 1) forwards`;
  }
  
  setTimeout(() => {
    modal.classList.remove('active');
    document.body.classList.remove('modal-open');
    
    // Sidebar overlay'i geri getir
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
  }, AdminState.CONSTANTS.MODAL_ANIMATION_DURATION);
}

/**
 * App Modal göster
 */
function showAppModal() {
  showModal('appFormModal');
}

/**
 * App Modal kapat
 */
function closeAppModal() {
  closeModal('appFormModal');
}

/**
 * Site Modal göster
 */
function showSiteModal() {
  // Section içindeki buton kartını gizle
  const siteSection = document.getElementById('siteSection');
  if (siteSection) {
    const adminCard = siteSection.querySelector('.admin-card');
    if (adminCard) {
      adminCard.style.display = 'none';
    }
  }
  
  showModal('siteSettingsModal');
  if (typeof loadSiteData === 'function') {
    loadSiteData();
  }
  if (typeof showSiteSection === 'function') {
    showSiteSection('header');
  }
}

/**
 * Site Modal kapat
 */
function closeSiteModal() {
  // Form içeriğini sıfırlama (state korunmalı)
  // closeModal('siteSettingsModal', null); // formId null, form reset edilmesin
  closeModal('siteSettingsModal');
  
  // Modal kapandığında section içeriğini tekrar göster
  const siteSection = document.getElementById('siteSection');
  if (siteSection) {
    const adminCard = siteSection.querySelector('.admin-card');
    if (adminCard) {
      adminCard.style.display = '';
    }
  }
  
  // NOT: Form içeriği sıfırlanmıyor, böylece kullanıcı modal'ı tekrar açtığında
  // girdiği veriler korunuyor. Sadece görünürlük kontrol ediliyor.
}

/**
 * Tüm modalları kapat
 */
function closeAllModals() {
  closeAppModal();
  closeSiteModal();
  if (typeof closeUserModal === 'function') {
    closeUserModal();
  }
  if (typeof closeChangePasswordModal === 'function') {
    closeChangePasswordModal();
  }
  // Tüm modal overlay'leri kapat
  document.querySelectorAll('.modal-overlay.active').forEach(modal => {
    modal.classList.remove('active');
  });
  // Topbar menu'yu kapat
  if (typeof closeTopbarMenu === 'function') {
    closeTopbarMenu();
  }
}

/**
 * Form iptal
 */
function cancelForm() {
  closeAppModal();
}

/**
 * Alert göster
 */
function showAlert(message, type = 'success') {
  const container = document.getElementById('alertContainer');
  if (!container) return;
  
  const alert = document.createElement('div');
  alert.className = `alert alert-${type}`;
  
  const span = document.createElement('span');
  span.textContent = message;
  alert.appendChild(span);
  
  container.appendChild(alert);
  
  setTimeout(() => {
    alert.style.opacity = '0';
    alert.style.transform = 'translateX(100px)';
    setTimeout(() => alert.remove(), AdminState.CONSTANTS.MODAL_ANIMATION_DURATION);
  }, AdminState.CONSTANTS.ALERT_DISPLAY_DURATION);
}

/**
 * Preview yenile
 */
function refreshPreview(showNotification = true) {
  // Ana sayfa önizleme frame'i
  const homePreviewFrame = document.getElementById('homePreviewFrame');
  if (homePreviewFrame) {
    homePreviewFrame.src = homePreviewFrame.src;
  }
  
  // Genel preview frame (eğer varsa)
  const previewFrame = document.getElementById('previewFrame');
  if (previewFrame) {
    previewFrame.src = previewFrame.src;
  }
  
  if (showNotification && (homePreviewFrame || previewFrame)) {
    if (typeof showAlert === 'function') {
      showAlert('✅ Önizleme yenilendi', 'success');
    }
  }
}

/**
 * Otomatik preview yenileme
 */
function autoRefreshPreview() {
  setTimeout(() => {
    refreshPreview(false);
  }, 2000);
}

// Event listeners
document.addEventListener('DOMContentLoaded', () => {
  // ESC tuşu ile sidebar'ı kapat
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape' && isSidebarOpen()) {
      closeSidebar();
    }
  });
  
  // Overlay click to close modals
  document.addEventListener('click', (e) => {
    if (typeof checkAdminSessionThrottled === 'function') {
      if (!checkAdminSessionThrottled()) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
    }
    if (typeof updateLastActivity === 'function') {
      updateLastActivity();
    }
    
    // Modal overlay'e tıklandığında modal'ı kapat (sayfa refresh olmasın)
    // Ancak dropdown açıkken veya form elemanlarına tıklanırsa kapatma
    if (e.target.classList.contains('modal-overlay')) {
      // Dropdown açık mı kontrol et
      const activeSelect = document.querySelector('select:focus');
      if (activeSelect) {
        // Dropdown açıksa, blur event'ini tetikle ama modal'ı kapatma
        activeSelect.blur();
        return false;
      }
      
      e.preventDefault();
      e.stopPropagation();
      closeAllModals();
      return false;
    }
    
    // Modal içinde ama overlay değilse, dropdown'ları kontrol et
    const modal = e.target.closest('.modal-content');
    if (modal) {
      const clickedSelect = e.target.closest('select');
      if (!clickedSelect) {
        // Select dışına tıklandıysa, açık dropdown'ları kapat
        const openSelect = modal.querySelector('select:focus');
        if (openSelect) {
          openSelect.blur();
        }
      }
    }
  });
  
  // ESC key to close modals
  document.addEventListener('keydown', (e) => {
    if (typeof checkAdminSessionThrottled === 'function') {
      if (!checkAdminSessionThrottled()) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
    }
    if (typeof updateLastActivity === 'function') {
      updateLastActivity();
    }
    
    if (e.key === 'Escape') {
      closeAllModals();
    }
  });
  
  // Browser back/forward button handling
  window.addEventListener('popstate', (e) => {
    const section = e.state?.section || getSectionFromPath();
    showSection(section);
  });
  
  // Hash change handling (hash-based routing için)
  window.addEventListener('hashchange', () => {
    const section = getSectionFromPath();
    if (section) {
      // Section ID'sini oluştur (kebab-case'den camelCase'e çevir)
      let sectionId = section + 'Section';
      if (section === 'ai-settings') {
        sectionId = 'aiSettingsSection';
      }
      
      // showSection'ı çağırmadan sadece section'ı göster (sonsuz döngüyü önle)
      const sectionEl = document.getElementById(sectionId);
      const allSections = document.querySelectorAll('.admin-section');
      allSections.forEach(sec => sec.classList.add('hidden'));
      if (sectionEl) {
        sectionEl.classList.remove('hidden');
        
        // Section'a özel işlemler
        if (section === 'ai-settings') {
          setTimeout(() => {
            if (typeof loadAISettings === 'function') {
              loadAISettings();
            }
          }, 100);
        }
      }
      // Active nav item'ı güncelle
      const navItems = document.querySelectorAll('.admin-nav-item');
      navItems.forEach(item => item.classList.remove('active'));
      const activeNav = document.querySelector(`a[href="#${section}"]`);
      if (activeNav) {
        activeNav.classList.add('active');
      }
    }
  });
});

// Global scope'a ekle (browser için)
if (typeof window !== 'undefined') {
  window.refreshPreview = refreshPreview;
  window.autoRefreshPreview = autoRefreshPreview;
}

// Export functions
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    showSection,
    getSectionFromPath,
    isSidebarOpen,
    toggleSidebar,
    openSidebar,
    closeSidebar,
    toggleTopbarMenu,
    closeTopbarMenu,
    showModal,
    closeModal,
    showAppModal,
    closeAppModal,
    showSiteModal,
    closeSiteModal,
    closeAllModals,
    cancelForm,
    showAlert,
    refreshPreview,
    autoRefreshPreview
  };
}

// Global scope'a ekle (HTML onclick için)
if (typeof window !== 'undefined') {
  window.toggleSidebar = toggleSidebar;
  window.openSidebar = openSidebar;
  window.closeSidebar = closeSidebar;
  window.showSection = showSection;
  
  console.log('✅ Admin UI fonksiyonları global scope\'a eklendi:', {
    showSection: typeof showSection,
    toggleSidebar: typeof toggleSidebar,
    openSidebar: typeof openSidebar,
    closeSidebar: typeof closeSidebar
  });
  window.getSectionFromPath = getSectionFromPath;
}

