# 🧪 Bildirim Sistemi - Test ve Debug Kılavuzu

Bu dokümantasyon, bildirim sistemini test etmek ve debug yapmak için gerekli bilgileri içerir.

**Proje URL:** https://bambinifojo.github.io/  
**GitHub Pages Uyumlu:** ✅ Evet (Client-Side JavaScript kullanılıyor)

## 📡 Sunucu Endpoint'i (Test İçin)

### GitHub Pages (Önerilen)

GitHub Pages için client-side JavaScript kullanın:

#### 1. JavaScript Fonksiyonu (Önerilen)
```javascript
// getNotifications.js dosyasını sayfanıza ekleyin
<script src="https://bambinifojo.github.io/getNotifications.js"></script>

// Kullanım
getNotifications({ appId: 'task-cosmos' })
  .then(data => console.log(data))
  .catch(error => console.error('Hata:', error));
```

#### 2. Doğrudan JSON Dosyalarını Okuma
```javascript
// Genel bildirimler
fetch('https://bambinifojo.github.io/app_config.json')
  .then(res => res.json())
  .then(config => console.log(config));

// Uygulama bildirimleri
fetch('https://bambinifojo.github.io/data/apps.json')
  .then(res => res.json())
  .then(apps => {
    const app = apps.apps.find(a => a.appId === 'task-cosmos');
    console.log(app?.notification);
  });
```

### Netlify (Alternatif)

Eğer Netlify kullanıyorsanız:
```
https://bambinifojo.netlify.app/.netlify/functions/getNotifications?appId=task-cosmos
```

### Test Yöntemleri

#### 1. JavaScript Fonksiyonu ile Test (GitHub Pages - Önerilen)
```html
<!-- HTML sayfanıza ekleyin -->
<script src="https://bambinifojo.github.io/getNotifications.js"></script>
<script>
  // Kullanım
  getNotifications({ appId: 'task-cosmos' })
    .then(data => {
      console.log('🔔 Bildirim yanıtı:', data);
    })
    .catch(error => {
      console.error('❌ Hata:', error);
    });
</script>
```

#### 2. Doğrudan JSON Dosyalarını Okuma (GitHub Pages)
```javascript
// Genel bildirimler
fetch('https://bambinifojo.github.io/app_config.json')
  .then(res => res.json())
  .then(config => console.log('Genel config:', config));

// Uygulama bildirimleri
fetch('https://bambinifojo.github.io/data/apps.json')
  .then(res => res.json())
  .then(apps => {
    const app = apps.apps.find(a => a.appId === 'task-cosmos');
    console.log('Uygulama bildirimi:', app?.notification);
  });
```

#### 3. cURL ile Test (JSON Dosyaları)
```bash
# Genel bildirimler
curl "https://bambinifojo.github.io/app_config.json"

# Uygulama bildirimleri
curl "https://bambinifojo.github.io/data/apps.json"
```

#### 4. Netlify Functions ile Test (Eğer Netlify kullanıyorsanız)
```bash
curl "https://bambinifojo.netlify.app/.netlify/functions/getNotifications?appId=task-cosmos"
```

```javascript
fetch('https://bambinifojo.netlify.app/.netlify/functions/getNotifications?appId=task-cosmos')
  .then(response => response.json())
  .then(data => console.log(data))
  .catch(error => console.error('Hata:', error));
```

### Örnek Yanıt
```json
{
  "general": {
    "maintenance": {
      "enabled": false,
      "message": ""
    },
    "broadcast": {
      "enabled": false,
      "title": "",
      "message": ""
    },
    "version": {
      "latest_version": "1.0.0",
      "force_update": false,
      "update_message": ""
    }
  },
  "app": {
    "enabled": true,
    "latest_version": "1.2.0",
    "force_update": false,
    "update_message": "Yeni özellikler eklendi!"
  }
}
```

## 🔍 Loglardan Kontrol (Geliştirici)

### Android

#### Log Filtreleme Komutu
```bash
adb logcat | grep "Bildirim\|Notification\|🔔"
```

#### Detaylı Log Filtreleme
```bash
# Sadece bildirim logları
adb logcat | grep -i "bildirim\|notification"

# Bell emoji ile başlayan loglar
adb logcat | grep "🔔"

# Hata logları
adb logcat | grep -E "ERROR|🔔.*[Ee]rror"
```

#### Örnek Log Çıktısı
```
🔔 Bildirim kontrolü başlatıldı: appId=task-cosmos
🔔 Bildirim yanıtı alındı: maintenance=false, broadcast=false
🔔 Versiyon kontrolü: mevcut=1.0.0, güncel=1.2.0
🔔 Güncelleme mevcut, kullanıcıya gösteriliyor
```

### Web

#### Tarayıcı Console
1. Tarayıcı Developer Tools'u açın (F12)
2. Console sekmesine gidin
3. 🔔 ile başlayan logları arayın

#### Console Filtreleme
```javascript
// Console'da filtreleme için
console.log('%c🔔 Bildirim API çağrısı', 'color: #667eea; font-weight: bold');
```

#### Örnek Console Log (GitHub Pages)
```javascript
🔔 Bildirim API çağrısı: getNotifications({ appId: 'task-cosmos' })
🔔 Bildirim yanıtı: {general: {...}, app: {...}}
🔔 Bakım modu: false
🔔 Broadcast: false
🔔 Versiyon kontrolü: güncelleme mevcut
```

#### Örnek Console Log (Netlify)
```javascript
🔔 Bildirim API çağrısı: https://bambinifojo.netlify.app/.netlify/functions/getNotifications?appId=task-cosmos
🔔 Bildirim yanıtı: {general: {...}, app: {...}}
```

## 📝 Log Formatı

### Log Emoji'leri
- 🔔 - Genel bildirim logları
- ✅ - Başarılı işlemler
- ❌ - Hata durumları
- ⚠️ - Uyarılar
- ℹ️ - Bilgilendirme

### Log Mesaj Formatı
```
🔔 [Kategori] Mesaj: Detaylar
```

Örnekler:
- `🔔 Bildirim kontrolü başlatıldı: appId=task-cosmos`
- `✅ Bildirim başarıyla gösterildi`
- `❌ Bildirim API hatası: Network error`
- `⚠️ Bildirim süresi dolmak üzere: 1 saat kaldı`

## 🐛 Hata Ayıklama İpuçları

### API Yanıt Vermiyor
1. İnternet bağlantısını kontrol edin
2. API endpoint'in doğru olduğundan emin olun
3. CORS hatalarını kontrol edin
4. Tarayıcı console'unda veya logcat'te hata mesajlarını kontrol edin

### Bildirimler Gösterilmiyor
1. `appId` veya `appPackage` parametresinin doğru olduğundan emin olun
2. Admin Panel'de bildirimin aktif olduğunu kontrol edin
3. Versiyon numaralarının doğru format olduğunu kontrol edin
4. Loglardan bildirim yanıtını kontrol edin (🔔 ile başlayan loglar)
5. Süreli bildirimlerin süresinin dolmadığını kontrol edin

### Süreli Bildirimler
- Bildirim süresi dolduğunda otomatik olarak devre dışı kalır
- Süre kontrolü için `duration.start_time` ve `duration.value` alanlarını kontrol edin
- Süre tipi `hours` veya `days` olabilir
- Kalan süreyi hesaplamak için: `start_time + duration - current_time`

## 🔧 Test Senaryoları

### Senaryo 1: Genel Bildirim Testi (GitHub Pages)
```javascript
// JavaScript ile
fetch('https://bambinifojo.github.io/app_config.json')
  .then(res => res.json())
  .then(config => console.log('Genel bildirimler:', config));

// cURL ile
curl "https://bambinifojo.github.io/app_config.json"
```

### Senaryo 2: Uygulama Bazlı Bildirim Testi (GitHub Pages)
```javascript
// JavaScript ile
getNotifications({ appId: 'task-cosmos' })
  .then(data => console.log('Uygulama bildirimi:', data.app));

// veya doğrudan JSON'dan
fetch('https://bambinifojo.github.io/data/apps.json')
  .then(res => res.json())
  .then(apps => {
    const app = apps.apps.find(a => a.appId === 'task-cosmos');
    console.log('Bildirim:', app?.notification);
  });
```

### Senaryo 3: Netlify Functions ile Test
```bash
curl "https://bambinifojo.netlify.app/.netlify/functions/getNotifications?appId=task-cosmos"
```

### Senaryo 3: Süreli Bildirim Testi
1. Admin Panel'den süreli bildirim oluşturun (örn: 1 saat)
2. API'yi çağırın ve `duration` alanını kontrol edin
3. Süre dolduktan sonra tekrar çağırın, `enabled: false` olmalı

## 📞 Destek

Sorularınız için: bambinifojo@gmail.com

