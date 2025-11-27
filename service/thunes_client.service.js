const axios = require('axios');
const urls = require('../config/urls');

function createApiClient(username, password) {
  const api = axios.create({
    baseURL: process.env.PAYOUT_MODE === "test" ? urls.thunes.test_url : urls.thunes.live_url,
    timeout: 20000,
    headers: {
      'Authorization': 'Basic ' + Buffer.from(`${username}:${password}`).toString('base64'),
    },
  });

  api.interceptors.request.use(
    config => {
      console.log(`[Request] ${config.method.toUpperCase()} ${config.url}`);
      return config;
    },
    error => Promise.reject(error)
  );

  api.interceptors.response.use(
    response => response.data,
    error => {
      console.error('[Response Error]', error?.response?.data || error.message);

      if (error?.response?.data?.errors?.length > 0) {
        const firstError = error.response.data.errors[0];
        return Promise.reject({
          status: firstError.code,
          message: firstError.message,
        });
      }

      return Promise.reject({
        status: error.response?.status || 500,
        message: error.message || 'Unknown error',
      });
    }
  );

  return {
    get: (url, config = {}) => api.get(url, config),
    post: (url, data, config = {}) => api.post(url, data, config),
    put: (url, data, config = {}) => api.put(url, data, config),
    delete: (url, config = {}) => api.delete(url, config),

    postMultipart: (url, formData, config = {}) => {
      return api.post(url, formData, {
        ...config,
        headers: {
          ...formData.getHeaders(), // Sets correct multipart/form-data boundary
          ...config.headers,
        },
        maxBodyLength: Infinity, // Prevents Axios from limiting body size
        maxContentLength: Infinity, // Just in case
      });
    },
  };
}

module.exports = createApiClient;
