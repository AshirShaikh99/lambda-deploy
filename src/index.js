const { addRequestContext } = require('./utils/logger');
const { handleError, ValidationError } = require('./utils/errorHandler');
const calApi = require('./services/calApi');
const vapiService = require('./services/vapiService');
const config = require('./config');

// Create default logger
const logger = addRequestContext('default');

// Define valid actions that can be used in the API
const VALID_ACTIONS = [
  'createBooking', 
  'getAvailableSlots', 
  'rescheduleBooking', 
  'cancelBooking', 
  'getBookingDetails', 
  'checkAvailability',
  'findAvailability',
  'handleVapiWebhook',
  'initializeAssistant',
  'trialStarted'
];

/**
 * Main Lambda handler function
 * @param {Object} event - AWS Lambda event
 * @param {Object} context - AWS Lambda context
 * @returns {Promise<Object>} - Lambda response
 */
exports.handler = async (event, context) => {
  // Create request-specific logger
  const requestId = context ? context.awsRequestId : Date.now().toString();
  const log = addRequestContext(requestId);

  try {
    log.info('Lambda function invoked', { event });

    // Handle OPTIONS requests for CORS
    if (event.httpMethod === 'OPTIONS') {
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type'
        },
        body: JSON.stringify({ success: true })
      };
    }

    // Parse request body - handle different formats
    let body = {};
    if (event.body) {
      try {
        body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
      } catch (error) {
        log.warn('Could not parse request body as JSON', { body: event.body, error: error.message });
      }
    }

    // Handle direct Lambda URL invocations where action might be in the path
    const pathParts = event.path ? event.path.split('/').filter(Boolean) : [];
    const lastPathPart = pathParts.length > 0 ? pathParts[pathParts.length - 1] : '';

    // Extract query parameters
    const queryParams = event.queryStringParameters || {};
    
    // IMPORTANT FIX: Determine the action from multiple possible sources with proper priority
    // Priority: 1. Query param, 2. Path part, 3. Body field, 4. Default
    let action;
    
    // Direct path check first (more specific)
    if (lastPathPart === 'createBooking' || event.path === '/createBooking') {
      action = 'createBooking';
    } 
    // Then query param
    else if (queryParams.action) {
      action = queryParams.action;
    } 
    // URL path has third priority
    else if (lastPathPart) {
      const knownActions = ['createBooking', 'getAvailableSlots', 'rescheduleBooking', 
                         'cancelBooking', 'getBookingDetails', 'checkAvailability'];
                         
      if (knownActions.includes(lastPathPart)) {
        action = lastPathPart;
      } else {
        action = 'handleVapiWebhook'; // Only use webhook as fallback for unknown paths
      }
    } 
    // Body field has last priority
    else if (body.action) {
      action = body.action;
    } 
    // Default fallback
    else {
      action = 'handleVapiWebhook';
    }
    
    // Copy all properties from request body to params for consistent handling
    const params = { ...body };
    
    // Add action to params if not already present
    if (!params.action) {
      params.action = action;
    }

    // Copy query parameters into params too (lower priority than body)
    Object.keys(queryParams).forEach(key => {
      if (!params[key]) {
        params[key] = queryParams[key];
      }
    });

    // Log the action and params
    log.info(`Processing action: ${action}`, { params: JSON.stringify(params) });

    // Route to the appropriate handler based on the action
    let result;
    switch (action) {
      case 'initializeAssistant':
        result = await initializeAssistant(params, log);
        break;
      case 'trialStarted':
        result = await handleTrialStarted(params, log);
        break;
      case 'handleVapiWebhook':
        result = await handleVapiWebhook(params, log);
        break;
      case 'checkAvailability':
        result = await checkAvailability(params, log);
        break;
      case 'findAvailability':
        result = await findAvailability(params, log);
        break;
      case 'getAvailableSlots':
        result = await getAvailableSlots(params, log);
        break;
      case 'createBooking':
        result = await createBooking(params, log);
        break;
      case 'rescheduleBooking':
        result = await rescheduleBooking(params, log);
        break;
      case 'cancelBooking':
        result = await cancelBooking(params, log);
        break;
      case 'getBookingDetails':
        result = await getBookingDetails(params, log);
        break;
      default:
        throw new ValidationError('Invalid action specified', 'action');
    }

    // Ensure CORS headers are always present
    if (!result.headers) {
      result.headers = {};
    }
    
    result.headers['Access-Control-Allow-Origin'] = '*';
    result.headers['Access-Control-Allow-Methods'] = 'GET, POST, OPTIONS';
    result.headers['Access-Control-Allow-Headers'] = 'Content-Type';
    
    return result;
  } catch (error) {
    return handleError(error, log);
  }
};

/**
 * Initialize a VAPI assistant for web integration
 * @param {Object} params - Parameters
 * @param {Object} log - Logger
 * @returns {Promise<Object>} - Response
 */
const initializeAssistant = async (params, log) => {
  log.info('Initializing VAPI assistant for web integration', { params });

  // Create or use existing assistant
  let assistantId = config.vapi.assistantId;

  if (!assistantId) {
    log.info('Creating new VAPI assistant');
    const assistantConfig = vapiService.createDefaultAssistantConfig();
    const assistant = await vapiService.createAssistant(assistantConfig);
    assistantId = assistant.id;
    log.info('Created new VAPI assistant', { assistantId });
  }

  // Return the assistant ID for web integration
  return {
    statusCode: 200,
    body: JSON.stringify({
      success: true,
      assistantId: assistantId,
      apiKey: config.vapi.apiKey,
      message: 'VAPI assistant ready for web integration',
      instructions: 'Use this assistantId and apiKey with the VAPI Web SDK to integrate voice interface on your website.',
    }),
  };
};

/**
 * Handle trial started event - initiate a VAPI call to the user
 * @param {Object} body - Request body containing user information
 * @param {Object} log - Logger
 * @returns {Promise<Object>} - Response
 */
const handleTrialStarted = async (body, log) => {
  console.log('Handling trial started event:', body);

  // Extract required parameters
  const { name, email, phoneNumber } = body;

  // Validate required parameters
  if (!name || !email || !phoneNumber) {
    console.error('Missing required parameters for trial started event');
    return { statusCode: 400, body: JSON.stringify({ success: false, error: 'Missing required parameters' }) };
  }

  try {
    // Get the assistant ID from config
    const assistantId = config.vapi.assistantId;

    if (!assistantId) {
      throw new Error('No VAPI assistant ID configured');
    }

    console.log(`Using VAPI assistant: ${assistantId} to call ${phoneNumber}`);

    const callConfig = {
      phoneNumber, // The destination number to call
      metadata: {
        userId: email,
        userName: name,
        userEmail: email,
        userPhone: phoneNumber,
      },
    };

    let call;
    let error;

    // Try the SIP call first (this is the preferred method)
    try {
      console.log('Attempting SIP outbound call...');
      call = await vapiService.createSipCall(assistantId, callConfig);
      console.log('SIP outbound call successful:', call);
    } catch (sipError) {
      console.error('SIP outbound call failed:', sipError);
      error = sipError;

      // Try the regular call as fallback
      try {
        console.log('Falling back to regular outbound call...');
        call = await vapiService.createCall(assistantId, callConfig);
        console.log('Regular outbound call successful:', call);
      } catch (regularError) {
        console.error('Regular outbound call failed:', regularError);
        error = regularError;
      }
    }

    if (!call) {
      throw error || new Error('Failed to initiate call through any method');
    }

    console.log('Successfully created VAPI call:', call);
    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        callId: call.id,
        message: 'Call initiated successfully'
      })
    };
  } catch (error) {
    console.error('Error handling trial started event:', error);
    return {
      statusCode: error.statusCode || 500,
      body: JSON.stringify({
        success: false,
        error: error.message || 'Error initiating call'
      })
    };
  }
};

/**
 * Handle VAPI webhook events
 * @param {Object} body - Webhook payload
 * @param {Object} log - Logger
 * @returns {Promise<Object>} - Response
 */
const handleVapiWebhook = async (body, log) => {
  log.info('Received VAPI webhook', { type: body.type });

  try {
    // Handle different webhook types
    if (body.type === 'function' || body.type === 'function-call') {
      // Extract function name and parameters
      const functionName = body.function || body.functionCall?.name;

      // Extract parameters from different possible formats
      let parameters;
      if (body.parameters) {
        parameters = body.parameters;
      } else if (body.functionCall?.parameters) {
        parameters = body.functionCall.parameters;
      } else if (body.functionCall?.arguments) {
        try {
          parameters = JSON.parse(body.functionCall.arguments);
        } catch (e) {
          log.error('Error parsing function arguments', { error: e, arguments: body.functionCall.arguments });
          parameters = {};
        }
      }

      // Extract call ID from various possible locations in the body
      const callId = body.callId || body.call?.id || (body.message?.call?.id);

      log.info('Handling function call', { functionName, parameters, callId });

      return await handleFunctionCall({ function: functionName, parameters, callId }, log);
    } else if (body.type === 'tool') {
      // Handle tool calls from Vapi
      log.info('Received tool call', { body });

      // Extract the tool name and parameters
      const toolName = body.tool?.name;
      let parameters = body.tool?.parameters || {};

      // Handle booking tool
      if (toolName === 'booking') {
        log.info('Handling booking tool call', { parameters });
        return await createBooking(parameters, log);
      }

      // Unknown tool
      log.warn('Unknown tool called', { toolName });
      return {
        statusCode: 400,
        body: JSON.stringify({
          success: false,
          error: `Unknown tool: ${toolName}`
        })
      };
    } else if (body.type === 'transcript') {
      // Handle transcript
      return {
        statusCode: 200,
        body: JSON.stringify({ success: true }),
      };
    } else if (body.type === 'call_ended' || body.type === 'status-update') {
      // Handle call ended or status update
      return {
        statusCode: 200,
        body: JSON.stringify({ success: true }),
      };
    } else {
      // Unknown webhook type
      log.info('Unhandled webhook type', { type: body.type });
      return {
        statusCode: 200,
        body: JSON.stringify({ success: true }),
      };
    }
  } catch (error) {
    log.error('Error handling webhook', { error });
    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: error.message
      })
    };
  }
};

/**
 * Handle function calls from VAPI
 * @param {Object} body - Function call payload
 * @param {Object} log - Logger
 * @returns {Promise<Object>} - Response
 */
const handleFunctionCall = async (body, log) => {
  // Extract function name and parameters from the body
  const functionName = body.function || body.functionCall?.name;

  // Extract parameters, handling both direct parameters and nested ones
  let parameters;
  if (body.parameters) {
    parameters = body.parameters;
  } else if (body.functionCall?.parameters) {
    parameters = body.functionCall.parameters;
  } else if (body.functionCall?.arguments) {
    // Handle case where parameters are in arguments as a JSON string
    try {
      parameters = JSON.parse(body.functionCall.arguments);
    } catch (e) {
      log.error('Error parsing function arguments', { error: e, arguments: body.functionCall.arguments });
      parameters = {};
    }
  }

  // Extract call ID from various possible locations in the body
  const callId = body.callId || body.call?.id || (body.message?.call?.id);

  log.info('Handling function call', { functionName, parameters, callId, bodyKeys: Object.keys(body) });

  let result;

  try {
    switch (functionName) {
      case 'checkAvailability':
        result = await checkAvailability(parameters, log);
        break;
      case 'createBooking':
        result = await createBooking(parameters, log);
        break;
      case 'rescheduleBooking':
        result = await rescheduleBooking(parameters, log);
        break;
      case 'cancelBooking':
        result = await cancelBooking(parameters, log);
        break;
      case 'getBookingDetails':
        result = await getBookingDetails(parameters, log);
        break;
      default:
        throw new ValidationError(`Unknown function: ${functionName}`, 'function');
    }

    // Parse the result body
    const parsedResult = result.body ? JSON.parse(result.body) : {};

    // Prepare the response to send directly back to VAPI according to the documentation
    // https://docs.vapi.ai/api-reference/webhooks/server-message
    let functionResponse;

    // For createBooking with unavailable time slots, include the alternative slots
    if (functionName === 'createBooking' && result.statusCode === 409 && parsedResult.alternativeSlots) {
      log.info('Sending alternative time slots to VAPI', { alternativeSlots: parsedResult.alternativeSlots });

      functionResponse = {
        success: false,
        error: parsedResult.error,
        alternativeSlots: parsedResult.alternativeSlots,
        message: parsedResult.message
      };
    } else {
      // Normal successful response
      functionResponse = parsedResult;
    }

    // Format the response according to VAPI webhook documentation
    const responseBody = {
      response: {
        type: 'function_response',
        function_response: {
          name: functionName,
          response: functionResponse
        }
      }
    };

    log.info('Sending response directly back to VAPI webhook', { responseBody });

    return {
      statusCode: 200,
      body: JSON.stringify(responseBody),
    };
  } catch (error) {
    log.error('Error handling function call', { error });

    // Prepare error response to send directly back to VAPI according to the documentation
    // https://docs.vapi.ai/api-reference/webhooks/server-message
    const responseBody = {
      response: {
        type: 'function_response',
        function_response: {
          name: functionName,
          error: error.message
        }
      }
    };

    log.info('Sending error response directly back to VAPI webhook', { responseBody });

    return {
      statusCode: 200, // Always return 200 to VAPI even for errors
      body: JSON.stringify(responseBody),
    };
  }
};

/**
 * Check availability for a given date range
 * @param {Object} params - Parameters
 * @param {Object} log - Logger
 * @returns {Promise<Object>} - Response
 */
const checkAvailability = async (params, log) => {
  log.info('Checking availability', { params });

  try {
    // Validate required parameters
    if (!params.startDate) {
      throw new ValidationError('Start date is required', 'startDate');
    }
    if (!params.endDate) {
      throw new ValidationError('End date is required', 'endDate');
    }

    // Log detailed parameters for debugging
    console.log('Availability check with params:', JSON.stringify({
      startDate: params.startDate,
      endDate: params.endDate,
      duration: params.duration || config.app.defaultDuration,
      timeZone: params.timeZone || config.app.timeZone
    }));

    // Get availability using v1 API
    const apiParams = {
      startTime: params.startDate,
      endTime: params.endDate,
      username: params.username || config.cal.username,
      eventTypeId: params.eventTypeId || config.cal.eventTypeId,
      apiKey: params.apiKey || config.cal.apiKey
    };

    // Use the new v1 API function
    const availabilityData = await calApi.getEventTypeAvailabilityV1(apiParams);

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        availability: availabilityData,
      }),
    };
  } catch (error) {
    return handleError(error, log);
  }
};

/**
 * Find an availability by ID (Cal.com v1 API)
 * GET /v1/availabilities/{id}
 * @param {Object} params - Parameters including availability ID
 * @param {Object} log - Logger
 * @returns {Promise<Object>} - Response with availability details
 */
const findAvailability = async (params, log) => {
  log.info('Finding availability by ID', { params });

  try {
    // Validate required parameter
    if (!params.id) {
      throw new ValidationError('Availability ID is required', 'id');
    }

    const availabilityId = parseInt(params.id, 10);
    if (isNaN(availabilityId)) {
      throw new ValidationError('Invalid availability ID', 'id');
    }

    // Override API key if provided in the params
    if (params.apiKey) {
      log.info('Using custom API key for this request');
      config.cal.apiKey = params.apiKey;
    }

    // Get availability by ID
    const availability = await calApi.getAvailabilityV1(availabilityId);

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        availability: availability,
      }),
    };
  } catch (error) {
    return handleError(error, log);
  }
};

/**
 * Get available slots within a date range (Cal.com v1 API)
 * GET /v1/slots
 * @param {Object} params - Parameters including date range
 * @param {Object} log - Logger
 * @returns {Promise<Object>} - Response with available slots
 */
const getAvailableSlots = async (params, log) => {
  log.info('Getting available slots', { params: JSON.stringify(params) });

  try {
    // Validate and normalize parameters to handle multiple possible formats
    let startTime = params.startTime || params.startDate || params.start;
    let endTime = params.endTime || params.endDate || params.end;
    
    // Handle when startTime is not provided
    if (!startTime) {
      // If no start time, use today
      const today = new Date();
      startTime = today.toISOString();
      log.info('Using default start time (today)', { startTime });
    }
    
    // Handle when endTime is not provided
    if (!endTime) {
      // If no end time, use two weeks from start time
      const start = new Date(startTime);
      const end = new Date(start);
      end.setDate(start.getDate() + 14);
      endTime = end.toISOString();
      log.info('Using default end time (start + 14 days)', { endTime });
    }

    // Get API key from parameters or environment
    const apiKey = params.apiKey || params.api_key || config.cal.apiKey;
    if (apiKey && apiKey !== config.cal.apiKey) {
      log.info('Using custom API key for this request');
      config.cal.apiKey = apiKey;
    }

    // Get event type ID from parameters or environment
    const eventTypeId = params.eventTypeId || params.event_type_id || config.cal.eventTypeId;
    if (!eventTypeId) {
      throw new ValidationError('Event type ID is required', 'eventTypeId');
    }
    
    // Prepare parameters for the slots API
    const apiParams = {
      startTime: startTime,
      endTime: endTime,
      eventTypeId: eventTypeId,
      apiKey: config.cal.apiKey
    };

    log.info('Calling Cal.com API with params', { 
      startTime, 
      endTime, 
      eventTypeId,
      apiKey: apiKey ? '****' + apiKey.slice(-4) : 'not set' 
    });

    // Get available slots
    const slots = await calApi.getSlots(apiParams);

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      },
      body: JSON.stringify({
        success: true,
        slots: slots,
      })
    };
  } catch (error) {
    log.error('Error getting slots', { error: error.message, stack: error.stack });
    return handleError(error, log);
  }
};

/**
 * Create a new booking
 * @param {Object} params - Booking parameters
 * @param {Object} log - Logger
 * @returns {Promise<Object>} - Response
 */
const createBooking = async (params, log) => {
  log.info('Creating booking', { params });
  console.log('createBooking input:', JSON.stringify(params, null, 2));

  try {
    // Directly pass through the request in Cal.com v1 API format
    if (params.eventTypeId && params.start && params.responses && params.timeZone) {
      console.log('Request already in Cal.com v1 API format, passing through directly');
      
      // Ensure apiKey is present
      params.apiKey = params.apiKey || config.cal.apiKey;
      
      console.log('Creating booking with Cal.com API...');
      const booking = await calApi.createBooking(params);
      
      console.log('Booking created successfully!', booking);
      return {
        statusCode: 200,
        body: JSON.stringify({
          success: true,
          booking,
          message: 'Booking created successfully'
        }),
      };
    }
    
    // Legacy format handling (convert to v1 format)
    console.log('Converting legacy format to Cal.com v1 API format');
    
    // Validate required fields
    if (!params.name) {
      throw new ValidationError('Name is required', 'name');
    }
    if (!params.email) {
      throw new ValidationError('Email is required', 'email');
    }
    if (!params.startTime) {
      throw new ValidationError('Start time is required', 'startTime');
    }
    if (!params.eventTypeId) {
      throw new ValidationError('Event type ID is required', 'eventTypeId');
    }
    if (!params.timeZone) {
      throw new ValidationError('Time zone is required', 'timeZone');
    }
    
    // Get API key and event type ID
    const apiKey = params.apiKey || config.cal.apiKey;
    const eventTypeId = params.eventTypeId;
    
    // Get start and end times
    const startTime = params.startTime;
    let endTime = params.endTime;
    
    // Calculate end time if not provided
    if (!endTime) {
      const duration = params.duration || config.app.defaultDuration || 30; // default to 30 min
      endTime = new Date(new Date(startTime).getTime() + duration * 60000).toISOString();
    }
    
    // Create booking data in Cal.com v1 format
    const bookingData = {
      eventTypeId: typeof eventTypeId === 'string' ? parseInt(eventTypeId, 10) : eventTypeId,
      start: startTime,
      end: endTime,
      responses: {
        name: params.name,
        email: params.email,
        location: params.location ? { value: params.location } : { value: "integrations:daily" },
        notes: params.notes || '',
        guests: params.guests || []
      },
      timeZone: params.timeZone,
      language: params.language || 'en',
      title: params.title,
      description: params.description,
      status: params.status || "ACCEPTED",
      metadata: params.metadata || { source: 'lambda-integration' },
      apiKey: apiKey
    };
    
    console.log('Converted to Cal.com v1 API format:', JSON.stringify(bookingData, null, 2));
    
    // Call the Cal.com API
    try {
      const booking = await calApi.createBooking(bookingData);
      
      return {
        statusCode: 200,
        body: JSON.stringify({
          success: true,
          booking,
          message: 'Booking created successfully'
        }),
      };
    } catch (error) {
      // Handle specific Cal.com API errors
      if (error instanceof ApiError || error.source === 'cal') {
        log.error('Cal.com API error', { error });
        
        // Handle specific error cases
        if (error.statusCode === 409 || 
            (error.details && error.details.message && 
             error.details.message.includes('already booked'))) {
          // Time slot already booked error
          return {
            statusCode: 409,
            body: JSON.stringify({
              success: false,
              error: 'Requested time slot is not available',
              message: 'The requested time slot is not available. Please choose a different time.',
            }),
          };
        }
        
        // Generic API error
        return {
          statusCode: error.statusCode || 500,
          body: JSON.stringify({
            success: false,
            error: error.message || 'Error creating booking',
            details: error.details || {},
          }),
        };
      }
      
      // Rethrow other errors to be handled by the global error handler
      throw error;
    }
  } catch (error) {
    log.error('Error creating booking', { error: error.message, stack: error.stack });
    return handleError(error, log);
  }
};

/**
 * Reschedule an existing booking
 * @param {Object} params - Reschedule parameters
 * @param {Object} log - Logger
 * @returns {Promise<Object>} - Response
 */
const rescheduleBooking = async (params, log) => {
  log.info('Rescheduling booking', { params });

  const { bookingId, startTime, endTime, timeZone } = params;

  if (!bookingId || !startTime || !timeZone) {
    throw new ValidationError('Missing required parameters', 'params', {
      required: ['bookingId', 'startTime', 'timeZone'],
    });
  }

  const rescheduleDetails = {
    startTime,
    endTime: endTime || new Date(new Date(startTime).getTime() + config.app.defaultDuration * 60000).toISOString(),
    timeZone,
  };

  const booking = await calApi.rescheduleBooking(bookingId, rescheduleDetails);

  return {
    statusCode: 200,
    body: JSON.stringify({
      success: true,
      booking,
      message: 'Booking rescheduled successfully',
    }),
  };
};

/**
 * Cancel an existing booking
 * @param {Object} params - Cancel parameters
 * @param {Object} log - Logger
 * @returns {Promise<Object>} - Response
 */
const cancelBooking = async (params, log) => {
  log.info('Cancelling booking', { params });

  const { bookingId, reason } = params;

  if (!bookingId) {
    throw new ValidationError('Missing required parameters', 'params', {
      required: ['bookingId'],
    });
  }

  const cancelDetails = {
    reason: reason || 'Cancelled by user',
  };

  const booking = await calApi.cancelBooking(bookingId, cancelDetails);

  return {
    statusCode: 200,
    body: JSON.stringify({
      success: true,
      booking,
      message: 'Booking cancelled successfully',
    }),
  };
};

/**
 * Get details of a specific booking
 * @param {Object} params - Booking parameters
 * @param {Object} log - Logger
 * @returns {Promise<Object>} - Response
 */
const getBookingDetails = async (params, log) => {
  log.info('Getting booking details', { params });

  const { bookingId } = params;

  if (!bookingId) {
    throw new ValidationError('Missing required parameters', 'params', {
      required: ['bookingId'],
    });
  }

  const booking = await calApi.getBooking(bookingId);

  return {
    statusCode: 200,
    body: JSON.stringify({
      success: true,
      booking,
    }),
  };
};

const determineAction = (event) => {
  // Check for action in query parameters
  if (event.queryStringParameters && event.queryStringParameters.action) {
    return event.queryStringParameters.action;
  }

  // Check for action in path
  const pathParts = event.path.split('/').filter(Boolean);
  if (pathParts.length > 0) {
    const lastPathPart = pathParts[pathParts.length - 1];
    if (VALID_ACTIONS.includes(lastPathPart)) {
      return lastPathPart;
    }
  }

  // Check for action in body
  if (event.body) {
    try {
      const body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
      if (body.action && VALID_ACTIONS.includes(body.action)) {
        return body.action;
      }
    } catch (error) {
      console.error('Error parsing request body:', error);
    }
  }

  // Default to getAvailability
  return 'getAvailability';
};

// Helper function to format booking data for Cal.com API v1
const formatBookingData = (params) => {
  // Log the incoming parameters
  console.log('formatBookingData input:', JSON.stringify(params, null, 2));

  // Check for v1 format (has 'responses' field directly)
  if (params.responses && params.start && params.eventTypeId) {
    console.log('Request is already in Cal.com v1 format');
    const formattedData = {
      ...params,
      // Ensure the timeZone is set
      timeZone: params.timeZone || 'UTC'
    };
    console.log('Returning v1 formatted data:', JSON.stringify(formattedData, null, 2));
    return formattedData;
  }

  console.log('Converting legacy format to Cal.com v1 format');

  // Validate required fields
  if (!params.name) {
    console.log('Validation error: Name is required');
    throw new ValidationError('Name is required', 'name');
  }
  if (!params.email) {
    console.log('Validation error: Email is required');
    throw new ValidationError('Email is required', 'email');
  }
  if (!params.startTime) {
    console.log('Validation error: Start time is required');
    throw new ValidationError('Start time is required', 'startTime');
  }
  if (!params.eventTypeId) {
    console.log('Validation error: Event type ID is required');
    throw new ValidationError('Event type ID is required', 'eventTypeId');
  }

  // Ensure we're booking future dates
  const bookingDate = new Date(params.startTime);
  const now = new Date();
  if (bookingDate < now) {
    console.log('Booking date is in the past, adjusting to future', {
      originalDate: params.startTime,
      now: now.toISOString()
    });
    
    // Adjust booking to tomorrow at same time
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(bookingDate.getHours());
    tomorrow.setMinutes(bookingDate.getMinutes());
    tomorrow.setSeconds(0);
    tomorrow.setMilliseconds(0);
    
    params.startTime = tomorrow.toISOString();
    console.log('Adjusted booking date to future', { adjustedDate: params.startTime });
  }

  // Create booking data in Cal.com v1 format
  const formattedData = {
    eventTypeId: params.eventTypeId,
    start: params.startTime,
    timeZone: params.timeZone || 'UTC',
    apiKey: params.apiKey,
    responses: {
      name: params.name,
      email: params.email,
      guests: params.guests || [],
      location: params.location || { optionValue: "", value: "" },
      notes: params.notes || '',
    },
    metadata: params.metadata || {}
  };

  // Add additional fields if provided
  if (params.endTime) {
    formattedData.end = params.endTime;
  }

  console.log('Legacy format converted to v1:', JSON.stringify(formattedData, null, 2));
  return formattedData;
};
