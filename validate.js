const fs = require('fs');
const path = require('path');

console.log('🔍 Site validasyonu başlatılıyor...\n');

let errors = [];
let warnings = [];

// HTML validasyonu
try {
  const html = fs.readFileSync('index.html', 'utf8');
  
  // Temel HTML yapısı
  if (!html.includes('<!DOCTYPE html>')) {
    errors.push('HTML: DOCTYPE eksik');
  }
  
  if (!html.includes('<html')) {
    errors.push('HTML: <html> tagi eksik');
  }
  
  if (!html.includes('</html>')) {
    errors.push('HTML: </html> tagi eksik');
  }
  
  // Meta tagler
  if (!html.includes('viewport')) {
    warnings.push('HTML: viewport meta tag eksik (mobil uyumluluk)');
  }
  
  if (!html.includes('charset')) {
    warnings.push('HTML: charset meta tag eksik');
  }
  
  // CSS ve JS linkleri
  if (!html.includes('styles.css')) {
    errors.push('HTML: styles.css linki eksik');
  }
  
  if (!html.includes('scripts.js')) {
    errors.push('HTML: scripts.js linki eksik');
  }
  
  console.log('✅ HTML dosyası okundu');
} catch (e) {
  errors.push(`HTML: Dosya okunamadı - ${e.message}`);
}

// CSS validasyonu
try {
  const css = fs.readFileSync('styles.css', 'utf8');
  
  if (css.length < 100) {
    warnings.push('CSS: Dosya çok küçük, stil eksik olabilir');
  }
  
  console.log('✅ CSS dosyası okundu');
} catch (e) {
  errors.push(`CSS: Dosya okunamadı - ${e.message}`);
}

// JavaScript validasyonu
try {
  const js = fs.readFileSync('scripts.js', 'utf8');
  
  if (js.length < 100) {
    warnings.push('JavaScript: Dosya çok küçük, kod eksik olabilir');
  }
  
  console.log('✅ JavaScript dosyası okundu');
} catch (e) {
  errors.push(`JavaScript: Dosya okunamadı - ${e.message}`);
}

// JSON validasyonu
try {
  const json = fs.readFileSync('data/apps.json', 'utf8');
  const apps = JSON.parse(json);
  
  if (!apps.apps || !Array.isArray(apps.apps)) {
    errors.push('JSON: apps array eksik');
  } else if (apps.apps.length === 0) {
    warnings.push('JSON: Hiç uygulama yok');
  } else {
    console.log(`✅ JSON dosyası okundu (${apps.apps.length} uygulama)`);
  }
} catch (e) {
  errors.push(`JSON: Dosya okunamadı veya geçersiz - ${e.message}`);
}

// Sonuçlar
console.log('\n' + '='.repeat(50));
console.log('📊 Validasyon Sonuçları:\n');

if (errors.length === 0 && warnings.length === 0) {
  console.log('✅ Tüm kontroller başarılı! Site hazır.');
} else {
  if (errors.length > 0) {
    console.log('❌ Hatalar:');
    errors.forEach(err => console.log(`   - ${err}`));
  }
  
  if (warnings.length > 0) {
    console.log('\n⚠️  Uyarılar:');
    warnings.forEach(warn => console.log(`   - ${warn}`));
  }
  
  if (errors.length > 0) {
    console.log('\n❌ Validasyon başarısız! Lütfen hataları düzeltin.');
    process.exit(1);
  } else {
    console.log('\n⚠️  Validasyon tamamlandı, ancak uyarılar var.');
  }
}

