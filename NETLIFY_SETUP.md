# 🚀 Netlify Functions Kurulum Rehberi

## ✅ Tamamlanan İşlemler

1. ✅ `netlify/functions/updateConfig.js` oluşturuldu
2. ✅ `netlify.toml` yapılandırma dosyası eklendi
3. ✅ `@octokit/rest` paketi yüklendi
4. ✅ `admin-notifications.js` Netlify Function kullanacak şekilde güncellendi
5. ✅ `admin.js` Netlify Function kullanacak şekilde güncellendi

## 🔧 Netlify'da Yapılacaklar

### 1. Environment Variables (Gizli Değişkenler) Ekleme

Netlify Dashboard'da şu adımları izleyin:

1. **Site Settings** → **Environment variables** bölümüne gidin
2. Aşağıdaki değişkenleri ekleyin:

```
GITHUB_TOKEN = YOUR_GITHUB_TOKEN_HERE
REPO_OWNER = Bambinifojo
REPO_NAME = Bambinifojo.github.io
CONFIG_FILE = app_config.json
```

### 2. GitHub Token Oluşturma

GitHub Personal Access Token oluşturmak için:

1. GitHub'da **Settings** → **Developer settings** → **Personal access tokens** → **Tokens (classic)**
2. **Generate new token (classic)** butonuna tıklayın
3. Token'a bir isim verin (örn: "Netlify Config Updater")
4. **Expiration** seçin (90 gün veya istediğiniz süre)
5. **Scopes** bölümünden şunları seçin:
   - ✅ `repo` (Full control of private repositories)
6. **Generate token** butonuna tıklayın
7. **Token'ı kopyalayın** (bir daha gösterilmeyecek!)
8. Netlify Environment Variables'a `GITHUB_TOKEN` olarak ekleyin

### 3. Deploy Ayarları

Netlify otomatik olarak:
- `netlify.toml` dosyasını okuyacak
- `netlify/functions/` klasöründeki fonksiyonları deploy edecek
- Environment variables'ları fonksiyonlara aktaracak

### 4. Test Etme

Deploy tamamlandıktan sonra:

1. Admin panelden **Bildirim Ayarları** sayfasına gidin
2. Ayarları değiştirin
3. **Kaydet** butonuna tıklayın
4. Başarılı mesajı görünmelisiniz
5. GitHub'da `app_config.json` dosyasının güncellendiğini kontrol edin

## 📁 Dosya Yapısı

```
Bambinifojo.github.io/
├── netlify/
│   └── functions/
│       └── updateConfig.js    # Netlify Function
├── netlify.toml               # Netlify yapılandırması
├── admin-notifications.html   # Bildirim ayarları sayfası
├── admin-notifications.js     # Frontend JavaScript
├── admin.js                   # Admin panel JavaScript (güncellendi)
└── app_config.json            # Config dosyası (GitHub'da)
```

## 🔍 Sorun Giderme

### Function çalışmıyor
- Environment variables'ların doğru eklendiğinden emin olun
- GitHub token'ın geçerli olduğunu kontrol edin
- Netlify deploy loglarını kontrol edin

### CORS hatası
- `updateConfig.js` dosyasında CORS headers zaten ekli
- Eğer hala sorun varsa, Netlify'ın CORS ayarlarını kontrol edin

### 401 Unauthorized
- GitHub token'ın geçerli olduğundan emin olun
- Token'ın `repo` scope'una sahip olduğunu kontrol edin

### 404 Not Found
- Function path'inin doğru olduğundan emin olun: `/.netlify/functions/updateConfig`
- Netlify deploy loglarında function'ın başarıyla deploy edildiğini kontrol edin

## 📝 Notlar

- GitHub repository **Private** olabilir (token ile erişim sağlanır)
- Netlify Function'ları serverless çalışır (kullanıldığında aktif olur)
- Her deploy'da function'lar yeniden deploy edilir
- Environment variables production, staging ve branch deploy'ları için ayrı ayrı ayarlanabilir

