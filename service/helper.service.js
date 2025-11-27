const httpStatus = require("http-status");
const bcrypt = require("bcrypt");
const tokenService = require("./token.service");
const userService = require("./user.service");
const db = require("../models");
const Token = db.token;
const ApiError = require("../utils/ApiError");
const { tokenTypes } = require("../config/token");
const generateUniqueId = require("generate-unique-id");
const crypto = require('crypto');


const isNotValid = (value) => {
  return (
    value === null ||
    value === undefined ||
    value === "" ||
    (typeof value === "object" &&
      !Array.isArray(value) &&
      Object.keys(value).length === 0) || // empty object
    (Array.isArray(value) && value.length === 0) // empty array
  );
};

const isValid = (value) => !isNotValid(value);

const isValidEmail = (email) => {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
}

function generateKey() {
  return crypto.randomBytes(16).toString('hex'); // 16 bytes = 128 bits
}

const make_unique_id = async () => {
  let uniqueId = "";
  try {
    uniqueId = generateUniqueId({
      length: 13,
      useLetters: false,
    });
  } catch (error) {
    new ApiError(httpStatus.INTERNAL_SERVER_ERROR, error.message);
  } finally {
    return uniqueId;
  }
};

const parseFormattedNumber = (str) => {
  if (!str) return 0;
  return parseFloat(String(str).replace(/,/g, ''));
}

/**
 * Logout
 * @param {string} refreshToken
 * @returns {Promise}
 */
const logout = async (refreshToken) => {
  const refreshTokenDoc = await Token.findOne({
    where: {
      token: refreshToken,
      type: tokenTypes.REFRESH,
      black_listed: false,
    },
  });
  if (!refreshTokenDoc) {
    return null;
  }
  await refreshTokenDoc.destroy();
};

/**
 * Refresh auth tokens
 * @param {string} refreshToken
 * @returns {Promise<Object>}
 */
const refreshAuth = async (refreshToken) => {
  try {
    const refreshTokenDoc = await tokenService.verifyToken(
      refreshToken,
      tokenTypes.REFRESH
    );
    const user = await userService.getUserById(refreshTokenDoc.user_id);
    if (!user) {
      throw new Error();
    }
    await refreshTokenDoc.destroy();
    return tokenService.generateAuthTokens(user);
  } catch (error) {
    throw new ApiError(httpStatus.UNAUTHORIZED, "Please authenticate");
  }
};

/**
 * Reset password
 * @param {string} resetPasswordToken
 * @param {string} newPassword
 * @returns {Promise}
 */
const resetPassword = async (resetPasswordToken, newPassword) => {
  try {
    const resetPasswordTokenDoc = await tokenService.verifyToken(
      resetPasswordToken,
      tokenTypes.RESET_PASSWORD
    );
    const user = await userService.getUserById(resetPasswordTokenDoc.user_id);
    if (!user) {
      throw new Error();
    }
    await userService.updateUserById(user.id, { password: newPassword });
    await Token.destroy({
      where: { user_id: user.id, type: tokenTypes.RESET_PASSWORD },
    });
  } catch (error) {
    throw new ApiError(httpStatus.UNAUTHORIZED, "Password reset failed");
  }
};

/**
 * Verify email
 * @param {string} verifyEmailToken
 * @returns {Promise}
 */
const verifyEmail = async (verifyEmailToken) => {
  try {
    const verifyEmailTokenDoc = await tokenService.verifyToken(
      verifyEmailToken,
      tokenTypes.VERIFY_EMAIL
    );
    const user = await userService.getUserById(verifyEmailTokenDoc.user_id);

    if (!user) {
      throw new Error();
    }
    await Token.destroy({
      where: { user_id: user.id, type: tokenTypes.VERIFY_EMAIL },
    });
    await userService.updateUserById(user.id, { active: 1 });
  } catch (error) {
    throw new ApiError(httpStatus.UNAUTHORIZED, "Email verification failed");
  }
};

/**
 * Make sequential no
 */
const make_sequential_no = async (input) => {
  try {
  const padded = String(input).padStart(10, '0');
  return padded;
  } catch (error) {
    throw new ApiError(httpStatus.UNAUTHORIZED, "Email verification failed");
  }
};

function randomString(length, capslock = 0) {
  let chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  var result = "";
  for (var i = length; i > 0; --i)
    result += chars[Math.floor(Math.random() * chars.length)];
  if (capslock == 1) {
    return result.toUpperCase();
  } else {
    return result;
  }
}

const make_order_number = async (pre) => {
  let today = new Date();
  let day = today.getDate();
  let month = today.getMonth();
  let year = today.getFullYear();
  let str = pre;
  str +=
    randomString(2, 1) + month + randomString(3, 1) + day + randomString(2, 1);
  return str;
};

module.exports = {
  isValid,
  isNotValid,
  make_unique_id,
  logout,
  refreshAuth,
  resetPassword,
  verifyEmail,
  parseFormattedNumber,
  make_order_number,
  isValidEmail,
  generateKey
};
