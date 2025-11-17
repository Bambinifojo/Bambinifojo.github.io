# Bambinifojo GitHub Pages Sitesi

Bu repository, Bambinifojo'nun uygulamalarını tanıtan ana sayfa sitesini içerir.

## 🚀 Sitenizi Yayınlama Adımları

### 1. GitHub'da Repository Oluşturun

1. GitHub.com'a giriş yapın
2. Sağ üstteki **"+"** butonuna tıklayın
3. **"New repository"** seçin
4. Repository adı: **`Bambinifojo.github.io`** (kullanıcı adınızla aynı olmalı)
5. **Public** seçin
6. **"Create repository"** butonuna tıklayın

### 2. Dosyaları GitHub'a Yükleyin

Terminal/PowerShell'de şu komutları çalıştırın:

```bash
# Dosyaları staging area'ya ekle
git add .

# Commit oluştur
git commit -m "İlk commit: Ana sayfa eklendi"

# GitHub repository'nizi remote olarak ekleyin (URL'yi kendi repository'nizle değiştirin)
git remote add origin https://github.com/Bambinifojo/Bambinifojo.github.io.git

# Ana branch'i main olarak ayarlayın
git branch -M main

# Dosyaları GitHub'a gönderin
git push -u origin main
```

### 3. GitHub Pages'i Aktifleştirin

1. GitHub repository sayfanıza gidin
2. **Settings** sekmesine tıklayın
3. Sol menüden **Pages** seçin
4. **Source** bölümünden **"main"** branch'ini seçin
5. **Save** butonuna tıklayın

### 4. Sitenizi Görüntüleyin

Birkaç dakika sonra siteniz şu adreste yayında olacak:
**https://bambinifojo.github.io/**

## 📁 Dosya Yapısı

- `index.html` - Ana sayfa
- `privacy-policy-example.html` - Örnek gizlilik politikası sayfası
- `README.md` - Bu dosya

## 🎨 Özellikler

- ✅ Modern ve responsive tasarım
- ✅ Mor tema (Task Cosmos uyumlu)
- ✅ SVG ikonlar
- ✅ Mobil uyumlu
- ✅ Privacy Policy linkleri

## 📱 Yerel Olarak Görüntüleme

Sitenizi yerel olarak görmek için `index.html` dosyasını çift tıklayarak tarayıcıda açabilirsiniz.

## 🔗 Mevcut Uygulamalar

- **Task Cosmos** - Görev yönetimi uygulaması
  - Privacy Policy: https://bambinifojo.github.io/task-cosmos/privacy-policy.html
  - Play Store: https://play.google.com/store/apps/details?id=com.bambinifojo.taskcosmos

