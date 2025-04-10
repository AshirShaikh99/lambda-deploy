/**
 * Test script for Cal.com v1 API "Find an availability" endpoint
 * GET /v1/availabilities/{id}
 */
const fs = require('fs');
const path = require('path');

// Set the provided credentials for testing
process.env.CAL_API_KEY = 'cal_live_4c8aebebea394eca24bffb916e4e8e17';

// Now require the modules
const config = require('./src/config');
const calApi = require('./src/services/calApi');

// The availability ID to look up
const availabilityId = 2077162;

console.log('Config values:');
console.log('- CAL_API_KEY:', config.cal.apiKey ? '****' + config.cal.apiKey.slice(-4) : 'not set');
console.log(`\nTesting calApi.getAvailabilityV1 with ID: ${availabilityId}`);

// Call the getAvailabilityV1 function
calApi.getAvailabilityV1(availabilityId)
  .then(availability => {
    console.log('Success! Availability data:');
    console.log(JSON.stringify(availability, null, 2));
  })
  .catch(error => {
    console.error('Error getting availability:');
    console.error(error.message);
    if (error.stack) {
      console.error(error.stack);
    }
  }); 