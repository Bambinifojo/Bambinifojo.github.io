async function loadApps(){
  try {
    const res = await fetch("data/apps.json");
    const data = await res.json();
    const container = document.getElementById("apps-container");
    container.innerHTML = "";
    
    if (data.apps.length === 0) {
      container.innerHTML = '<p style="color: white; text-align: center; padding: 40px; opacity: 0.8;">Henüz uygulama eklenmemiş.</p>';
      return;
    }
    
    data.apps.forEach((app, index) => {
      const icon = app.icon || '📱';
      container.innerHTML += `
      <div class="app-card" style="animation-delay: ${index * 0.1}s">
        <div class="app-icon-container">
          <div class="app-icon">${icon}</div>
        </div>
        <h3>${app.title}</h3>
        <p>${app.description}</p>
        <div class="app-buttons">
          <a href="${app.privacy}" class="btn btn-secondary">Gizlilik Politikası</a>
          <a href="${app.details}" class="btn btn-primary">Detaylar</a>
        </div>
      </div>`;
    });
  } catch (error) {
    console.error('Uygulamalar yüklenirken hata:', error);
    const container = document.getElementById("apps-container");
    container.innerHTML = '<p style="color: white; text-align: center; padding: 40px; opacity: 0.8;">Uygulamalar yüklenirken bir hata oluştu.</p>';
  }
}

document.addEventListener('DOMContentLoaded', () => {
  loadApps();
  
  // Scroll indicator'a tıklandığında uygulamalar bölümüne kaydır
  const scrollIndicator = document.querySelector('.scroll-indicator');
  if (scrollIndicator) {
    scrollIndicator.addEventListener('click', () => {
      const appsSection = document.getElementById('apps');
      if (appsSection) {
        appsSection.scrollIntoView({ behavior: 'smooth' });
      }
    });
  }
});