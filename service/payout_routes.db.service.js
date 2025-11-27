const httpStatus = require("http-status");
const db = require("../models");
const PayoutRoutes = db.payout_routes;

const addRoute = async (data) => {
  try {
    const [payoutRoutes, created] = await PayoutRoutes.findOrCreate({
      where: {
        country_iso: data?.country_iso,
        account_type: data?.account_type,
        currency: data?.currency,
        psp_name: data?.psp_name,
        psp_id: data?.psp_id,
      },
      defaults: {
        country_name: data?.country_name,
        country_iso: data?.country_iso,
        account_type: data?.account_type,
        account_type_name: data?.account_type_name,
        currency: data?.currency,
        payer_id: data?.payer_id,
        psp_name: data?.psp_name,
        psp_id: data?.psp_id,
        created_at: new Date(),
        updated_at: new Date(),
      },
    });

    if (created) {
      return {
        status: httpStatus.OK,
        message: "Route created",
        data: payoutRoutes.toJSON(),
      };
    } else if (payoutRoutes) {
      return {
        status: httpStatus.CONFLICT, // 409 Conflict is more accurate for "already exists"
        message: "Route already added",
      };
    } else {
      return {
        status: httpStatus.INTERNAL_SERVER_ERROR,
        message: "Route not created",
      };
    }
  } catch (error) {
    console.error("Error finding or creating route:", error);
    // throw error;
    return {
      status: httpStatus.INTERNAL_SERVER_ERROR,
      message: "Error finding or creating route:" + error.message,
    };
  }
};

const getAllRoutes = async () => {
  try {
    const routes = await PayoutRoutes.findAll({
      order: [['created_at', 'DESC']],
    });
    return {
      status: httpStatus.OK,
      message: "List of all payout routes",
      data: routes.map(route => route.toJSON()),
    };
  } catch (error) {
    console.error("Error fetching routes:", error);
    return {
      status: httpStatus.INTERNAL_SERVER_ERROR,
      message: "Error fetching routes: " + error.message,
    };
  }
};

const findRoutesByCriteria = async ({ country_iso, account_type, currency, payer_id }) => {
  try {
    const routes = await PayoutRoutes.findAll({
      where: {
        country_iso,
        account_type,
        currency,
        payer_id,
      },
    });

    return {
      status: httpStatus.OK,
      message: "Filtered list of payout routes",
      data: routes.map(route => route.toJSON()),
    };
  } catch (error) {
    console.error("Error fetching routes:", error);
    return {
      status: httpStatus.INTERNAL_SERVER_ERROR,
      message: "Error fetching routes: " + error.message,
    };
  }
};

module.exports = {
  addRoute,
  getAllRoutes,
  findRoutesByCriteria
};
