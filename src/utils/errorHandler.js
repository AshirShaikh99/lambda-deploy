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

// Handle errors and return appropriate response
const handleError = (error, log) => {
  // Log the error
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

  // Determine status code
  const statusCode = error.statusCode || 500;
  
  // Prepare response
  const response = {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    },
    body: JSON.stringify({
      success: false,
      error: error.message || 'An unknown error occurred',
      type: error.name || 'Error'
    })
  };
  
  // Add field for validation errors
  if (error.field) {
    response.body = JSON.stringify({
      ...JSON.parse(response.body),
      field: error.field
    });
  }
  
  // Add resource for not found errors
  if (error.resource) {
    response.body = JSON.stringify({
      ...JSON.parse(response.body),
      resource: error.resource
    });
  }
  
  return response;
};

module.exports = {
  ValidationError,
  NotFoundError,
  AuthError,
  handleError
};
