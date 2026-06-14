/**
 * Browser client — loads Play Store assets for product pages.
 * Tries Netlify function when available, otherwise uses data/play-store-cache.json.
 */
(function () {
  const CACHE_PATH = '../data/play-store-cache.json';
  const NETLIFY_FN = '/.netlify/functions/fetchPlayStore';
  const memoryCache = new Map();

  function getParser() {
    return globalThis.PlayStoreParser || null;
  }

  async function fetchJson(url, timeoutMs) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs || 12000);
    try {
      const response = await fetch(`${url}${url.includes('?') ? '&' : '?'}t=${Date.now()}`, {
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      if (!response.ok) return null;
      return response.json();
    } catch (e) {
      clearTimeout(timeoutId);
      return null;
    }
  }

  async function fetchFromNetlify(appId) {
    const data = await fetchJson(`${NETLIFY_FN}?appId=${encodeURIComponent(appId)}`, 15000);
    if (!data || data.error) return null;
    return data;
  }

  async function fetchFromCache(appId) {
    const cache = await fetchJson(CACHE_PATH, 8000);
    if (!cache?.apps?.[appId]) return null;
    return cache.apps[appId];
  }

  async function fetchPlayStoreAssets(appId) {
    if (!appId) return null;
    if (memoryCache.has(appId)) return memoryCache.get(appId);

    let data = await fetchFromNetlify(appId);
    if (!data) data = await fetchFromCache(appId);
    if (data) memoryCache.set(appId, data);
    return data;
  }

  function mergeScreenshots(localItems, playShots) {
    if (!playShots?.length) return localItems || [];
    return playShots.map((shot, index) => ({
      icon: localItems?.[index]?.icon || shot.icon || '📱',
      title: localItems?.[index]?.title || shot.title || `Ekran Görüntüsü ${index + 1}`,
      image: shot.image || shot.url || localItems?.[index]?.image || ''
    })).filter((shot) => shot.image);
  }

  function mergeAppWithPlayStore(app, playData) {
    if (!playData) return app;
    const merged = { ...app };

    if (playData.icon) {
      merged.imageUrl = playData.icon;
    }
    if (playData.rating) merged.rating = playData.rating;
    if (playData.downloads) merged.downloads = playData.downloads;

    const playShots = playData.screenshots || [];
    if (playShots.length) {
      merged.screenshots = {
        ...(app.screenshots || {}),
        items: mergeScreenshots(app.screenshots?.items, playShots)
      };
    }

    return merged;
  }

  async function enrichAppFromPlayStore(app) {
    const parser = getParser();
    const playStoreUrl = app.playStoreUrl
      || (app.details && app.details.includes('play.google.com') ? app.details : '');
    const appId = parser?.extractAppId(playStoreUrl);
    if (!appId) return app;

    const playData = await fetchPlayStoreAssets(appId);
    return mergeAppWithPlayStore(app, playData);
  }

  globalThis.PlayStoreClient = {
    fetchPlayStoreAssets,
    mergeAppWithPlayStore,
    enrichAppFromPlayStore
  };
})();
