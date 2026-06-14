/**
 * Admin — Mesajlar / Gelen Kutusu (Sprint 5A)
 */
const AdminMessagesManager = (function () {
  let messages = [];
  let filters = {
    search: '',
    type: 'all',
    status: 'all',
    sort: 'desc',
    hideArchived: false
  };
  let detailId = null;
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
    const toast = $('adminMessagesToast');
    if (!toast) return;
    toast.textContent = message;
    toast.className = `admin-toast is-visible is-${type || 'success'}`;
    setTimeout(() => toast.classList.remove('is-visible'), 3200);
  }

  function formatDate(iso) {
    if (!iso) return '—';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '—';
    return d.toLocaleString('tr-TR', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  function refreshMessages() {
    MessagesManagerStore.ensureMigrated();
    messages = MessagesManagerStore.getMessages();
    renderList();
    updateCount();
    if (typeof refreshAdminDashboard === 'function') refreshAdminDashboard();
  }

  function persist(nextMessages, activityMessage, activityType) {
    messages = MessagesManagerStore.save(nextMessages);
    if (activityMessage && typeof logActivity === 'function') {
      logActivity(activityType || 'update', activityMessage);
    }
    renderList();
    updateCount();
    if (typeof refreshAdminDashboard === 'function') refreshAdminDashboard();
  }

  function updateCount() {
    const el = $('messagesCount');
    if (el) {
      const stats = MessagesManagerStore.getStats(messages);
      el.textContent = `(${stats.total} mesaj · ${stats.newCount} yeni)`;
    }
  }

  function getFilteredMessages() {
    let list = [...messages];

    if (filters.hideArchived) {
      list = list.filter((m) => m.status !== 'archived');
    }

    const q = filters.search.trim().toLowerCase();
    if (q) {
      list = list.filter((m) => {
        const hay = [m.name, m.email, m.subject, m.message, m.type].join(' ').toLowerCase();
        return hay.includes(q);
      });
    }

    if (filters.type !== 'all') list = list.filter((m) => m.type === filters.type);
    if (filters.status !== 'all') list = list.filter((m) => m.status === filters.status);

    return MessagesManagerStore.sortMessages(list, filters.sort === 'asc' ? 'asc' : 'desc');
  }

  function renderList() {
    const container = $('adminMessagesList');
    if (!container) return;

    const filtered = getFilteredMessages();

    if (!messages.length) {
      container.innerHTML = `
        <div class="admin-empty-state">
          <div class="admin-empty-state-icon">✉️</div>
          <strong>Henüz mesaj yok</strong>
          <p>İletişim formu veya AI geri bildirimleri burada görünecek.</p>
        </div>
      `;
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
      const isNew = item.status === 'new';
      const mailto = MessagesManagerStore.getMailtoLink(item);
      const mailtoBtn = mailto
        ? `<a href="${escapeHtml(mailto)}" class="btn btn-secondary btn-sm" target="_blank" rel="noopener">Mail Gönder</a>`
        : '';

      return `
        <article class="admin-message-card${isNew ? ' is-new' : ''}" data-message-id="${escapeHtml(item.id)}">
          <div class="admin-message-card-main" data-action="open" data-id="${escapeHtml(item.id)}">
            <div class="admin-message-card-head">
              <div class="admin-message-sender">
                <strong>${escapeHtml(item.name || 'Ziyaretçi')}</strong>
                ${item.email ? `<span class="admin-message-email">${escapeHtml(item.email)}</span>` : ''}
              </div>
              <time class="admin-message-date">${formatDate(item.createdAt)}</time>
            </div>
            <h3 class="admin-message-subject">${escapeHtml(item.subject || '—')}</h3>
            <p class="admin-message-preview">${escapeHtml(MessagesManagerStore.truncate(item.message, 140))}</p>
            <div class="admin-message-badges">
              <span class="admin-message-type ${MessagesManagerStore.getTypeClass(item.type)}">${escapeHtml(MessagesManagerStore.getTypeLabel(item.type))}</span>
              <span class="admin-message-status ${MessagesManagerStore.getStatusClass(item.status)}">${escapeHtml(MessagesManagerStore.getStatusLabel(item.status))}</span>
              ${isNew ? '<span class="admin-message-new-dot">Yeni</span>' : ''}
            </div>
          </div>
          <div class="admin-message-card-actions">
            <button type="button" class="btn btn-secondary btn-sm" data-action="read" data-id="${escapeHtml(item.id)}">Okundu</button>
            <button type="button" class="btn btn-secondary btn-sm" data-action="replied" data-id="${escapeHtml(item.id)}">Yanıtlandı</button>
            <button type="button" class="btn btn-secondary btn-sm" data-action="archive" data-id="${escapeHtml(item.id)}">Arşivle</button>
            ${mailtoBtn}
            <button type="button" class="btn btn-danger btn-sm" data-action="delete" data-id="${escapeHtml(item.id)}">Sil</button>
          </div>
        </article>
      `;
    }).join('');

    container.querySelectorAll('[data-action]').forEach((el) => {
      el.addEventListener('click', onCardAction);
    });
  }

  function onCardAction(e) {
    const el = e.currentTarget;
    const action = el.dataset.action;
    const id = el.dataset.id;
    if (!id) return;

    if (action === 'open') {
      openDetail(id);
      return;
    }

    const item = messages.find((m) => m.id === id);
    if (!item) return;

    if (action === 'delete') {
      if (!confirm(`"${item.subject || item.name}" mesajını silmek istediğinize emin misiniz?`)) return;
      persist(messages.filter((m) => m.id !== id), 'Mesaj silindi', 'delete');
      showToast('Mesaj silindi.', 'success');
      if (detailId === id) closeDetail();
      return;
    }

    const statusMap = { read: 'read', replied: 'replied', archive: 'archived' };
    const status = statusMap[action];
    if (!status) return;

    const next = messages.map((m) => (m.id === id ? { ...m, status } : m));
    const labels = { read: 'okundu yapıldı', replied: 'yanıtlandı', archived: 'arşivlendi' };
    persist(next, `Mesaj ${labels[action]}`, 'update');
    showToast(`Mesaj ${labels[action]}.`, 'success');
    if (detailId === id) renderDetail(id);
  }

  function openDetail(id) {
    const item = messages.find((m) => m.id === id);
    if (!item) return;
    detailId = id;

    if (item.status === 'new') {
      persist(messages.map((m) => (m.id === id ? { ...m, status: 'read' } : m)), 'Mesaj okundu yapıldı');
    }

    renderDetail(id);
    $('adminMessageModal')?.classList.add('active', 'is-open');
    document.body.classList.add('modal-open');
    if (typeof lockAdminBodyScroll === 'function') lockAdminBodyScroll();
  }

  function renderDetail(id) {
    const item = messages.find((m) => m.id === id);
    if (!item) return;

    $('adminMessageDetailTitle').textContent = item.subject || 'Mesaj Detayı';
    $('adminMsgDetailName').textContent = item.name || '—';
    $('adminMsgDetailEmail').textContent = item.email || '—';
    $('adminMsgDetailSubject').textContent = item.subject || '—';
    $('adminMsgDetailMessage').textContent = item.message || '—';
    $('adminMsgDetailSource').textContent = item.source || '—';
    $('adminMsgDetailDate').textContent = formatDate(item.createdAt);
    $('adminMsgDetailType').textContent = MessagesManagerStore.getTypeLabel(item.type);
    $('adminMsgDetailStatus').value = item.status;

    const mailto = MessagesManagerStore.getMailtoLink(item);
    const replyBtn = $('adminMsgReplyBtn');
    if (replyBtn) {
      if (mailto) {
        replyBtn.href = mailto;
        replyBtn.style.display = 'inline-flex';
      } else {
        replyBtn.style.display = 'none';
      }
    }
  }

  function closeDetail() {
    $('adminMessageModal')?.classList.remove('active', 'is-open');
    if (typeof unlockAdminBodyScroll === 'function') {
      unlockAdminBodyScroll();
    } else {
      document.body.classList.remove('modal-open');
    }
    detailId = null;
  }

  function onDetailStatusChange() {
    if (!detailId) return;
    const status = $('adminMsgDetailStatus')?.value;
    if (!status) return;
    persist(
      messages.map((m) => (m.id === detailId ? { ...m, status } : m)),
      'Mesaj durumu güncellendi'
    );
    renderDetail(detailId);
    showToast('Durum güncellendi.', 'success');
  }

  function onMarkAllRead() {
    if (!messages.some((m) => m.status === 'new')) {
      showToast('Yeni mesaj yok.', 'success');
      return;
    }
    persist(MessagesManagerStore.markAllRead(), 'Tüm mesajlar okundu yapıldı');
    showToast('Tüm mesajlar okundu.', 'success');
  }

  function onToggleArchived() {
    filters.hideArchived = !filters.hideArchived;
    const btn = $('adminMessagesToggleArchivedBtn');
    if (btn) btn.textContent = filters.hideArchived ? 'Arşivlenenleri Göster' : 'Arşivlenenleri Gizle';
    renderList();
  }

  function onExport() {
    const blob = new Blob([JSON.stringify(messages, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'bambinifojo-messages.json';
    a.click();
    URL.revokeObjectURL(url);
    showToast('Mesajlar dışa aktarıldı.', 'success');
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
        const { errors, items } = MessagesManagerStore.validateImportList(parsed);
        if (errors.length && !items.length) {
          showToast(errors[0], 'error');
          return;
        }
        persist(items, 'Mesajlar içe aktarıldı');
        if (errors.length) showToast(`İçe aktarıldı. ${errors.length} kayıt atlandı.`, 'success');
        else showToast('Mesajlar içe aktarıldı.', 'success');
      } catch (err) {
        showToast('Geçersiz JSON dosyası.', 'error');
      }
    };
    reader.readAsText(file);
  }

  function bindEvents() {
    const root = $('adminMessagesRoot');
    if (!root || root.dataset.bound === '1') return;
    root.dataset.bound = '1';

    $('adminMessagesExportBtn')?.addEventListener('click', onExport);
    $('adminMessagesImportBtn')?.addEventListener('click', onImportClick);
    $('adminMessagesMarkReadBtn')?.addEventListener('click', onMarkAllRead);
    $('adminMessagesToggleArchivedBtn')?.addEventListener('click', onToggleArchived);

    $('adminMessagesSearch')?.addEventListener('input', (e) => {
      filters.search = e.target.value;
      renderList();
    });
    $('adminMessagesTypeFilter')?.addEventListener('change', (e) => {
      filters.type = e.target.value;
      renderList();
    });
    $('adminMessagesStatusFilter')?.addEventListener('change', (e) => {
      filters.status = e.target.value;
      renderList();
    });
    $('adminMessagesSortFilter')?.addEventListener('change', (e) => {
      filters.sort = e.target.value;
      renderList();
    });

    $('adminMessageModalClose')?.addEventListener('click', closeDetail);
    $('adminMessageModalCancel')?.addEventListener('click', closeDetail);
    $('adminMessageModal')?.addEventListener('click', (e) => {
      if (e.target.id === 'adminMessageModal') closeDetail();
    });
    $('adminMsgDetailStatus')?.addEventListener('change', onDetailStatusChange);
    $('adminMsgDetailDeleteBtn')?.addEventListener('click', () => {
      if (!detailId) return;
      const item = messages.find((m) => m.id === detailId);
      if (!item) return;
      if (!confirm('Bu mesajı silmek istediğinize emin misiniz?')) return;
      persist(messages.filter((m) => m.id !== detailId), 'Mesaj silindi', 'delete');
      closeDetail();
      showToast('Mesaj silindi.', 'success');
    });
    $('adminMsgDetailArchiveBtn')?.addEventListener('click', () => {
      if (!detailId) return;
      persist(messages.map((m) => (m.id === detailId ? { ...m, status: 'archived' } : m)), 'Mesaj arşivlendi');
      closeDetail();
      showToast('Mesaj arşivlendi.', 'success');
    });
  }

  function init() {
    const root = $('adminMessagesRoot');
    if (!root) return;
    bindEvents();
    refreshMessages();
  }

  return { init, refreshMessages, renderList };
})();

function initAdminMessagesManager() {
  AdminMessagesManager.init();
}

document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('adminMessagesRoot')) initAdminMessagesManager();
});

console.log('✅ admin-messages-manager.js yüklendi');
