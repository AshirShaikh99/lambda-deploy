const fetch = require('node-fetch');

async function testLambdaBooking() {
  console.log('Testing Lambda booking function with correct request format');
  
  // Using the format from Cal.com API docs
  const requestBody = {
    action: "createBooking",
    apiKey: "cal_live_b6bf4a054d7db04df25239ccff211e97",
    eventTypeId: 2077163,
    start: "2025-04-21T04:00:00.000Z",
    end: "2025-04-21T04:15:00.000Z",
    responses: {
      name: "Test Lambda User",
      email: "test@example.com",
      location: {
        value: "integrations:daily",
        optionValue: ""
      }
    },
    timeZone: "UTC",
    language: "en",
    metadata: {
      source: "lambda-cal-test",
      notes: "Production test booking via Lambda"
    }
  };

  try {
    // Important: Using ?action=createBooking - this is what works
    console.log('Sending request with payload:');
    console.log(JSON.stringify(requestBody, null, 2));
    
    const response = await fetch('http://localhost:3000/?action=createBooking', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    const responseText = await response.text();
    console.log('Response status:', response.status);
    console.log('Response body:', responseText);
    
    if (response.ok) {
      console.log('Booking success! Check your email for confirmation.');
    } else {
      console.error('Booking failed with status', response.status);
    }
  } catch (error) {
    console.error('Error making request:', error);
  }
}

testLambdaBooking(); 