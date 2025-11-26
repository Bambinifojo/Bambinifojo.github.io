# 📱 Admin Panel'den Bildirim Ekleme - Adım Adım Kılavuz

Bu kılavuz, admin panelinden uygulama seçip bildirim ekleme işlemini adım adım açıklar.

## 🎯 Hızlı Başlangıç

### Adım 1: Admin Panel'e Giriş

1. Tarayıcınızda şu adrese gidin:
   ```
   https://bambinifojo.github.io/admin.html
   ```

2. Admin şifrenizi girin ve giriş yapın

### Adım 2: Bildirim Ayarları Bölümüne Git

1. Sol menüden **📢 Bildirim Ayarları** seçeneğine tıklayın
2. Veya doğrudan şu URL'ye gidin:
   ```
   https://bambinifojo.github.io/admin.html#notifications
   ```

### Adım 3: Uygulama Seçimi

1. **📱 Uygulama Seçimi** bölümünü bulun
2. **"Uygulama Seç *"** dropdown menüsünden bir uygulama seçin
   - Örnek: **📱 Task Cosmos**
   - Dropdown'da tüm uygulamalarınız listelenir

3. Uygulama seçildikten sonra form alanları otomatik olarak görünür

### Adım 4: Bildirim Ayarlarını Doldur

#### Versiyon Yönetimi

1. **Son Sürüm ***
   - Format: `X.Y.Z` (örn: `1.0.0`, `1.2.5`, `2.0.0`)
   - Örnek: `1.1.0`
   - ⚠️ **Önemli:** Mevcut uygulama versiyonundan yüksek olmalı

2. **Zorunlu Güncelleme**
   - `Hayır`: Kullanıcı bildirimi kapatabilir, uygulamayı kullanmaya devam edebilir
   - `Evet`: Kullanıcı güncellemeden uygulamayı kullanamaz
   - Test için genellikle `Hayır` seçilir

3. **Güncelleme Mesajı ***
   - Kullanıcılara gösterilecek mesaj
   - Örnek: `Yeni özellikler eklendi! 🚀 Performans iyileştirmeleri ve hata düzeltmeleri içeriyor.`
   - ⚠️ **Önemli:** Bu alan zorunludur

4. **Play Store URL**
   - Otomatik olarak uygulamanın Play Store linki doldurulur
   - İsterseniz manuel olarak değiştirebilirsiniz
   - Örnek: `https://play.google.com/store/apps/details?id=com.taskcosmos.app`

#### Bildirim Durumu

5. **Bildirim Aktif mi? ***
   - `Kapalı`: Bildirim gösterilmez
   - `Açık`: Bildirim aktif, kullanıcılara gösterilir
   - Test için `Açık` seçin

#### Süreli Bildirim (Opsiyonel)

6. **Bildirim Süresi Tipi**
   - `Süresiz`: Bildirim süresiz olarak aktif kalır
   - `Saat`: Bildirim belirli saat sonra otomatik kapanır
   - `Gün`: Bildirim belirli gün sonra otomatik kapanır

7. **Bildirim Süresi** (Saat veya Gün seçildiyse)
   - Sayısal değer girin
   - Örnek: `24` (24 saat için) veya `7` (7 gün için)
   - ⚠️ **Not:** Süre tipi seçildikten sonra bu alan görünür

### Adım 5: Bildirimi Kaydet

1. Tüm zorunlu alanları doldurduğunuzdan emin olun
2. **💾 Kaydet** butonuna tıklayın
3. Bekleyin:
   - Buton "⏳ Kaydediliyor..." olarak değişir
   - Başarılı olursa "✅ Kaydedildi!" mesajı görünür
   - Hata olursa hata mesajı gösterilir

### Adım 6: Bildirimi Kontrol Et

1. Sayfanın en üstünde **⏰ Aktif Bildirimler** bölümünü kontrol edin
2. Eklediğiniz bildirim listede görünmeli:
   - ✅ Uygulama adı
   - ✅ Bildirim mesajı
   - ✅ Versiyon bilgisi
   - ✅ Kalan süre (eğer süreli ise)
   - ✅ Durum (Aktif/Süresiz)

## 📋 Örnek Senaryolar

### Senaryo 1: Basit Test Bildirimi

**Amaç:** Hızlı test için basit bir bildirim

**Ayarlar:**
- Uygulama: Task Cosmos
- Son Sürüm: `1.1.0`
- Zorunlu Güncelleme: `Hayır`
- Güncelleme Mesajı: `Test bildirimi - Yeni özellikler eklendi!`
- Bildirim Aktif mi?: `Açık`
- Bildirim Süresi Tipi: `Süresiz`

**Sonuç:** Bildirim hemen aktif olur, süresiz olarak gösterilir.

### Senaryo 2: Zorunlu Güncelleme Bildirimi

**Amaç:** Kritik güncelleme için zorunlu bildirim

**Ayarlar:**
- Uygulama: Task Cosmos
- Son Sürüm: `2.0.0`
- Zorunlu Güncelleme: `Evet` ⚠️
- Güncelleme Mesajı: `Önemli güvenlik güncellemesi! Lütfen uygulamayı hemen güncelleyin.`
- Bildirim Aktif mi?: `Açık`
- Bildirim Süresi Tipi: `Süresiz`

**Sonuç:** Kullanıcılar güncellemeden uygulamayı kullanamaz.

### Senaryo 3: Süreli Bildirim (24 Saat)

**Amaç:** Sınırlı süreli kampanya bildirimi

**Ayarlar:**
- Uygulama: Task Cosmos
- Son Sürüm: `1.1.0`
- Zorunlu Güncelleme: `Hayır`
- Güncelleme Mesajı: `Özel kampanya! İlk 24 saatte %50 indirim!`
- Bildirim Aktif mi?: `Açık`
- Bildirim Süresi Tipi: `Saat`
- Bildirim Süresi: `24`

**Sonuç:** Bildirim 24 saat boyunca aktif kalır, sonra otomatik kapanır.

### Senaryo 4: Haftalık Bildirim (7 Gün)

**Amaç:** Hafta boyunca gösterilecek bildirim

**Ayarlar:**
- Uygulama: Task Cosmos
- Son Sürüm: `1.1.0`
- Zorunlu Güncelleme: `Hayır`
- Güncelleme Mesajı: `Yeni hafta, yeni görevler! Hemen kontrol edin.`
- Bildirim Aktif mi?: `Açık`
- Bildirim Süresi Tipi: `Gün`
- Bildirim Süresi: `7`

**Sonuç:** Bildirim 7 gün boyunca aktif kalır, sonra otomatik kapanır.

## 🔧 Bildirimi Düzenleme

1. **Aktif Bildirimler** listesinde bildirimi bulun
2. **✏️ Düzenle** butonuna tıklayın
3. Form otomatik olarak doldurulur
4. İstediğiniz değişiklikleri yapın
5. **💾 Kaydet** butonuna tıklayın

## ❌ Bildirimi Kapatma

### Yöntem 1: Aktif Bildirimler Listesinden

1. **Aktif Bildirimler** listesinde bildirimi bulun
2. **❌ Kapat** butonuna tıklayın
3. Onay verin
4. Bildirim listeden kaybolur

### Yöntem 2: Form'dan

1. Uygulamayı seçin
2. **Bildirim Aktif mi?** = `Kapalı` yapın
3. **💾 Kaydet** butonuna tıklayın

## ⚠️ Önemli Notlar

### Versiyon Formatı
- ✅ Doğru: `1.0.0`, `1.2.5`, `2.0.0`
- ❌ Yanlış: `1.0`, `v1.0.0`, `1.0.0.0`

### Versiyon Kontrolü
- Bildirim versiyonu, uygulamanın mevcut versiyonundan **yüksek** olmalı
- Örnek: Uygulama `1.0.0` ise, bildirim `1.0.1` veya daha yüksek olmalı

### Süreli Bildirimler
- Süre başlangıç zamanı otomatik olarak kaydedilir
- Süre dolduğunda bildirim otomatik olarak devre dışı kalır
- Kalan süre **Aktif Bildirimler** listesinde gösterilir

### Bildirim Önceliği
1. **Bakım Modu** (en yüksek öncelik)
2. **Uygulama Bazlı Bildirim**
3. **Genel Versiyon Bildirimi**
4. **Broadcast** (en düşük öncelik)

## 🐛 Sorun Giderme

### Bildirim Görünmüyor

1. **Bildirim Aktif mi?** = `Açık` olduğundan emin olun
2. Versiyon numarasının doğru format olduğunu kontrol edin
3. **Aktif Bildirimler** listesinde bildirimi kontrol edin
4. Süreli bildirim ise, süresinin dolmadığını kontrol edin

### Form Kaydedilmiyor

1. Tüm zorunlu alanların doldurulduğundan emin olun (* işaretli alanlar)
2. Versiyon formatının doğru olduğunu kontrol edin
3. Console'da hata mesajlarını kontrol edin (F12)
4. İnternet bağlantınızı kontrol edin

### Süreli Bildirim Çalışmıyor

1. Süre tipinin doğru seçildiğinden emin olun (Saat/Gün)
2. Süre değerinin girildiğinden emin olun
3. **Aktif Bildirimler** listesinde kalan süreyi kontrol edin
4. Başlangıç zamanının doğru kaydedildiğini kontrol edin

## 📞 Destek

Sorun yaşarsanız:
1. Tarayıcı Console'unu açın (F12)
2. Hata mesajlarını kontrol edin
3. **Aktif Bildirimler** listesini kontrol edin
4. API yanıtını test edin (Test kılavuzuna bakın)

---

**Son Güncelleme:** 2025-01-27  
**Admin Panel URL:** https://bambinifojo.github.io/admin.html#notifications

