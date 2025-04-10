const fetch = require('node-fetch');

async function createDirectBooking() {
  const apiKey = 'cal_live_b6bf4a054d7db04df25239ccff211e97';
  const eventTypeId = 2077163;
  
  console.log('Creating direct booking with Cal.com API v1');
  
  // Use v1 API format which is more reliable
  const bookingURL = `https://api.cal.com/v1/bookings?apiKey=${apiKey}`;
  
  // Following the documentation format at https://cal.com/docs/api-reference/v1/bookings/creates-a-new-booking
  const bookingDetails = {
    eventTypeId: eventTypeId,
    start: '2025-04-21T05:00:00.000Z',
    end: '2025-04-21T05:15:00.000Z',
    responses: {
      name: 'Test Direct User',
      email: 'test@example.com',
      location: {
        value: 'integrations:daily',
        optionValue: ''
      }
    },
    timeZone: 'UTC',
    language: 'en',
    metadata: {
      source: 'direct-cal-api-test',
      created: new Date().toISOString()
    }
  };

  try {
    console.log('Sending booking request to Cal.com with format:');
    console.log(JSON.stringify(bookingDetails, null, 2));
    
    const response = await fetch(bookingURL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(bookingDetails)
    });

    const responseText = await response.text();
    console.log('Response status:', response.status);
    console.log('Response body:', responseText);
    
    if (response.ok) {
      console.log('Booking successful! A confirmation email should be sent to test@example.com');
    } else {
      console.error('Booking failed with status', response.status);
    }
  } catch (error) {
    console.error('Error creating booking:', error);
  }
}

createDirectBooking(); 