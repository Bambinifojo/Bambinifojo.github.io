// Sidebar state kontrolü
function isMenuOpen() {
  const sidebar = document.getElementById('sidebar');
  return sidebar && sidebar.classList.contains('active');
}

// Hamburger Menu Toggle
function toggleMenu() {
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('overlay');
  const hamburger = document.getElementById('hamburger');
  
  if (!sidebar || !overlay || !hamburger) {
    return;
  }
  
  const isOpen = sidebar.classList.contains('active');
  
  if (isOpen) {
    // Kapat
    sidebar.classList.remove('active');
    overlay.classList.remove('active');
    hamburger.classList.remove('active');
    
    // Scroll pozisyonunu geri yükle
    const scrollY = document.body.style.top;
    document.body.style.top = '';
    document.body.style.overflow = '';
    document.body.style.position = '';
    document.body.style.width = '';
    document.body.classList.remove('menu-open');
    if (scrollY) {
      window.scrollTo(0, parseInt(scrollY || '0') * -1);
    }
  } else {
    // Aç
    sidebar.classList.add('active');
    overlay.classList.add('active');
    hamburger.classList.add('active');
    
    // Scroll pozisyonunu kaydet
    const scrollY = window.scrollY;
    document.body.style.top = `-${scrollY}px`;
    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.width = '100%';
    document.body.classList.add('menu-open');
  }
}

// Menüyü aç
function openMenu() {
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('overlay');
  const hamburger = document.getElementById('hamburger');
  
  if (sidebar && overlay && hamburger) {
    if (!sidebar.classList.contains('active')) {
      sidebar.classList.add('active');
      overlay.classList.add('active');
      hamburger.classList.add('active');
      
      // Scroll pozisyonunu kaydet
      const scrollY = window.scrollY;
      document.body.style.top = `-${scrollY}px`;
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.width = '100%';
      document.body.classList.add('menu-open');
    }
  }
}

// Menüyü kapatma fonksiyonu (dışarıdan çağrılabilir)
function closeMenu() {
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('overlay');
  const hamburger = document.getElementById('hamburger');
  
  if (sidebar && overlay && hamburger) {
    if (sidebar.classList.contains('active')) {
      sidebar.classList.remove('active');
      overlay.classList.remove('active');
      hamburger.classList.remove('active');
      
      // Scroll pozisyonunu geri yükle
      const scrollY = document.body.style.top;
      document.body.style.top = '';
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.width = '';
      document.body.classList.remove('menu-open');
      if (scrollY) {
        window.scrollTo(0, parseInt(scrollY || '0') * -1);
      }
    }
  }
}

// Hamburger menü event listener'larını ekle
function setupHamburgerMenu() {
  console.log('🔧 Hamburger menü kurulumu başlatılıyor...');
  
  // Hamburger butonuna event listener ekle
  const hamburger = document.getElementById('hamburger');
  if (!hamburger) {
    console.error('❌ Hamburger butonu bulunamadı!');
    return;
  }
  
  console.log('✅ Hamburger butonu bulundu');
  
  // Eğer zaten event listener eklenmemişse ekle
  if (!hamburger.hasAttribute('data-listener-added')) {
    hamburger.setAttribute('data-listener-added', 'true');
    
    // Click event
    hamburger.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      console.log('🍔 Hamburger butonuna tıklandı');
      toggleMenu();
    });
    
    // Touch event (mobil cihazlar için)
    hamburger.addEventListener('touchstart', (e) => {
      e.preventDefault();
      e.stopPropagation();
    });
    
    hamburger.addEventListener('touchend', (e) => {
      e.preventDefault();
      e.stopPropagation();
      console.log('🍔 Hamburger butonuna dokunuldu (touch)');
      toggleMenu();
    });
    
    console.log('✅ Hamburger buton event listener\'ları eklendi');
  } else {
    console.log('⚠️ Hamburger buton event listener\'ları zaten eklenmiş');
  }
  
  // Overlay'e tıklandığında menüyü kapat
  const overlay = document.getElementById('overlay');
  if (overlay) {
    // Önce mevcut listener'ı kaldır (çift eklenmeyi önle)
    const newOverlay = overlay.cloneNode(true);
    overlay.parentNode.replaceChild(newOverlay, overlay);
    
    // Yeni overlay'i al
    const newOverlayEl = document.getElementById('overlay');
    if (newOverlayEl) {
      newOverlayEl.addEventListener('click', (e) => {
        // Hamburger butonuna tıklanırsa menüyü kapatma
        const hamburger = document.getElementById('hamburger');
        if (hamburger && hamburger.contains(e.target)) {
          return;
        }
        console.log('🌑 Overlay\'e tıklandı, menü kapatılıyor');
        closeMenu();
      });
      console.log('✅ Overlay event listener eklendi');
    }
  } else {
    console.warn('⚠️ Overlay bulunamadı');
  }
  
  // Close butonuna event listener ekle
  const closeBtn = document.getElementById('closeMenuBtn');
  if (closeBtn) {
    // Önce mevcut listener'ı kaldır (çift eklenmeyi önle)
    if (!closeBtn.hasAttribute('data-listener-added')) {
      closeBtn.setAttribute('data-listener-added', 'true');
      closeBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        console.log('❌ Close butonuna tıklandı');
        toggleMenu();
      });
      console.log('✅ Close buton event listener eklendi');
    }
  } else {
    console.warn('⚠️ Close butonu bulunamadı');
  }
  
  console.log('✅ Hamburger menü kurulumu tamamlandı');
}

// Site verilerini yükle
function applyStoredSiteSettings() {
  if (typeof SiteSettingsStore === 'undefined') return;
  const saved = SiteSettingsStore.load();
  if (saved) SiteSettingsStore.applyToDocument(saved);
}

async function loadSiteData() {
  try {
    let siteData = null;
    
    // Önce Firebase'den yüklemeyi dene
    if (typeof firebaseDatabase !== 'undefined' && firebaseDatabase) {
      try {
        console.log('🔥 Firebase\'den site verisi yükleniyor...');
        const snapshot = await firebaseDatabase.ref('site').once('value');
        const siteDataFromFirebase = snapshot.val();
        if (siteDataFromFirebase) {
          siteData = siteDataFromFirebase;
          console.log('✅ Firebase\'den site verisi yüklendi');
        }
      } catch (firebaseError) {
        console.warn('Firebase\'den site verisi yüklenirken hata:', firebaseError);
      }
    }
    
    // Firebase'den yüklenemediyse site.json'dan yükle
    if (!siteData) {
      try {
        // Path'i mevcut dizine göre ayarla (root veya task-cosmos/)
        const sitePath = window.location.pathname.includes('/task-cosmos/') 
          ? '../data/site.json' 
          : 'data/site.json';
        const siteRes = await fetch(sitePath);
        if (siteRes.ok) {
          const siteJson = await siteRes.json();
          siteData = siteJson.site;
        }
      } catch (error) {
        console.warn('Site verisi yüklenirken hata:', error);
      }
    }
    
    // Eğer site.json'dan yüklenemediyse, apps.json'dan kontrol et (geriye dönük uyumluluk)
    if (!siteData) {
      try {
        // Önce Firebase'den apps verisini kontrol et
        if (typeof firebaseDatabase !== 'undefined' && firebaseDatabase) {
          try {
            const snapshot = await firebaseDatabase.ref('apps').once('value');
            const appsData = snapshot.val();
            if (appsData && appsData.site) {
              siteData = appsData.site;
            }
          } catch (firebaseError) {
            // Firebase'den yüklenemedi, JSON dosyasından dene
          }
        }
        
        // Firebase'den yüklenemediyse JSON dosyasından yükle
        if (!siteData) {
          // Path'i mevcut dizine göre ayarla (root veya task-cosmos/)
          const appsPath = window.location.pathname.includes('/task-cosmos/') 
            ? '../data/apps.json' 
            : 'data/apps.json';
          const res = await fetch(appsPath);
          if (res.ok) {
            const data = await res.json();
            if (data.site) {
              siteData = data.site;
            }
          }
        }
      } catch (error) {
        console.warn('Apps.json\'dan site verisi yüklenirken hata:', error);
      }
    }
    
    if (!siteData) {
      console.warn('Site verisi bulunamadı, varsayılan değerler kullanılıyor');
      applyStoredSiteSettings();
      return;
    }
    
    const data = { site: siteData };
    
    // Header
    if (data.site.header) {
      const brandName = document.querySelector('.brand-name');
      const tagline = document.querySelector('.header-tagline, .brand-subtitle');
      if (brandName && data.site.header.logo) {
        brandName.textContent = data.site.header.logo;
      }
      if (tagline && data.site.header.tagline) {
        tagline.textContent = data.site.header.tagline;
      }
    }
    
    // Hero Section
    if (data.site.hero) {
      const heroTitle = document.querySelector('.hero-title, .hero-brand');
      const heroTagline = document.querySelector('.hero-subtitle, .hero-tagline');
      const playStoreBtn = document.querySelector('.hero-cta .btn-playstore');
      
      if (heroTitle && data.site.hero.title) {
        heroTitle.textContent = data.site.hero.title;
      }
      
      if (heroTagline && data.site.hero.tagline) {
        heroTagline.textContent = data.site.hero.tagline;
      }
      
      if (playStoreBtn && data.site.hero.playStoreUrl) {
        playStoreBtn.href = data.site.hero.playStoreUrl;
      }
      
      if (data.site.hero.stats && data.site.hero.stats.length > 0) {
        const statsContainer = document.querySelector('.stats-grid, .hero-stats');
        if (statsContainer) {
          statsContainer.innerHTML = data.site.hero.stats.map((stat, index) => `
            <div class="stat-item" data-aos="fade-up" data-aos-delay="${(index + 3) * 100}ms">
              <div class="stat-number">${stat.number}</div>
              <div class="stat-label">${stat.label}</div>
            </div>
          `).join('');
        }
      }
    }
    
    // About Section
    if (data.site.about) {
      const aboutTitle = document.querySelector('#about .section-title');
      const aboutMain = document.querySelector('.about-main');
      const aboutTech = document.querySelector('.about-tech');
      
      if (aboutTitle && data.site.about.title) {
        aboutTitle.textContent = data.site.about.title;
      }
      
      if (aboutMain && data.site.about.texts) {
        aboutMain.innerHTML = data.site.about.texts.map(text => 
          `<p class="about-text">${text}</p>`
        ).join('');
      }
      
      if (aboutTech && data.site.about.technologies) {
        aboutTech.innerHTML = data.site.about.technologies.map(tech => `
          <div class="tech-item">
            <div class="tech-icon">${tech.icon}</div>
            <span>${tech.name}</span>
          </div>
        `).join('');
      }
    }
    
    // Skills Section
    if (data.site.skills) {
      const skillsTitle = document.querySelector('#skills .section-title');
      const skillsGrid = document.querySelector('.skills-grid');
      
      if (skillsTitle && data.site.skills.title) {
        skillsTitle.textContent = data.site.skills.title;
      }
      
      if (skillsGrid && data.site.skills.items) {
        skillsGrid.innerHTML = data.site.skills.items.map((skill, index) => `
          <div class="service-card skill-item" data-aos="fade-up" data-aos-delay="${index * 50}ms">
            <div class="service-icon skill-icon">${skill.icon}</div>
            <h4>${skill.name}</h4>
            <p class="service-desc skill-desc">${skill.description || ''}</p>
          </div>
        `).join('');
      }
    }
    
    // Contact Section
    if (data.site.contact) {
      const contactTitle = document.querySelector('#contact-section .section-title');
      const contactSubtitle = document.querySelector('#contact-section .contact-subtitle');
      
      if (contactTitle && data.site.contact.title) {
        contactTitle.textContent = data.site.contact.title;
      }
      
      if (contactSubtitle && data.site.contact.subtitle) {
        contactSubtitle.textContent = data.site.contact.subtitle;
      }
    }

    applyStoredSiteSettings();
  } catch (error) {
    console.error('Site verileri yüklenirken hata:', error);
  }
}

function isValidAppLink(url) {
  return url && url.trim() !== '' && url.trim() !== '#';
}

function getAppStatus(app) {
  if (app.status === 'published' || app.status === 'beta' || app.status === 'development' || app.status === 'draft') {
    if (app.status === 'published') return 'live';
    if (app.status === 'development') return 'dev';
    return app.status;
  }
  if (app.status === 'live' || app.status === 'beta' || app.status === 'dev') {
    return app.status;
  }
  if (app.playStoreUrl && app.playStoreUrl.includes('play.google.com')) return 'live';
  if (app.details && app.details.includes('play.google.com')) return 'live';
  if (app.detailUrl || app.detailPage || (app.details && app.details !== '#' && app.details.includes('bambinifojo.github.io'))) {
    return 'beta';
  }
  return 'dev';
}

function getStatusLabel(status) {
  const map = {
    live: 'Yayında',
    published: 'Yayında',
    beta: 'Beta',
    dev: 'Geliştiriliyor',
    development: 'Geliştiriliyor',
    draft: 'Taslak'
  };
  return map[status] || 'Geliştiriliyor';
}

function normalizeAppForRender(app) {
  return {
    title: app.name || app.title,
    description: app.shortDescription || app.description,
    icon: app.imageUrl || app.icon,
    status: app.status,
    tags: app.technologies || app.tags,
    details: app.playStoreUrl || app.details,
    detailPage: app.detailUrl || app.detailPage,
    playStoreUrl: app.playStoreUrl,
    githubUrl: app.githubUrl,
    privacy: app.privacy,
    active: app.active !== false,
    featured: !!app.featured,
    order: app.order
  };
}

function isShowcaseApp(app) {
  const normalized = normalizeAppForRender(app);
  if (app.active === false) return false;
  return isValidAppLink(normalized.details)
    || isValidAppLink(normalized.detailPage)
    || isValidAppLink(normalized.playStoreUrl)
    || isValidAppLink(app.detailUrl)
    || isValidAppLink(app.githubUrl);
}

function getAppTechTags(app) {
  if (app.technologies && app.technologies.length > 0) {
    return app.technologies.slice(0, 3);
  }
  if (app.tags && app.tags.length > 0) {
    return app.tags.slice(0, 3);
  }
  if (app.features && app.features.length > 0) {
    return app.features.slice(0, 3);
  }
  if (app.category) {
    return app.category.split(/[&•,]/).map(t => t.trim()).filter(Boolean).slice(0, 3);
  }
  return ['Android'];
}

function truncateText(text, maxLength) {
  if (!text || text.length <= maxLength) return text;
  return text.slice(0, maxLength).trim() + '…';
}

async function loadApps(){
  try {
    console.log('📱 loadApps() fonksiyonu çağrıldı');
    const container = document.getElementById("apps-container");
    if (!container) {
      return;
    }
    
    console.log('✅ apps-container bulundu');
    
    container.innerHTML = '<div style="text-align: center; padding: 40px;"><div class="loading" style="margin: 0 auto;"></div><p style="margin-top: 20px; color: #666; opacity: 0.8;">Uygulamalar yükleniyor...</p></div>';
    
    let apps = null;

    if (typeof AppsManagerStore !== 'undefined') {
      const stored = AppsManagerStore.getApps();
      if (stored && stored.length) {
        apps = AppsManagerStore.sortForDisplay(stored, { includeInactive: false });
        console.log('✅ bambinifojo_apps yüklendi:', apps.length, 'uygulama');
      }
    }
    
    let data = null;
    
    if (!apps || !apps.length) {
      // Önce Firebase'den yüklemeyi dene
      if (typeof firebaseDatabase !== 'undefined' && firebaseDatabase) {
        try {
          console.log('🔥 Firebase\'den veri yükleniyor...');
          const snapshot = await firebaseDatabase.ref('apps').once('value');
          const appsDataFromFirebase = snapshot.val();
          if (appsDataFromFirebase && appsDataFromFirebase.apps && appsDataFromFirebase.apps.length > 0) {
            data = appsDataFromFirebase;
            console.log('✅ Firebase\'den veri yüklendi:', appsDataFromFirebase.apps.length, 'uygulama');
          }
        } catch (firebaseError) {
          console.warn('❌ Firebase\'den yükleme hatası, JSON dosyasından yüklenecek:', firebaseError);
        }
      }
      
      if (!data || !data.apps || data.apps.length === 0) {
        const appsPath = window.location.pathname.includes('/task-cosmos/') 
          ? '../data/apps.json' 
          : 'data/apps.json';
        console.log('📄 JSON dosyası yükleniyor:', appsPath);
        const res = await fetch(appsPath);
        if (res.ok) {
          data = await res.json();
          console.log('✅ JSON dosyasından veri yüklendi:', data.apps?.length || 0, 'uygulama');
        }
      }

      if (data?.apps?.length) {
        apps = data.apps.filter((app) => app.active !== false);
        apps.sort((a, b) => {
          if (!!a.featured !== !!b.featured) return a.featured ? -1 : 1;
          return (Number(a.order) || 0) - (Number(b.order) || 0);
        });
      }
    }
    
    container.innerHTML = "";
    
    if (!apps || apps.length === 0) {
      container.innerHTML = `
        <div class="apps-empty-state">
          <h3>Yakında yeni uygulamalar</h3>
          <p>Stüdyoda geliştirilen ürünler burada listelenecek. Takipte kalın.</p>
        </div>
      `;
      return;
    }
    
    const showcaseApps = apps.filter(isShowcaseApp);
    console.log('🎨', showcaseApps.length, 'ürün kartı render ediliyor...');

    if (showcaseApps.length === 0) {
      container.innerHTML = `
        <div class="apps-empty-state">
          <h3>Yakında yeni uygulamalar</h3>
          <p>Stüdyoda geliştirilen ürünler burada listelenecek. Takipte kalın.</p>
        </div>
      `;
      return;
    }

    const renderIcon = (icon, title) => {
      const iconValue = icon || '📱';
      if (iconValue.startsWith('http://') || iconValue.startsWith('https://')) {
        return `<img src="${escapeHtml(iconValue)}" alt="${escapeHtml(title)} icon" class="app-icon-image" onerror="this.style.display='none'; this.parentElement.textContent='📱';" />`;
      }
      return iconValue;
    };

    showcaseApps.forEach((app, index) => {
      const normalized = normalizeAppForRender(app);
      const status = getAppStatus(app);
      const statusClass = status === 'live' || status === 'published' ? 'status-live' : status === 'beta' ? 'status-beta' : status === 'draft' ? 'status-draft' : 'status-dev';
      const techTags = getAppTechTags(app);
      const playStoreUrl = app.playStoreUrl || (normalized.details && normalized.details.includes('play.google.com') ? normalized.details : '');
      const detailUrl = app.detailUrl || normalized.detailPage || (isValidAppLink(normalized.details) && !playStoreUrl ? normalized.details : null);
      const githubUrl = app.githubUrl || '';

      const card = document.createElement('article');
      card.className = 'product-card app-card';
      card.setAttribute('data-aos', 'fade-up');
      card.setAttribute('data-aos-delay', `${index * 100}ms`);

      const tagsHTML = techTags.map(tag => `<span class="product-tag">${escapeHtml(tag)}</span>`).join('');
      const actionsHTML = [];

      if (detailUrl) {
        actionsHTML.push(`<a href="${detailUrl}" class="btn-product btn-product-primary" onclick="event.stopPropagation();">Detay</a>`);
      }
      if (playStoreUrl) {
        actionsHTML.push(`<a href="${playStoreUrl}" class="btn-product btn-product-primary" target="_blank" rel="noopener" onclick="event.stopPropagation();">Play Store</a>`);
      }
      if (githubUrl) {
        actionsHTML.push(`<a href="${githubUrl}" class="btn-product" target="_blank" rel="noopener" onclick="event.stopPropagation();">GitHub</a>`);
      }
      if (isValidAppLink(app.privacy)) {
        actionsHTML.push(`<a href="${app.privacy}" class="btn-product" target="_blank" rel="noopener" onclick="event.stopPropagation();">Gizlilik</a>`);
      }

      card.innerHTML = `
        <div class="product-card-header">
          <div class="product-icon app-icon-large">${renderIcon(normalized.icon, normalized.title)}</div>
          <div class="product-meta">
            <h3 class="product-name app-title">${escapeHtml(normalized.title)}</h3>
            <div class="product-badges">
              <span class="status-badge ${statusClass}">${getStatusLabel(status)}</span>
              ${tagsHTML}
            </div>
          </div>
        </div>
        <div class="product-body">
          <p class="product-desc app-description">${escapeHtml(truncateText(normalized.description, 140))}</p>
          <div class="product-actions app-actions">
            ${actionsHTML.join('')}
          </div>
        </div>
      `;

      if (detailUrl) {
        card.style.cursor = 'pointer';
        card.addEventListener('click', (e) => {
          if (e.target.closest('.product-actions') || e.target.closest('a') || e.target.closest('button')) {
            return;
          }
          window.location.href = detailUrl;
        });
      }

      container.appendChild(card);
    });
    
    console.log('✅ Uygulamalar başarıyla render edildi');
  } catch (error) {
    console.error('❌ Uygulamalar yüklenirken hata:', error);
    console.error('❌ Hata detayları:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    const container = document.getElementById("apps-container");
    if (container) {
      container.innerHTML = `
        <div style="text-align: center; padding: 40px;">
          <p style="color: #ef4444; margin-bottom: 10px; font-weight: 600;">⚠️ Uygulamalar yüklenirken bir hata oluştu</p>
          <p style="color: #666; opacity: 0.8; margin-bottom: 20px;">${error.message}</p>
          <button onclick="location.reload()" style="padding: 10px 20px; background: #6366f1; color: white; border: none; border-radius: 8px; cursor: pointer;">
            Sayfayı Yenile
          </button>
        </div>
      `;
    }
  }
}

// Particle Background Effect
function createParticles() {
  const particlesContainer = document.createElement('div');
  particlesContainer.className = 'particles';
  document.body.appendChild(particlesContainer);
  
  const particleCount = 50;
  
  for (let i = 0; i < particleCount; i++) {
    const particle = document.createElement('div');
    particle.className = 'particle';
    
    const size = Math.random() * 4 + 2;
    particle.style.width = size + 'px';
    particle.style.height = size + 'px';
    particle.style.left = Math.random() * 100 + '%';
    particle.style.animationDelay = Math.random() * 15 + 's';
    particle.style.animationDuration = (Math.random() * 10 + 10) + 's';
    
    particlesContainer.appendChild(particle);
  }
}

// Parallax Effect with Float Animation
function initParallax() {
  const heroSection = document.querySelector('.hero-section');
  const heroIcon = document.querySelector('.hero-icon');
  
  // Hero icon yoksa fonksiyonu sonlandır
  if (!heroSection || !heroIcon) {
    return;
  }
  
  let isAnimated = false;
  let parallaxOffset = 0;
  let startTime = Date.now();
  
  // Wait for initial animation to complete
  setTimeout(() => {
    isAnimated = true;
    startTime = Date.now();
  }, 1000);
  
  // Float animation function
  function updateFloat() {
    if (!isAnimated) return;
    
    const scrolled = window.pageYOffset;
    parallaxOffset = scrolled * 0.2;
    
    if (scrolled < window.innerHeight) {
      // Smooth float animation using sine wave
      const elapsed = (Date.now() - startTime) / 1000;
      const floatOffset = Math.sin(elapsed * 2) * 5; // 2 seconds per cycle, 5px amplitude
      
      heroIcon.style.transform = `scale(1) translateY(${parallaxOffset + floatOffset}px)`;
    } else {
      // Reset when scrolled past hero section
      heroIcon.style.transform = `scale(1) translateY(${parallaxOffset}px)`;
    }
    
    requestAnimationFrame(updateFloat);
  }
  
  // Start animation loop
  updateFloat();
  
  // Update parallax on scroll
  window.addEventListener('scroll', () => {
    if (!isAnimated) return;
    parallaxOffset = window.pageYOffset * 0.2;
  });
}

// Enhanced App Card Animations
function enhanceAppCards() {
  const appCards = document.querySelectorAll('.app-card');
  
  appCards.forEach((card, index) => {
    // Stagger animation
    card.style.animationDelay = `${index * 0.1}s`;
    
    // Add click ripple effect
    card.addEventListener('click', function(e) {
      const ripple = document.createElement('span');
      const rect = this.getBoundingClientRect();
      const size = Math.max(rect.width, rect.height);
      const x = e.clientX - rect.left - size / 2;
      const y = e.clientY - rect.top - size / 2;
      
      ripple.style.width = ripple.style.height = size + 'px';
      ripple.style.left = x + 'px';
      ripple.style.top = y + 'px';
      ripple.classList.add('ripple');
      
      this.appendChild(ripple);
      
      setTimeout(() => {
        ripple.remove();
      }, 600);
    });
  });
}

// Loading State
function showLoading() {
  const appsContainer = document.getElementById('apps-container');
  if (appsContainer) {
    appsContainer.innerHTML = '<div style="text-align: center; padding: 40px;"><div class="loading"></div><p style="color: #666; margin-top: 20px; opacity: 0.8;">Uygulamalar yükleniyor...</p></div>';
  }
}

// Logo letter animation on hover
function initLogoAnimation() {
  const logoLetters = document.querySelectorAll('.logo-letter, .brand-letter');
  
  logoLetters.forEach((letter, index) => {
    letter.addEventListener('mouseenter', () => {
      // Tüm harfleri sırayla animasyonla
      logoLetters.forEach((l, i) => {
        setTimeout(() => {
          l.style.transform = 'translateY(-5px) scale(1.1)';
          l.style.color = 'var(--primary-color)';
        }, i * 50);
      });
    });
    
    letter.addEventListener('mouseleave', () => {
      // Tüm harfleri sırayla geri al
      logoLetters.forEach((l, i) => {
        setTimeout(() => {
          l.style.transform = '';
          if (l.classList.contains('logo-accent') || l.classList.contains('brand-accent')) {
            l.style.color = 'var(--primary-color)';
          } else {
            l.style.color = '';
          }
        }, i * 30);
      });
    });
  });
}

// Global scope'a ekle (HTML onclick için) - Fonksiyonlar tanımlandıktan sonra
if (typeof window !== 'undefined') {
  window.toggleMenu = toggleMenu;
  window.openMenu = openMenu;
  window.closeMenu = closeMenu;
}

// Search functionality
let searchData = {
  apps: [],
  site: null
};

// Load search data
async function loadSearchData() {
  try {
    // Load apps
    const appsRes = await fetch('data/apps.json');
    if (appsRes.ok) {
      const appsData = await appsRes.json();
      searchData.apps = appsData.apps || [];
    }
    
    // Load site data
    const siteRes = await fetch('data/site.json');
    if (siteRes.ok) {
      const siteData = await siteRes.json();
      searchData.site = siteData.site || null;
    }
  } catch (error) {
    // Arama verileri yüklenirken hata oluştu - sessizce devam et
    console.warn('Arama verileri yüklenirken hata:', error);
  }
}

// Get autocomplete suggestions
function getAutocompleteSuggestions(query) {
  const suggestions = [];
  const lowerQuery = query.toLowerCase().trim();
  
  if (lowerQuery.length < 1) return suggestions;
  
  // Get unique suggestions from apps
  if (searchData.apps) {
    searchData.apps.forEach(app => {
      // App titles
      if (app.title && app.title.toLowerCase().includes(lowerQuery)) {
        if (!suggestions.find(s => s.text === app.title)) {
          suggestions.push({
            text: app.title,
            type: 'app',
            icon: app.icon || '📱',
            category: 'Uygulama'
          });
        }
      }
      
      // Categories
      if (app.category && app.category.toLowerCase().includes(lowerQuery)) {
        if (!suggestions.find(s => s.text === app.category)) {
          suggestions.push({
            text: app.category,
            type: 'category',
            icon: '📂',
            category: 'Kategori'
          });
        }
      }
      
      // Features
      if (app.features) {
        app.features.forEach(feature => {
          if (feature.toLowerCase().includes(lowerQuery)) {
            if (!suggestions.find(s => s.text === feature)) {
              suggestions.push({
                text: feature,
                type: 'feature',
                icon: '✨',
                category: 'Özellik'
              });
            }
          }
        });
      }
    });
  }
  
  // Get suggestions from skills
  if (searchData.site && searchData.site.skills && searchData.site.skills.items) {
    searchData.site.skills.items.forEach(skill => {
      if (skill.name && skill.name.toLowerCase().includes(lowerQuery)) {
        if (!suggestions.find(s => s.text === skill.name)) {
          suggestions.push({
            text: skill.name,
            type: 'skill',
            icon: skill.icon || '⚡',
            category: 'Yetenek'
          });
        }
      }
    });
  }
  
  // Get suggestions from technologies
  if (searchData.site && searchData.site.about && searchData.site.about.technologies) {
    searchData.site.about.technologies.forEach(tech => {
      if (tech.name && tech.name.toLowerCase().includes(lowerQuery)) {
        if (!suggestions.find(s => s.text === tech.name)) {
          suggestions.push({
            text: tech.name,
            type: 'tech',
            icon: tech.icon || '🛠️',
            category: 'Teknoloji'
          });
        }
      }
    });
  }
  
  return suggestions.slice(0, 8); // Max 8 suggestions
}

// Search in data
function searchInData(query) {
  const results = {
    apps: [],
    skills: [],
    technologies: [],
    contact: []
  };
  
  const lowerQuery = query.toLowerCase().trim();
  if (lowerQuery.length < 2) return results;
  
  // Search in apps
  if (searchData.apps) {
    searchData.apps.forEach(app => {
      const title = (app.title || '').toLowerCase();
      const description = (app.description || '').toLowerCase();
      const category = (app.category || '').toLowerCase();
      const features = (app.features || []).join(' ').toLowerCase();
      
      if (title.includes(lowerQuery) || 
          description.includes(lowerQuery) || 
          category.includes(lowerQuery) ||
          features.includes(lowerQuery)) {
        results.apps.push(app);
      }
    });
  }
  
  // Search in site data
  if (searchData.site) {
    // Search in skills
    if (searchData.site.skills && searchData.site.skills.items) {
      searchData.site.skills.items.forEach(skill => {
        const name = (skill.name || '').toLowerCase();
        if (name.includes(lowerQuery)) {
          results.skills.push(skill);
        }
      });
    }
    
    // Search in technologies
    if (searchData.site.about && searchData.site.about.technologies) {
      searchData.site.about.technologies.forEach(tech => {
        const name = (tech.name || '').toLowerCase();
        if (name.includes(lowerQuery)) {
          results.technologies.push(tech);
        }
      });
    }
    
    // Search in contact
    if (searchData.site.contact && searchData.site.contact.items) {
      searchData.site.contact.items.forEach(contact => {
        const title = (contact.title || '').toLowerCase();
        const value = (contact.value || '').toLowerCase();
        const description = (contact.description || '').toLowerCase();
        
        if (title.includes(lowerQuery) || 
            value.includes(lowerQuery) || 
            description.includes(lowerQuery)) {
          results.contact.push(contact);
        }
      });
    }
  }
  
  return results;
}

// Render search results
function renderSearchResults(results, query) {
  const resultsContainer = document.getElementById('searchResults');
  if (!resultsContainer) return;
  
  const totalResults = results.apps.length + results.skills.length + 
                      results.technologies.length + results.contact.length;
  
  if (query.length < 2) {
    resultsContainer.innerHTML = '';
    resultsContainer.style.display = 'none';
    return;
  }
  
  if (totalResults === 0) {
    resultsContainer.innerHTML = `
      <div class="search-result-empty">
        <p>❌ "${query}" için sonuç bulunamadı</p>
        <p class="search-hint">Farklı bir arama terimi deneyin</p>
      </div>
    `;
    resultsContainer.style.display = 'block';
    return;
  }
  
  let html = '<div class="search-results-content">';
  
  // Apps results
  if (results.apps.length > 0) {
    html += '<div class="search-result-group"><h3>📱 Uygulamalar</h3>';
    results.apps.forEach(app => {
      const icon = app.icon || '📱';
      const rating = app.rating || 0;
      const downloads = app.downloads || '';
      html += `
        <div class="search-result-item" onclick="window.location.href='#apps'">
          <div class="search-result-icon">${icon}</div>
          <div class="search-result-info">
            <h4>${escapeHtml(app.title)}</h4>
            <p>${escapeHtml(app.description || '')}</p>
            <div class="search-result-meta">
              ${app.category ? `<span class="search-tag">${escapeHtml(app.category)}</span>` : ''}
              ${rating > 0 ? `<span class="search-rating">⭐ ${rating}</span>` : ''}
              ${downloads ? `<span class="search-downloads">${escapeHtml(downloads)}</span>` : ''}
            </div>
          </div>
        </div>
      `;
    });
    html += '</div>';
  }
  
  // Skills results
  if (results.skills.length > 0) {
    html += '<div class="search-result-group"><h3>⚡ Yetenekler</h3>';
    results.skills.forEach(skill => {
      html += `
        <div class="search-result-item" onclick="window.location.href='#skills'">
          <div class="search-result-icon">${skill.icon || '⚡'}</div>
          <div class="search-result-info">
            <h4>${escapeHtml(skill.name)}</h4>
            <p>Seviye: ${skill.level || 0}%</p>
          </div>
        </div>
      `;
    });
    html += '</div>';
  }
  
  // Technologies results
  if (results.technologies.length > 0) {
    html += '<div class="search-result-group"><h3>🛠️ Teknolojiler</h3>';
    results.technologies.forEach(tech => {
      html += `
        <div class="search-result-item" onclick="window.location.href='#about'">
          <div class="search-result-icon">${tech.icon || '🛠️'}</div>
          <div class="search-result-info">
            <h4>${escapeHtml(tech.name)}</h4>
          </div>
        </div>
      `;
    });
    html += '</div>';
  }
  
  // Contact results
  if (results.contact.length > 0) {
    html += '<div class="search-result-group"><h3>📧 İletişim</h3>';
    results.contact.forEach(contact => {
      html += `
        <div class="search-result-item" onclick="window.location.href='${contact.link || '#'}'">
          <div class="search-result-icon">${contact.icon || '📧'}</div>
          <div class="search-result-info">
            <h4>${escapeHtml(contact.title)}</h4>
            <p>${escapeHtml(contact.value)}</p>
            ${contact.description ? `<p class="search-result-desc">${escapeHtml(contact.description)}</p>` : ''}
          </div>
        </div>
      `;
    });
    html += '</div>';
  }
  
  html += '</div>';
  resultsContainer.innerHTML = html;
  resultsContainer.style.display = 'block';
}

// Render autocomplete suggestions
function renderAutocompleteSuggestions(suggestions, query) {
  const resultsContainer = document.getElementById('searchResults');
  if (!resultsContainer) return;
  
  if (suggestions.length === 0 || query.length < 1) {
    resultsContainer.innerHTML = '';
    resultsContainer.style.display = 'none';
    return;
  }
  
  let html = '<div class="search-autocomplete">';
  html += '<div class="search-autocomplete-header"><h3>💡 Öneriler</h3></div>';
  html += '<div class="search-autocomplete-list">';
  
  suggestions.forEach((suggestion, index) => {
    const highlightedText = highlightMatch(suggestion.text, query);
    const escapedText = escapeHtml(suggestion.text).replace(/'/g, "\\'");
    html += `
      <div class="search-autocomplete-item" data-index="${index}" data-text="${escapedText}">
        <div class="search-autocomplete-icon">${suggestion.icon}</div>
        <div class="search-autocomplete-text">
          <div class="search-autocomplete-title">${highlightedText}</div>
          <div class="search-autocomplete-category">${suggestion.category}</div>
        </div>
      </div>
    `;
  });
  
  // Add click event listeners after rendering
  setTimeout(() => {
    const items = resultsContainer.querySelectorAll('.search-autocomplete-item');
    items.forEach(item => {
      item.addEventListener('click', () => {
        const text = item.getAttribute('data-text');
        if (text) {
          selectAutocompleteSuggestion(text);
        }
      });
    });
  }, 0);
  
  html += '</div></div>';
  resultsContainer.innerHTML = html;
  resultsContainer.style.display = 'block';
}

// Highlight matching text
function highlightMatch(text, query) {
  if (!query) return escapeHtml(text);
  const regex = new RegExp(`(${escapeRegex(query)})`, 'gi');
  return escapeHtml(text).replace(regex, '<mark>$1</mark>');
}

// Escape regex special characters
function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Select autocomplete suggestion
function selectAutocompleteSuggestion(text) {
  const searchInput = document.getElementById('searchInput');
  if (searchInput) {
    searchInput.value = text;
    // Trigger search
    const results = searchInData(text);
    renderSearchResults(results, text);
    searchInput.focus();
  }
}

// Escape HTML
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function initSearch() {
  const searchToggle = document.getElementById('searchToggle');
  const searchInput = document.getElementById('searchInput');
  const searchClose = document.getElementById('searchClose');
  const searchContainer = document.getElementById('searchContainer');
  
  if (!searchToggle || !searchInput || !searchClose || !searchContainer) return;
  
  // Load search data
  loadSearchData();
  
  // Toggle search
  searchToggle.addEventListener('click', () => {
    searchContainer.classList.toggle('active');
    if (searchContainer.classList.contains('active')) {
      setTimeout(() => searchInput.focus(), 100);
    } else {
      const resultsContainer = document.getElementById('searchResults');
      if (resultsContainer) {
        resultsContainer.style.display = 'none';
      }
    }
  });
  
  // Close search
  searchClose.addEventListener('click', () => {
    searchContainer.classList.remove('active');
    searchInput.value = '';
    searchClose.classList.remove('show');
    const resultsContainer = document.getElementById('searchResults');
    if (resultsContainer) {
      resultsContainer.style.display = 'none';
    }
  });
  
  // Show/hide close button
  searchInput.addEventListener('input', (e) => {
    if (e.target.value.length > 0) {
      searchClose.classList.add('show');
    } else {
      searchClose.classList.remove('show');
    }
  });
  
  // Autocomplete and search functionality with debounce
  let searchTimeout;
  let selectedSuggestionIndex = -1;
  let currentSuggestions = [];
  
  searchInput.addEventListener('input', (e) => {
    const query = e.target.value.trim();
    selectedSuggestionIndex = -1;
    
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      if (query.length >= 2) {
        // Show full search results
        const results = searchInData(query);
        renderSearchResults(results, query);
      } else if (query.length >= 1) {
        // Show autocomplete suggestions
        currentSuggestions = getAutocompleteSuggestions(query);
        renderAutocompleteSuggestions(currentSuggestions, query);
      } else {
        // Clear results
        const resultsContainer = document.getElementById('searchResults');
        if (resultsContainer) {
          resultsContainer.innerHTML = '';
          resultsContainer.style.display = 'none';
        }
      }
    }, 200);
  });
  
  // Keyboard navigation for autocomplete
  searchInput.addEventListener('keydown', (e) => {
    const resultsContainer = document.getElementById('searchResults');
    if (!resultsContainer || resultsContainer.style.display === 'none') {
      if (e.key === 'Enter') {
        const query = e.target.value.trim();
        if (query.length >= 2) {
          const results = searchInData(query);
          renderSearchResults(results, query);
        }
      }
      return;
    }
    
    const autocompleteItems = resultsContainer.querySelectorAll('.search-autocomplete-item');
    
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      selectedSuggestionIndex = Math.min(selectedSuggestionIndex + 1, autocompleteItems.length - 1);
      updateSelectedSuggestion(autocompleteItems);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      selectedSuggestionIndex = Math.max(selectedSuggestionIndex - 1, -1);
      updateSelectedSuggestion(autocompleteItems);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedSuggestionIndex >= 0 && autocompleteItems[selectedSuggestionIndex]) {
        const suggestionElement = autocompleteItems[selectedSuggestionIndex];
        const titleElement = suggestionElement.querySelector('.search-autocomplete-title');
        if (titleElement) {
          // Remove mark tags and get clean text
          const suggestionText = titleElement.textContent.trim();
          selectAutocompleteSuggestion(suggestionText);
        }
      } else {
        const query = e.target.value.trim();
        if (query.length >= 2) {
          const results = searchInData(query);
          renderSearchResults(results, query);
        }
      }
    } else if (e.key === 'Escape') {
      const query = e.target.value.trim();
      if (query.length >= 2) {
        const results = searchInData(query);
        renderSearchResults(results, query);
      }
    }
  });
  
  // Update selected suggestion highlight
  function updateSelectedSuggestion(items) {
    items.forEach((item, index) => {
      if (index === selectedSuggestionIndex) {
        item.classList.add('selected');
        item.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      } else {
        item.classList.remove('selected');
      }
    });
  }
  
  // Keyboard shortcut (Ctrl/Cmd + K)
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault();
      searchContainer.classList.toggle('active');
      if (searchContainer.classList.contains('active')) {
        setTimeout(() => searchInput.focus(), 100);
      } else {
        const resultsContainer = document.getElementById('searchResults');
        if (resultsContainer) {
          resultsContainer.style.display = 'none';
        }
      }
    }
    
    // ESC to close
    if (e.key === 'Escape') {
      if (searchContainer.classList.contains('active')) {
        searchContainer.classList.remove('active');
        searchInput.value = '';
        searchClose.classList.remove('show');
        const resultsContainer = document.getElementById('searchResults');
        if (resultsContainer) {
          resultsContainer.style.display = 'none';
        }
      }
    }
  });
  
  // Close search when clicking outside
  document.addEventListener('click', (e) => {
    if (searchContainer.classList.contains('active')) {
      // Check if click is outside search box and results
      const searchBox = searchContainer.querySelector('.search-box');
      const searchResults = document.getElementById('searchResults');
      if (searchBox && !searchBox.contains(e.target) && 
          !searchToggle.contains(e.target) &&
          (!searchResults || !searchResults.contains(e.target))) {
        searchContainer.classList.remove('active');
        searchInput.value = '';
        searchClose.classList.remove('show');
        if (searchResults) {
          searchResults.style.display = 'none';
        }
      }
    }
  });
  
  // Prevent body scroll when search is open
  const body = document.body;
  const originalOverflow = body.style.overflow;
  
  // Watch for search container active state changes
  const observer = new MutationObserver(() => {
    if (searchContainer.classList.contains('active')) {
      body.style.overflow = 'hidden';
    } else {
      body.style.overflow = originalOverflow || '';
    }
  });
  
  observer.observe(searchContainer, { attributes: true, attributeFilter: ['class'] });
}

// Contact Form Handler
function initContactForm() {
  const contactForm = document.getElementById('contactForm');
  if (!contactForm) return;
  
  contactForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const messageDiv = document.getElementById('contactFormMessage');
    
    try {
      const formData = {
        name: document.getElementById('contactName').value.trim(),
        email: document.getElementById('contactEmail').value.trim(),
        subject: document.getElementById('contactSubject').value.trim(),
        message: document.getElementById('contactMessage').value.trim()
      };
      
      // Validation
      if (!formData.name || !formData.email || !formData.subject || !formData.message) {
        messageDiv.textContent = 'Lütfen tüm alanları doldurun.';
        messageDiv.className = 'contact-form-message error';
        return;
      }
      
      // Email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email)) {
        messageDiv.textContent = 'Lütfen geçerli bir e-posta adresi girin.';
        messageDiv.className = 'contact-form-message error';
        return;
      }
      
      // Create mailto link
      const mailtoLink = `mailto:bambinifojo@gmail.com?subject=${encodeURIComponent(formData.subject)}&body=${encodeURIComponent(`Ad: ${formData.name}\nE-posta: ${formData.email}\n\nMesaj:\n${formData.message}`)}`;
      
      // Open email client
      window.location.href = mailtoLink;

      // Admin dashboard için local kayıt
      try {
        if (typeof MessagesManagerStore !== 'undefined') {
          MessagesManagerStore.addMessage({
            type: 'contact',
            name: formData.name,
            email: formData.email,
            subject: formData.subject,
            message: formData.message,
            source: 'contact_form',
            status: 'new'
          });
        } else {
          const submissions = JSON.parse(localStorage.getItem('contactSubmissions') || '[]');
          submissions.unshift({
            ...formData,
            status: 'new',
            timestamp: Date.now()
          });
          localStorage.setItem('contactSubmissions', JSON.stringify(submissions.slice(0, 100)));
        }
      } catch (storageError) {
        console.warn('İletişim mesajı kaydedilemedi:', storageError);
      }
      
      // Show success message
      messageDiv.textContent = 'E-posta uygulamanız açılıyor... Mesajınızı gönderebilirsiniz.';
      messageDiv.className = 'contact-form-message success';
      
      // Reset form after 5 seconds
      setTimeout(() => {
        contactForm.reset();
        messageDiv.className = 'contact-form-message';
        messageDiv.textContent = '';
      }, 5000);
    } catch (error) {
      console.error('İletişim formu gönderilirken hata:', error);
      if (messageDiv) {
        messageDiv.textContent = 'Bir hata oluştu. Lütfen tekrar deneyin.';
        messageDiv.className = 'contact-form-message error';
      }
    }
  });
}

document.addEventListener('DOMContentLoaded', () => {
  // Hamburger menü event listener'larını ekle
  setupHamburgerMenu();
  
  // Site verilerini yükle (sadece ana sayfa için)
  if (!window.location.pathname.includes('/task-cosmos/') && !window.location.pathname.includes('/task-scanner/')) {
    loadSiteData();
  } else {
    applyStoredSiteSettings();
  }
  
  // Search initialization
  initSearch();
  
  // Contact form initialization
  initContactForm();
  
  // Logo animation
  initLogoAnimation();
  
  // ESC tuşu ile menüyü kapat (sadece menü açıkken)
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && isMenuOpen()) {
      closeMenu();
    }
  });
  
  // Close menu when clicking menu items
  const menuItems = document.querySelectorAll('.sidebar .menu-item');
  menuItems.forEach(item => {
    item.addEventListener('click', (e) => {
      const href = item.getAttribute('href');
      
      // Menüyü hemen kapat
      closeMenu();
      
      // Hash (#) ile başlayan linkler için smooth scroll
      if (href && href !== '#' && href !== '#home' && href.startsWith('#')) {
        e.preventDefault();
        // Hash ile başlayan linkler için (örn: #about, #contact)
        const target = document.querySelector(href);
        if (target) {
          setTimeout(() => {
            const headerOffset = 80;
            const elementPosition = target.getBoundingClientRect().top;
            const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
            window.scrollTo({
              top: offsetPosition,
              behavior: 'smooth'
            });
          }, 100);
        }
      } else if (href === '#home' || href === '#') {
        e.preventDefault();
        // Ana sayfaya scroll
        setTimeout(() => {
          window.scrollTo({
            top: 0,
            behavior: 'smooth'
          });
        }, 100);
      }
      // HTML dosyalarına veya external linklere giden linkler için preventDefault yapma
      // Normal link davranışına izin ver (sayfa değişimi için)
    });
  });
  
  // Header scroll effect
  const header = document.querySelector('.main-header');
  if (header) {
    window.addEventListener('scroll', () => {
      if (window.scrollY > 50) {
        header.classList.add('scrolled');
      } else {
        header.classList.remove('scrolled');
      }
    });
  }
  
  // Create particles
  createParticles();
  
  // Initialize parallax
  initParallax();
  
  // Show loading state
  showLoading();
  
  // Load apps (sadece ana sayfa için)
  if (!window.location.pathname.includes('/task-cosmos/')) {
    loadApps().then(() => {
      // Enhance app cards after loading
      setTimeout(() => {
        enhanceAppCards();
      }, 100);
    });
  }
  
  // Scroll indicator'a tıklandığında uygulamalar bölümüne kaydır
  const scrollIndicator = document.querySelector('.scroll-indicator');
  if (scrollIndicator) {
    scrollIndicator.addEventListener('click', () => {
      const appsSection = document.getElementById('apps');
      if (appsSection) {
        appsSection.scrollIntoView({ behavior: 'smooth' });
      }
    });
  }
  
  // Smooth scroll for all anchor links (menu items hariç - onlar zaten yukarıda handle ediliyor)
  document.querySelectorAll('a[href^="#"]:not(.menu-item)').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
      const href = this.getAttribute('href');
      if (href === '#' || href === '#home') {
        e.preventDefault();
        window.scrollTo({ top: 0, behavior: 'smooth' });
        // Close menu if open
        const sidebar = document.getElementById('sidebar');
        const overlay = document.getElementById('overlay');
        const hamburger = document.getElementById('hamburger');
        if (sidebar && overlay && hamburger) {
          sidebar.classList.remove('active');
          overlay.classList.remove('active');
          hamburger.classList.remove('active');
          document.body.style.overflow = '';
          document.body.classList.remove('menu-open');
        }
        return;
      }
      
      if (href !== '#' && href !== '') {
        const target = document.querySelector(href);
        if (target) {
          e.preventDefault();
          const headerOffset = 80;
          const elementPosition = target.getBoundingClientRect().top;
          const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

          window.scrollTo({
            top: offsetPosition,
            behavior: 'smooth'
          });
          
          // Close menu if open
          const sidebar = document.getElementById('sidebar');
          const overlay = document.getElementById('overlay');
          const hamburger = document.getElementById('hamburger');
          if (sidebar && overlay && hamburger) {
            sidebar.classList.remove('active');
            overlay.classList.remove('active');
            hamburger.classList.remove('active');
            document.body.style.overflow = '';
            document.body.classList.remove('menu-open');
          }
        }
      }
    });
  });
  
  // Initialize skill progress bars with Intersection Observer
  const skillProgressBars = document.querySelectorAll('.skill-progress');
  const skillObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const bar = entry.target;
        const width = bar.getAttribute('data-width');
        if (width) {
          setTimeout(() => {
            bar.style.width = width + '%';
          }, 200);
          skillObserver.unobserve(bar);
        }
      }
    });
  }, { threshold: 0.5 });
  
  skillProgressBars.forEach(bar => {
    skillObserver.observe(bar);
  });

  // Hash navigation handler
  function handleHashNavigation() {
    const hash = window.location.hash.slice(1); // Remove # symbol
    
    if (hash) {
      const element = document.getElementById(hash);
      if (element) {
        // Close menu if open
        const sidebar = document.getElementById('sidebar');
        const overlay = document.getElementById('overlay');
        const hamburger = document.getElementById('hamburger');
        if (sidebar && sidebar.classList.contains('active')) {
          sidebar.classList.remove('active');
          overlay?.classList.remove('active');
          hamburger?.classList.remove('active');
          document.body.style.overflow = '';
          document.body.classList.remove('menu-open');
        }
        
        // Scroll to element with smooth behavior
        setTimeout(() => {
          element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
      }
    } else {
      // If no hash, scroll to top
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  // Handle hash on page load
  if (window.location.hash) {
    handleHashNavigation();
  }

  // Handle hash changes
  window.addEventListener('hashchange', handleHashNavigation);

  // Handle anchor clicks
  document.querySelectorAll('a[href^="#"]').forEach(link => {
    link.addEventListener('click', function(e) {
      const href = this.getAttribute('href');
      if (href !== '#') {
        e.preventDefault();
        window.location.hash = href;
        handleHashNavigation();
      }
    });
  });
});