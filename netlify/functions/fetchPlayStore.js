// Netlify Function: Google Play Store'dan uygulama bilgilerini çek
exports.handler = async (event, context) => {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Content-Type': 'application/json'
  };

  // Handle preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  // Sadece GET isteklerini kabul et
  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const appId = event.queryStringParameters?.appId;
    
    if (!appId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'App ID gerekli' })
      };
    }

    // Google Play Store URL'si
    const playStoreUrl = `https://play.google.com/store/apps/details?id=${encodeURIComponent(appId)}&hl=tr`;
    
    // Play Store sayfasını fetch et
    // Netlify Functions Node.js 18+ kullanıyorsa built-in fetch var
    let fetchFunction = global.fetch;
    if (!fetchFunction) {
      try {
        fetchFunction = require('node-fetch');
      } catch (e) {
        throw new Error('Fetch fonksiyonu bulunamadı. Node.js 18+ veya node-fetch gerekli.');
      }
    }
    
    const response = await fetchFunction(playStoreUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7'
      }
    });

    if (!response.ok) {
      throw new Error(`Play Store sayfası yüklenemedi: ${response.status}`);
    }

    const html = await response.text();
    
    // HTML'den bilgileri parse et
    const data = {
      title: null,
      description: null,
      rating: null,
      downloads: null,
      icon: null
    };

    // Title çıkar (meta tag veya h1'den)
    const titleMatch = html.match(/<h1[^>]*>([^<]+)<\/h1>/i) || 
                       html.match(/<meta\s+property="og:title"\s+content="([^"]+)"/i) ||
                       html.match(/<title>([^<]+)<\/title>/i);
    if (titleMatch) {
      data.title = titleMatch[1].trim();
    }

    // Description çıkar
    const descMatch = html.match(/<meta\s+name="description"\s+content="([^"]+)"/i) ||
                      html.match(/<meta\s+property="og:description"\s+content="([^"]+)"/i);
    if (descMatch) {
      data.description = descMatch[1].trim().substring(0, 500); // İlk 500 karakter
    }

    // Rating çıkar
    const ratingMatch = html.match(/"ratingValue":\s*([\d.]+)/i) ||
                       html.match(/class="BHMmbe"[^>]*>([\d.]+)</i);
    if (ratingMatch) {
      data.rating = parseFloat(ratingMatch[1]);
    }

    // Downloads çıkar
    const downloadsMatch = html.match(/"downloads":\s*"([^"]+)"/i) ||
                          html.match(/class="wMUdtb"[^>]*>([^<]+)<\/span>/i);
    if (downloadsMatch) {
      data.downloads = downloadsMatch[1].trim();
    }

    // Icon URL çıkar
    const iconMatch = html.match(/<img[^>]*alt="[^"]*icon[^"]*"[^>]*src="([^"]+)"/i) ||
                     html.match(/<meta\s+property="og:image"\s+content="([^"]+)"/i);
    if (iconMatch) {
      data.icon = iconMatch[1].trim();
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(data)
    };

  } catch (error) {
    console.error('Play Store veri çekme hatası:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Veri çekilemedi: ' + error.message,
        message: 'Lütfen bilgileri manuel olarak girin.'
      })
    };
  }
};
