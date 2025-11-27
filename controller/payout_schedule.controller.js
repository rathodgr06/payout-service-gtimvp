const payoutScheduleService = require("../service/payout_schedule.service");
const helperService = require("../service/helper.service");
const { verifyAccessToken } = require("../service/token.service");
const catchAsync = require("../utils/catchAsync");
const httpStatus = require("http-status");
const moment = require("moment");

/**
 * Add Payout Schedule Plan
 */
const create_payout_schedule_plan = catchAsync(async (req, res) => {
  const { plan_name, country_iso_code, is_default, items } = req.body;
  const payload = {
    plan_name: plan_name,
    country_iso_code: country_iso_code,
    is_default: is_default,
    items: items,
    payout_time: '09:00 AM'
  };
  const payout_schedule =
    await payoutScheduleService.create_payout_schedule_plan(payload);
  if (payout_schedule?.status !== httpStatus.OK) {
    res.status(httpStatus.BAD_REQUEST).send(payout_schedule);
    return;
  }
  
  res.status(httpStatus.OK).send(payout_schedule);
});

/**
 * Verify create_payout_schedule_items
 */
const create_payout_schedule_items = catchAsync(async (req, res) => {
  const {
    plan_id,
    currency,
    frequency,
    occurrence,
    start,
    min_amount,
    payout_time,
  } = req.body;

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

        // === Build first occurrence based on this year's starting month and day ===
        let scheduled = moment(`${start} ${payout_time}`, 'YYYY-MM-DD hh:mm A');

        // If first schedule was earlier this year and already passed, find next valid one
        if (scheduled.isBefore(now)) {
          while (scheduled.isSameOrBefore(now)) {
            scheduled.add(occurrence * 3, 'months'); // QUARTERLY * occurrence => months to add
          }
        }

        // Set the correct time
        const nextRunDatetime = moment(`${scheduled.format('YYYY-MM-DD')} ${payout_time}`, 'YYYY-MM-DD hh:mm A');

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

  const payload = {
    plan_id: plan_id,
    currency: currency,
    frequency: frequency,
    occurrence: occurrence,
    start: start,
    run_next_at: run_next_at, // calculate TODO
    min_amount: min_amount,
    payout_time: payout_time,
  };

  // res.status(httpStatus.OK).send(payload);
  // return; // Temp

  const payout_schedule_items =
    await payoutScheduleService.create_payout_schedule_items(payload);
  if (payout_schedule_items?.status !== httpStatus.OK) {
    res.status(httpStatus.BAD_REQUEST).send(payout_schedule_items);
    return;
  }
  res.status(httpStatus.OK).send(payout_schedule_items);
});


/**
 * Update Payout Schedule Plan
 */
const update_payout_schedule_plan = catchAsync(async (req, res) => {
  const { plan_id, plan_name, country_iso_code, is_default } = req.body;
  const payload = {
    plan_id: plan_id,
    plan_name: plan_name,
    country_iso_code: country_iso_code,
    is_default: is_default,
  };
  const payout_schedule =
    await payoutScheduleService.update_payout_schedule_plan(payload);
  if (payout_schedule?.status !== httpStatus.OK) {
    res.status(httpStatus.OK).send(payout_schedule);
    return;
  }
  res.status(httpStatus.OK).send(payout_schedule);
});


/**
 * Verify create_payout_schedule_items
 */
const update_payout_schedule_items = catchAsync(async (req, res) => {
  const {
    plan_item_id,
    // plan_id,
    currency,
    frequency,
    occurrence,
    start,
    min_amount,
    payout_time,
  } = req.body;

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
        
      let scheduled = moment(`${start} ${payout_time}`, "YYYY-MM-DD hh:mm A");

        // If first schedule was earlier this year and already passed, find next valid one
        if (scheduled.isBefore(now)) {
          while (scheduled.isSameOrBefore(now)) {
            scheduled.add(occurrence * 3, 'months'); // QUARTERLY * occurrence => months to add
          }
        }

        // Set the correct time
        const nextRunDatetime = moment(`${scheduled.format('YYYY-MM-DD')} ${payout_time}`, 'YYYY-MM-DD hh:mm A');

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

  const payload = {
    plan_item_id: plan_item_id,
    // plan_id: plan_id,
    currency: currency,
    frequency: frequency,
    occurrence: occurrence,
    start: start,
    run_next_at: run_next_at, // calculate TODO
    min_amount: min_amount,
    payout_time: payout_time,
  };

  // res.status(httpStatus.OK).send(payload);
  // return; // Temp

  const payout_schedule_items =
    await payoutScheduleService.update_payout_schedule_items(payload);
  if (payout_schedule_items?.status !== httpStatus.OK) {
    res.status(httpStatus.BAD_REQUEST).send(payout_schedule_items);
    return;
  }
  res.status(httpStatus.OK).send(payout_schedule_items);
});

/**
 *  get_payout_schedule_plan_by_id
 */
const get_payout_schedule_plan_by_id = catchAsync(async (req, res) => {
  const plan_id = req.params.plan_id;
  const payout_schedule_plan = await payoutScheduleService.get_payout_schedule_plan_by_id(plan_id);
  if (payout_schedule_plan?.status !== httpStatus.OK) {
    res.status(httpStatus.OK).send(payout_schedule_plan);
    return;
  }
  res.status(httpStatus.OK).send(payout_schedule_plan);
});

/**
 *  list_payout_schedule_plan_by_id
 */
const list_payout_schedule_plan_by_id = catchAsync(async (req, res) => {
  const payout_schedule_plan = await payoutScheduleService.list_payout_schedule_plan_by_id(req);
  console.log("🚀 ~ payout_schedule_plan:", payout_schedule_plan)
  if (payout_schedule_plan?.status !== httpStatus.OK) {
    res.status(httpStatus.OK).send(payout_schedule_plan);
    return;
  }
  res.status(httpStatus.OK).send(payout_schedule_plan);
});

/**
 *  manage_payout_schedule_plan
 */
const manage_payout_schedule_plan = catchAsync(async (req, res) => {
  const { plan_action, plan_id, plan_name, country_iso_code, is_default, schedules } = req.body;

  if (plan_action == "UPDATE") {
    // Update Plan
    const payload = {
      plan_id: plan_id,
      plan_name: plan_name,
      country_iso_code: country_iso_code,
      is_default: is_default,
      schedules: schedules,
      payout_time: "09:00 AM",
    };
    const payout_schedule =
      await payoutScheduleService.update_payout_schedule_plan(payload);
    if (payout_schedule?.status !== httpStatus.OK) {
      res.status(httpStatus.BAD_REQUEST).send(payout_schedule);
      return;
    }

    return res.status(httpStatus.OK).send(payout_schedule);

  } else if (plan_action == "DELETE") {
    // Delete Plan
    const payout_schedule =
      await payoutScheduleService.delete_payout_schedule_plan(plan_id);
    if (payout_schedule?.status !== httpStatus.OK) {
      res.status(httpStatus.BAD_REQUEST).send(payout_schedule);
      return;
    }

    return res.status(httpStatus.OK).send(payout_schedule);

  }else if (plan_action == "ACTIVE" || plan_action == "DISABLE") {
    let flag = plan_action == "ACTIVE" ? 1 : 0;

    // Delete Plan
    const payout_schedule =
      await payoutScheduleService.active_disable_payout_schedule_plan(
        plan_id,
        flag
      );
    if (payout_schedule?.status !== httpStatus.OK) {
      res.status(httpStatus.BAD_REQUEST).send(payout_schedule);
      return;
    }

    return res.status(httpStatus.OK).send({
      status: httpStatus.OK,
      message: "Payout schedule plan status updated successfully",
      data: payout_schedule.data,
    });
  }

  return res.status(httpStatus.OK).send(payout_schedule);
});

/**
 *  check_payout_schedule
 */
const check_payout_schedule = catchAsync(async (req, res) => {
  const payout_schedule_plan = await payoutScheduleService.check_payout_schedule(req);
  if (payout_schedule_plan?.status !== httpStatus.OK) {
    res.status(httpStatus.OK).send(payout_schedule_plan);
    return;
  }
  res.status(httpStatus.OK).send(payout_schedule_plan);
});

/**
 *  payout_re_schedule
 */
const payout_re_schedule = catchAsync(async (req, res) => {

  const {
    plan_item_id,
    plan_id,
    currency,
    frequency,
    occurrence,
    start,
    min_amount,
  } = req.body;

  let payload = {
    plan_item_id: plan_item_id,
    plan_id: plan_id,
    currency: currency,
    frequency: frequency,
    occurrence: occurrence,
    start: start,
    min_amount: min_amount,
  }; 
  let payout_time = "09:00 AM"
  const payout_schedule_plan = await payoutScheduleService.update_payout_schedule_items(payload, payout_time);
  if (payout_schedule_plan?.status !== httpStatus.OK) {
    res.status(httpStatus.OK).send(payout_schedule_plan);
    return;
  }
  res.status(httpStatus.OK).send(payout_schedule_plan);
});

/**
 * Verify create_master_payout_schedule
 */
const create_master_payout_schedule = catchAsync(async (req, res) => {
  const receiver = await payoutScheduleService.create_master_payout_schedule(req);
  if (receiver?.status !== httpStatus.OK) {
    res.status(httpStatus.BAD_REQUEST).send(receiver);
    return;
  }
  res.status(httpStatus.OK).send(receiver);
});

/**
 * Get master_payout_schedule
 */
const get_master_payout_schedule = catchAsync(async (req, res) => {
  const receiver = await payoutScheduleService.get_master_payout_schedule(req);
  if (receiver?.status !== httpStatus.OK) {
    res.status(httpStatus.BAD_REQUEST).send(receiver);
    return;
  }
  res.status(httpStatus.OK).send(receiver);
});

/**
 * Remove master_payout_schedule
 */
const remove_master_payout_schedule = catchAsync(async (req, res) => {
  const receiver = await payoutScheduleService.remove_master_payout_schedule(req);
  if (receiver?.status !== httpStatus.OK) {
    res.status(httpStatus.BAD_REQUEST).send(receiver);
    return;
  }
  res.status(httpStatus.OK).send(receiver);
});

/**
 * Verify create_master_payout_schedule
 */
const manage_master_payout_schedule = catchAsync(async (req, res) => {
  const receiver = await payoutScheduleService.create_master_payout_schedule(req);
  if (receiver?.status !== httpStatus.OK) {
    res.status(httpStatus.BAD_REQUEST).send(receiver);
    return;
  }
  res.status(httpStatus.OK).send(receiver);
});

module.exports = {
  create_payout_schedule_plan,
  create_payout_schedule_items,
  create_master_payout_schedule,
  update_payout_schedule_plan,
  update_payout_schedule_items,
  get_payout_schedule_plan_by_id,
  list_payout_schedule_plan_by_id,
  check_payout_schedule,
  manage_payout_schedule_plan,
  payout_re_schedule,
  get_master_payout_schedule,
  manage_master_payout_schedule,
  remove_master_payout_schedule
};
