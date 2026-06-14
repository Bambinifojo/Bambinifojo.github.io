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
let html = '';
let css = '';
let js = '';
let json = '';

// Dosya varlık kontrolü
requiredFiles.forEach(file => {
  const filePath = path.join(__dirname, file);
  try {
    if (fs.existsSync(filePath)) {
      const stats = fs.statSync(filePath);
      console.log(`✅ ${file} (${(stats.size / 1024).toFixed(2)} KB)`);
    } else {
      console.log(`❌ ${file} bulunamadı!`);
      allFilesExist = false;
    }
  } catch (error) {
    console.log(`❌ ${file} kontrol edilemedi: ${error.message}`);
    allFilesExist = false;
  }
});

if (!allFilesExist) {
  console.log('\n❌ Build başarısız! Gerekli dosyalar eksik.');
  process.exit(1);
}

console.log('\n📊 Dosya istatistikleri:');

// HTML kontrolü
try {
  html = fs.readFileSync('index.html', 'utf8');
  const htmlLines = html.split('\n').length;
  const htmlSize = (Buffer.byteLength(html, 'utf8') / 1024).toFixed(2);
  console.log(`   HTML: ${htmlLines} satır, ${htmlSize} KB`);
} catch (error) {
  console.log(`   ❌ HTML okunamadı: ${error.message}`);
  allFilesExist = false;
}

// CSS kontrolü
try {
  css = fs.readFileSync('styles.css', 'utf8');
  const cssLines = css.split('\n').length;
  const cssSize = (Buffer.byteLength(css, 'utf8') / 1024).toFixed(2);
  console.log(`   CSS: ${cssLines} satır, ${cssSize} KB`);
} catch (error) {
  console.log(`   ❌ CSS okunamadı: ${error.message}`);
  allFilesExist = false;
}

// JS kontrolü
try {
  js = fs.readFileSync('scripts.js', 'utf8');
  const jsLines = js.split('\n').length;
  const jsSize = (Buffer.byteLength(js, 'utf8') / 1024).toFixed(2);
  console.log(`   JavaScript: ${jsLines} satır, ${jsSize} KB`);
} catch (error) {
  console.log(`   ❌ JavaScript okunamadı: ${error.message}`);
  allFilesExist = false;
}

// JSON kontrolü
try {
  json = fs.readFileSync('data/apps.json', 'utf8');
  const apps = JSON.parse(json);
  console.log(`   Uygulamalar: ${apps.apps.length} adet`);
} catch (error) {
  console.log(`   ❌ JSON okunamadı veya geçersiz: ${error.message}`);
  allFilesExist = false;
}

// Basit validasyon
console.log('\n🔍 Validasyon:');

// HTML'de gerekli tagler var mı?
if (html && html.includes('<html') && html.includes('</html>')) {
  console.log('   ✅ HTML yapısı geçerli');
} else {
  console.log('   ❌ HTML yapısı geçersiz');
  allFilesExist = false;
}

// CSS'de temel stiller var mı?
if (css && css.includes('body') && css.includes('header')) {
  console.log('   ✅ CSS yapısı geçerli');
} else {
  console.log('   ⚠️  CSS yapısı eksik olabilir');
}

// JS'de temel fonksiyonlar var mı?
if (js && (js.includes('loadApps') || js.includes('function'))) {
  console.log('   ✅ JavaScript yapısı geçerli');
} else {
  console.log('   ⚠️  JavaScript yapısı eksik olabilir');
}

// JSON geçerli mi?
if (json) {
  try {
    JSON.parse(json);
    console.log('   ✅ JSON formatı geçerli');
  } catch (e) {
    console.log('   ❌ JSON formatı geçersiz:', e.message);
    allFilesExist = false;
  }
}

console.log('\n' + '='.repeat(50));

// Play Store görsellerini güncelle (GitHub Pages için önbellek)
console.log('\n📱 Play Store görselleri güncelleniyor...');
try {
  const { spawnSync } = require('child_process');
  const result = spawnSync(process.execPath, ['scripts/fetch-play-store.js'], {
    cwd: __dirname,
    stdio: 'inherit'
  });
  if (result.status !== 0) {
    console.log('   ⚠️  Play Store güncellemesi tamamlanamadı (mevcut önbellek kullanılacak).');
  }
} catch (error) {
  console.log(`   ⚠️  Play Store güncellemesi atlandı: ${error.message}`);
}

console.log('\n' + '='.repeat(50));

if (allFilesExist) {
  console.log('✅ Build başarılı! Site hazır.');
  console.log('\n📝 Sonraki adımlar:');
  console.log('   1. npm run serve - Local test için');
  console.log('   2. git add . - Değişiklikleri ekle');
  console.log('   3. git commit -m "mesaj" - Commit yap');
  console.log('   4. git push - GitHub\'a gönder');
  process.exit(0);
} else {
  console.log('❌ Build başarısız! Lütfen hataları düzeltin.');
  process.exit(1);
}

