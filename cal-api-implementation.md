# Cal.com API Integration in Lambda

## Background
We needed to implement the Cal.com API in our Lambda function to retrieve available slots for scheduling appointments.

## Implementation Details

### 1. Added New API Functions

Added the following functions to `src/services/calApi.js`:

- `getSlots(params)`: Uses the v1 slots API to fetch available time slots for a given date range

### 2. Added New Lambda Handlers

Added the following handlers to `src/index.js`:

- `getAvailableSlots(params, log)`: Lambda handler for retrieving available slots

### 3. Environment Configuration

Updated `src/config.js` to include the Cal.com credentials:

```javascript
config.cal = {
  apiUrl: process.env.CAL_API_URL || 'https://api.cal.com',
  apiKey: process.env.CAL_API_KEY,
  username: process.env.CAL_USERNAME || 'ashir-hassan-shaikh-gjcrzb',
  userId: process.env.CAL_USER_ID,
  eventTypeId: process.env.CAL_EVENT_TYPE_ID || '2077162',
  apiVersion: '2023-12-25'
};
```

### 4. Test Scripts

Created multiple test scripts:

- `slots-availability.js`: Direct test of the Cal.com slots API
- `test-lambda-slots.js`: Test of the Lambda function wrapper for slots API

## API Endpoints Used

- **GET /v1/slots**: Used to get all available slots within a date range
  - Required parameters:
    - `eventTypeId`: The ID of the event type (e.g., "2077162")
    - `startTime`: ISO-formatted start date
    - `endTime`: ISO-formatted end date
    - `apiKey`: Cal.com API key

## Testing

All functionality was tested and works correctly with the Cal.com API. The slots API returns available time slots for the specified date range.

## Deployment

The implementation is ready to be deployed to AWS Lambda:

1. Update the Lambda deployment package with the new code
2. Make sure the following environment variables are set in the Lambda:
   - `CAL_API_KEY`: The Cal.com API key
   - `CAL_EVENT_TYPE_ID`: The event type ID
   - `CAL_USERNAME`: The Cal.com username

## Next Steps

1. Add error handling for specific error cases from the Cal.com API
2. Add caching to minimize API calls for frequently requested date ranges
3. Add metrics to monitor API usage and performance 