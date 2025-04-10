const http = require('http');
const { handler } = require('./index');
const { logger } = require('./utils/logger');

const PORT = process.env.PORT || 3000;

// Create a simple HTTP server
const server = http.createServer(async (req, res) => {
  try {
    // Handle OPTIONS requests for CORS
    if (req.method === 'OPTIONS') {
      res.writeHead(200, {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Max-Age': '86400' // 24 hours
      });
      res.end();
      return;
    }

    // Only handle POST requests
    if (req.method !== 'POST') {
      res.writeHead(405, {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      });
      res.end(JSON.stringify({ error: 'Method not allowed' }));
      return;
    }

    // Parse the URL path
    const url = new URL(req.url, `http://${req.headers.host}`);
    const path = url.pathname;

    // Collect request body
    let body = '';
    req.on('data', (chunk) => {
      body += chunk.toString();
    });

    req.on('end', async () => {
      try {
        // Create mock Lambda event
        const event = {
          path,
          httpMethod: req.method,
          headers: req.headers,
          queryStringParameters: Object.fromEntries(url.searchParams),
          body,
        };

        // Create mock Lambda context
        const context = {
          awsRequestId: Date.now().toString(),
        };

        logger.info('Received request', { path, method: req.method });

        // Call the Lambda handler
        const result = await handler(event, context);

        // Send the response with CORS headers
        res.writeHead(result.statusCode, {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type'
        });
        res.end(result.body);
      } catch (error) {
        logger.error('Error handling request', { error });
        res.writeHead(500, {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        });
        res.end(JSON.stringify({ error: 'Internal server error' }));
      }
    });
  } catch (error) {
    logger.error('Server error', { error });
    res.writeHead(500, {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    });
    res.end(JSON.stringify({ error: 'Internal server error' }));
  }
});

// Start the server
server.listen(PORT, () => {
  logger.info(`Server running at http://localhost:${PORT}/`);
});
