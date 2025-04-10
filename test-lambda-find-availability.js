/**
 * Test script for the Lambda function with the findAvailability action
 */
const { handler } = require('./src/index');

// Mock Lambda event object
const event = {
  queryStringParameters: {
    action: 'findAvailability'
  },
  body: JSON.stringify({
    id: 2077162,
    apiKey: 'cal_live_4c8aebebea394eca24bffb916e4e8e17'
  })
};

// Mock Lambda context object
const context = {
  awsRequestId: 'test-request-' + Date.now()
};

console.log('Testing Lambda function with findAvailability action');
console.log('Event:', JSON.stringify(event, null, 2));

// Call the Lambda handler
handler(event, context)
  .then(response => {
    console.log('Lambda response status:', response.statusCode);
    const body = JSON.parse(response.body);
    console.log('Response body:', JSON.stringify(body, null, 2));
    
    if (body.success) {
      console.log('Successfully found availability!');
    } else {
      console.error('Error in response:', body.error);
    }
  })
  .catch(error => {
    console.error('Error invoking Lambda handler:', error);
  }); 