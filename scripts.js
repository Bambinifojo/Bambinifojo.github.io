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
      container.innerHTML = '<p style="color: white; text-align: center; padding: 40px; opacity: 0.8;">Henüz uygulama eklenmemiş.</p>';
      return;
    }
    
    data.apps.forEach((app, index) => {
      const icon = app.icon || '📱';
      const card = document.createElement('div');
      card.className = 'app-card';
      card.style.animationDelay = `${index * 0.1}s`;
      card.setAttribute('data-aos', 'fade-up');
      card.setAttribute('data-aos-delay', `${index * 100}ms`);
      
      card.innerHTML = `
        <div class="app-icon-container">
          <div class="app-icon">${icon}</div>
        </div>
        <h3>${app.title}</h3>
        <p>${app.description}</p>
        <div class="app-buttons">
          <a href="${app.privacy}" class="btn btn-secondary" target="_blank" rel="noopener">Gizlilik Politikası</a>
          <a href="${app.details}" class="btn btn-primary" target="_blank" rel="noopener">Detaylar</a>
        </div>
      `;
      
      container.appendChild(card);
    });
  } catch (error) {
    console.error('Uygulamalar yüklenirken hata:', error);
    const container = document.getElementById("apps-container");
    if (container) {
      container.innerHTML = '<p style="color: white; text-align: center; padding: 40px; opacity: 0.8;">Uygulamalar yüklenirken bir hata oluştu. Lütfen sayfayı yenileyin.</p>';
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
    appsContainer.innerHTML = '<div style="text-align: center; padding: 40px;"><div class="loading"></div><p style="color: white; margin-top: 20px; opacity: 0.8;">Uygulamalar yükleniyor...</p></div>';
  }
}

document.addEventListener('DOMContentLoaded', () => {
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
  
  // Smooth scroll for all anchor links
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
      const href = this.getAttribute('href');
      if (href !== '#' && href !== '') {
        const target = document.querySelector(href);
        if (target) {
          e.preventDefault();
          target.scrollIntoView({
            behavior: 'smooth',
            block: 'start'
          });
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