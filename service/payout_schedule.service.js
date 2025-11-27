const httpStatus = require("http-status");
const helperService = require("./helper.service");
const payoutScheduleDBService = require("./payout_schedule_plans.db.service");
const payoutScheduleItemsDBService = require("./payout_schedule_items.db.service");
const payoutScheduleMasterDBService = require("./payout_schedule_master.db.service");
const encryptDecryptService = require('./encrypt_decrypt.service');
const moment = require("moment");
const { get_sub_merchants } = require("./node_server_api.service");
const { Op } = require("sequelize");

/**
 * Add New Payout Schedule
 * @returns {Promise<User>}
 */
const create_payout_schedule_plan = async (payload) => {
  // Save mid
  let payout_schedule =
    await payoutScheduleDBService.create_payout_schedule_plan(payload);
  if (payout_schedule?.status !== httpStatus.OK) {
    return payout_schedule;
  }

  let plan_id = payout_schedule.data.id;

  let payout_time = payload?.payout_time;
  let items = payload?.items;
  payout_schedule.data.items = [];

  const createdItems = await Promise.all(
    items.map(async (item) => {
      item.plan_id = plan_id;
      const result = await create_payout_schedule_items(item, payout_time);
      let response = {};
      if (result?.status === httpStatus.OK) {
        response = {
          plan_item_id: result.data.id,
          ...result.data,
        };
        delete response.id;
      }
      return result?.status === httpStatus.OK ? response : null;
    })
  );

  // Filter out any failed items
  payout_schedule.data.items = createdItems.filter((item) => item !== null);
  payout_schedule.data.plan_id = plan_id;
  delete payout_schedule.data.id;

  const reorderedData = {
    plan_id: payout_schedule?.data?.plan_id,
    plan_name: payout_schedule?.data?.plan_name,
    country_iso_code: payout_schedule?.data?.country_iso_code,
    is_default: payout_schedule?.data?.is_default,
    active: payout_schedule?.data?.active,
    deleted: payout_schedule?.data?.deleted,
    created_at: payout_schedule?.data?.created_at,
    updated_at: payout_schedule?.data?.updated_at,
    schedules: payout_schedule?.data?.items,
  };

  let final_response = {
    status: payout_schedule.status,
    message: payout_schedule.message,
    data: reorderedData,
  };

  // Send success response
  return final_response;
};

const create_payout_schedule_items = async (payload, payout_time) => {
  const { plan_id, currency, frequency, occurrence, start, min_amount } =
    payload;

  let run_next_at = "";
  let formattedDate = "";
  try {
    const currentDate = moment().format("YYYY-MM-DD");

    const weekdays = {
      Sunday: 0,
      Monday: 1,
      Tuesday: 2,
      Wednesday: 3,
      Thursday: 4,
      Friday: 5,
      Saturday: 6,
    };

    const months = {
      Sunday: 0,
      Monday: 1,
      Tuesday: 2,
      Wednesday: 3,
      Thursday: 4,
      Friday: 5,
      Saturday: 6,
    };

    const now = moment();

    switch (frequency) {
      case "DAILY":
        const combinedDateTime = moment(`${currentDate} ${payout_time}`, "YYYY-MM-DD hh:mm A" );
         if (!combinedDateTime.isAfter(moment())) {
           combinedDateTime.add(occurrence, "days");
         }
        // DO Nothing already schedule today
        // formattedDate = combinedDateTime.format("YYYY-MM-DD hh:mm A");
        formattedDate = combinedDateTime.format("YYYY-MM-DD");
        break;

      case "WEEKLY":
        const targetWeekdayIndex = weekdays[start];
        // Create moment for the upcoming weekday
        let nextWeekday = moment()
          .day(targetWeekdayIndex)
          .hour(0)
          .minute(0)
          .second(0);
        // If today is the target day and the payout time has already passed, skip to next week
        if (
          now.day() === targetWeekdayIndex &&
          moment(
            `${now.format("YYYY-MM-DD")} ${payout_time}`,
            "YYYY-MM-DD hh:mm A"
          ).isBefore(now)
        ) {
          nextWeekday.add(occurrence, "weeks");
        }
        
        // If target day is before today (e.g., today is Wednesday, and target is Tuesday), move to next week
        if (nextWeekday.isBefore(now, "day")) {
          nextWeekday.add(occurrence, "weeks");
        }
        // Combine with payout time
        const nextRunDateTime = moment(
          `${nextWeekday.format("YYYY-MM-DD")} ${payout_time}`,
          "YYYY-MM-DD hh:mm A"
        );

        // formattedDate = nextRunDateTime.format("YYYY-MM-DD hh:mm A");
        formattedDate = nextRunDateTime.format("YYYY-MM-DD");

        break;

      case "MONTHLY":
        // ===== GET CURRENT TIME =====

        // ===== CREATE INITIAL TARGET DATE =====
        let scheduledDate = moment().date(start).format("YYYY-MM-DD");
        let scheduledDateTime = moment(
          `${scheduledDate} ${payout_time}`,
          "YYYY-MM-DD hh:mm A"
        );

        // ===== CHECK IF DATE PASSED, THEN ADD MONTHS =====
        while (scheduledDateTime.isSameOrBefore(now)) {
          scheduledDateTime.add(occurrence, "months").date(start);
          // Reset time after date change
          scheduledDateTime = moment(
            `${scheduledDateTime.format("YYYY-MM-DD")} ${payout_time}`,
            "YYYY-MM-DD hh:mm A"
          );
        }

        // formattedDate = scheduledDateTime.format("YYYY-MM-DD hh:mm A");
        formattedDate = scheduledDateTime.format("YYYY-MM-DD");

        break;
      case "QUARTERLY":
      
        // === Build first occurrence based on this year's starting month and day ===
        let scheduled = moment(`${start} ${payout_time}`, 'YYYY-MM-DD hh:mm A');

        // If first schedule was earlier this year and already passed, find next valid one
        if (scheduled.isBefore(now)) {
          while (scheduled.isSameOrBefore(now)) {
            scheduled.add(occurrence * 3, "months"); // QUARTERLY * occurrence => months to add
          }
        }

        // Set the correct time
        const nextRunDatetime = moment(
          `${scheduled.format("YYYY-MM-DD")} ${payout_time}`,
          "YYYY-MM-DD hh:mm A"
        );

        // formattedDate = nextRunDatetime.format("YYYY-MM-DD hh:mm A");
        formattedDate = nextRunDatetime.format("YYYY-MM-DD");

        break;
      default:
        throw new Error("Invalid frequency");
    }
  } catch (error) {
    console.log(
      "🚀 ~ constcreate_payout_schedule_items=catchAsync ~ error:",
      error
    );
  }
  run_next_at = formattedDate;

  const payload_item = {
    plan_id: plan_id,
    currency: currency,
    frequency: frequency,
    occurrence: occurrence,
    start: start,
    run_next_at: run_next_at,
    min_amount: min_amount,
    payout_time: payout_time,
  };

  return await payoutScheduleItemsDBService.create_payout_schedule_item(
    payload_item
  );
};

/**
 * Manage Payout Schedule
 * @returns {Promise<User>}
 */
const update_payout_schedule_plan = async (payload) => {
  // update payout schedule plan
  let payout_schedule =
    await payoutScheduleDBService.update_payout_schedule_plan(payload);
  if (payout_schedule?.status !== httpStatus.OK) {
    return payout_schedule;
  }

  let plan_id = payout_schedule.data.id;

  let payout_time = payload?.payout_time;
  let schedules = payload?.schedules;
  payout_schedule.data.schedules = [];


  // Check Removed Items
  let oldschedules = await get_payout_schedule_plan_by_id(payload?.plan_id);
  if (oldschedules?.status == httpStatus.OK) {
    let oldlist = oldschedules?.data?.schedules;
    const deletedItems = oldlist.filter(
      (item1) => !schedules.some((item2) => item2.currency === item1.currency)
    );
    deletedItems.map(async (deletedItem) => {
      deletedItem.plan_item_action = "DELETE";
      schedules.push(deletedItem);
    })
  }
  
  // update payout schedule plan items
  const createdItems = await Promise.all(
    schedules.map(async (schedule_item) => {
      if (schedule_item.plan_item_action == "UPDATE" || schedule_item.plan_item_action == "ADD") {
        // ADD | UPDATE
        schedule_item.plan_id = plan_id;
        const result = await update_payout_schedule_items(
          schedule_item,
          payout_time
        );
        let response = {};
        if (result?.status === httpStatus.OK) {
          response = {
            plan_item_id: result.data.id,
            ...result.data,
          };
          delete response.id;
        }
        return result?.status === httpStatus.OK ? response : null;
      }else if (schedule_item.plan_item_action == "DELETE") {
        // DELETE
        let result =  payoutScheduleItemsDBService.delete_payout_schedule_item_by_item_id(schedule_item.plan_item_id);
        if (result?.status === httpStatus.OK) {
          return result?.data;
        }
        return schedule_item;
      } else {

        return { status: httpStatus[400], message: "Invalid action!" };
      }
    })
  );

  // Filter out any failed items
  payout_schedule.data.schedules = createdItems.filter((item) => item !== null);
  payout_schedule.data.plan_id = plan_id;
  delete payout_schedule.data.id;

  const reorderedData = {
    plan_id: payout_schedule?.data?.plan_id,
    plan_name: payout_schedule?.data?.plan_name,
    country_iso_code: payout_schedule?.data?.country_iso_code,
    is_default: payout_schedule?.data?.is_default,
    active: payout_schedule?.data?.active,
    deleted: payout_schedule?.data?.deleted,
    created_at: payout_schedule?.data?.created_at,
    updated_at: payout_schedule?.data?.updated_at,
    schedules: payout_schedule?.data?.schedules,
  };

  let final_response = {
    status: payout_schedule.status,
    message: payout_schedule.message,
    data: reorderedData,
  };

  // Send success response
  return final_response;
};

const update_payout_schedule_items = async (payload, payout_time) => {
  const {
    plan_item_id,
    plan_id,
    currency,
    frequency,
    occurrence,
    start,
    min_amount,
  } = payload;

  let run_next_at = "";
  let formattedDate = "";
  try {
    const currentDate = moment().format("YYYY-MM-DD");

    const weekdays = {
      Sunday: 0,
      Monday: 1,
      Tuesday: 2,
      Wednesday: 3,
      Thursday: 4,
      Friday: 5,
      Saturday: 6,
    };

    const months = {
      Sunday: 0,
      Monday: 1,
      Tuesday: 2,
      Wednesday: 3,
      Thursday: 4,
      Friday: 5,
      Saturday: 6,
    };

    const now = moment();

    switch (frequency) {
      case "DAILY":
        const combinedDateTime = moment(
          `${currentDate} ${payout_time}`,
          "YYYY-MM-DD hh:mm A"
        );
        if (!combinedDateTime.isAfter(moment())) {
          combinedDateTime.add(occurrence, "days");
        }
        // DO Nothing already schedule today
        // formattedDate = combinedDateTime.format("YYYY-MM-DD hh:mm A");
        formattedDate = combinedDateTime.format("YYYY-MM-DD");
        break;

      case "WEEKLY":
        const targetWeekdayIndex = weekdays[start];
        // Create moment for the upcoming weekday
        let nextWeekday = moment()
          .day(targetWeekdayIndex)
          .hour(0)
          .minute(0)
          .second(0);
        // If today is the target day and the payout time has already passed, skip to next week
        if (
          now.day() === targetWeekdayIndex &&
          moment(
            `${now.format("YYYY-MM-DD")} ${payout_time}`,
            "YYYY-MM-DD hh:mm A"
          ).isBefore(now)
        ) {
          nextWeekday.add(occurrence, "weeks");
        }
        // If target day is before today (e.g., today is Wednesday, and target is Tuesday), move to next week
        if (nextWeekday.isBefore(now, "day")) {
          nextWeekday.add(occurrence, "weeks");
        }
        // Combine with payout time
        const nextRunDateTime = moment(
          `${nextWeekday.format("YYYY-MM-DD")} ${payout_time}`,
          "YYYY-MM-DD hh:mm A"
        );

        // formattedDate = nextRunDateTime.format("YYYY-MM-DD hh:mm A");
        formattedDate = nextRunDateTime.format("YYYY-MM-DD");

        break;

      case "MONTHLY":
        // ===== GET CURRENT TIME =====

        // ===== CREATE INITIAL TARGET DATE =====
        let scheduledDate = moment().date(start).format("YYYY-MM-DD");
        let scheduledDateTime = moment(
          `${scheduledDate} ${payout_time}`,
          "YYYY-MM-DD hh:mm A"
        );

        // ===== CHECK IF DATE PASSED, THEN ADD MONTHS =====
        while (scheduledDateTime.isSameOrBefore(now)) {
          scheduledDateTime.add(occurrence, "months").date(start);
          // Reset time after date change
          scheduledDateTime = moment(
            `${scheduledDateTime.format("YYYY-MM-DD")} ${payout_time}`,
            "YYYY-MM-DD hh:mm A"
          );
        }

        // formattedDate = scheduledDateTime.format("YYYY-MM-DD hh:mm A");
        formattedDate = scheduledDateTime.format("YYYY-MM-DD");

        break;
      case "QUARTERLY":

        let scheduled = moment(`${start} ${payout_time}`, 'YYYY-MM-DD hh:mm A');

        // If first schedule was earlier this year and already passed, find next valid one
        if (scheduled.isBefore(now)) {
          while (scheduled.isSameOrBefore(now)) {
            scheduled.add(occurrence * 3, "months"); // QUARTERLY * occurrence => months to add
          }
        }

        // Set the correct time
        // const nextRunDatetime = moment(
        //   `${scheduled.format("YYYY-MM-DD")} ${payout_time}`,
        //   "YYYY-MM-DD hh:mm A"
        // );

        const nextRunDatetime = moment(
          `${scheduled.format("YYYY-MM-DD")}`,
          "YYYY-MM-DD"
        );

        // formattedDate = nextRunDatetime.format("YYYY-MM-DD hh:mm A");
        formattedDate = nextRunDatetime.format("YYYY-MM-DD");

        break;
      default:
        throw new Error("Invalid frequency");
    }
  } catch (error) {
    console.log("Updated schedule date:", error);
  }

  run_next_at = formattedDate;

  const payload_item = {
    plan_item_id: plan_item_id,
    plan_id: plan_id,
    currency: currency,
    frequency: frequency,
    occurrence: occurrence,
    start: start,
    run_next_at: run_next_at,
    min_amount: min_amount,
    payout_time: payout_time,
  };

  return await payoutScheduleItemsDBService.update_payout_schedule_item(
    payload_item
  );
};



/**
 * Delete Payout Plan
 * @returns {Promise<User>}
 */
const delete_payout_schedule_plan = async (plan_id) => {
  // update payout schedule plan
  let payout_schedule_plan =
    await payoutScheduleDBService.delete_payout_schedule_plan(plan_id);
  if (payout_schedule_plan?.status !== httpStatus.OK) {
    return payout_schedule_plan;
  }

  let payout_schedule =
    await payoutScheduleItemsDBService.delete_payout_schedule_item_by_plan_id(plan_id);
  if (payout_schedule?.status !== httpStatus.OK) {
    return payout_schedule;
  }
  
  // Send success response
  return payout_schedule;
};

/**
 * Delete Payout Plan
 * @returns {Promise<User>}
 */
const active_disable_payout_schedule_plan = async (plan_id, flag) => {
  // update payout schedule plan
  let payout_schedule_plan =
    await payoutScheduleDBService.active_disable_payout_schedule_plan(plan_id, flag);
  if (payout_schedule_plan?.status !== httpStatus.OK) {
    return payout_schedule_plan;
  }

  let payout_schedule =
    await payoutScheduleItemsDBService.active_disable_payout_schedule_item_by_item_id(plan_id, flag);
  if (payout_schedule?.status !== httpStatus.OK) {
    return payout_schedule;
  }
  
  // Send success response
  return await get_payout_schedule_plan_by_id(plan_id);
};

const delete_payout_schedule_items = async (payload) => {
  const {
    plan_item_id,
    plan_id,
    currency,
    frequency,
    occurrence,
    start,
    min_amount,
  } = payload;

  const payload_item = {
    plan_item_id: plan_item_id,
    plan_id: plan_id,
    currency: currency,
    frequency: frequency,
    occurrence: occurrence,
    start: start,
    run_next_at: run_next_at,
    min_amount: min_amount,
    payout_time: payout_time,
  };

  return await payoutScheduleItemsDBService.update_payout_schedule_item(
    payload_item
  );
};

/**
 * Get Payout Schedule Plan By Id
 * @returns {Promise<User>}
 */
const get_payout_schedule_plan_by_id = async (plan_id) => {
  // Get Plan & items
  var payout_schedule_plan =
    await payoutScheduleDBService.get_payout_schedule_plan_by_id(plan_id);
  if (payout_schedule_plan?.status !== httpStatus.OK) {
    return payout_schedule_plan;
  }

  var responseData;
  if (payout_schedule_plan?.status === httpStatus.OK) {
    var plan_items_data =
      await payoutScheduleItemsDBService.get_payout_schedule_items_by_plan_id(
        plan_id
      );

    responseData = {
      ...payout_schedule_plan.data,
      schedules: plan_items_data.data,
    };
  }

  // Send success response
  return {
    status: httpStatus.OK,
    message: "Payout schedule plan found!",
    data: responseData,
  };
};

/**
 * List Payout Schedule Plan By Id
 * @returns {Promise<User>}
 */
const list_payout_schedule_plan_by_id = async (req) => {
  // Save items
  var payout_schedule_plan =
    await payoutScheduleDBService.get_paginated_payout_schedule_plans(req);
  // Send success response
  return payout_schedule_plan;
};

/**
 * Check Payout Schedule Plan By Date
 * @returns {Promise<User>}
 */
const check_payout_schedule = async (req) => {
  const { schedule_date } = req.body;
  // Save items
  var payout_schedule =
    await payoutScheduleItemsDBService.check_payout_schedule(schedule_date);
  if (payout_schedule?.status !== httpStatus.OK) {
    return payout_schedule;
  }
  // Send success response
  return payout_schedule;
};

/**
 * Create Mater Merchant Payout Schedule
 * @returns {Promise<User>}
 */
const create_master_payout_schedule = async (req) => {
  const { super_merchant_id, sub_merchant_id, plan_id } = req.body;
   
 const payload = {
    super_merchant_id: super_merchant_id,
    sub_merchant_id: await encryptDecryptService.decrypt(sub_merchant_id),
    plan_id: plan_id
  };
  console.log("🚀 ~ constcreate_master_payout_schedule= ~ payload:", payload)
  // Save items
  var payout_schedule = await payoutScheduleMasterDBService.create_master_payout_schedule(payload);
  if (payout_schedule?.status !== httpStatus.OK) {
    return payout_schedule;
  }

  // Send success response
  return payout_schedule;
};

/**
 * Get Master Merchant Payout Schedule
 * @returns {Promise<User>}
 */
const get_master_payout_schedule = async (req) => {
  const sub_merchant_id = req.params.sub_merchant_id;
  console.log("🚀 ~ get_master_payout_schedule ~ sub_merchant_id:", sub_merchant_id)
  
  let sub_merchant_id_dec = "";
  if (sub_merchant_id.length < 11) {
    sub_merchant_id_dec = sub_merchant_id;
  } else {
    sub_merchant_id_dec = await encryptDecryptService.decrypt(sub_merchant_id);
  }

  let where = {
    sub_merchant_id: sub_merchant_id_dec, // filter by your input
    deleted: 0, // filter by your input
  };

  // if (req?.user?.type === "merchant") {
  //   const sub_merchants = await get_sub_merchants(req.user.token);

  //   // Collect decrypted IDs into an array
  //   const decryptedIds = [];
  //   for (const element of sub_merchants?.data || []) {
  //     const decryptedId = await encryptDecryptService.decrypt(element.submerchant_id);
  //     decryptedIds.push(decryptedId);
  //   }

  //   // Add to where condition if IDs exist
  //   if (decryptedIds.length > 0) {
  //     where.sub_merchant_id = { [Op.in]: decryptedIds };
  //   }
  // }
  // console.log("🚀 ~ get_master_payout_schedule ~ where:", where)

  // Save items
  var payout_schedule = await payoutScheduleMasterDBService.get_payout_schedule_plan_by_merchant_id(where);
  console.log("🚀 ~ get_master_payout_schedule ~ payout_schedule:", payout_schedule)
  if (payout_schedule?.status !== httpStatus.OK) {
    return payout_schedule;
  }

  var responseData;
  // Get Plan & items
  var payout_schedule_plan =
    await payoutScheduleDBService.get_payout_schedule_plan_by_id(payout_schedule?.data?.plan_id);
  if (payout_schedule_plan?.status !== httpStatus.OK) {
    return payout_schedule_plan;
  }

  var plan_items_data;
  if (payout_schedule_plan?.status === httpStatus.OK) {
    plan_items_data =
      await payoutScheduleItemsDBService.get_payout_schedule_items_by_plan_id(
        payout_schedule?.data?.plan_id
      );

    // responseData = {
    //   ...payout_schedule_plan.data,
    //   schedules: plan_items_data.data,
    // };
  }

  responseData = {
    ...payout_schedule.data,
    ...payout_schedule_plan.data,
    schedules: plan_items_data.data,
  };

  payout_schedule.data = responseData;

  // Send success response
  return payout_schedule;
};


/**
 * Remove Mater Merchant Payout Schedule
 * @returns {Promise<User>}
 */
const remove_master_payout_schedule = async (req) => {
  const { sub_merchant_id } = req.body;

  let sub_merchant_id_dec = await encryptDecryptService.decrypt(
    sub_merchant_id
  );

  // Save items
  var payout_schedule =
    await payoutScheduleMasterDBService.remove_payout_schedule_plan_by_merchant_id(
      sub_merchant_id_dec
    );
  if (payout_schedule?.status !== httpStatus.OK) {
    return payout_schedule;
  }

  // Send success response
  return payout_schedule;
};

module.exports = {
  create_payout_schedule_plan,
  create_payout_schedule_items,
  update_payout_schedule_plan,
  update_payout_schedule_items,
  get_payout_schedule_plan_by_id,
  list_payout_schedule_plan_by_id,
  check_payout_schedule,
  delete_payout_schedule_plan,
  active_disable_payout_schedule_plan,
  create_master_payout_schedule,
  get_master_payout_schedule,
  remove_master_payout_schedule
};
