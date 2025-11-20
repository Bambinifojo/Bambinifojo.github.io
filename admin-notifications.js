// Bildirim Ayarları JavaScript

// Config yükleme
async function loadConfig() {
  try {
    // Netlify'dan yükle (öncelikli)
    const url = "https://bambinifojo.netlify.app/app_config.json?t=" + Date.now();
    let res = await fetch(url);
    
    // Eğer Netlify'da yoksa GitHub'dan dene
    if (!res.ok) {
      const githubUrl = "https://bambinifojo.github.io/app_config.json?t=" + Date.now();
      res = await fetch(githubUrl);
    }
    
    if (!res.ok) {
      throw new Error('Config dosyası yüklenemedi');
    }
    
    const data = await res.json();

    // Form alanlarını doldur
    document.getElementById("latest_version").value = data.latest_version || "1.0.0";
    document.getElementById("force_update").value = String(data.force_update || false);
    document.getElementById("update_message").value = data.update_message || "";

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
    
    showAlert('✅ Ayarlar başarıyla GitHub\'a kaydedildi!', 'success');
    
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

