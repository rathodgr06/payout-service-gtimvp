const axios = require('axios');

function createApiClient() {
  // Create an Axios instanceaa
  const api = axios.create({
    timeout: 20000,
    headers: {
      'Content-Type': 'application/json',
    },
  });

  // Request Interceptor
  api.interceptors.request.use(
    config => {
      console.log(`[Request] ${config.method.toUpperCase()} ${config.url}`);
      return config;
    },
    error => Promise.reject(error)
  );

  // Response Interceptor
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

  // Return API methods bound to this instance
  return {
    get: (url, config = {}) => api.get(url, config),
    post: (url, data, config = {}) => api.post(url, data, config),
    put: (url, data, config = {}) => api.put(url, data, config),
    delete: (url, config = {}) => api.delete(url, config),
  };
}

module.exports = createApiClient;
