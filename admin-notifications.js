// Bildirim Ayarları JavaScript

// Config yükleme
async function loadConfig() {
  try {
    // Hem app_config.json hem de version.json'ı yükle
    const configUrl = "https://bambinifojo.netlify.app/app_config.json?t=" + Date.now();
    const versionUrl = "https://bambinifojo.github.io/task-cosmos/version.json?t=" + Date.now();
    
    let data = {};
    let versionData = {};
    
    // app_config.json'ı yükle
    try {
      const configRes = await fetch(configUrl);
      if (configRes.ok) {
        data = await configRes.json();
        console.log('✅ app_config.json yüklendi');
      }
    } catch (error) {
      console.warn('app_config.json yüklenemedi:', error);
    }
    
    // version.json'ı yükle (öncelikli)
    try {
      const versionRes = await fetch(versionUrl);
      if (versionRes.ok) {
        versionData = await versionRes.json();
        console.log('✅ version.json yüklendi');
        
        // version.json'dan gelen verileri öncelikli olarak kullan
        if (versionData.latest_version) data.latest_version = versionData.latest_version;
        if (versionData.update_message) data.update_message = versionData.update_message;
        if (versionData.force_update !== undefined) data.force_update = versionData.force_update;
        if (versionData.play_store_url) data.play_store_url = versionData.play_store_url;
      }
    } catch (error) {
      console.warn('version.json yüklenemedi (opsiyonel):', error);
    }
    
    // Eğer hiçbir dosya yüklenemediyse varsayılan değerleri kullan
    if (!data.latest_version) {
      console.warn('Config dosyası bulunamadı, varsayılan değerler kullanılıyor');
      data = {
        latest_version: "1.0.0",
        force_update: false,
        update_message: "Yeni sürüm mevcut! Daha iyi performans için güncelleyin.",
        play_store_url: "https://play.google.com/store/apps/details?id=com.taskcosmos.app",
        broadcast_enabled: false,
        broadcast_title: "Yeni Görev Yayınlandı!",
        broadcast_message: "Yeni gezegen görevleri seni bekliyor!",
        maintenance: false,
        maintenance_message: "Bakım modu aktif. Lütfen daha sonra tekrar deneyin."
      };
    }

    // Form alanlarını doldur
    document.getElementById("latest_version").value = data.latest_version || "1.0.0";
    document.getElementById("force_update").value = String(data.force_update || false);
    document.getElementById("update_message").value = data.update_message || "";
    document.getElementById("play_store_url").value = data.play_store_url || "https://play.google.com/store/apps/details?id=com.taskcosmos.app";

    document.getElementById("broadcast_enabled").value = String(data.broadcast_enabled || false);
    document.getElementById("broadcast_title").value = data.broadcast_title || "";
    document.getElementById("broadcast_message").value = data.broadcast_message || "";

    document.getElementById("maintenance").value = String(data.maintenance || false);
    document.getElementById("maintenance_message").value = data.maintenance_message || "";
    
    showAlert('✅ Ayarlar başarıyla yüklendi!', 'success');
    
  } catch (error) {
    console.error('Config yükleme hatası:', error);
    showAlert('⚠️ Ayarlar yüklenirken hata oluştu. Varsayılan değerler kullanılıyor.', 'error');
    
    // Varsayılan değerleri yükle
    document.getElementById("latest_version").value = "1.0.0";
    document.getElementById("force_update").value = "false";
    document.getElementById("update_message").value = "Yeni sürüm mevcut! Daha iyi performans için güncelleyin.";
    document.getElementById("play_store_url").value = "https://play.google.com/store/apps/details?id=com.taskcosmos.app";
    document.getElementById("broadcast_enabled").value = "false";
    document.getElementById("broadcast_title").value = "Yeni Görev Yayınlandı!";
    document.getElementById("broadcast_message").value = "Yeni gezegen görevleri seni bekliyor!";
    document.getElementById("maintenance").value = "false";
    document.getElementById("maintenance_message").value = "Bakım modu aktif. Lütfen daha sonra tekrar deneyin.";
  }
}

// Config kaydetme
async function saveConfig() {
  const saveBtn = document.getElementById('saveBtn');
  const originalText = saveBtn.textContent;
  
  // Loading state
  saveBtn.disabled = true;
  saveBtn.textContent = '⏳ Kaydediliyor...';
  
  try {
    // Form verilerini topla
    const config = {
      latest_version: document.getElementById("latest_version").value.trim(),
      force_update: document.getElementById("force_update").value === "true",
      update_message: document.getElementById("update_message").value.trim(),
      play_store_url: document.getElementById("play_store_url").value.trim() || "https://play.google.com/store/apps/details?id=com.taskcosmos.app",
      broadcast_enabled: document.getElementById("broadcast_enabled").value === "true",
      broadcast_title: document.getElementById("broadcast_title").value.trim(),
      broadcast_message: document.getElementById("broadcast_message").value.trim(),
      maintenance: document.getElementById("maintenance").value === "true",
      maintenance_message: document.getElementById("maintenance_message").value.trim()
    };
    
    // Validasyon
    if (!config.latest_version || !config.update_message || !config.broadcast_title || 
        !config.broadcast_message || !config.maintenance_message) {
      throw new Error('Lütfen tüm alanları doldurun.');
    }
    
    // Versiyon format kontrolü
    if (!/^\d+\.\d+\.\d+$/.test(config.latest_version)) {
      throw new Error('Versiyon formatı hatalı. Format: X.Y.Z (örn: 1.0.0)');
    }
    
    // Netlify Function'a POST isteği gönder
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
    
    showAlert('✅ Kaydedildi!', 'success');
    
    saveBtn.textContent = '✅ Kaydedildi!';
    setTimeout(() => {
      saveBtn.textContent = originalText;
      saveBtn.disabled = false;
    }, 2000);
    
  } catch (error) {
    console.error('Kaydetme hatası:', error);
    showAlert('❌ Hata: ' + error.message, 'error');
    saveBtn.textContent = originalText;
    saveBtn.disabled = false;
  }
}

// Alert gösterme fonksiyonu
function showAlert(message, type = 'info') {
  const alertContainer = document.getElementById('alertContainer');
  
  // Mevcut alert'i kaldır
  const existingAlert = alertContainer.querySelector('.alert');
  if (existingAlert) {
    existingAlert.remove();
  }
  
  // Yeni alert oluştur
  const alert = document.createElement('div');
  alert.className = `alert alert-${type} show`;
  alert.textContent = message;
  
  alertContainer.appendChild(alert);
  
  // 5 saniye sonra otomatik kaldır
  setTimeout(() => {
    alert.classList.remove('show');
    setTimeout(() => {
      alert.remove();
    }, 300);
  }, 5000);
}

// Sayfa yüklendiğinde config'i yükle
document.addEventListener('DOMContentLoaded', function() {
  loadConfig();
});

