# 🧪 Bildirim Sistemi - Test Kılavuzu

Bu kılavuz, admin panelinden test bildirimi ekleyip uygulamada test etme adımlarını içerir.

## 📋 Test Adımları

### 1. Admin Panel'e Giriş

1. https://bambinifojo.github.io/ adresine gidin
2. Sağ üst köşedeki **⚙️ Panel** butonuna tıklayın
3. Admin şifresi ile giriş yapın

### 2. Bildirim Ayarları Bölümüne Git

1. Sol menüden **📢 Bildirim Ayarları** seçeneğine tıklayın
2. Veya URL'den: `https://bambinifojo.github.io/admin.html#notifications`

### 3. Test Bildirimi Ekleme

#### Yöntem 1: Bildirim Ayarları Bölümünden (Önerilen)

1. **Uygulama Seçimi** bölümünde dropdown'dan bir uygulama seçin
   - Örnek: **Task Cosmos** (📱 Task Cosmos)

2. Form alanlarını doldurun:
   - **Son Sürüm**: `1.1.0` (mevcut versiyondan yüksek olmalı)
   - **Zorunlu Güncelleme**: `Hayır` (test için)
   - **Güncelleme Mesajı**: `Test bildirimi - Yeni özellikler eklendi!`
   - **Play Store URL**: Otomatik doldurulur veya manuel girebilirsiniz
   - **Bildirim Aktif mi?**: `Açık` ✅

3. **Süreli Bildirim** (Opsiyonel):
   - **Bildirim Süresi Tipi**: `Saat` veya `Gün` seçin
   - **Bildirim Süresi**: Örnek: `24` (24 saat için)

4. **💾 Kaydet** butonuna tıklayın

5. Başarı mesajını bekleyin: `✅ Bildirim ayarları kaydedildi!`

#### Yöntem 2: Uygulama Düzenleme Formundan

1. Sol menüden **📱 Uygulamalar** seçeneğine tıklayın
2. Test etmek istediğiniz uygulamayı bulun (örn: Task Cosmos)
3. Uygulamanın yanındaki **✏️ Düzenle** butonuna tıklayın
4. Aşağı kaydırın ve **Uygulama Bildirim Ayarları** bölümünü bulun
5. Bildirim ayarlarını doldurun (Yöntem 1'deki gibi)
6. **💾 Kaydet** butonuna tıklayın

### 4. Aktif Bildirimleri Kontrol Etme

1. **Bildirim Ayarları** bölümüne gidin
2. En üstte **⏰ Aktif Bildirimler** listesini kontrol edin
3. Eklediğiniz bildirim listede görünmeli:
   - Uygulama adı
   - Bildirim mesajı
   - Versiyon bilgisi
   - Kalan süre (eğer süreli ise)
   - Durum (Aktif/Süresiz)

### 5. API'den Test Etme

#### GitHub Pages için (JavaScript)

Tarayıcı Console'unda (F12) şu kodu çalıştırın:

```javascript
// getNotifications.js dosyasını yükleyin
const script = document.createElement('script');
script.src = 'https://bambinifojo.github.io/getNotifications.js';
document.head.appendChild(script);

// Script yüklendikten sonra test edin
setTimeout(() => {
  getNotifications({ appId: 'task-cosmos' })
    .then(data => {
      console.log('🔔 Bildirim yanıtı:', data);
      console.log('📱 Uygulama bildirimi:', data.app);
      console.log('✅ Bildirim aktif mi?', data.app?.enabled);
    })
    .catch(error => {
      console.error('❌ Hata:', error);
    });
}, 1000);
```

#### Doğrudan JSON Dosyalarını Okuma

```javascript
// Uygulama bildirimlerini kontrol et
fetch('https://bambinifojo.github.io/data/apps.json')
  .then(res => res.json())
  .then(apps => {
    const taskCosmos = apps.apps.find(a => 
      a.title === 'Task Cosmos' || a.appId === 'task-cosmos'
    );
    console.log('📱 Task Cosmos bildirimi:', taskCosmos?.notification);
    console.log('✅ Aktif mi?', taskCosmos?.notification?.enabled);
    console.log('📦 Versiyon:', taskCosmos?.notification?.latest_version);
    console.log('💬 Mesaj:', taskCosmos?.notification?.update_message);
  });
```

### 6. Android Uygulamasında Test Etme

#### Adım 1: API Endpoint'i Kontrol Et

Android uygulamanızda bildirim API'sini çağıran kodu bulun ve şu URL'yi kullanın:

```kotlin
// Kotlin örneği
val baseUrl = "https://bambinifojo.github.io"
val appId = "task-cosmos" // veya uygulamanızın appId'si

// JSON dosyalarını oku
val configUrl = "$baseUrl/app_config.json"
val appsUrl = "$baseUrl/data/apps.json"

// veya getNotifications.js kullanarak
val apiUrl = "$baseUrl/getNotifications.js"
```

#### Adım 2: Log Kontrolü

Android Studio'da Logcat'i açın ve şu komutu çalıştırın:

```bash
adb logcat | grep "Bildirim\|Notification\|🔔"
```

Veya Android Studio Logcat filtresinde:
```
Bildirim|Notification|🔔
```

#### Adım 3: Bildirim Görüntüleme

1. Android uygulamanızı açın
2. Uygulama açılışında bildirim kontrolü yapılmalı
3. Eğer bildirim aktifse, kullanıcıya gösterilmeli:
   - Güncelleme mesajı
   - Versiyon bilgisi
   - Play Store'a yönlendirme butonu (eğer zorunlu güncelleme ise)

### 7. Test Senaryoları

#### Senaryo 1: Basit Bildirim Testi
- ✅ Bildirim aktif
- ✅ Süresiz
- ✅ Zorunlu güncelleme: Hayır
- ✅ Beklenen: Kullanıcıya bildirim gösterilmeli, kapatılabilir olmalı

#### Senaryo 2: Zorunlu Güncelleme Testi
- ✅ Bildirim aktif
- ✅ Zorunlu güncelleme: Evet
- ✅ Beklenen: Kullanıcı güncellemeden uygulamayı kullanamamalı

#### Senaryo 3: Süreli Bildirim Testi
- ✅ Bildirim aktif
- ✅ Süre: 1 saat
- ✅ Beklenen: 1 saat sonra bildirim otomatik olarak devre dışı kalmalı

#### Senaryo 4: Süresi Dolmuş Bildirim Testi
- ✅ Bildirim aktif
- ✅ Süre: 1 saat (1 saatten önce oluşturulmuş)
- ✅ Beklenen: Bildirim devre dışı olmalı, API'den `enabled: false` dönmeli

### 8. Hata Ayıklama

#### Bildirim Görünmüyor

1. **Admin Panel Kontrolü:**
   - Bildirim aktif mi? (`Bildirim Aktif mi? = Açık`)
   - Versiyon numarası doğru mu? (mevcut versiyondan yüksek olmalı)

2. **API Kontrolü:**
   ```javascript
   // Console'da test edin
   fetch('https://bambinifojo.github.io/data/apps.json')
     .then(res => res.json())
     .then(apps => {
       const app = apps.apps.find(a => a.title === 'Task Cosmos');
       console.log('Bildirim:', app?.notification);
     });
   ```

3. **Android Log Kontrolü:**
   ```bash
   adb logcat | grep "🔔"
   ```

#### Süreli Bildirim Çalışmıyor

1. **Süre Kontrolü:**
   - Başlangıç zamanı doğru mu?
   - Süre tipi doğru mu? (hours/days)
   - Süre değeri doğru mu?

2. **API'den Kontrol:**
   ```javascript
   const app = apps.apps.find(a => a.title === 'Task Cosmos');
   const notification = app?.notification;
   if (notification?.duration) {
     const startTime = new Date(notification.duration.start_time);
     const now = new Date();
     const elapsed = now - startTime;
     const durationMs = notification.duration.type === 'hours' 
       ? notification.duration.value * 60 * 60 * 1000
       : notification.duration.value * 24 * 60 * 60 * 1000;
     console.log('Kalan süre:', durationMs - elapsed, 'ms');
   }
   ```

### 9. Test Checklist

- [ ] Admin panelden bildirim eklendi
- [ ] Aktif bildirimler listesinde görünüyor
- [ ] API'den bildirim dönüyor (`enabled: true`)
- [ ] Android uygulamasında bildirim gösteriliyor
- [ ] Süreli bildirim süresi doğru hesaplanıyor
- [ ] Süre dolduğunda bildirim devre dışı kalıyor
- [ ] Loglar doğru çalışıyor (🔔 ile başlayan loglar)

### 10. Bildirimi Kapatma

1. **Bildirim Ayarları** bölümüne gidin
2. **Aktif Bildirimler** listesinde bildirimi bulun
3. **❌ Kapat** butonuna tıklayın
4. Onay verin
5. Bildirim listeden kaybolmalı

Veya:

1. Uygulama seçin
2. **Bildirim Aktif mi?** = `Kapalı` yapın
3. **💾 Kaydet** butonuna tıklayın

## 📞 Destek

Sorun yaşarsanız:
1. Tarayıcı Console'unda hataları kontrol edin (F12)
2. Android Logcat'te logları kontrol edin
3. API yanıtını kontrol edin
4. Admin Panel'de bildirim ayarlarını kontrol edin

---

**Son Güncelleme:** 2025-01-27  
**Test URL:** https://bambinifojo.github.io/admin.html#notifications

