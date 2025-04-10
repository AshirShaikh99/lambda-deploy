/**
 * Test script for testing the Cal.com v1 API
 */
const fs = require('fs');
const path = require('path');

// Parse the .env file
const envContent = fs.readFileSync(path.join(__dirname, '.env'), 'utf8');
const envVars = {};

envContent.split('\n').forEach(line => {
  // Skip comments and empty lines
  if (!line || line.startsWith('#')) return;
  
  // Split by the first equals sign
  const parts = line.split('=');
  if (parts.length >= 2) {
    const key = parts[0].trim();
    const value = parts.slice(1).join('=').trim();
    envVars[key] = value;
  }
});

// Set environment variables from .env
Object.entries(envVars).forEach(([key, value]) => {
  process.env[key] = value;
});

// Now require the modules
const config = require('./src/config');
const calApi = require('./src/services/calApi');

// Get today's date and a week from now
const today = new Date();
const nextWeek = new Date(today);
nextWeek.setDate(today.getDate() + 7);

// Format dates as YYYY-MM-DD
const formatDate = (date) => {
  return date.toISOString().split('T')[0];
};

const startDate = formatDate(today);
const endDate = formatDate(nextWeek);

console.log('Config values:');
console.log('- CAL_API_KEY:', config.cal.apiKey ? '****' + config.cal.apiKey.slice(-4) : 'not set');
console.log('- CAL_EVENT_TYPE_ID:', config.cal.eventTypeId);
console.log('- CAL_USERNAME:', config.cal.username);
console.log('- CAL_USER_ID:', config.cal.userId);

console.log(`\nTesting calApi.getAllAvailabilitiesV1 with date range: ${startDate} to ${endDate}`);

// Prepare query parameters
const queryParams = {
  startTime: startDate,
  endTime: endDate
};

// Add eventTypeId if available
if (config.cal.eventTypeId) {
  queryParams.eventTypeId = config.cal.eventTypeId;
}

// Call the getAllAvailabilitiesV1 function
calApi.getAllAvailabilitiesV1(queryParams)
  .then(availabilities => {
    console.log('Success! Availabilities data:');
    console.log(JSON.stringify(availabilities, null, 2));
    
    if (Array.isArray(availabilities.data)) {
      console.log(`\nFound ${availabilities.data.length} availabilities.`);
      availabilities.data.slice(0, 5).forEach((availability, index) => {
        console.log(`${index + 1}. ID: ${availability.id}, Start: ${availability.startTime}, End: ${availability.endTime}`);
      });
    }
  })
  .catch(error => {
    console.error('Error getting availabilities:');
    console.error(error.message);
    if (error.stack) {
      console.error(error.stack);
    }
  });
