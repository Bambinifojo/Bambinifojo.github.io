/**
 * Bambinifojo AI Asistan Ayarları — shared store
 */
const AiSettingsStore = (function () {
  const STORAGE_KEY = 'bambinifojo_ai_settings';
  const LEGACY_CONFIG_KEY = 'aiConfig';
  const LEGACY_CREDITS_KEY = 'aiCredits';

  const DEFAULTS = {
    enabled: true,
    title: 'Bambinifojo AI',
    subtitle: 'Beta asistan',
    welcomeMessage: 'Merhaba! Bambinifojo Studio asistanıyım. Uygulamalar, iş birlikleri veya teknik sorular hakkında yardımcı olabilirim.',
    placeholder: 'Mesaj yaz...',
    demoCredits: 3,
    fallbackMessage: 'Şu an demo modda çalışıyorum. İletişim için e-posta gönderebilirsin.',
    quickReplies: [
      'Uygulamaların hakkında bilgi ver',
      'İş birliği için nasıl iletişime geçerim?',
      'Hangi teknolojileri kullanıyorsun?',
      'Play Store uygulamaların nerede?'
    ],
    updatedAt: ''
  };

  const FIELD_KEYS = Object.keys(DEFAULTS);

  function merge(settings) {
    const merged = { ...DEFAULTS, quickReplies: [...DEFAULTS.quickReplies] };
    if (!settings || typeof settings !== 'object') return merged;

    FIELD_KEYS.forEach((key) => {
      if (settings[key] === undefined || settings[key] === null) return;
      if (key === 'enabled') {
        merged[key] = !!settings[key];
      } else if (key === 'demoCredits') {
        merged[key] = Math.max(0, Number(settings[key]) || 0);
      } else if (key === 'quickReplies') {
        merged[key] = Array.isArray(settings[key])
          ? settings[key].map((r) => String(r).trim()).filter(Boolean)
          : [...DEFAULTS.quickReplies];
      } else if (key === 'updatedAt') {
        merged[key] = String(settings[key]);
      } else {
        merged[key] = String(settings[key]);
      }
    });

    return merged;
  }

  function loadFromLegacyConfig() {
    try {
      const raw = localStorage.getItem(LEGACY_CONFIG_KEY);
      if (!raw) return null;
      const config = JSON.parse(raw);
      const patch = {};
      if (config.enabled !== undefined) patch.enabled = !!config.enabled;
      if (config.dailyCredit !== undefined) patch.demoCredits = Math.max(0, Number(config.dailyCredit) || 3);
      if (config.systemPrompt) patch.welcomeMessage = config.systemPrompt;
      return Object.keys(patch).length ? patch : null;
    } catch (e) {
      return null;
    }
  }

  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return merge(JSON.parse(raw));
    } catch (e) {
      console.warn('AI ayarları okunamadı:', e.message);
    }

    const legacy = loadFromLegacyConfig();
    return merge(legacy || {});
  }

  function save(settings) {
    const merged = merge({
      ...settings,
      updatedAt: new Date().toISOString()
    });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
    return merged;
  }

  function getDefaults() {
    return merge({});
  }

  function reset() {
    return save(getDefaults());
  }

  function validate(settings) {
    const errors = [];
    const data = merge(settings);

    if (!data.title.trim()) errors.push('Başlık boş olamaz.');
    if (!data.welcomeMessage.trim()) errors.push('Karşılama mesajı boş olamaz.');
    if (!data.placeholder.trim()) errors.push('Placeholder boş olamaz.');
    if (Number.isNaN(Number(data.demoCredits)) || data.demoCredits < 0) {
      errors.push('Demo kredi sayısı 0 veya pozitif olmalı.');
    }

    return { errors, data };
  }

  function validateImport(data) {
    if (!data || typeof data !== 'object') {
      return { errors: ['Geçerli bir JSON nesnesi olmalı.'], data: null };
    }
    return validate(data);
  }

  function getLatestUpdatedAt() {
    const settings = load();
    if (!settings.updatedAt) return null;
    const ts = new Date(settings.updatedAt).getTime();
    return Number.isNaN(ts) ? null : ts;
  }

  function getDemoCreditsDefault() {
    return load().demoCredits;
  }

  function applyToDocument(settings) {
    const s = merge(settings);
    const widget = document.getElementById('aiAssistantWidget');
    const modal = document.getElementById('aiAssistantModal');

    if (widget) {
      widget.style.display = s.enabled ? '' : 'none';
      widget.setAttribute('aria-hidden', s.enabled ? 'false' : 'true');
    }

    const label = document.querySelector('.ai-assistant-label');
    if (label) label.textContent = s.subtitle ? `${s.title} ${s.subtitle}` : s.title;

    const titleEl = document.querySelector('.ai-logo-title');
    const subtitleEl = document.querySelector('.ai-logo-subtitle');
    if (titleEl) titleEl.textContent = s.title;
    if (subtitleEl) subtitleEl.textContent = s.subtitle;

    const input = document.getElementById('aiMessageInput');
    if (input) input.placeholder = s.placeholder;

    const toggleBtn = document.getElementById('aiAssistantToggle');
    if (toggleBtn) toggleBtn.title = s.title;

    if (!s.enabled && modal) {
      modal.classList.remove('active');
      modal.setAttribute('aria-hidden', 'true');
      document.body.classList.remove('ai-assistant-open');
    }

    return s;
  }

  function renderQuickReplies(container, settings, onSelect) {
    if (!container) return;
    const s = merge(settings);
    if (!s.quickReplies.length) {
      container.innerHTML = '';
      container.hidden = true;
      return;
    }

    container.hidden = false;
    container.innerHTML = s.quickReplies.map((text) => `
      <button type="button" class="ai-quick-reply" data-reply="${encodeURIComponent(text)}">${escapeHtml(text)}</button>
    `).join('');

    container.querySelectorAll('.ai-quick-reply').forEach((btn) => {
      btn.addEventListener('click', () => {
        const reply = decodeURIComponent(btn.dataset.reply || '');
        if (onSelect && reply) onSelect(reply);
      });
    });
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = String(text ?? '');
    return div.innerHTML;
  }

  return {
    STORAGE_KEY,
    DEFAULTS,
    merge,
    load,
    save,
    reset,
    getDefaults,
    validate,
    validateImport,
    getLatestUpdatedAt,
    getDemoCreditsDefault,
    applyToDocument,
    renderQuickReplies
  };
})();
