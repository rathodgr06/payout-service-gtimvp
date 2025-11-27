const httpStatus = require("http-status");
const db = require("../models");
const PayoutPSP = db.payout_psp;
const { Op } = require('sequelize');

const addPSP = async (data) => {
  try {
    const [PSP, created] = await PayoutPSP.findOrCreate({
      where: {
        psp_name: data?.psp_name,
      },
      defaults: {
        psp_name: data?.psp_name,
        country_id: data?.country_id || '',
        country_name: data?.country_name || '',
        remark: data?.remark || '',
        status: data?.status || 1,
        deleted: data?.deleted || 0,
        created_at: new Date(),
        updated_at: new Date(),
      },
    });

    if (created) {
      return {
        status: httpStatus.OK,
        message: "PSP created",
        data: PSP.toJSON(),
      };
    } else if (PSP) {
      return {
        status: httpStatus.CONFLICT, // 409 Conflict is more accurate for "already exists"
        message: "PSP already added",
      };
    } else {
      return {
        status: httpStatus.INTERNAL_SERVER_ERROR,
        message: "PSP not created",
      };
    }
  } catch (error) {
    console.error("Error finding or creating PSP:", error);
    // throw error;
    return {
      status: httpStatus.INTERNAL_SERVER_ERROR,
      message: "Error finding or creating PSP:" + error.message,
    };
  }
};

const getAllPSPs = async () => {
  try {
    const psps = await PayoutPSP.findAll({
      where: {
        deleted: 0 // assuming you only want non-deleted ones
      }
    });

    return {
      status: httpStatus.OK,
      message: "List of all PSPs",
      data: psps.map(psp => psp.toJSON())
    };
  } catch (error) {
    console.error("Error fetching PSPs:", error);
    return {
      status: httpStatus.INTERNAL_SERVER_ERROR,
      message: "Error fetching PSPs: " + error.message
    };
  }
};

const find_one = async (where) => {
  try {
    const psp = await PayoutPSP.findOne({
      where: where,
    });

    if (psp) {
      return {
        status: httpStatus.OK,
        message: "PSP fetch successfully",
        data: psp.toJSON(),
      };
    } else {
      return {
        status: httpStatus.NOT_FOUND,
        message: "PSP not found",
      };
    }
  } catch (error) {
    console.error("Error found PSP:", error);
    return {
      status: httpStatus.INTERNAL_SERVER_ERROR,
      message: "Error found PSP: " + error.message,
    };
  }
};

const updatePSP = async (pspId, updateData) => {
  try {
    const [updatedCount] = await PayoutPSP.update(updateData, {
      where: {
        id: pspId,
        deleted: 0 // Only update if the record is not deleted
      }
    });

    if (updatedCount === 0) {
      return {
        status: httpStatus.NOT_FOUND,
        message: "PSP not found or already deleted"
      };
    }

    const updatedPSP = await PayoutPSP.findByPk(pspId);

    return {
      status: httpStatus.OK,
      message: "PSP updated successfully",
      data: updatedPSP.toJSON()
    };
  } catch (error) {
    console.error("Error updating PSP:", error);
    return {
      status: httpStatus.INTERNAL_SERVER_ERROR,
      message: "Error updating PSP: " + error.message
    };
  }
};


const managePsp = async (pspId, updateData) => {
  try {
    const [updatedCount] = await PayoutPSP.update(updateData, {
      where: {
        id: pspId,
        deleted: 0 // Only update if the record is not deleted
      }
    });

    let message = "";
    if (updateData?.status === undefined) {
      message = updateData?.deleted == 1 ? "deleted" : "";
    }else if(updateData?.status !== undefined){
       message = updateData?.status == 1 ? "activated" : "disabled";
    }

    if (updatedCount === 0) {
      return {
        status: httpStatus.NOT_FOUND,
        message: "PSP not found or already " + message
      };
    }

    const updatedPSP = await PayoutPSP.findByPk(pspId);

    return {
      status: httpStatus.OK,
      message: "PSP " + message + " successfully!",
      data: updatedPSP.toJSON()
    };
  } catch (error) {
    console.error("Error updating PSP:", error);
    return {
      status: httpStatus.INTERNAL_SERVER_ERROR,
      message: "Error updating PSP: " + error.message
    };
  }
};

const deletePsp = async (pspId) => {
  try {
    const [updatedCount] = await PayoutPSP.update(
      { deleted: 1 }, // use number instead of string if the DB column is INT
      {
        where: {
          id: pspId,
          deleted: 0
        }
      }
    );

    if (updatedCount === 0) {
      return {
        status: httpStatus.NOT_FOUND,
        message: "PSP not found or already deleted"
      };
    }

    const updatedPSP = await PayoutPSP.findByPk(pspId);

    return {
      status: httpStatus.OK,
      message: "PSP deleted successfully",
      data: updatedPSP?.toJSON() ?? {}
    };
  } catch (error) {
    console.error("Error deleting PSP:", error);
    return {
      status: httpStatus.INTERNAL_SERVER_ERROR,
      message: "Error deleting PSP: " + error.message
    };
  }
};

module.exports = {
  addPSP,
  getAllPSPs,
  updatePSP,
  managePsp,
  deletePsp,
  find_one
};
