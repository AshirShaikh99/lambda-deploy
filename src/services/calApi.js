/**
 * Cal.com API Service
 * Uses native fetch instead of axios
 */

const config = require('../config');
const { ValidationError, NotFoundError, AuthError } = require('../utils/errorHandler');

// Base API client with error handling
const callCalApi = async (endpoint, options = {}) => {
  try {
    // Configure default headers
    const headers = {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    };

    // Add authorization header unless explicitly skipped
    if (options.headers && options.headers['Skip-Auth-Header']) {
      // Skip adding auth headers
      delete headers['Skip-Auth-Header']; // Remove this custom header
    } else if (endpoint.startsWith('/v1/')) {
      // v1 API uses apiKey header
      headers['apiKey'] = config.cal.apiKey;
    } else {
      // v2 API uses Bearer token
      headers['Authorization'] = `Bearer ${config.cal.apiKey}`;
      headers['Cal-Api-Version'] = config.cal.apiVersion;
    }

    // Create request
    const url = `${config.cal.apiUrl}${endpoint}`;
    const requestOptions = {
      method: options.method || 'GET',
      headers,
      ...(options.body ? { body: JSON.stringify(options.body) } : {})
    };

    // Make request
    const response = await fetch(url, requestOptions);

    // Check if response is JSON
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      const data = await response.json();

      // Handle error responses
      if (!response.ok) {
        if (response.status === 401) {
          throw new AuthError(`Authentication failed: ${data.message || 'Invalid API key'}`);
        } else if (response.status === 404) {
          throw new NotFoundError(`Resource not found: ${endpoint}`, 'Cal.com API');
        } else if (response.status === 400) {
          throw new ValidationError(`Invalid request: ${data.message}`, data.field || 'unknown');
        } else {
          throw new Error(`Cal.com API error (${response.status}): ${data.message || 'Unknown error'}`);
        }
      }

      return data;
    } else {
      // Not JSON, get text response for debugging
      const text = await response.text();
      console.error('Non-JSON response received:', text.substring(0, 200) + '...');
      throw new Error(`Cal.com API returned non-JSON response (${response.status}): ${response.statusText}`);
    }

    // Handle error responses
    if (!response.ok) {
      if (response.status === 401) {
        throw new AuthError(`Authentication failed: ${data.message || 'Invalid API key'}`);
      } else if (response.status === 404) {
        throw new NotFoundError(`Resource not found: ${endpoint}`, 'Cal.com API');
      } else if (response.status === 400) {
        throw new ValidationError(`Invalid request: ${data.message}`, data.field || 'unknown');
      } else {
        throw new Error(`Cal.com API error (${response.status}): ${data.message || 'Unknown error'}`);
      }
    }

    return data;
  } catch (error) {
    // Re-throw custom errors
    if (error instanceof ValidationError ||
        error instanceof NotFoundError ||
        error instanceof AuthError) {
      throw error;
    }

    // Handle network errors
    if (error.name === 'AbortError' || error.name === 'TypeError') {
      throw new Error(`Connection error with Cal.com API: ${error.message}`);
    }

    // Handle other errors
    throw new Error(`Error calling Cal.com API: ${error.message}`);
  }
};

// Get availability for a date range (v2 API - deprecated)
const getAvailability = async (eventTypeId, startDate, endDate, timeZone = 'UTC') => {
  // Ensure we have eventTypeId
  if (!eventTypeId) {
    throw new ValidationError('Event type ID is required', 'eventTypeId');
  }

  const username = config.cal.username || config.cal.userId;
  if (!username) {
    throw new ValidationError('Username is required', 'username');
  }

  const endpoint = `/v2/availability/${username}`;

  const params = {
    eventTypeId: eventTypeId,
    startTime: startDate,
    endTime: endDate,
    timeZone: timeZone
  };

  // Log the request for debugging
  console.log('Checking availability with params (v2 API):', params);

  const queryString = Object.entries(params)
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
    .join('&');

  return callCalApi(`${endpoint}?${queryString}`);
};

// Get availability using v1 API
const getAvailabilityV1 = async (id) => {
  if (!id) {
    throw new ValidationError('Availability ID is required', 'id');
  }

  const endpoint = `/v1/availabilities/${id}`;

  // Log the request for debugging
  console.log('Checking availability with v1 API, id:', id);

  // For v1 API, we need to ensure the apiKey is in the URL
  const queryParams = {
    apiKey: config.cal.apiKey
  };

  // Build query string
  const queryString = Object.entries(queryParams)
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
    .join('&');

  // Use GET method with API key in query string
  return callCalApi(`${endpoint}?${queryString}`, {
    headers: { 'Skip-Auth-Header': 'true' }
  });
};

// Get availability slots for a specific event type using v1 API
const getEventTypeAvailabilityV1 = async (params = {}) => {
  // Get username and event type ID
  const username = params.username || config.cal.username;
  const eventTypeId = params.eventTypeId || config.cal.eventTypeId;

  if (!username) {
    throw new ValidationError('Username is required', 'username');
  }

  if (!eventTypeId) {
    throw new ValidationError('Event type ID is required', 'eventTypeId');
  }

  // Construct the endpoint
  const endpoint = `/v1/availability/${username}/${eventTypeId}`;

  // Prepare query parameters
  const queryParams = {
    apiKey: params.apiKey || config.cal.apiKey
  };

  // Add date range parameters if provided
  if (params.startTime) {
    queryParams.startTime = params.startTime;
  }

  if (params.endTime) {
    queryParams.endTime = params.endTime;
  }

  // Log the request for debugging
  console.log('Getting event type availability with v1 API:', {
    username,
    eventTypeId,
    startTime: params.startTime,
    endTime: params.endTime,
    apiKey: queryParams.apiKey ? '****' + queryParams.apiKey.slice(-4) : 'not set'
  });

  // Build query string
  const queryString = Object.entries(queryParams)
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
    .join('&');

  const url = `${endpoint}?${queryString}`;

  // Use GET method with API key in query string
  return callCalApi(url, {
    headers: { 'Skip-Auth-Header': 'true' }
  });
};

// Get available slots using v1 slots API
const getSlots = async (params = {}) => {
  // Validate required parameters
  if (!params.startTime) {
    throw new ValidationError('Start time is required', 'startTime');
  }
  if (!params.endTime) {
    throw new ValidationError('End time is required', 'endTime');
  }
  
  // Get event type ID or use from config
  const eventTypeId = params.eventTypeId || config.cal.eventTypeId;
  if (!eventTypeId) {
    throw new ValidationError('Event type ID is required', 'eventTypeId');
  }
  
  // Ensure API key is set
  const apiKey = params.apiKey || config.cal.apiKey;
  if (!apiKey) {
    throw new ValidationError('API key is required', 'apiKey');
  }
  
  // Construct the endpoint for v1 slots API
  const endpoint = `/v1/slots`;

  // Prepare query parameters
  const queryParams = {
    apiKey: apiKey,
    eventTypeId: eventTypeId,
    startTime: params.startTime,
    endTime: params.endTime
  };

  // Log the request for debugging
  console.log('Getting available slots with v1 API:', {
    eventTypeId,
    startTime: params.startTime,
    endTime: params.endTime,
    apiKey: apiKey ? '****' + apiKey.slice(-4) : 'not set'
  });

  // Build query string
  const queryString = Object.entries(queryParams)
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
    .join('&');

  const url = `${endpoint}?${queryString}`;

  try {
    // Use GET method with API key in query string
    return await callCalApi(url, {
      headers: { 'Skip-Auth-Header': 'true' }
    });
  } catch (error) {
    console.error('Error getting slots:', error.message);
    throw error;
  }
};

/**
 * Create a new booking using Cal.com v1 API
 * @param {Object} params - Booking parameters
 * @param {string|number} params.eventTypeId - Event type ID
 * @param {string} params.start - Start time in ISO format
 * @param {Object} params.responses - Responses object with name, email, etc.
 * @param {string} params.timeZone - Time zone
 * @param {string} params.language - Language (default: en)
 * @param {string} params.apiKey - Cal.com API key (or use default from config)
 * @returns {Promise<Object>} - Response
 */
const createBooking = async (params = {}) => {
  // Validate required parameters
  if (!params.start) {
    throw new ValidationError('Start time is required', 'start');
  }
  if (!params.responses) {
    throw new ValidationError('Responses are required', 'responses');
  }
  if (!params.responses.name) {
    throw new ValidationError('Name is required', 'responses.name');
  }
  if (!params.responses.email) {
    throw new ValidationError('Email is required', 'responses.email');
  }
  if (!params.timeZone) {
    throw new ValidationError('Time zone is required', 'timeZone');
  }
  if (!params.eventTypeId) {
    throw new ValidationError('Event type ID is required', 'eventTypeId');
  }
  
  // Get API key from params or config
  const apiKey = params.apiKey || config.cal.apiKey;
  if (!apiKey) {
    throw new ValidationError('API key is required', 'apiKey');
  }
  
  // Ensure responses.location has the proper format
  if (!params.responses.location) {
    params.responses.location = {
      value: "integrations:daily",
      optionValue: ""
    };
  } else if (typeof params.responses.location === 'string') {
    params.responses.location = {
      value: params.responses.location,
      optionValue: ""
    };
  } else if (!params.responses.location.optionValue) {
    params.responses.location.optionValue = "";
  }

  // Use the username from configuration
  const username = params.username || config.cal.username || 'ashir-hassan-shaikh-gjcrzb';

  // Fixed duration for this event type (in minutes)
  const duration = 15;
  
  // Calculate end time based on start
  const startDate = new Date(params.start);
  const endDate = new Date(startDate.getTime() + duration * 60000);
  
  // Create a booking request object with proper format
  const bookingData = {
    eventTypeId: typeof params.eventTypeId === 'string' ? parseInt(params.eventTypeId, 10) : params.eventTypeId,
    username: username,
    start: params.start,
    end: params.end || endDate.toISOString(),
    responses: params.responses,
    timeZone: params.timeZone,
    language: params.language || 'en',
    status: params.status || 'ACCEPTED', 
    metadata: params.metadata || { source: 'lambda-cal-vapi-integration' }
  };

  // Log the request (careful not to expose sensitive data)
  console.log('Cal.com booking request:', {
    url: `${config.cal.apiUrl}/v1/bookings?apiKey=${apiKey.substr(0, 4)}****${apiKey.substr(-4)}`,
    method: 'POST',
    eventTypeId: bookingData.eventTypeId,
    start: bookingData.start,
    end: bookingData.end
  });

  try {
    // Make direct fetch request to handle authorization properly
    const url = `${config.cal.apiUrl}/v1/bookings?apiKey=${apiKey}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(bookingData)
    });

    // Parse the response
    let data;
    try {
      data = await response.json();
    } catch (error) {
      console.error('Error parsing JSON response:', error);
      throw new Error('Invalid response from Cal.com API');
    }

    // Check for error response
    if (!response.ok) {
      console.error('Cal.com API error:', {
        status: response.status,
        statusText: response.statusText,
        data,
        requestPayload: JSON.stringify(bookingData, null, 2)
      });
      
      if (response.status === 401) {
        throw new AuthError(`Authentication failed: ${data.message || 'Invalid API key'}`);
      } else if (response.status === 404) {
        throw new NotFoundError('Resource not found', 'Cal.com API');
      } else if (response.status === 400) {
        const errorMsg = data.message || (data.error?.message || 'Validation error');
        throw new ValidationError(`Invalid request: ${errorMsg}`, data.error?.field || 'unknown');
      } else {
        const error = new Error(`Cal.com API error (${response.status}): ${data.message || data.error?.message || 'Unknown error'}`);
        error.statusCode = response.status;
        error.details = data;
        throw error;
      }
    }

    return data;
  } catch (error) {
    console.error('Error creating booking with Cal.com API:', error);
    
    // If error is already a custom error, just rethrow it
    if (error instanceof ValidationError || 
        error instanceof NotFoundError ||
        error instanceof AuthError) {
      throw error;
    }
    
    // Otherwise wrap in ApiError
    const apiError = new Error(error.message || 'Error creating booking');
    apiError.statusCode = error.statusCode || 500;
    apiError.details = error.details || error;
    apiError.source = 'cal';
    throw apiError;
  }
};

// Reschedule a booking
const rescheduleBooking = async (bookingId, newStartTime, newEndTime) => {
  // Validate inputs
  if (!bookingId) {
    throw new ValidationError('Booking ID is required', 'bookingId');
  }
  if (!newStartTime) {
    throw new ValidationError('New start time is required', 'newStartTime');
  }
  if (!newEndTime) {
    throw new ValidationError('New end time is required', 'newEndTime');
  }

  const endpoint = `/v2/bookings/${bookingId}/reschedule`;

  // Calculate duration
  const startTime = new Date(newStartTime);
  const endTime = new Date(newEndTime);
  const durationInMinutes = Math.round((endTime - startTime) / (60 * 1000));

  const payload = {
    start: newStartTime,
    end: newEndTime,
    duration: durationInMinutes || config.app.defaultDuration
  };

  return callCalApi(endpoint, {
    method: 'PATCH',
    body: payload
  });
};

// Cancel a booking
const cancelBooking = async (bookingId, cancellationReason = 'Cancelled via VAPI integration') => {
  if (!bookingId) {
    throw new ValidationError('Booking ID is required', 'bookingId');
  }

  const endpoint = `/v2/bookings/${bookingId}`;

  const payload = {
    cancellationReason
  };

  return callCalApi(endpoint, {
    method: 'DELETE',
    body: payload
  });
};

// Get booking details
const getBookingDetails = async (bookingId) => {
  if (!bookingId) {
    throw new ValidationError('Booking ID is required', 'bookingId');
  }

  const endpoint = `/v2/bookings/${bookingId}`;

  return callCalApi(endpoint);
};

module.exports = {
  getAvailability,
  getAvailabilityV1,
  getEventTypeAvailabilityV1,
  getSlots,
  createBooking,
  rescheduleBooking,
  cancelBooking,
  getBookingDetails
};
