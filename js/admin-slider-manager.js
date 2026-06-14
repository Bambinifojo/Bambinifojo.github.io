/**
 * Admin — Slider / Medya Yönetimi (Sprint 4)
 */
const AdminSliderManager = (function () {
  let items = [];
  let filters = { search: '', mediaType: 'all', active: 'all' };
  let editingId = null;
  let importInput = null;

  const FORM_ID = 'adminSliderForm';

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
    const toast = $('adminSliderToast');
    if (!toast) return;
    toast.textContent = message;
    toast.className = `admin-toast is-visible is-${type || 'success'}`;
    setTimeout(() => toast.classList.remove('is-visible'), 3200);
  }

  function refreshItems() {
    items = SliderManagerStore.getItems();
    renderList();
    updateCount();
    if (typeof refreshAdminDashboard === 'function') refreshAdminDashboard();
  }

  function persist(nextItems, activityMessage, activityType) {
    items = SliderManagerStore.save(nextItems.map((item) => ({
      ...item,
      updatedAt: new Date().toISOString()
    })));

    if (activityMessage && typeof logActivity === 'function') {
      logActivity(activityType || 'update', activityMessage);
    }

    if (typeof onSliderSectionShow === 'function') {
      /* legacy hook noop */
    }
    renderList();
    updateCount();
    if (typeof refreshAdminDashboard === 'function') refreshAdminDashboard();
  }

  function updateCount() {
    const el = $('sliderItemsCount');
    if (el) el.textContent = `(${items.length} öğe)`;
  }

  function getFilteredItems() {
    return items.filter((item) => {
      const q = filters.search.trim().toLowerCase();
      if (q) {
        const hay = [item.title, item.description, item.badge, item.mediaType].join(' ').toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (filters.mediaType !== 'all' && item.mediaType !== filters.mediaType) return false;
      if (filters.active === 'active' && !item.active) return false;
      if (filters.active === 'inactive' && item.active) return false;
      return true;
    }).sort((a, b) => (Number(a.order) || 0) - (Number(b.order) || 0));
  }

  function renderMediaPreview(item) {
    const thumb = SliderManagerStore.getPreviewThumbnail(item);
    if (thumb) {
      return `<img src="${escapeHtml(thumb)}" alt="" class="admin-slider-thumb-image" loading="lazy" onerror="this.classList.add('is-broken');">`;
    }
    if (item.mediaType === 'video' && item.mediaUrl) {
      return `<video class="admin-slider-thumb-video" src="${escapeHtml(item.mediaUrl)}" muted playsinline preload="metadata"></video>`;
    }
    return `<div class="admin-slider-thumb-empty"><span>🎬</span><small>Önizleme yok</small></div>`;
  }

  function renderList() {
    const container = $('adminSliderList');
    if (!container) return;

    const filtered = getFilteredItems();

    if (!items.length) {
      container.innerHTML = `
        <div class="admin-empty-state">
          <div class="admin-empty-state-icon">🎬</div>
          <strong>Henüz medya öğesi yok</strong>
          <p>Ana sayfa vitrini için görsel, video veya YouTube içeriği ekleyin.</p>
          <button type="button" class="btn btn-primary" id="adminSliderEmptyAdd">Yeni Medya</button>
        </div>
      `;
      $('adminSliderEmptyAdd')?.addEventListener('click', openCreate);
      return;
    }

    if (!filtered.length) {
      container.innerHTML = `
        <div class="admin-empty-state">
          <div class="admin-empty-state-icon">🔍</div>
          <strong>Sonuç bulunamadı</strong>
          <p>Filtreleri değiştirerek tekrar deneyin.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = filtered.map((item) => {
      const previewUrl = item.mediaUrl || item.thumbnailUrl;
      const links = [];
      if (previewUrl) {
        links.push(`<a href="${escapeHtml(previewUrl)}" target="_blank" rel="noopener" class="admin-app-link">Önizle</a>`);
      }
      if (item.ctaUrl) {
        links.push(`<a href="${escapeHtml(item.ctaUrl)}" target="_blank" rel="noopener" class="admin-app-link">CTA</a>`);
      }

      return `
        <article class="admin-slider-card" data-slider-id="${escapeHtml(item.id)}">
          <div class="admin-slider-thumb">${renderMediaPreview(item)}</div>
          <div class="admin-slider-card-body">
            <div class="admin-slider-card-head">
              <h3 class="admin-slider-card-title">${escapeHtml(item.title)}</h3>
              <span class="admin-app-order">#${escapeHtml(String(item.order))}</span>
            </div>
            <p class="admin-slider-card-desc">${escapeHtml(item.description || '—')}</p>
            <div class="admin-slider-card-badges">
              ${item.badge ? `<span class="admin-slider-badge">${escapeHtml(item.badge)}</span>` : ''}
              <span class="admin-slider-media-type ${SliderManagerStore.getMediaTypeClass(item.mediaType)}">${escapeHtml(SliderManagerStore.getMediaTypeLabel(item.mediaType))}</span>
              ${item.featured ? '<span class="admin-app-featured">Öne Çıkan</span>' : ''}
            </div>
            ${links.length ? `<div class="admin-app-links">${links.join('')}</div>` : ''}
          </div>
          <div class="admin-slider-card-actions">
            <label class="admin-switch" title="Aktif">
              <input type="checkbox" data-action="toggle-active" data-id="${escapeHtml(item.id)}" ${item.active ? 'checked' : ''}>
              <span>Aktif</span>
            </label>
            <label class="admin-switch" title="Öne çıkar">
              <input type="checkbox" data-action="toggle-featured" data-id="${escapeHtml(item.id)}" ${item.featured ? 'checked' : ''}>
              <span>Öne Çıkan</span>
            </label>
            <button type="button" class="btn btn-secondary btn-sm" data-action="edit" data-id="${escapeHtml(item.id)}">Düzenle</button>
            <button type="button" class="btn btn-danger btn-sm" data-action="delete" data-id="${escapeHtml(item.id)}">Sil</button>
          </div>
        </article>
      `;
    }).join('');

    container.querySelectorAll('[data-action]').forEach((el) => {
      el.addEventListener('click', onCardAction);
      if (el.tagName === 'INPUT') el.addEventListener('change', onCardAction);
    });
  }

  function onCardAction(e) {
    const el = e.currentTarget;
    const action = el.dataset.action;
    const id = el.dataset.id;
    if (!id) return;

    if (action === 'edit') {
      openEdit(id);
      return;
    }

    if (action === 'delete') {
      const item = items.find((i) => i.id === id);
      if (!item) return;
      if (!confirm(`"${item.title}" öğesini silmek istediğinize emin misiniz?`)) return;
      persist(items.filter((i) => i.id !== id), 'Slider öğesi silindi', 'delete');
      showToast('Medya öğesi silindi.', 'success');
      return;
    }

    if (action === 'toggle-active') {
      const next = items.map((i) => (i.id === id ? { ...i, active: el.checked } : i));
      const item = next.find((i) => i.id === id);
      persist(next, `"${item?.title}" ${el.checked ? 'aktif' : 'pasif'} yapıldı`);
      return;
    }

    if (action === 'toggle-featured') {
      const next = items.map((i) => (i.id === id ? { ...i, featured: el.checked } : i));
      persist(next, `"${next.find((i) => i.id === id)?.title}" öne çıkarma güncellendi`);
    }
  }

  function readForm() {
    return SliderManagerStore.mergeItem({
      id: $('slMgrId')?.value || '',
      title: $('slMgrTitle')?.value || '',
      description: $('slMgrDescription')?.value || '',
      badge: $('slMgrBadge')?.value || '',
      mediaType: $('slMgrMediaType')?.value || 'image',
      mediaUrl: $('slMgrMediaUrl')?.value || '',
      thumbnailUrl: $('slMgrThumbnailUrl')?.value || '',
      ctaText: $('slMgrCtaText')?.value || '',
      ctaUrl: $('slMgrCtaUrl')?.value || '',
      order: Number($('slMgrOrder')?.value || 1),
      featured: !!$('slMgrFeatured')?.checked,
      active: !!$('slMgrActive')?.checked
    });
  }

  function writeForm(item) {
    const data = SliderManagerStore.mergeItem(item);
    $('slMgrId').value = data.id;
    $('slMgrTitle').value = data.title;
    $('slMgrDescription').value = data.description;
    $('slMgrBadge').value = data.badge;
    $('slMgrMediaType').value = data.mediaType;
    $('slMgrMediaUrl').value = data.mediaUrl;
    $('slMgrThumbnailUrl').value = data.thumbnailUrl;
    $('slMgrCtaText').value = data.ctaText;
    $('slMgrCtaUrl').value = data.ctaUrl;
    $('slMgrOrder').value = data.order;
    $('slMgrFeatured').checked = data.featured;
    $('slMgrActive').checked = data.active;
  }

  function openModal(title, item, showDelete) {
    editingId = item?.id || null;
    $('adminSliderModalTitle').textContent = title;
    $('adminSliderDeleteBtn').style.display = showDelete ? 'inline-flex' : 'none';
    writeForm(item || SliderManagerStore.createEmpty(items.length + 1));
    $('adminSliderModal')?.classList.add('active');
    document.body.classList.add('modal-open');
  }

  function closeModal() {
    $('adminSliderModal')?.classList.remove('active');
    document.body.classList.remove('modal-open');
    editingId = null;
  }

  function openCreate() {
    openModal('Yeni Medya', SliderManagerStore.createEmpty(items.length + 1), false);
  }

  function openEdit(id) {
    const item = items.find((i) => i.id === id);
    if (!item) return;
    openModal('Medya Düzenle', item, true);
  }

  function onSave(e) {
    e.preventDefault();
    const { errors, data } = SliderManagerStore.validate(readForm());
    if (errors.length) {
      showToast(errors[0], 'error');
      return;
    }

    if (!data.id) data.id = SliderManagerStore.slugify(data.title);

    const exists = items.some((i) => i.id === data.id);
    let next;
    let message;
    let type = 'update';

    if (editingId) {
      const prev = items.find((i) => i.id === editingId);
      data._legacy = prev?._legacy || {};
      if (editingId !== data.id && exists) {
        showToast('Bu ID zaten kullanılıyor.', 'error');
        return;
      }
      next = items.map((i) => (i.id === editingId ? { ...data, updatedAt: new Date().toISOString() } : i));
      message = 'Slider öğesi güncellendi';
    } else {
      if (exists) data.id = SliderManagerStore.slugify(`${data.title}-${Date.now()}`);
      next = [...items, { ...data, updatedAt: new Date().toISOString() }];
      message = 'Yeni slider öğesi eklendi';
      type = 'create';
    }

    persist(next, message, type);
    closeModal();
    showToast('Medya kaydedildi.', 'success');
  }

  function onDeleteFromModal() {
    if (!editingId) return;
    const item = items.find((i) => i.id === editingId);
    if (!item) return;
    if (!confirm(`"${item.title}" öğesini silmek istediğinize emin misiniz?`)) return;
    persist(items.filter((i) => i.id !== editingId), 'Slider öğesi silindi', 'delete');
    closeModal();
    showToast('Medya öğesi silindi.', 'success');
  }

  function onExport() {
    const blob = new Blob([JSON.stringify(items, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'bambinifojo-slider.json';
    a.click();
    URL.revokeObjectURL(url);
    showToast('Slider dışa aktarıldı.', 'success');
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
        const { errors, items: imported } = SliderManagerStore.validateImportList(parsed);
        if (errors.length && !imported.length) {
          showToast(errors[0], 'error');
          return;
        }
        persist(imported, 'Slider öğeleri içe aktarıldı');
        if (errors.length) showToast(`İçe aktarıldı. ${errors.length} kayıt atlandı.`, 'success');
        else showToast('Slider içe aktarıldı.', 'success');
      } catch (err) {
        showToast('Geçersiz JSON dosyası.', 'error');
      }
    };
    reader.readAsText(file);
  }

  function bindEvents() {
    const root = $('adminSliderRoot');
    if (!root || root.dataset.bound === '1') return;
    root.dataset.bound = '1';

    $('adminSliderAddBtn')?.addEventListener('click', openCreate);
    $('adminSliderExportBtn')?.addEventListener('click', onExport);
    $('adminSliderImportBtn')?.addEventListener('click', onImportClick);
    $('adminSliderSearch')?.addEventListener('input', (e) => {
      filters.search = e.target.value;
      renderList();
    });
    $('adminSliderTypeFilter')?.addEventListener('change', (e) => {
      filters.mediaType = e.target.value;
      renderList();
    });
    $('adminSliderActiveFilter')?.addEventListener('change', (e) => {
      filters.active = e.target.value;
      renderList();
    });

    $(FORM_ID)?.addEventListener('submit', onSave);
    $('adminSliderModalClose')?.addEventListener('click', closeModal);
    $('adminSliderModalCancel')?.addEventListener('click', closeModal);
    $('adminSliderDeleteBtn')?.addEventListener('click', onDeleteFromModal);
    $('adminSliderModal')?.addEventListener('click', (e) => {
      if (e.target.id === 'adminSliderModal') closeModal();
    });

    $('slMgrTitle')?.addEventListener('input', (e) => {
      if (!editingId && $('slMgrId')) {
        $('slMgrId').value = SliderManagerStore.slugify(e.target.value);
      }
    });
  }

  function init() {
    const root = $('adminSliderRoot');
    if (!root) return;
    bindEvents();
    items = SliderManagerStore.getItems();
    if (!localStorage.getItem(SliderManagerStore.STORAGE_KEY) && items.length) {
      SliderManagerStore.save(items);
      items = SliderManagerStore.getItems();
    }
    renderList();
    updateCount();
  }

  return { init, openCreate, openEdit, refreshItems, renderList };
})();

function initAdminSliderManager() {
  AdminSliderManager.init();
}

document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('adminSliderRoot')) initAdminSliderManager();
});

console.log('✅ admin-slider-manager.js yüklendi');
