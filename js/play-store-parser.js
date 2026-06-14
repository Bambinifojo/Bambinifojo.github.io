/**
 * Google Play Store HTML parser — shared by build script and browser client.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  } else {
    root.PlayStoreParser = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  const FETCH_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7'
  };

  function extractAppId(playStoreUrl) {
    if (!playStoreUrl) return null;
    try {
      const url = new URL(playStoreUrl);
      return url.searchParams.get('id');
    } catch (e) {
      const match = String(playStoreUrl).match(/[?&]id=([^&]+)/i);
      return match ? decodeURIComponent(match[1]) : null;
    }
  }

  function isIconSizedUrl(url) {
    return /w(96|128|192|256|512)-h(96|128|192|256|512)/i.test(url);
  }

  function normalizeImageBase(url) {
    return String(url || '').split('=')[0].replace(/\\u003d/gi, '=');
  }

  function parseSizeFromUrl(url) {
    const sized = url.match(/w(\d+)-h(\d+)/i);
    if (sized) {
      const w = parseInt(sized[1], 10);
      const h = parseInt(sized[2], 10);
      return { w, h, area: w * h };
    }
    const scaled = url.match(/=s(\d+)/i);
    if (scaled) {
      const size = parseInt(scaled[1], 10);
      return { w: size, h: size, area: size * size };
    }
    return { w: 512, h: 512, area: 512 * 512 };
  }

  function isLikelyScreenshot(url, size, iconBase) {
    const base = normalizeImageBase(url);
    if (iconBase && base === iconBase) return false;
    if (isIconSizedUrl(url)) return false;
    if (!/w\d+-h\d+/i.test(url)) return false;
    if (size.w < 120 || size.h < 120) return false;
    if (size.h < 400 && size.w < 500) return false;
    if (size.w > size.h * 2.2 && size.h < 360) return false;
    return true;
  }

  function extractScreenshotUrls(html, iconUrl) {
    const matches = [...html.matchAll(/https:\/\/play-lh\.googleusercontent\.com\/[^"'\s<>\\]+/gi)]
      .map((match) => match[0].replace(/\\u003d/g, '='));
    const iconBase = normalizeImageBase(iconUrl);
    const byBase = new Map();

    for (const url of matches) {
      const size = parseSizeFromUrl(url);
      if (!isLikelyScreenshot(url, size, iconBase)) continue;

      const base = normalizeImageBase(url);
      const existing = byBase.get(base);
      if (!existing || size.area > existing.size.area) {
        byBase.set(base, { url, size });
      }
    }

    return [...byBase.values()]
      .sort((a, b) => b.size.area - a.size.area)
      .slice(0, 8)
      .map((item) => item.url);
  }

  function normalizeScreenshotEntry(entry, index) {
    const image = typeof entry === 'string' ? entry : (entry?.image || entry?.url || '');
    return {
      icon: entry?.icon || '📱',
      title: entry?.title || `Ekran Görüntüsü ${index + 1}`,
      image
    };
  }

  function parsePlayStoreHtml(html) {
    const data = {
      title: null,
      description: null,
      rating: null,
      downloads: null,
      icon: null,
      screenshots: []
    };

    if (!html) return data;

    try {
      const jsonLdMatches = html.match(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi);
      if (jsonLdMatches) {
        for (const jsonLdScript of jsonLdMatches) {
          try {
            const jsonContent = jsonLdScript.match(/<script[^>]*>([\s\S]*?)<\/script>/i)?.[1];
            if (!jsonContent) continue;
            const jsonData = JSON.parse(jsonContent);
            const items = Array.isArray(jsonData) ? jsonData : [jsonData];

            for (const item of items) {
              if (item['@type'] !== 'SoftwareApplication' && item['@type'] !== 'MobileApplication') continue;
              if (item.name && !data.title) data.title = item.name;
              if (item.description && !data.description) {
                data.description = String(item.description).substring(0, 500);
              }
              if (item.aggregateRating?.ratingValue && !data.rating) {
                data.rating = parseFloat(item.aggregateRating.ratingValue);
              }
              if (item.image && !data.icon) {
                data.icon = Array.isArray(item.image) ? item.image[0] : item.image;
              }
              if (item.screenshot && !data.screenshots.length) {
                const screenshots = Array.isArray(item.screenshot) ? item.screenshot : [item.screenshot];
                data.screenshots = screenshots.slice(0, 8).map((img, index) =>
                  normalizeScreenshotEntry(typeof img === 'string' ? img : (img.url || img), index)
                );
              }
            }
          } catch (e) {
            continue;
          }
        }
      }
    } catch (e) {
      // fall through to HTML parsing
    }

    if (!data.title) {
      const titleMatch = html.match(/<h1[^>]*class="[^"]*Fd93Bb[^"]*"[^>]*>([^<]+)<\/h1>/i)
        || html.match(/<h1[^>]*>([^<]+)<\/h1>/i)
        || html.match(/<meta\s+property="og:title"\s+content="([^"]+)"/i)
        || html.match(/<title>([^<]+)<\/title>/i);
      if (titleMatch) {
        data.title = titleMatch[1].trim().replace(/\s*-\s*Google Play\s*$/i, '');
      }
    }

    if (!data.rating) {
      const ratingMatch = html.match(/"ratingValue":\s*([\d.]+)/i)
        || html.match(/<div[^>]*class="[^"]*TT9eCd[^"]*"[^>]*>([\d.]+)</i)
        || html.match(/<div[^>]*class="[^"]*BHMmbe[^"]*"[^>]*>([\d.]+)</i);
      if (ratingMatch) data.rating = parseFloat(ratingMatch[1]);
    }

    if (!data.downloads) {
      const downloadsMatch = html.match(/([\d.,]+(?:\+)?)\s*(?:indirme|downloads|İndirme)/i)
        || html.match(/<div[^>]*class="[^"]*wMUdtb[^"]*"[^>]*>([^<]+)<\/div>/i);
      if (downloadsMatch) data.downloads = downloadsMatch[1].trim();
    }

    if (!data.icon) {
      const iconMatch = html.match(/<meta\s+property="og:image"\s+content="([^"]+)"/i)
        || html.match(/<img[^>]*class="[^"]*T75of[^"]*"[^>]*src="([^"]+)"/i)
        || html.match(/<img[^>]*alt="[^"]*icon[^"]*"[^>]*src="([^"]+)"/i);
      if (iconMatch) data.icon = iconMatch[1].trim();
    }

    if (!data.screenshots.length) {
      const screenshotUrls = extractScreenshotUrls(html, data.icon);
      data.screenshots = screenshotUrls.map((url, index) => normalizeScreenshotEntry(url, index));
    }

    return data;
  }

  async function fetchPlayStorePage(appId) {
    const playStoreUrl = `https://play.google.com/store/apps/details?id=${encodeURIComponent(appId)}&hl=tr`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    try {
      const response = await fetch(playStoreUrl, {
        headers: FETCH_HEADERS,
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      if (!response.ok) {
        throw new Error(`Play Store sayfası yüklenemedi: ${response.status}`);
      }
      return response.text();
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  return {
    FETCH_HEADERS,
    extractAppId,
    parsePlayStoreHtml,
    fetchPlayStorePage
  };
});
