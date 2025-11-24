# Güncelleme Modal Sistemi - Kullanım Kılavuzu

## 📋 Yapılan Değişiklikler Özeti

### 1. Version.json Dosyası
- ✅ `task-cosmos/version.json` dosyası oluşturuldu
- ✅ Android uygulaması bu dosyayı kontrol edecek

### 2. Admin Panel Güncellemeleri
- ✅ `play_store_url` alanı eklendi
- ✅ Version.json otomatik güncelleniyor

### 3. Netlify Function
- ✅ Hem `app_config.json` hem `version.json` güncelleniyor

## 🚀 Nasıl Kullanılır?

### Adım 1: Değişiklikleri Commit Et

```bash
# Tüm değişiklikleri kontrol et
git status

# Değişiklikleri stage'e al
git add .

# Commit et
git commit -m "Güncelleme modal sistemi: version.json eklendi, play_store_url desteği"

# GitHub'a push et
git push origin main
```

### Adım 2: Netlify'da Deploy Kontrolü

1. Netlify dashboard'a git: https://app.netlify.com
2. Site deploy durumunu kontrol et
3. Deploy tamamlandıktan sonra test et

### Adım 3: Admin Panel'den Test Et

1. **Admin Panel'e Giriş Yap**
   - `https://bambinifojo.github.io/admin-login.html` veya
   - `https://bambinifojo.netlify.app/admin-login.html`

2. **Bildirim Ayarlarına Git**
   - Admin panel'de "Bildirimler" bölümüne git
   - Veya direkt: `admin-notifications.html`

3. **Version Ayarlarını Güncelle**
   - **Son Sürüm**: Örn: `1.1.0`
   - **Zorunlu Güncelleme**: Hayır/Evet
   - **Güncelleme Mesajı**: Kullanıcılara gösterilecek mesaj
   - **Play Store URL**: Uygulamanın Play Store linki

4. **Kaydet**
   - "Kaydet" butonuna tıkla
   - Başarı mesajını bekle

### Adım 4: Dosyaları Kontrol Et

1. **GitHub'da Kontrol Et**
   - `app_config.json` dosyası güncellenmiş olmalı
   - `task-cosmos/version.json` dosyası oluşturulmuş/güncellenmiş olmalı

2. **URL'leri Test Et**
   - `https://bambinifojo.netlify.app/app_config.json`
   - `https://bambinifojo.github.io/task-cosmos/version.json`

### Adım 5: Android Uygulamasında Test

1. **Version.json'ı Kontrol Et**
   - Android uygulaması şu URL'leri kontrol eder:
     - `REACT_APP_VERSION_CHECK_URL` (ortam değişkeni)
     - `https://bambinifojo.github.io/task-cosmos/version.json` ✅
     - Netlify Functions (yedek)
     - Test sunucusu (geliştirme)

2. **Güncelleme Kontrolü**
   - Uygulama açıldığında version.json'ı kontrol eder
   - Mevcut versiyon < latest_version ise:
     - **Test modu değilse**: Modal gösterilir
     - **Test modundaysa**: Sadece bildirim gönderilir

3. **Modal Davranışı**
   - `force_update: false` → Kullanıcı "Daha Sonra" diyebilir
   - `force_update: true` → Modal kapatılamaz, Play Store'a yönlendirir

## 🔧 Teknik Detaylar

### Version.json Formatı

```json
{
  "latest_version": "1.1.0",
  "update_message": "Yeni özellikler eklendi! 🚀",
  "force_update": false,
  "play_store_url": "https://play.google.com/store/apps/details?id=com.taskcosmos.app"
}
```

### App_config.json Formatı

```json
{
  "latest_version": "1.1.0",
  "force_update": false,
  "update_message": "Yeni özellikler eklendi! 🚀",
  "play_store_url": "https://play.google.com/store/apps/details?id=com.taskcosmos.app",
  "broadcast_enabled": false,
  "broadcast_title": "Yeni Görev Yayınlandı!",
  "broadcast_message": "Yeni gezegen görevleri seni bekliyor!",
  "maintenance": false,
  "maintenance_message": "Bakım modu aktif. Lütfen daha sonra tekrar deneyin."
}
```

### Netlify Function Çalışma Mantığı

1. Admin panel'den form gönderilir
2. `/.netlify/functions/updateConfig` endpoint'ine POST isteği gider
3. Function hem `app_config.json` hem `version.json` dosyalarını günceller
4. GitHub'a commit edilir
5. GitHub Pages ve Netlify otomatik deploy eder

## ⚠️ Önemli Notlar

1. **GitHub Token Gerekli**
   - Netlify Function'ın çalışması için GitHub token gerekli
   - Netlify environment variables'da `GITHUB_TOKEN` tanımlı olmalı

2. **Deploy Süresi**
   - GitHub Pages deploy: 1-2 dakika
   - Netlify deploy: 30 saniye - 1 dakika
   - Değişikliklerin yansıması için biraz bekle

3. **CORS Sorunları**
   - GitHub Pages'den direkt fetch yaparken CORS sorunu olabilir
   - Bu yüzden Netlify Functions kullanılıyor

4. **Test Modu**
   - Android uygulamasında test modu aktifse modal gösterilmez
   - Sadece bildirimler gönderilir
   - Bu Android uygulaması tarafında kontrol edilir

## 🐛 Sorun Giderme

### Version.json Güncellenmiyor
- Netlify Function loglarını kontrol et
- GitHub token'ın doğru olduğundan emin ol
- GitHub repository'de dosyanın oluşturulduğunu kontrol et

### Modal Gösterilmiyor
- Android uygulamasında test modu kapalı mı kontrol et
- Version.json'ın doğru formatta olduğunu kontrol et
- Network isteklerini kontrol et (version.json yükleniyor mu?)

### Play Store URL Çalışmıyor
- URL formatının doğru olduğundan emin ol
- Android uygulamasında URL parsing'i kontrol et

## 📞 Destek

Sorun yaşarsanız:
1. Netlify Function loglarını kontrol edin
2. GitHub repository'deki dosyaları kontrol edin
3. Browser console'da hataları kontrol edin
4. Android uygulaması loglarını kontrol edin

