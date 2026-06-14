/**
 * Bambinifojo Mesajlar — shared store + legacy sync
 */
const MessagesManagerStore = (function () {
  const STORAGE_KEY = 'bambinifojo_contact_messages';
  const LEGACY_CONTACT_KEY = 'contactSubmissions';
  const LEGACY_FEEDBACK_KEY = 'aiFeedback';

  const TYPES = ['contact', 'ai_feedback'];
  const STATUSES = ['new', 'read', 'replied', 'archived'];

  const DEFAULT_ITEM = {
    id: '',
    type: 'contact',
    name: '',
    email: '',
    subject: '',
    message: '',
    source: '',
    status: 'new',
    createdAt: '',
    updatedAt: ''
  };

  const FIELD_KEYS = Object.keys(DEFAULT_ITEM);

  function toIso(value) {
    if (!value) return new Date().toISOString();
    if (typeof value === 'number') return new Date(value).toISOString();
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
  }

  function uniqueId(prefix, existingIds) {
    let id = `${prefix}-${Date.now()}`;
    let i = 1;
    while (existingIds.has(id)) {
      id = `${prefix}-${Date.now()}-${i}`;
      i += 1;
    }
    existingIds.add(id);
    return id;
  }

  function mergeItem(item) {
    const merged = { ...DEFAULT_ITEM };
    if (!item || typeof item !== 'object') return merged;

    FIELD_KEYS.forEach((key) => {
      if (item[key] === undefined || item[key] === null) return;
      if (key === 'createdAt' || key === 'updatedAt') {
        merged[key] = toIso(item[key]);
      } else {
        merged[key] = String(item[key]);
      }
    });

    if (!TYPES.includes(merged.type)) merged.type = 'contact';
    if (!STATUSES.includes(merged.status)) merged.status = 'new';

    return merged;
  }

  function fromLegacyContact(entry, index, existingIds) {
    const ts = entry.timestamp || entry.createdAt || Date.now();
    const id = entry.id || uniqueId('contact', existingIds);
    existingIds.add(id);

    return mergeItem({
      id,
      type: 'contact',
      name: entry.name || 'Ziyaretçi',
      email: entry.email || '',
      subject: entry.subject || 'İletişim Formu',
      message: entry.message || '',
      source: entry.source || 'contact_form',
      status: entry.status || 'new',
      createdAt: ts,
      updatedAt: entry.updatedAt || ts
    });
  }

  function fromLegacyFeedback(entry, index, existingIds) {
    const ts = entry.timestamp || entry.createdAt || Date.now();
    const id = entry.id || uniqueId('aifeedback', existingIds);
    existingIds.add(id);

    return mergeItem({
      id,
      type: 'ai_feedback',
      name: entry.name || 'AI Kullanıcı',
      email: entry.email || '',
      subject: entry.subject || 'AI Geri Bildirim',
      message: entry.message || '',
      source: entry.source || 'ai_assistant',
      status: entry.status || 'new',
      createdAt: ts,
      updatedAt: entry.updatedAt || ts
    });
  }

  function normalizeList(items) {
    if (!Array.isArray(items)) return [];
    const ids = new Set();
    return items.map((item, index) => {
      const merged = mergeItem(item);
      if (!merged.id) merged.id = uniqueId(merged.type || 'msg', ids);
      ids.add(merged.id);
      return merged;
    });
  }

  function loadFromStorage() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length) return normalizeList(parsed);
    } catch (e) {
      console.warn('Mesaj verisi okunamadı:', e.message);
    }
    return null;
  }

  function loadFromLegacySources() {
    const items = [];
    const ids = new Set();

    try {
      const contactRaw = localStorage.getItem(LEGACY_CONTACT_KEY);
      if (contactRaw) {
        const parsed = JSON.parse(contactRaw);
        if (Array.isArray(parsed)) {
          parsed.forEach((entry, index) => items.push(fromLegacyContact(entry, index, ids)));
        }
      }
    } catch (e) { /* ignore */ }

    try {
      const feedbackRaw = localStorage.getItem(LEGACY_FEEDBACK_KEY);
      if (feedbackRaw) {
        const parsed = JSON.parse(feedbackRaw);
        if (Array.isArray(parsed)) {
          parsed.forEach((entry, index) => items.push(fromLegacyFeedback(entry, index, ids)));
        }
      }
    } catch (e) { /* ignore */ }

    return items;
  }

  function getMessages() {
    const stored = loadFromStorage();
    if (stored && stored.length) return stored;
    return loadFromLegacySources();
  }

  function sortMessages(items, sortOrder) {
    const list = [...items];
    list.sort((a, b) => {
      const ta = new Date(a.createdAt).getTime() || 0;
      const tb = new Date(b.createdAt).getTime() || 0;
      return sortOrder === 'asc' ? ta - tb : tb - ta;
    });
    return list;
  }

  function syncToLegacyData(items) {
    const contacts = items
      .filter((m) => m.type === 'contact')
      .map((m) => ({
        id: m.id,
        name: m.name,
        email: m.email,
        subject: m.subject,
        message: m.message,
        status: m.status,
        source: m.source,
        timestamp: new Date(m.createdAt).getTime(),
        updatedAt: m.updatedAt
      }));

    const feedback = items
      .filter((m) => m.type === 'ai_feedback')
      .map((m) => ({
        id: m.id,
        message: m.message,
        timestamp: new Date(m.createdAt).getTime(),
        type: 'feedback',
        status: m.status,
        source: m.source
      }));

    try {
      localStorage.setItem(LEGACY_CONTACT_KEY, JSON.stringify(contacts.slice(0, 100)));
    } catch (e) {
      console.warn('contactSubmissions senkronizasyonu başarısız:', e.message);
    }

    try {
      localStorage.setItem(LEGACY_FEEDBACK_KEY, JSON.stringify(feedback));
    } catch (e) {
      console.warn('aiFeedback senkronizasyonu başarısız:', e.message);
    }
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

  function addMessage(entry) {
    const items = getMessages();
    const ids = new Set(items.map((i) => i.id));
    const data = mergeItem({
      ...entry,
      id: entry?.id || uniqueId(entry?.type || 'msg', ids),
      createdAt: entry?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: entry?.status || 'new'
    });
    return save([data, ...items]);
  }

  function updateMessage(id, patch) {
    const items = getMessages();
    const next = items.map((item) => {
      if (item.id !== id) return item;
      return mergeItem({ ...item, ...patch, updatedAt: new Date().toISOString() });
    });
    return save(next);
  }

  function deleteMessage(id) {
    return save(getMessages().filter((item) => item.id !== id));
  }

  function markAllRead() {
    return save(getMessages().map((item) => (
      item.status === 'new' ? { ...item, status: 'read' } : item
    )));
  }

  function isValidEmail(value) {
    if (!value || !value.trim()) return true;
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
  }

  function validate(item) {
    const errors = [];
    const data = mergeItem(item);

    if (!data.message.trim() && !data.subject.trim()) {
      errors.push('Konu veya mesaj boş olamaz.');
    }
    if (data.email && !isValidEmail(data.email)) {
      errors.push('Geçerli bir e-posta girin.');
    }
    if (!TYPES.includes(data.type)) errors.push('Geçerli bir mesaj tipi seçin.');
    if (!STATUSES.includes(data.status)) errors.push('Geçerli bir durum seçin.');

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
    const list = Array.isArray(items) ? items : getMessages();
    return {
      total: list.length,
      newCount: list.filter((m) => m.status === 'new').length,
      contact: list.filter((m) => m.type === 'contact').length,
      aiFeedback: list.filter((m) => m.type === 'ai_feedback').length
    };
  }

  function getLatestUpdatedAt(items) {
    const list = Array.isArray(items) ? items : getMessages();
    const timestamps = list
      .map((m) => new Date(m.updatedAt || m.createdAt).getTime())
      .filter((t) => t > 0);
    return timestamps.length ? Math.max(...timestamps) : null;
  }

  function getTypeLabel(type) {
    return type === 'ai_feedback' ? 'AI Geri Bildirim' : 'İletişim';
  }

  function getStatusLabel(status) {
    const map = {
      new: 'Yeni',
      read: 'Okundu',
      replied: 'Yanıtlandı',
      archived: 'Arşiv'
    };
    return map[status] || status;
  }

  function getStatusClass(status) {
    return `msg-status-${status || 'new'}`;
  }

  function getTypeClass(type) {
    return `msg-type-${type || 'contact'}`;
  }

  function getMailtoLink(item) {
    const m = mergeItem(item);
    if (!m.email) return '';
    const subject = m.subject ? `Re: ${m.subject}` : 'Re: Mesajınız';
    const body = `\n\n---\nOrijinal mesaj (${new Date(m.createdAt).toLocaleString('tr-TR')}):\n${m.message}`;
    return `mailto:${encodeURIComponent(m.email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  }

  function truncate(text, max) {
    const t = String(text || '');
    if (t.length <= max) return t;
    return `${t.slice(0, max)}…`;
  }

  function ensureMigrated() {
    if (localStorage.getItem(STORAGE_KEY)) return getMessages();
    const legacy = loadFromLegacySources();
    if (legacy.length) save(legacy);
    return getMessages();
  }

  return {
    STORAGE_KEY,
    LEGACY_CONTACT_KEY,
    LEGACY_FEEDBACK_KEY,
    TYPES,
    STATUSES,
    DEFAULT_ITEM,
    mergeItem,
    getMessages,
    sortMessages,
    save,
    addMessage,
    updateMessage,
    deleteMessage,
    markAllRead,
    validate,
    validateImportList,
    getStats,
    getLatestUpdatedAt,
    getTypeLabel,
    getStatusLabel,
    getStatusClass,
    getTypeClass,
    getMailtoLink,
    truncate,
    ensureMigrated,
    syncToLegacyData
  };
})();
