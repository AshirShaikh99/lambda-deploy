/**
 * Test script for the createBooking function with Lambda URL format
 */
const { handler } = require('./index');

// Create a future date for testing (tomorrow at 10:00 AM)
const tomorrow = new Date();
tomorrow.setDate(tomorrow.getDate() + 1);
tomorrow.setHours(10, 0, 0, 0);

const tomorrowPlusHalfHour = new Date(tomorrow);
tomorrowPlusHalfHour.setMinutes(30);

// Format dates as ISO strings
const startTime = tomorrow.toISOString();
const endTime = tomorrowPlusHalfHour.toISOString();

// Mock Lambda URL event object
const event = {
  requestContext: {
    http: { 
      method: 'POST' 
    }
  },
  rawPath: '/',
  queryStringParameters: {
    action: 'createBooking'
  },
  body: JSON.stringify({
    name: "John Doe",
    email: "test@example.com",
    startTime: startTime,
    endTime: endTime,
    timeZone: "America/New_York",
    notes: "Test booking",
    eventTypeId: "2077162",
    apiKey: "cal_live_4c8aebebea394eca24bffb916e4e8e17"
  })
};

// Mock Lambda context object
const context = {
  awsRequestId: 'test-request-' + Date.now()
};

console.log('Testing createBooking function with Lambda URL format');
console.log('Start time:', startTime);
console.log('End time:', endTime);

// Call the Lambda handler
handler(event, context)
  .then(response => {
    console.log('Response status:', response.statusCode);
    const body = JSON.parse(response.body);
    
    if (response.statusCode === 200) {
      console.log('Success!', body.message);
      console.log('Booking ID:', body.booking.id);
      console.log('Booking URL:', body.booking.bookingUrl);
    } else {
      console.log('Error:', body.error);
      if (body.alternativeSlots) {
        console.log('Alternative slots available:');
        body.alternativeSlots.forEach((slot, i) => {
          console.log(`  ${i+1}. ${new Date(slot.time).toLocaleString()}`);
        });
      }
    }
  })
  .catch(error => {
    console.error('Error calling Lambda handler:', error);
  }); 