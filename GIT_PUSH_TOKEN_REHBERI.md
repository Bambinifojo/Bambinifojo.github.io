# 🔐 Git Push için GitHub Token Kullanım Rehberi

GitHub artık şifre ile push kabul etmiyor. Personal Access Token kullanmanız gerekiyor.

## 🎯 Hızlı Çözüm (Önerilen)

### Adım 1: GitHub Personal Access Token Oluşturun

1. **GitHub'a gidin**: https://github.com
2. **Sağ üstteki profil fotoğrafı** → **Settings**
3. **Sol menüden en altta** → **Developer settings**
4. **Personal access tokens** → **Tokens (classic)**
5. **Generate new token (classic)**
6. **Ayarlar**:
   - **Note**: "Git Push - Bambinifojo" (istediğiniz bir isim)
   - **Expiration**: 90 gün veya daha uzun (önerilen: 1 yıl)
   - **Scopes**: **"repo"** iznini işaretleyin ✅
7. **Generate token** → Token'ı **hemen kopyalayın** (bir daha gösterilmez!)
   - Token şu formatta olacak: `ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`

### Adım 2: Token ile Push Yapın

**Yöntem A: Push sırasında token girin (En Kolay)**

```powershell
git push origin main
```

İstendiğinde:
- **Username**: `Bambinifojo` (GitHub kullanıcı adınız)
- **Password**: Token'ı yapıştırın (`ghp_...`)

**Yöntem B: Remote URL'e token ekleyin (Bir kere yapılır)**

```powershell
# Token'ınızı buraya yapıştırın
$token = "ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"

# Remote URL'i güncelle
git remote set-url origin https://Bambinifojo:$token@github.com/Bambinifojo/Bambinifojo.github.io.git

# Artık push yapabilirsiniz
git push origin main
```

⚠️ **Not**: Bu yöntem token'ı git config'de saklar. Daha güvenli için Yöntem A'yı kullanın.

**Yöntem C: Windows Credential Manager kullanın**

1. Push yaparken token'ı bir kere girin
2. Windows Credential Manager otomatik olarak saklar
3. Sonraki push'larda otomatik kullanılır

```powershell
git push origin main
# İlk seferde username ve token girin
# Sonraki seferlerde otomatik kullanılacak
```

## 🔄 Token Süresi Dolduğunda

Token süresi dolduğunda yeni token oluşturun ve:

1. **Windows Credential Manager'dan eski token'ı silin**:
   - Windows tuşu → "Credential Manager" ara
   - Windows Credentials → `git:https://github.com` → Remove

2. **Yeni token ile tekrar push yapın**

## ✅ Test

Push başarılı olduğunda şunu göreceksiniz:

```
Enumerating objects: X, done.
Counting objects: 100% (X/X), done.
Writing objects: 100% (X/X), done.
To https://github.com/Bambinifojo/Bambinifojo.github.io.git
   abc1234..def5678  main -> main
```

## 🆘 Sorun Giderme

**Hata: "Authentication failed"**
- Token'ın doğru kopyalandığından emin olun
- Token'ın "repo" iznine sahip olduğunu kontrol edin
- Token'ın süresinin dolmadığını kontrol edin

**Hata: "Permission denied"**
- Token'ın "repo" iznine sahip olduğundan emin olun
- Repository'nin size ait olduğundan emin olun

**Hata: "Username for 'https://github.com'"**
- Windows Credential Manager'ı kontrol edin
- Manuel olarak username ve token girin

## 📝 Notlar

- Token'ı asla GitHub'a commit etmeyin!
- Token'ı güvenli bir yerde saklayın
- Token süresi dolmadan önce yenileyin
- Her cihaz için ayrı token oluşturabilirsiniz
