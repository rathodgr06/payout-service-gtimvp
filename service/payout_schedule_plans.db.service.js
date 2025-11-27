const httpStatus = require("http-status");
const db = require("../models");
const PayoutSchedulePlans = db.payout_schedule_plans;
const PayoutScheduleItems = db.payout_schedule_items;
const { Op, where } = require("sequelize");

const create_payout_schedule_plan = async (data) => {
  try {
    const [PayoutSchedulePlan, created] =
      await PayoutSchedulePlans.findOrCreate({
        where: {
          plan_name: data?.plan_name,
        },
        defaults: {
          plan_name: data?.plan_name,
          country_iso_code: data?.country_iso_code,
          is_default: data?.is_default || 0,
          active: data?.active || 1,
          deleted: data?.deleted || 0,
        },
      });

    if (created) {
      return {
        status: httpStatus.OK,
        message: "Payout schedule plan created successfully",
        data: PayoutSchedulePlan.toJSON(),
      };
    } else if (PayoutSchedulePlan) {
      return {
        status: httpStatus.BAD_REQUEST, // 409 Conflict is more accurate for "already exists"
        message: "Payout schedule plan already added",
      };
    } else {
      return {
        status: httpStatus.BAD_REQUEST,
        message: "Payout schedule plan not created",
      };
    }
  } catch (error) {
    console.error("Error finding or creating payout schedule plan:", error);
    // throw error;
    return {
      status: httpStatus.INTERNAL_SERVER_ERROR,
      message:
        "Error finding or creating payout schedule plan:" + error.message,
    };
  }
};

const update_payout_schedule_plan = async (data) => {
  console.log(data);
  try {
    const existingPlan = await PayoutSchedulePlans.findOne({
      where: { id: data?.plan_id },
    });

    if (existingPlan) {
      // Update existing plan
      await existingPlan.update({
        plan_name: data?.plan_name,
        country_iso_code: data?.country_iso_code,
        is_default: data?.is_default,
        updated_at: new Date(),
      });

      return {
        status: httpStatus.OK,
        message: "Payout schedule plan updated successfully",
        data: existingPlan.toJSON(),
      };
    } else {
      return {
        status: httpStatus.NOT_FOUND,
        message: "Payout schedule plan not found",
      };
    }
  } catch (error) {
    console.error("Error creating or updating payout schedule plan:", error);
    return {
      status: httpStatus.INTERNAL_SERVER_ERROR,
      message:
        "Error creating or updating payout schedule plan: " + error.message,
    };
  }
};

const get_payout_schedule_plan_by_id = async (plan_id) => {
  try {
    const plan = await PayoutSchedulePlans.findOne({
      where: { id: plan_id }, // assuming your primary key column is `id`
      attributes: [
        ["id", "plan_id"],
        ["plan_name", "plan_name"],
        ["country_iso_code", "country_iso_code"],
        ["is_default", "is_default"],
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
        message: "Payout schedule plan not found",
      };
    }
  } catch (error) {
    console.error("Error fetching payout schedule plan:", error);
    return {
      status: httpStatus.INTERNAL_SERVER_ERROR,
      message: "Error fetching payout schedule plan: " + error.message,
    };
  }
};

const get_paginated_payout_schedule_plans = async (req) => {
  try {
    const { page, per_page, country_iso_code, is_default, deleted, status } =
      req.body;
    const limit = parseInt(per_page);
    const offset = (parseInt(page) - 1) * limit;

    let where = {};

    if (country_iso_code) where.country_iso_code = country_iso_code;
    if (is_default) {
      where.is_default = is_default;
    }else{
      if (is_default !== undefined) {
        where.is_default = 0;
      }
    };
    if (status) {
      where.active = status;
    }else{
      if (status !== undefined) {
        where.active = 0;
      }
    };
    
    // where.active = (status === 0 || status === "0") ? 0 : 1;
    where.deleted = deleted == 1 ? 1 : 0;
    console.log("🚀 ~ constget_paginated_payout_schedule_plans= ~ where:", where)

    const { count, rows } = await PayoutSchedulePlans.findAndCountAll({
      distinct: true, // 🔥 fixes over-counting when using include
      where: where,
      limit: limit,
      offset,
      order: [["id", "DESC"]],
      include: [
        {
          model: PayoutScheduleItems,
          as: "schedules",
          where: {
            deleted: 0,
          },
          required: false,
        },
      ],
      attributes: [
        ["id", "plan_id"],
        ["plan_name", "plan_name"],
        ["country_iso_code", "country_iso_code"],
        ["is_default", "is_default"],
        ["active", "active"],
        ["deleted", "deleted"],
        ["created_at", "created_at"],
        ["updated_at", "updated_at"],
      ],
    });

    const totalPages = Math.ceil(count / per_page);
    const list = rows.map((plan) => plan.toJSON());

    return {
      status: httpStatus.OK,
      message: "Payout schedule plans fetched successfully",
      data: {
        plans: list,
        pagination: {
          total: count,
          per_page,
          current_page: page,
          total_pages: totalPages,
        },
      },
    };
  } catch (error) {
    console.error("Error fetching payout schedule plans with items:", error);
    return {
      status: httpStatus.INTERNAL_SERVER_ERROR,
      message: "Error fetching payout schedule plans: " + error.message,
    };
  }
};


const delete_payout_schedule_plan = async (plan_id) => {
  try {
    const existingPlan = await PayoutSchedulePlans.findOne({
      where: { id: plan_id },
    });

    if (existingPlan) {
      // Update existing plan
      await existingPlan.update({
        deleted: 1,
      });

      return {
        status: httpStatus.OK,
        message: "Payout schedule plan deleted successfully",
        data: existingPlan.toJSON(),
      };
    } else {
      return {
        status: httpStatus.NOT_FOUND,
        message: "Payout schedule plan not found",
      };
    }
  } catch (error) {
    console.error("Error creating or deleting payout schedule plan:", error);
    return {
      status: httpStatus.INTERNAL_SERVER_ERROR,
      message:
        "Error creating or deleting payout schedule plan: " + error.message,
    };
  }
};


const active_disable_payout_schedule_plan = async (plan_id, active) => {
  try {
    const existingPlan = await PayoutSchedulePlans.findOne({
      where: { id: plan_id, deleted: 0 },
    });

    if (existingPlan) {
      // Update existing plan
      await existingPlan.update({
        active: active,
        updated_at: new Date(),
      });

      return {
        status: httpStatus.OK,
        message: "Payout schedule plan activated successfully",
        data: existingPlan.toJSON(),
      };
    } else {
      return {
        status: httpStatus.NOT_FOUND,
        message: "Payout schedule plan not found or deleted",
      };
    }
  } catch (error) {
    console.error("Error creating or activating payout schedule plan:", error);
    return {
      status: httpStatus.INTERNAL_SERVER_ERROR,
      message:
        "Error creating or activating payout schedule plan: " + error.message,
    };
  }
};

module.exports = {
  create_payout_schedule_plan,
  update_payout_schedule_plan,
  get_payout_schedule_plan_by_id,
  get_paginated_payout_schedule_plans,
  delete_payout_schedule_plan,
  active_disable_payout_schedule_plan
};
