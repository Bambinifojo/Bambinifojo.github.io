// ==================== SLIDER YÖNETİMİ ====================

// Slider ayarlarını Firebase'ten yükle
async function loadSliderSettings() {
  if (!firebaseDatabase || currentMode !== 'firebase') {
    console.warn('⚠️ Firebase database başlatılmamış, fallback kullanılıyor');
    loadSliderSettingsFromLocalStorage();
    return;
  }

  try {
    const snapshot = await firebaseDatabase.ref('site/slider').once('value');
    const sliderData = snapshot.val();
    
    if (sliderData) {
      populateSliderForm(sliderData);
      console.log('✅ Slider ayarları Firebase\'den yüklendi');
    } else {
      console.warn('⚠️ Firebase\'de slider verisi bulunamadı');
      loadSliderSettingsFromLocalStorage();
    }
  } catch (error) {
    console.error('❌ Firebase\'den yükleme hatası:', error);
    loadSliderSettingsFromLocalStorage();
  }
}

// LocalStorage fallback
function loadSliderSettingsFromLocalStorage() {
  const saved = localStorage.getItem('sliderData');
  if (saved) {
    try {
      const sliderData = JSON.parse(saved);
      populateSliderForm(sliderData);
      console.log('✅ Slider ayarları localStorage\'dan yüklendi');
    } catch (error) {
      console.error('⚠️ localStorage parse hatası:', error);
      loadDefaultSliderForm();
    }
  } else {
    loadDefaultSliderForm();
  }
}

// Varsayılan slider formunu yükle
function loadDefaultSliderForm() {
  const autoPlayEl = document.getElementById('sliderAutoPlayInterval');
  if (autoPlayEl) {
    autoPlayEl.value = '6000'; // 6 saniye
  }
  renderSliderApps();
}

// Form alanlarını doldur
function populateSliderForm(sliderData) {
  const autoPlayEl = document.getElementById('sliderAutoPlayInterval');
  if (autoPlayEl) {
    autoPlayEl.value = sliderData.autoPlayInterval || 6000;
  }
}

// Uygulamaları slider listesi olarak render et
function renderSliderApps() {
  const container = document.getElementById('sliderAppsList');
  if (!container) return;

  if (!appsData || !appsData.apps || appsData.apps.length === 0) {
    container.innerHTML = '<p style="color: #6b7280; text-align: center; padding: 20px;">Henüz uygulama yok</p>';
    return;
  }

  container.innerHTML = appsData.apps.map((app, index) => {
    const inSlider = isAppInSlider(app.appId || app.title);
    return `
      <div class="slider-app-item" style="display: flex; align-items: center; padding: 12px; border: 1px solid #e5e7eb; border-radius: 6px; margin-bottom: 8px; background: ${inSlider ? '#f0fdf4' : '#fff'};">
        <input 
          type="checkbox" 
          class="slider-app-checkbox" 
          data-app-id="${app.appId || app.title}" 
          ${inSlider ? 'checked' : ''}
          onchange="updateSliderApps()"
          style="margin-right: 12px; cursor: pointer; width: 18px; height: 18px;"
        />
        <div style="flex: 1;">
          <div style="font-weight: 600; color: #1a1a1a;">${escapeHtml(app.title || 'İsimsiz')}</div>
          <div style="font-size: 0.85rem; color: #6b7280;">${escapeHtml(app.description || '').substring(0, 60)}${app.description && app.description.length > 60 ? '...' : ''}</div>
        </div>
        <div style="margin-left: 12px; color: ${inSlider ? '#10b981' : '#9ca3af'};">
          ${inSlider ? '✓ Slider\'da' : '○ Değil'}
        </div>
      </div>
    `;
  }).join('');
}

// Uygulamanın slider'da olup olmadığını kontrol et
function isAppInSlider(appId) {
  const saved = localStorage.getItem('sliderData');
  if (!saved) return false;

  try {
    const sliderData = JSON.parse(saved);
    if (!sliderData.slides) return false;
    return sliderData.slides.some(slide => {
      return (slide.appId || slide.name) === appId;
    });
  } catch (error) {
    console.error('⚠️ localStorage parse hatası:', error);
    return false;
  }
}

// Slider uygulamalarını güncelle
async function updateSliderApps() {
  const checkboxes = document.querySelectorAll('.slider-app-checkbox:checked');
  const slides = [];

  checkboxes.forEach(checkbox => {
    const appId = checkbox.getAttribute('data-app-id');
    const app = appsData.apps.find(a => (a.appId || a.title) === appId);
    
    if (app) {
      slides.push({
        name: app.title || 'İsimsiz',
        appId: app.appId,
        slogan: app.slogan || '',
        description: app.description || '',
        status: app.details && app.details !== '#' ? 'published' : 'coming-soon',
        version: app.appVersion || 'v1.0.0',
        updated: app.updated || new Date().toLocaleDateString('tr-TR'),
        platform: 'Android',
        icon: app.icon || '📱',
        links: [
          { 
            text: 'Play Store', 
            url: app.details && app.details !== '#' ? app.details : 'https://play.google.com/', 
            icon: '📱' 
          },
          { text: 'Detaylar', url: '#apps' }
        ]
      });
    }
  });

  // Slider verisini oluştur
  const sliderData = {
    slides: slides,
    autoPlayInterval: parseInt(document.getElementById('sliderAutoPlayInterval')?.value || 6000),
    isEnabled: true,
    lastUpdated: new Date().toISOString()
  };

  // Firebase'e kaydet
  if (currentMode === 'firebase' && firebaseDatabase) {
    try {
      await firebaseDatabase.ref('site/slider').set(sliderData);
      showAlert('✅ Slider Firebase\'e kaydedildi!', 'success');
      console.log('✅ Slider Firebase\'e kaydedildi');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Bilinmeyen hata';
      showAlert(`❌ Firebase kaydetme hatası: ${errorMessage}`, 'error');
      console.error('Firebase kaydetme hatası:', error);
      return;
    }
  }

  // LocalStorage'a da kaydet (fallback)
  localStorage.setItem('sliderData', JSON.stringify(sliderData));
  console.log('✅ Slider localStorage\'a kaydedildi');
  
  // Slider uygulamalarını yeniden render et
  renderSliderApps();
  
  // Önizlemeyi yenile
  refreshPreview(false);
}

// Auto-play interval'ı güncelle
async function updateSliderAutoPlayInterval() {
  const intervalEl = document.getElementById('sliderAutoPlayInterval');
  if (!intervalEl) return;

  const interval = parseInt(intervalEl.value);
  if (isNaN(interval) || interval < 1000 || interval > 60000) {
    showAlert('⚠️ Interval 1000ms ile 60000ms arasında olmalıdır!', 'error');
    return;
  }

  // Slider verisini güncelle
  const saved = localStorage.getItem('sliderData');
  let sliderData = saved ? JSON.parse(saved) : { slides: [], autoPlayInterval: 6000, isEnabled: true };

  sliderData.autoPlayInterval = interval;
  sliderData.lastUpdated = new Date().toISOString();

  // Firebase'e kaydet
  if (currentMode === 'firebase' && firebaseDatabase) {
    try {
      await firebaseDatabase.ref('site/slider').set(sliderData);
      showAlert('✅ Auto-play interval Firebase\'e kaydedildi!', 'success');
      console.log('✅ Auto-play interval güncellendi:', interval, 'ms');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Bilinmeyen hata';
      showAlert(`❌ Firebase kaydetme hatası: ${errorMessage}`, 'error');
      console.error('Firebase kaydetme hatası:', error);
      return;
    }
  }

  // LocalStorage'a da kaydet
  localStorage.setItem('sliderData', JSON.stringify(sliderData));
  showAlert('✅ Auto-play interval güncellendi!', 'success');
  
  // Önizlemeyi yenile
  refreshPreview(false);
}

// Slider paneline geçildiğinde verileri yükle
function onSliderSectionShow() {
  // Apps data'yı kontrol et
  if (!appsData || !appsData.apps) {
    appsData = { apps: [], site: null };
  }
  
  // Slider ayarlarını yükle
  loadSliderSettings();
}

// Global scope'a ekle
if (typeof window !== 'undefined') {
  window.loadSliderSettings = loadSliderSettings;
  window.renderSliderApps = renderSliderApps;
  window.updateSliderApps = updateSliderApps;
  window.updateSliderAutoPlayInterval = updateSliderAutoPlayInterval;
  window.onSliderSectionShow = onSliderSectionShow;
}

console.log('✅ admin-slider.js yüklendi');
