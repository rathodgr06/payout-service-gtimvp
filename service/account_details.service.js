const httpStatus = require("http-status");
const accountDetailsDBService = require("./account_details.db.service");
const { where } = require("sequelize");

/**
 * Add New Transaction Account Details
 * @param {*} payload 
 * @returns 
 */
const add = async (payload) => {
  let result = await accountDetailsDBService.add(payload);
  return result;
};

/**
 * Get Account Details By TXN ID
 * @param {*} transaction_id 
 * @returns 
 */
const get_by_transaction_id = async (transaction_id) => {
  let where = {
    transaction_id: transaction_id
  }
  let result = await accountDetailsDBService.findAll(where);

  if (result?.status !== httpStatus.OK) {
    return {
      status: 400,
      message: "account details not found!",
    };
  }

  return result;
};

module.exports = {
  add,
  get_by_transaction_id,
};
