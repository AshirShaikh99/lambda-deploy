/**
 * Test script for testing the checkAvailability function via the local server
 */
const http = require('http');

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

// Prepare request data
const requestData = {
  startDate,
  endDate,
  duration: 30
};

console.log(`Testing checkAvailability via local server with date range: ${startDate} to ${endDate}`);

// Prepare the request options
const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/?action=checkAvailability',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  }
};

// Make the request
const req = http.request(options, (res) => {
  console.log(`STATUS: ${res.statusCode}`);
  console.log(`HEADERS: ${JSON.stringify(res.headers)}`);
  
  let data = '';
  
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    try {
      const parsedData = JSON.parse(data);
      console.log('Response:');
      console.log(JSON.stringify(parsedData, null, 2));
      
      if (parsedData.success && parsedData.availability) {
        console.log('\nAvailable time slots:');
        if (Array.isArray(parsedData.availability)) {
          parsedData.availability.forEach((slot, index) => {
            console.log(`${index + 1}. ${new Date(slot.time).toLocaleString()}`);
          });
        } else {
          console.log('No availability data returned or format is unexpected');
        }
      }
    } catch (e) {
      console.error('Error parsing response:', e);
      console.log('Raw response:', data);
    }
  });
});

req.on('error', (e) => {
  console.error(`Problem with request: ${e.message}`);
});

// Write data to request body
req.write(JSON.stringify(requestData));
req.end();
