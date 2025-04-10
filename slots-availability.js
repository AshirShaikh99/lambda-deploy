/**
 * Cal.com V1 Slots API Access
 * GET /v1/slots
 * https://cal.com/docs/api-reference/v1/slots
 */

// API credentials
const apiKey = 'cal_live_4c8aebebea394eca24bffb916e4e8e17';
const eventTypeId = '2077162';
const username = 'ashir-hassan-shaikh-gjcrzb';

// API URL
const apiUrl = 'https://api.cal.com';

// Get date range for this week and next week
const today = new Date();
const inTwoWeeks = new Date(today);
inTwoWeeks.setDate(today.getDate() + 14);

// Format dates as ISO strings
const startTime = today.toISOString();
const endTime = inTwoWeeks.toISOString();

async function findAvailableSlots() {
  try {
    // Construct the URL with the correct parameters for the slots API
    // https://cal.com/docs/api-reference/v1/slots
    const url = `${apiUrl}/v1/slots?apiKey=${apiKey}&eventTypeId=${eventTypeId}&startTime=${startTime}&endTime=${endTime}`;
    
    console.log(`Calling Cal.com API Slots endpoint:`);
    console.log(`  - StartTime: ${startTime}`);
    console.log(`  - EndTime: ${endTime}`);
    console.log(`  - EventTypeId: ${eventTypeId}`);
    console.log(`  - API Key: ****${apiKey.slice(-4)}`);
    
    // Make the request
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log(`\nResponse status: ${response.status} ${response.statusText}`);
    
    // Check if the response is JSON
    const contentType = response.headers.get('content-type');
    
    if (contentType && contentType.includes('application/json')) {
      const data = await response.json();
      console.log('Response data:');
      console.log(JSON.stringify(data, null, 2));
      
      if (data.slots && Object.keys(data.slots).length > 0) {
        console.log('\nAvailable slots by date:');
        let count = 0;
        
        for (const [date, slots] of Object.entries(data.slots)) {
          if (slots.length > 0) {
            console.log(`\n${date}:`);
            slots.slice(0, 3).forEach((slot, index) => {
              console.log(`  ${index + 1}. ${new Date(slot.time).toLocaleTimeString()}`);
              count++;
              if (count >= 10) return; // Show max 10 slots total
            });
          }
        }
      }
      
      return data;
    } else {
      // Handle non-JSON response
      const text = await response.text();
      console.error('Non-JSON response:', text.substring(0, 500) + '...');
      return { error: 'Non-JSON response', status: response.status };
    }
  } catch (error) {
    console.error('Error calling Cal.com API:', error.message);
    return { error: error.message };
  }
}

// Execute the function
findAvailableSlots().then(result => {
  if (result.error) {
    console.error('Error finding availability:', result.error);
  } else {
    console.log('\nSuccessfully retrieved availability slots!');
  }
}); 