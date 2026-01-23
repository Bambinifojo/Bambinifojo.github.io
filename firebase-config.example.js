// Firebase Configuration Example
// Bu dosyayı firebase-config.js olarak kaydedin ve Firebase Console'dan aldığınız bilgileri girin

const firebaseConfig = {
  apiKey: "AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
  authDomain: "your-project.firebaseapp.com",
  databaseURL: "https://your-project-default-rtdb.firebaseio.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abcdef1234567890"
};

// Admin panelinde kullanım için
if (typeof module !== 'undefined' && module.exports) {
  module.exports = firebaseConfig;
}
