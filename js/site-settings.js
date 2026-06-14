/**
 * Bambinifojo Site Settings — shared store + public site apply
 */
const SiteSettingsStore = (function () {
  const STORAGE_KEY = 'bambinifojo_site_settings';
  const UPDATED_KEY = 'bambinifojo_site_settings_updated';

  const DEFAULTS = {
    brandName: 'Bambinifojo',
    brandSubtitle: 'Mobile Product Studio',
    heroBadge: 'Mobile Product Studio',
    heroTitle: 'Mobil uygulamalar, SaaS araçları ve geleceğe dönük dijital ürünler.',
    heroDescription: 'Android, Flutter, Firebase ve yapay zeka destekli geliştirme süreçleriyle; hızlı, sade ve kullanıcı odaklı ürünler geliştiriyorum.',
    primaryCtaText: 'Uygulamaları İncele',
    primaryCtaUrl: '#apps',
    secondaryCtaText: 'Play Store',
    secondaryCtaUrl: 'https://play.google.com/store/apps/developer?id=Bambinifojo',
    email: 'bambinifojo@gmail.com',
    githubUrl: 'https://github.com/Bambinifojo',
    playStoreUrl: 'https://play.google.com/store/apps/developer?id=Bambinifojo',
    portfolioUrl: 'https://bambinifojo.github.io',
    footerText: 'Mobil uygulamalar, yapay zeka destekli araçlar ve ölçeklenebilir dijital sistemler geliştiren bağımsız mobile product studio.',
    seoTitle: 'Bambinifojo — Mobile Product Studio',
    seoDescription: 'Mobil uygulamalar, SaaS araçları ve yapay zeka destekli dijital ürünler geliştiren bağımsız mobile product studio.',
    ogImageUrl: ''
  };

  const FIELD_KEYS = Object.keys(DEFAULTS);

  function getDefaults() {
    return { ...DEFAULTS };
  }

  function merge(settings) {
    const merged = { ...DEFAULTS };
    if (!settings || typeof settings !== 'object') return merged;
    FIELD_KEYS.forEach((key) => {
      if (settings[key] !== undefined && settings[key] !== null) {
        merged[key] = String(settings[key]);
      }
    });
    return merged;
  }

  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      return merge(JSON.parse(raw));
    } catch (e) {
      console.warn('Site ayarları okunamadı:', e.message);
      return null;
    }
  }

  function save(settings) {
    const merged = merge(settings);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
    localStorage.setItem(UPDATED_KEY, Date.now().toString());
    return merged;
  }

  function getLastUpdated() {
    const raw = localStorage.getItem(UPDATED_KEY);
    if (!raw) return null;
    const ts = Number(raw);
    return Number.isNaN(ts) ? null : ts;
  }

  function isValidEmail(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  }

  function isValidLink(value) {
    if (!value || !value.trim()) return true;
    const v = value.trim();
    if (v.startsWith('#')) return true;
    if (v.startsWith('mailto:')) return true;
    if (v.startsWith('http://') || v.startsWith('https://')) return true;
    return false;
  }

  function validate(settings) {
    const errors = [];
    const warnings = [];
    const data = merge(settings);

    if (!data.brandName.trim()) errors.push('Site adı boş olamaz.');
    if (!data.heroTitle.trim()) errors.push('Hero başlığı boş olamaz.');

    if (data.email.trim() && !isValidEmail(data.email.trim())) {
      errors.push('E-posta geçerli bir formatta olmalı.');
    }

    ['primaryCtaUrl', 'secondaryCtaUrl', 'githubUrl', 'playStoreUrl', 'portfolioUrl', 'ogImageUrl'].forEach((key) => {
      if (!isValidLink(data[key])) {
        errors.push(`${key} geçerli bir link olmalı (http, https, mailto veya #).`);
      }
    });

    if (data.seoDescription.length > 160) {
      warnings.push('SEO açıklaması 160 karakteri aşıyor; arama sonuçlarında kısaltılabilir.');
    }

    return { errors, warnings, data };
  }

  function buildFromSiteJson(site) {
    if (!site) return getDefaults();
    const emailItem = site.contact?.items?.find((i) => i.type === 'email' || i.link?.startsWith('mailto'));
    const githubItem = site.contact?.items?.find((i) => i.type === 'github' || i.link?.includes('github.com'));
    const portfolioItem = site.contact?.items?.find((i) => i.type === 'portfolio');

    return merge({
      brandName: site.header?.logo,
      brandSubtitle: site.header?.tagline,
      heroBadge: site.header?.tagline || DEFAULTS.heroBadge,
      heroTitle: site.hero?.title,
      heroDescription: site.hero?.tagline,
      secondaryCtaUrl: site.hero?.playStoreUrl,
      playStoreUrl: site.hero?.playStoreUrl,
      email: emailItem?.value || emailItem?.link?.replace('mailto:', ''),
      githubUrl: githubItem?.link,
      portfolioUrl: portfolioItem?.link,
      footerText: site.footer?.text
    });
  }

  function syncToAppsSite(settings, appsSite) {
    const s = merge(settings);
    const site = appsSite || {};
    site.header = {
      logo: s.brandName,
      tagline: s.brandSubtitle
    };
    site.hero = {
      ...(site.hero || {}),
      title: s.heroTitle,
      tagline: s.heroDescription,
      playStoreUrl: s.playStoreUrl || s.secondaryCtaUrl
    };
    site.contact = site.contact || {};
    site.contact.title = site.contact.title || 'Bir uygulama fikrin mi var?';
    site.contact.subtitle = site.contact.subtitle || s.heroDescription;
    site.contact.items = [
      {
        type: 'email',
        icon: '📧',
        title: 'E-posta',
        value: s.email,
        link: s.email ? `mailto:${s.email}` : '#',
        description: 'En hızlı yanıt için e-posta gönderebilirsiniz'
      },
      {
        type: 'github',
        icon: '💻',
        title: 'GitHub',
        value: s.githubUrl ? s.githubUrl.replace('https://', '') : '',
        link: s.githubUrl || '#',
        description: 'Açık kaynak projeler'
      },
      {
        type: 'portfolio',
        icon: '🌐',
        title: 'Portfolio',
        value: s.portfolioUrl ? s.portfolioUrl.replace('https://', '') : '',
        link: s.portfolioUrl || '#',
        description: 'Web sitesi'
      }
    ];
    return site;
  }

  function applyToDocument(settings) {
    const s = merge(settings);

    const brandName = document.querySelector('.brand-name, .brand-title');
    const footerBrandName = document.querySelector('.footer-brand-name');
    const brandSubtitle = document.querySelector('.header-tagline, .brand-subtitle');
    const heroBadge = document.querySelector('.hero-eyebrow');
    const heroTitle = document.querySelector('.hero-title');
    const heroDesc = document.querySelector('.hero-subtitle, .hero-tagline');
    const primaryCta = document.querySelector('.hero-cta .btn-primary');
    const secondaryCta = document.querySelector('.hero-cta .btn-playstore');
    const footerDesc = document.querySelector('.footer-brand-desc');

    if (brandName && s.brandName) brandName.textContent = s.brandName;
    if (footerBrandName && s.brandName) footerBrandName.textContent = s.brandName;
    if (brandSubtitle && s.brandSubtitle) brandSubtitle.textContent = s.brandSubtitle;
    if (heroBadge && s.heroBadge) heroBadge.textContent = s.heroBadge;
    if (heroTitle && s.heroTitle) heroTitle.textContent = s.heroTitle;
    if (heroDesc && s.heroDescription) heroDesc.textContent = s.heroDescription;

    if (primaryCta) {
      if (s.primaryCtaText) {
        const icon = primaryCta.querySelector('svg');
        primaryCta.textContent = s.primaryCtaText;
        if (icon) primaryCta.prepend(icon);
      }
      if (s.primaryCtaUrl) primaryCta.setAttribute('href', s.primaryCtaUrl);
    }

    if (secondaryCta) {
      const label = secondaryCta.querySelector('span');
      if (label && s.secondaryCtaText) label.textContent = s.secondaryCtaText;
      const playUrl = s.secondaryCtaUrl || s.playStoreUrl;
      if (playUrl) secondaryCta.setAttribute('href', playUrl);
    }

    if (footerDesc && s.footerText) footerDesc.textContent = s.footerText;

    if (s.email) {
      document.querySelectorAll('[data-site-email]').forEach((el) => {
        if (el.tagName === 'A') el.setAttribute('href', `mailto:${s.email}`);
        else el.textContent = s.email;
      });
    }

    if (s.githubUrl) {
      document.querySelectorAll('[data-site-github]').forEach((el) => {
        el.setAttribute('href', s.githubUrl);
      });
    }

    if (s.playStoreUrl) {
      document.querySelectorAll('[data-site-playstore]').forEach((el) => {
        el.setAttribute('href', s.playStoreUrl);
      });
    }

    if (s.seoTitle) document.title = s.seoTitle;
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc && s.seoDescription) metaDesc.setAttribute('content', s.seoDescription);

    const ogImage = document.querySelector('meta[property="og:image"]');
    if (s.ogImageUrl) {
      if (ogImage) {
        ogImage.setAttribute('content', s.ogImageUrl);
      } else {
        const meta = document.createElement('meta');
        meta.setAttribute('property', 'og:image');
        meta.setAttribute('content', s.ogImageUrl);
        document.head.appendChild(meta);
      }
    }
  }

  return {
    STORAGE_KEY,
    UPDATED_KEY,
    getDefaults,
    merge,
    load,
    save,
    validate,
    buildFromSiteJson,
    syncToAppsSite,
    applyToDocument,
    getLastUpdated,
    FIELD_KEYS
  };
})();
