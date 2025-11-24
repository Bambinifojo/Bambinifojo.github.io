// Sidebar state kontrolü
function isMenuOpen() {
  const sidebar = document.getElementById('sidebar');
  return sidebar && sidebar.classList.contains('active');
}

// Hamburger Menu Toggle
function toggleMenu() {
  console.log('🖱️ toggleMenu çağrıldı');
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('overlay');
  const hamburger = document.getElementById('hamburger');
  
  if (!sidebar || !overlay || !hamburger) {
    console.warn('⚠️ Sidebar, overlay veya hamburger bulunamadı', {
      sidebar: !!sidebar,
      overlay: !!overlay,
      hamburger: !!hamburger
    });
    return;
  }
  
  const isOpen = sidebar.classList.contains('active');
  console.log('📊 Menü durumu:', isOpen ? 'Açık' : 'Kapalı');
  
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

// Global scope'a ekle (HTML onclick için)
if (typeof window !== 'undefined') {
  window.toggleMenu = toggleMenu;
  window.openMenu = openMenu;
  window.closeMenu = closeMenu;
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
  console.log('🔧 setupHamburgerMenu çağrıldı');
  // Hamburger butonuna event listener ekle (onclick yedek olarak)
  const hamburger = document.getElementById('hamburger');
  if (hamburger) {
    console.log('✅ Hamburger butonu bulundu');
    // Eğer zaten event listener eklenmemişse ekle
    if (!hamburger.hasAttribute('data-listener-added')) {
      hamburger.setAttribute('data-listener-added', 'true');
      hamburger.addEventListener('click', (e) => {
        console.log('🖱️ Hamburger butonuna tıklandı (event listener)');
        e.preventDefault();
        e.stopPropagation();
        toggleMenu();
      });
      console.log('✅ Event listener eklendi');
    } else {
      console.log('ℹ️ Event listener zaten eklenmiş');
    }
  } else {
    console.warn('⚠️ Hamburger butonu bulunamadı');
  }
  
  // Overlay'e tıklandığında menüyü kapat
  const overlay = document.getElementById('overlay');
  if (overlay) {
    overlay.addEventListener('click', () => {
      closeMenu();
    });
  }
}

// Site verilerini yükle
async function loadSiteData() {
  try {
    // Önce site.json'dan site verilerini yükle
    let siteData = null;
    try {
      const siteRes = await fetch("data/site.json");
      if (siteRes.ok) {
        const siteJson = await siteRes.json();
        siteData = siteJson.site;
      }
    } catch (error) {
      console.warn('Site verisi yüklenirken hata:', error);
    }
    
    // Eğer site.json'dan yüklenemediyse, apps.json'dan kontrol et (geriye dönük uyumluluk)
    if (!siteData) {
      try {
        const res = await fetch("data/apps.json");
        if (res.ok) {
          const data = await res.json();
          if (data.site) {
            siteData = data.site;
          }
        }
      } catch (error) {
        console.warn('Apps.json\'dan site verisi yüklenirken hata:', error);
      }
    }
    
    if (!siteData) {
      console.warn('Site verisi bulunamadı, varsayılan değerler kullanılıyor');
      return;
    }
    
    const data = { site: siteData };
    
    // Header
    if (data.site.header) {
      const logo = document.querySelector('.logo');
      const tagline = document.querySelector('.header-tagline');
      if (logo && data.site.header.logo) {
        // Logo metnini güncelle (mevcut yapıyı koru, sadece metni değiştir)
        const logoText = data.site.header.logo;
        if (logoText !== 'Bambinifojo') {
          // Logo metni değişmişse güncelle
          logo.innerHTML = logoText.split('').map((letter, i) => 
            `<span class="logo-letter ${i === 0 ? 'logo-accent' : ''}">${letter}</span>`
          ).join('');
        }
      }
      if (tagline && data.site.header.tagline) {
        tagline.textContent = data.site.header.tagline;
      }
    }
    
    // Hero Section
    if (data.site.hero) {
      const heroTitle = document.querySelector('.hero-brand');
      const heroTagline = document.querySelector('.hero-tagline');
      const playStoreBtn = document.querySelector('.btn-playstore');
      
      if (heroTitle && data.site.hero.title) {
        const titleText = data.site.hero.title;
        heroTitle.innerHTML = titleText.split('').map((letter, i) => 
          `<span class="brand-letter ${i === 0 ? 'brand-accent' : ''}" data-letter="${letter}">${letter}</span>`
        ).join('');
      }
      
      if (heroTagline && data.site.hero.tagline) {
        heroTagline.textContent = data.site.hero.tagline;
      }
      
      if (playStoreBtn && data.site.hero.playStoreUrl) {
        playStoreBtn.href = data.site.hero.playStoreUrl;
      }
      
      // Hero Stats
      if (data.site.hero.stats && data.site.hero.stats.length > 0) {
        const statsContainer = document.querySelector('.hero-stats');
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
          <div class="skill-item" data-aos="fade-up" data-aos-delay="${index * 50}ms">
            <div class="skill-icon">${skill.icon}</div>
            <h4>${skill.name}</h4>
            <div class="skill-bar">
              <div class="skill-progress" data-width="${skill.level}"></div>
            </div>
          </div>
        `).join('');
        
        // Skill progress animasyonlarını başlat
        setTimeout(() => {
          document.querySelectorAll('.skill-progress').forEach(progress => {
            const width = progress.getAttribute('data-width');
            progress.style.width = width + '%';
          });
        }, 100);
      }
    }
    
    // Contact Section
    if (data.site.contact) {
      const contactTitle = document.querySelector('#contact-section .section-title');
      const contactSubtitle = document.querySelector('.contact-subtitle');
      
      if (contactTitle && data.site.contact.title) {
        contactTitle.textContent = data.site.contact.title;
      }
      
      if (contactSubtitle && data.site.contact.subtitle) {
        contactSubtitle.textContent = data.site.contact.subtitle;
      }
    }
  } catch (error) {
    console.error('Site verileri yüklenirken hata:', error);
  }
}

async function loadApps(){
  try {
    const container = document.getElementById("apps-container");
    if (!container) {
      console.error('Apps container bulunamadı');
      return;
    }
    
    const res = await fetch("data/apps.json");
    if (!res.ok) {
      throw new Error(`HTTP error! status: ${res.status}`);
    }
    
    const data = await res.json();
    container.innerHTML = "";
    
    if (!data.apps || data.apps.length === 0) {
      container.innerHTML = '<p style="color: #666; text-align: center; padding: 40px; opacity: 0.8;">Henüz uygulama eklenmemiş.</p>';
      return;
    }
    
    data.apps.forEach((app, index) => {
      const icon = app.icon || '📱';
      const rating = app.rating || 4.5;
      const downloads = app.downloads || '1K+';
      const category = app.category || 'Uygulama';
      const features = app.features || [];
      const hasPlayStore = app.details && app.details !== '#';
      
      const card = document.createElement('div');
      card.className = 'app-card';
      if (!hasPlayStore) {
        card.classList.add('app-card-coming-soon');
      }
      card.style.animationDelay = `${index * 0.1}s`;
      card.setAttribute('data-aos', 'fade-up');
      card.setAttribute('data-aos-delay', `${index * 100}ms`);
      
      // Rating stars
      const stars = Math.floor(rating);
      const hasHalfStar = rating % 1 >= 0.5;
      let starsHTML = '';
      for (let i = 0; i < 5; i++) {
        if (i < stars) {
          starsHTML += '<span class="star filled">★</span>';
        } else if (i === stars && hasHalfStar) {
          starsHTML += '<span class="star half">★</span>';
        } else {
          starsHTML += '<span class="star">★</span>';
        }
      }
      
      // Features list
      const featuresHTML = features.length > 0 
        ? `<div class="app-features">
            ${features.slice(0, 3).map(feature => `<span class="feature-tag">${feature}</span>`).join('')}
          </div>`
        : '';
      
      // Check if app has a detail page
      const detailPage = app.detailPage || (app.title === 'Task Cosmos' ? 'task-cosmos/' : null);
      
      card.innerHTML = `
        <div class="app-card-header" ${detailPage ? 'style="cursor: pointer;"' : ''}>
          <div class="app-icon-large">${icon}</div>
          <div class="app-header-info">
            <div class="app-category">${category}</div>
            <h3 class="app-title">${app.title}</h3>
            <div class="app-rating">
              <div class="stars">${starsHTML}</div>
              <span class="rating-value">${rating}</span>
              <span class="downloads-count">${downloads} indirme</span>
            </div>
          </div>
        </div>
        
        <p class="app-description">${app.description}</p>
        
        ${featuresHTML}
        
        <div class="app-actions">
          ${hasPlayStore ? `
            <a href="${app.details}" class="btn-play-store" target="_blank" rel="noopener" onclick="event.stopPropagation();">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M3,20.5V3.5C3,2.91 3.34,2.39 3.84,2.15L13.69,12L3.84,21.85C3.34,21.6 3,21.09 3,20.5M16.81,15.12L6.05,21.34L14.54,12.85L16.81,15.12M20.16,10.81C20.5,11.08 20.75,11.5 20.75,12C20.75,12.5 20.53,12.9 20.18,13.18L17.89,14.5L15.39,12L17.89,9.5L20.16,10.81M6.05,2.66L16.81,8.88L14.54,11.15L6.05,2.66Z"/>
              </svg>
              <span>Google Play'de İndir</span>
            </a>
          ` : `
            <button class="btn-coming-soon" disabled onclick="event.stopPropagation();">
              <span>Yakında</span>
            </button>
          `}
          <a href="${app.privacy}" class="btn-privacy" target="_blank" rel="noopener" onclick="event.stopPropagation();">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
            <span>Gizlilik</span>
          </a>
        </div>
      `;
      
      // Add click event to navigate to detail page
      if (detailPage) {
        card.style.cursor = 'pointer';
        card.addEventListener('click', (e) => {
          // Don't navigate if clicking on buttons or links
          if (e.target.closest('.app-actions') || e.target.closest('a') || e.target.closest('button')) {
            return;
          }
          window.location.href = detailPage;
        });
      }
      
      container.appendChild(card);
    });
  } catch (error) {
    console.error('Uygulamalar yüklenirken hata:', error);
    const container = document.getElementById("apps-container");
    if (container) {
      container.innerHTML = '<p style="color: #666; text-align: center; padding: 40px; opacity: 0.8;">Uygulamalar yüklenirken bir hata oluştu. Lütfen sayfayı yenileyin.</p>';
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
  
  if (heroSection && heroIcon) {
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
    console.error('Arama verileri yüklenirken hata:', error);
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
    
    const formData = {
      name: document.getElementById('contactName').value.trim(),
      email: document.getElementById('contactEmail').value.trim(),
      subject: document.getElementById('contactSubject').value.trim(),
      message: document.getElementById('contactMessage').value.trim()
    };
    
    const messageDiv = document.getElementById('contactFormMessage');
    
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
    
    // Show success message
    messageDiv.textContent = 'E-posta uygulamanız açılıyor... Mesajınızı gönderebilirsiniz.';
    messageDiv.className = 'contact-form-message success';
    
    // Reset form after 3 seconds
    setTimeout(() => {
      contactForm.reset();
      messageDiv.className = 'contact-form-message';
      messageDiv.textContent = '';
    }, 5000);
  });
}

document.addEventListener('DOMContentLoaded', () => {
  // Hamburger menü event listener'larını ekle
  setupHamburgerMenu();
  
  // Search initialization
  initSearch();
  
  // Contact form initialization
  initContactForm();
  
  // Logo animation
  initLogoAnimation();
  
  // ESC tuşu ile menüyü kapat
  // ESC tuşu ile menüyü kapat
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
  
  // Load apps
  loadApps().then(() => {
    // Enhance app cards after loading
    setTimeout(() => {
      enhanceAppCards();
    }, 100);
  });
  
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
});