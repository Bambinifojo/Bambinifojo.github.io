// ==================== HERO MEDYA VİTRİNİ + LEGACY SLIDER ====================
// Öncelik: bambinifojo_slider → sliderData → Firebase → varsayılan

document.addEventListener('DOMContentLoaded', () => {
  let currentSlideIndex = 0;
  let heroAutoPlayTimer = null;
  let heroAutoPlayInterval = 6000;
  let heroItems = [];

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = String(text ?? '');
    return div.innerHTML;
  }

  function isFirebaseReady() {
    return typeof firebase !== 'undefined'
      && typeof firebaseDatabase !== 'undefined'
      && firebaseDatabase;
  }

  function getAutoPlayInterval() {
    try {
      const saved = localStorage.getItem('sliderData');
      if (saved) {
        const data = JSON.parse(saved);
        if (data.autoPlayInterval) return Number(data.autoPlayInterval) || 6000;
      }
    } catch (e) { /* ignore */ }
    return 6000;
  }

  function getActiveMediaItems() {
    if (typeof SliderManagerStore !== 'undefined') {
      return SliderManagerStore.getActiveItems();
    }

    try {
      const raw = localStorage.getItem('bambinifojo_slider');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length) {
          return parsed
            .filter((item) => item.active !== false)
            .sort((a, b) => {
              if (a.featured !== b.featured) return a.featured ? -1 : 1;
              return (Number(a.order) || 0) - (Number(b.order) || 0);
            });
        }
      }
    } catch (e) {
      console.warn('bambinifojo_slider okunamadı:', e.message);
    }

    return [];
  }

  function renderMediaFrame(item) {
    const type = item.mediaType || 'image';
    const url = item.mediaUrl || '';
    const thumb = item.thumbnailUrl
      || (typeof SliderManagerStore !== 'undefined' ? SliderManagerStore.getPreviewThumbnail(item) : '');

    if (type === 'youtube' && url) {
      const embedUrl = typeof SliderManagerStore !== 'undefined'
        ? SliderManagerStore.getYoutubeEmbedUrl(url)
        : '';
      const ytThumb = thumb || (typeof SliderManagerStore !== 'undefined'
        ? SliderManagerStore.getYoutubeThumbnail(url)
        : '');
      if (!embedUrl) return `<div class="hero-media-frame"></div>`;
      return `
        <div class="hero-media-frame">
          <button type="button" class="hero-media-youtube" data-embed="${escapeHtml(embedUrl)}" aria-label="YouTube videosunu oynat">
            ${ytThumb ? `<img src="${escapeHtml(ytThumb)}" alt="" class="hero-media-youtube-thumb" loading="lazy">` : ''}
            <span class="hero-media-youtube-play"><span>▶</span></span>
          </button>
        </div>
      `;
    }

    if (type === 'video' && url) {
      return `
        <div class="hero-media-frame">
          <video src="${escapeHtml(url)}" muted playsinline controls preload="metadata" poster="${escapeHtml(thumb)}"></video>
        </div>
      `;
    }

    if (url || thumb) {
      return `
        <div class="hero-media-frame">
          <img src="${escapeHtml(url || thumb)}" alt="${escapeHtml(item.title || '')}" loading="lazy">
        </div>
      `;
    }

    return `<div class="hero-media-frame" style="background:linear-gradient(135deg,rgba(99,102,241,0.2),rgba(56,189,248,0.15));"></div>`;
  }

  function renderHeroOverlay(item) {
    const badge = item.badge ? `<span class="hero-media-badge">${escapeHtml(item.badge)}</span>` : '';
    const desc = item.description ? `<p class="hero-media-desc">${escapeHtml(item.description)}</p>` : '';
    const cta = (item.ctaText && item.ctaUrl)
      ? `<a href="${escapeHtml(item.ctaUrl)}" class="btn-primary hero-media-cta">${escapeHtml(item.ctaText)}</a>`
      : (item.ctaText ? `<span class="hero-media-cta btn-primary" style="display:inline-flex;">${escapeHtml(item.ctaText)}</span>` : '');

    if (!badge && !item.title && !desc && !cta) return '';

    return `
      <div class="hero-media-overlay">
        ${badge}
        ${item.title ? `<h3 class="hero-media-title">${escapeHtml(item.title)}</h3>` : ''}
        ${desc}
        ${cta}
      </div>
    `;
  }

  function bindYoutubePlayers(root) {
    root.querySelectorAll('.hero-media-youtube').forEach((btn) => {
      btn.addEventListener('click', () => {
        const embed = btn.dataset.embed;
        if (!embed) return;
        const iframe = document.createElement('iframe');
        iframe.src = `${embed}?autoplay=1&rel=0`;
        iframe.title = 'YouTube video';
        iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture';
        iframe.allowFullscreen = true;
        btn.replaceWith(iframe);
      });
    });
  }

  function pauseVideos(slides, activeIndex) {
    slides.forEach((slide, index) => {
      const video = slide.querySelector('video');
      if (!video) return;
      if (index === activeIndex) return;
      video.pause();
    });
  }

  function showHeroSlide(index) {
    const slides = document.querySelectorAll('.hero-media-slide');
    const dots = document.querySelectorAll('.hero-media-dot');
    if (!slides.length) return;

    if (index >= slides.length) currentSlideIndex = 0;
    else if (index < 0) currentSlideIndex = slides.length - 1;
    else currentSlideIndex = index;

    slides.forEach((slide, i) => {
      slide.classList.toggle('is-active', i === currentSlideIndex);
    });
    dots.forEach((dot, i) => {
      dot.classList.toggle('is-active', i === currentSlideIndex);
    });

    pauseVideos(slides, currentSlideIndex);
    clearTimeout(heroAutoPlayTimer);
    startHeroAutoPlay();
  }

  function startHeroAutoPlay() {
    if (heroItems.length <= 1) return;
    heroAutoPlayTimer = setTimeout(() => {
      showHeroSlide(currentSlideIndex + 1);
    }, heroAutoPlayInterval);
  }

  function renderHeroVitrine(items) {
    const vitrine = document.getElementById('heroMediaVitrine');
    const staticDash = document.getElementById('heroStaticDashboard');
    const slidesEl = document.getElementById('heroMediaSlides');
    const dotsEl = document.getElementById('heroMediaDots');

    if (!slidesEl || !items.length) {
      if (vitrine) {
        vitrine.hidden = true;
        vitrine.setAttribute('aria-hidden', 'true');
      }
      if (staticDash) {
        staticDash.hidden = false;
        staticDash.removeAttribute('aria-hidden');
      }
      return;
    }

    heroItems = items;
    heroAutoPlayInterval = getAutoPlayInterval();
    currentSlideIndex = 0;

    slidesEl.innerHTML = items.map((item, index) => `
      <article class="hero-media-slide${index === 0 ? ' is-active' : ''}" data-index="${index}">
        ${renderMediaFrame(item)}
        ${renderHeroOverlay(item)}
      </article>
    `).join('');

    if (dotsEl) {
      dotsEl.innerHTML = items.map((_, index) => `
        <button type="button" class="hero-media-dot${index === 0 ? ' is-active' : ''}" data-index="${index}" aria-label="Slayt ${index + 1}"></button>
      `).join('');
      dotsEl.querySelectorAll('.hero-media-dot').forEach((dot) => {
        dot.addEventListener('click', () => showHeroSlide(Number(dot.dataset.index)));
      });
    }

    bindYoutubePlayers(slidesEl);

    if (vitrine) {
      vitrine.hidden = false;
      vitrine.removeAttribute('aria-hidden');
    }
    if (staticDash) {
      staticDash.hidden = true;
      staticDash.setAttribute('aria-hidden', 'true');
    }

    startHeroAutoPlay();
  }

  function loadHeroMedia() {
    renderHeroVitrine(getActiveMediaItems());
  }

  document.getElementById('heroMediaPrev')?.addEventListener('click', () => {
    showHeroSlide(currentSlideIndex - 1);
  });
  document.getElementById('heroMediaNext')?.addEventListener('click', () => {
    showHeroSlide(currentSlideIndex + 1);
  });

  document.addEventListener('click', (e) => {
    if (e.target.closest('#heroMediaVitrine')) {
      clearTimeout(heroAutoPlayTimer);
      startHeroAutoPlay();
    }
  });

  // ——— Legacy app slider (gizli container, geriye dönük uyum) ———
  let legacySliderData = null;

  function getDefaultSlides() {
    return [
      {
        name: 'Task Scanner',
        slogan: 'Ağınız Hakkında Her Şeyi Öğrenin',
        description: 'Yerel ağınızdaki cihazları tek tuşla tarayın.',
        status: 'published',
        version: 'v1.4.2',
        updated: '12 Ocak 2026',
        platform: 'Android',
        icon: '🔍',
        links: [
          { text: 'Play Store', url: 'https://play.google.com/store/apps/details?id=com.taskscanner.app', icon: '📱' },
          { text: 'Detaylar', url: 'https://bambinifojo.github.io/task-scanner/' }
        ]
      },
      {
        name: 'Task Cosmos',
        slogan: 'Uzay Yolculuğunuza Başlayın',
        description: 'Gezegenleri keşfedin, uzay bilimi öğrenin.',
        status: 'published',
        version: 'v2.1.0',
        updated: '5 Ocak 2026',
        platform: 'Android',
        icon: '🚀',
        links: [
          { text: 'Play Store', url: 'https://play.google.com/store/apps/details?id=com.taskcosmos.app', icon: '📱' },
          { text: 'Detaylar', url: 'https://bambinifojo.github.io/task-cosmos/' }
        ]
      }
    ];
  }

  function initializeAppSlider(slides) {
    const slidesContainer = document.getElementById('appSlides');
    const paginationContainer = document.getElementById('sliderPagination');
    if (!slidesContainer || !paginationContainer) return;
    if (!slides || slides.length === 0) return;

    slidesContainer.innerHTML = slides.map((slide, index) => `
      <div class="app-slide" data-index="${index}" style="display: ${index === 0 ? 'flex' : 'none'};">
        <div class="app-slide-content">
          <h3>${escapeHtml(slide.name || slide.title)}</h3>
          <p>${escapeHtml(slide.description)}</p>
          <div class="app-slide-meta">
            <span class="app-meta-badge status-${slide.status || 'published'}">
              ${slide.status === 'published' ? '🟢 Yayında' : slide.status === 'test' ? '🟡 Test' : '🔵 Yakında'}
            </span>
            ${slide.version ? `<span class="app-meta-item"><span>📦</span> ${escapeHtml(slide.version)}</span>` : ''}
          </div>
          <div class="app-slide-actions">
            ${(slide.links || []).map((link) => `
              <a href="${escapeHtml(link.url)}" class="app-link" target="_blank" rel="noopener noreferrer">${link.icon || ''} ${escapeHtml(link.text)}</a>
            `).join('')}
          </div>
        </div>
        <div class="app-slide-visual">
          <div class="app-slide-icon">${slide.icon || '📱'}</div>
        </div>
      </div>
    `).join('');

    paginationContainer.innerHTML = slides.map((_, index) => `
      <div class="pagination-dot${index === 0 ? ' active' : ''}" onclick="goToSlide(${index})"></div>
    `).join('');
  }

  window.goToSlide = function(index) {
    const slides = document.querySelectorAll('.app-slide');
    const dots = document.querySelectorAll('.pagination-dot');
    if (!slides.length) return;

    if (index >= slides.length) index = 0;
    if (index < 0) index = slides.length - 1;

    slides.forEach((slide) => { slide.style.display = 'none'; });
    if (slides[index]) slides[index].style.display = 'flex';
    dots.forEach((dot) => dot.classList.remove('active'));
    if (dots[index]) dots[index].classList.add('active');
  };

  window.nextSlide = function() {
    const slides = document.querySelectorAll('.app-slide');
    if (!slides.length) return;
    let idx = Array.from(slides).findIndex((s) => s.style.display !== 'none');
    idx = idx < 0 ? 0 : idx + 1;
    if (idx >= slides.length) idx = 0;
    goToSlide(idx);
  };

  window.previousSlide = function() {
    const slides = document.querySelectorAll('.app-slide');
    if (!slides.length) return;
    let idx = Array.from(slides).findIndex((s) => s.style.display !== 'none');
    idx = idx < 0 ? 0 : idx - 1;
    if (idx < 0) idx = slides.length - 1;
    goToSlide(idx);
  };

  function syncHeroFromLegacy(slides) {
    if (typeof SliderManagerStore === 'undefined') {
      loadHeroMedia();
      return;
    }
    if (!localStorage.getItem(SliderManagerStore.STORAGE_KEY) && slides?.length) {
      SliderManagerStore.save(SliderManagerStore.syncFromLegacySlides(slides));
    }
    loadHeroMedia();
  }

  function loadLegacySliderFromLocalStorage() {
    const savedSlider = localStorage.getItem('sliderData');
    if (savedSlider) {
      try {
        const data = JSON.parse(savedSlider);
        legacySliderData = data;
        const slides = data.slides || data.apps || [];
        initializeAppSlider(slides);
        syncHeroFromLegacy(slides);
        return;
      } catch (error) {
        console.warn('Slider localStorage verisi okunamadı:', error.message);
      }
    }

    const defaults = getDefaultSlides();
    initializeAppSlider(defaults);
    loadHeroMedia();
  }

  function loadSliderFromFirebase() {
    if (!isFirebaseReady()) {
      loadLegacySliderFromLocalStorage();
      return;
    }

    const firebaseRef = firebaseDatabase.ref('site/slider');
    firebaseRef.on('value', (snapshot) => {
      const data = snapshot.val();
      if (data && data.slides && data.slides.length > 0) {
        legacySliderData = data;
        try {
          localStorage.setItem('sliderData', JSON.stringify(data));
        } catch (e) { /* ignore */ }
        initializeAppSlider(data.slides);
        syncHeroFromLegacy(data.slides);
      } else {
        loadLegacySliderFromLocalStorage();
      }
    }, () => {
      loadLegacySliderFromLocalStorage();
    });
  }

  loadHeroMedia();
  loadSliderFromFirebase();

  window.addEventListener('storage', (e) => {
    if (e.key === 'bambinifojo_slider' || e.key === 'sliderData') {
      loadHeroMedia();
    }
  });
});
