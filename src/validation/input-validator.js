class InputValidator {
  static validateString(value, minLength = 1, maxLength = 1000) {
    if (typeof value !== 'string') {
      throw new Error('La valeur doit être une chaîne de caractères');
    }
    if (value.length < minLength || value.length > maxLength) {
      throw new Error(`La longueur doit être entre ${minLength} et ${maxLength} caractères`);
    }
    return true;
  }
  
  static validateNumber(value, min = -Infinity, max = Infinity) {
    if (typeof value !== 'number' || isNaN(value)) {
      throw new Error('La valeur doit être un nombre');
    }
    if (value < min || value > max) {
      throw new Error(`La valeur doit être entre ${min} et ${max}`);
    }
    return true;
  }
  
  static validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new Error('Format d'email invalide');
    }
    return true;
  }
}

module.exports = InputValidator;