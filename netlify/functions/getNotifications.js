// Android uygulamaları için bildirim API endpoint'i
exports.handler = async (event, context) => {
  // CORS headers
  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
  };

  // CORS preflight request
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers,
      body: "",
    };
  }

  // Sadece GET isteklerine izin ver
  if (event.httpMethod !== "GET") {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: "Method not allowed. Use GET." }),
    };
  }

  try {
    const { appId, appPackage } = event.queryStringParameters || {};

    // Genel config'i yükle
    const configUrl = "https://bambinifojo.netlify.app/app_config.json";
    const appsUrl = "https://bambinifojo.netlify.app/data/apps.json";

    const [configResponse, appsResponse] = await Promise.all([
      fetch(configUrl).catch(() => null),
      fetch(appsUrl).catch(() => null),
    ]);

    let generalConfig = {};
    let appsData = { apps: [] };

    if (configResponse && configResponse.ok) {
      generalConfig = await configResponse.json();
    }

    if (appsResponse && appsResponse.ok) {
      appsData = await appsResponse.json();
    }

    // Genel bildirimler
    const response = {
      general: {
        maintenance: {
          enabled: generalConfig.maintenance || false,
          message: generalConfig.maintenance_message || "",
        },
        broadcast: {
          enabled: generalConfig.broadcast_enabled || false,
          title: generalConfig.broadcast_title || "",
          message: generalConfig.broadcast_message || "",
        },
        version: {
          latest_version: generalConfig.latest_version || "1.0.0",
          force_update: generalConfig.force_update || false,
          update_message: generalConfig.update_message || "",
        },
      },
      app: null, // Uygulama bazlı bildirim (eğer appId veya appPackage verilmişse)
    };

    // Eğer appId veya appPackage verilmişse, o uygulamanın bildirimlerini de ekle
    if (appId || appPackage) {
      const app = appsData.apps.find((a) => {
        if (appId) {
          // appId ile ara - önce appId alanını kontrol et, sonra title'dan oluştur
          if (a.appId && a.appId.toLowerCase() === appId.toLowerCase()) {
            return true;
          }
          // Fallback: title'dan appId oluştur
          const titleAppId = a.title?.toLowerCase().replace(/\s+/g, "-");
          return (
            titleAppId === appId.toLowerCase() ||
            a.title?.toLowerCase() === appId.toLowerCase()
          );
        }
        if (appPackage) {
          // appPackage ile ara
          return a.package && a.package.toLowerCase() === appPackage.toLowerCase();
        }
        return false;
      });

      if (app && app.notification) {
        // Süreli bildirim kontrolü
        let notificationEnabled = app.notification.enabled || false;
        
        // Eğer bildirim süreli ise ve süresi dolmuşsa, bildirimi devre dışı bırak
        if (notificationEnabled && app.notification.duration) {
          const duration = app.notification.duration;
          const startTime = new Date(duration.start_time);
          const now = new Date();
          let durationInMs = 0;
          
          if (duration.type === 'hours') {
            durationInMs = duration.value * 60 * 60 * 1000; // Saat -> milisaniye
          } else if (duration.type === 'days') {
            durationInMs = duration.value * 24 * 60 * 60 * 1000; // Gün -> milisaniye
          }
          
          const elapsed = now.getTime() - startTime.getTime();
          if (elapsed > durationInMs) {
            // Süre dolmuş, bildirimi devre dışı bırak
            notificationEnabled = false;
          }
        }
        
        response.app = {
          enabled: notificationEnabled,
          latest_version: app.notification.latest_version || "1.0.0",
          force_update: app.notification.force_update || false,
          update_message: app.notification.update_message || "",
        };
        
        // Süreli bildirim bilgilerini de ekle (debug için)
        if (app.notification.duration) {
          response.app.duration = {
            type: app.notification.duration.type,
            value: app.notification.duration.value,
            start_time: app.notification.duration.start_time
          };
        }
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(response, null, 2),
    };
  } catch (error) {
    console.error("Notification API Error:", error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: "Internal server error",
        message: error.message,
      }),
    };
  }
};

