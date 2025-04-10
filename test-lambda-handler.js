/**
 * Test script for directly testing the lambda handler function
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

// Now require the handler
const { handler } = require('./src/index');

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

// Create a mock event
const event = {
  queryStringParameters: { action: 'checkAvailability' },
  body: JSON.stringify({
    startDate,
    endDate,
    duration: 30,
    timeZone: 'UTC'
  })
};

// Create a mock context
const context = {
  awsRequestId: Date.now().toString()
};

console.log(`Testing lambda handler with date range: ${startDate} to ${endDate}`);

// Call the handler function
handler(event, context)
  .then(result => {
    console.log(`STATUS: ${result.statusCode}`);
    
    try {
      const parsedBody = JSON.parse(result.body);
      console.log('Response:');
      console.log(JSON.stringify(parsedBody, null, 2));
      
      if (parsedBody.success && parsedBody.availability) {
        console.log('\nAvailable time slots:');
        if (Array.isArray(parsedBody.availability)) {
          parsedBody.availability.forEach((slot, index) => {
            console.log(`${index + 1}. ${new Date(slot.time).toLocaleString()}`);
          });
        } else {
          console.log('No availability data returned or format is unexpected');
        }
      }
    } catch (e) {
      console.error('Error parsing response:', e);
      console.log('Raw response:', result.body);
    }
  })
  .catch(error => {
    console.error('Error calling handler:');
    console.error(error);
  });
