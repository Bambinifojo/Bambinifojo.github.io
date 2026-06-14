/**
 * Admin — AI Asistan Ayarları (Sprint 5B)
 */
const AdminAiSettings = (function () {
  let currentSettings = AiSettingsStore.getDefaults();
  let importInput = null;

  function $(id) {
    return document.getElementById(id);
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = String(text ?? '');
    return div.innerHTML;
  }

  function showToast(message, type) {
    if (typeof showAlert === 'function') {
      showAlert(message, type === 'error' ? 'error' : 'success');
      return;
    }
    const toast = $('adminAiSettingsToast');
    if (!toast) return;
    toast.textContent = message;
    toast.className = `admin-toast is-visible is-${type || 'success'}`;
    setTimeout(() => toast.classList.remove('is-visible'), 3200);
  }

  function readForm() {
    const quickInputs = document.querySelectorAll('#adminAiQuickRepliesList .admin-ai-quick-input');
    const quickReplies = Array.from(quickInputs)
      .map((input) => input.value.trim())
      .filter(Boolean);

    return AiSettingsStore.merge({
      enabled: !!$('aiSetEnabled')?.checked,
      title: $('aiSetTitle')?.value || '',
      subtitle: $('aiSetSubtitle')?.value || '',
      demoCredits: Number($('aiSetDemoCredits')?.value || 3),
      welcomeMessage: $('aiSetWelcome')?.value || '',
      placeholder: $('aiSetPlaceholder')?.value || '',
      fallbackMessage: $('aiSetFallback')?.value || '',
      quickReplies
    });
  }

  function writeForm(settings) {
    currentSettings = AiSettingsStore.merge(settings);
    $('aiSetEnabled').checked = currentSettings.enabled;
    $('aiSetTitle').value = currentSettings.title;
    $('aiSetSubtitle').value = currentSettings.subtitle;
    $('aiSetDemoCredits').value = currentSettings.demoCredits;
    $('aiSetWelcome').value = currentSettings.welcomeMessage;
    $('aiSetPlaceholder').value = currentSettings.placeholder;
    $('aiSetFallback').value = currentSettings.fallbackMessage;
    renderQuickRepliesEditor(currentSettings.quickReplies);
    updatePreview(currentSettings);
  }

  function renderQuickRepliesEditor(replies) {
    const list = $('adminAiQuickRepliesList');
    if (!list) return;
    const items = Array.isArray(replies) && replies.length ? replies : [''];

    list.innerHTML = items.map((text, index) => `
      <div class="admin-ai-quick-row" data-index="${index}">
        <input type="text" class="admin-ai-quick-input" value="${escapeHtml(text)}" placeholder="Hazır cevap metni">
        <div class="admin-ai-quick-row-actions">
          <button type="button" class="btn btn-secondary btn-sm" data-move="up" data-index="${index}" title="Yukarı">↑</button>
          <button type="button" class="btn btn-secondary btn-sm" data-move="down" data-index="${index}" title="Aşağı">↓</button>
          <button type="button" class="btn btn-danger btn-sm" data-remove="${index}" title="Sil">✕</button>
        </div>
      </div>
    `).join('');

    list.querySelectorAll('.admin-ai-quick-input').forEach((input) => {
      input.addEventListener('input', () => updatePreview(readForm()));
    });

    list.querySelectorAll('[data-remove]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const idx = Number(btn.dataset.remove);
        const next = readForm().quickReplies.filter((_, i) => i !== idx);
        renderQuickRepliesEditor(next.length ? next : ['']);
        updatePreview(readForm());
      });
    });

    list.querySelectorAll('[data-move]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const idx = Number(btn.dataset.index);
        const arr = [...readForm().quickReplies];
        const target = btn.dataset.move === 'up' ? idx - 1 : idx + 1;
        if (target < 0 || target >= arr.length) return;
        [arr[idx], arr[target]] = [arr[target], arr[idx]];
        renderQuickRepliesEditor(arr);
        updatePreview(readForm());
      });
    });
  }

  function updatePreview(settings) {
    const s = AiSettingsStore.merge(settings);
    const set = (id, value) => {
      const el = $(id);
      if (el) el.textContent = value || '—';
    };

    set('aiPreviewTitle', s.title);
    set('aiPreviewSubtitle', s.subtitle);
    set('aiPreviewWelcome', s.welcomeMessage);
    set('aiPreviewPlaceholder', s.placeholder);
    set('aiPreviewCredits', String(s.demoCredits));
    set('aiPreviewFallback', s.fallbackMessage);

    const previewReplies = $('aiPreviewQuickReplies');
    if (previewReplies) {
      if (!s.quickReplies.length) {
        previewReplies.innerHTML = '<span class="admin-ai-preview-empty">Hazır cevap yok</span>';
      } else {
        previewReplies.innerHTML = s.quickReplies.map((text) => `
          <span class="admin-ai-preview-chip">${escapeHtml(text)}</span>
        `).join('');
      }
    }

    const status = $('aiPreviewStatus');
    if (status) {
      status.textContent = s.enabled ? 'Aktif' : 'Pasif';
      status.className = `admin-ai-preview-status ${s.enabled ? 'is-on' : 'is-off'}`;
    }
  }

  function onSave(e) {
    e.preventDefault();
    const { errors, data } = AiSettingsStore.validate(readForm());
    if (errors.length) {
      showToast(errors[0], 'error');
      return;
    }

    currentSettings = AiSettingsStore.save(data);
    writeForm(currentSettings);

    if (typeof logActivity === 'function') {
      logActivity('update', 'AI asistan ayarları güncellendi');
    }
    if (typeof refreshAdminDashboard === 'function') refreshAdminDashboard();

    showToast('AI asistan ayarları kaydedildi.', 'success');
  }

  function onReset() {
    if (!confirm('AI asistan ayarlarını varsayılana sıfırlamak istediğinize emin misiniz?')) return;
    currentSettings = AiSettingsStore.reset();
    writeForm(currentSettings);
    if (typeof logActivity === 'function') logActivity('update', 'AI asistan ayarları sıfırlandı');
    if (typeof refreshAdminDashboard === 'function') refreshAdminDashboard();
    showToast('Ayarlar varsayılana sıfırlandı.', 'success');
  }

  function onExport() {
    const blob = new Blob([JSON.stringify(currentSettings, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'bambinifojo-ai-settings.json';
    a.click();
    URL.revokeObjectURL(url);
    showToast('AI ayarları dışa aktarıldı.', 'success');
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
        const { errors, data } = AiSettingsStore.validateImport(parsed);
        if (errors.length) {
          showToast(errors[0], 'error');
          return;
        }
        currentSettings = AiSettingsStore.save(data);
        writeForm(currentSettings);
        if (typeof logActivity === 'function') logActivity('update', 'AI asistan ayarları içe aktarıldı');
        if (typeof refreshAdminDashboard === 'function') refreshAdminDashboard();
        showToast('AI ayarları içe aktarıldı.', 'success');
      } catch (err) {
        showToast('Geçersiz JSON dosyası.', 'error');
      }
    };
    reader.readAsText(file);
  }

  function bindEvents() {
    const root = $('adminAiSettingsRoot');
    if (!root || root.dataset.bound === '1') return;
    root.dataset.bound = '1';

    $('adminAiSettingsForm')?.addEventListener('submit', onSave);
    $('adminAiSettingsResetBtn')?.addEventListener('click', onReset);
    $('adminAiSettingsExportBtn')?.addEventListener('click', onExport);
    $('adminAiSettingsImportBtn')?.addEventListener('click', onImportClick);
    $('adminAiQuickAddBtn')?.addEventListener('click', () => {
      const replies = [...readForm().quickReplies, ''];
      renderQuickRepliesEditor(replies);
    });

    ['aiSetEnabled', 'aiSetTitle', 'aiSetSubtitle', 'aiSetDemoCredits', 'aiSetWelcome', 'aiSetPlaceholder', 'aiSetFallback'].forEach((id) => {
      $(id)?.addEventListener('input', () => updatePreview(readForm()));
      $(id)?.addEventListener('change', () => updatePreview(readForm()));
    });
  }

  function init() {
    const root = $('adminAiSettingsRoot');
    if (!root) return;
    bindEvents();
    currentSettings = AiSettingsStore.load();
    if (!localStorage.getItem(AiSettingsStore.STORAGE_KEY)) {
      AiSettingsStore.save(currentSettings);
    }
    writeForm(currentSettings);
  }

  return { init };
})();

function initAdminAiSettings() {
  AdminAiSettings.init();
}

function loadAISettings() {
  if (document.getElementById('adminAiSettingsRoot')) {
    initAdminAiSettings();
  }
}

function loadLegacyAISettings() {
  const saved = localStorage.getItem('aiConfig');
  if (!saved) return;
  try {
    const config = JSON.parse(saved);
    const setChecked = (id, value) => {
      const el = document.getElementById(id);
      if (el) el.checked = !!value;
    };
    const setValue = (id, value) => {
      const el = document.getElementById(id);
      if (el && value !== undefined && value !== null) el.value = value;
    };

    setChecked('ai_enabled', config.enabled);
    setValue('ai_model', config.model || 'gpt-3.5-turbo');
    setValue('ai_api_key', config.apiKey || '');
    setValue('ai_daily_credit', config.dailyCredit || 5);
    setValue('ai_max_tokens', config.maxTokens || 400);
    setValue('ai_system_prompt', config.systemPrompt || '');
    setChecked('ai_floating_button', config.floatingButton);
    setChecked('ai_show_on_home', config.showOnHome);
    setChecked('ai_save_chat_history', config.saveChatHistory);
  } catch (e) {
    console.warn('Legacy AI config okunamadı:', e.message);
  }

  const emailjsSaved = localStorage.getItem('emailjsConfig');
  if (!emailjsSaved) return;
  try {
    const emailjsConfig = JSON.parse(emailjsSaved);
    const setChecked = (id, value) => {
      const el = document.getElementById(id);
      if (el) el.checked = !!value;
    };
    const setValue = (id, value) => {
      const el = document.getElementById(id);
      if (el && value !== undefined && value !== null) el.value = value;
    };
    setChecked('ai_email_enabled', emailjsConfig.enabled);
    setValue('emailjs_service_id', emailjsConfig.serviceId || '');
    setValue('emailjs_template_id', emailjsConfig.templateId || '');
    setValue('emailjs_public_key', emailjsConfig.publicKey || '');
    setValue('emailjs_to_email', emailjsConfig.toEmail || 'bambinifojo@gmail.com');
  } catch (e) {
    console.warn('EmailJS config okunamadı:', e.message);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('adminAiSettingsRoot')) initAdminAiSettings();
});

console.log('✅ admin-ai-settings.js yüklendi');
