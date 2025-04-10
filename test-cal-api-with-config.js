/**
 * Test script for testing the calApi module with proper config
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
const duration = 30; // 30 minutes

console.log('Config values:');
console.log('- CAL_API_KEY:', config.cal.apiKey ? '****' + config.cal.apiKey.slice(-4) : 'not set');
console.log('- CAL_EVENT_TYPE_ID:', config.cal.eventTypeId);
console.log('- CAL_USERNAME:', config.cal.username);
console.log('- CAL_USER_ID:', config.cal.userId);

console.log(`\nTesting calApi.getAvailability with date range: ${startDate} to ${endDate}`);

// Call the getAvailability function
calApi.getAvailability(startDate, endDate, duration)
  .then(availability => {
    console.log('Success! Availability data:');
    console.log(JSON.stringify(availability, null, 2));
    
    if (Array.isArray(availability)) {
      console.log(`\nFound ${availability.length} available time slots.`);
      availability.slice(0, 5).forEach((slot, index) => {
        console.log(`${index + 1}. ${new Date(slot.time).toLocaleString()}`);
      });
    }
  })
  .catch(error => {
    console.error('Error getting availability:');
    console.error(error.message);
    if (error.stack) {
      console.error(error.stack);
    }
  });
