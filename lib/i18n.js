// Internationalization module
const supportedLanguages = ['en', 'fr', 'nl'];

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
