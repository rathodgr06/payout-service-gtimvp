const fs = require('fs');
const FormData = require('form-data');
const createApiClient = require('./path/to/createApiClient');

// 1. Create the API client with credentials
const apiClient = createApiClient('your-username', 'your-password');

// 2. Create FormData instance and append data
const form = new FormData();
form.append('file', fs.createReadStream('./path/to/your-file.pdf'));
form.append('description', 'Sample file upload'); // Optional extra fields

// 3. Use apiClient.post() and pass form + headers
async function uploadFile() {
  try {
    const response = await apiClient.post('/upload', form, {
      headers: {
        ...form.getHeaders(), // Required: includes proper Content-Type with boundary
      }
    });
    console.log('Upload successful:', response);
  } catch (err) {
    console.error('Upload failed:', err);
  }
}

uploadFile();
