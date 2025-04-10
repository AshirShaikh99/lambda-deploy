/**
 * Test script for the Lambda function with the getAvailableSlots action
 */
const { handler } = require('./src/index');

// Get today's date and two weeks from now
const today = new Date();
const inTwoWeeks = new Date(today);
inTwoWeeks.setDate(today.getDate() + 14);

// Format dates as ISO strings
const startTime = today.toISOString();
const endTime = inTwoWeeks.toISOString();

// Mock Lambda event object
const event = {
  queryStringParameters: {
    action: 'getAvailableSlots'
  },
  body: JSON.stringify({
    startTime: startTime,
    endTime: endTime,
    eventTypeId: '2077162',
    apiKey: 'cal_live_4c8aebebea394eca24bffb916e4e8e17'
  })
};

// Mock Lambda context object
const context = {
  awsRequestId: 'test-request-' + Date.now()
};

console.log('Testing Lambda function with getAvailableSlots action');
console.log('Event:', JSON.stringify(event, null, 2));

// Call the Lambda handler
handler(event, context)
  .then(response => {
    console.log('Lambda response status:', response.statusCode);
    const body = JSON.parse(response.body);
    console.log('Response body summary:');
    
    if (body.success && body.slots && body.slots.slots) {
      const dates = Object.keys(body.slots.slots);
      console.log(`Found available slots for ${dates.length} dates:`);
      dates.slice(0, 5).forEach(date => {
        const slots = body.slots.slots[date];
        console.log(`- ${date}: ${slots.length} slots available`);
      });
      
      if (dates.length > 5) {
        console.log(`... and ${dates.length - 5} more dates`);
      }
    } else {
      console.log(JSON.stringify(body, null, 2));
    }
    
    if (body.success) {
      console.log('Successfully retrieved slots!');
    } else {
      console.error('Error in response:', body.error);
    }
  })
  .catch(error => {
    console.error('Error invoking Lambda handler:', error);
  }); 