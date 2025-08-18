class ErrorHandler {
  static handleError(error, context = '') {
    const errorInfo = {
      message: error.message,
      stack: error.stack,
      context,
      timestamp: new Date().toISOString(),
      type: error.constructor.name
    };
    
    // Log l'erreur
    console.error('Erreur détectée:', errorInfo);
    
    // Retourner une réponse d'erreur standardisée
    return {
      success: false,
      error: {
        message: error.message,
        code: error.code || 'UNKNOWN_ERROR',
        timestamp: errorInfo.timestamp
      }
    };
  }
  
  static createCustomError(message, code, context) {
    const error = new Error(message);
    error.code = code;
    error.context = context;
    return error;
  }
}

module.exports = ErrorHandler;