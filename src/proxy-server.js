const http = require('http');
const { logger } = require('./utils/logger');

const PORT = process.env.PROXY_PORT || 8081;
const API_PORT = process.env.PORT || 3000;

// Create a simple HTTP proxy server
const server = http.createServer(async (req, res) => {
  try {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    // Handle OPTIONS requests
    if (req.method === 'OPTIONS') {
      res.writeHead(200);
      res.end();
      return;
    }
    
    // Only handle POST requests
    if (req.method !== 'POST') {
      res.writeHead(405, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Method not allowed' }));
      return;
    }
    
    // Collect request body
    let body = '';
    req.on('data', (chunk) => {
      body += chunk.toString();
    });
    
    req.on('end', async () => {
      try {
        logger.info('Proxying request to API server');
        
        // Forward the request to the API server
        const options = {
          hostname: 'localhost',
          port: API_PORT,
          path: '/',
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          }
        };
        
        const apiReq = http.request(options, (apiRes) => {
          // Forward the response headers
          res.writeHead(apiRes.statusCode, apiRes.headers);
          
          // Forward the response body
          apiRes.pipe(res);
        });
        
        apiReq.on('error', (error) => {
          logger.error('Error forwarding request to API server', { error });
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Error forwarding request to API server' }));
        });
        
        // Send the request body to the API server
        apiReq.write(body);
        apiReq.end();
      } catch (error) {
        logger.error('Error handling request', { error });
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Internal server error' }));
      }
    });
  } catch (error) {
    logger.error('Server error', { error });
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Internal server error' }));
  }
});

// Start the server
server.listen(PORT, () => {
  logger.info(`Proxy server running at http://localhost:${PORT}/`);
});
