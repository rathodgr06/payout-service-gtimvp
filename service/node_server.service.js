const axios = require('axios');

const username = process.env.A_X_USERNAME;
const password = process.env.A_X_PASSWORD;

// baseURL: process.env.NODE_SERVER + "/api/v1/", // replace with your API base URL
// Create an Axios instance
const api = axios.create({
  baseURL: process.env.NODE_SERVER + "api/v1/", // replace with your API base URL
  timeout: 20000, // 20 seconds
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Basic ' + Buffer.from(`${username}:${password}`).toString('base64'),
    'xusername': username,
    'xpassword': password,
  },
});

// Request Interceptor
api.interceptors.request.use(
  config => {
    // You can add auth tokens or other headers here
    console.log(`[Request] ${config.method.toUpperCase()} ${config.url}`);
    return config;
  },
  error => {
    return Promise.reject(error);
  }
);

// Response Interceptor
api.interceptors.response.use(
  response => {
    return response.data;
  },
  error => {
    console.error('[Response Error]', error?.response?.data || error.message);
    if (error?.response?.data?.errors?.length > 0) {
      const firstError = error.response.data.errors[0];
      // console.log('Error Code:', firstError.code);
      // console.log('Error Message:', firstError.message);
      const errorData = {
        status: firstError.code,
        message: firstError.message,
      };

      return Promise.reject(errorData); // return custom error here
    }
    // fallback error response
    return Promise.reject({
      status: error.response?.status || 500,
      message: error.message || 'Unknown error',
    });
  }
);

// Export API methods
module.exports = {
  get: (url, config = {}) => api.get(url, config),
  post: (url, data, config = {}) => api.post(url, data, config),
  put: (url, data, config = {}) => api.put(url, data, config),
  delete: (url, config = {}) => api.delete(url, config),
};
