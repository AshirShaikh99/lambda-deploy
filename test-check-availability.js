/**
 * Test script for checking availability locally
 */
const http = require('http');

// Configuration
const LOCAL_SERVER_URL = 'http://localhost:3000';
const ACTION = 'checkAvailability';

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

// Read the event type ID from the .env file directly
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

const eventTypeId = envVars.CAL_EVENT_TYPE_ID;
const username = envVars.CAL_USERNAME;

// Prepare request data
const requestData = {
  startDate,
  endDate,
  duration: 30, // 30 minutes duration
  timeZone: 'UTC',
  eventTypeId: eventTypeId,
  username: username
};

console.log(`Testing checkAvailability with date range: ${startDate} to ${endDate}`);

// Prepare the request options
const options = {
  hostname: 'localhost',
  port: 3000,
  path: `/?action=${ACTION}`,
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

      if (parsedData.success) {
        console.log('\nAvailable time slots:');
        if (parsedData.availability && Array.isArray(parsedData.availability)) {
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
