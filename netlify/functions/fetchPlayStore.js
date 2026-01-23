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
    
    console.log('📱 Play Store veri çekme isteği:', { appId, method: event.httpMethod });
    
    if (!appId) {
      console.error('❌ App ID eksik');
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'App ID gerekli' })
      };
    }

    // Google Play Store URL'si
    const playStoreUrl = `https://play.google.com/store/apps/details?id=${encodeURIComponent(appId)}&hl=tr`;
    console.log('🔗 Play Store URL:', playStoreUrl);
    
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
    
    // AbortController ile timeout ekle (30 saniye)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);
    
    let response;
    try {
      response = await fetchFunction(playStoreUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
          'Accept-Language': 'tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7',
          'Accept-Encoding': 'gzip, deflate, br',
          'Referer': 'https://www.google.com/',
          'Sec-Fetch-Dest': 'document',
          'Sec-Fetch-Mode': 'navigate',
          'Sec-Fetch-Site': 'none',
          'Sec-Fetch-User': '?1',
          'Upgrade-Insecure-Requests': '1'
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const statusText = response.statusText || 'Bilinmeyen hata';
        throw new Error(`Play Store sayfası yüklenemedi: ${response.status} ${statusText}`);
      }
    } catch (fetchError) {
      clearTimeout(timeoutId);
      if (fetchError.name === 'AbortError') {
        throw new Error('İstek zaman aşımına uğradı (30 saniye)');
      }
      throw fetchError;
    }

    const html = await response.text();
    console.log('✅ HTML alındı, uzunluk:', html.length);
    
    // HTML'den bilgileri parse et
    const data = {
      title: null,
      description: null,
      rating: null,
      downloads: null,
      icon: null,
      screenshots: []
    };

    // Önce JSON-LD structured data'yı kontrol et (daha güvenilir)
    try {
      const jsonLdMatches = html.match(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi);
      if (jsonLdMatches) {
        for (const jsonLdScript of jsonLdMatches) {
          try {
            const jsonContent = jsonLdScript.match(/<script[^>]*>([\s\S]*?)<\/script>/i)?.[1];
            if (jsonContent) {
              const jsonData = JSON.parse(jsonContent);
              
              // Array veya object olabilir
              const items = Array.isArray(jsonData) ? jsonData : [jsonData];
              
              for (const item of items) {
                if (item['@type'] === 'SoftwareApplication' || item['@type'] === 'MobileApplication') {
                  if (item.name && !data.title) {
                    data.title = item.name;
                  }
                  if (item.description && !data.description) {
                    data.description = item.description.substring(0, 500);
                  }
                  if (item.aggregateRating && item.aggregateRating.ratingValue && !data.rating) {
                    data.rating = parseFloat(item.aggregateRating.ratingValue);
                  }
                  if (item.operatingSystem && !data.downloads) {
                    data.downloads = item.operatingSystem;
                  }
                  if (item.image && !data.icon) {
                    data.icon = Array.isArray(item.image) ? item.image[0] : item.image;
                  }
                  if (item.screenshot && !data.screenshots.length) {
                    const screenshots = Array.isArray(item.screenshot) ? item.screenshot : [item.screenshot];
                    data.screenshots = screenshots.slice(0, 5).map((img, index) => ({
                      icon: '📱',
                      title: `Ekran Görüntüsü ${index + 1}`,
                      image: typeof img === 'string' ? img : (img.url || img)
                    }));
                  }
                }
              }
            }
          } catch (e) {
            // JSON parse hatası, devam et
            continue;
          }
        }
      }
    } catch (e) {
      // JSON-LD parse hatası, HTML parsing'e geç
    }

    // Title çıkar (meta tag veya h1'den)
    if (!data.title) {
      const titleMatch = html.match(/<h1[^>]*class="[^"]*Fd93Bb[^"]*"[^>]*>([^<]+)<\/h1>/i) ||
                         html.match(/<h1[^>]*>([^<]+)<\/h1>/i) || 
                         html.match(/<meta\s+property="og:title"\s+content="([^"]+)"/i) ||
                         html.match(/<title>([^<]+)<\/title>/i);
      if (titleMatch) {
        data.title = titleMatch[1].trim().replace(/\s*-\s*Google Play\s*$/, '');
      }
    }

    // Description çıkar
    if (!data.description) {
      const descMatch = html.match(/<meta\s+name="description"\s+content="([^"]+)"/i) ||
                        html.match(/<meta\s+property="og:description"\s+content="([^"]+)"/i) ||
                        html.match(/<div[^>]*class="[^"]*bARER[^"]*"[^>]*>([\s\S]*?)<\/div>/i);
      if (descMatch) {
        let desc = descMatch[1].trim();
        // HTML tag'lerini temizle
        desc = desc.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
        data.description = desc.substring(0, 500);
      }
    }

    // Rating çıkar
    if (!data.rating) {
      const ratingMatch = html.match(/"ratingValue":\s*([\d.]+)/i) ||
                         html.match(/<div[^>]*class="[^"]*TT9eCd[^"]*"[^>]*>([\d.]+)</i) ||
                         html.match(/<div[^>]*class="[^"]*BHMmbe[^"]*"[^>]*>([\d.]+)</i);
      if (ratingMatch) {
        data.rating = parseFloat(ratingMatch[1]);
      }
    }

    // Downloads çıkar
    if (!data.downloads) {
      const downloadsMatch = html.match(/"downloads":\s*"([^"]+)"/i) ||
                            html.match(/<div[^>]*class="[^"]*wMUdtb[^"]*"[^>]*>([^<]+)<\/div>/i) ||
                            html.match(/([\d,]+(?:\+)?)\s*(?:indirme|downloads|İndirme)/i);
      if (downloadsMatch) {
        data.downloads = downloadsMatch[1].trim();
      }
    }

    // Icon URL çıkar
    if (!data.icon) {
      const iconMatch = html.match(/<img[^>]*alt="[^"]*icon[^"]*"[^>]*src="([^"]+)"/i) ||
                       html.match(/<meta\s+property="og:image"\s+content="([^"]+)"/i) ||
                       html.match(/<img[^>]*class="[^"]*T75of[^"]*"[^>]*src="([^"]+)"/i);
      if (iconMatch) {
        data.icon = iconMatch[1].trim();
      }
    }

    // Screenshots çıkar (Google Play Store sayfasından)
    if (!data.screenshots.length) {
      // Screenshot URL'lerini bul (genellikle play-lh.googleusercontent.com domain'inde)
      const screenshotMatches = html.matchAll(/https:\/\/play-lh\.googleusercontent\.com\/[^"'\s<>]+/gi);
      const screenshotUrls = Array.from(screenshotMatches).map(match => match[0]);
      
      // Benzersiz screenshot URL'lerini al
      if (screenshotUrls.length > 0) {
        const uniqueUrls = [...new Set(screenshotUrls)];
        const uniqueScreenshots = uniqueUrls
          .filter(url => {
            // Icon URL'lerini filtrele (w96-h96, w512-h512 gibi küçük boyutlar genellikle icon)
            return !url.match(/w(96|128|192|256|512)-h(96|128|192|256|512)/i);
          })
          .slice(0, 5); // İlk 5 screenshot'ı al
        
        data.screenshots = uniqueScreenshots.map((url, index) => ({
          icon: '📱',
          title: `Ekran Görüntüsü ${index + 1}`,
          image: url
        }));
      }
    }

    console.log('✅ Veri parse edildi:', {
      title: data.title ? '✓' : '✗',
      description: data.description ? '✓' : '✗',
      rating: data.rating ? '✓' : '✗',
      downloads: data.downloads ? '✓' : '✗',
      icon: data.icon ? '✓' : '✗',
      screenshots: data.screenshots.length
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(data)
    };

  } catch (error) {
    console.error('❌ Play Store veri çekme hatası:', {
      message: error.message,
      stack: error.stack,
      name: error.name,
      appId: event.queryStringParameters?.appId
    });
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Veri çekilemedi: ' + error.message,
        message: 'Lütfen bilgileri manuel olarak girin.',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      })
    };
  }
};
