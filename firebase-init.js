/**
 * Public site Firebase bootstrap.
 * - Uses localStorage config when admin panel saved Firebase mode.
 * - Silently skips when no config (JSON/localStorage data sources are used).
 */
(function initPublicFirebase() {
  if (typeof firebase === 'undefined') {
    return;
  }

  let config = null;

  try {
    const mode = localStorage.getItem('currentMode');
    const saved = localStorage.getItem('firebaseConfig');
    if (mode === 'firebase' && saved) {
      config = JSON.parse(saved);
    }
  } catch (error) {
    console.warn('Firebase config okunamadı:', error.message);
    return;
  }

  if (!config || !config.apiKey || !config.databaseURL) {
    return;
  }

  try {
    if (!firebase.apps.length) {
      firebase.initializeApp(config);
    }
    window.firebaseDatabase = firebase.database();
  } catch (error) {
    console.warn('Firebase başlatılamadı:', error.message);
  }
})();
