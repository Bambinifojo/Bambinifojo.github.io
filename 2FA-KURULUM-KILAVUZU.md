# 🔐 İki Faktörlü Doğrulama (2FA) Kurulum Kılavuzu

## 📱 Adım Adım Kurulum

### 1️⃣ Google Authenticator Uygulamasını İndirin

**Android için:**
- Google Play Store'dan "Google Authenticator" uygulamasını indirin
- Alternatif: "Microsoft Authenticator" veya "Authy" de kullanabilirsiniz

**iPhone için:**
- App Store'dan "Google Authenticator" uygulamasını indirin
- Alternatif: "Microsoft Authenticator" veya "Authy" de kullanabilirsiniz

### 2️⃣ Admin Paneline Giriş Yapın

1. Ana sayfadan **Admin Paneli** butonuna tıklayın
2. Veya direkt `admin-login.html` sayfasına gidin
3. İlk kez giriş yapıyorsanız, **QR Kod kurulum ekranı** otomatik açılacak

### 3️⃣ QR Kodu Tarayın

1. Telefonunuzdaki **Google Authenticator** uygulamasını açın
2. **"+"** (Ekle) butonuna tıklayın
3. **"QR kod tarayarak ekle"** seçeneğini seçin
4. Bilgisayar ekranındaki **QR kodu** telefonunuzla tarayın
5. Hesap başarıyla eklenecek ve 6 haneli kod görünecek

### 4️⃣ Kurulumu Doğrulayın

1. Telefonunuzdaki uygulamada görünen **6 haneli kodu** girin
2. **"✅ Doğrula ve Kaydet"** butonuna tıklayın
3. Başarılı mesajı görünce kurulum tamamlanmıştır!

### 5️⃣ Normal Giriş (Kurulum Sonrası)

Artık her girişte:
1. **Şifrenizi** girin (varsayılan: `admin123`)
2. Telefonunuzdaki **6 haneli doğrulama kodunu** girin
3. **"🔓 Giriş Yap"** butonuna tıklayın

---

## 🔧 Manuel Kurulum (QR Kod Tarayamazsanız)

Eğer QR kod tarayamıyorsanız:

1. Kurulum ekranındaki **"Manuel Anahtar"** bölümündeki kodu kopyalayın
2. Google Authenticator'da **"+"** → **"Manuel olarak giriş yap"** seçin
3. **Hesap adı:** `Bambinifojo Admin`
4. **Anahtar:** Kopyaladığınız kodu yapıştırın
5. **Tür:** `Zaman bazlı` seçin
6. **Ekle** butonuna tıklayın

---

## ⚠️ Önemli Notlar

- **Kodlar 30 saniyede bir değişir** - Her zaman güncel kodu kullanın
- **Secret key'i güvenli tutun** - Telefonunuzu kaybederseniz bu anahtarla yeniden ekleyebilirsiniz
- **2FA'yı atlamak:** İlk kurulumda "⏭️ Şimdilik Atla" seçeneği var ama **güvenlik için önerilmez**
- **Telefon değiştirme:** Yeni telefona geçerken secret key'i kullanarak yeniden ekleyin

---

## 🔄 2FA'yı Sıfırlama

Eğer telefonunuzu kaybettiyseniz veya 2FA'yı kaldırmak istiyorsanız:

1. Tarayıcınızın **Developer Tools**'unu açın (F12)
2. **Console** sekmesine gidin
3. Şu komutu çalıştırın:
   ```javascript
   localStorage.removeItem('admin2FASecret');
   localStorage.removeItem('admin2FAEnabled');
   ```
4. Sayfayı yenileyin (F5)
5. Kurulum ekranı tekrar açılacak

---

## 📞 Sorun Giderme

**Kod çalışmıyor:**
- Telefonunuzun saatini kontrol edin (otomatik saat açık olmalı)
- Kodun süresi dolmuş olabilir, yeni kodu bekleyin (30 saniye)
- Secret key'in doğru girildiğinden emin olun

**QR kod görünmüyor:**
- Manuel kurulum yöntemini kullanın
- Tarayıcınızın JavaScript'inin açık olduğundan emin olun

**Uygulama kod üretmiyor:**
- Uygulamayı kapatıp açın
- İnternet bağlantınızı kontrol edin (kodlar offline çalışır ama ilk kurulum için gerekli)

---

## ✅ Kurulum Başarılı!

Artık admin paneliniz **Google benzeri 2FA** ile korunuyor! 🎉

Her girişte hem şifreniz hem de telefonunuzdaki kod gerekecek.


