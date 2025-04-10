/**
 * VAPI.ai service
 * Uses native fetch instead of axios for making API calls
 */

const config = require('../config');
const { ValidationError, NotFoundError, AuthError } = require('../utils/errorHandler');

// Base API client with error handling
const callVapiApi = async (endpoint, options = {}) => {
  try {
    // Configure default headers
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.vapi.apiKey}`,
      ...(options.headers || {})
    };

    // Create request
    const url = `${config.vapi.apiUrl}${endpoint}`;
    const requestOptions = {
      method: options.method || 'GET',
      headers,
      ...(options.body ? { body: JSON.stringify(options.body) } : {})
    };

    // Make request
    const response = await fetch(url, requestOptions);
    const data = await response.json();

    // Handle error responses
    if (!response.ok) {
      if (response.status === 401) {
        throw new AuthError(`Authentication failed: ${data.message || 'Invalid API key'}`);
      } else if (response.status === 404) {
        throw new NotFoundError(`Resource not found: ${endpoint}`, 'VAPI API');
      } else if (response.status === 400) {
        throw new ValidationError(`Invalid request: ${data.message}`, data.error?.field || 'unknown');
      } else {
        throw new Error(`VAPI API error (${response.status}): ${data.message || 'Unknown error'}`);
      }
    }

    return data;
  } catch (error) {
    // Re-throw custom errors
    if (error instanceof ValidationError || 
        error instanceof NotFoundError || 
        error instanceof AuthError) {
      throw error;
    }
    
    // Handle network errors
    if (error.name === 'AbortError' || error.name === 'TypeError') {
      throw new Error(`Connection error with VAPI API: ${error.message}`);
    }
    
    // Handle other errors
    throw new Error(`Error calling VAPI API: ${error.message}`);
  }
};

// Create outbound call
const createCall = async (assistantId, callConfig) => {
  if (!assistantId) {
    throw new ValidationError('Assistant ID is required', 'assistantId');
  }
  if (!callConfig || !callConfig.phoneNumber) {
    throw new ValidationError('Phone number is required', 'phoneNumber');
  }
  
  const endpoint = `/call`;
  
  const payload = {
    assistantId: assistantId,
    phoneNumberId: config.vapi.phoneNumberId,
    customer: {
      number: callConfig.phoneNumber
    },
    metadata: callConfig.metadata || {}
  };
  
  return callVapiApi(endpoint, {
    method: 'POST',
    body: payload
  });
};

// Create an outbound call via SIP
const createSipCall = async (assistantId, callConfig) => {
  if (!assistantId) {
    throw new ValidationError('Assistant ID is required', 'assistantId');
  }
  if (!callConfig || !callConfig.phoneNumber) {
    throw new ValidationError('Phone number is required', 'phoneNumber');
  }
  
  const endpoint = `/call/sip`;
  
  const payload = {
    assistantId: assistantId,
    phoneNumberId: config.vapi.phoneNumberId,
    customer: {
      number: callConfig.phoneNumber
    },
    metadata: callConfig.metadata || {}
  };
  
  return callVapiApi(endpoint, {
    method: 'POST',
    body: payload
  });
};

// Create or update an assistant
const createAssistant = async (assistantConfig) => {
  if (!assistantConfig || !assistantConfig.name) {
    throw new ValidationError('Assistant name is required', 'name');
  }
  
  const endpoint = `/assistant`;
  
  return callVapiApi(endpoint, {
    method: 'POST',
    body: assistantConfig
  });
};

// Get assistant details
const getAssistant = async (assistantId) => {
  if (!assistantId) {
    throw new ValidationError('Assistant ID is required', 'assistantId');
  }
  
  const endpoint = `/assistant/${assistantId}`;
  
  return callVapiApi(endpoint);
};

// Update existing assistant
const updateAssistant = async (assistantId, updatedConfig) => {
  if (!assistantId) {
    throw new ValidationError('Assistant ID is required', 'assistantId');
  }
  
  const endpoint = `/assistant/${assistantId}`;
  
  return callVapiApi(endpoint, {
    method: 'PATCH',
    body: updatedConfig
  });
};

// Create a default assistant configuration
const createDefaultAssistantConfig = () => {
  return {
    name: 'Cal.com Scheduling Assistant',
    model: 'gpt-4',
    voice: 'shimmer',
    first_message: 'Hello, I\'m your scheduling assistant. I can help you book, reschedule, or cancel appointments. How can I assist you today?',
    webhookUrl: config.vapi.webhookUrl || null,
    tools: [
      {
        name: 'check_availability',
        description: 'Check availability for booking appointments',
        input_schema: {
          type: 'object',
          properties: {
            date: {
              type: 'string',
              description: 'The date to check availability for, in YYYY-MM-DD format'
            },
            timeZone: {
              type: 'string',
              description: 'User\'s timezone, e.g. America/New_York'
            }
          },
          required: ['date']
        }
      },
      {
        name: 'book_appointment',
        description: 'Book an appointment',
        input_schema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Customer\'s full name'
            },
            email: {
              type: 'string',
              description: 'Customer\'s email address'
            },
            phone: {
              type: 'string',
              description: 'Customer\'s phone number'
            },
            date: {
              type: 'string',
              description: 'The date for the appointment, in YYYY-MM-DD format'
            },
            time: {
              type: 'string',
              description: 'The time for the appointment, in HH:MM format'
            },
            timeZone: {
              type: 'string',
              description: 'User\'s timezone, e.g. America/New_York'
            }
          },
          required: ['name', 'email', 'date', 'time']
        }
      }
    ]
  };
};

// Get call details
const getCall = async (callId) => {
  if (!callId) {
    throw new ValidationError('Call ID is required', 'callId');
  }
  
  const endpoint = `/call/${callId}`;
  
  return callVapiApi(endpoint);
};

// Hang up a call
const hangupCall = async (callId) => {
  if (!callId) {
    throw new ValidationError('Call ID is required', 'callId');
  }
  
  const endpoint = `/call/${callId}/hangup`;
  
  return callVapiApi(endpoint, {
    method: 'POST'
  });
};

module.exports = {
  createCall,
  createSipCall,
  createAssistant,
  getAssistant,
  updateAssistant,
  createDefaultAssistantConfig,
  getCall,
  hangupCall
};
