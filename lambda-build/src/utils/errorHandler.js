/**
 * Error handling utilities
 */

// Custom error classes
class ValidationError extends Error {
  constructor(message, field) {
    super(message);
    this.name = 'ValidationError';
    this.field = field;
    this.statusCode = 400;
  }
}

class NotFoundError extends Error {
  constructor(message, resource) {
    super(message);
    this.name = 'NotFoundError';
    this.resource = resource;
    this.statusCode = 404;
  }
}

class AuthError extends Error {
  constructor(message) {
    super(message);
    this.name = 'AuthError';
    this.statusCode = 401;
  }
}

/**
 * Handle errors consistently
 * @param {Error} error - Error object
 * @param {Object} log - Logger
 * @returns {Object} - Response with error details
 */
const handleError = (error, log) => {
  if (log) {
    log.error('Error occurred', { 
      error: error.message, 
      stack: error.stack, 
      name: error.name, 
      statusCode: error.statusCode 
    });
  } else {
    console.error('Error occurred:', error);
  }
  
  // Set appropriate status code
  const statusCode = error.statusCode || 500;
  
  // Prepare error response
  const errorResponse = {
    success: false,
    error: error.message || 'An unknown error occurred'
  };
  
  // Add additional error details if available
  if (error.name) {
    errorResponse.type = error.name;
  }
  
  if (error.field) {
    errorResponse.field = error.field;
  }
  
  if (error.resource) {
    errorResponse.resource = error.resource;
  }
  
  // Return standard format response
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    },
    body: JSON.stringify(errorResponse)
  };
};

module.exports = {
  ValidationError,
  NotFoundError,
  AuthError,
  handleError
};
