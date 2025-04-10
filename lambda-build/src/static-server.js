const http = require('http');
const fs = require('fs');
const path = require('path');
const { logger } = require('./utils/logger');

const PORT = process.env.STATIC_PORT || 8080;

// Create a simple HTTP server to serve static files
const server = http.createServer((req, res) => {
  // Handle only GET requests
  if (req.method !== 'GET') {
    res.writeHead(405, { 'Content-Type': 'text/plain' });
    res.end('Method not allowed');
    return;
  }
  
  // Parse the URL path
  let filePath = req.url;
  if (filePath === '/') {
    filePath = '/index.html';
  }
  
  // Determine the full path to the file
  const fullPath = path.join(__dirname, '../public', filePath);
  
  // Read the file
  fs.readFile(fullPath, (err, data) => {
    if (err) {
      // If the file doesn't exist, return 404
      if (err.code === 'ENOENT') {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('File not found');
      } else {
        // For other errors, return 500
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('Internal server error');
      }
      return;
    }
    
    // Determine the content type based on the file extension
    const ext = path.extname(filePath);
    let contentType = 'text/plain';
    
    switch (ext) {
      case '.html':
        contentType = 'text/html';
        break;
      case '.css':
        contentType = 'text/css';
        break;
      case '.js':
        contentType = 'application/javascript';
        break;
      case '.json':
        contentType = 'application/json';
        break;
      case '.png':
        contentType = 'image/png';
        break;
      case '.jpg':
      case '.jpeg':
        contentType = 'image/jpeg';
        break;
    }
    
    // Set CORS headers to allow requests from any origin
    res.writeHead(200, {
      'Content-Type': contentType,
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET',
      'Access-Control-Allow-Headers': 'Content-Type',
    });
    
    // Send the file
    res.end(data);
  });
});

// Start the server
server.listen(PORT, () => {
  logger.info(`Static server running at http://localhost:${PORT}/`);
});
