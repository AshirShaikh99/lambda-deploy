/**
 * Configuration module
 * Uses environment variables with defaults
 */

// Helper to get env variable with default
const getEnv = (key, defaultValue = '') => {
  return process.env[key] || defaultValue;
};

// Config object
const config = {
  // Cal.com configuration
  cal: {
    apiKey: getEnv('CAL_API_KEY'),
    apiUrl: process.env.CAL_API_URL || 'https://api.cal.com',
    eventTypeId: process.env.CAL_EVENT_TYPE_ID || '2077162',
    username: process.env.CAL_USERNAME || 'ashir-hassan-shaikh-gjcrzb',
    userId: getEnv('CAL_USER_ID', ''),
    apiVersion: '2023-12-25',
  },
  
  // VAPI configuration
  vapi: {
    apiKey: getEnv('VAPI_API_KEY'),
    apiUrl: getEnv('VAPI_API_URL', 'https://api.vapi.ai'),
    assistantId: getEnv('VAPI_ASSISTANT_ID', ''),
    phoneNumberId: getEnv('VAPI_PHONE_NUMBER_ID', ''),
    webhookUrl: getEnv('VAPI_WEBHOOK_URL', ''),
    toolWebhookUrl: getEnv('VAPI_TOOL_WEBHOOK_URL', ''),
  },
  
  // Outbound calling configuration
  outbound: {
    phoneNumbers: getEnv('OUTBOUND_PHONE_NUMBERS', '').split(',').filter(Boolean),
  },
  
  // Message templates
  messages: {
    confirmation: getEnv('CONFIRMATION_MESSAGE', ''),
    reminder: getEnv('REMINDER_MESSAGE', ''),
  },
  
  // Server configuration  
  server: {
    url: getEnv('SERVER_URL', ''),
    port: parseInt(getEnv('PORT', '3000'), 10),
    env: getEnv('NODE_ENV', 'development'),
  },
  
  // Application settings
  app: {
    timeZone: getEnv('TIME_ZONE', 'UTC'),
    defaultDuration: parseInt(getEnv('DEFAULT_DURATION', '30'), 10),
    maxRetries: parseInt(getEnv('MAX_RETRIES', '3'), 10),
    retryDelay: parseInt(getEnv('RETRY_DELAY', '1000'), 10),
  },
  
  // Logging configuration
  logging: {
    level: getEnv('LOG_LEVEL', 'info'),
  },

  // AWS Lambda configuration
  lambda: {
    region: process.env.AWS_REGION || 'us-east-1',
    functionName: process.env.AWS_FUNCTION_NAME || 'cal-vapi-integration',
  },

  // Function to validate critical config settings
  validate() {
    const missingVars = [];
    
    // Check critical Cal.com variables
    if (!this.cal.apiKey) missingVars.push('CAL_API_KEY');
    if (!this.cal.eventTypeId) missingVars.push('CAL_EVENT_TYPE_ID');
    if (!this.cal.username && !this.cal.userId) missingVars.push('CAL_USERNAME or CAL_USER_ID');
    
    // Check critical VAPI variables
    if (!this.vapi.apiKey) missingVars.push('VAPI_API_KEY');
    if (!this.vapi.phoneNumberId) missingVars.push('VAPI_PHONE_NUMBER_ID');
    
    if (missingVars.length > 0) {
      console.error(`Missing required environment variables: ${missingVars.join(', ')}`);
      return false;
    }
    
    return true;
  }
};

module.exports = config;
