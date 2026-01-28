# EmailJS Kurulum Rehberi

AI Asistan chat mesajlarını otomatik olarak e-postaya göndermek için EmailJS kurulumu.

## 📋 Adımlar

### 1. EmailJS Hesabı Oluştur
1. [EmailJS](https://www.emailjs.com/) sitesine git
2. Ücretsiz hesap oluştur (200 email/ay ücretsiz)
3. Email Service ekle (Gmail, Outlook, vb.)

### 2. Email Service Ekleme
1. EmailJS Dashboard → **Email Services**
2. **Add New Service** butonuna tıkla
3. Gmail veya Outlook seç
4. Gmail için: Google hesabınızla giriş yapın ve izin verin
5. Service ID'yi kopyala (örn: `service_xxxxx`)

### 3. Email Template Oluşturma
1. EmailJS Dashboard → **Email Templates**
2. **Create New Template** butonuna tıkla
3. Template adı: `AI Chat Messages`
4. Template içeriği:

```
Konu: {{subject}}

Yeni AI Asistan Sohbet Mesajı

Kullanıcı Mesajı:
{{user_message}}

AI Yanıtı:
{{ai_response}}

Tarih: {{timestamp}}
Site: {{site_url}}

---
Bu mesaj otomatik olarak gönderilmiştir.
```

5. Template ID'yi kopyala (örn: `template_xxxxx`)

### 4. Public Key Alma
1. EmailJS Dashboard → **Account** → **General**
2. **Public Key**'i kopyala

### 5. Admin Panelinde Ayarlama
1. Admin Panel → **AI Asistan Ayarları**
2. **E-posta Entegrasyonu** bölümüne git
3. **E-posta Gönderimini Aktif Et** checkbox'ını işaretle
4. Bilgileri doldur:
   - **Service ID**: `service_xxxxx`
   - **Template ID**: `template_xxxxx`
   - **Public Key**: `xxxxxxxxxxxxx`
   - **Alıcı E-posta**: `bambinifojo@gmail.com`
5. **Kaydet** butonuna tıkla

## ✅ Test Etme

1. Ana sayfada AI Asistan'ı aç
2. Bir mesaj gönder
3. E-postanı kontrol et (1-2 dakika içinde gelir)

## 🔧 Sorun Giderme

- **E-posta gelmiyor**: EmailJS Dashboard'da "Logs" bölümünden hataları kontrol et
- **Service ID hatası**: Email Service'in aktif olduğundan emin ol
- **Template hatası**: Template ID'nin doğru olduğundan emin
- **Public Key hatası**: Public Key'in doğru kopyalandığından emin

## 📧 Template Değişkenleri

EmailJS template'inde kullanabileceğiniz değişkenler:

- `{{subject}}` - E-posta konusu
- `{{user_message}}` - Kullanıcının gönderdiği mesaj
- `{{ai_response}}` - AI'ın verdiği yanıt
- `{{timestamp}}` - Mesaj zamanı
- `{{site_url}}` - Site URL'i
- `{{to_email}}` - Alıcı e-posta adresi

## 💡 İpuçları

- Gmail kullanıyorsanız, "Less secure app access" açık olmalı (veya App Password kullanın)
- Günlük e-posta limitini kontrol edin (ücretsiz plan: 200 email/ay)
- Spam klasörünü kontrol edin
