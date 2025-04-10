/**
 * Script to create a properly structured Lambda deployment package
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('Creating Lambda deployment package...');

// Create a temp directory for the build
const tempDir = path.join(__dirname, 'lambda-build');
if (fs.existsSync(tempDir)) {
  console.log('Cleaning up existing temp directory...');
  execSync(`rm -rf ${tempDir}`);
}

fs.mkdirSync(tempDir);

// Copy package.json and package-lock.json (if exists)
console.log('Copying package.json...');
fs.copyFileSync(path.join(__dirname, 'package.json'), path.join(tempDir, 'package.json'));
if (fs.existsSync(path.join(__dirname, 'package-lock.json'))) {
  fs.copyFileSync(path.join(__dirname, 'package-lock.json'), path.join(tempDir, 'package-lock.json'));
}

// Copy index.js (the root entry point)
console.log('Copying index.js...');
fs.copyFileSync(path.join(__dirname, 'index.js'), path.join(tempDir, 'index.js'));

// Copy .env file if it exists
if (fs.existsSync(path.join(__dirname, '.env'))) {
  console.log('Copying .env...');
  fs.copyFileSync(path.join(__dirname, '.env'), path.join(tempDir, '.env'));
}

// Copy the src directory
console.log('Copying src directory...');
execSync(`cp -r ${path.join(__dirname, 'src')} ${tempDir}`);

// Install production dependencies in the temp directory
console.log('Installing production dependencies...');
execSync('npm install --omit=dev', { cwd: tempDir });

// Create a zip file
console.log('Creating zip file...');
execSync(`cd ${tempDir} && zip -r ../lambda-function.zip . -x "*.git*" "node_modules/.bin/*" "*.zip" "*.DS_Store"`);

// Clean up
console.log('Cleaning up...');
execSync(`rm -rf ${tempDir}`);

console.log('Lambda deployment package created: lambda-function.zip');
console.log('Upload this file to your Lambda function in the AWS console.'); 