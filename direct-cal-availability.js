/**
 * Direct Cal.com API access script
 * This script calls the Cal.com API directly using fetch
 */

// API credentials
const apiKey = 'cal_live_4c8aebebea394eca24bffb916e4e8e17';
const eventTypeId = '2077162';
const username = 'ashir-hassan-shaikh-gjcrzb';

// API URL
const apiUrl = 'https://api.cal.com';

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

async function findAvailableSlots() {
  try {
    // Construct the URL with the correct parameters
    // For the slots API: /v1/availability/{username}/{eventTypeId}
    const url = `${apiUrl}/v1/availability/${username}/${eventTypeId}?apiKey=${apiKey}&startTime=${startDate}&endTime=${endDate}`;
    
    console.log(`Calling Cal.com API: ${url.replace(apiKey, '****' + apiKey.slice(-4))}`);
    
    // Make the request
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log(`Response status: ${response.status} ${response.statusText}`);
    
    // Check if the response is JSON
    const contentType = response.headers.get('content-type');
    
    if (contentType && contentType.includes('application/json')) {
      const data = await response.json();
      console.log('Response data:');
      console.log(JSON.stringify(data, null, 2));
      
      if (data.timeSlots && data.timeSlots.length > 0) {
        console.log('\nAvailable time slots:');
        data.timeSlots.slice(0, 5).forEach((slot, index) => {
          console.log(`${index + 1}. ${new Date(slot.time).toLocaleString()}`);
        });
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
    console.log('Successfully found availability!');
  }
}); 