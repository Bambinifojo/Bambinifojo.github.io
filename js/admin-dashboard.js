// Bambinifojo Studio Control Panel — Dashboard

const AdminDashboard = {
  init() {
    this.refresh();
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) this.refresh();
    });
  },

  refresh() {
    this.updateExtendedStats();
    this.renderSystemStatus();
    this.enhanceRecentActivities();
  },

  getAppsData() {
    if (typeof AppsManagerStore !== 'undefined') {
      const apps = AppsManagerStore.getApps();
      if (apps.length) return { apps };
    }
    if (typeof appsData !== 'undefined' && appsData?.apps) return appsData;
    try {
      const saved = localStorage.getItem('appsData');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      /* ignore */
    }
    return { apps: [], site: null };
  },

  getAppStats() {
    if (typeof AppsManagerStore !== 'undefined') {
      return AppsManagerStore.getStats(AppsManagerStore.getApps());
    }
    const data = this.getAppsData();
    const apps = Array.isArray(data.apps) ? data.apps : [];
    return {
      total: apps.length,
      published: apps.filter((app) => {
        const details = app.playStoreUrl || app.details || '';
        const status = app.status;
        return (status === 'published' || details.includes('play.google.com')) && details.trim() && details !== '#';
      }).length,
      active: apps.filter((a) => a.active !== false).length
    };
  },

  getSliderCount() {
    if (typeof SliderManagerStore !== 'undefined') {
      return SliderManagerStore.getStats().total;
    }
    try {
      const saved = localStorage.getItem('sliderData');
      if (!saved) return 0;
      const data = JSON.parse(saved);
      if (Array.isArray(data.slides)) return data.slides.length;
      if (Array.isArray(data.apps)) return data.apps.length;
      return 0;
    } catch (e) {
      return 0;
    }
  },

  getSliderActiveCount() {
    if (typeof SliderManagerStore !== 'undefined') {
      return SliderManagerStore.getStats().active;
    }
    return this.getSliderCount();
  },

  getMessageCount() {
    try {
      const submissions = JSON.parse(localStorage.getItem('contactSubmissions') || '[]');
      const feedback = JSON.parse(localStorage.getItem('aiFeedback') || '[]');
      return (Array.isArray(submissions) ? submissions.length : 0) +
        (Array.isArray(feedback) ? feedback.length : 0);
    } catch (e) {
      return 0;
    }
  },

  getAiCredits() {
    try {
      const saved = localStorage.getItem('aiCredits');
      if (!saved) return 3;
      const data = JSON.parse(saved);
      return typeof data.credits === 'number' ? data.credits : 3;
    } catch (e) {
      return 3;
    }
  },

  getLastUpdateLabel() {
    const candidates = this.collectLastUpdateCandidates();
    if (!candidates.length) return 'Henüz kayıt yok';

    const latest = candidates.sort((a, b) => b - a)[0];
    return latest.toLocaleString('tr-TR', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  },

  collectLastUpdateCandidates() {
    const candidates = [];

    if (typeof SiteSettingsStore !== 'undefined') {
      const ts = SiteSettingsStore.getLastUpdated();
      if (ts) candidates.push(new Date(ts));
    }

    if (typeof AppsManagerStore !== 'undefined') {
      const appTs = AppsManagerStore.getLatestUpdatedAt();
      if (appTs) candidates.push(new Date(appTs));
    }

    if (typeof SliderManagerStore !== 'undefined') {
      const sliderTs = SliderManagerStore.getLatestUpdatedAt();
      if (sliderTs) candidates.push(new Date(sliderTs));
    }

    try {
      const activities = JSON.parse(localStorage.getItem('adminActivities') || '[]');
      if (activities[0]?.timestamp) candidates.push(new Date(activities[0].timestamp));
    } catch (e) { /* ignore */ }

    try {
      const slider = JSON.parse(localStorage.getItem('sliderData') || '{}');
      if (slider.lastUpdated) candidates.push(new Date(slider.lastUpdated));
    } catch (e) { /* ignore */ }

    return candidates;
  },

  updateLastUpdateCard() {
    const valueEl = document.getElementById('lastUpdate');
    const metaEl = document.getElementById('lastUpdateMeta');
    if (!valueEl) return;

    const candidates = this.collectLastUpdateCandidates();
    if (!candidates.length) {
      valueEl.textContent = 'Henüz kayıt yok';
      if (metaEl) metaEl.textContent = 'Son admin aktivitesi bulunamadı';
      return;
    }

    const latest = candidates.sort((a, b) => b - a)[0];
    valueEl.textContent = latest.toLocaleString('tr-TR', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
    if (metaEl) metaEl.textContent = 'Son admin aktivitesi';
  },

  setText(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  },

  updateExtendedStats() {
    const stats = this.getAppStats();
    const data = this.getAppsData();
    const apps = Array.isArray(data.apps) ? data.apps : [];

    this.setText('totalApps', stats.total);
    this.setText('publishedApps', stats.published);
    this.setText('totalMessages', this.getMessageCount());
    this.setText('sliderItems', this.getSliderCount());
    const sliderHintEl = document.querySelector('#sliderItems')?.closest('.stat-card-content')?.querySelector('.stat-card-hint');
    if (sliderHintEl) sliderHintEl.textContent = `${this.getSliderActiveCount()} aktif içerik`;
    this.setText('aiDemoCredits', this.getAiCredits());
    this.updateLastUpdateCard();

    const appsCountEl = document.getElementById('appsCount');
    if (appsCountEl) appsCountEl.textContent = `(${apps.length} uygulama)`;
  },

  isFirebaseActive() {
    try {
      const mode = localStorage.getItem('currentMode');
      const config = localStorage.getItem('firebaseConfig');
      return mode === 'firebase' && !!config && typeof firebaseDatabase !== 'undefined' && !!firebaseDatabase;
    } catch (e) {
      return false;
    }
  },

  renderSystemStatus() {
    const container = document.getElementById('adminSystemStatusGrid');
    if (!container) return;

    const firebaseActive = this.isFirebaseActive();
    const hasApps = !!localStorage.getItem('appsData') || (typeof appsData !== 'undefined' && appsData?.apps?.length);
    const hasSite = !!localStorage.getItem('siteData') || (typeof appsData !== 'undefined' && appsData?.site);

    const items = [
      {
        label: 'Firebase',
        value: firebaseActive ? 'Aktif' : 'Fallback',
        type: firebaseActive ? 'ok' : 'warn'
      },
      {
        label: 'localStorage',
        value: 'Aktif',
        type: 'ok'
      },
      {
        label: 'Site JSON',
        value: hasSite ? 'Yüklendi' : 'Varsayılan',
        type: hasSite ? 'ok' : 'info'
      },
      {
        label: 'Uygulama Verisi',
        value: hasApps ? 'Yüklendi' : 'Bekliyor',
        type: hasApps ? 'ok' : 'warn'
      },
      {
        label: 'AI Assistant',
        value: 'Beta',
        type: 'info'
      }
    ];

    container.innerHTML = items.map(item => `
      <div class="admin-status-item">
        <span>${item.label}</span>
        <span class="admin-status-badge is-${item.type}">${item.value}</span>
      </div>
    `).join('');
  },

  enhanceRecentActivities() {
    const container = document.getElementById('recentActivities');
    if (!container) return;

    const empty = container.querySelector('.activities-empty') ||
      (container.textContent.trim().includes('Henüz aktivite yok') && !container.querySelector('.activity-item'));

    if (empty || container.children.length === 0) {
      const submissions = JSON.parse(localStorage.getItem('contactSubmissions') || '[]');
      const latestMsg = submissions[0];

      if (latestMsg) {
        container.innerHTML = `
          <div class="activity-item">
            <div class="activity-icon">✉️</div>
            <div class="activity-content">
              <p class="activity-message">Son mesaj: ${this.escape(latestMsg.subject || 'İletişim')}</p>
              <p class="activity-time">${latestMsg.name || 'Ziyaretçi'} · ${this.formatTime(latestMsg.timestamp)}</p>
            </div>
          </div>
        `;
        return;
      }

      container.innerHTML = `
        <div class="admin-empty-state">
          <div class="admin-empty-state-icon">📋</div>
          <strong>Henüz aktivite yok</strong>
          <p>İlk uygulama veya site güncellemesi burada görünecek.</p>
        </div>
      `;
    }
  },

  formatTime(ts) {
    if (!ts) return 'Az önce';
    const date = new Date(ts);
    if (Number.isNaN(date.getTime())) return 'Az önce';
    return date.toLocaleString('tr-TR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
  },

  escape(text) {
    const div = document.createElement('div');
    div.textContent = String(text ?? '');
    return div.innerHTML;
  }
};

function refreshAdminDashboard() {
  AdminDashboard.refresh();
}

document.addEventListener('DOMContentLoaded', () => {
  AdminDashboard.init();
});

console.log('✅ admin-dashboard.js yüklendi');
