const httpStatus = require("http-status");
const db = require("../models");
const PayoutMid = db.payout_mid;
const Receiver = db.receiver;
const PayoutPsp = db.payout_psp;
const { Op } = require("sequelize");

const addMID = async (data) => {
  console.log(data);
  try {
    let where = {
      psp_id: data?.psp_id,
    };
    if (data?.sub_merchant_id) {
      where.sub_merchant_id = data?.sub_merchant_id;
    }
    if (data?.receiver_id) {
      where.receiver_id = data?.receiver_id;
    }
    const [MID, created] = await PayoutMid.findOrCreate({
      where: where,
      defaults: {
        sub_merchant_id: data?.sub_merchant_id,
        receiver_id: data?.receiver_id,
        psp_id: data?.psp_id,
        primary_key:data?.primary_key,
        api_key: data?.api_key,
        password: data?.password,
        currency_code: data?.currency_code,
        country_iso_code: data?.country_iso_code,
        min_txn_amount: data?.min_txn_amount,
        max_txn_amount: data?.max_txn_amount,
        callback: data?.callback,
        priority: data?.priority || 0,
        status: data?.status || 1,
        deleted: data?.deleted || 0,
        created_at: new Date(),
        updated_at: new Date(),
      },
    });

    if (created) {
      return {
        status: httpStatus.OK,
        message: "MID created",
        data: MID.toJSON(),
      };
    } else if (MID) {
      return {
        status: httpStatus.BAD_REQUEST, // 409 Conflict is more accurate for "already exists"
        message: "MID already added",
      };
    } else {
      return {
        status: httpStatus.BAD_REQUEST,
        message: "MID not created",
      };
    }
  } catch (error) {
    console.error("Error finding or creating MID:", error);
    // throw error;
    return {
      status: httpStatus.INTERNAL_SERVER_ERROR,
      message: "Error finding or creating MID:" + error.message,
    };
  }
};

/**
 * Get MID By Sub Merchant ID
 * @param {*} id
 * @returns
 */
const getMIDById = async (sub_merchant_id, receiver_id) => {
  try {
    const MID = await PayoutMid.findOne({
      where: { sub_merchant_id, receiver_id },
    });
    return MID ? MID.toJSON() : null;
  } catch (error) {
    console.log("🚀 ~ getMIDById ~ error:", error);
    return null;
  }
};

/**
 * Get MID By ID
 * @param {*} id
 * @returns
 */
const getMIDByMIDId = async (id) => {
  const MID = await PayoutMid.findOne({ where: { id } });
  return MID ? MID.toJSON() : null;
};

/**
 * Get Specific MID
 * @param {*} id
 * @returns
 */
const getSpecificMID = async (wherePayload) => {
  const MID = await PayoutMid.findOne({ where: wherePayload });
  return MID ? MID.toJSON() : null;
};

/**
 * Get MID By ID
 * @param {*} id
 * @returns
 */
const getMIDList = async (sub_merchant_id) => {
  try {
    const result = await PayoutMid.findAndCountAll({
      include: [
        {
          model: Receiver,
          as: "receiver",
          required: false,
          attributes: ["id", "registered_name"],
        },
        {
          model: PayoutPsp,
          as: "psp",
          required: false,
          attributes: ["id", "psp_name"],
        },
      ],
      where: { sub_merchant_id },
    });
    return {
      status: 200,
      message: "",
      data: result.rows,
      total: result.count,
    };
  } catch (error) {
    console.error("Sequelize query failed:", error);
    return {
      status: 400,
      message: error.message,
    };
  }
};


/**
 * Get MID By ID
 * @param {*} id
 * @returns
 */
const getMIDBySubReceiverId = async (sub_merchant_id, receiver_id) => {
  let where = {};
  if (sub_merchant_id) {
    where.sub_merchant_id = sub_merchant_id;
  }
  if (receiver_id) {
    where.receiver_id = receiver_id;
  }
  
  const MIDs = await PayoutMid.findAll({ where });

  return MIDs.map(mid => mid.toJSON());
};

/**
 * Get MID By PSP ID
 * @param {*} id
 * @returns
 */
const getMIDByPSPId = async (psp_id) => {
  const MID = await PayoutMid.findOne({ where: { psp_id } });
  return MID ? MID.toJSON() : null;
};


const updatePayoutPspMid = async (MID_ID, updateData) => {
  try {
    const [updatedCount] = await PayoutMid.update(updateData, {
      where: {
        id: MID_ID,
        deleted: 0 // Only update if the record is not deleted
      }
    });

    if (updatedCount === 0) {
      return {
        status: httpStatus.NOT_FOUND,
        message: "MID not found or already updated"
      };
    }

    const updatedMID = await PayoutMid.findByPk(MID_ID);

    return {
      status: httpStatus.OK,
      message: "MID updated successfully",
      data: updatedMID.toJSON()
    };
  } catch (error) {
    console.error("Error updating MID:", error);
    return {
      status: httpStatus.INTERNAL_SERVER_ERROR,
      message: "Error updating MID: " + error.message
    };
  }
};

module.exports = {
  addMID,
  getMIDById,
  getMIDByMIDId,
  getMIDList,
  getMIDBySubReceiverId,
  getSpecificMID,
  getMIDByPSPId,
  updatePayoutPspMid
};
