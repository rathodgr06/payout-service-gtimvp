const db = require("../models");
const httpStatus = require("http-status");
const Attachment = db.attachment;

const add = async (data) => {
  try {
    let where = {};
    if (data?.external_id) {
      where.external_id = data?.external_id;
    }

    const [attachmentResponse, created] = await Attachment.findOrCreate({
      where: where,
      defaults: data,
    });

    if (created) {

      const json = attachmentResponse.toJSON();

      const renamed = {
        attachment_id: json.id,
        order_id: json.external_id,
        transaction_id: json.transaction_id,
        receiver_id: json.receiver_id,
        file_name: json.file_name,
        original_name: json.original_name,
        // file_path: json.file_path,
        mimetype: json.mimetype,
        type: json.type,
      };

      return {
        status: httpStatus.OK,
        message: "Transaction attachment added successfully",
        data: renamed,
      };
    } else if (attachmentResponse) {
      return {
        status: httpStatus.BAD_REQUEST,
        message: "Transaction attachment already added",
      };
    } else {
      return {
        status: httpStatus.BAD_REQUEST,
        message: "Transaction attachment not created",
      };
    }
  } catch (error) {
    console.error("Error finding or creating Transaction attachment:", error);
    // throw error;
    return {
      status: httpStatus.INTERNAL_SERVER_ERROR,
      message:
        "Error finding or creating Transaction attachment:" + error.message,
    };
  }
};

const findAll = async (where) => {
  try {
    const account_details = await Attachment.findAll({
      where: where,
      order: [["id", "DESC"]],
    });
    if (account_details && account_details.length > 0) {
      return {
        status: httpStatus.OK,
        message: "Attachment fetched successfully",
        data: account_details.map((item) => {
          const json = item.toJSON();
          return json;
        }),
      };
    } else {
      return {
        status: httpStatus.NOT_FOUND,
        message: "Attachment found for this plan",
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
  console.log("🚀 ~ findOne ~ where:", where)
  try {
    const account_details = await Attachment.findOne({
      where: where,
    });
    console.log("🚀 ~ findOne ~ account_details:", account_details)

    if (account_details) {
      return {
        status: httpStatus.OK,
        message: "Attachment fetch successfully",
        data: account_details.toJSON(),
      };
    } else {
      return {
        status: httpStatus.NOT_FOUND,
        message: "Attachment not found",
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
  findOne,
};
