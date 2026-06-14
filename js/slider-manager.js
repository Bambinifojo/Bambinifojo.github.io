/**
 * Bambinifojo Slider / Medya — shared store + legacy sync
 */
const SliderManagerStore = (function () {
  const STORAGE_KEY = 'bambinifojo_slider';
  const LEGACY_KEY = 'sliderData';

  const MEDIA_TYPES = ['image', 'video', 'youtube'];

  const DEFAULT_ITEM = {
    id: '',
    title: '',
    description: '',
    badge: '',
    mediaType: 'image',
    mediaUrl: '',
    thumbnailUrl: '',
    ctaText: '',
    ctaUrl: '',
    active: true,
    featured: false,
    order: 1,
    updatedAt: ''
  };

  const FIELD_KEYS = Object.keys(DEFAULT_ITEM);

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
      .replace(/^-+|-+$/g, '') || 'slide';
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

  function getYoutubeId(url) {
    if (!url) return null;
    const trimmed = url.trim();
    const embedMatch = trimmed.match(/youtube\.com\/embed\/([^?&/]+)/);
    if (embedMatch) return embedMatch[1];
    const watchMatch = trimmed.match(/[?&]v=([^&]+)/);
    if (watchMatch) return watchMatch[1];
    const shortMatch = trimmed.match(/youtu\.be\/([^?&/]+)/);
    if (shortMatch) return shortMatch[1];
    return null;
  }

  function getYoutubeEmbedUrl(url) {
    const id = getYoutubeId(url);
    return id ? `https://www.youtube.com/embed/${id}` : '';
  }

  function getYoutubeThumbnail(url) {
    const id = getYoutubeId(url);
    return id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : '';
  }

  function mergeItem(item) {
    const merged = { ...DEFAULT_ITEM, _legacy: {} };
    if (!item || typeof item !== 'object') return merged;

    FIELD_KEYS.forEach((key) => {
      if (item[key] === undefined || item[key] === null) return;
      if (key === 'active' || key === 'featured') {
        merged[key] = !!item[key];
      } else if (key === 'order') {
        merged[key] = Number(item[key]) || 1;
      } else if (key === 'mediaType') {
        merged[key] = MEDIA_TYPES.includes(item[key]) ? item[key] : 'image';
      } else {
        merged[key] = String(item[key]);
      }
    });

    if (item._legacy && typeof item._legacy === 'object') {
      merged._legacy = item._legacy;
    }

    return merged;
  }

  function fromLegacySlide(slide, index, existingIds) {
    const baseId = slide.id || slugify(slide.name || slide.title || `slide-${index + 1}`);
    const id = uniqueId(baseId, existingIds);
    existingIds.add(id);

    const icon = slide.icon || '';
    const mediaUrl = slide.mediaUrl || '';
    let mediaType = slide.mediaType || 'image';
    let thumbnailUrl = slide.thumbnailUrl || '';

    if (!mediaUrl && icon.startsWith('http')) {
      thumbnailUrl = thumbnailUrl || icon;
    }
    if (mediaUrl && getYoutubeId(mediaUrl)) {
      mediaType = 'youtube';
      thumbnailUrl = thumbnailUrl || getYoutubeThumbnail(mediaUrl);
    } else if (mediaUrl && /\.(mp4|webm|ogg)(\?|$)/i.test(mediaUrl)) {
      mediaType = 'video';
    }

    const primaryLink = Array.isArray(slide.links) ? slide.links[0] : null;

    return mergeItem({
      id,
      title: slide.title || slide.name || '',
      description: slide.description || '',
      badge: slide.badge || slide.slogan || '',
      mediaType,
      mediaUrl: mediaUrl || (mediaType === 'image' && icon.startsWith('http') ? icon : ''),
      thumbnailUrl,
      ctaText: slide.ctaText || primaryLink?.text || '',
      ctaUrl: slide.ctaUrl || primaryLink?.url || '',
      active: slide.active !== false,
      featured: !!slide.featured,
      order: typeof slide.order === 'number' ? slide.order : index + 1,
      updatedAt: slide.updatedAt || new Date().toISOString(),
      _legacy: { ...slide }
    });
  }

  function toLegacySlide(item) {
    const s = mergeItem(item);
    const legacy = { ...(s._legacy || {}) };
    const links = [];
    if (s.ctaText || s.ctaUrl) {
      links.push({ text: s.ctaText || 'Detay', url: s.ctaUrl || '#', icon: '📱' });
    }

    return {
      ...legacy,
      id: s.id,
      name: s.title,
      title: s.title,
      slogan: s.badge,
      badge: s.badge,
      description: s.description,
      mediaType: s.mediaType,
      mediaUrl: s.mediaUrl,
      thumbnailUrl: s.thumbnailUrl,
      ctaText: s.ctaText,
      ctaUrl: s.ctaUrl,
      active: s.active,
      featured: s.featured,
      order: s.order,
      updatedAt: s.updatedAt,
      icon: s.thumbnailUrl || s.mediaUrl || legacy.icon || '📱',
      links: links.length ? links : legacy.links || []
    };
  }

  function normalizeList(items) {
    if (!Array.isArray(items)) return [];
    const ids = new Set();
    return items.map((item, index) => {
      const merged = mergeItem(item);
      if (!merged.id) merged.id = uniqueId(slugify(merged.title || `slide-${index + 1}`), ids);
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
      console.warn('Slider verisi okunamadı:', e.message);
    }
    return null;
  }

  function loadFromLegacySources() {
    const ids = new Set();
    const candidates = [];

    try {
      const saved = localStorage.getItem(LEGACY_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed?.slides)) candidates.push(...parsed.slides);
        else if (Array.isArray(parsed?.apps)) candidates.push(...parsed.apps);
      }
    } catch (e) { /* ignore */ }

    return candidates.map((slide, index) => fromLegacySlide(slide, index, ids));
  }

  function getItems() {
    const stored = load();
    if (stored && stored.length) return stored;
    return loadFromLegacySources();
  }

  function getActiveItems() {
    return sortForDisplay(getItems(), { includeInactive: false });
  }

  function sortForDisplay(items, options) {
    const opts = options || {};
    let list = [...items];
    if (!opts.includeInactive) list = list.filter((i) => i.active);
    list.sort((a, b) => {
      if (a.featured !== b.featured) return a.featured ? -1 : 1;
      return (Number(a.order) || 0) - (Number(b.order) || 0);
    });
    return list;
  }

  function syncToLegacyData(items) {
    const slides = items.map(toLegacySlide);
    const existing = (() => {
      try {
        const saved = localStorage.getItem(LEGACY_KEY);
        return saved ? JSON.parse(saved) : {};
      } catch (e) {
        return {};
      }
    })();

    const legacy = {
      ...existing,
      slides,
      apps: slides,
      autoPlayInterval: existing.autoPlayInterval || 6000,
      isEnabled: slides.some((s) => s.active !== false),
      lastUpdated: new Date().toISOString()
    };

    try {
      localStorage.setItem(LEGACY_KEY, JSON.stringify(legacy));
    } catch (e) {
      console.warn('sliderData senkronizasyonu başarısız:', e.message);
    }
    return legacy;
  }

  function save(items) {
    const normalized = normalizeList(items).map((item) => ({
      ...item,
      updatedAt: new Date().toISOString()
    }));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
    syncToLegacyData(normalized);
    return normalized;
  }

  function isValidLink(value) {
    if (!value || !value.trim()) return true;
    const v = value.trim();
    return v.startsWith('#') || v.startsWith('http://') || v.startsWith('https://');
  }

  function isValidMediaUrl(type, url) {
    if (!url || !url.trim()) return true;
    const v = url.trim();
    if (!v.startsWith('http://') && !v.startsWith('https://')) return false;
    if (type === 'youtube') return !!getYoutubeId(v);
    return true;
  }

  function validate(item) {
    const errors = [];
    const data = mergeItem(item);

    if (!data.title.trim()) errors.push('Başlık boş olamaz.');
    if (!MEDIA_TYPES.includes(data.mediaType)) errors.push('Geçerli bir medya tipi seçin.');

    if (data.mediaUrl && !isValidMediaUrl(data.mediaType, data.mediaUrl)) {
      errors.push('Medya URL geçerli değil.');
    }

    if (data.thumbnailUrl && !isValidLink(data.thumbnailUrl)) {
      errors.push('Thumbnail URL geçerli değil.');
    }

    if (data.ctaUrl && !isValidLink(data.ctaUrl)) {
      errors.push('CTA linki geçerli olmalı (http, https veya #).');
    }

    if (Number.isNaN(Number(data.order))) {
      errors.push('Sıralama sayı olmalı.');
    }

    if (!data.id.trim()) data.id = slugify(data.title);

    return { errors, data };
  }

  function validateImportList(list) {
    if (!Array.isArray(list)) return { errors: ['JSON bir dizi olmalı.'], items: [] };
    const items = [];
    const errors = [];
    list.forEach((entry, index) => {
      const { errors: itemErrors, data } = validate(entry);
      if (itemErrors.length) errors.push(`Kayıt ${index + 1}: ${itemErrors[0]}`);
      else items.push(data);
    });
    return { errors, items };
  }

  function getStats(items) {
    const list = Array.isArray(items) ? items : getItems();
    return {
      total: list.length,
      active: list.filter((i) => i.active).length
    };
  }

  function getLatestUpdatedAt(items) {
    const list = Array.isArray(items) ? items : getItems();
    const timestamps = list
      .map((i) => (i.updatedAt ? new Date(i.updatedAt).getTime() : 0))
      .filter((t) => t > 0);
    return timestamps.length ? Math.max(...timestamps) : null;
  }

  function getMediaTypeLabel(type) {
    const map = { image: 'Görsel', video: 'Video', youtube: 'YouTube' };
    return map[type] || 'Medya';
  }

  function getMediaTypeClass(type) {
    return `media-type-${type || 'image'}`;
  }

  function getPreviewThumbnail(item) {
    const s = mergeItem(item);
    if (s.thumbnailUrl) return s.thumbnailUrl;
    if (s.mediaType === 'youtube' && s.mediaUrl) return getYoutubeThumbnail(s.mediaUrl);
    if (s.mediaType === 'image' && s.mediaUrl) return s.mediaUrl;
    return '';
  }

  function createEmpty(order) {
    return mergeItem({
      ...DEFAULT_ITEM,
      order: order || 1,
      updatedAt: new Date().toISOString()
    });
  }

  function syncFromLegacySlides(slides) {
    if (!Array.isArray(slides)) return [];
    const ids = new Set();
    return slides.map((slide, index) => fromLegacySlide(slide, index, ids));
  }

  return {
    STORAGE_KEY,
    LEGACY_KEY,
    MEDIA_TYPES,
    DEFAULT_ITEM,
    mergeItem,
    fromLegacySlide,
    toLegacySlide,
    load,
    getItems,
    getActiveItems,
    save,
    validate,
    validateImportList,
    sortForDisplay,
    getStats,
    getLatestUpdatedAt,
    getMediaTypeLabel,
    getMediaTypeClass,
    getPreviewThumbnail,
    getYoutubeEmbedUrl,
    getYoutubeId,
    createEmpty,
    syncToLegacyData,
    syncFromLegacySlides,
    slugify
  };
})();
