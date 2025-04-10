const { addRequestContext } = require('./utils/logger');
const { handleError, ValidationError } = require('./utils/errorHandler');
const calApi = require('./services/calApi');
const vapiService = require('./services/vapiService');
const config = require('./config');

/**
 * Main Lambda handler function
 * @param {Object} event - AWS Lambda event
 * @param {Object} context - AWS Lambda context
 * @returns {Promise<Object>} - Lambda response
 */
exports.handler = async (event, context) => {
  // Create request-specific logger
  const requestId = context.awsRequestId;
  const log = addRequestContext(requestId);

  try {
    log.info('Lambda function invoked', { event });

    // Parse request body
    let body = event.body ? JSON.parse(event.body) : {};

    // Copy all properties from request body to params for consistent handling
    const params = { ...body };

    // Determine the action to take based on the request
    const action = event.queryStringParameters?.action || body.action || 'handleVapiWebhook';

    // Log the action and params
    log.info(`Processing action: ${action}`, { params });

    // Route to the appropriate handler based on the action
    switch (action) {
      case 'initializeAssistant':
        return await initializeAssistant(params, log);
      case 'trialStarted':
        return await handleTrialStarted(params, log);
      case 'handleVapiWebhook':
        return await handleVapiWebhook(params, log);
      case 'checkAvailability':
        return await checkAvailability(params, log);
      case 'findAvailability':
        return await findAvailability(params, log);
      case 'getAvailableSlots':
        return await getAvailableSlots(params, log);
      case 'createBooking':
        return await createBooking(params, log);
      case 'rescheduleBooking':
        return await rescheduleBooking(params, log);
      case 'cancelBooking':
        return await cancelBooking(params, log);
      case 'getBookingDetails':
        return await getBookingDetails(params, log);
      default:
        throw new ValidationError('Invalid action specified', 'action');
    }
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
  log.info('Getting available slots', { params });

  try {
    // Validate required parameters
    if (!params.startTime) {
      throw new ValidationError('Start time is required', 'startTime');
    }
    if (!params.endTime) {
      throw new ValidationError('End time is required', 'endTime');
    }

    // Override API key if provided in the params
    if (params.apiKey) {
      log.info('Using custom API key for this request');
      config.cal.apiKey = params.apiKey;
    }

    // Override event type ID if provided in the params
    const eventTypeId = params.eventTypeId || config.cal.eventTypeId;
    
    // Prepare parameters for the slots API
    const apiParams = {
      startTime: params.startTime,
      endTime: params.endTime,
      eventTypeId: eventTypeId,
      apiKey: config.cal.apiKey
    };

    // Get available slots
    const slots = await calApi.getSlots(apiParams);

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        slots: slots,
      }),
    };
  } catch (error) {
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

  const { name, email, startTime, endTime, timeZone, notes, guests, location } = params;

  if (!name || !email || !startTime || !timeZone) {
    throw new ValidationError('Missing required parameters', 'params', {
      required: ['name', 'email', 'startTime', 'timeZone'],
    });
  }

  // Validate that the booking date is in the future
  let bookingDate = new Date(startTime);
  const now = new Date();

  log.info('Validating booking date', { bookingDate, now, bookingDateISO: bookingDate.toISOString(), nowISO: now.toISOString() });

  // Check if the date is from a past year (like 2023)
  const isPastYear = bookingDate.getFullYear() < now.getFullYear();

  // Check if the date is in the past
  const isPastDate = bookingDate <= now;

  if (isPastYear || isPastDate) {
    log.warn('Detected past date for booking', { bookingDate, now, isPastYear, isPastDate });

    // Create an adjusted date
    let adjustedDate;

    if (isPastYear) {
      // If it's a past year, use the same month/day/time but in the current year
      adjustedDate = new Date(bookingDate);
      adjustedDate.setFullYear(now.getFullYear());

      // If it's still in the past after setting the current year, add one year
      if (adjustedDate <= now) {
        adjustedDate.setFullYear(now.getFullYear() + 1);
      }
    } else {
      // If it's just a past date in the current year, schedule for tomorrow at the same time
      adjustedDate = new Date(now);
      adjustedDate.setDate(now.getDate() + 1);
      adjustedDate.setHours(bookingDate.getHours(), bookingDate.getMinutes(), 0, 0);
    }

    // Log the date adjustment details
    log.info('Date adjustment details', {
      originalDate: bookingDate.toLocaleString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: 'numeric',
        minute: 'numeric'
      }),
      adjustedDate: adjustedDate.toLocaleString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: 'numeric',
        minute: 'numeric'
      })
    });

    log.info('Automatically adjusting booking to future date', {
      originalDate: bookingDate.toISOString(),
      adjustedDate: adjustedDate.toISOString()
    });

    // Update the booking date to the adjusted date
    bookingDate = adjustedDate;
    const adjustedStartTime = adjustedDate.toISOString();

    // Update the parameters with the adjusted date
    params.startTime = adjustedStartTime;
    if (params.endTime) {
      // If endTime is provided, adjust it by the same amount
      const originalEndTime = new Date(endTime);
      const timeDiff = originalEndTime - bookingDate;
      const adjustedEndTime = new Date(adjustedDate.getTime() + timeDiff);
      params.endTime = adjustedEndTime.toISOString();
    }

    log.info('Booking parameters adjusted for future date', {
      originalStartTime: startTime,
      adjustedStartTime: params.startTime,
      originalEndTime: endTime,
      adjustedEndTime: params.endTime
    });
  }

  // Get event type details from config
  const eventTypeId = params.eventTypeId || config.cal.eventTypeId;

  // Use the slug from config or default to "secret" (as seen in test-cal-api.js)
  const eventTypeSlug = "secret";

  try {
    // First, check if the requested time slot is available
    // Get the date from the startTime
    const requestedDate = new Date(startTime);
    const startDate = new Date(requestedDate.getFullYear(), requestedDate.getMonth(), requestedDate.getDate() - 1).toISOString().split('T')[0];
    const endDate = new Date(requestedDate.getFullYear(), requestedDate.getMonth(), requestedDate.getDate() + 1).toISOString().split('T')[0];

    log.info('Checking availability before booking', { startDate, endDate, timeZone });
    const availability = await calApi.getAvailability(eventTypeId, startDate, endDate, timeZone);
    const formattedAvailability = calApi.formatAvailabilityForVoice(availability);

    // Check if the requested time slot is available
    const isAvailable = calApi.isTimeSlotAvailable(formattedAvailability, startTime);

    if (!isAvailable) {
      log.info('Requested time slot is not available, finding alternatives', { startTime });

      // Find alternative time slots
      const alternativeSlots = calApi.findAlternativeTimeSlots(formattedAvailability, startTime, 5);

      return {
        statusCode: 409, // Conflict - the requested resource couldn't be created due to a conflict
        body: JSON.stringify({
          success: false,
          error: 'Requested time slot is not available',
          alternativeSlots: alternativeSlots,
          message: 'The requested time slot is not available. Please choose from the alternative slots provided.',
        }),
      };
    }

    // Format booking data according to Cal.com API v2 documentation
    const bookingDetails = {
      eventTypeId: eventTypeId,
      eventTypeSlug: eventTypeSlug,
      name,
      email,
      startTime,
      endTime,
      timeZone,
      notes,
      metadata: {
        source: 'lambda-cal-vapi-integration',
        created: new Date().toISOString()
      }
    };

    // Add optional parameters if provided
    if (guests && Array.isArray(guests) && guests.length > 0) {
      bookingDetails.guests = guests;
    }

    if (location) {
      bookingDetails.location = location;
    }

    log.info('Sending booking details to Cal.com', { bookingDetails });
    const booking = await calApi.createBooking(bookingDetails);

    // Check if we adjusted the date
    let responseMessage = 'Booking created successfully';
    let dateAdjusted = false;

    // If we adjusted a past date to a future date, include that information in the response
    if (startTime !== params.startTime) {
      dateAdjusted = true;
      const originalDate = new Date(startTime).toLocaleString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: 'numeric',
        minute: 'numeric'
      });

      const adjustedDate = new Date(params.startTime).toLocaleString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: 'numeric',
        minute: 'numeric'
      });

      responseMessage = `Booking created successfully. Note: Your requested date (${originalDate}) was in the past, so we've scheduled your appointment for ${adjustedDate} instead.`;
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        booking,
        message: responseMessage,
        dateAdjusted,
        originalDate: startTime,
        adjustedDate: params.startTime
      }),
    };
  } catch (error) {
    log.error('Error creating booking', { error });

    // If this is a Cal.com API error about the time slot not being available
    if (error.source === 'cal' && error.statusCode === 400 &&
        error.details?.error?.message?.includes('already has booking at this time or is not available')) {

      // Get availability for a wider date range to suggest alternatives
      const requestedDate = new Date(startTime);
      const startDate = new Date(requestedDate.getFullYear(), requestedDate.getMonth(), requestedDate.getDate() - 3).toISOString().split('T')[0];
      const endDate = new Date(requestedDate.getFullYear(), requestedDate.getMonth(), requestedDate.getDate() + 7).toISOString().split('T')[0];

      try {
        const availability = await calApi.getAvailability(eventTypeId, startDate, endDate, timeZone);
        const formattedAvailability = calApi.formatAvailabilityForVoice(availability);
        const alternativeSlots = calApi.findAlternativeTimeSlots(formattedAvailability, startTime, 5);

        return {
          statusCode: 409, // Conflict
          body: JSON.stringify({
            success: false,
            error: 'Requested time slot is not available',
            alternativeSlots: alternativeSlots,
            message: 'The requested time slot is not available. Please choose from the alternative slots provided.',
          }),
        };
      } catch (availabilityError) {
        log.error('Error getting alternative slots', { availabilityError });
        // Fall through to the generic error handler
      }
    }

    // Re-throw the error to be handled by the global error handler
    throw error;
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
