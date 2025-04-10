const fetch = require('node-fetch');

async function testWebhookBooking() {
  console.log('Testing booking through URL path /createBooking (webhook handler)');
  
  // The Lambda code is incorrectly routing /createBooking to webhook handler
  // Let's create a payload that would work with webhook handling
  const requestBody = {
    type: "tool", // This makes it look like a tool webhook
    tool: {
      name: "booking",
      parameters: {
        name: "Test Webhook User",
        email: "test@example.com",
        startTime: "2025-04-21T06:00:00.000Z",
        endTime: "2025-04-21T06:15:00.000Z",
        timeZone: "UTC",
        apiKey: "cal_live_b6bf4a054d7db04df25239ccff211e97",
        eventTypeId: 2077163
      }
    }
  };

  try {
    console.log('Sending webhook format request with payload:');
    console.log(JSON.stringify(requestBody, null, 2));
    
    const response = await fetch('http://localhost:3000/createBooking', {
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

testWebhookBooking(); 