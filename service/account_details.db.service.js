const httpStatus = require("http-status");
const db = require("../models");
const Tansactions = db.transactions;
const AccountDetails = db.account_details;
const { Op } = require("sequelize");

const add = async (data) => {
  console.log("🚀 ~ add ~ data:", data)
  try {

    let where = {};
    if (data?.transaction_id) {
      where.transaction_id = data?.transaction_id;
    }
    if (data?.external_id) {
      where.external_id = data?.external_id;
    }

    const [account_details, created] = await AccountDetails.findOrCreate({
      where: where,
      defaults: {
        transaction_id: data?.transaction_id,
        order_id: data?.order_id,
        external_id: data?.external_id,
        receiver_id: data?.receiver_id,
        sub_merchant_id: data?.sub_merchant_id,
        transaction_date: data?.transaction_date,
        account_id: data?.account_id,
        account_type: data?.account_type,
        account_for: data?.account_for,
        payer_id: data?.payer_id,
        payer_name: data?.payer_name,
        payer_currency: data?.payer_currency,
        account_data: data?.account_data,
        payer_data: data?.payer_data
      },
    });

    if (created) {
      return {
        status: httpStatus.OK,
        message: "Transaction account details added successfully",
        data: account_details.toJSON(),
      };
    } else if (account_details) {
      return {
        status: httpStatus.BAD_REQUEST,
        message: "Transaction account details already added",
      };
    } else {
      return {
        status: httpStatus.BAD_REQUEST,
        message: "Transaction account details not created",
      };
    }
  } catch (error) {
    console.error("Error finding or creating Transaction account details:", error);
    // throw error;
    return {
      status: httpStatus.INTERNAL_SERVER_ERROR,
      message: "Error finding or creating Transaction account details:" + error.message,
    };
  }
};

const findAll = async (where) => {
  try {
    const account_details = await AccountDetails.findAll({
      where: where,
      order: [["id", "DESC"]],
    });
    if (account_details && account_details.length > 0) {
      return {
        status: httpStatus.OK,
        message: "Account details fetched successfully",
        data: account_details.map((item) => {
          const json = item.toJSON();
          return json;
        }),
      };
    } else {
      return {
        status: httpStatus.NOT_FOUND,
        message: "Account details found for this plan",
      };
    }
  } catch (error) {
    console.error("Error fetching account details:", error);
    return {
      status: httpStatus.INTERNAL_SERVER_ERROR,
      message: "Error fetching account details: " + error.message,
    };
  }
};

const findOne = async (where) => {
  try {
    const account_details = await AccountDetails.findOne({
      where: where,
    });

    if (account_details) {
      return {
        status: httpStatus.OK,
        message: "Account details fetch successfully",
        data: account_details.toJSON(),
      };
    } else {
      return {
        status: httpStatus.NOT_FOUND,
        message: "Account details not found",
      };
    }
  } catch (error) {
    console.error("Error found account details:", error);
    return {
      status: httpStatus.INTERNAL_SERVER_ERROR,
      message: "Error found account details: " + error.message,
    };
  }
};


module.exports = {
  add,
  findAll,
  findOne
};
