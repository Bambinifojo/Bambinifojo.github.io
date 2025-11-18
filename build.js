const fs = require('fs');
const path = require('path');

console.log('🚀 Build başlatılıyor...\n');

// Dosya kontrolü
const requiredFiles = [
  'index.html',
  'styles.css',
  'scripts.js',
  'data/apps.json'
];

let allFilesExist = true;

requiredFiles.forEach(file => {
  const filePath = path.join(__dirname, file);
  if (fs.existsSync(filePath)) {
    const stats = fs.statSync(filePath);
    console.log(`✅ ${file} (${(stats.size / 1024).toFixed(2)} KB)`);
  } else {
    console.log(`❌ ${file} bulunamadı!`);
    allFilesExist = false;
  }
});

console.log('\n📊 Dosya istatistikleri:');

// HTML kontrolü
const html = fs.readFileSync('index.html', 'utf8');
const htmlLines = html.split('\n').length;
const htmlSize = (Buffer.byteLength(html, 'utf8') / 1024).toFixed(2);
console.log(`   HTML: ${htmlLines} satır, ${htmlSize} KB`);

// CSS kontrolü
const css = fs.readFileSync('styles.css', 'utf8');
const cssLines = css.split('\n').length;
const cssSize = (Buffer.byteLength(css, 'utf8') / 1024).toFixed(2);
console.log(`   CSS: ${cssLines} satır, ${cssSize} KB`);

// JS kontrolü
const js = fs.readFileSync('scripts.js', 'utf8');
const jsLines = js.split('\n').length;
const jsSize = (Buffer.byteLength(js, 'utf8') / 1024).toFixed(2);
console.log(`   JavaScript: ${jsLines} satır, ${jsSize} KB`);

// JSON kontrolü
const json = fs.readFileSync('data/apps.json', 'utf8');
const apps = JSON.parse(json);
console.log(`   Uygulamalar: ${apps.apps.length} adet`);

// Basit validasyon
console.log('\n🔍 Validasyon:');

// HTML'de gerekli tagler var mı?
if (html.includes('<html') && html.includes('</html>')) {
  console.log('   ✅ HTML yapısı geçerli');
} else {
  console.log('   ❌ HTML yapısı geçersiz');
  allFilesExist = false;
}

// CSS'de temel stiller var mı?
if (css.includes('body') && css.includes('header')) {
  console.log('   ✅ CSS yapısı geçerli');
} else {
  console.log('   ⚠️  CSS yapısı eksik olabilir');
}

// JS'de temel fonksiyonlar var mı?
if (js.includes('loadApps') || js.includes('function')) {
  console.log('   ✅ JavaScript yapısı geçerli');
} else {
  console.log('   ⚠️  JavaScript yapısı eksik olabilir');
}

// JSON geçerli mi?
try {
  JSON.parse(json);
  console.log('   ✅ JSON formatı geçerli');
} catch (e) {
  console.log('   ❌ JSON formatı geçersiz:', e.message);
  allFilesExist = false;
}

console.log('\n' + '='.repeat(50));

if (allFilesExist) {
  console.log('✅ Build başarılı! Site hazır.');
  console.log('\n📝 Sonraki adımlar:');
  console.log('   1. npm run serve - Local test için');
  console.log('   2. git add . - Değişiklikleri ekle');
  console.log('   3. git commit -m "mesaj" - Commit yap');
  console.log('   4. git push - GitHub\'a gönder');
} else {
  console.log('❌ Build başarısız! Lütfen hataları düzeltin.');
  process.exit(1);
}

