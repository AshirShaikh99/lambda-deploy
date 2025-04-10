/**
 * Lambda function entry point
 * Handles Lambda URL invocations and forwards to the main handler
 */

const { handler } = require('./src/index');

// Lambda entry point for direct invocation
exports.handler = async function(event, context) {
  // For Lambda URL, the event structure is different
  // Normalize it for our handler
  if (event.requestContext && event.requestContext.http) {
    // This is a Lambda URL invocation
    
    // Log original event for debugging
    console.log('Lambda URL invocation:', JSON.stringify({
      path: event.rawPath,
      method: event.requestContext.http.method,
      query: event.queryStringParameters
    }));
    
    // Create a normalized event that matches what our handler expects
    const normalizedEvent = {
      httpMethod: event.requestContext.http.method,
      path: event.rawPath,
      headers: event.headers || {},
      queryStringParameters: event.queryStringParameters || {},
      body: event.body
    };
    
    // Forward to our main handler
    return await handler(normalizedEvent, context);
  }
  
  // Regular Lambda invocation, just pass through
  return await handler(event, context);
}; 