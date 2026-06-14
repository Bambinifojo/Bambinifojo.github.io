const fs = require('fs');
const path = require('path');
const { extractAppId, parsePlayStoreHtml, FETCH_HEADERS } = require('../js/play-store-parser');

const APPS_JSON = path.join(__dirname, '..', 'data', 'apps.json');
const CACHE_JSON = path.join(__dirname, '..', 'data', 'play-store-cache.json');

async function fetchHtml(appId) {
  const url = `https://play.google.com/store/apps/details?id=${encodeURIComponent(appId)}&hl=tr`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000);

  try {
    const response = await fetch(url, { headers: FETCH_HEADERS, signal: controller.signal });
    clearTimeout(timeoutId);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    return response.text();
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

async function fetchAppPlayData(app) {
  const appId = extractAppId(app.playStoreUrl || app.details);
  if (!appId) return null;

  console.log(`📱 ${app.title} (${appId}) çekiliyor...`);
  const html = await fetchHtml(appId);
  const parsed = parsePlayStoreHtml(html);

  return {
    appId,
    title: parsed.title || app.title,
    icon: parsed.icon || null,
    rating: parsed.rating || app.rating || null,
    downloads: parsed.downloads || app.downloads || null,
    screenshots: parsed.screenshots || []
  };
}

async function main() {
  const appsData = JSON.parse(fs.readFileSync(APPS_JSON, 'utf8'));
  const playApps = appsData.apps.filter((app) => extractAppId(app.playStoreUrl || app.details));

  const cache = {
    updatedAt: new Date().toISOString(),
    apps: {}
  };

  for (const app of playApps) {
    try {
      const data = await fetchAppPlayData(app);
      if (!data) continue;
      cache.apps[data.appId] = {
        title: data.title,
        icon: data.icon,
        rating: data.rating,
        downloads: data.downloads,
        screenshots: data.screenshots
      };
      console.log(`   ✓ ${data.screenshots.length} screenshot, icon: ${data.icon ? 'evet' : 'hayır'}`);
    } catch (error) {
      console.warn(`   ⚠ ${app.title} atlandı: ${error.message}`);
    }
  }

  fs.writeFileSync(CACHE_JSON, `${JSON.stringify(cache, null, 2)}\n`, 'utf8');
  console.log(`\n✅ Önbellek yazıldı: ${path.relative(process.cwd(), CACHE_JSON)}`);
  console.log(`   ${Object.keys(cache.apps).length} uygulama güncellendi (${cache.updatedAt})`);
}

main().catch((error) => {
  console.error('❌ Play Store çekme hatası:', error.message);
  process.exit(1);
});
