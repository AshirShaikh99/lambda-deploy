require('dotenv').config();
const fetch = require('node-fetch');

// Use the Cal.com API key from environment
const API_KEY = process.env.CAL_API_KEY;
const EVENT_TYPE_ID = process.env.CAL_EVENT_TYPE_ID;

// Ensure we have the API key
if (!API_KEY) {
  console.error('Missing CAL_API_KEY in .env file');
  process.exit(1);
}

if (!EVENT_TYPE_ID) {
  console.error('Missing CAL_EVENT_TYPE_ID in .env file');
  process.exit(1);
}

// Set start time to tomorrow at 13:00 UTC
const tomorrow = new Date();
tomorrow.setDate(tomorrow.getDate() + 1);
tomorrow.setHours(13, 0, 0, 0);
const startTime = tomorrow.toISOString();

// Set end time to 30 minutes later
const endTime = new Date(tomorrow.getTime() + 30 * 60000).toISOString();

console.log(`Testing booking API with times: ${startTime} to ${endTime}`);

// Create the exact payload from the curl example
const bookingData = {
  eventTypeId: parseInt(EVENT_TYPE_ID),
  start: startTime,
  end: endTime,
  responses: {
    name: "Test User",
    email: "test@example.com",
    smsReminderNumber: null,
    location: {
      value: "userPhone",
      optionValue: ""
    }
  },
  timeZone: "Europe/London",
  language: "en",
  title: "Test Booking",
  description: null,
  status: "PENDING",
  metadata: {}
};

// Make the direct API call
async function testDirectApi() {
  console.log('Testing direct API call to Cal.com...');
  
  try {
    const response = await fetch(`https://api.cal.com/v1/bookings?apiKey=${API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(bookingData)
    });

    console.log(`Response status: ${response.status} ${response.statusText}`);
    
    const responseText = await response.text();
    console.log('Response text:', responseText);
    
    try {
      const data = JSON.parse(responseText);
      console.log('Booking created successfully!', {
        bookingId: data.bookingId || data.id,
        status: data.status
      });
    } catch (e) {
      console.log('Could not parse response as JSON');
    }
  } catch (error) {
    console.error('Error making direct API call:', error);
  }
}

// Test using our Lambda endpoint
async function testLambdaEndpoint() {
  console.log('\nTesting Lambda endpoint...');
  
  try {
    const lambdaResponse = await fetch('http://localhost:3000/createBooking', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(bookingData)
    });

    console.log(`Lambda response status: ${lambdaResponse.status} ${lambdaResponse.statusText}`);
    
    const responseText = await lambdaResponse.text();
    console.log('Lambda response text:', responseText);
  } catch (error) {
    console.error('Error calling Lambda endpoint:', error);
  }
}

// Run the tests
async function runTests() {
  await testDirectApi();
  await testLambdaEndpoint();
}

runTests(); 