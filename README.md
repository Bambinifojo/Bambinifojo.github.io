# 🚀 Bambinifojo Portfolio Website

Modern, responsive ve özellik dolu portfolio web sitesi. GitHub Pages üzerinde yayınlanmaktadır.

## 🌐 Canlı Site

**https://bambinifojo.github.io/**

## ✨ Özellikler

### 🎨 Tasarım
- ✅ Modern ve responsive tasarım
- ✅ Dark/Light mode toggle
- ✅ Gradient arka planlar
- ✅ Smooth scroll animasyonları
- ✅ Particle efektleri
- ✅ Parallax scroll efektleri

### 📱 Bölümler
- **Hero Section** - Tanıtım ve istatistikler
- **Hakkımda** - Misyon, vizyon ve yaklaşım
- **Teknolojiler & Yetenekler** - Skill progress bar'ları
- **Uygulamalar** - Uygulama kartları (JSON'dan yüklenir)
- **İletişim** - İletişim formu

### 🛠️ Teknik Özellikler
- Pure HTML, CSS, JavaScript
- JSON tabanlı uygulama yönetimi
- Intersection Observer API
- LocalStorage tema desteği
- Responsive design
- SEO friendly

## 📁 Dosya Yapısı

```
Bambinifojo.github.io/
├── index.html              # Ana sayfa
├── styles.css              # Stil dosyası
├── scripts.js              # JavaScript dosyası
├── admin.html              # Admin paneli
├── admin.js                # Admin panel script
├── package.json            # NPM yapılandırması
├── build.js                # Build script
├── validate.js             # Validasyon script
├── data/
│   └── apps.json          # Uygulama verileri
└── task-cosmos/
    └── privacy-policy.html # Task Cosmos gizlilik politikası
```

## 🚀 Kurulum ve Kullanım

### Gereksinimler
- Node.js (opsiyonel, sadece build için)
- Git

### Yerel Geliştirme

```bash
# Bağımlılıkları yükle
npm install

# Build ve validasyon
npm run build

# Validasyon
npm run validate

# Local server başlat
npm run serve
```

### GitHub'a Deploy

```bash
# Değişiklikleri ekle
git add .

# Commit yap
git commit -m "Açıklama"

# GitHub'a push
git push origin main
```

GitHub Pages otomatik olarak deploy edecektir.

## 📝 Uygulama Ekleme

Uygulamalar `data/apps.json` dosyasından yönetilir:

```json
{
  "apps": [
    {
      "title": "Uygulama Adı",
      "description": "Açıklama",
      "icon": "📱",
      "privacy": "Gizlilik politikası URL",
      "details": "Detay sayfası URL"
    }
  ]
}
```

Admin paneli (`admin.html`) ile de uygulama eklenebilir.

## 🎨 Özelleştirme

### Renkler
`styles.css` dosyasındaki CSS değişkenlerini düzenleyin:

```css
:root {
    --primary-color: #6a5acd;
    --secondary-color: #483d8b;
    --background-gradient: linear-gradient(135deg, #483d8b, #6a5acd, #9370db);
}
```

### İçerik
- Hero section: `index.html` içinde
- Hakkımda: `index.html` içinde
- Yetenekler: `index.html` içinde
- Uygulamalar: `data/apps.json` dosyasında

## 📱 Responsive

Site tüm cihazlarda responsive çalışır:
- 📱 Mobil (320px+)
- 📱 Tablet (768px+)
- 💻 Desktop (1024px+)

## 🔧 Build Komutları

```bash
npm run build      # Build ve kontrol
npm run validate   # Site validasyonu
npm run serve      # Local server (port 8080)
```

## 📄 Lisans

MIT License

## 👤 Yazar

**Bambinifojo**
- GitHub: [@Bambinifojo](https://github.com/Bambinifojo)
- Website: https://bambinifojo.github.io/

## 🙏 Teşekkürler

Modern web teknolojileri kullanılarak geliştirilmiştir.

