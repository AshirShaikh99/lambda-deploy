const { spawn } = require('child_process');
const path = require('path');

// Make sure the server is running
async function startServer() {
  return new Promise((resolve) => {
    const server = spawn('npm', ['start'], { stdio: 'pipe' });
    
    // Wait for server to start
    server.stdout.on('data', (data) => {
      if (data.toString().includes('Server running at http://localhost:3000/')) {
        console.log('Server started successfully');
        resolve(server);
      }
    });
    
    setTimeout(() => {
      console.log('Timed out waiting for server to start, assuming it\'s already running');
      resolve(null);
    }, 5000);
  });
}

// Run a test script
async function runTest(scriptName) {
  return new Promise((resolve, reject) => {
    console.log(`\n\nRunning test: ${scriptName}\n-----------------------------------------`);
    
    const test = spawn('node', [scriptName], { stdio: 'inherit' });
    
    test.on('close', (code) => {
      if (code === 0) {
        console.log(`\n✅ ${scriptName} completed successfully\n`);
        resolve();
      } else {
        console.error(`\n❌ ${scriptName} failed with code ${code}\n`);
        resolve(); // Continue with other tests even if one fails
      }
    });
  });
}

// Install dependencies if needed
async function installDependencies() {
  return new Promise((resolve) => {
    console.log('\nChecking and installing dependencies...');
    const install = spawn('npm', ['install', 'node-fetch'], { stdio: 'inherit' });
    
    install.on('close', (code) => {
      if (code === 0) {
        console.log('Dependencies installed successfully');
      } else {
        console.error('Warning: Dependency installation may have failed');
      }
      resolve();
    });
  });
}

async function main() {
  try {
    // Install dependencies first
    await installDependencies();
    
    // Start the server if it's not already running
    const server = await startServer();
    
    // Run all tests
    // 1. Direct Cal.com API test
    await runTest('test-direct-cal-api.js');
    
    // 2. Lambda function test using query param
    await runTest('test-lambda-booking.js');
    
    // 3. Webhook path test
    await runTest('test-webhook-booking.js');
    
    // Clean up
    if (server) {
      server.kill();
      console.log('Server stopped');
    }
    
    console.log('\nAll tests completed!');
  } catch (error) {
    console.error('Error running tests:', error);
  }
}

main(); 