/**
 * Admin — Site Ayarları (Sprint 2)
 */
const AdminSiteSettings = (function () {
  const FORM_ID = 'adminSiteSettingsForm';
  let currentSettings = SiteSettingsStore.getDefaults();
  let importInput = null;

  const FIELD_MAP = [
    { id: 'ssBrandName', key: 'brandName', group: 'brand' },
    { id: 'ssBrandSubtitle', key: 'brandSubtitle', group: 'brand' },
    { id: 'ssFooterText', key: 'footerText', group: 'brand', type: 'textarea' },
    { id: 'ssHeroBadge', key: 'heroBadge', group: 'hero' },
    { id: 'ssHeroTitle', key: 'heroTitle', group: 'hero' },
    { id: 'ssHeroDescription', key: 'heroDescription', group: 'hero', type: 'textarea' },
    { id: 'ssPrimaryCtaText', key: 'primaryCtaText', group: 'hero' },
    { id: 'ssPrimaryCtaUrl', key: 'primaryCtaUrl', group: 'hero' },
    { id: 'ssSecondaryCtaText', key: 'secondaryCtaText', group: 'hero' },
    { id: 'ssSecondaryCtaUrl', key: 'secondaryCtaUrl', group: 'hero' },
    { id: 'ssEmail', key: 'email', group: 'links' },
    { id: 'ssGithubUrl', key: 'githubUrl', group: 'links' },
    { id: 'ssPlayStoreUrl', key: 'playStoreUrl', group: 'links' },
    { id: 'ssPortfolioUrl', key: 'portfolioUrl', group: 'links' },
    { id: 'ssSeoTitle', key: 'seoTitle', group: 'seo' },
    { id: 'ssSeoDescription', key: 'seoDescription', group: 'seo', type: 'textarea' },
    { id: 'ssOgImageUrl', key: 'ogImageUrl', group: 'seo' }
  ];

  function $(id) {
    return document.getElementById(id);
  }

  function readForm() {
    const data = {};
    FIELD_MAP.forEach(({ id, key }) => {
      const el = $(id);
      if (el) data[key] = el.value;
    });
    return SiteSettingsStore.merge(data);
  }

  function writeForm(settings) {
    currentSettings = SiteSettingsStore.merge(settings);
    FIELD_MAP.forEach(({ id, key }) => {
      const el = $(id);
      if (el) el.value = currentSettings[key] || '';
    });
    updatePreview(currentSettings);
    updateSeoCounter();
  }

  function updateSeoCounter() {
    const el = $('ssSeoDescription');
    const counter = $('ssSeoCounter');
    if (!el || !counter) return;
    const len = el.value.length;
    counter.textContent = `${len} / 160 karakter`;
    counter.classList.toggle('is-warn', len > 160);
  }

  function updatePreview(settings) {
    const s = SiteSettingsStore.merge(settings);
    const set = (id, value) => {
      const el = $(id);
      if (el) el.textContent = value || '—';
    };

    set('ssPreviewBrand', s.brandName);
    set('ssPreviewSubtitle', s.brandSubtitle);
    set('ssPreviewBadge', s.heroBadge);
    set('ssPreviewTitle', s.heroTitle);
    set('ssPreviewDesc', s.heroDescription);

    const primary = $('ssPreviewPrimary');
    const secondary = $('ssPreviewSecondary');
    if (primary) primary.textContent = s.primaryCtaText || 'CTA';
    if (secondary) secondary.textContent = s.secondaryCtaText || 'CTA 2';
  }

  function showToast(message, type) {
    if (typeof showAlert === 'function') {
      showAlert(message, type === 'error' ? 'error' : 'success');
      return;
    }
    const toast = $('adminSiteSettingsToast');
    if (!toast) return;
    toast.textContent = message;
    toast.className = `admin-toast is-visible is-${type || 'success'}`;
    setTimeout(() => toast.classList.remove('is-visible'), 3200);
  }

  function persistAppsData() {
    if (typeof appsData === 'undefined') return;
    appsData.site = SiteSettingsStore.syncToAppsSite(currentSettings, appsData.site || {});
    try {
      localStorage.setItem('appsData', JSON.stringify(appsData));
    } catch (e) {
      console.warn('appsData kaydedilemedi:', e.message);
    }
  }

  function onSave() {
    const { errors, warnings, data } = SiteSettingsStore.validate(readForm());
    if (errors.length) {
      showToast(errors[0], 'error');
      return;
    }

    currentSettings = SiteSettingsStore.save(data);
    persistAppsData();

    if (typeof logActivity === 'function') {
      logActivity('update', 'Site ayarları güncellendi');
    }
    if (typeof refreshAdminDashboard === 'function') {
      refreshAdminDashboard();
    }

    let msg = 'Site ayarları kaydedildi.';
    if (warnings.length) msg += ` ${warnings[0]}`;
    showToast(msg, 'success');
  }

  function onReset() {
    if (!confirm('Tüm site ayarları varsayılan değerlere dönecek. Emin misiniz?')) return;
    currentSettings = SiteSettingsStore.save(SiteSettingsStore.getDefaults());
    writeForm(currentSettings);
    persistAppsData();
    if (typeof logActivity === 'function') logActivity('update', 'Site ayarları varsayılana sıfırlandı');
    if (typeof refreshAdminDashboard === 'function') refreshAdminDashboard();
    showToast('Varsayılan ayarlar yüklendi.', 'success');
  }

  function onExport() {
    const blob = new Blob([JSON.stringify(currentSettings, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'bambinifojo-site-settings.json';
    a.click();
    URL.revokeObjectURL(url);
    showToast('Ayarlar dışa aktarıldı.', 'success');
  }

  function onImportClick() {
    if (!importInput) {
      importInput = document.createElement('input');
      importInput.type = 'file';
      importInput.accept = 'application/json,.json';
      importInput.style.display = 'none';
      importInput.addEventListener('change', onImportFile);
      document.body.appendChild(importInput);
    }
    importInput.value = '';
    importInput.click();
  }

  function onImportFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result);
        const { errors, data } = SiteSettingsStore.validate(parsed);
        if (errors.length) {
          showToast(errors[0], 'error');
          return;
        }
        currentSettings = SiteSettingsStore.save(data);
        writeForm(currentSettings);
        persistAppsData();
        if (typeof logActivity === 'function') logActivity('update', 'Site ayarları içe aktarıldı');
        if (typeof refreshAdminDashboard === 'function') refreshAdminDashboard();
        showToast('Ayarlar içe aktarıldı.', 'success');
      } catch (err) {
        showToast('Geçersiz JSON dosyası.', 'error');
      }
    };
    reader.readAsText(file);
  }

  function bindEvents() {
    const form = $(FORM_ID);
    if (!form || form.dataset.bound === '1') return;
    form.dataset.bound = '1';

    form.addEventListener('input', () => {
      updatePreview(readForm());
      updateSeoCounter();
    });

    $('ssSaveBtn')?.addEventListener('click', (e) => { e.preventDefault(); onSave(); });
    $('ssResetBtn')?.addEventListener('click', (e) => { e.preventDefault(); onReset(); });
    $('ssExportBtn')?.addEventListener('click', (e) => { e.preventDefault(); onExport(); });
    $('ssImportBtn')?.addEventListener('click', (e) => { e.preventDefault(); onImportClick(); });
  }

  function resolveInitialSettings() {
    const stored = SiteSettingsStore.load();
    if (stored) return stored;

    if (typeof appsData !== 'undefined' && appsData?.site) {
      return SiteSettingsStore.buildFromSiteJson(appsData.site);
    }

    return SiteSettingsStore.getDefaults();
  }

  function init() {
    const root = $('adminSiteSettingsRoot');
    if (!root) return;

    bindEvents();
    writeForm(resolveInitialSettings());
  }

  return { init, readForm, writeForm, updatePreview };
})();

function initAdminSiteSettings() {
  AdminSiteSettings.init();
}

document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('adminSiteSettingsRoot')) {
    initAdminSiteSettings();
  }
});

console.log('✅ admin-site-settings.js yüklendi');
