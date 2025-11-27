const httpStatus = require("http-status");
const db = require("../models");
const PayoutScheduleMasters = db.payout_schedule_master;
const PayoutSchedulePlans = db.payout_schedule_plans;
const PayoutScheduleItems = db.payout_schedule_items;
const { Op, where } = require("sequelize");

const create_master_payout_schedule = async (data) => {
  try {
    const [PayoutScheduleMaster, created] =
      await PayoutScheduleMasters.findOrCreate({
        where: {
          sub_merchant_id: data?.sub_merchant_id,
          deleted: 0,
        },
        defaults: {
          super_merchant_id: data?.super_merchant_id,
          sub_merchant_id: data?.sub_merchant_id,
          plan_id: data?.plan_id,
          is_default: data?.is_default || 0,
          active: data?.active || 1,
          deleted: data?.deleted || 0,
        },
      });

    if (created) {
      return {
        status: httpStatus.OK,
        message: "Payout schedule plan applied successfully",
        data: PayoutScheduleMaster.toJSON(),
      };
    } else if (PayoutScheduleMaster) {
      return {
        status: httpStatus.BAD_REQUEST, // 409 Conflict is more accurate for "already exists"
        message: "Payout schedule plan already applied",
      };
    } else {
      return {
        status: httpStatus.BAD_REQUEST,
        message: "Payout schedule plan not applied",
      };
    }
  } catch (error) {
    console.error("Error finding or applying payout schedule plan:", error);
    // throw error;
    return {
      status: httpStatus.INTERNAL_SERVER_ERROR,
      message:
        "Error finding or applying payout schedule plan:" + error.message,
    };
  }
};

const get_payout_schedule_plan_by_merchant_id = async (where) => {
  try {
    const plan = await PayoutScheduleMasters.findOne({
      where: where,
      attributes: [
        ["id", "master_plan_id"],
        ["plan_id", "plan_id"],
        ["sub_merchant_id", "sub_merchant_id"],
        ["active", "active"],
        ["deleted", "deleted"],
        ["created_at", "created_at"],
        ["updated_at", "updated_at"],
      ],
    });
    if (plan) {
      return {
        status: httpStatus.OK,
        message: "Payout schedule plan fetched successfully",
        data: plan.toJSON(),
      };
    } else {
      return {
        status: httpStatus.NOT_FOUND,
        message: "No payout schedule plan found for this plan",
      };
    }
  } catch (error) {
    console.error("Error fetching payout schedule plan:", error);
    return {
      status: httpStatus.INTERNAL_SERVER_ERROR,
      message: "Error fetching payout schedule plan: " + error.message,
    };
  }
  // try {
  //   const plans = await PayoutScheduleMasters.findAll({
  //     where,
  //     attributes: [
  //       ["id", "master_plan_id"],
  //       ["plan_id", "plan_id"],
  //       ["sub_merchant_id", "sub_merchant_id"],
  //       ["active", "active"],
  //       ["deleted", "deleted"],
  //       ["created_at", "created_at"],
  //       ["updated_at", "updated_at"],
  //     ],
  //   });

  //   if (plans && plans.length > 0) {
  //     return {
  //       status: httpStatus.OK,
  //       message: "Payout schedule plans fetched successfully",
  //       data: plans.map((plan) => plan.toJSON()),
  //     };
  //   } else {
  //     return {
  //       status: httpStatus.NOT_FOUND,
  //       message: "No payout schedule plans found for this plan",
  //     };
  //   }
  // } catch (error) {
  //   console.error("❌ Error fetching payout schedule plans:", error);
  //   return {
  //     status: httpStatus.INTERNAL_SERVER_ERROR,
  //     message: "Error fetching payout schedule plans: " + error.message,
  //   };
  // }
};

const remove_payout_schedule_plan_by_merchant_id = async (sub_merchant_id) => {
  const updatedData = {
    deleted: 1,
    updated_at: new Date(),
  };

  try {
    const result = await PayoutScheduleMasters.update(updatedData, {
      where: { sub_merchant_id },
    });

    if (result[0] === 0) {
      return {
        status: httpStatus.NOT_FOUND,
        message: "No payout schedule plan found or not updated",
      };
    }

    return {
      status: httpStatus.OK,
      message: "Payout schedule plan removed",
    };
  } catch (error) {
    console.error("Update Error:", error);
    return {
      status: httpStatus.BAD_REQUEST,
      message: error?.message,
    };
  }
};

module.exports = {
  create_master_payout_schedule,
  get_payout_schedule_plan_by_merchant_id,
  remove_payout_schedule_plan_by_merchant_id,
};
