async function loadApps(){
  const res = await fetch("data/apps.json");
  const data = await res.json();
  const container = document.getElementById("apps-container");
  container.innerHTML = "";
  data.apps.forEach(app=>{
    container.innerHTML += `
    <div class="app-card">
      <h3>${app.title}</h3>
      <p>${app.description}</p>
      <a href="${app.privacy}">Gizlilik Politikası</a> |
      <a href="${app.details}">Detaylar</a>
    </div>`;
  });
}
loadApps();