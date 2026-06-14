/**
 * Bambinifojo Apps Manager — shared store + legacy sync
 */
const AppsManagerStore = (function () {
  const STORAGE_KEY = 'bambinifojo_apps';

  const STATUS_LABELS = {
    published: 'Yayında',
    beta: 'Beta',
    development: 'Geliştiriliyor',
    draft: 'Taslak'
  };

  const DEFAULT_APP = {
    id: '',
    name: '',
    shortDescription: '',
    longDescription: '',
    icon: '📱',
    imageUrl: '',
    status: 'draft',
    platform: 'Android',
    technologies: [],
    playStoreUrl: '',
    githubUrl: '',
    detailUrl: '',
    featured: false,
    active: true,
    order: 1,
    updatedAt: ''
  };

  const FIELD_KEYS = Object.keys(DEFAULT_APP);

  function slugify(text) {
    return String(text || '')
      .toLowerCase()
      .trim()
      .replace(/[ğ]/g, 'g')
      .replace(/[ü]/g, 'u')
      .replace(/[ş]/g, 's')
      .replace(/[ı]/g, 'i')
      .replace(/[ö]/g, 'o')
      .replace(/[ç]/g, 'c')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'app';
  }

  function uniqueId(base, existingIds) {
    let id = base;
    let i = 2;
    while (existingIds.has(id)) {
      id = `${base}-${i}`;
      i += 1;
    }
    return id;
  }

  function mapLegacyStatus(app) {
    if (app.status === 'published' || app.status === 'beta' || app.status === 'development' || app.status === 'draft') {
      return app.status;
    }
    if (app.status === 'live') return 'published';
    if (app.status === 'dev') return 'development';
    if (app.status === 'beta') return 'beta';

    const details = app.details || app.playStoreUrl || '';
    if (details.includes('play.google.com')) return 'published';
    if (app.detailPage || (details && details !== '#' && details.includes('bambinifojo.github.io'))) return 'beta';
    if (details && details !== '#') return 'beta';
    return 'development';
  }

  function fromLegacyApp(app, index, existingIds) {
    const baseId = app.id || slugify(app.name || app.title || `app-${index + 1}`);
    const id = uniqueId(baseId, existingIds);
    existingIds.add(id);

    const details = app.details || '';
    const playStoreUrl = app.playStoreUrl || (details.includes('play.google.com') ? details : '');
    let detailUrl = app.detailUrl || '';
    if (!detailUrl && app.detailPage) detailUrl = app.detailPage;
    if (!detailUrl && details && details !== '#' && !details.includes('play.google.com')) detailUrl = details;

    const icon = app.icon || '📱';
    const imageUrl = app.imageUrl || (icon.startsWith('http') ? icon : '');

    return mergeApp({
      id,
      name: app.name || app.title || '',
      shortDescription: app.shortDescription || app.description || '',
      longDescription: app.longDescription || app.about?.description || app.description || '',
      icon: imageUrl ? '📱' : icon,
      imageUrl,
      status: mapLegacyStatus(app),
      platform: app.platform || app.category || 'Android',
      technologies: Array.isArray(app.technologies) ? app.technologies
        : (Array.isArray(app.tags) ? app.tags : (Array.isArray(app.features) ? app.features.slice(0, 6) : [])),
      playStoreUrl,
      githubUrl: app.githubUrl || '',
      detailUrl,
      featured: !!app.featured,
      active: app.active !== false,
      order: typeof app.order === 'number' ? app.order : index + 1,
      updatedAt: app.updatedAt || new Date().toISOString(),
      _legacy: { ...app }
    });
  }

  function toLegacyApp(app) {
    const legacy = { ...(app._legacy || {}) };
    const details = app.playStoreUrl || app.detailUrl || legacy.details || '#';

    return {
      ...legacy,
      id: app.id,
      title: app.name,
      name: app.name,
      description: app.shortDescription,
      shortDescription: app.shortDescription,
      longDescription: app.longDescription,
      icon: app.imageUrl || app.icon,
      imageUrl: app.imageUrl,
      status: app.status,
      tags: app.technologies,
      technologies: app.technologies,
      category: app.platform,
      platform: app.platform,
      playStoreUrl: app.playStoreUrl,
      githubUrl: app.githubUrl,
      detailUrl: app.detailUrl,
      detailPage: app.detailUrl && !app.detailUrl.startsWith('http') ? app.detailUrl : legacy.detailPage,
      details: app.playStoreUrl || (app.detailUrl || legacy.details || '#'),
      featured: app.featured,
      active: app.active,
      order: app.order,
      updatedAt: app.updatedAt
    };
  }

  function mergeApp(app) {
    const merged = { ...DEFAULT_APP, _legacy: {} };
    if (!app || typeof app !== 'object') return merged;

    FIELD_KEYS.forEach((key) => {
      if (app[key] !== undefined && app[key] !== null) {
        if (key === 'technologies' && Array.isArray(app[key])) {
          merged[key] = app[key].map(String);
        } else if (key === 'featured' || key === 'active') {
          merged[key] = !!app[key];
        } else if (key === 'order') {
          merged[key] = Number(app[key]) || 1;
        } else {
          merged[key] = String(app[key]);
        }
      }
    });

    if (app._legacy && typeof app._legacy === 'object') {
      merged._legacy = app._legacy;
    }

    return merged;
  }

  function normalizeList(apps) {
    if (!Array.isArray(apps)) return [];
    const ids = new Set();
    return apps.map((app, index) => {
      const merged = mergeApp(app);
      if (!merged.id) merged.id = uniqueId(slugify(merged.name || `app-${index + 1}`), ids);
      ids.add(merged.id);
      return merged;
    });
  }

  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return normalizeList(parsed);
      }
    } catch (e) {
      console.warn('Uygulama verisi okunamadı:', e.message);
    }
    return null;
  }

  function loadFromLegacySources() {
    const ids = new Set();
    const candidates = [];

    try {
      if (typeof appsData !== 'undefined' && Array.isArray(appsData?.apps)) {
        candidates.push(...appsData.apps);
      }
    } catch (e) { /* ignore */ }

    if (!candidates.length) {
      try {
        const saved = localStorage.getItem('appsData');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed?.apps)) candidates.push(...parsed.apps);
        }
      } catch (e) { /* ignore */ }
    }

    return candidates.map((app, index) => fromLegacyApp(app, index, ids));
  }

  function getApps() {
    const stored = load();
    if (stored && stored.length) return stored;
    return loadFromLegacySources();
  }

  function save(apps) {
    const normalized = normalizeList(apps).map((app) => ({
      ...app,
      updatedAt: app.updatedAt || new Date().toISOString()
    }));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
    syncToAppsData(normalized);
    return normalized;
  }

  function syncToAppsData(apps) {
    const legacyApps = apps.map(toLegacyApp);
    try {
      if (typeof appsData !== 'undefined') {
        appsData.apps = legacyApps;
        localStorage.setItem('appsData', JSON.stringify(appsData));
      } else {
        const saved = localStorage.getItem('appsData');
        const wrapper = saved ? JSON.parse(saved) : { apps: [], site: null };
        wrapper.apps = legacyApps;
        localStorage.setItem('appsData', JSON.stringify(wrapper));
      }
    } catch (e) {
      console.warn('appsData senkronizasyonu başarısız:', e.message);
    }
  }

  function isValidLink(value) {
    if (!value || !value.trim()) return true;
    const v = value.trim();
    return v.startsWith('#') || v.startsWith('http://') || v.startsWith('https://') || (!v.includes(' ') && !v.startsWith('http'));
  }

  function isValidEmail() {
    return true;
  }

  function validate(app) {
    const errors = [];
    const warnings = [];
    const data = mergeApp(app);

    if (!data.name.trim()) errors.push('Uygulama adı boş olamaz.');
    if (!data.shortDescription.trim()) errors.push('Kısa açıklama boş olamaz.');

    if (!data.id.trim()) data.id = slugify(data.name);

    ['playStoreUrl', 'githubUrl', 'detailUrl', 'imageUrl'].forEach((key) => {
      if (data[key] && !isValidLink(data[key])) {
        errors.push(`${key} geçerli bir link olmalı.`);
      }
    });

    if (Number.isNaN(Number(data.order))) {
      errors.push('Sıralama sayı olmalı.');
    }

    return { errors, warnings, data };
  }

  function validateImportList(list) {
    if (!Array.isArray(list)) return { errors: ['JSON bir dizi olmalı.'], apps: [] };
    const apps = [];
    const errors = [];
    list.forEach((item, index) => {
      const { errors: itemErrors, data } = validate(item);
      if (itemErrors.length) {
        errors.push(`Kayıt ${index + 1}: ${itemErrors[0]}`);
      } else {
        apps.push(data);
      }
    });
    return { errors, apps };
  }

  function sortForDisplay(apps, options) {
    const opts = options || {};
    let list = [...apps];

    if (!opts.includeInactive) {
      list = list.filter((a) => a.active);
    }

    list.sort((a, b) => {
      if (a.featured !== b.featured) return a.featured ? -1 : 1;
      return (Number(a.order) || 0) - (Number(b.order) || 0);
    });

    return list;
  }

  function getStatusLabel(status) {
    return STATUS_LABELS[status] || STATUS_LABELS.development;
  }

  function getStatusClass(status) {
    const map = {
      published: 'status-published',
      beta: 'status-beta',
      development: 'status-development',
      draft: 'status-draft'
    };
    return map[status] || 'status-development';
  }

  function getStats(apps) {
    const list = Array.isArray(apps) ? apps : getApps();
    const published = list.filter((a) => a.status === 'published' && a.playStoreUrl && a.playStoreUrl.trim()).length;
    return {
      total: list.length,
      published,
      active: list.filter((a) => a.active).length
    };
  }

  function getLatestUpdatedAt(apps) {
    const list = Array.isArray(apps) ? apps : getApps();
    const timestamps = list
      .map((a) => (a.updatedAt ? new Date(a.updatedAt).getTime() : 0))
      .filter((t) => t > 0);
    return timestamps.length ? Math.max(...timestamps) : null;
  }

  function createEmpty(order) {
    return mergeApp({
      ...DEFAULT_APP,
      order: order || 1,
      updatedAt: new Date().toISOString()
    });
  }

  function syncFromLegacyApps(legacyApps) {
    if (!Array.isArray(legacyApps)) return [];
    const ids = new Set();
    return legacyApps.map((app, index) => fromLegacyApp(app, index, ids));
  }

  return {
    STORAGE_KEY,
    STATUS_LABELS,
    DEFAULT_APP,
    FIELD_KEYS,
    slugify,
    mergeApp,
    fromLegacyApp,
    toLegacyApp,
    load,
    getApps,
    save,
    validate,
    validateImportList,
    sortForDisplay,
    getStatusLabel,
    getStatusClass,
    getStats,
    getLatestUpdatedAt,
    createEmpty,
    syncToAppsData,
    syncFromLegacyApps,
    loadFromLegacySources
  };
})();
