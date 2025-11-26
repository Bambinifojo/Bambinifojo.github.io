# 📱 Bildirim Sistemi Entegrasyon Kodları

Bu dosya, bildirim sistemini Android uygulamanıza entegre etmek için gerekli tüm kodları içerir.

## 📋 İçindekiler

1. [Android Entegrasyonu](#android-entegrasyonu)
2. [JavaScript/Web Entegrasyonu](#javascriptweb-entegrasyonu)
3. [API Endpoint Bilgileri](#api-endpoint-bilgileri)

---

## 🤖 Android Entegrasyonu

### 1. Gradle Dependencies (build.gradle.kts veya build.gradle)

```kotlin
dependencies {
    // Retrofit için
    implementation("com.squareup.retrofit2:retrofit:2.9.0")
    implementation("com.squareup.retrofit2:converter-gson:2.9.0")
    
    // Coroutines için
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.7.3")
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-core:1.7.3")
    
    // Lifecycle için
    implementation("androidx.lifecycle:lifecycle-runtime-ktx:2.6.2")
}
```

### 2. Data Classes (NotificationModels.kt)

```kotlin
package com.bambinifojo.notifications

import com.google.gson.annotations.SerializedName

// Ana yanıt modeli
data class NotificationResponse(
    @SerializedName("general")
    val general: GeneralNotifications,
    @SerializedName("app")
    val app: AppNotification?
)

// Genel bildirimler
data class GeneralNotifications(
    @SerializedName("maintenance")
    val maintenance: MaintenanceNotification,
    @SerializedName("broadcast")
    val broadcast: BroadcastNotification,
    @SerializedName("version")
    val version: VersionNotification
)

// Bakım modu bildirimi
data class MaintenanceNotification(
    @SerializedName("enabled")
    val enabled: Boolean,
    @SerializedName("message")
    val message: String
)

// Genel yayın bildirimi
data class BroadcastNotification(
    @SerializedName("enabled")
    val enabled: Boolean,
    @SerializedName("title")
    val title: String,
    @SerializedName("message")
    val message: String
)

// Versiyon bildirimi
data class VersionNotification(
    @SerializedName("latest_version")
    val latestVersion: String,
    @SerializedName("force_update")
    val forceUpdate: Boolean,
    @SerializedName("update_message")
    val updateMessage: String
)

// Uygulama bazlı bildirim
data class AppNotification(
    @SerializedName("enabled")
    val enabled: Boolean,
    @SerializedName("latest_version")
    val latestVersion: String,
    @SerializedName("force_update")
    val forceUpdate: Boolean,
    @SerializedName("update_message")
    val updateMessage: String,
    @SerializedName("duration")
    val duration: NotificationDuration? = null
)

// Süreli bildirim bilgisi
data class NotificationDuration(
    @SerializedName("type")
    val type: String, // "hours" veya "days"
    @SerializedName("value")
    val value: Int,
    @SerializedName("start_time")
    val startTime: String // ISO 8601 formatında
)
```

### 3. API Service (NotificationService.kt)

```kotlin
package com.bambinifojo.notifications

import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import retrofit2.http.GET
import retrofit2.http.Query

interface NotificationService {
    /**
     * Bildirimleri getir
     * @param appId Uygulama ID'si (opsiyonel) - Örn: "task-cosmos"
     * @param appPackage Android package adı (opsiyonel) - Örn: "com.bambinifojo.taskcosmos"
     */
    @GET("/.netlify/functions/getNotifications")
    suspend fun getNotifications(
        @Query("appId") appId: String? = null,
        @Query("appPackage") appPackage: String? = null
    ): NotificationResponse
}

object NotificationApi {
    // GitHub Pages için base URL
    private const val BASE_URL = "https://bambinifojo.github.io"
    
    // Netlify için alternatif URL (eğer Netlify kullanıyorsanız)
    // private const val BASE_URL = "https://bambinifojo.netlify.app"
    
    val service: NotificationService = Retrofit.Builder()
        .baseUrl(BASE_URL)
        .addConverterFactory(GsonConverterFactory.create())
        .build()
        .create(NotificationService::class.java)
}
```

### 4. Notification Manager (NotificationManager.kt)

```kotlin
package com.bambinifojo.notifications

import android.content.Context
import android.content.Intent
import android.net.Uri
import android.util.Log
import android.widget.Toast
import androidx.appcompat.app.AlertDialog
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

class NotificationManager(private val context: Context) {
    private val TAG = "NotificationManager"
    private val scope = CoroutineScope(Dispatchers.Main)
    
    // Uygulama bilgileri
    private val appId = "task-cosmos" // Kendi uygulama ID'nizi buraya yazın
    private val appPackage = context.packageName // Otomatik olarak package name alınır
    private val currentVersion = "1.0.0" // BuildConfig.VERSION_NAME kullanabilirsiniz
    
    /**
     * Bildirimleri kontrol et ve göster
     */
    fun checkNotifications() {
        scope.launch {
            try {
                Log.d(TAG, "🔔 Bildirimler kontrol ediliyor...")
                
                // API'den bildirimleri al
                val response = withContext(Dispatchers.IO) {
                    NotificationApi.service.getNotifications(
                        appId = appId,
                        appPackage = appPackage
                    )
                }
                
                Log.d(TAG, "✅ Bildirimler alındı: $response")
                
                // Bildirimleri işle
                processNotifications(response)
                
            } catch (e: Exception) {
                Log.e(TAG, "❌ Bildirim kontrolü hatası: ${e.message}", e)
                // Hata durumunda sessizce devam et (kullanıcıyı rahatsız etme)
            }
        }
    }
    
    /**
     * Bildirimleri işle ve göster
     */
    private fun processNotifications(response: NotificationResponse) {
        // 1. Bakım modu kontrolü
        if (response.general.maintenance.enabled) {
            showMaintenanceDialog(response.general.maintenance.message)
            return // Bakım modu aktifse diğer bildirimleri gösterme
        }
        
        // 2. Genel yayın kontrolü
        if (response.general.broadcast.enabled) {
            showBroadcastDialog(
                response.general.broadcast.title,
                response.general.broadcast.message
            )
        }
        
        // 3. Uygulama versiyon kontrolü (öncelikli)
        val appNotification = response.app
        if (appNotification != null && appNotification.enabled) {
            checkVersionUpdate(appNotification)
        } else {
            // Uygulama bildirimi yoksa genel versiyon kontrolü yap
            checkVersionUpdate(response.general.version)
        }
    }
    
    /**
     * Bakım modu dialog'u göster
     */
    private fun showMaintenanceDialog(message: String) {
        AlertDialog.Builder(context)
            .setTitle("🔧 Bakım Modu")
            .setMessage(message)
            .setCancelable(false)
            .setPositiveButton("Tamam") { _, _ ->
                // Uygulamayı kapat
                (context as? android.app.Activity)?.finish()
            }
            .show()
    }
    
    /**
     * Genel yayın dialog'u göster
     */
    private fun showBroadcastDialog(title: String, message: String) {
        AlertDialog.Builder(context)
            .setTitle(title)
            .setMessage(message)
            .setPositiveButton("Tamam", null)
            .show()
    }
    
    /**
     * Versiyon güncellemesi kontrolü
     */
    private fun checkVersionUpdate(versionNotification: Any) {
        val latestVersion: String
        val forceUpdate: Boolean
        val updateMessage: String
        
        when (versionNotification) {
            is AppNotification -> {
                latestVersion = versionNotification.latestVersion
                forceUpdate = versionNotification.forceUpdate
                updateMessage = versionNotification.updateMessage
            }
            is VersionNotification -> {
                latestVersion = versionNotification.latestVersion
                forceUpdate = versionNotification.forceUpdate
                updateMessage = versionNotification.updateMessage
            }
            else -> return
        }
        
        // Versiyon karşılaştırması
        if (compareVersions(currentVersion, latestVersion) < 0) {
            // Yeni versiyon mevcut
            showUpdateDialog(updateMessage, forceUpdate)
        } else {
            Log.d(TAG, "✅ Uygulama güncel: $currentVersion")
        }
    }
    
    /**
     * Güncelleme dialog'u göster
     */
    private fun showUpdateDialog(message: String, forceUpdate: Boolean) {
        val dialog = AlertDialog.Builder(context)
            .setTitle("🔄 Güncelleme Mevcut")
            .setMessage(message)
            .setCancelable(!forceUpdate) // Zorunlu güncellemede iptal edilemez
        
        if (forceUpdate) {
            // Zorunlu güncelleme - sadece "Güncelle" butonu
            dialog.setPositiveButton("Güncelle") { _, _ ->
                openPlayStore()
                // Uygulamayı kapat
                (context as? android.app.Activity)?.finish()
            }
        } else {
            // Opsiyonel güncelleme - "Güncelle" ve "Daha Sonra" butonları
            dialog.setPositiveButton("Güncelle") { _, _ ->
                openPlayStore()
            }
            dialog.setNegativeButton("Daha Sonra", null)
        }
        
        dialog.show()
    }
    
    /**
     * Play Store'u aç
     */
    private fun openPlayStore() {
        try {
            val playStoreUrl = "https://play.google.com/store/apps/details?id=$appPackage"
            val intent = Intent(Intent.ACTION_VIEW, Uri.parse(playStoreUrl))
            context.startActivity(intent)
        } catch (e: Exception) {
            Log.e(TAG, "❌ Play Store açılamadı: ${e.message}", e)
            Toast.makeText(context, "Play Store açılamadı", Toast.LENGTH_SHORT).show()
        }
    }
    
    /**
     * Versiyon karşılaştırması
     * @return -1: current < latest, 0: current == latest, 1: current > latest
     */
    private fun compareVersions(current: String, latest: String): Int {
        val currentParts = current.split(".").map { it.toIntOrNull() ?: 0 }
        val latestParts = latest.split(".").map { it.toIntOrNull() ?: 0 }
        
        val maxLength = maxOf(currentParts.size, latestParts.size)
        
        for (i in 0 until maxLength) {
            val currentPart = currentParts.getOrElse(i) { 0 }
            val latestPart = latestParts.getOrElse(i) { 0 }
            
            when {
                currentPart < latestPart -> return -1
                currentPart > latestPart -> return 1
            }
        }
        
        return 0
    }
}
```

### 5. MainActivity'de Kullanım (MainActivity.kt)

```kotlin
package com.bambinifojo.taskcosmos

import android.os.Bundle
import androidx.appcompat.app.AppCompatActivity
import com.bambinifojo.notifications.NotificationManager

class MainActivity : AppCompatActivity() {
    private lateinit var notificationManager: NotificationManager
    
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)
        
        // Notification Manager'ı başlat
        notificationManager = NotificationManager(this)
        
        // Uygulama açılışında bildirimleri kontrol et
        notificationManager.checkNotifications()
        
        // Diğer kodlarınız...
    }
    
    override fun onResume() {
        super.onResume()
        // Uygulama her açıldığında bildirimleri kontrol et (opsiyonel)
        // notificationManager.checkNotifications()
    }
}
```

### 6. AndroidManifest.xml İzinleri

```xml
<manifest xmlns:android="http://schemas.android.com/apk/res/android">
    
    <!-- İnternet izni -->
    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
    
    <!-- Play Store intent filter (opsiyonel) -->
    <queries>
        <intent>
            <action android:name="android.intent.action.VIEW" />
            <data android:scheme="https" />
        </intent>
    </queries>
    
    <application>
        <!-- ... -->
    </application>
</manifest>
```

---

## 🌐 JavaScript/Web Entegrasyonu

### 1. getNotifications.js Dosyasını Projeye Ekle

`getNotifications.js` dosyasını projenize ekleyin ve HTML'de script olarak yükleyin:

```html
<script src="getNotifications.js"></script>
```

### 2. Kullanım Örneği

```javascript
// Genel bildirimleri al
async function checkGeneralNotifications() {
    try {
        const response = await getNotifications();
        
        // Bakım modu kontrolü
        if (response.general.maintenance.enabled) {
            alert(response.general.maintenance.message);
            return;
        }
        
        // Genel yayın kontrolü
        if (response.general.broadcast.enabled) {
            showNotification(
                response.general.broadcast.title,
                response.general.broadcast.message
            );
        }
        
        // Versiyon kontrolü
        const currentVersion = "1.0.0"; // Kendi versiyonunuz
        if (compareVersions(currentVersion, response.general.version.latest_version) < 0) {
            showUpdateDialog(
                response.general.version.update_message,
                response.general.version.force_update
            );
        }
        
    } catch (error) {
        console.error("Bildirim kontrolü hatası:", error);
    }
}

// Uygulama bazlı bildirimleri al
async function checkAppNotifications() {
    try {
        const response = await getNotifications({
            appId: 'task-cosmos' // veya appPackage: 'com.bambinifojo.taskcosmos'
        });
        
        if (response.app && response.app.enabled) {
            const currentVersion = "1.0.0";
            if (compareVersions(currentVersion, response.app.latest_version) < 0) {
                showUpdateDialog(
                    response.app.update_message,
                    response.app.force_update
                );
            }
        }
        
    } catch (error) {
        console.error("Uygulama bildirimi kontrolü hatası:", error);
    }
}

// Versiyon karşılaştırması
function compareVersions(current, latest) {
    const currentParts = current.split('.').map(Number);
    const latestParts = latest.split('.').map(Number);
    
    for (let i = 0; i < Math.max(currentParts.length, latestParts.length); i++) {
        const currentPart = currentParts[i] || 0;
        const latestPart = latestParts[i] || 0;
        
        if (currentPart < latestPart) return -1;
        if (currentPart > latestPart) return 1;
    }
    
    return 0;
}

// Güncelleme dialog'u göster
function showUpdateDialog(message, forceUpdate) {
    const userChoice = confirm(message + (forceUpdate ? '\n\nZorunlu güncelleme!' : ''));
    
    if (userChoice || forceUpdate) {
        window.open('https://play.google.com/store/apps/details?id=com.bambinifojo.taskcosmos', '_blank');
        
        if (forceUpdate) {
            // Zorunlu güncellemede sayfayı kapat
            window.close();
        }
    }
}

// Sayfa yüklendiğinde kontrol et
document.addEventListener('DOMContentLoaded', () => {
    checkGeneralNotifications();
    checkAppNotifications();
});
```

---

## 🔌 API Endpoint Bilgileri

### GitHub Pages (Önerilen)

```
Base URL: https://bambinifojo.github.io
Endpoint: /.netlify/functions/getNotifications
Full URL: https://bambinifojo.github.io/.netlify/functions/getNotifications
```

**Not:** GitHub Pages'de Netlify Functions çalışmaz, bu yüzden `getNotifications.js` dosyasını kullanın.

### Netlify (Alternatif)

```
Base URL: https://bambinifojo.netlify.app
Endpoint: /.netlify/functions/getNotifications
Full URL: https://bambinifojo.netlify.app/.netlify/functions/getNotifications
```

### API Parametreleri

- `appId` (opsiyonel): Uygulama ID'si - Örn: `task-cosmos`
- `appPackage` (opsiyonel): Android package adı - Örn: `com.bambinifojo.taskcosmos`

### Örnek İstekler

```bash
# Genel bildirimler
curl "https://bambinifojo.github.io/.netlify/functions/getNotifications"

# Uygulama bazlı bildirimler (appId ile)
curl "https://bambinifojo.github.io/.netlify/functions/getNotifications?appId=task-cosmos"

# Uygulama bazlı bildirimler (appPackage ile)
curl "https://bambinifojo.github.io/.netlify/functions/getNotifications?appPackage=com.bambinifojo.taskcosmos"
```

---

## 📝 Önemli Notlar

1. **Uygulama ID'si**: Admin panelinde uygulama eklerken `appId` alanını doldurun (örn: `task-cosmos`)
2. **Package Name**: Android uygulamanızın package name'ini doğru girin (örn: `com.bambinifojo.taskcosmos`)
3. **Versiyon Formatı**: Versiyonlar `X.Y.Z` formatında olmalıdır (örn: `1.0.0`, `2.1.5`)
4. **Süreli Bildirimler**: Bildirimler saat veya gün bazında süreli olabilir
5. **Zorunlu Güncelleme**: `force_update: true` ise kullanıcı güncellemeden uygulamayı kullanamaz

---

## 🐛 Hata Ayıklama

### Android Logcat

```bash
# Bildirim loglarını filtrele
adb logcat | grep "NotificationManager"
```

### Web Console

```javascript
// Debug modu
const response = await getNotifications({ appId: 'task-cosmos' });
console.log('Bildirim yanıtı:', response);
```

---

## ✅ Test Checklist

- [ ] API endpoint'e erişilebiliyor mu?
- [ ] Genel bildirimler alınıyor mu?
- [ ] Uygulama bazlı bildirimler alınıyor mu?
- [ ] Bakım modu çalışıyor mu?
- [ ] Genel yayın gösteriliyor mu?
- [ ] Versiyon kontrolü çalışıyor mu?
- [ ] Zorunlu güncelleme çalışıyor mu?
- [ ] Play Store açılıyor mu?
- [ ] Süreli bildirimler doğru çalışıyor mu?

---

## 📞 Destek

Sorun yaşarsanız:
1. Console loglarını kontrol edin
2. API yanıtını kontrol edin
3. Admin panelinde bildirim ayarlarını kontrol edin
4. `BILDIRIM_TEST_DEBUG.md` dosyasına bakın

