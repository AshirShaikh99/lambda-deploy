function validatePhoneNumber(phoneNumber) {
  // Basic E.164 format validation
  const phoneRegex = /^\+[1-9]\d{1,14}$/;
  
  if (!phoneRegex.test(phoneNumber)) {
    throw new Error('Invalid phone number format. Must be in E.164 format (e.g., +1234567890)');
  }
  
  return true;
}

module.exports = { validatePhoneNumber };