// Internationalization module
const supportedLanguages = ['en', 'fr', 'nl'];

/**
 * Enhanced function/class
 */
function translateDeviceLabels(labels, defaultLang = 'en') {
  const translations = {};
  
  supportedLanguages.forEach(lang => {
    translations[lang] = labels[lang] || labels[defaultLang];
  });
  
  return translations;
}

module.exports = {
  translateDeviceLabels
};
