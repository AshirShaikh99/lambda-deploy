/**
 * Test script for Cal.com v1 API getEventTypeAvailabilityV1 with new credentials
 */
const fs = require('fs');
const path = require('path');

// Set the provided credentials for testing
process.env.CAL_API_KEY = 'cal_live_4c8aebebea394eca24bffb916e4e8e17';
process.env.CAL_EVENT_TYPE_ID = '2077162';

// Set the correct username
process.env.CAL_USERNAME = 'ashir-hassan-shaikh-gjcrzb';

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

console.log(`\nTesting calApi.getEventTypeAvailabilityV1 with date range: ${startDate} to ${endDate}`);

// Prepare parameters
const params = {
  startTime: startDate,
  endTime: endDate,
  // Try without username as we may not know it with the new API key
  eventTypeId: config.cal.eventTypeId,
  apiKey: config.cal.apiKey
};

// Call the getEventTypeAvailabilityV1 function
calApi.getEventTypeAvailabilityV1(params)
  .then(availability => {
    console.log('Success! Availability data:');
    console.log(JSON.stringify(availability, null, 2));
    
    if (availability && availability.busy) {
      console.log(`\nBusy times: ${availability.busy.length}`);
    }
    
    if (availability && availability.timeSlots) {
      console.log(`\nAvailable time slots: ${availability.timeSlots.length}`);
      availability.timeSlots.slice(0, 5).forEach((slot, index) => {
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