const httpStatus = require("http-status");
const db = require("../models");
const PayoutScheduleItems = db.payout_schedule_items;
const PayoutSchedulePlans = db.payout_schedule_plans;
const { Op } = require("sequelize");

const create_payout_schedule_item = async (data) => {
  try {
    const [PayoutScheduleItem, created] =
      await PayoutScheduleItems.findOrCreate({
        where: {
          plan_id: data?.plan_id,
          currency: data?.currency,
          frequency: data?.frequency,
        },
        defaults: {
          plan_id: data?.plan_id,
          currency: data?.currency,
          frequency: data?.frequency,
          occurrence: data?.occurrence,
          start: data?.start,
          run_next_at: data?.run_next_at,
          min_amount: data?.min_amount,
          payout_time: data?.payout_time,
          active: data?.active || 1,
          deleted: data?.deleted || 0,
          // created_at: new Date(),
          // updated_at: new Date(),
        },
      });

    if (created) {
      return {
        status: httpStatus.OK,
        message: "Payout schedule item created successfully",
        data: PayoutScheduleItem.toJSON(),
      };
    } else if (PayoutScheduleItem) {
      return {
        status: httpStatus.BAD_REQUEST, // 409 Conflict is more accurate for "already exists"
        message: "Payout schedule item already added",
      };
    } else {
      return {
        status: httpStatus.BAD_REQUEST,
        message: "Payout schedule item not created",
      };
    }
  } catch (error) {
    console.error("Error finding or creating payout schedule item:", error);
    // throw error;
    return {
      status: httpStatus.INTERNAL_SERVER_ERROR,
      message:
        "Error finding or creating payout schedule item:" + error.message,
    };
  }
};

const update_payout_schedule_item = async (data) => {
  try {
    if (data?.plan_item_id == undefined || data?.plan_item_id == '') {
      // Create
      return await create_payout_schedule_item(data);
    }

    const existingPlan = await PayoutScheduleItems.findOne({
      where: { id: data?.plan_item_id },
    });

    if (existingPlan) {
      // Update existing plan
      await existingPlan.update({
        currency: data?.currency,
        frequency: data?.frequency,
        occurrence: data?.occurrence,
        start: data?.start,
        run_next_at: data?.run_next_at,
        min_amount: data?.min_amount,
        payout_time: data?.payout_time,
        updated_at: new Date(),
      });

      return {
        status: httpStatus.OK,
        message: "Payout schedule plan item updated successfully",
        data: existingPlan.toJSON(),
      };
    } else {
      return {
        status: httpStatus.NOT_FOUND,
        message: "Payout schedule plan item not found",
      };
    }
  } catch (error) {
    console.error(
      "Error creating or updating payout schedule plan item:",
      error
    );
    return {
      status: httpStatus.INTERNAL_SERVER_ERROR,
      message:
        "Error creating or updating payout schedule plan item: " +
        error.message,
    };
  }
};

const get_payout_schedule_items_by_plan_id = async (plan_id) => {
  try {
    const items = await PayoutScheduleItems.findAll({
      where: {
        plan_id: plan_id,
        deleted: 0,
      },
      order: [["id", "ASC"]], // optional: sorts by id
      attributes: [
        ["id", "plan_item_id"],
        ["plan_id", "plan_id"],
        ["currency", "currency"],
        ["frequency", "frequency"],
        ["occurrence", "occurrence"],
        ["start", "start"],
        ["run_next_at", "run_next_at"],
        ["min_amount", "min_amount"],
        ["payout_time", "payout_time"],
        ["active", "active"],
        ["deleted", "deleted"],
        ["created_at", "created_at"],
        ["updated_at", "updated_at"],
      ],
    });

    if (items && items.length > 0) {
      return {
        status: httpStatus.OK,
        message: "Payout schedule items fetched successfully",
        data: items.map((item) => {
          const json = item.toJSON();
          return json;
        }),
      };
    } else {
      return {
        status: httpStatus.NOT_FOUND,
        message: "No payout schedule items found for this plan",
      };
    }
  } catch (error) {
    console.error("Error fetching payout schedule items:", error);
    return {
      status: httpStatus.INTERNAL_SERVER_ERROR,
      message: "Error fetching payout schedule items: " + error.message,
    };
  }
};

const check_payout_schedule = async (schedule_date) => {
  try {
    const items = await PayoutScheduleItems.findAll({
      where: {
        run_next_at: schedule_date,
        active: 1,
        deleted: 0,
      },
      include: [
        {
          model: PayoutSchedulePlans,
          as: "plan", // adjust based on your alias
          attributes: [
            ["id", "plan_id"],
            ["plan_name", "plan_name"], // Example: Add more fields as needed
            ["country_iso_code", "country_iso_code"],
            ["is_default", "is_default"],
            ["active", "active"],
            ["deleted", "deleted"],
            ["created_at", "created_at"],
            ["updated_at", "updated_at"],
          ],
        },
      ],
      order: [["id", "ASC"]],
      attributes: [
        ["id", "plan_item_id"],
        ["plan_id", "plan_id"],
        ["currency", "currency"],
        ["frequency", "frequency"],
        ["occurrence", "occurrence"],
        ["start", "start"],
        ["run_next_at", "run_next_at"],
        ["min_amount", "min_amount"],
        ["payout_time", "payout_time"],
        ["active", "active"],
        ["deleted", "deleted"],
        ["created_at", "created_at"],
        ["updated_at", "updated_at"],
      ],
    });

    if (items && items.length > 0) {
      return {
        status: httpStatus.OK,
        message: "Payout schedule items fetched successfully",
        data: items.map((item) => item.toJSON()),
      };
    } else {
      return {
        status: httpStatus.NOT_FOUND,
        message: "No payout schedule items found for this plan",
      };
    }
  } catch (error) {
    console.error("Error fetching payout schedule items:", error);
    return {
      status: httpStatus.INTERNAL_SERVER_ERROR,
      message: "Error fetching payout schedule items: " + error.message,
    };
  }
};

const delete_payout_schedule_item_by_plan_id = async (plan_id) => {
  try {
    const existingPlans = await PayoutScheduleItems.findAll({
      where: { plan_id: plan_id },
    });

    if (existingPlans.length > 0) {
      // Update each plan item individually
      await Promise.all(
        existingPlans.map((item) =>
          item.update({ deleted: 1, updated_at: new Date() })
        )
      );

      return {
        status: httpStatus.OK,
        message: "Payout schedule plan items deleted successfully",
        data: existingPlans.map((item) => item.toJSON()),
      };
    } else {
      return {
        status: httpStatus.NOT_FOUND,
        message: "No payout schedule plan items found for this plan_id",
      };
    }
  } catch (error) {
    console.error("Error deleting payout schedule plan items:", error);
    return {
      status: httpStatus.INTERNAL_SERVER_ERROR,
      message: "Error deleting payout schedule plan items: " + error.message,
    };
  }
};

const delete_payout_schedule_item_by_item_id = async (plan_item_id) => {
  try {
    const existingPlan = await PayoutScheduleItems.findOne({
      where: { id: plan_item_id },
    });

    if (existingPlan) {
      // Update existing plan
      await existingPlan.update({
        deleted: 1,
        updated_at: new Date(),
      });

      return {
        status: httpStatus.OK,
        message: "Payout schedule plan item updated successfully",
        data: existingPlan.toJSON(),
      };
    } else {
      return {
        status: httpStatus.NOT_FOUND,
        message: "Payout schedule plan item not found",
      };
    }
  } catch (error) {
    console.error(
      "Error creating or updating payout schedule plan item:",
      error
    );
    return {
      status: httpStatus.INTERNAL_SERVER_ERROR,
      message:
        "Error creating or updating payout schedule plan item: " +
        error.message,
    };
  }
};

const active_disable_payout_schedule_item_by_item_id = async (plan_id, flag) => {
  try {
    const existingPlans = await PayoutScheduleItems.findAll({
      where: { plan_id: plan_id, deleted: 0},
    });

    if (existingPlans.length > 0) {
      // Update each plan item individually
      await Promise.all(
        existingPlans.map((item) =>
          item.update({ active: flag, updated_at: new Date() })
        )
      );

      return {
        status: httpStatus.OK,
        message: "Payout schedule plan items status updated successfully",
        data: existingPlans.map((item) => item.toJSON()),
      };
    } else {
      return {
        status: httpStatus.NOT_FOUND,
        message: "No payout schedule plan items found for this plan_id",
      };
    }
  } catch (error) {
    console.error("Error updating payout schedule plan items:", error);
    return {
      status: httpStatus.INTERNAL_SERVER_ERROR,
      message: "Error updating payout schedule plan items: " + error.message,
    };
  }
};

module.exports = {
  create_payout_schedule_item,
  update_payout_schedule_item,
  get_payout_schedule_items_by_plan_id,
  check_payout_schedule,
  delete_payout_schedule_item_by_plan_id,
  delete_payout_schedule_item_by_item_id,
  active_disable_payout_schedule_item_by_item_id
};
  