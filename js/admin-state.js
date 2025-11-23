// Admin Panel Global State Management
// Tüm modüller arasında paylaşılan state

const AdminState = {
  // Constants
  CONSTANTS: {
    SESSION_TIMEOUT: 8 * 60 * 60 * 1000, // 8 saat
    MOBILE_BREAKPOINT: 768,
    MODAL_ANIMATION_DURATION: 300,
    ALERT_DISPLAY_DURATION: 3000,
    MIN_PASSWORD_LENGTH: 6,
    MAX_ACTIVITIES: 20,
    RECENT_ACTIVITIES_LIMIT: 5
  },
  
  // State variables
  currentMode: 'local', // 'local' veya 'github'
  token: '',
  appsData: { apps: [], site: null },
  currentFeatures: [],
  currentSiteSection: 'header',
  usersData: [],
  lastSessionCheck: 0,
  
  // GitHub SHA values
  githubAppsSha: null,
  githubSiteSha: null,
  
  // Admin password hash (varsayılan: "admin123")
  ADMIN_PASSWORD_HASH: '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9',
  
  // Password icons
  PASSWORD_ICONS: {
    visible: '<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line>',
    hidden: '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle>'
  },
  
  // Initialize state
  init() {
    // Load from localStorage if available
    const saved = localStorage.getItem('appsData');
    if (saved) {
      try {
        this.appsData = JSON.parse(saved);
      } catch (error) {
        console.error('State initialization error:', error);
        this.appsData = { apps: [], site: null };
      }
    }
    
    // Load users
    const savedUsers = localStorage.getItem('adminUsers');
    if (savedUsers) {
      try {
        this.usersData = JSON.parse(savedUsers);
      } catch (error) {
        console.error('Users initialization error:', error);
        this.usersData = [];
      }
    }
  },
  
  // Reset state
  reset() {
    this.currentMode = 'local';
    this.token = '';
    this.appsData = { apps: [], site: null };
    this.currentFeatures = [];
    this.currentSiteSection = 'header';
    this.lastSessionCheck = 0;
    this.githubAppsSha = null;
    this.githubSiteSha = null;
  }
};

// Initialize on load
if (typeof window !== 'undefined') {
  AdminState.init();
  // Global scope'a ekle (browser için)
  window.AdminState = AdminState;
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = AdminState;
}

