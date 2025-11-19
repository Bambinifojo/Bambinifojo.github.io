// Admin Panel JavaScript
let currentMode = 'local'; // 'local' veya 'github'
let token = '';
let appsData = { apps: [], site: null };
let currentFeatures = [];
let currentSiteSection = 'header';

// Sayfa yüklendiğinde otomatik giriş (LocalStorage modunda)
document.addEventListener('DOMContentLoaded', () => {
  // LocalStorage modunda otomatik giriş yap
  if (localStorage.getItem('appsData')) {
    autoLogin();
  } else {
    // İlk kez, apps.json'dan yükle
    fetch('data/apps.json')
      .then(res => res.json())
      .then(data => {
        appsData = data;
        saveToLocal();
        autoLogin();
      })
      .catch(() => {
        appsData = { apps: [] };
      });
  }
});

// Otomatik giriş (event olmadan)
function autoLogin() {
  const saved = localStorage.getItem('appsData');
  if (saved) {
    appsData = JSON.parse(saved);
  } else {
    // İlk kez, apps.json'dan yükle
    fetch('data/apps.json')
      .then(res => res.json())
      .then(data => {
        appsData = data;
        if (!appsData.site) {
          // Eski format, site verisi yok, site.json'dan yükle
          fetch('data/site.json')
            .then(res => res.json())
            .then(siteData => {
              appsData.site = siteData.site;
              saveToLocal();
            })
            .catch(() => {
              // Site.json yoksa varsayılan değerler
              appsData.site = getDefaultSiteData();
            });
        }
        saveToLocal();
      })
      .catch(() => {
        appsData = { apps: [], site: getDefaultSiteData() };
      });
  }
  
  const tokenInput = document.getElementById('token');
  if (tokenInput) {
    tokenInput.disabled = currentMode === 'local';
  }
  
  updateStats();
  renderApps();
}

// Varsayılan site verisi
function getDefaultSiteData() {
  return {
    header: { logo: "Bambinifojo", tagline: "Mobil Uygulama Geliştirici" },
    hero: {
      title: "Bambinifojo",
      tagline: "Android cihazlar için güzel ve kullanımı kolay arayüzlere sahip uygulamalar geliştiriyoruz",
      playStoreUrl: "https://play.google.com/store/apps/developer?id=Bambinifojo",
      stats: [
        { number: "2+", label: "Uygulama" },
        { number: "100%", label: "Kalite" },
        { number: "∞", label: "İnovasyon" }
      ]
    },
    about: {
      title: "Hakkımda",
      texts: [
        "Bağımsız bir mobil uygulama geliştiricisiyim. Android, Flutter, Firebase ve oyun motorları ile uygulamalar ve mini oyunlar geliştiriyorum.",
        "Amacım, herkesin kolayca kullanabileceği sade ve işlevsel deneyimler oluşturmak."
      ],
      technologies: [
        { icon: "🤖", name: "Android" },
        { icon: "🎨", name: "Flutter" },
        { icon: "🔥", name: "Firebase" },
        { icon: "🎮", name: "Oyun Motorları" }
      ]
    },
    skills: {
      title: "Teknolojiler & Yetenekler",
      items: [
        { name: "Android Development", icon: "🤖", level: 90 },
        { name: "Flutter", icon: "🎨", level: 85 },
        { name: "Firebase", icon: "🔥", level: 80 },
        { name: "UI/UX Design", icon: "✨", level: 75 },
        { name: "Game Development", icon: "🎮", level: 70 },
        { name: "Backend Development", icon: "⚙️", level: 65 }
      ]
    },
    contact: {
      title: "İletişim",
      subtitle: "Projeleriniz veya işbirliği için benimle iletişime geçebilirsiniz",
      items: [
        {
          type: "email",
          icon: "📧",
          title: "E-posta",
          value: "bambinifojo@gmail.com",
          link: "mailto:bambinifojo@gmail.com",
          description: "En hızlı yanıt için e-posta gönderebilirsiniz"
        },
        {
          type: "github",
          icon: "💻",
          title: "GitHub",
          value: "github.com/Bambinifojo",
          link: "https://github.com/Bambinifojo",
          description: "Açık kaynak projelerimi inceleyebilirsiniz"
        },
        {
          type: "portfolio",
          icon: "🌐",
          title: "Portfolio",
          value: "bambinifojo.github.io",
          link: "https://bambinifojo.github.io",
          description: "Web sitemi ziyaret ederek daha fazla bilgi alın"
        }
      ]
    }
  };
}

// Mode değiştirme
function setMode(mode) {
  currentMode = mode;
  document.getElementById('localModeBtn').classList.toggle('active', mode === 'local');
  document.getElementById('githubModeBtn').classList.toggle('active', mode === 'github');
  const saveGitHubBtn = document.getElementById('saveGitHubBtn');
  if (saveGitHubBtn) {
    if (mode === 'github') {
      saveGitHubBtn.classList.remove('hidden');
    } else {
      saveGitHubBtn.classList.add('hidden');
    }
  }
}

// Giriş
async function login() {
  if (currentMode === 'github') {
    token = document.getElementById('token').value.trim();
    if (!token) {
      alert('GitHub Token girin!');
      return;
    }
    try {
      await loadFromGitHub();
    } catch (error) {
      alert('GitHub\'dan veri yüklenirken hata: ' + error.message);
      return;
    }
  } else {
    // LocalStorage'dan yükle
    const saved = localStorage.getItem('appsData');
    if (saved) {
      appsData = JSON.parse(saved);
    } else {
      // İlk kez, data/apps.json'dan yükle
      try {
        const res = await fetch('data/apps.json');
        appsData = await res.json();
        if (!appsData.site) {
          // Site verisi yoksa site.json'dan yükle
          try {
            const siteRes = await fetch('data/site.json');
            const siteData = await siteRes.json();
            appsData.site = siteData.site;
          } catch {
            appsData.site = getDefaultSiteData();
          }
        }
        saveToLocal();
      } catch (error) {
        console.error('Veri yüklenirken hata:', error);
        appsData = { apps: [], site: getDefaultSiteData() };
      }
    }
  }

  // Giriş yapıldı, butonları güncelle
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.classList.remove('hidden');
  }
  const tokenInput = document.getElementById('token');
  if (tokenInput) {
    tokenInput.disabled = currentMode === 'local';
  }
  
  updateStats();
  renderApps();
  
  // Başarı mesajı
  const btn = document.querySelector('button[onclick="login()"]');
  if (btn) {
    const originalText = btn.innerHTML;
    btn.innerHTML = '<span>✅ Başarılı!</span>';
    btn.style.background = '#00c853';
    setTimeout(() => {
      btn.innerHTML = originalText;
      btn.style.background = '';
    }, 2000);
  }
}

// Çıkış
function logout() {
  if (confirm('Çıkış yapmak istediğinize emin misiniz?')) {
    // Session'ı temizle
    sessionStorage.removeItem('adminSession');
    sessionStorage.removeItem('adminLoginTime');
    
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
      logoutBtn.classList.add('hidden');
    }
    const tokenInput = document.getElementById('token');
    if (tokenInput) {
      tokenInput.value = '';
      tokenInput.disabled = false;
    }
    token = '';
    appsData = { apps: [] };
    const appsList = document.getElementById('appsList');
    if (appsList) {
      appsList.innerHTML = '<p class="loading-text">Çıkış yapıldı. Tekrar giriş yapın.</p>';
    }
    updateStats();
    
    // Login sayfasına yönlendir
    setTimeout(() => {
      window.location.href = 'admin-login.html';
    }, 500);
  }
}

// GitHub'dan yükle
async function loadFromGitHub() {
  const repo = 'bambinifojo.github.io';
  const user = 'bambinifojo';
  const path = 'data/apps.json';

  const res = await fetch(`https://api.github.com/repos/${user}/${repo}/contents/${path}`, {
    headers: { Authorization: `token ${token}` }
  });

  if (!res.ok) {
    throw new Error('GitHub API hatası: ' + res.status);
  }

  const json = await res.json();
  const content = atob(json.content);
  appsData = JSON.parse(content);
  
  // Site verisi yoksa varsayılan değerler ekle
  if (!appsData.site) {
    appsData.site = getDefaultSiteData();
  }
  
  window.githubSha = json.sha;
}

// GitHub'a kaydet
async function saveToGitHub() {
  if (currentMode !== 'github') {
    alert('GitHub modunda değilsiniz!');
    return;
  }

  if (!token) {
    alert('Token gerekli!');
    return;
  }

  const repo = 'bambinifojo.github.io';
  const user = 'bambinifojo';
  const path = 'data/apps.json';

  try {
    // Önce mevcut SHA'yı al
    if (!window.githubSha) {
      await loadFromGitHub();
    }

    const res = await fetch(`https://api.github.com/repos/${user}/${repo}/contents/${path}`, {
      method: 'PUT',
      headers: {
        Authorization: `token ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: 'Admin panelinden site ve uygulama verileri güncellendi',
        content: btoa(JSON.stringify(appsData, null, 2)),
        sha: window.githubSha
    })
  });

    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.message || 'Kayıt başarısız');
    }

    // SHA'yı güncelle
    const result = await res.json();
    window.githubSha = result.content.sha;

    showAlert('✅ GitHub\'a başarıyla kaydedildi!', 'success');
    await loadFromGitHub();
    updateStats();
    renderApps();
  } catch (error) {
    alert('❌ Hata: ' + error.message);
  }
}

// LocalStorage'a kaydet
function saveToLocal() {
  localStorage.setItem('appsData', JSON.stringify(appsData));
}

// İstatistikleri güncelle
function updateStats() {
  const total = appsData.apps.length;
  const published = appsData.apps.filter(app => app.details && app.details !== '#').length;
  const comingSoon = total - published;

  document.getElementById('totalApps').textContent = total;
  document.getElementById('publishedApps').textContent = published;
  document.getElementById('comingSoonApps').textContent = comingSoon;
}

// Uygulamaları listele
function renderApps() {
  const container = document.getElementById('appsList');
  
  if (appsData.apps.length === 0) {
    container.innerHTML = '<p style="text-align: center; color: #999; padding: 40px;">Henüz uygulama yok. Yeni uygulama ekleyin!</p>';
    return;
  }

  container.innerHTML = appsData.apps.map((app, index) => `
    <div class="app-item">
      <div class="app-item-info">
        <div class="app-item-title">${app.icon || '📱'} ${app.title || 'İsimsiz'}</div>
        <div class="app-item-desc">${app.description || 'Açıklama yok'}</div>
      </div>
      <div class="app-item-actions">
        <button class="btn btn-secondary btn-sm" onclick="editApp(${index})">✏️ Düzenle</button>
        <button class="btn btn-danger btn-sm" onclick="deleteApp(${index})">🗑️ Sil</button>
      </div>
    </div>
  `).join('');
}

// Form göster
function showAddForm() {
  document.getElementById('formTitle').textContent = 'Yeni Uygulama Ekle';
  document.getElementById('appForm').reset();
  document.getElementById('appIndex').value = '-1';
  currentFeatures = [];
  renderFeatures();
  showAppModal();
}

// Uygulama düzenle
function editApp(index) {
  const app = appsData.apps[index];
  document.getElementById('appIndex').value = index;
  document.getElementById('appTitle').value = app.title || '';
  document.getElementById('appDescription').value = app.description || '';
  document.getElementById('appIcon').value = app.icon || '';
  document.getElementById('appCategory').value = app.category || '';
  document.getElementById('appRating').value = app.rating || 4.5;
  document.getElementById('appDownloads').value = app.downloads || '';
  document.getElementById('appDetails').value = app.details && app.details !== '#' ? app.details : '';
  document.getElementById('appPrivacy').value = app.privacy && app.privacy !== '#' ? app.privacy : '';
  currentFeatures = [...(app.features || [])];
  renderFeatures();
  
  document.getElementById('formTitle').textContent = 'Uygulama Düzenle';
  showAppModal();
}

// Uygulama kaydet
function saveApp(event) {
  event.preventDefault();
  
  const index = parseInt(document.getElementById('appIndex').value);
  const app = {
    title: document.getElementById('appTitle').value.trim(),
    description: document.getElementById('appDescription').value.trim(),
    icon: document.getElementById('appIcon').value.trim(),
    category: document.getElementById('appCategory').value.trim(),
    rating: parseFloat(document.getElementById('appRating').value),
    downloads: document.getElementById('appDownloads').value.trim(),
    details: document.getElementById('appDetails').value.trim() || '#',
    privacy: document.getElementById('appPrivacy').value.trim() || '#',
    features: currentFeatures
  };

  if (index === -1) {
    // Yeni ekle
    appsData.apps.push(app);
  } else {
    // Güncelle
    appsData.apps[index] = app;
  }

  if (currentMode === 'local') {
    saveToLocal();
    showAlert('✅ LocalStorage\'a kaydedildi!', 'success');
  } else {
    showAlert('✅ Değişiklikler kaydedildi. GitHub\'a kaydetmek için "GitHub\'a Kaydet" butonuna tıklayın.', 'info');
  }

  updateStats();
  renderApps();
  closeAppModal();
}

// Modal Functions
function showAppModal() {
  const modal = document.getElementById('appFormModal');
  if (modal) {
    modal.classList.add('active');
    document.body.classList.add('modal-open');
    // Scroll pozisyonunu kaydet
    const scrollY = window.scrollY;
    document.body.style.top = `-${scrollY}px`;
  }
}

function closeAppModal() {
  const modal = document.getElementById('appFormModal');
  if (modal) {
    modal.classList.remove('active');
    document.body.classList.remove('modal-open');
    // Scroll pozisyonunu geri yükle
    const scrollY = document.body.style.top;
    document.body.style.top = '';
    if (scrollY) {
      window.scrollTo(0, parseInt(scrollY || '0') * -1);
    }
  }
}

function showSiteModal() {
  const modal = document.getElementById('siteSettingsModal');
  if (modal) {
    modal.classList.add('active');
    document.body.classList.add('modal-open');
    // Scroll pozisyonunu kaydet
    const scrollY = window.scrollY;
    document.body.style.top = `-${scrollY}px`;
    loadSiteData();
    showSiteSection('header');
  }
}

function closeSiteModal() {
  const modal = document.getElementById('siteSettingsModal');
  if (modal) {
    modal.classList.remove('active');
    document.body.classList.remove('modal-open');
    // Scroll pozisyonunu geri yükle
    const scrollY = document.body.style.top;
    document.body.style.top = '';
    if (scrollY) {
      window.scrollTo(0, parseInt(scrollY || '0') * -1);
    }
  }
}

// Overlay click to close
document.addEventListener('click', (e) => {
  if (e.target.classList.contains('modal-overlay')) {
    closeAppModal();
    closeSiteModal();
  }
});

// ESC key to close modals
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    closeAppModal();
    closeSiteModal();
  }
});

// Form iptal
function cancelForm() {
  closeAppModal();
}

// Uygulama sil
function deleteApp(index) {
  if (!confirm('Bu uygulamayı silmek istediğinize emin misiniz?')) {
    return;
  }

  appsData.apps.splice(index, 1);

  if (currentMode === 'local') {
    saveToLocal();
    showAlert('✅ Uygulama silindi!', 'success');
  } else {
    showAlert('✅ Uygulama silindi. GitHub\'a kaydetmek için "GitHub\'a Kaydet" butonuna tıklayın.', 'info');
  }

  updateStats();
  renderApps();
}

// Form iptal
function cancelForm() {
  document.getElementById('appFormSection').classList.add('hidden');
  document.getElementById('appForm').reset();
  currentFeatures = [];
}

// Özellik ekle
function addFeature() {
  const input = document.getElementById('newFeature');
  const feature = input.value.trim();
  
  if (feature && !currentFeatures.includes(feature)) {
    currentFeatures.push(feature);
    renderFeatures();
    input.value = '';
  }
}

// Özellik sil
function removeFeature(index) {
  currentFeatures.splice(index, 1);
  renderFeatures();
}

// Özellikleri render et
function renderFeatures() {
  const container = document.getElementById('featuresList');
  container.innerHTML = currentFeatures.map((feature, index) => `
    <div class="feature-tag-input">
      <span>${feature}</span>
      <button type="button" onclick="removeFeature(${index})">×</button>
    </div>
  `).join('');
}

// Veriyi dışa aktar
function exportData() {
  const dataStr = JSON.stringify(appsData, null, 2);
  const dataBlob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(dataBlob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'apps-backup.json';
  link.click();
  URL.revokeObjectURL(url);
}

// Veriyi içe aktar
function importData() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'application/json';
  input.onchange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const imported = JSON.parse(event.target.result);
        if (imported.apps && Array.isArray(imported.apps)) {
          if (confirm('Mevcut verilerin üzerine yazılacak. Devam etmek istiyor musunuz?')) {
            appsData = imported;
            if (currentMode === 'local') {
              saveToLocal();
            }
            updateStats();
            renderApps();
            alert('✅ Veri içe aktarıldı!');
          }
        } else {
          alert('❌ Geçersiz dosya formatı!');
        }
      } catch (error) {
        alert('❌ Dosya okunamadı: ' + error.message);
      }
    };
    reader.readAsText(file);
  };
  input.click();
}

// Site Ayarları Fonksiyonları
function showSiteSettings() {
  showSiteModal();
}

function cancelSiteSettings() {
  closeSiteModal();
}

function showSiteSection(section) {
  // Tüm formları gizle
  document.querySelectorAll('.site-form-section').forEach(el => el.classList.add('hidden'));
  // Tüm tabları pasif yap
  document.querySelectorAll('.section-tab').forEach(tab => tab.classList.remove('active'));
  // Seçilen formu göster
  document.getElementById(`site${section.charAt(0).toUpperCase() + section.slice(1)}Form`).classList.remove('hidden');
  // Seçilen tabı aktif yap
  const tabs = document.querySelectorAll('.section-tab');
  const sectionNames = ['header', 'hero', 'about', 'skills', 'contact'];
  const index = sectionNames.indexOf(section);
  if (index !== -1 && tabs[index]) {
    tabs[index].classList.add('active');
  }
  currentSiteSection = section;
  loadSiteSectionData(section);
}

function loadSiteData() {
  if (!appsData.site) {
    appsData.site = getDefaultSiteData();
  }
}

function loadSiteSectionData(section) {
  if (!appsData.site) return;
  
  const site = appsData.site;
  
  if (section === 'header') {
    document.getElementById('siteHeaderLogo').value = site.header?.logo || '';
    document.getElementById('siteHeaderTagline').value = site.header?.tagline || '';
  } else if (section === 'hero') {
    document.getElementById('siteHeroTitle').value = site.hero?.title || '';
    document.getElementById('siteHeroTagline').value = site.hero?.tagline || '';
    document.getElementById('siteHeroPlayStoreUrl').value = site.hero?.playStoreUrl || '';
    document.getElementById('siteHeroStats').value = JSON.stringify(site.hero?.stats || [], null, 2);
  } else if (section === 'about') {
    document.getElementById('siteAboutTitle').value = site.about?.title || '';
    document.getElementById('siteAboutTexts').value = site.about?.texts?.join('\n') || '';
    document.getElementById('siteAboutTech').value = site.about?.technologies?.map(t => `${t.icon}|${t.name}`).join('\n') || '';
  } else if (section === 'skills') {
    document.getElementById('siteSkillsTitle').value = site.skills?.title || '';
    renderSkillsList();
  } else if (section === 'contact') {
    document.getElementById('siteContactTitle').value = site.contact?.title || '';
    document.getElementById('siteContactSubtitle').value = site.contact?.subtitle || '';
    renderContactList();
  }
}

function saveSiteSection(section) {
  if (!appsData.site) {
    appsData.site = getDefaultSiteData();
  }
  
  if (section === 'header') {
    appsData.site.header = {
      logo: document.getElementById('siteHeaderLogo').value.trim(),
      tagline: document.getElementById('siteHeaderTagline').value.trim()
    };
  } else if (section === 'hero') {
    let stats = [];
    try {
      stats = JSON.parse(document.getElementById('siteHeroStats').value);
    } catch (e) {
      alert('İstatistikler JSON formatında olmalı!');
      return;
    }
    appsData.site.hero = {
      title: document.getElementById('siteHeroTitle').value.trim(),
      tagline: document.getElementById('siteHeroTagline').value.trim(),
      playStoreUrl: document.getElementById('siteHeroPlayStoreUrl').value.trim(),
      stats: stats
    };
  } else if (section === 'about') {
    const texts = document.getElementById('siteAboutTexts').value.split('\n').filter(t => t.trim());
    const techLines = document.getElementById('siteAboutTech').value.split('\n').filter(t => t.trim());
    const technologies = techLines.map(line => {
      const [icon, ...nameParts] = line.split('|');
      return { icon: icon.trim(), name: nameParts.join('|').trim() };
    });
    
    appsData.site.about = {
      title: document.getElementById('siteAboutTitle').value.trim(),
      texts: texts,
      technologies: technologies
    };
  } else if (section === 'skills') {
    const skills = [];
    document.querySelectorAll('.skill-edit-item').forEach(item => {
      skills.push({
        name: item.querySelector('.skill-name-input').value.trim(),
        icon: item.querySelector('.skill-icon-input').value.trim(),
        level: parseInt(item.querySelector('.skill-level-input').value) || 0
      });
    });
    
    appsData.site.skills = {
      title: document.getElementById('siteSkillsTitle').value.trim(),
      items: skills
    };
  } else if (section === 'contact') {
    const contacts = [];
    document.querySelectorAll('.contact-edit-item').forEach(item => {
      contacts.push({
        type: item.querySelector('.contact-type-input').value.trim(),
        icon: item.querySelector('.contact-icon-input').value.trim(),
        title: item.querySelector('.contact-title-input').value.trim(),
        value: item.querySelector('.contact-value-input').value.trim(),
        link: item.querySelector('.contact-link-input').value.trim(),
        description: item.querySelector('.contact-desc-input').value.trim()
      });
    });
    
    appsData.site.contact = {
      title: document.getElementById('siteContactTitle').value.trim(),
      subtitle: document.getElementById('siteContactSubtitle').value.trim(),
      items: contacts
    };
  }
  
  if (currentMode === 'local') {
    saveToLocal();
    showAlert('✅ Site ayarları kaydedildi!', 'success');
  } else {
    showAlert('✅ Site ayarları kaydedildi. GitHub\'a kaydetmek için "GitHub\'a Kaydet" butonuna tıklayın.', 'info');
  }
}

// Alert göster
function showAlert(message, type = 'success') {
  const container = document.getElementById('alertContainer');
  if (!container) return;
  
  const alert = document.createElement('div');
  alert.className = `alert alert-${type}`;
  alert.innerHTML = `<span>${message}</span>`;
  
  container.appendChild(alert);
  
  setTimeout(() => {
    alert.style.opacity = '0';
    alert.style.transform = 'translateX(100px)';
    setTimeout(() => alert.remove(), 300);
  }, 3000);
}

function renderSkillsList() {
  const container = document.getElementById('skillsListContainer');
  const skills = appsData.site?.skills?.items || [];
  
  container.innerHTML = skills.map((skill, index) => `
    <div class="skill-edit-item" style="background: #f9f9f9; padding: 15px; border-radius: 10px; margin-bottom: 10px;">
      <div style="display: grid; grid-template-columns: 1fr 80px 100px auto; gap: 10px; align-items: center;">
        <input type="text" class="skill-name-input" value="${skill.name || ''}" placeholder="Yetenek adı" style="padding: 8px; border: 1px solid #ddd; border-radius: 5px;"/>
        <input type="text" class="skill-icon-input" value="${skill.icon || ''}" placeholder="Icon" maxlength="2" style="padding: 8px; border: 1px solid #ddd; border-radius: 5px; text-align: center;"/>
        <input type="number" class="skill-level-input" value="${skill.level || 0}" min="0" max="100" placeholder="Seviye" style="padding: 8px; border: 1px solid #ddd; border-radius: 5px;"/>
        <button type="button" class="btn btn-danger btn-sm" onclick="removeSkillItem(${index})">🗑️</button>
      </div>
    </div>
  `).join('');
}

function addSkillItem() {
  const container = document.getElementById('skillsListContainer');
  const newItem = document.createElement('div');
  newItem.className = 'skill-edit-item';
  newItem.style.cssText = 'background: #f9f9f9; padding: 15px; border-radius: 10px; margin-bottom: 10px;';
  newItem.innerHTML = `
    <div style="display: grid; grid-template-columns: 1fr 80px 100px auto; gap: 10px; align-items: center;">
      <input type="text" class="skill-name-input" placeholder="Yetenek adı" style="padding: 8px; border: 1px solid #ddd; border-radius: 5px;"/>
      <input type="text" class="skill-icon-input" placeholder="Icon" maxlength="2" style="padding: 8px; border: 1px solid #ddd; border-radius: 5px; text-align: center;"/>
      <input type="number" class="skill-level-input" value="0" min="0" max="100" placeholder="Seviye" style="padding: 8px; border: 1px solid #ddd; border-radius: 5px;"/>
      <button type="button" class="btn btn-danger btn-sm" onclick="this.closest('.skill-edit-item').remove()">🗑️</button>
    </div>
  `;
  container.appendChild(newItem);
}

function removeSkillItem(index) {
  if (appsData.site?.skills?.items) {
    appsData.site.skills.items.splice(index, 1);
    renderSkillsList();
  }
}

function renderContactList() {
  const container = document.getElementById('contactListContainer');
  const contacts = appsData.site?.contact?.items || [];
  
  container.innerHTML = contacts.map((contact, index) => `
    <div class="contact-edit-item" style="background: #f9f9f9; padding: 15px; border-radius: 10px; margin-bottom: 10px;">
      <div style="display: grid; gap: 10px;">
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
          <input type="text" class="contact-type-input" value="${contact.type || ''}" placeholder="Tip (email, github, vb.)" style="padding: 8px; border: 1px solid #ddd; border-radius: 5px;"/>
          <input type="text" class="contact-icon-input" value="${contact.icon || ''}" placeholder="Icon" maxlength="2" style="padding: 8px; border: 1px solid #ddd; border-radius: 5px; text-align: center;"/>
        </div>
        <input type="text" class="contact-title-input" value="${contact.title || ''}" placeholder="Başlık" style="padding: 8px; border: 1px solid #ddd; border-radius: 5px;"/>
        <input type="text" class="contact-value-input" value="${contact.value || ''}" placeholder="Değer (örn: email adresi)" style="padding: 8px; border: 1px solid #ddd; border-radius: 5px;"/>
        <input type="url" class="contact-link-input" value="${contact.link || ''}" placeholder="Link URL" style="padding: 8px; border: 1px solid #ddd; border-radius: 5px;"/>
        <textarea class="contact-desc-input" placeholder="Açıklama" style="padding: 8px; border: 1px solid #ddd; border-radius: 5px; min-height: 60px;">${contact.description || ''}</textarea>
        <button type="button" class="btn btn-danger btn-sm" onclick="this.closest('.contact-edit-item').remove()">🗑️ Sil</button>
      </div>
    </div>
  `).join('');
}

function addContactItem() {
  const container = document.getElementById('contactListContainer');
  const newItem = document.createElement('div');
  newItem.className = 'contact-edit-item';
  newItem.style.cssText = 'background: #f9f9f9; padding: 15px; border-radius: 10px; margin-bottom: 10px;';
  newItem.innerHTML = `
    <div style="display: grid; gap: 10px;">
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
        <input type="text" class="contact-type-input" placeholder="Tip (email, github, vb.)" style="padding: 8px; border: 1px solid #ddd; border-radius: 5px;"/>
        <input type="text" class="contact-icon-input" placeholder="Icon" maxlength="2" style="padding: 8px; border: 1px solid #ddd; border-radius: 5px; text-align: center;"/>
      </div>
      <input type="text" class="contact-title-input" placeholder="Başlık" style="padding: 8px; border: 1px solid #ddd; border-radius: 5px;"/>
      <input type="text" class="contact-value-input" placeholder="Değer (örn: email adresi)" style="padding: 8px; border: 1px solid #ddd; border-radius: 5px;"/>
      <input type="url" class="contact-link-input" placeholder="Link URL" style="padding: 8px; border: 1px solid #ddd; border-radius: 5px;"/>
      <textarea class="contact-desc-input" placeholder="Açıklama" style="padding: 8px; border: 1px solid #ddd; border-radius: 5px; min-height: 60px;"></textarea>
      <button type="button" class="btn btn-danger btn-sm" onclick="this.closest('.contact-edit-item').remove()">🗑️ Sil</button>
    </div>
  `;
  container.appendChild(newItem);
}

// Enter tuşu ile özellik ekleme
document.addEventListener('DOMContentLoaded', () => {
  const newFeatureInput = document.getElementById('newFeature');
  if (newFeatureInput) {
    newFeatureInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        addFeature();
      }
    });
  }
});
