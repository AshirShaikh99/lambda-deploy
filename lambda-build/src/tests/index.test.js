// Mock dependencies
jest.mock('../utils/logger', () => ({
  addRequestContext: jest.fn(() => ({
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  })),
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock('../services/calApi', () => ({
  getAvailability: jest.fn(),
  createBooking: jest.fn(),
  rescheduleBooking: jest.fn(),
  cancelBooking: jest.fn(),
  getBooking: jest.fn(),
  formatAvailabilityForVoice: jest.fn(),
}));

jest.mock('../services/vapiService', () => ({
  createAssistant: jest.fn(),
  createCall: jest.fn(),
  sendMessage: jest.fn(),
  endCall: jest.fn(),
  getCall: jest.fn(),
  createDefaultAssistantConfig: jest.fn(),
}));

// Import the handler
const { handler } = require('../index');
const calApi = require('../services/calApi');
const vapiService = require('../services/vapiService');

describe('Lambda Handler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Mock AWS Lambda context
  const context = {
    awsRequestId: 'test-request-id',
  };

  test('should handle checkAvailability action', async () => {
    // Mock input
    const event = {
      queryStringParameters: { action: 'checkAvailability' },
      body: JSON.stringify({
        startDate: '2023-01-01',
        endDate: '2023-01-07',
        timeZone: 'America/New_York',
      }),
    };

    // Mock API response
    const mockAvailability = [
      { time: '2023-01-01T10:00:00Z' },
      { time: '2023-01-01T11:00:00Z' },
    ];
    
    const mockFormattedAvailability = [
      {
        time: '2023-01-01T10:00:00Z',
        formattedDateTime: 'Sunday, January 1 at 5:00 AM',
        spoken: 'Sunday, January 1 at 5:00 AM',
      },
      {
        time: '2023-01-01T11:00:00Z',
        formattedDateTime: 'Sunday, January 1 at 6:00 AM',
        spoken: 'Sunday, January 1 at 6:00 AM',
      },
    ];

    calApi.getAvailability.mockResolvedValue(mockAvailability);
    calApi.formatAvailabilityForVoice.mockReturnValue(mockFormattedAvailability);

    // Call the handler
    const result = await handler(event, context);

    // Verify the result
    expect(result.statusCode).toBe(200);
    expect(JSON.parse(result.body)).toEqual({
      success: true,
      availability: mockFormattedAvailability,
    });

    // Verify API calls
    expect(calApi.getAvailability).toHaveBeenCalled();
    expect(calApi.formatAvailabilityForVoice).toHaveBeenCalledWith(mockAvailability);
  });

  test('should handle createBooking action', async () => {
    // Mock input
    const event = {
      queryStringParameters: { action: 'createBooking' },
      body: JSON.stringify({
        name: 'John Doe',
        email: 'john@example.com',
        startTime: '2023-01-01T10:00:00Z',
        timeZone: 'America/New_York',
        notes: 'Test booking',
      }),
    };

    // Mock API response
    const mockBooking = {
      id: 'booking-123',
      name: 'John Doe',
      email: 'john@example.com',
      startTime: '2023-01-01T10:00:00Z',
      endTime: '2023-01-01T10:30:00Z',
      timeZone: 'America/New_York',
      notes: 'Test booking',
    };

    calApi.createBooking.mockResolvedValue(mockBooking);

    // Call the handler
    const result = await handler(event, context);

    // Verify the result
    expect(result.statusCode).toBe(200);
    expect(JSON.parse(result.body)).toEqual({
      success: true,
      booking: mockBooking,
      message: 'Booking created successfully',
    });

    // Verify API calls
    expect(calApi.createBooking).toHaveBeenCalled();
  });

  test('should handle VAPI webhook for function call', async () => {
    // Mock input for a function call webhook
    const event = {
      body: JSON.stringify({
        type: 'function',
        function: 'checkAvailability',
        parameters: {
          startDate: '2023-01-01',
          endDate: '2023-01-07',
          timeZone: 'America/New_York',
        },
        callId: 'call-123',
      }),
    };

    // Mock API responses
    const mockAvailability = [
      { time: '2023-01-01T10:00:00Z' },
      { time: '2023-01-01T11:00:00Z' },
    ];
    
    const mockFormattedAvailability = [
      {
        time: '2023-01-01T10:00:00Z',
        formattedDateTime: 'Sunday, January 1 at 5:00 AM',
        spoken: 'Sunday, January 1 at 5:00 AM',
      },
      {
        time: '2023-01-01T11:00:00Z',
        formattedDateTime: 'Sunday, January 1 at 6:00 AM',
        spoken: 'Sunday, January 1 at 6:00 AM',
      },
    ];

    calApi.getAvailability.mockResolvedValue(mockAvailability);
    calApi.formatAvailabilityForVoice.mockReturnValue(mockFormattedAvailability);
    vapiService.sendMessage.mockResolvedValue({});

    // Call the handler
    const result = await handler(event, context);

    // Verify the result
    expect(result.statusCode).toBe(200);
    expect(JSON.parse(result.body)).toEqual({
      success: true,
    });

    // Verify API calls
    expect(calApi.getAvailability).toHaveBeenCalled();
    expect(calApi.formatAvailabilityForVoice).toHaveBeenCalledWith(mockAvailability);
    expect(vapiService.sendMessage).toHaveBeenCalledWith('call-123', {
      type: 'function_response',
      function: 'checkAvailability',
      result: JSON.stringify({
        success: true,
        availability: mockFormattedAvailability,
      }),
    });
  });
});
