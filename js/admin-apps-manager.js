/**
 * Admin — Uygulamalar Yönetimi (Sprint 3)
 */
const AdminAppsManager = (function () {
  let apps = [];
  let filters = { search: '', status: 'all', active: 'all' };
  let editingId = null;
  let importInput = null;

  const FORM_ID = 'adminAppForm';

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
    const toast = $('adminAppsToast');
    if (!toast) return;
    toast.textContent = message;
    toast.className = `admin-toast is-visible is-${type || 'success'}`;
    setTimeout(() => toast.classList.remove('is-visible'), 3200);
  }

  function refreshApps() {
    apps = AppsManagerStore.getApps();
    renderList();
    updateCount();
    if (typeof refreshAdminDashboard === 'function') refreshAdminDashboard();
  }

  function persist(nextApps, activityMessage, activityType) {
    apps = AppsManagerStore.save(nextApps.map((app) => ({
      ...app,
      updatedAt: new Date().toISOString()
    })));

    if (activityMessage && typeof logActivity === 'function') {
      logActivity(activityType || 'update', activityMessage);
    }

    if (typeof renderApps === 'function') renderApps();
    renderList();
    updateCount();
    if (typeof refreshAdminDashboard === 'function') refreshAdminDashboard();
  }

  function updateCount() {
    const el = $('appsCount');
    if (el) el.textContent = `(${apps.length} uygulama)`;
  }

  function getFilteredApps() {
    return apps.filter((app) => {
      const q = filters.search.trim().toLowerCase();
      if (q) {
        const hay = [
          app.name,
          app.shortDescription,
          app.platform,
          ...(app.technologies || [])
        ].join(' ').toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (filters.status !== 'all' && app.status !== filters.status) return false;
      if (filters.active === 'active' && !app.active) return false;
      if (filters.active === 'inactive' && app.active) return false;
      return true;
    }).sort((a, b) => (Number(a.order) || 0) - (Number(b.order) || 0));
  }

  function renderIcon(app) {
    const src = app.imageUrl || (app.icon?.startsWith('http') ? app.icon : '');
    if (src) {
      return `<img src="${escapeHtml(src)}" alt="" class="admin-app-card-image" onerror="this.style.display='none';this.nextElementSibling.style.display='flex';" /><span class="admin-app-card-emoji" style="display:none;">${escapeHtml(app.icon || '📱')}</span>`;
    }
    return `<span class="admin-app-card-emoji">${escapeHtml(app.icon || '📱')}</span>`;
  }

  function renderList() {
    const container = $('adminAppsList');
    if (!container) return;

    const filtered = getFilteredApps();

    if (!apps.length) {
      container.innerHTML = `
        <div class="admin-empty-state">
          <div class="admin-empty-state-icon">📱</div>
          <strong>Henüz uygulama yok</strong>
          <p>İlk ürününüzü ekleyerek ana site vitrinini oluşturun.</p>
          <button type="button" class="btn btn-primary" id="adminAppsEmptyAdd">Yeni Uygulama</button>
        </div>
      `;
      $('adminAppsEmptyAdd')?.addEventListener('click', openCreate);
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

    container.innerHTML = filtered.map((app) => {
      const tech = (app.technologies || []).slice(0, 4).map((t) =>
        `<span class="admin-app-tech">${escapeHtml(t)}</span>`
      ).join('');

      const links = [];
      if (app.playStoreUrl) links.push(`<a href="${escapeHtml(app.playStoreUrl)}" target="_blank" rel="noopener" class="admin-app-link">Play Store</a>`);
      if (app.githubUrl) links.push(`<a href="${escapeHtml(app.githubUrl)}" target="_blank" rel="noopener" class="admin-app-link">GitHub</a>`);
      if (app.detailUrl) links.push(`<a href="${escapeHtml(app.detailUrl)}" target="_blank" rel="noopener" class="admin-app-link">Detay</a>`);

      return `
        <article class="admin-app-card" data-app-id="${escapeHtml(app.id)}">
          <div class="admin-app-card-icon">${renderIcon(app)}</div>
          <div class="admin-app-card-body">
            <div class="admin-app-card-head">
              <h3 class="admin-app-card-title">${escapeHtml(app.name)}</h3>
              <span class="admin-app-order">#${escapeHtml(String(app.order))}</span>
            </div>
            <p class="admin-app-card-desc">${escapeHtml(app.shortDescription)}</p>
            <div class="admin-app-card-badges">
              <span class="admin-app-status ${AppsManagerStore.getStatusClass(app.status)}">${escapeHtml(AppsManagerStore.getStatusLabel(app.status))}</span>
              <span class="admin-app-platform">${escapeHtml(app.platform || 'Android')}</span>
              ${app.featured ? '<span class="admin-app-featured">Öne Çıkan</span>' : ''}
            </div>
            <div class="admin-app-tech-list">${tech}</div>
            ${links.length ? `<div class="admin-app-links">${links.join('')}</div>` : ''}
          </div>
          <div class="admin-app-card-actions">
            <label class="admin-switch" title="Aktif">
              <input type="checkbox" data-action="toggle-active" data-id="${escapeHtml(app.id)}" ${app.active ? 'checked' : ''}>
              <span>Aktif</span>
            </label>
            <label class="admin-switch" title="Öne çıkar">
              <input type="checkbox" data-action="toggle-featured" data-id="${escapeHtml(app.id)}" ${app.featured ? 'checked' : ''}>
              <span>Öne Çıkan</span>
            </label>
            <button type="button" class="btn btn-secondary btn-sm" data-action="edit" data-id="${escapeHtml(app.id)}">Düzenle</button>
            <button type="button" class="btn btn-danger btn-sm" data-action="delete" data-id="${escapeHtml(app.id)}">Sil</button>
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
      const app = apps.find((a) => a.id === id);
      if (!app) return;
      if (!confirm(`"${app.name}" uygulamasını silmek istediğinize emin misiniz?`)) return;
      const next = apps.filter((a) => a.id !== id);
      persist(next, `"${app.name}" uygulaması silindi`, 'delete');
      showToast('Uygulama silindi.', 'success');
      return;
    }

    if (action === 'toggle-active') {
      const next = apps.map((a) => a.id === id ? { ...a, active: el.checked } : a);
      const app = next.find((a) => a.id === id);
      persist(next, `"${app?.name}" ${el.checked ? 'aktif' : 'pasif'} yapıldı`);
      return;
    }

    if (action === 'toggle-featured') {
      const next = apps.map((a) => a.id === id ? { ...a, featured: el.checked } : a);
      persist(next, `"${next.find((a) => a.id === id)?.name}" öne çıkarma güncellendi`);
    }
  }

  function readForm() {
    const techRaw = $('appMgrTechnologies')?.value || '';
    const technologies = techRaw.split(',').map((t) => t.trim()).filter(Boolean);

    return AppsManagerStore.mergeApp({
      id: $('appMgrId')?.value || '',
      name: $('appMgrName')?.value || '',
      shortDescription: $('appMgrShortDesc')?.value || '',
      longDescription: $('appMgrLongDesc')?.value || '',
      icon: $('appMgrIcon')?.value || '📱',
      imageUrl: $('appMgrImageUrl')?.value || '',
      status: $('appMgrStatus')?.value || 'draft',
      platform: $('appMgrPlatform')?.value || 'Android',
      technologies,
      playStoreUrl: $('appMgrPlayStore')?.value || '',
      githubUrl: $('appMgrGithub')?.value || '',
      detailUrl: $('appMgrDetail')?.value || '',
      order: Number($('appMgrOrder')?.value || 1),
      featured: !!$('appMgrFeatured')?.checked,
      active: !!$('appMgrActive')?.checked
    });
  }

  function writeForm(app) {
    const data = AppsManagerStore.mergeApp(app);
    $('appMgrId').value = data.id;
    $('appMgrName').value = data.name;
    $('appMgrShortDesc').value = data.shortDescription;
    $('appMgrLongDesc').value = data.longDescription;
    $('appMgrIcon').value = data.icon;
    $('appMgrImageUrl').value = data.imageUrl;
    $('appMgrStatus').value = data.status;
    $('appMgrPlatform').value = data.platform;
    $('appMgrTechnologies').value = (data.technologies || []).join(', ');
    $('appMgrPlayStore').value = data.playStoreUrl;
    $('appMgrGithub').value = data.githubUrl;
    $('appMgrDetail').value = data.detailUrl;
    $('appMgrOrder').value = data.order;
    $('appMgrFeatured').checked = data.featured;
    $('appMgrActive').checked = data.active;
  }

  function openModal(title, app, showDelete) {
    editingId = app?.id || null;
    $('adminAppModalTitle').textContent = title;
    $('adminAppDeleteBtn').style.display = showDelete ? 'inline-flex' : 'none';
    writeForm(app || AppsManagerStore.createEmpty(apps.length + 1));
    $('adminAppModal')?.classList.add('active', 'is-open');
    document.body.classList.add('modal-open');
    if (typeof lockAdminBodyScroll === 'function') lockAdminBodyScroll();
  }

  function closeModal() {
    $('adminAppModal')?.classList.remove('active', 'is-open');
    if (typeof unlockAdminBodyScroll === 'function') {
      unlockAdminBodyScroll();
    } else {
      document.body.classList.remove('modal-open');
    }
    editingId = null;
  }

  function openCreate() {
    openModal('Yeni Uygulama', AppsManagerStore.createEmpty(apps.length + 1), false);
  }

  function openEdit(id) {
    const app = apps.find((a) => a.id === id);
    if (!app) return;
    openModal('Uygulama Düzenle', app, true);
  }

  function onSave(e) {
    e.preventDefault();
    const formData = readForm();
    const { errors, data } = AppsManagerStore.validate(formData);
    if (errors.length) {
      showToast(errors[0], 'error');
      return;
    }

    if (!data.id) data.id = AppsManagerStore.slugify(data.name);

    const exists = apps.some((a) => a.id === data.id);
    let next;
    let message;
    let type = 'update';

    if (editingId) {
      const prev = apps.find((a) => a.id === editingId);
      data._legacy = prev?._legacy || {};
      if (editingId !== data.id && exists) {
        showToast('Bu ID zaten kullanılıyor.', 'error');
        return;
      }
      next = apps.map((a) => (a.id === editingId ? { ...data, updatedAt: new Date().toISOString() } : a));
      message = `"${data.name}" uygulaması güncellendi`;
    } else {
      if (exists) data.id = AppsManagerStore.slugify(`${data.name}-${Date.now()}`);
      next = [...apps, { ...data, updatedAt: new Date().toISOString() }];
      message = `"${data.name}" uygulaması eklendi`;
      type = 'create';
    }

    persist(next, message, type);
    closeModal();
    showToast('Uygulama kaydedildi.', 'success');
  }

  function onDeleteFromModal() {
    if (!editingId) return;
    const app = apps.find((a) => a.id === editingId);
    if (!app) return;
    if (!confirm(`"${app.name}" uygulamasını silmek istediğinize emin misiniz?`)) return;
    persist(apps.filter((a) => a.id !== editingId), `"${app.name}" uygulaması silindi`, 'delete');
    closeModal();
    showToast('Uygulama silindi.', 'success');
  }

  function onExport() {
    const blob = new Blob([JSON.stringify(apps, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'bambinifojo-apps.json';
    a.click();
    URL.revokeObjectURL(url);
    showToast('Uygulamalar dışa aktarıldı.', 'success');
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
        const { errors, apps: imported } = AppsManagerStore.validateImportList(parsed);
        if (errors.length && !imported.length) {
          showToast(errors[0], 'error');
          return;
        }
        persist(imported, 'Uygulamalar içe aktarıldı');
        if (errors.length) showToast(`İçe aktarıldı. ${errors.length} kayıt atlandı.`, 'success');
        else showToast('Uygulamalar içe aktarıldı.', 'success');
      } catch (err) {
        showToast('Geçersiz JSON dosyası.', 'error');
      }
    };
    reader.readAsText(file);
  }

  function bindEvents() {
    const root = $('adminAppsRoot');
    if (!root || root.dataset.bound === '1') return;
    root.dataset.bound = '1';

    $('adminAppsAddBtn')?.addEventListener('click', openCreate);
    $('adminAppsExportBtn')?.addEventListener('click', onExport);
    $('adminAppsImportBtn')?.addEventListener('click', onImportClick);
    $('adminAppsSearch')?.addEventListener('input', (e) => {
      filters.search = e.target.value;
      renderList();
    });
    $('adminAppsStatusFilter')?.addEventListener('change', (e) => {
      filters.status = e.target.value;
      renderList();
    });
    $('adminAppsActiveFilter')?.addEventListener('change', (e) => {
      filters.active = e.target.value;
      renderList();
    });

    $(FORM_ID)?.addEventListener('submit', onSave);
    $('adminAppModalClose')?.addEventListener('click', closeModal);
    $('adminAppModalCancel')?.addEventListener('click', closeModal);
    $('adminAppDeleteBtn')?.addEventListener('click', onDeleteFromModal);
    $('adminAppModal')?.addEventListener('click', (e) => {
      if (e.target.id === 'adminAppModal') closeModal();
    });

    $('appMgrName')?.addEventListener('input', (e) => {
      if (!editingId && $('appMgrId')) {
        $('appMgrId').value = AppsManagerStore.slugify(e.target.value);
      }
    });
  }

  function init() {
    const root = $('adminAppsRoot');
    if (!root) return;
    bindEvents();
    apps = AppsManagerStore.getApps();
    if (!localStorage.getItem(AppsManagerStore.STORAGE_KEY) && apps.length) {
      AppsManagerStore.save(apps);
      apps = AppsManagerStore.getApps();
    }
    renderList();
    updateCount();
  }

  return {
    init,
    openCreate,
    openEdit,
    refreshApps,
    renderList
  };
})();

function initAdminAppsManager() {
  AdminAppsManager.init();
}

document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('adminAppsRoot')) initAdminAppsManager();
});

console.log('✅ admin-apps-manager.js yüklendi');
