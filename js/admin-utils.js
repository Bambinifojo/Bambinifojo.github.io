// Admin Panel Utility Functions
// Veri doğrulama ve yardımcı fonksiyonlar

/**
 * Uygulama verisini doğrula
 * @param {Object} app - Uygulama objesi
 * @returns {Object} { valid: boolean, errors: string[] }
 */
function validateApp(app) {
  const errors = [];
  
  if (!app.title || app.title.trim().length === 0) {
    errors.push('Uygulama adı gereklidir');
  }
  
  if (!app.description || app.description.trim().length === 0) {
    errors.push('Açıklama gereklidir');
  }
  
  if (app.rating !== undefined) {
    const rating = parseFloat(app.rating);
    if (isNaN(rating) || rating < 0 || rating > 5) {
      errors.push('Rating 0-5 arasında olmalıdır');
    }
  }
  
  if (app.details && app.details !== '#' && !isValidUrl(app.details)) {
    errors.push('Geçersiz detay URL formatı');
  }
  
  if (app.privacy && app.privacy !== '#' && !isValidUrl(app.privacy)) {
    errors.push('Geçersiz gizlilik politikası URL formatı');
  }
  
  return {
    valid: errors.length === 0,
    errors: errors
  };
}

/**
 * URL formatını doğrula
 * @param {string} url - URL string
 * @returns {boolean}
 */
function isValidUrl(url) {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Site verisini doğrula
 * @param {Object} siteData - Site verisi
 * @returns {Object} { valid: boolean, errors: string[] }
 */
function validateSiteData(siteData) {
  const errors = [];
  
  if (!siteData) {
    errors.push('Site verisi boş olamaz');
    return { valid: false, errors };
  }
  
  if (siteData.header) {
    if (!siteData.header.logo || siteData.header.logo.trim().length === 0) {
      errors.push('Header logo gereklidir');
    }
  }
  
  if (siteData.hero) {
    if (!siteData.hero.title || siteData.hero.title.trim().length === 0) {
      errors.push('Hero başlık gereklidir');
    }
    
    if (siteData.hero.playStoreUrl && !isValidUrl(siteData.hero.playStoreUrl)) {
      errors.push('Geçersiz Play Store URL formatı');
    }
  }
  
  if (siteData.skills && siteData.skills.items) {
    siteData.skills.items.forEach((skill, index) => {
      if (!skill.name || skill.name.trim().length === 0) {
        errors.push(`Skill ${index + 1}: İsim gereklidir`);
      }
      if (skill.level !== undefined) {
        const level = parseInt(skill.level);
        if (isNaN(level) || level < 0 || level > 100) {
          errors.push(`Skill ${index + 1}: Level 0-100 arasında olmalıdır`);
        }
      }
    });
  }
  
  return {
    valid: errors.length === 0,
    errors: errors
  };
}

/**
 * JSON verisini güvenli şekilde parse et
 * @param {string} jsonString - JSON string
 * @param {*} defaultValue - Hata durumunda döndürülecek varsayılan değer
 * @returns {*}
 */
function safeJsonParse(jsonString, defaultValue = null) {
  try {
    return JSON.parse(jsonString);
  } catch (error) {
    console.error('JSON parse hatası:', error);
    return defaultValue;
  }
}

/**
 * Veriyi güvenli şekilde stringify et
 * @param {*} data - Stringify edilecek veri
 * @param {number} indent - İndent seviyesi
 * @returns {string}
 */
function safeJsonStringify(data, indent = 2) {
  try {
    return JSON.stringify(data, null, indent);
  } catch (error) {
    console.error('JSON stringify hatası:', error);
    return '{}';
  }
}

/**
 * Hata mesajını kullanıcı dostu formata çevir
 * @param {Error|string} error - Hata objesi veya mesajı
 * @returns {string}
 */
function formatErrorMessage(error) {
  if (typeof error === 'string') {
    return error;
  }
  
  if (error instanceof Error) {
    return error.message;
  }
  
  return 'Bilinmeyen bir hata oluştu';
}

/**
 * Debounce fonksiyonu
 * @param {Function} func - Çalıştırılacak fonksiyon
 * @param {number} wait - Bekleme süresi (ms)
 * @returns {Function}
 */
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Throttle fonksiyonu
 * @param {Function} func - Çalıştırılacak fonksiyon
 * @param {number} limit - Limit süresi (ms)
 * @returns {Function}
 */
function throttle(func, limit) {
  let inThrottle;
  return function(...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

// Export functions for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    validateApp,
    validateSiteData,
    isValidUrl,
    safeJsonParse,
    safeJsonStringify,
    formatErrorMessage,
    debounce,
    throttle
  };
}


