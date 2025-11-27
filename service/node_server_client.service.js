const axios = require("axios");
const helperService = require("../service/helper.service");

function createApiClient(username, password, token) {
  // Create an Axios instance
  const api = axios.create({
    baseURL: process.env.NODE_SERVER + "api/v1/",
    timeout: 20000,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      xusername: `${username}`,
      xpassword: `${password}`,
    },
  });

  // Request Interceptor
  api.interceptors.request.use(
    (config) => {
      console.log(`[Request] ${config.method.toUpperCase()} ${config.url}`);
      return config;
    },
    (error) => Promise.reject(error)
  );

  // Response Interceptor
  api.interceptors.response.use(
    (response) => response.data,
    (error) => {
      console.log("🚀 ~ createApiClient ~ error:", error)
      console.error("[Response Error]", error?.response?.data || error.message);

      let message = error?.response?.data?.message;
      if (error?.response?.data?.errors?.length > 0) {
        const firstError = error.response.data.errors[0];
        return Promise.reject({
          status: firstError.code,
          message: helperService.isValid(message) ? message : firstError.message,
        });
      }

      return Promise.reject({
        status: error.response?.status || 500,
        message: helperService.isValid(message) ? message : error.message || "Unknown error",
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
