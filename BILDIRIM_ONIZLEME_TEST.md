# 🧪 Bildirim Önizleme Test Senaryoları

**Tarih:** 2025-01-27  
**Özellik:** Bildirim Önizleme Özelliği

---

## ✅ Test Senaryoları

### 1. Uygulama Bildirimi Önizleme Testi

**Adımlar:**
1. Admin Panel'e giriş yap
2. Bildirim Ayarları bölümüne git
3. Bir uygulama seç
4. Bildirim ayarlarını doldur:
   - Son Sürüm: 1.0.1
   - Güncelleme Mesajı: "Yeni özellikler eklendi!"
   - Bildirim Aktif mi?: Açık
   - Zorunlu Güncelleme: Hayır
5. "Önizle" butonuna tıkla

**Beklenen Sonuç:**
- ✅ Önizleme modal'ı açılmalı
- ✅ Mobil görünüm varsayılan olarak seçili olmalı
- ✅ Versiyon güncelleme dialog'u görünmeli
- ✅ Mesaj doğru görünmeli
- ✅ "Güncelle" butonu görünmeli
- ✅ "Daha Sonra" butonu görünmeli (zorunlu güncelleme kapalıysa)

---

### 2. Zorunlu Güncelleme Önizleme Testi

**Adımlar:**
1. Uygulama bildirim formunda:
   - Zorunlu Güncelleme: Evet
2. "Önizle" butonuna tıkla

**Beklenen Sonuç:**
- ✅ Önizleme modal'ı açılmalı
- ✅ Sadece "Güncelle" butonu görünmeli
- ✅ "Daha Sonra" butonu görünmemeli

---

### 3. Mobil/Desktop Görünüm Değiştirme Testi

**Adımlar:**
1. Önizleme modal'ını aç
2. "Desktop" butonuna tıkla
3. "Mobil" butonuna tıkla

**Beklenen Sonuç:**
- ✅ Görünüm değişmeli
- ✅ Mobil görünümde telefon çerçevesi görünmeli
- ✅ Desktop görünümde daha geniş alan görünmeli
- ✅ Butonlar aktif/pasif durumunu doğru göstermeli

---

### 4. Broadcast Önizleme Testi

**Adımlar:**
1. Genel Bildirim Ayarları bölümünde:
   - Yayın Durumu: Açık
   - Yayın Başlığı: "Yeni Özellikler!"
   - Yayın Mesajı: "Uygulamaya yeni özellikler eklendi"
2. "Yayın Önizle" butonuna tıkla

**Beklenen Sonuç:**
- ✅ Önizleme modal'ı açılmalı
- ✅ Broadcast dialog'u görünmeli (mavi tema)
- ✅ Başlık ve mesaj doğru görünmeli
- ✅ "Tamam" butonu görünmeli

---

### 5. Bakım Modu Önizleme Testi

**Adımlar:**
1. Genel Bildirim Ayarları bölümünde:
   - Bakım Modu: Açık
   - Bakım Mesajı: "Bakım çalışmaları sürüyor"
2. "Bakım Önizle" butonuna tıkla

**Beklenen Sonuç:**
- ✅ Önizleme modal'ı açılmalı
- ✅ Bakım modu dialog'u görünmeli (sarı/turuncu tema)
- ✅ "🔧 Bakım Modu" başlığı görünmeli
- ✅ Mesaj doğru görünmeli
- ✅ "Tamam" butonu görünmeli

---

### 6. Form Validasyonu Testi

**Adımlar:**
1. Uygulama seçmeden "Önizle" butonuna tıkla
2. Bildirim kapalıyken "Önizle" butonuna tıkla
3. Zorunlu alanlar boşken "Önizle" butonuna tıkla

**Beklenen Sonuç:**
- ✅ Uygun hata mesajları gösterilmeli
- ✅ Modal açılmamalı

---

### 7. Modal Kapatma Testi

**Adımlar:**
1. Önizleme modal'ını aç
2. X butonuna tıkla
3. Modal dışına (overlay'e) tıkla
4. ESC tuşuna bas

**Beklenen Sonuç:**
- ✅ X butonu modal'ı kapatmalı
- ✅ Overlay'e tıklayınca modal kapanmalı
- ✅ ESC tuşu modal'ı kapatmalı (eğer implement edildiyse)

---

### 8. Responsive Tasarım Testi

**Adımlar:**
1. Tarayıcı penceresini küçült (mobil boyut)
2. Önizleme modal'ını aç
3. Görünümü kontrol et

**Beklenen Sonuç:**
- ✅ Modal responsive olmalı
- ✅ Mobil görünümde telefon çerçevesi tam görünmeli
- ✅ Butonlar ve içerik düzgün görünmeli

---

## 🐛 Bilinen Sorunlar

Şu anda bilinen bir sorun yok.

---

## 📝 Test Notları

- Test sırasında browser console'u açık tutun
- Farklı bildirim tiplerini test edin
- Mobil ve desktop görünümlerini karşılaştırın
- Form validasyonlarını kontrol edin

---

## ✅ Test Checklist

- [ ] Uygulama bildirimi önizleme
- [ ] Zorunlu güncelleme önizleme
- [ ] Mobil/Desktop görünüm değiştirme
- [ ] Broadcast önizleme
- [ ] Bakım modu önizleme
- [ ] Form validasyonu
- [ ] Modal kapatma
- [ ] Responsive tasarım
- [ ] HTML escape (XSS koruması)
- [ ] Farklı mesaj uzunlukları

---

**Son Güncelleme:** 2025-01-27

