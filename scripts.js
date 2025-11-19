// Hamburger Menu Toggle
function toggleMenu() {
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('overlay');
  const hamburger = document.getElementById('hamburger');
  
  if (sidebar && overlay && hamburger) {
    const isActive = sidebar.classList.toggle('active');
    overlay.classList.toggle('active');
    hamburger.classList.toggle('active');
    
    // Body scroll lock ve menu-open class
    if (isActive) {
      document.body.style.overflow = 'hidden';
      document.body.classList.add('menu-open');
    } else {
      document.body.style.overflow = '';
      document.body.classList.remove('menu-open');
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
      document.body.style.overflow = '';
      document.body.classList.remove('menu-open');
    }
  }
}

// Site verilerini yükle
async function loadSiteData() {
  try {
    const res = await fetch("data/apps.json");
    if (!res.ok) {
      throw new Error(`HTTP error! status: ${res.status}`);
    }
    
    const data = await res.json();
    if (!data.site) {
      // Site verisi yoksa site.json'dan yükle
      try {
        const siteRes = await fetch("data/site.json");
        const siteData = await siteRes.json();
        data.site = siteData.site;
      } catch {
        console.warn('Site verisi bulunamadı, varsayılan değerler kullanılıyor');
        return;
      }
    }
    
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
      const contactGrid = document.querySelector('.contact-grid');
      
      if (contactTitle && data.site.contact.title) {
        contactTitle.textContent = data.site.contact.title;
      }
      
      if (contactSubtitle && data.site.contact.subtitle) {
        contactSubtitle.textContent = data.site.contact.subtitle;
      }
      
      if (contactGrid && data.site.contact.items) {
        contactGrid.innerHTML = data.site.contact.items.map((item, index) => {
          let iconClass = 'email-icon';
          if (item.type === 'github') iconClass = 'github-icon';
          else if (item.type === 'portfolio') iconClass = 'portfolio-icon';
          
          // Icon için SVG veya emoji
          let iconHTML = `<span style="font-size: 28px;">${item.icon}</span>`;
          if (item.type === 'email') {
            iconHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
              <polyline points="22,6 12,13 2,6"></polyline>
            </svg>`;
          } else if (item.type === 'github') {
            iconHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
            </svg>`;
          } else if (item.type === 'portfolio') {
            iconHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
              <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
              <line x1="12" y1="22.08" x2="12" y2="12"></line>
            </svg>`;
          }
          
          return `
            <div class="contact-card" data-aos="fade-up" data-aos-delay="${index * 100}ms">
              <div class="contact-card-icon ${iconClass}">
                ${iconHTML}
              </div>
              <h3 class="contact-card-title">${item.title}</h3>
              <a href="${item.link}" class="contact-card-link" ${item.link.startsWith('http') ? 'target="_blank" rel="noopener"' : ''}>${item.value}</a>
              <p class="contact-card-desc">${item.description}</p>
            </div>
          `;
        }).join('');
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
      
      card.innerHTML = `
        <div class="app-card-header">
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
            <a href="${app.details}" class="btn-play-store" target="_blank" rel="noopener">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M3,20.5V3.5C3,2.91 3.34,2.39 3.84,2.15L13.69,12L3.84,21.85C3.34,21.6 3,21.09 3,20.5M16.81,15.12L6.05,21.34L14.54,12.85L16.81,15.12M20.16,10.81C20.5,11.08 20.75,11.5 20.75,12C20.75,12.5 20.53,12.9 20.18,13.18L17.89,14.5L15.39,12L17.89,9.5L20.16,10.81M6.05,2.66L16.81,8.88L14.54,11.15L6.05,2.66Z"/>
              </svg>
              <span>Google Play'de İndir</span>
            </a>
          ` : `
            <button class="btn-coming-soon" disabled>
              <span>Yakında</span>
            </button>
          `}
          <a href="${app.privacy}" class="btn-privacy" target="_blank" rel="noopener">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
            <span>Gizlilik</span>
          </a>
        </div>
      `;
      
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
function initSearch() {
  const searchToggle = document.getElementById('searchToggle');
  const searchInput = document.getElementById('searchInput');
  const searchClose = document.getElementById('searchClose');
  const searchContainer = document.getElementById('searchContainer');
  
  if (!searchToggle || !searchInput || !searchClose || !searchContainer) return;
  
  // Toggle search
  searchToggle.addEventListener('click', () => {
    searchContainer.classList.toggle('active');
    if (searchContainer.classList.contains('active')) {
      setTimeout(() => searchInput.focus(), 100);
    }
  });
  
  // Close search
  searchClose.addEventListener('click', () => {
    searchContainer.classList.remove('active');
    searchInput.value = '';
    searchClose.classList.remove('show');
  });
  
  // Show/hide close button
  searchInput.addEventListener('input', (e) => {
    if (e.target.value.length > 0) {
      searchClose.classList.add('show');
    } else {
      searchClose.classList.remove('show');
    }
  });
  
  // Search functionality
  searchInput.addEventListener('keyup', (e) => {
    const query = e.target.value.toLowerCase().trim();
    
    if (query.length === 0) {
      // Clear search results
      return;
    }
    
    // Search in page content
    const sections = document.querySelectorAll('section');
    sections.forEach(section => {
      const text = section.textContent.toLowerCase();
      if (text.includes(query)) {
        section.style.display = '';
      } else if (query.length > 2) {
        // Only hide if query is long enough
        // section.style.display = 'none';
      }
    });
  });
  
  // Keyboard shortcut (Ctrl/Cmd + K)
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault();
      searchContainer.classList.toggle('active');
      if (searchContainer.classList.contains('active')) {
        setTimeout(() => searchInput.focus(), 100);
      }
    }
    
    // ESC to close
    if (e.key === 'Escape') {
      if (searchContainer.classList.contains('active')) {
        searchContainer.classList.remove('active');
        searchInput.value = '';
        searchClose.classList.remove('show');
      }
    }
  });
  
  // Close search when clicking outside
  document.addEventListener('click', (e) => {
    if (searchContainer.classList.contains('active')) {
      // Check if click is outside search box
      const searchBox = searchContainer.querySelector('.search-box');
      if (searchBox && !searchBox.contains(e.target) && !searchToggle.contains(e.target)) {
        searchContainer.classList.remove('active');
        searchInput.value = '';
        searchClose.classList.remove('show');
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

document.addEventListener('DOMContentLoaded', () => {
  // Search initialization
  initSearch();
  
  // Logo animation
  initLogoAnimation();
  
  // ESC tuşu ile menüyü kapat
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      const sidebar = document.getElementById('sidebar');
      if (sidebar && sidebar.classList.contains('active')) {
        closeMenu();
      }
    }
  });
  
  // Close menu when clicking menu items
  const menuItems = document.querySelectorAll('.sidebar .menu-item');
  menuItems.forEach(item => {
    item.addEventListener('click', (e) => {
      const href = item.getAttribute('href');
      
          // Admin linki ise direkt git (preventDefault yok)
          if (href && (href.includes('admin.html') || href.includes('admin-login.html'))) {
            closeMenu();
            return; // Sayfa değişecek, preventDefault yapma
          }
      
      e.preventDefault();
      
      // Menüyü hemen kapat
      closeMenu();
      
      // Smooth scroll to target section
      if (href && href !== '#' && href !== '#home') {
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
        // Ana sayfaya scroll
      setTimeout(() => {
          window.scrollTo({
            top: 0,
            behavior: 'smooth'
          });
        }, 100);
      }
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