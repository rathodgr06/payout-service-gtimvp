const httpStatus = require("http-status");
const db = require("../models");
const Receiver = db.receiver;
const ReceiverKeySecret = db.receiver_key_secret;
const { Op } = require('sequelize');
const { decrypt } = require("./encrypt_decrypt.service");
const helperService = require("./helper.service");
const { get_sub_merchants } = require("./node_server_api.service");

const addNewReceiver = async (data) => {
  try {

    let where = {
      deleted: 0
    };
    if (data?.sub_merchant_id) {
      where.sub_merchant_id = data?.sub_merchant_id;
    }else if (data?.email) {
      where.email = data?.email;
    }

    const [receiver, created] = await Receiver.findOrCreate({
      where: where,
      defaults: {
        sub_merchant_id: data?.sub_merchant_id,
        receiver_name: data?.receiver_name,
        registered_business_address: data?.registered_business_address,
        email: data?.email,
        code: data?.code,
        mobile_no: data?.mobile_no,
        referral_code: data?.referral_code,
        webhook_url: data?.webhook_url,
        webhook_secret: data?.webhook_secret,
        verification: data?.verification || "pending",
        active: data?.active || 1,
        deleted: 0,
        created_at: new Date(),
        updated_at: new Date(),
      },
    });

    if (created) {
      return {
        status: httpStatus.OK,
        message: "Receiver created",
        data: receiver.toJSON(),
      };
    } else if (receiver) {
      return {
        status: httpStatus.CONFLICT, // 409 Conflict is more accurate for "already exists"
        message: "Receiver already added",
      };
    } else {
      return {
        status: httpStatus.INTERNAL_SERVER_ERROR,
        message: "Receiver not created",
      };
    }
  } catch (error) {
    console.error("Error finding or creating receiver:", error);
    // throw error;
    return {
      status: httpStatus.INTERNAL_SERVER_ERROR,
      message: "Error finding or creating receiver:" + error.message,
    };
  }
};

/**
 * Get Receiver By Id
 * @param {*} id 
 * @returns 
 */
const getReceiverById = async (id) => {
  const receiver = await Receiver.findOne({
    where: { id },
    attributes: [
      ["id", "receiver_id"],
      "sub_merchant_id",
      "receiver_name",
      "registered_business_address",
      "email",
      "code",
      "mobile_no",
      "referral_code",
      "webhook_url",
      "webhook_secret",
      "verification",
      "active",
      "deleted",
      "created_at",
      "updated_at",
    ],
  });
  return receiver ? receiver.toJSON() : null;
};

/**
 * Get Receiver By Id
 * @param {*} id 
 * @returns 
 */
const getReceiverBySubMerchantId = async (sub_merchant_id) => {
  const receiver = await Receiver.findOne({
    where: { sub_merchant_id },
    attributes: [
      ["id", "receiver_id"],
      "sub_merchant_id",
      "receiver_name",
      "registered_business_address",
      "email",
      "code",
      "mobile_no",
      "referral_code",
      "webhook_url",
      "webhook_secret",
      "verification",
      "active",
      "created_at",
      "updated_at",
    ],
  });
  return receiver ? receiver.toJSON() : null;
};

/**
 * Update Receiver DB
 * @param {*} data
 * @returns
 */
const update_receiver = async (data) => {
  try {
    // Step 1: Check if the receiver exists
    const existingReceiver = await Receiver.findByPk(data?.receiver_id);

    if (!existingReceiver) {
      return {
        status: httpStatus.NOT_FOUND,
        message: "Receiver not found",
      };
    }

    // Step 2: Attempt the update
    const [updatedCount] = await Receiver.update(data, {
      where: {
        id: data?.receiver_id,
      },
    });

    if (updatedCount > 0) {
      const updatedReceiver = await Receiver.findByPk(data?.receiver_id);
      return {
        status: httpStatus.OK,
        message: "Receiver updated",
        data: {
          receiver_id: updatedReceiver.id,
          ...updatedReceiver.toJSON(),
        },
      };
    } else {
      return {
        status: httpStatus.BAD_REQUEST,
        message: "Receiver already updated",
      };
    }
  } catch (error) {
    console.error("Error finding or updating receiver:", error);
    return {
      status: httpStatus.INTERNAL_SERVER_ERROR,
      message: "Error finding or updating receiver: " + error.message,
    };
  }
};

/**
 * Update a receiver's verification status to "verified".
 * @param {string} receiverId - ID of the receiver (primary key or unique field).
 * @returns {Promise<Object>} - Result message and updated receiver.
 */
async function verifyReceiver(receiverId) {
  try {
    const receiver = await Receiver.findByPk(receiverId);

    if (!receiver) {
      return {
        status: 404,
        message: "Receiver not found",
      };
    }

    if (receiver.verification == "verified") {
      return {
        status: 400,
        message: "Receiver already verified",
      };
    }

    receiver.verification = "verified";
    await receiver.save();

    return {
      status: 200,
      message: "Receiver verification updated to verified",
      data: receiver ? receiver.toJSON() : null,
    };
  } catch (error) {
    console.error("Error updating receiver:", error);
    return {
      status: 500,
      message: "Internal server error",
    };
  }
}

const deleteReceiverById = async (id) => {
  const receiver = await Receiver.findOne({ where: { id } });

  if (!receiver) {
    return {
      status: 404,
      message: 'Receiver not found',
    };
  }

  await receiver.destroy();

  return {
    status: 200,
    message: 'Receiver deleted successfully',
  };
};



/**
 * Get Receiver List
 * @returns {Promise<User>}
 */
const get_receiver_list = async (req, res) => {
  const {
    page,
    per_page,
    receiver_id,
    email,
    mobile_no,
    country,
    create_date,
    update_date,
  } = req.body;

  let sub_merchant_id = req.body.sub_merchant_id;
  
  let limit = null;
  if (per_page) {
     limit = parseInt(per_page);
  }
  
  let offset = null;
  if (page) {
     offset = (parseInt(page) - 1) * limit;
  }

  let where = {};

  // OR logic for sub_merchant_id
  if (sub_merchant_id === undefined) {
    // No filtering at all (skip setting sub_merchant_id)
  } else if (sub_merchant_id === null || sub_merchant_id === "" || sub_merchant_id == 0) {
    // If null or empty string, treat it as needing sub_merchant_id = 0 OR NULL
    where.sub_merchant_id = {
      [Op.or]: [0, null, ''],
    };
  } else {
    // Else, filter with exact match
    where.sub_merchant_id = sub_merchant_id;
  }

  // OR logic for receiver_id
  if (receiver_id === undefined) {
    // No filtering at all (skip setting receiver_id)
  } else if (receiver_id === null || receiver_id === "" || receiver_id == 0) {
    // If null or empty string, treat it as needing receiver_id = 0 OR NULL
    where.id = {
      [Op.or]: [0, null, ''],
    };
  } else {
    // Else, filter with exact match
    where.id = receiver_id;
  }
  // if (receiver_id) where.id = receiver_id;
  if (email) where.email = email;
  if (mobile_no) where.mobile_no = mobile_no;
  if (country) where.registered_business_address = country;

  // Helper function to parse date ranges
  const parseDateRange = (rangeStr) => {
    const [start, end] = rangeStr.split("/");
    return {
      [Op.between]: [new Date(start), new Date(end)],
    };
  };

  if (create_date) where.created_at = parseDateRange(create_date);
  if (update_date) where.updated_at = parseDateRange(update_date);


  if (req?.user?.type === "merchant") {
      const sub_merchants = await get_sub_merchants(req.user.token);

      // Collect decrypted IDs into an array
      const decryptedIds = [];
      for (const element of sub_merchants?.data || []) {
        const decryptedId = await decrypt(
          element.submerchant_id
        );
        decryptedIds.push(decryptedId);
      }

          
      // Add to where condition if IDs exist
      if (decryptedIds.length > 0) {
        where.sub_merchant_id = { [Op.in]: decryptedIds };
      }
      
    } else {
      if (where.sub_merchant_id && where.sub_merchant_id.length > 10) {
        where.sub_merchant_id = await decrypt(where.sub_merchant_id);
      }
    }

  console.log("🚀 ~ get_receiver_list ~ where:", where);

  try {
    const result = await Receiver.findAndCountAll({
      where,
      limit,
      offset,
      order: [["id", "DESC"]],
      attributes: [
        ["id", "receiver_id"],
        "sub_merchant_id",
        "receiver_name",
        "registered_business_address",
        "email",
        "code",
        "mobile_no",
        "referral_code",
        "webhook_url",
        "webhook_secret",
        "verification",
        "active",
        "deleted",
        "created_at",
        "updated_at",
      ],
    });

    const formattedData = result.rows.map((row) => {
      const json = row.toJSON();

      return {
        receiver_id: json.receiver_id,
        sub_merchant_id: json.sub_merchant_id === '' ? null : json.sub_merchant_id, // rename
        receiver_name: json.receiver_name,
        registered_business_address: json.registered_business_address,
        email: json.email,
        code: json.code,
        mobile_no: json.mobile_no,
        referral_code: json.referral_code,
        webhook_url: json.webhook_url,
        webhook_secret: json.webhook_secret,
        verification: json.verification,
        active: json.active,
        deleted: json.deleted,
        created_at: json.created_at,
        updated_at: json.updated_at,
      };
    });

    return {
      status: 200,
      message: "",
      // data: result.rows,
      data: formattedData,
      total: result.count,
      page: parseInt(page),
      per_page: limit,
    };
  } catch (error) {
    console.error("Sequelize query failed:", error);
    return {
      status: 400,
      message: error.message,
    };
  }
};


const addReceiverKeyAndSecret = async (data) => {
  try {

    const [receiver_key_secret, created] = await ReceiverKeySecret.findOrCreate({
      where: {
        receiver_key: data?.receiver_key,
        receiver_secret: data?.receiver_secret,
      },
      defaults: {
        receiver_id: data?.receiver_id,
        type: data?.type,
        receiver_key: data?.receiver_key,
        receiver_secret: data?.receiver_secret,
        deleted: 0,
        created_at: new Date(),
      },
    });

    if (created) {
      return {
        status: httpStatus.OK,
        message: "Receiver Key created",
        data: receiver_key_secret.toJSON(),
      };
    } else if (receiver_key_secret) {
      return {
        status: httpStatus.CONFLICT, // 409 Conflict is more accurate for "already exists"
        message: "Receiver key already added",
      };
    } else {
      return {
        status: httpStatus.INTERNAL_SERVER_ERROR,
        message: "Receiver key not created",
      };
    }
  } catch (error) {
    console.error("Error finding or creating receiver key:", error);
    // throw error;
    return {
      status: httpStatus.INTERNAL_SERVER_ERROR,
      message: "Error finding or creating receiver key:" + error.message,
    };
  }
};


const addOrUpdateReceiverKeyAndSecret = async (data) => {
  console.log("🚀 ~ addOrUpdateReceiverKeyAndSecret ~ data:", data)
  try {
    // Try to find existing record by receiver_id and type
    const existing = await Receiver.findOne({
      where: {
        id: data?.id,
        deleted: 0,
      },
    });
    console.log("🚀 ~ addOrUpdateReceiverKeyAndSecret ~ existing:", existing)

    if (existing) {
      // 🔁 Update existing record
      existing.webhook_url = data?.webhook_url || existing.webhook_url;
      existing.webhook_secret = data?.webhook_secret || existing.webhook_secret;
      existing.updated_at = new Date();

      await existing.save();

      return {
        status: httpStatus.OK,
        message: "Receiver key updated successfully",
        data: existing.toJSON(),
      };
    } else {
      // ➕ Create new record if not found
      const newRecord = await ReceiverKeySecret.create({
        receiver_id: data?.id,
        webhook_url: data?.webhook_url,
        webhook_secret: data?.webhook_secret,
        deleted: 0,
        updated_at: new Date(),
      });

      return {
        status: httpStatus.CREATED,
        message: "Receiver key created successfully",
        data: newRecord.toJSON(),
      };
    }
  } catch (error) {
    console.error("❌ Error adding or updating receiver key:", error);
    return {
      status: httpStatus.INTERNAL_SERVER_ERROR,
      message: "Error adding or updating receiver key: " + error.message,
    };
  }
};


const find_receiver_key = async (receiver_key, receiver_secret) => {
  const receiver_key_secret = await ReceiverKeySecret.findOne({ where: { receiver_key,  receiver_secret, deleted: 0} });

  if (!receiver_key_secret) {
    return {
      status: 404,
      message: 'Receiver key not found',
    };
  }

  return {
    status: 200,
    message: 'Receiver key found',
    data: receiver_key_secret.toJSON()
  };
};

const get_receiver_count = async (condition) => {
  try {
    const count = await Receiver.count({ where: condition }); 

    return {
      status: 200,
      message: count > 0 ? 'Receiver(s) found' : 'No receivers found',
      data: { count },
    };
  } catch (error) {
    return {
      status: 500,
      message: 'Error retrieving receiver count',
      error: error.message,
    };
  }
};

const find_receiver_keys_by_receiver_id = async (receiver_id) => {
  const receiver_key_secrets = await ReceiverKeySecret.findAll({ where: { receiver_id: receiver_id, deleted: 0 } });

  if (!receiver_key_secrets || receiver_key_secrets.length === 0) {
    return {
      status: 404,
      message: 'Receiver keys not found',
    };
  }

  return {
    status: 200,
    message: 'Receiver keys found',
    data: receiver_key_secrets.map((item) => item.toJSON())
  };
};

const update_receiver_key = async (id, updateData) => {
  console.log("🚀 ~ update_receiver_key ~ updateData:", updateData)
  console.log("🚀 ~ update_receiver_key ~ id:", id)
  try {
    // Find existing receiver key/secret
    const receiver_key_secret = await ReceiverKeySecret.findOne({
      where: { id },
    });
    console.log("🚀 ~ update_receiver_key ~ receiver_key_secret:", receiver_key_secret)

    if (!receiver_key_secret) {
      return {
        status: 404,
        message: 'Receiver key not found',
      };
    }

    // Update allowed fields
    await receiver_key_secret.update({
      ...updateData,
      created_at: new Date(),
    });

    return {
      status: 200,
      message: 'Receiver key updated successfully',
      data: receiver_key_secret.toJSON(),
    };
  } catch (error) {
    console.error('Error updating receiver key:', error);
    return {
      status: 500,
      message: 'Error updating receiver key: ' + error.message,
    };
  }
};

module.exports = {
  addNewReceiver,
  get_receiver_list,
  update_receiver,
  verifyReceiver,
  getReceiverById,
  getReceiverBySubMerchantId,
  deleteReceiverById,
  addReceiverKeyAndSecret,
  find_receiver_key,
  find_receiver_keys_by_receiver_id,
  get_receiver_count,
  addOrUpdateReceiverKeyAndSecret,
  update_receiver_key
};
