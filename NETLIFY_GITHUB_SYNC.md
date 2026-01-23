# Netlify - GitHub Senkronizasyon Kılavuzu

Bu kılavuz, Netlify'ı GitHub'dan otomatik deploy edecek şekilde yapılandırmanız için adımları içerir.

## 🎯 Amaç

GitHub'ı ana kaynak olarak kullanarak:
- GitHub'a push yaptığınızda hem GitHub Pages hem de Netlify otomatik güncellenir
- Şifre değişiklikleri ve admin ayarları her iki platformda da senkronize kalır
- Netlify çökse bile GitHub Pages çalışmaya devam eder

## 📋 Adım 1: Netlify'da GitHub Bağlantısı

1. **Netlify Dashboard'a gidin**: https://app.netlify.com
2. **Sites** sekmesine gidin
3. Mevcut sitenizi bulun veya **"Add new site"** → **"Import an existing project"**
4. **GitHub** seçeneğini seçin
5. Repository'nizi seçin: `Bambinifojo/Bambinifojo.github.io`
6. **Deploy settings** bölümünde:
   - **Build command**: `npm ci && npm run build`
   - **Publish directory**: `.` (root directory)
   - **Base directory**: (boş bırakın)

## 📋 Adım 2: Netlify Environment Variables

1. Netlify Dashboard'da sitenize gidin
2. **Site settings** → **Environment variables**
3. Şu değişkenleri ekleyin:

```
GITHUB_TOKEN = [GitHub Personal Access Token]
REPO_OWNER = Bambinifojo
REPO_NAME = Bambinifojo.github.io
```

### GitHub Token Oluşturma:
1. GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)
2. **Generate new token (classic)**
3. İsim: `Netlify Deploy Token`
4. Süre: `No expiration` (veya istediğiniz süre)
5. İzinler:
   - ✅ `repo` (Full control of private repositories)
   - ✅ `workflow` (Update GitHub Action workflows)
6. **Generate token** ve token'ı kopyalayın
7. Netlify Environment Variables'a yapıştırın

## 📋 Adım 3: Netlify Build Settings

**Site settings** → **Build & deploy** → **Build settings**:

```
Build command: npm ci && npm run build
Publish directory: .
```

## 📋 Adım 4: GitHub Actions (Opsiyonel - Otomatik Deploy)

GitHub Actions ile Netlify'a otomatik deploy için `.github/workflows/netlify-deploy.yml` dosyası oluşturun:

```yaml
name: Deploy to Netlify

on:
  push:
    branches:
      - main

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Deploy to Netlify
        uses: netlify/actions/cli@master
        with:
          args: deploy --prod --dir=.
        env:
          NETLIFY_AUTH_TOKEN: ${{ secrets.NETLIFY_AUTH_TOKEN }}
          NETLIFY_SITE_ID: ${{ secrets.NETLIFY_SITE_ID }}
```

## 🔄 Otomatik Senkronizasyon Nasıl Çalışır?

### Şifre Değiştirme Senaryosu:

1. **GitHub Pages'den giriş yapıp şifre değiştirme**:
   - Şifre `localStorage`'a kaydedilir
   - GitHub modu aktifse ve token varsa → GitHub'a kaydedilir (`data/adminUsers.json`)
   - Netlify'da ise → Netlify Function üzerinden GitHub'a kaydedilir

2. **Netlify'dan giriş yapıp şifre değiştirme**:
   - Şifre `localStorage`'a kaydedilir
   - Netlify Function üzerinden GitHub'a kaydedilir
   - GitHub modu aktifse ve token varsa → GitHub'a direkt kaydedilir

3. **Her iki platformdan da giriş**:
   - Önce GitHub'dan yüklenmeyi dener
   - Başarısız olursa Netlify Function'dan yükler
   - Son çare olarak localStorage'dan yükler

## 📁 Dosya Yapısı

```
data/
  ├── apps.json          # Uygulama verileri (GitHub'da)
  ├── site.json          # Site ayarları (GitHub'da)
  └── adminUsers.json    # Admin kullanıcıları (GitHub'da) ✨ YENİ

netlify/functions/
  ├── updateApps.js      # Uygulama verilerini GitHub'a kaydet
  ├── updateAdminUsers.js # Admin kullanıcılarını GitHub'a kaydet ✨ YENİ
  └── getAdminUsers.js   # Admin kullanıcılarını GitHub'dan yükle ✨ YENİ
```

## ✅ Test Adımları

1. **GitHub Pages'den test**:
   - https://bambinifojo.github.io/admin.html
   - Şifre değiştirin
   - Konsolu kontrol edin: "✅ Kullanıcılar GitHub'a kaydedildi"

2. **Netlify'dan test**:
   - https://bambinifojo.netlify.app/admin.html
   - Şifre değiştirin
   - Konsolu kontrol edin: "✅ Kullanıcılar Netlify üzerinden GitHub'a kaydedildi"

3. **Senkronizasyon testi**:
   - GitHub Pages'de şifre değiştirin
   - Netlify'da sayfayı yenileyin
   - Yeni şifreyle giriş yapabilmelisiniz

## 🚨 Sorun Giderme

### Netlify deploy çalışmıyor:
- Environment variables kontrol edin
- GitHub token geçerli mi kontrol edin
- Build logs'u kontrol edin

### Şifre senkronize olmuyor:
- Konsolu kontrol edin (F12)
- GitHub token'ın `repo` izni olduğundan emin olun
- `data/adminUsers.json` dosyasının GitHub'da oluştuğunu kontrol edin

### Netlify Function hatası:
- Netlify Dashboard → Functions → Logs
- Environment variables'ın doğru olduğundan emin olun

## 📝 Notlar

- GitHub ana kaynak olarak kullanılıyor
- Netlify sadece GitHub'dan deploy ediyor
- Her iki platformdan da veri GitHub'a kaydediliyor
- localStorage fallback olarak kullanılıyor (offline durumlar için)
