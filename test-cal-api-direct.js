/**
 * Test script for directly testing the calApi module
 */
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

console.log(`Testing calApi.getAvailability directly with date range: ${startDate} to ${endDate}`);

// Call the getAvailability function directly
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
