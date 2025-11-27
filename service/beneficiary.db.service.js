const httpStatus = require("http-status");
const db = require("../models");
const bcrypt = require("bcrypt");
const Payer = db.payer;
const Beneficiary = db.beneficiary;
const Receiver = db.receiver;

const addNewSenderReceiver = async (data) => {
  try {
    const [beneficiary, created] = await Beneficiary.findOrCreate({
      where: {
        super_merchant_id: data?.super_merchant_id,
        sub_merchant_id: data?.sub_merchant_id,
        iban: data?.iban,
      },
      defaults: {
        super_merchant_id: data?.super_merchant_id,
        sub_merchant_id: data?.sub_merchant_id,
        iban: data?.iban,
        registered_name: data?.registered_name,
        country_iso_code: data?.country_iso_code,
        address: data?.address,
        city: data?.city,
        transaction_types: data?.transaction_types,
        verification: data?.verification || "pending",
        active: data?.active || 1,
        created_at: new Date(),
        updated_at: new Date(),
      },
    });

    if (created) {
      return {
        status: httpStatus.OK,
        message: "Beneficiary created",
        data: beneficiary.toJSON(),
      };
    } else if (beneficiary) {
      return {
        status: httpStatus.CONFLICT, // 409 Conflict is more accurate for "already exists"
        message: "Beneficiary already added",
      };
    } else {
      return {
        status: httpStatus.INTERNAL_SERVER_ERROR,
        message: "Beneficiary not created",
      };
    }
  } catch (error) {
    console.error("Error finding or creating beneficiary:", error);
    // throw error;
    return {
      status: httpStatus.INTERNAL_SERVER_ERROR,
      message: "Error finding or creating beneficiary:" + error.message,
    };
  }
};

/**
 * Get Receiver By Id
 * @param {*} id 
 * @returns 
 */
const getBeneficiaryById = async (id) => {
  const beneficiary = await Beneficiary.findOne({ where: { id } });
  return beneficiary ? beneficiary.toJSON() : null;
};

/**
 * Update Receiver DB
 * @param {*} data
 * @returns
 */
const update_receiver = async (data) => {
  try {
    const [updatedCount] = await Beneficiary.update(data, {
      where: {
        id: data?.receiver_id,
      },
    });

    if (updatedCount > 0) {
      const updatedBeneficiary = await Beneficiary.findByPk(data?.receiver_id);
      return {
        status: httpStatus.OK,
        message: "Beneficiary updated",
        data: {
          receiver_id: updatedBeneficiary.id,
          ...updatedBeneficiary.toJSON(),
        },
      };
    } else {
      return {
        status: httpStatus.NOT_FOUND,
        message: "Beneficiary not found or data unchanged",
      };
    }
  } catch (error) {
    console.error("Error finding or updating beneficiary:", error);
    // throw error;
    return {
      status: httpStatus.INTERNAL_SERVER_ERROR,
      message: "Error finding or updating beneficiary:" + error.message,
    };
  }
};

/**
 * Update a beneficiary's verification status to "verified".
 * @param {string} beneficiaryId - ID of the beneficiary (primary key or unique field).
 * @returns {Promise<Object>} - Result message and updated beneficiary.
 */
async function verifyBeneficiary(beneficiaryId) {
  try {
    const beneficiary = await Beneficiary.findByPk(beneficiaryId);

    if (!beneficiary) {
      return {
        status: 404,
        message: "Beneficiary not found",
      };
    }

    beneficiary.verification = "verified";
    await beneficiary.save();

    return {
      status: 200,
      message: "Beneficiary verification updated to verified",
      data: beneficiary,
    };
  } catch (error) {
    console.error("Error updating beneficiary:", error);
    return {
      status: 500,
      message: "Internal server error",
    };
  }
}

const addNewPayer = async (params) => {
  const { first_name, last_name, service_id, service_name, active } = params;
  const payerData = {
    first_name,
    last_name,
    service_id,
    service_name,
    active: 1,
  };

  const [row, created] = await Payer.findOrCreate({
    where: { Payer: user.email },
    defaults: user,
  });
  if (created) {
    return row;
  }
  return null;
};


const getAllUsers = async (filter, options) => {
  const users = await User.findAll();
  return users;
};

const getUserByEmail = async (email) => {
  return User.findOne({ where: { email } });
};

const updateUserById = async (userId, updateBody) => {
  const { firstname, lastname, username, email, password, active } = updateBody;
  const user = {
    firstname,
    lastname,
    username,
    email,
    active,
  };
  if (password) {
    const salt = bcrypt.genSaltSync(10);
    const hash = bcrypt.hashSync(password, salt);
    user.password = hash;
  }

  const row = await User.update(user, {
    where: { id: userId },
  });
  return row;
};

const deleteReceiverById = async (receiver_id) => {
  console.log("🚀 ~ deleteReceiverById ~ id:", receiver_id)
  const [affectedRows] = await Receiver.update(
    { deleted: 1 },
    {
      where: { id: receiver_id },
      individualHooks: true,
    }
  );
  console.log("🚀 ~ deleteReceiverById ~ affectedRows:", affectedRows)

  // Nothing was updated
  if (affectedRows === 0) {
    return {
      status: 404,
      message: "Receiver not found",
    };
  }

  // Fetch the updated record manually
  const beneficiary = await Receiver.findOne({ where: { id: receiver_id } });

  return {
    status: 200,
    message: "Receiver deleted successfully",
    data: beneficiary.toJSON(),
  };
};

const deleteUserById = async (userId) => {
  const user = await getUserById(userId);
  if (!user) return null;
  await user.destroy();
  return user;
};

module.exports = {
  addNewSenderReceiver,
  update_receiver,
  verifyBeneficiary,
  getBeneficiaryById,
  deleteReceiverById,
  addNewPayer,
  getAllUsers,
  getUserByEmail,
  updateUserById,
  deleteUserById,
};
