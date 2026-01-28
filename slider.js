// ==================== APP SLIDER ANIMASYON SİSTEMİ ====================
// Firebase'den dinamik olarak slider verilerini yükler

document.addEventListener('DOMContentLoaded', () => {
  let currentSlideIndex = 0;
  let sliderAutoPlayTimer = null;
  let sliderAutoPlayInterval = 6000; // 6 saniye (default)
  let sliderData = null;

  // Firebase'den slider verilerini yükle
  function loadSliderFromFirebase() {
    // Firebase SDK'nın yüklenmesini bekle
    if (typeof firebase === 'undefined' || typeof firebaseDatabase === 'undefined') {
      console.warn('⚠️ Firebase SDK yüklenmedi, localStorage fallback kullanılıyor');
      loadSliderFromLocalStorage();
      return;
    }

    const firebaseRef = firebaseDatabase.ref('site/slider');
    firebaseRef.on('value', (snapshot) => {
      const data = snapshot.val();
      if (data && data.slides && data.slides.length > 0) {
        sliderData = data;
        sliderAutoPlayInterval = data.autoPlayInterval || 6000;
        currentSlideIndex = 0;
        initializeAppSlider(data.slides);
      } else {
        console.warn('⚠️ Firebase slider verisi bulunamadı, fallback kullanılıyor');
        loadSliderFromLocalStorage();
      }
    }, (error) => {
      console.error('❌ Firebase veri yükleme hatası:', error);
      loadSliderFromLocalStorage();
    });
  }

  // LocalStorage fallback (offline/debug)
  function loadSliderFromLocalStorage() {
    const savedSlider = localStorage.getItem('sliderData');
    if (savedSlider) {
      const data = JSON.parse(savedSlider);
      sliderData = data;
      sliderAutoPlayInterval = data.autoPlayInterval || 6000;
      initializeAppSlider(data.slides || []);
    } else {
      // Varsayılan slides
      const defaultSlides = [
        {
          name: 'Task Scanner',
          slogan: 'Ağınız Hakkında Her Şeyi Öğrenin',
          description: 'Yerel ağınızdaki cihazları tek tuşla tarayın. IP, MAC, port ve cihaz türü bilgilerini anında görüntüleyin.',
          status: 'published',
          version: 'v1.4.2',
          updated: '12 Ocak 2026',
          platform: 'Android',
          icon: '🔍',
          links: [
            { text: 'Play Store', url: 'https://play.google.com/', icon: '📱' },
            { text: 'Detaylar', url: '#apps' }
          ]
        },
        {
          name: 'Task Cosmos',
          slogan: 'Uzay Yolculuğunuza Başlayın',
          description: 'Gezegenleri keşfedin, uzay bilimi öğrenin ve eğlenceli mini oyunlarla uzayı explore edin.',
          status: 'published',
          version: 'v2.1.0',
          updated: '5 Ocak 2026',
          platform: 'Android',
          icon: '🚀',
          links: [
            { text: 'Play Store', url: 'https://play.google.com/store/apps/details?id=com.taskcosmos.app', icon: '📱' },
            { text: 'Detaylar', url: '#apps' }
          ]
        }
      ];
      initializeAppSlider(defaultSlides);
    }
  }

  function initializeAppSlider(slides) {
    const slidesContainer = document.getElementById('appSlides');
    const paginationContainer = document.getElementById('sliderPagination');

    if (!slidesContainer || !paginationContainer) return;
    if (!slides || slides.length === 0) return;

    // Render slides
    slidesContainer.innerHTML = slides.map((slide, index) => `
      <div class="app-slide" data-index="${index}" style="display: ${index === 0 ? 'flex' : 'none'};">
        <div class="app-slide-content">
          <h3>${slide.name}</h3>
          <p>${slide.description}</p>
          <div class="app-slide-meta">
            <span class="app-meta-badge status-${slide.status}">
              ${slide.status === 'published' ? '🟢 Yayında' : slide.status === 'test' ? '🟡 Test' : '🔵 Yakında'}
            </span>
            <span class="app-meta-item">
              <span>📦</span> ${slide.version}
            </span>
            <span class="app-meta-item">
              <span>📅</span> ${slide.updated}
            </span>
            <span class="app-meta-item">
              <span>🔧</span> ${slide.platform}
            </span>
          </div>
          <div class="app-slide-actions">
            ${slide.links.map(link => `
              <a href="${link.url}" class="app-link" target="_blank" rel="noopener noreferrer">${link.icon || ''} ${link.text}</a>
            `).join('')}
          </div>
        </div>
        <div class="app-slide-visual">
          <div class="app-slide-icon">${slide.icon}</div>
        </div>
      </div>
    `).join('');

    // Render pagination
    paginationContainer.innerHTML = slides.map((_, index) => `
      <div class="pagination-dot${index === 0 ? ' active' : ''}" onclick="goToSlide(${index})"></div>
    `).join('');

    // Start auto-play
    startSliderAutoPlay();
  }

  // Go to specific slide
  window.goToSlide = function(index) {
    const slides = document.querySelectorAll('.app-slide');
    const dots = document.querySelectorAll('.pagination-dot');

    if (index >= slides.length) currentSlideIndex = 0;
    if (index < 0) currentSlideIndex = slides.length - 1;

    currentSlideIndex = index;

    // Update slide display
    slides.forEach(slide => slide.style.display = 'none');
    if (slides[currentSlideIndex]) slides[currentSlideIndex].style.display = 'flex';

    // Update pagination
    dots.forEach(dot => dot.classList.remove('active'));
    if (dots[currentSlideIndex]) dots[currentSlideIndex].classList.add('active');

    // Restart auto-play
    clearTimeout(sliderAutoPlayTimer);
    startSliderAutoPlay();
  };

  // Next slide
  window.nextSlide = function() {
    currentSlideIndex++;
    const slides = document.querySelectorAll('.app-slide');
    if (currentSlideIndex >= slides.length) currentSlideIndex = 0;
    goToSlide(currentSlideIndex);
  };

  // Previous slide
  window.previousSlide = function() {
    currentSlideIndex--;
    const slides = document.querySelectorAll('.app-slide');
    if (currentSlideIndex < 0) currentSlideIndex = slides.length - 1;
    goToSlide(currentSlideIndex);
  };

  // Auto-play slider
  function startSliderAutoPlay() {
    sliderAutoPlayTimer = setTimeout(() => {
      nextSlide();
    }, sliderAutoPlayInterval); // Dinamik interval kullan
  }

  // Stop auto-play on user interaction
  document.addEventListener('click', () => {
    clearTimeout(sliderAutoPlayTimer);
    startSliderAutoPlay();
  });

  // Firebase'den veya fallback'ten slider verilerini yükle
  loadSliderFromFirebase();
});
