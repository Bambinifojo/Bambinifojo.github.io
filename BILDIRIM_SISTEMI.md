# 📢 Bildirim Sistemi Dokümantasyonu

Bu dokümantasyon, Android uygulamalarının bildirim sistemini nasıl kullanacağını açıklar.

## 📋 İçindekiler

1. [Genel Bakış](#genel-bakış)
2. [API Endpoint](#api-endpoint)
3. [Bildirim Türleri](#bildirim-türleri)
4. [Android Uygulaması Entegrasyonu](#android-uygulaması-entegrasyonu)
5. [Örnek Kullanım](#örnek-kullanım)

## 🎯 Genel Bakış

Bildirim sistemi iki seviyede çalışır:

1. **Genel Bildirimler**: Tüm uygulamalar için geçerli (Bakım Modu, Broadcast, Genel Versiyon)
2. **Uygulama Bazlı Bildirimler**: Her uygulama için özel bildirimler (Versiyon güncellemeleri)

## 🔌 API Endpoint

### Base URL
```
https://bambinifojo.netlify.app/.netlify/functions/getNotifications
```

### İstek Formatı

#### Genel Bildirimler (Tüm Uygulamalar)
```http
GET /.netlify/functions/getNotifications
```

#### Uygulama Bazlı Bildirimler
```http
GET /.netlify/functions/getNotifications?appId=task-cosmos
```
veya
```http
GET /.netlify/functions/getNotifications?appPackage=com.bambinifojo.taskcosmos
```

### Yanıt Formatı

```json
{
  "general": {
    "maintenance": {
      "enabled": false,
      "message": "Bakım modu aktif. Lütfen daha sonra tekrar deneyin."
    },
    "broadcast": {
      "enabled": true,
      "title": "Yeni Görev Yayınlandı!",
      "message": "Yeni gezegen görevleri seni bekliyor!"
    },
    "version": {
      "latest_version": "1.0.0",
      "force_update": false,
      "update_message": "Yeni sürüm mevcut! Daha iyi performans için güncelleyin."
    }
  },
  "app": {
    "enabled": true,
    "latest_version": "1.2.0",
    "force_update": true,
    "update_message": "Yeni özellikler eklendi! Lütfen güncelleyin."
  }
}
```

## 📱 Bildirim Türleri

### 1. Bakım Modu (Maintenance)
- **Amaç**: Uygulama bakımdayken kullanıcıları bilgilendirmek
- **Kontrol**: `general.maintenance.enabled`
- **Mesaj**: `general.maintenance.message`
- **Kullanım**: Bakım modu aktifse, uygulamayı kullanıcıya kapatın ve mesajı gösterin

### 2. Genel Yayın (Broadcast)
- **Amaç**: Tüm kullanıcılara genel duyurular yapmak
- **Kontrol**: `general.broadcast.enabled`
- **Başlık**: `general.broadcast.title`
- **Mesaj**: `general.broadcast.message`
- **Kullanım**: Uygulama açılışında veya ana ekranda bildirim olarak gösterin

### 3. Versiyon Güncellemesi
- **Genel Versiyon**: `general.version` - Tüm uygulamalar için
- **Uygulama Versiyonu**: `app` - Sadece belirli uygulama için
- **Zorunlu Güncelleme**: `force_update: true` ise kullanıcı güncellemeden uygulamayı kullanamaz
- **Kullanım**: 
  - Uygulamanın mevcut versiyonunu kontrol edin
  - `latest_version` ile karşılaştırın
  - Güncelleme varsa mesajı gösterin
  - `force_update: true` ise uygulamayı kapatın ve Play Store'a yönlendirin

## 🤖 Android Uygulaması Entegrasyonu

### 1. Gradle Bağımlılıkları

```gradle
dependencies {
    implementation 'com.squareup.retrofit2:retrofit:2.9.0'
    implementation 'com.squareup.retrofit2:converter-gson:2.9.0'
    implementation 'com.squareup.okhttp3:okhttp:4.11.0'
}
```

### 2. Data Models

```kotlin
// NotificationResponse.kt
data class NotificationResponse(
    val general: GeneralNotifications,
    val app: AppNotification?
)

data class GeneralNotifications(
    val maintenance: MaintenanceNotification,
    val broadcast: BroadcastNotification,
    val version: VersionNotification
)

data class MaintenanceNotification(
    val enabled: Boolean,
    val message: String
)

data class BroadcastNotification(
    val enabled: Boolean,
    val title: String,
    val message: String
)

data class VersionNotification(
    val latest_version: String,
    val force_update: Boolean,
    val update_message: String
)

data class AppNotification(
    val enabled: Boolean,
    val latest_version: String,
    val force_update: Boolean,
    val update_message: String
)
```

### 3. API Service

```kotlin
// NotificationService.kt
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import retrofit2.http.GET
import retrofit2.http.Query

interface NotificationService {
    @GET("/.netlify/functions/getNotifications")
    suspend fun getNotifications(
        @Query("appId") appId: String? = null,
        @Query("appPackage") appPackage: String? = null
    ): NotificationResponse
}

object NotificationApi {
    private const val BASE_URL = "https://bambinifojo.netlify.app"
    
    val service: NotificationService = Retrofit.Builder()
        .baseUrl(BASE_URL)
        .addConverterFactory(GsonConverterFactory.create())
        .build()
        .create(NotificationService::class.java)
}
```

### 4. Notification Manager

```kotlin
// NotificationManager.kt
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.widget.Toast
import androidx.appcompat.app.AlertDialog
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch

class NotificationManager(private val context: Context) {
    
    private val appPackageName = context.packageName
    private val appVersionName = context.packageManager
        .getPackageInfo(appPackageName, 0).versionName
    
    fun checkNotifications(appId: String? = null) {
        CoroutineScope(Dispatchers.IO).launch {
            try {
                val response = NotificationApi.service.getNotifications(
                    appId = appId,
                    appPackage = appPackageName
                )
                
                CoroutineScope(Dispatchers.Main).launch {
                    handleNotifications(response)
                }
            } catch (e: Exception) {
                e.printStackTrace()
                // Hata durumunda sessizce devam et
            }
        }
    }
    
    private fun handleNotifications(response: NotificationResponse) {
        // 1. Bakım modu kontrolü
        if (response.general.maintenance.enabled) {
            showMaintenanceDialog(response.general.maintenance.message)
            return
        }
        
        // 2. Broadcast kontrolü
        if (response.general.broadcast.enabled) {
            showBroadcastNotification(
                response.general.broadcast.title,
                response.general.broadcast.message
            )
        }
        
        // 3. Uygulama versiyon kontrolü (öncelikli)
        val appNotification = response.app
        if (appNotification != null && appNotification.enabled) {
            checkAppVersion(appNotification)
        } else {
            // Genel versiyon kontrolü
            checkGeneralVersion(response.general.version)
        }
    }
    
    private fun showMaintenanceDialog(message: String) {
        AlertDialog.Builder(context)
            .setTitle("Bakım Modu")
            .setMessage(message)
            .setCancelable(false)
            .setPositiveButton("Tamam") { _, _ ->
                // Uygulamayı kapat
                (context as? android.app.Activity)?.finish()
            }
            .show()
    }
    
    private fun showBroadcastNotification(title: String, message: String) {
        AlertDialog.Builder(context)
            .setTitle(title)
            .setMessage(message)
            .setPositiveButton("Tamam", null)
            .show()
    }
    
    private fun checkAppVersion(notification: AppNotification) {
        if (isUpdateAvailable(appVersionName, notification.latest_version)) {
            showUpdateDialog(
                notification.update_message,
                notification.force_update
            )
        }
    }
    
    private fun checkGeneralVersion(version: VersionNotification) {
        if (isUpdateAvailable(appVersionName, version.latest_version)) {
            showUpdateDialog(
                version.update_message,
                version.force_update
            )
        }
    }
    
    private fun isUpdateAvailable(currentVersion: String, latestVersion: String): Boolean {
        return try {
            val current = parseVersion(currentVersion)
            val latest = parseVersion(latestVersion)
            
            latest[0] > current[0] || 
            (latest[0] == current[0] && latest[1] > current[1]) ||
            (latest[0] == current[0] && latest[1] == current[1] && latest[2] > current[2])
        } catch (e: Exception) {
            false
        }
    }
    
    private fun parseVersion(version: String): IntArray {
        return version.split(".").map { it.toInt() }.toIntArray()
    }
    
    private fun showUpdateDialog(message: String, forceUpdate: Boolean) {
        val dialog = AlertDialog.Builder(context)
            .setTitle("Güncelleme Mevcut")
            .setMessage(message)
            .setCancelable(!forceUpdate)
        
        if (forceUpdate) {
            dialog.setPositiveButton("Güncelle") { _, _ ->
                openPlayStore()
                (context as? android.app.Activity)?.finish()
            }
        } else {
            dialog.setPositiveButton("Güncelle") { _, _ ->
                openPlayStore()
            }
            dialog.setNegativeButton("Daha Sonra", null)
        }
        
        dialog.show()
    }
    
    private fun openPlayStore() {
        try {
            val intent = Intent(Intent.ACTION_VIEW).apply {
                data = Uri.parse("market://details?id=$appPackageName")
                setPackage("com.android.vending")
            }
            context.startActivity(intent)
        } catch (e: Exception) {
            // Play Store yoksa web tarayıcıda aç
            val intent = Intent(Intent.ACTION_VIEW).apply {
                data = Uri.parse("https://play.google.com/store/apps/details?id=$appPackageName")
            }
            context.startActivity(intent)
        }
    }
}
```

### 5. Kullanım (Activity/Fragment'te)

```kotlin
// MainActivity.kt
import android.os.Bundle
import androidx.appcompat.app.AppCompatActivity

class MainActivity : AppCompatActivity() {
    
    private lateinit var notificationManager: NotificationManager
    
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)
        
        notificationManager = NotificationManager(this)
        
        // Uygulama açılışında bildirimleri kontrol et
        notificationManager.checkNotifications(appId = "task-cosmos")
    }
}
```

## 📝 Örnek Kullanım Senaryoları

### Senaryo 1: Uygulama Açılışında Kontrol
```kotlin
override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    setContentView(R.layout.activity_main)
    
    val notificationManager = NotificationManager(this)
    notificationManager.checkNotifications(appId = "task-cosmos")
}
```

### Senaryo 2: Periyodik Kontrol (Her 24 saatte bir)
```kotlin
// WorkManager veya AlarmManager kullanarak
val workRequest = PeriodicWorkRequestBuilder<NotificationCheckWorker>(
    24, TimeUnit.HOURS
).build()

WorkManager.getInstance(context).enqueue(workRequest)
```

### Senaryo 3: Manuel Kontrol (Ayarlar menüsünde)
```kotlin
settingsButton.setOnClickListener {
    notificationManager.checkNotifications(appId = "task-cosmos")
}
```

## 🔧 Admin Panel'den Bildirim Gönderme

### Genel Bildirim Gönderme
1. Admin Panel'e giriş yapın
2. "Bildirim Ayarları" bölümüne gidin
3. İlgili alanları doldurun:
   - **Bakım Modu**: Uygulamayı geçici olarak kapatmak için
   - **Genel Yayın**: Tüm kullanıcılara duyuru göndermek için
   - **Versiyon**: Genel versiyon güncellemesi için
4. "Kaydet" butonuna tıklayın

### Uygulama Bazlı Bildirim Gönderme
1. Admin Panel'de "Uygulamalar" bölümüne gidin
2. Bildirim göndermek istediğiniz uygulamayı düzenleyin
3. "Uygulama Bildirim Ayarları" bölümüne gidin
4. Alanları doldurun:
   - **Son Sürüm**: Yeni versiyon numarası (örn: 1.2.0)
   - **Zorunlu Güncelleme**: Evet/Hayır
   - **Güncelleme Mesajı**: Kullanıcılara gösterilecek mesaj
   - **Bildirim Aktif mi?**: Evet seçin
5. "Kaydet" butonuna tıklayın

## ⚠️ Önemli Notlar

1. **Versiyon Formatı**: Versiyon numaraları `X.Y.Z` formatında olmalıdır (örn: 1.0.0, 2.1.5)
2. **Zorunlu Güncelleme**: `force_update: true` ise kullanıcı güncellemeden uygulamayı kullanamaz
3. **Bakım Modu**: Bakım modu aktifken diğer bildirimler gösterilmez
4. **Öncelik Sırası**:
   1. Bakım Modu (en yüksek öncelik)
   2. Uygulama Bazlı Versiyon
   3. Genel Versiyon
   4. Broadcast (en düşük öncelik)
5. **Caching**: Bildirimleri cache'leyebilirsiniz, ancak her uygulama açılışında kontrol etmeniz önerilir

## 🐛 Hata Ayıklama

### API Yanıt Vermiyor
- İnternet bağlantısını kontrol edin
- API endpoint'in doğru olduğundan emin olun
- CORS hatalarını kontrol edin

### Bildirimler Gösterilmiyor
- `appId` veya `appPackage` parametresinin doğru olduğundan emin olun
- Admin Panel'de bildirimin aktif olduğunu kontrol edin
- Versiyon numaralarının doğru format olduğunu kontrol edin

## 📞 Destek

Sorularınız için: bambinifojo@gmail.com


