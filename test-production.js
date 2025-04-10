const fetch = require('node-fetch');

/**
 * Tests the booking API for production readiness
 */
async function testProductionBooking() {
  console.log('PRODUCTION TEST: Creating booking with correct Cal.com v1 API format');
  
  // Using the documented format from Cal.com v1 API
  // https://cal.com/docs/api-reference/v1/bookings/creates-a-new-booking
  const requestBody = {
    eventTypeId: 2077163,
    start: "2025-04-21T09:00:00.000Z",
    end: "2025-04-21T09:15:00.000Z",
    responses: {
      name: "Production Test User",
      email: "test@example.com",
      location: {
        value: "integrations:daily",
        optionValue: ""
      }
    },
    timeZone: "UTC",
    language: "en",
    metadata: {
      source: "production-test-script",
      created: new Date().toISOString()
    }
  };

  try {
    console.log('Sending production-ready booking request with format:');
    console.log(JSON.stringify(requestBody, null, 2));
    
    // Using query parameter action for proper routing
    const response = await fetch('http://localhost:3000/?action=createBooking', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    const responseText = await response.text();
    console.log('\nResponse status:', response.status);
    console.log('Response body:', responseText);
    
    if (response.ok) {
      console.log('\n✅ BOOKING SUCCESS! Check your email for confirmation.');
      console.log('API is ready for production deployment.');
    } else {
      console.error('\n❌ Booking failed with status', response.status);
      console.error('API needs additional fixes before production deployment.');
    }
  } catch (error) {
    console.error('Error making request:', error);
  }
}

/**
 * Tests the availability slots API for production readiness
 */
async function testProductionAvailability() {
  console.log('\nPRODUCTION TEST: Getting available slots');
  
  try {
    const response = await fetch('http://localhost:3000/?action=getAvailableSlots', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        startTime: "2025-04-20T00:00:00.000Z",
        endTime: "2025-04-27T00:00:00.000Z",
        eventTypeId: 2077163,
        apiKey: "cal_live_b6bf4a054d7db04df25239ccff211e97"
      })
    });

    const responseText = await response.text();
    let responseData;
    
    try {
      responseData = JSON.parse(responseText);
    } catch (e) {
      responseData = { error: 'Could not parse JSON response' };
    }

    console.log('\nResponse status:', response.status);
    console.log('Availability slots found:', 
      responseData.success && responseData.slots ? 
      Object.keys(responseData.slots.slots).length : 0);
    
    if (response.ok && responseData.success) {
      console.log('\n✅ AVAILABILITY CHECK SUCCESS!');
      console.log('API is ready for production deployment.');
    } else {
      console.error('\n❌ Availability check failed with status', response.status);
      console.error('API needs additional fixes before production deployment.');
    }
  } catch (error) {
    console.error('Error making request:', error);
  }
}

async function runProductionTests() {
  // First test availability
  await testProductionAvailability();
  
  // Then test booking creation
  await testProductionBooking();
}

// Run the tests
runProductionTests(); 