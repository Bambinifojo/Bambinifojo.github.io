/**
 * Bambinifojo — Product Detail Page renderer
 * Reads app data from apps.json and populates the shared product template.
 */
(function () {
  const PLAY_SVG = '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M3,20.5V3.5C3,2.91 3.34,2.39 3.84,2.15L13.69,12L3.84,21.85C3.34,21.6 3,21.09 3,20.5M16.81,15.12L6.05,21.34L14.54,12.85L16.81,15.12M20.16,10.81C20.5,11.08 20.75,11.5 20.75,12C20.75,12.5 20.53,12.9 20.18,13.18L17.89,14.5L15.39,12L17.89,9.5L20.16,10.81M6.05,2.66L16.81,8.88L14.54,11.15L6.05,2.66Z"/></svg>';

  function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = String(text);
    return div.innerHTML;
  }

  function resolveScreenshotSrc(image) {
    if (!image) return '';
    if (image.startsWith('http') || image.startsWith('/') || image.startsWith('../')) return image;
    const folder = document.body.dataset.appFolder || '';
    if (folder && image.startsWith(`${folder}/`)) {
      return image.replace(new RegExp(`^${folder}/`), '');
    }
    return image;
  }

  function getStatusLabel(status) {
    const map = {
      live: 'Yayında',
      published: 'Yayında',
      beta: 'Beta',
      dev: 'Geliştiriliyor',
      development: 'Geliştiriliyor'
    };
    return map[status] || 'Yayında';
  }

  function renderStars(rating) {
    const value = Number(rating) || 0;
    const full = Math.floor(value);
    const half = value - full >= 0.3;
    let html = '';
    for (let i = 0; i < 5; i += 1) {
      if (i < full) html += '★';
      else if (i === full && half) html += '★';
      else html += '☆';
    }
    return html;
  }

  function setText(id, text) {
    const el = document.getElementById(id);
    if (el && text) el.textContent = text;
  }

  function setHtml(id, html) {
    const el = document.getElementById(id);
    if (el) el.innerHTML = html;
  }

  function renderHero(app) {
    const playStoreUrl = app.playStoreUrl
      || (app.details && app.details.includes('play.google.com') ? app.details : '');
    const privacyUrl = app.privacy && app.privacy !== '#' ? app.privacy : 'privacy-policy.html';
    const heroPitch = app.heroPitch || app.about?.subtitle || app.description || '';
    const category = app.category || 'Mobil Uygulama';
    const platform = app.platform || 'Android';
    const rating = app.rating || '—';
    const downloads = app.downloads || '10+';

    setText('productHeroBadge', category);
    setText('productHeroTitle', app.title);
    setText('productHeroDesc', heroPitch);
    setHtml('productHeroMeta', `
      <span class="product-meta-item"><span class="stars">${renderStars(rating)}</span> ${escapeHtml(String(rating))}</span>
      <span class="product-meta-item">${escapeHtml(downloads)} indirme</span>
      <span class="product-meta-item">${escapeHtml(platform)}</span>
    `);

    const visualIcon = document.getElementById('productVisualIcon');
    if (visualIcon) {
      const iconUrl = app.imageUrl || app.playIcon;
      if (iconUrl) {
        visualIcon.innerHTML = `<img src="${escapeHtml(iconUrl)}" alt="${escapeHtml(app.title)} ikonu" loading="eager" />`;
        visualIcon.classList.add('has-image');
      } else {
        visualIcon.classList.remove('has-image');
        visualIcon.textContent = app.icon || '📱';
      }
    }

    const tags = app.tags || app.features || [];
    const tagsEl = document.getElementById('productVisualTags');
    if (tagsEl) {
      tagsEl.innerHTML = tags.slice(0, 4).map((tag) =>
        `<span class="product-visual-tag">${escapeHtml(tag)}</span>`
      ).join('');
    }

    const previewImg = document.getElementById('productVisualPreview');
    const firstShot = app.screenshots?.items?.[0];
    if (previewImg && firstShot?.image) {
      previewImg.src = resolveScreenshotSrc(firstShot.image);
      previewImg.alt = firstShot.title || app.title;
      previewImg.hidden = false;
    } else if (previewImg) {
      previewImg.hidden = true;
    }

    const actionsEl = document.getElementById('productHeroActions');
    if (actionsEl) {
      const buttons = [];
      if (playStoreUrl) {
        buttons.push(`<a href="${escapeHtml(playStoreUrl)}" class="product-btn product-btn-primary" target="_blank" rel="noopener" id="productPlayStoreBtn">${PLAY_SVG} Google Play'de İndir</a>`);
      }
      buttons.push(`<a href="${escapeHtml(privacyUrl)}" class="product-btn product-btn-secondary">Gizlilik Politikası</a>`);
      buttons.push(`<a href="../index.html#apps" class="product-btn product-btn-ghost">Ana Siteye Dön</a>`);
      actionsEl.innerHTML = buttons.join('');
    }

    document.title = `${app.title} — Bambinifojo`;
  }

  function renderAbout(app) {
    setText('productAboutTitle', app.about?.title || 'Hakkında');
    setText('productAboutSubtitle', app.about?.subtitle || '');
    setText('productAboutText', app.about?.description || app.description || '');

    const summaryEl = document.getElementById('productAboutSummary');
    if (!summaryEl) return;

    const rows = [
      ['Platform', app.platform || 'Android'],
      ['Kategori', app.category || '—'],
      ['Durum', getStatusLabel(app.status)],
      ['Odak', app.focus || (app.tags || []).slice(0, 3).join(' / ') || '—']
    ];

    summaryEl.innerHTML = rows.map(([label, value]) => `
      <div class="product-summary-item">
        <span>${escapeHtml(label)}</span>
        <strong>${escapeHtml(value)}</strong>
      </div>
    `).join('');
  }

  function renderFeatures(app) {
    setText('productFeaturesTitle', app.featuresTitle || 'Özellikler');
    setText('productFeaturesSubtitle', app.featuresSubtitle || `${app.title} deneyimini keşfedin`);

    const grid = document.getElementById('productFeaturesGrid');
    if (!grid) return;

    const cards = app.featureCards || [];
    grid.innerHTML = cards.map((card, index) => `
      <article class="product-feature-card">
        <div class="product-feature-icon">${card.icon || '✦'}</div>
        <h3 class="product-feature-title">${escapeHtml(card.title || '')}</h3>
        <p class="product-feature-desc">${escapeHtml(card.description || '')}</p>
        <span class="product-feature-tag">${escapeHtml(card.tag || app.category || 'Özellik')}</span>
      </article>
    `).join('');
  }

  function renderScreenshots(app) {
    setText('productScreenshotsTitle', app.screenshots?.title || 'Uygulama Deneyimi');
    setText('productScreenshotsSubtitle', app.screenshots?.subtitle || 'Uygulamanın görsel özelliklerini keşfedin');

    const grid = document.getElementById('productScreenshotsGrid');
    const mockups = document.getElementById('productMockupGrid');
    const items = app.screenshots?.items || [];

    if (items.length && grid) {
      if (mockups) mockups.hidden = true;
      grid.hidden = false;
      grid.innerHTML = items.map((shot) => {
        if (shot.image) {
          return `
            <article class="product-screenshot-card">
              <div class="product-screenshot-media">
                <img src="${escapeHtml(resolveScreenshotSrc(shot.image))}" alt="${escapeHtml(shot.title || '')}" loading="lazy" />
              </div>
              <div class="product-screenshot-caption">${escapeHtml(shot.title || '')}</div>
            </article>
          `;
        }
        return `
          <article class="product-screenshot-card">
            <div class="product-screenshot-media product-screenshot-placeholder">
              <span>${shot.icon || '📱'}</span>
              <p>${escapeHtml(shot.title || '')}</p>
            </div>
          </article>
        `;
      }).join('');
    } else if (mockups) {
      if (grid) grid.hidden = true;
      mockups.hidden = false;
    }
  }

  function renderTechStack(app) {
    const stack = app.techStack || app.tags || [];
    const el = document.getElementById('productTechStack');
    if (!el) return;
    el.innerHTML = stack.map((item) =>
      `<span class="product-tech-chip">${escapeHtml(item)}</span>`
    ).join('');
  }

  function renderCta(app) {
    const playStoreUrl = app.playStoreUrl
      || (app.details && app.details.includes('play.google.com') ? app.details : '');
    const privacyUrl = app.privacy && app.privacy !== '#' ? app.privacy : 'privacy-policy.html';
    const el = document.getElementById('productCtaActions');
    if (!el) return;

    const buttons = [];
    if (playStoreUrl) {
      buttons.push(`<a href="${escapeHtml(playStoreUrl)}" class="product-btn product-btn-primary" target="_blank" rel="noopener">${PLAY_SVG} Google Play'de İndir</a>`);
    }
    buttons.push(`<a href="${escapeHtml(privacyUrl)}" class="product-btn product-btn-secondary">Gizlilik Politikası</a>`);
    buttons.push(`<a href="../index.html" class="product-btn product-btn-ghost">Bambinifojo Ana Sayfa</a>`);
    el.innerHTML = buttons.join('');
  }

  async function loadAppData(appTitle) {
    const path = '../data/apps.json';
    const res = await fetch(`${path}?t=${Date.now()}`);
    if (!res.ok) throw new Error(`apps.json yüklenemedi (${res.status})`);
    const data = await res.json();
    const app = data.apps?.find((item) => item.title === appTitle);
    if (!app) throw new Error(`${appTitle} bulunamadı`);
    return app;
  }

  async function enrichFromPlayStore(app) {
    if (globalThis.PlayStoreClient?.enrichAppFromPlayStore) {
      try {
        return await globalThis.PlayStoreClient.enrichAppFromPlayStore(app);
      } catch (error) {
        console.warn('Play Store görselleri yüklenemedi, yerel veri kullanılıyor:', error);
      }
    }
    return app;
  }

  async function initProductDetail() {
    const appTitle = document.body.dataset.appTitle;
    if (!appTitle) return;

    try {
      const app = await enrichFromPlayStore(await loadAppData(appTitle));
      renderHero(app);
      renderAbout(app);
      renderFeatures(app);
      renderScreenshots(app);
      renderTechStack(app);
      renderCta(app);
    } catch (error) {
      console.error('Product detail yüklenemedi:', error);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initProductDetail);
  } else {
    initProductDetail();
  }
})();
