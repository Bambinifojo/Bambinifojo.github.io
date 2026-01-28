// Admin Şifre Test Scripti
// Bu script admin şifresinin doğru hash'lenip hash'lenmediğini kontrol eder

const crypto = require('crypto');

// Hash fonksiyonu (admin.js ile aynı)
async function hashPassword(password) {
  return new Promise((resolve) => {
    const hash = crypto.createHash('sha256');
    hash.update(password);
    resolve(hash.digest('hex'));
  });
}

// Test şifreleri
const testPasswords = {
  'Admin@2025Secure!': '20f46ed4821a3cae172ba46638433dd35356ec26bdb14980abd3bd84bab4deee',
  'admin123': '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9'
};

async function testAdminPassword() {
  console.log('🔐 Admin Şifre Test Scripti\n');
  console.log('='.repeat(60));
  
  for (const [password, expectedHash] of Object.entries(testPasswords)) {
    const actualHash = await hashPassword(password);
    const match = actualHash === expectedHash;
    
    console.log(`\n📝 Şifre: ${password}`);
    console.log(`   Beklenen Hash: ${expectedHash}`);
    console.log(`   Gerçek Hash:   ${actualHash}`);
    console.log(`   Durum: ${match ? '✅ Eşleşiyor' : '❌ Eşleşmiyor'}`);
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('\n📌 Varsayılan Admin Şifresi: Admin@2025Secure!');
  console.log('📌 Hash: 20f46ed4821a3cae172ba46638433dd35356ec26bdb14980abd3bd84bab4deee');
  console.log('\n💡 Test için:');
  console.log('   1. admin-login.html sayfasını açın');
  console.log('   2. Kullanıcı adı: admin');
  console.log('   3. Şifre: Admin@2025Secure!');
  console.log('   4. Giriş yapın');
}

testAdminPassword().catch(console.error);
