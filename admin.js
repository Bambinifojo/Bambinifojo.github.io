let repo='bambinifojo.github.io';
let user='bambinifojo';
let path='data/apps.json';
let token='';

async function login(){
  token=document.getElementById('token').value.trim();
  if(!token){ alert("Token gir!"); return; }
  loadFile();
}

async function loadFile(){
  const res=await fetch(`https://api.github.com/repos/${user}/${repo}/contents/${path}`,{
    headers:{ Authorization:`token ${token}` }
  });
  const json=await res.json();
  const content=atob(json.content);

  const data=JSON.parse(content);
  window.sha=json.sha;

  document.getElementById('panel').innerHTML=`
    <h2>Uygulamalar</h2>
    <pre>${JSON.stringify(data,null,2)}</pre>
    <button onclick="addApp()">Yeni Uygulama Ekle</button>
  `;
}

async function addApp(){
  let newApp={
    id:prompt("ID"),
    title:prompt("Başlık"),
    description:prompt("Açıklama"),
    icon:"",
    privacy:"",
    details:""
  };

  const res=await fetch(`https://api.github.com/repos/${user}/${repo}/contents/${path}`,{
    headers:{ Authorization:`token ${token}` }
  });
  const json=await res.json();
  let content=JSON.parse(atob(json.content));

  content.apps.push(newApp);

  await fetch(`https://api.github.com/repos/${user}/${repo}/contents/${path}`,{
    method:"PUT",
    headers:{
      Authorization:`token ${token}`,
      "Content-Type":"application/json"
    },
    body:JSON.stringify({
      message:"App updated",
      content:btoa(JSON.stringify(content,null,2)),
      sha:json.sha
    })
  });

  alert("Uygulama eklendi!");
  loadFile();
}
