# 📋 Privacy Policy Sayfaları Oluşturma Rehberi

## ✅ Mevcut Durum

Siteniz Netlify'da deploy edildi ve privacy policy sayfaları çalışıyor:
- **Task Cosmos:** `https://bambinifojo.netlify.app/task-cosmos/privacy-policy.html`
- **GitHub:** Private (kodlar gizli)
- **Netlify:** Public (site herkese açık)

## 🆕 Yeni Uygulama İçin Privacy Policy Oluşturma

### Adım 1: Klasör Oluştur
```
Bambinifojo.github.io/
└── [uygulama-adi]/
    ├── privacy-policy.html
    └── index.html (opsiyonel - detay sayfası)
```

### Adım 2: Privacy Policy Sayfası Oluştur

`[uygulama-adi]/privacy-policy.html` dosyasını oluşturun.

**Template:**
```html
<!DOCTYPE html>
<html lang="tr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Gizlilik Politikası - [Uygulama Adı]</title>
    <link rel="stylesheet" href="../styles.css">
    <!-- Task Cosmos privacy-policy.html dosyasını referans alarak oluşturun -->
</head>
<body>
    <!-- İçerik -->
</body>
</html>
```

### Adım 3: apps.json'da Privacy Linkini Ekle

`data/apps.json` dosyasında uygulamanızın `privacy` alanını güncelleyin:

```json
{
  "title": "Uygulama Adı",
  "privacy": "https://bambinifojo.netlify.app/[uygulama-adi]/privacy-policy.html",
  ...
}
```

### Adım 4: GitHub'a Push ve Netlify Deploy

1. **GitHub'a Push:**
   ```bash
   git add .
   git commit -m "Yeni uygulama privacy policy eklendi"
   git push origin main
   ```

2. **Netlify Otomatik Deploy:**
   - Netlify otomatik olarak deploy edecek
   - Birkaç dakika içinde site güncellenecek

## 📝 Örnek: Weather Pro İçin Privacy Policy

### 1. Klasör Oluştur
```
Bambinifojo.github.io/
└── weather-pro/
    └── privacy-policy.html
```

### 2. apps.json Güncelle
```json
{
  "title": "Weather Pro",
  "privacy": "https://bambinifojo.netlify.app/weather-pro/privacy-policy.html",
  ...
}
```

### 3. Deploy
- GitHub'a push yapın
- Netlify otomatik deploy edecek
- Privacy policy sayfası: `https://bambinifojo.netlify.app/weather-pro/privacy-policy.html`

## 🔗 Privacy Policy Link Formatı

Tüm privacy policy linkleri şu formatta olmalı:
```
https://bambinifojo.netlify.app/[uygulama-adi]/privacy-policy.html
```

## ✅ Avantajlar

1. **Kendi Sitenizde Barındırma:** Privacy policy'ler kendi sitenizde
2. **Kontrol:** İstediğiniz zaman güncelleyebilirsiniz
3. **Güvenlik:** GitHub'da private, Netlify'da public
4. **SEO:** Kendi domain'inizde, SEO için faydalı
5. **Profesyonel:** Uygulamalarınız için merkezi bir yer

## 📌 Notlar

- Privacy policy sayfaları `task-cosmos/privacy-policy.html` dosyasını referans alarak oluşturulabilir
- Her uygulama için ayrı klasör oluşturun
- Admin panelinden uygulama eklerken privacy linkini Netlify URL'si ile güncelleyin

