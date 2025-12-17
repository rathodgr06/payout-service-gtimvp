const Joi = require("joi");
const jwt = require("jsonwebtoken");
const { verifyAccessToken } = require("../service/token.service");
const transactionsService = require("../service/transactions.service");
const receiverService = require("../service/receiver.service");
const httpStatus = require("http-status");
const catchAsync = require("../utils/catchAsync");
const {
  get_receiver_id_by_key_secret,
} = require("../service/receiver.service");
const {
  get_sub_merchant_details,
} = require("../service/node_server_api.service");
const nodeServerAPIService = require("../service/node_server_api.service");
const helperService = require("../service/helper.service");
const transactionService = require("../service/transactions.service");

const headers = {
  //TODO
};

const check_access_token = catchAsync(async (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  if (token) {
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, async (err, payload) => {
      if (err) {
        console.log("🚀 ~ err:", err.message);
        next();
        if (err.message == "jwt expired") {
          // res.status(403).send({
          //   status: 404,
          //   message: "Token Expired Please Login",
          //   code: "E0059",
          // });
        } else {
          // res.status(403).send({
          //   status: 403,
          //   message: "Unable To Validate Token",
          //   code: "E0060",
          // });
        }
      } else {
        let user = await verifyAccessToken(payload.payload);
        user.token = token;
        req.user = user;
        // console.log("🚀 ~ user:", user);
        if (req.user?.type === "admin" || req.user?.type === "merchant") {
          next();
        } else {
          res.status(403).send({
            status: 403,
            message:
              "Access is restricted to administrators and merchant only.",
            code: "E0060",
          });
        }
      }
    });
  } else {
    next();
  }
});

const add_receiver = catchAsync(async (req, res, next) => {
  let X_USERNAME = process.env.A_X_USERNAME;
  let X_PASSWORD = process.env.A_X_PASSWORD;
  let username = req.headers["xusername"];
  let password = req.headers["xpassword"];
  try {
    if (username == X_USERNAME && password == X_PASSWORD) {
      req.user = {
        type: "admin",
        key: username,
        secret: password,
      };
      next();
    } else {
      var response = {
        status: 401,
        message: "Invalid access keys",
        code: "E0060",
      };
      res.status(httpStatus.OK).send(response);
    }
  } catch (error) {
    console.log(error);
  }
});

const API_USER = catchAsync(async (req, res, next) => {
  let X_USERNAME = process.env.A_X_USERNAME;
  let X_PASSWORD = process.env.A_X_PASSWORD;
  let username = req.headers["xusername"];
  let password = req.headers["xpassword"];
  let merchant_key = req.headers["merchant-key"];
  let merchant_secret = req.headers["merchant-secret"];
  let receiver_key = req.headers["receiver-key"];
  let receiver_secret = req.headers["receiver-secret"];
  try {
    if (username == X_USERNAME && password == X_PASSWORD) {
      req.user = {
        type: "admin",
        key: username,
        secret: password,
      };
      next();
    } else if (receiver_key && receiver_secret) {
      req.user = {
        type: "receiver",
        key: receiver_key,
        secret: receiver_secret,
      };

      let sub_merchant_id = req.body.sub_merchant_id;
      let receiver_id = req.body.receiver_id;
      let wallet_id = req.body.wallet_id;

      let result = await get_receiver_id_by_key_secret(
        receiver_key,
        receiver_secret
      );
      console.log("🚀 ~ result:", result);
      if (result?.status != 200) {
        if (result?.data?.receiver_id != receiver_id) {
          var response = {
            status: 401,
            message: "Invalid receiver key",
            code: "E0060",
          };
          return res.status(httpStatus.OK).send(response);
        }
      }

      // >>>>>>>>>>>>>>>>>>>>>>>
      // Check Env mode
      if (result?.data?.type !== process.env.PAYOUT_MODE) {
        var response = {
          status: 401,
          message: "Invalid receiver key",
          code: "E0060",
        };
        return res.status(httpStatus.OK).send(response);
      }

      // If receiever in request
      if (receiver_id) {
        if (result?.status == 200 && result?.data?.receiver_id) {
          if (result?.data?.receiver_id != receiver_id) {
            var response = {
              status: 401,
              message: "Invalid receiver key",
              code: "E0060",
            };
            res.status(httpStatus.OK).send(response);
          } else {
            next();
          }
        } else {
          var response = {
            status: 401,
            message: "Invalid receiver key",
            code: "E0060",
          };
          res.status(httpStatus.OK).send(response);
        }
      } else if (sub_merchant_id) {
        next();
        // let sub_merchant_result = await nodeServerAPIService.get_sub_merchant_details(sub_merchant_id);
        // console.log("🚀 ~ sub_merchant_result:", sub_merchant_result)
        // if (result?.status == 200 && sub_merchant_result?.data?.receiver_id) {
        //   if (result?.data?.receiver_id != sub_merchant_result?.data?.receiver_id) {
        //     var response = {
        //       status: 401,
        //       message: "Invalid receiver key",
        //       code: "E0060",
        //     };
        //     res.status(httpStatus.OK).send(response);
        //   } else {
        //     next();
        //   }
        // } else {
        //   var response = {
        //     status: 401,
        //     message: "Invalid receiver key",
        //     code: "E0060",
        //   };
        //   res.status(httpStatus.OK).send(response);
        // }
      } else if (wallet_id) {
        let wallet_result = await nodeServerAPIService.get_wallet_details_by_id(
          wallet_id
        );
        console.log("🚀 ~ wallet_result:", wallet_result);
        if (result?.status == 200 && wallet_result?.data?.receiver_id) {
          if (result?.data?.receiver_id != wallet_result?.data?.receiver_id) {
            var response = {
              status: 401,
              message: "Invalid receiver key",
              code: "E0060",
            };
            res.status(httpStatus.OK).send(response);
          } else {
            next();
          }
        } else {
          var response = {
            status: 401,
            message: "Invalid receiver key",
            code: "E0060",
          };
          res.status(httpStatus.OK).send(response);
        }
      } else {
        next();
      }
    } else if (merchant_key && merchant_secret) {
      req.user = {
        type: "merchant",
        key: merchant_key,
        secret: merchant_secret,
      };

      let sub_merchant_id = req.body.sub_merchant_id;
      let receiver_id = req.body.receiver_id;
      let wallet_id = req.body.wallet_id;

      let result = await nodeServerAPIService.check_merchant_key(
        merchant_key,
        merchant_secret
      );
      console.log("🚀 check_merchant_key ~ result:", result);

      // >>>>>>>>>>>>>>>>>>>>>>>
      // Check Env mode
      if (result?.data?.type !== process.env.PAYOUT_MODE) {
        var response = {
          status: 401,
          message: "Invalid merchant key",
          code: "E0060",
        };
        return res.status(httpStatus.OK).send(response);
      }

      if (sub_merchant_id) {
        if (result?.status == 200 && result?.data?.merchant_id) {
          if (result?.data?.merchant_id != sub_merchant_id) {
            var response = {
              status: 401,
              message: "Invalid merchant key",
              code: "E0060",
            };
            res.status(httpStatus.OK).send(response);
          } else {
            next();
          }
        } else {
          var response = {
            status: 401,
            message: "Invalid merchant key",
            code: "E0060",
          };
          res.status(httpStatus.OK).send(response);
        }
      } else if (receiver_id) {
        let receiver_result = await receiverService.get_receiver_by_id(
          receiver_id
        );
        console.log("🚀 ~ receiver_result:", receiver_result);
        console.log("🚀 ~ receiver_key_result:", result?.data);
        if (result?.status == 200 && receiver_result?.sub_merchant_id) {
          if (result?.data?.merchant_id != receiver_result?.sub_merchant_id) {
            var response = {
              status: 401,
              message: "Invalid merchant key",
              code: "E0060",
            };
            res.status(httpStatus.OK).send(response);
          } else {
            next();
          }
        } else {
          var response = {
            status: 401,
            message: "Invalid merchant key",
            code: "E0060",
          };
          res.status(httpStatus.OK).send(response);
        }
      } else if (wallet_id) {
        let wallet_result = await nodeServerAPIService.get_wallet_details_by_id(
          wallet_id
        );
        console.log("🚀 ~ wallet_result:", wallet_result);
        if (result?.status == 200 && wallet_result?.data?.sub_merchant_id) {
          if (
            result?.data?.merchant_id != wallet_result?.data?.sub_merchant_id
          ) {
            var response = {
              status: 401,
              message: "Invalid merchant key",
              code: "E0060",
            };
            res.status(httpStatus.OK).send(response);
          } else {
            next();
          }
        } else {
          var response = {
            status: 401,
            message: "Invalid merchant key",
            code: "E0060",
          };
          res.status(httpStatus.OK).send(response);
        }
      } else {
        next();
      }
    } else {
      var response = {
        status: 401,
        message: "Invalid access keys",
        code: "E0060",
      };
      res.status(httpStatus.OK).send(response);
    }
  } catch (error) {
    console.log(error);
  }
});

//
const get_receiver_by_id = catchAsync(async (req, res, next) => {
  let X_USERNAME = process.env.A_X_USERNAME;
  let X_PASSWORD = process.env.A_X_PASSWORD;
  let username = req.headers["xusername"];
  let password = req.headers["xpassword"];
  let receiver_key = req.headers["receiver-key"];
  let receiver_secret = req.headers["receiver-secret"];
  try {
    if (username == X_USERNAME && password == X_PASSWORD) {
      req.user = {
        type: "admin",
        key: username,
        secret: password,
      };
      next();
    } else if (receiver_key && receiver_secret) {
      let receiver_id = req.params.receiver_id;

      req.user = {
        type: "receiver",
        key: receiver_key,
        secret: receiver_secret,
      };

      let result = await get_receiver_id_by_key_secret(
        receiver_key,
        receiver_secret
      );
      console.log("🚀 ~ result:", result);
      if (result?.status == 200 && result?.data?.receiver_id) {
        // >>>>>>>>>>>>>>>>>>>>>>>
        // Check Env mode
        if (result?.data?.type !== process.env.PAYOUT_MODE) {
          var response = {
            status: 401,
            message: "Invalid receiver key",
            code: "E0060",
          };
          return res.status(httpStatus.OK).send(response);
        }

        if (result?.data?.receiver_id != receiver_id) {
          var response = {
            status: 401,
            message: "Invalid receiver key",
            code: "E0060",
          };
          res.status(httpStatus.OK).send(response);
        } else {
          next();
        }
      } else {
        var response = {
          status: 401,
          message: "Invalid receiver key",
          code: "E0060",
        };
        res.status(httpStatus.OK).send(response);
      }
    } else {
      var response = {
        status: 401,
        message: "Invalid access keys",
        code: "E0060",
      };
      res.status(httpStatus.OK).send(response);
    }
  } catch (error) {
    console.log(error);
  }
});

//
const manage_receiver = catchAsync(async (req, res, next) => {
  let X_USERNAME = process.env.A_X_USERNAME;
  let X_PASSWORD = process.env.A_X_PASSWORD;
  let username = req.headers["xusername"];
  let password = req.headers["xpassword"];
  let receiver_key = req.headers["receiver-key"];
  let receiver_secret = req.headers["receiver-secret"];
  try {
    if (username == X_USERNAME && password == X_PASSWORD) {
      req.user = {
        type: "admin",
        key: username,
        secret: password,
      };
      next();
    } else if (receiver_key && receiver_secret) {
      let receiver_id = req.body.receiver_id;

      req.user = {
        type: "receiver",
        key: receiver_key,
        secret: receiver_secret,
      };

      let result = await get_receiver_id_by_key_secret(
        receiver_key,
        receiver_secret
      );
      if (result?.status == 200 && result?.data?.receiver_id) {
        // >>>>>>>>>>>>>>>>>>>>>>>
        // Check Env mode
        if (result?.data?.type !== process.env.PAYOUT_MODE) {
          var response = {
            status: 401,
            message: "Invalid receiver key",
            code: "E0060",
          };
          return res.status(httpStatus.OK).send(response);
        }

        if (result?.data?.receiver_id != receiver_id) {
          var response = {
            status: 401,
            message: "Invalid receiver key",
            code: "E0060",
          };
          res.status(httpStatus.OK).send(response);
        } else {
          next();
        }
      } else {
        var response = {
          status: 401,
          message: "Invalid receiver key",
          code: "E0060",
        };
        res.status(httpStatus.OK).send(response);
      }
    } else {
      var response = {
        status: 401,
        message: "Invalid access keys",
        code: "E0060",
      };
      res.status(httpStatus.OK).send(response);
    }
  } catch (error) {
    console.log(error);
  }
});

//
const delete_receiver = catchAsync(async (req, res, next) => {
  let X_USERNAME = process.env.A_X_USERNAME;
  let X_PASSWORD = process.env.A_X_PASSWORD;
  let username = req.headers["xusername"];
  let password = req.headers["xpassword"];
  try {
    if (username == X_USERNAME && password == X_PASSWORD) {
      req.user = {
        type: "admin",
        key: username,
        secret: password,
      };
      next();
    } else {
      var response = {
        status: 401,
        message: "Invalid access keys",
        code: "E0060",
      };
      res.status(httpStatus.OK).send(response);
    }
  } catch (error) {
    console.log(error);
  }
});

//
const list_receiver = catchAsync(async (req, res, next) => {
  console.log("🚀 ~ req:", req.body);
  let X_USERNAME = process.env.A_X_USERNAME;
  let X_PASSWORD = process.env.A_X_PASSWORD;
  let username = req.headers["xusername"];
  let password = req.headers["xpassword"];
  let receiver_key = req.headers["receiver-key"];
  let receiver_secret = req.headers["receiver-secret"];
  try {
    if (username == X_USERNAME && password == X_PASSWORD) {
      // req.user = {
      //   type: "admin",
      //   key: username,
      //   secret: password,
      // };
      next();
    } else if (receiver_key && receiver_secret) {
      let receiver_id = req.body.receiver_id;

      // req.user = {
      //   type: "receiver",
      //   key: receiver_key,
      //   secret: receiver_secret,
      // };

      let result = await get_receiver_id_by_key_secret(
        receiver_key,
        receiver_secret
      );
      console.log("🚀 ~ result:", result);

      // >>>>>>>>>>>>>>>>>>>>>>>
      // Check Env mode
      if (result?.data?.type !== process.env.PAYOUT_MODE) {
        var response = {
            status: 401,
            message: "Invalid receiver key",
            code: "E0060",
          };
          return res.status(httpStatus.OK).send(response);
      }

      if (!receiver_id) {
        if (result?.status == 200 && result?.data?.receiver_id) {
          req.body.receiver_id = String(result?.data?.receiver_id);
          next();
          return;
        } else {
          var response = {
            status: 401,
            message: "Invalid receiver key",
            code: "E0060",
          };
          return res.status(httpStatus.OK).send(response);
        }
      }

      if (result?.status == 200 && result?.data?.receiver_id) {
        if (result?.data?.receiver_id != receiver_id) {
          var response = {
            status: 401,
            message: "Invalid receiver key",
            code: "E0060",
          };
          res.status(httpStatus.OK).send(response);
        } else {
          next();
        }
      } else {
        var response = {
          status: 401,
          message: "Invalid receiver key",
          code: "E0060",
        };
        res.status(httpStatus.OK).send(response);
      }
    } else {
      var response = {
        status: 401,
        message: "Invalid access keys",
        code: "E0060",
      };
      res.status(httpStatus.OK).send(response);
    }
  } catch (error) {
    console.log(error);
  }
});

//
const manage_payout = catchAsync(async (req, res, next) => {
  let X_USERNAME = process.env.A_X_USERNAME;
  let X_PASSWORD = process.env.A_X_PASSWORD;
  let username = req.headers["xusername"];
  let password = req.headers["xpassword"];
  let merchant_key = req.headers["merchant-key"];
  let merchant_secret = req.headers["merchant-secret"];
  let receiver_key = req.headers["receiver-key"];
  let receiver_secret = req.headers["receiver-secret"];
  try {
    if (username == X_USERNAME && password == X_PASSWORD) {
      req.user = {
        type: "admin",
        key: username,
        secret: password,
      };
      next();
    } else if (receiver_key && receiver_secret) {
      req.user = {
        type: "receiver",
        key: receiver_key,
        secret: receiver_secret,
      };

      let transaction_id = req.body.transaction_id;

      let result = await get_receiver_id_by_key_secret(
        receiver_key,
        receiver_secret
      );

      // >>>>>>>>>>>>>>>>>>>>>>>
      // Check Env mode
      if (result?.data?.type !== process.env.PAYOUT_MODE) {
        var response = {
          status: 401,
          message: "Invalid receiver key",
          code: "E0060",
        };
        return res.status(httpStatus.OK).send(response);
      }


      // If receiever in request
      if (transaction_id) {
        // Get Last Transaction By ID
        const stored_transaction = await transactionService.getById(
          transaction_id
        );
        console.log("🚀 ~ stored_transaction:", stored_transaction);
        if (stored_transaction.status !== httpStatus.OK) {
          return res.status(httpStatus.OK).send(stored_transaction);
        }

        if (result?.status == 200 && result?.data?.receiver_id) {
          if (
            result?.data?.receiver_id != stored_transaction?.data?.receiver_id
          ) {
            var response = {
              status: 401,
              message: "Invalid receiver key",
              code: "E0060",
            };
            return res.status(httpStatus.OK).send(response);
          } else {
            next();
          }
        } else {
          var response = {
            status: 401,
            message: "Invalid receiver key",
            code: "E0060",
          };
          return res.status(httpStatus.OK).send(response);
        }
      }
    } else if (merchant_key && merchant_secret) {
      req.user = {
        type: "merchant",
        key: merchant_key,
        secret: merchant_secret,
      };

      let transaction_id = req.body.transaction_id;

      let result = await nodeServerAPIService.check_merchant_key(
        merchant_key,
        merchant_secret
      );
      console.log("🚀 check_merchant_key ~ result:", result);

      // >>>>>>>>>>>>>>>>>>>>>>>
      // Check Env mode
      if (result?.data?.type !== process.env.PAYOUT_MODE) {
        var response = {
          status: 401,
          message: "Invalid merchant key",
          code: "E0060",
        };
        return res.status(httpStatus.OK).send(response);
      }

      if (transaction_id) {
        // Get Last Transaction By ID
        const stored_transaction = await transactionService.getById(
          transaction_id
        );
        console.log("🚀 ~ stored_transaction:", stored_transaction);
        if (stored_transaction.status !== httpStatus.OK) {
          return res.status(httpStatus.OK).send(stored_transaction);
        }

        if (result?.status == 200 && result?.data?.merchant_id) {
          if (
            result?.data?.merchant_id !=
              stored_transaction?.data?.sub_merchant_id &&
            helperService.isValid(stored_transaction?.data?.sub_merchant_id)
          ) {
            var response = {
              status: 401,
              message: "Invalid merchant key",
              code: "E0060",
            };
            res.status(httpStatus.OK).send(response);
          } else {
            next();
          }
        } else {
          var response = {
            status: 401,
            message: "Invalid merchant key",
            code: "E0060",
          };
          res.status(httpStatus.OK).send(response);
        }
      }
    } else {
      var response = {
        status: 401,
        message: "Invalid access keys",
        code: "E0060",
      };
      res.status(httpStatus.OK).send(response);
    }
  } catch (error) {
    console.log(error);
  }
});

//
const transaction_details = catchAsync(async (req, res, next) => {
  let X_USERNAME = process.env.A_X_USERNAME;
  let X_PASSWORD = process.env.A_X_PASSWORD;
  let username = req.headers["xusername"];
  let password = req.headers["xpassword"];
  let merchant_key = req.headers["merchant-key"];
  let merchant_secret = req.headers["merchant-secret"];
  let receiver_key = req.headers["receiver-key"];
  let receiver_secret = req.headers["receiver-secret"];
  try {
    if (username == X_USERNAME && password == X_PASSWORD) {
      next();
    } else if (receiver_key && receiver_secret) {
      // req.user = {
      //   type: "receiver",
      //   key: receiver_key,
      //   secret: receiver_secret,
      // };

      let transaction_id = req.params.transaction_id;

      let result = await get_receiver_id_by_key_secret(
        receiver_key,
        receiver_secret
      );

      // >>>>>>>>>>>>>>>>>>>>>>>
      // Check Env mode
      if (result?.data?.type !== process.env.PAYOUT_MODE) {
        var response = {
          status: 401,
          message: "Invalid receiver key",
          code: "E0060",
        };
        return res.status(httpStatus.OK).send(response);
      }

      // If receiever in request
      if (transaction_id) {
        // Get Last Transaction By ID
        const stored_transaction = await transactionService.getById(
          transaction_id
        );
        console.log("🚀 ~ stored_transaction:", stored_transaction);
        if (stored_transaction.status !== httpStatus.OK) {
          return res.status(httpStatus.OK).send(stored_transaction);
        }

        if (result?.status == 200 && result?.data?.receiver_id) {
          if (
            result?.data?.receiver_id != stored_transaction?.data?.receiver_id
          ) {
            var response = {
              status: 401,
              message: "Invalid receiver key",
              code: "E0060",
            };
            return res.status(httpStatus.OK).send(response);
          } else {
            next();
          }
        } else {
          var response = {
            status: 401,
            message: "Invalid receiver key",
            code: "E0060",
          };
          return res.status(httpStatus.OK).send(response);
        }
      }
    } else if (merchant_key && merchant_secret) {
      // req.user = {
      //   type: "merchant",
      //   key: merchant_key,
      //   secret: merchant_secret,
      // };

      let transaction_id = req.params.transaction_id;

      let result = await nodeServerAPIService.check_merchant_key(
        merchant_key,
        merchant_secret
      );
      console.log("🚀 check_merchant_key ~ result:", result);

      // >>>>>>>>>>>>>>>>>>>>>>>
      // Check Env mode
      if (result?.data?.type !== process.env.PAYOUT_MODE) {
        var response = {
          status: 401,
          message: "Invalid merchant key",
          code: "E0060",
        };
        return res.status(httpStatus.OK).send(response);
      }

      if (transaction_id) {
        // Get Last Transaction By ID
        const stored_transaction = await transactionService.getById(
          transaction_id
        );
        console.log("🚀 ~ stored_transaction:", stored_transaction);
        if (stored_transaction.status !== httpStatus.OK) {
          return res.status(httpStatus.OK).send(stored_transaction);
        }

        if (result?.status == 200 && result?.data?.merchant_id) {
          if (
            result?.data?.merchant_id !=
              stored_transaction?.data?.sub_merchant_id &&
            helperService.isValid(stored_transaction?.data?.sub_merchant_id)
          ) {
            var response = {
              status: 401,
              message: "Invalid merchant key",
              code: "E0060",
            };
            return res.status(httpStatus.OK).send(response);
          } else {
            next();
          }
        } else {
          var response = {
            status: 401,
            message: "Invalid merchant key",
            code: "E0060",
          };
          return res.status(httpStatus.OK).send(response);
        }
      }
    } else {
      var response = {
        status: 401,
        message: "Invalid access keys",
        code: "E0060",
      };
      return res.status(httpStatus.OK).send(response);
    }
  } catch (error) {
    console.log(error);
  }
});
//
const transaction_attachment = catchAsync(async (req, res, next) => {
  let X_USERNAME = process.env.A_X_USERNAME;
  let X_PASSWORD = process.env.A_X_PASSWORD;
  let username = req.headers["xusername"];
  let password = req.headers["xpassword"];
  let merchant_key = req.headers["merchant-key"];
  let merchant_secret = req.headers["merchant-secret"];
  let receiver_key = req.headers["receiver-key"];
  let receiver_secret = req.headers["receiver-secret"];
  try {
    if (username && password) {
      if (username == X_USERNAME && password == X_PASSWORD) {
        next();
      } else {
        var response = {
          status: 401,
          message: "Invalid access token",
          code: "E0060",
        };
        return res.status(httpStatus.OK).send(response);
      }
    } else if (receiver_key && receiver_secret) {
      req.user = {
        type: "receiver",
        key: receiver_key,
        secret: receiver_secret,
      };

      let external_id = req.params.external_id;

      let result = await get_receiver_id_by_key_secret(
        receiver_key,
        receiver_secret
      );

      // >>>>>>>>>>>>>>>>>>>>>>>
      // Check Env mode
      if (result?.data?.type !== process.env.PAYOUT_MODE) {
        var response = {
          status: 401,
          message: "Invalid receiver key",
          code: "E0060",
        };
        return res.status(httpStatus.OK).send(response);
      }

      // If receiever in request
      if (external_id) {
        // Get Last Transaction By ID
        const stored_transaction = await transactionService.getByExternalId(
          external_id
        );
        console.log("🚀 ~ stored_transaction:", stored_transaction);
        if (stored_transaction.status !== httpStatus.OK) {
          return res.status(httpStatus.OK).send(stored_transaction);
        }

        if (result?.status == 200 && result?.data?.receiver_id) {
          if (
            result?.data?.receiver_id != stored_transaction?.data?.receiver_id
          ) {
            var response = {
              status: 401,
              message: "Invalid receiver key",
              code: "E0060",
            };
            return res.status(httpStatus.OK).send(response);
          } else {
            next();
          }
        } else {
          var response = {
            status: 401,
            message: "Invalid receiver key",
            code: "E0060",
          };
          return res.status(httpStatus.OK).send(response);
        }
      }
    } else if (merchant_key && merchant_secret) {
      req.user = {
        type: "merchant",
        key: merchant_key,
        secret: merchant_secret,
      };

      let external_id = req.params.external_id;

      let result = await nodeServerAPIService.check_merchant_key(
        merchant_key,
        merchant_secret
      );
      console.log("🚀 check_merchant_key ~ result:", result);
      // >>>>>>>>>>>>>>>>>>>>>>>
      // Check Env mode
      if (result?.data?.type !== process.env.PAYOUT_MODE) {
        var response = {
          status: 401,
          message: "Invalid merchant key",
          code: "E0060",
        };
        return res.status(httpStatus.OK).send(response);
      }

      if (external_id) {
        // Get Last Transaction By ID
        const stored_transaction = await transactionService.getByExternalId(
          external_id
        );
        console.log("🚀 ~ stored_transaction:", stored_transaction);
        if (stored_transaction.status !== httpStatus.OK) {
          return res.status(httpStatus.OK).send(stored_transaction);
        }

        if (result?.status == 200 && result?.data?.merchant_id) {
          if (
            result?.data?.merchant_id !=
              stored_transaction?.data?.sub_merchant_id &&
            helperService.isValid(stored_transaction?.data?.sub_merchant_id)
          ) {
            var response = {
              status: 401,
              message: "Invalid merchant key",
              code: "E0060",
            };
            return res.status(httpStatus.OK).send(response);
          } else {
            next();
          }
        } else {
          var response = {
            status: 401,
            message: "Invalid merchant key",
            code: "E0060",
          };
          return res.status(httpStatus.OK).send(response);
        }
      }
    } else {
      var response = {
        status: 401,
        message: "Invalid access keys",
        code: "E0060",
      };
      return res.status(httpStatus.OK).send(response);
    }
  } catch (error) {
    console.log(error);
  }
});

//
const transaction_list = catchAsync(async (req, res, next) => {
  let X_USERNAME = process.env.A_X_USERNAME;
  let X_PASSWORD = process.env.A_X_PASSWORD;
  let username = req.headers["xusername"];
  let password = req.headers["xpassword"];
  let merchant_key = req.headers["merchant-key"];
  let merchant_secret = req.headers["merchant-secret"];
  let receiver_key = req.headers["receiver-key"];
  let receiver_secret = req.headers["receiver-secret"];
  try {
    if (username && password) {
      if (username == X_USERNAME && password == X_PASSWORD) {
        req.user = {
          type: "admin",
          key: username,
          secret: password,
        };
        next();
      } else {
        var response = {
          status: 401,
          message: "Invalid access token",
          code: "E0060",
        };
        return res.status(httpStatus.OK).send(response);
      }
    } else if (receiver_key && receiver_secret) {
      req.user = {
        type: "receiver",
        key: receiver_key,
        secret: receiver_secret,
      };

      let transaction_id = req.body.transaction_id;
      let receiver_id = req.body.receiver_id;
      let receiver_currency = req.body.receiver_currency;

      let result = await get_receiver_id_by_key_secret(
        receiver_key,
        receiver_secret
      );

      if (result?.status != 200) {
        var response = {
          status: 401,
          message: "Invalid receiver key",
          code: "E0060",
        };
        return res.status(httpStatus.OK).send(response);
      }

      // >>>>>>>>>>>>>>>>>>>>>>>
      // Check Env mode
      if (result?.data?.type !== process.env.PAYOUT_MODE) {
        var response = {
          status: 401,
          message: "Invalid receiver key",
          code: "E0060",
        };
        return res.status(httpStatus.OK).send(response);
      }

      if (!receiver_id) {
        req.body.receiver_id = result?.data?.receiver_id;
      }

      // If receiever in request
      if (transaction_id) {
        // Get Last Transaction By ID
        const stored_transaction = await transactionService.getById(
          transaction_id
        );
        console.log("🚀 ~ stored_transaction:", stored_transaction);
        if (stored_transaction.status !== httpStatus.OK) {
          return res.status(httpStatus.OK).send(stored_transaction);
        }

        if (result?.status == 200 && result?.data?.receiver_id) {
          if (
            result?.data?.receiver_id != stored_transaction?.data?.receiver_id
          ) {
            var response = {
              status: 401,
              message: "Invalid receiver key",
              code: "E0060",
            };
            return res.status(httpStatus.OK).send(response);
          } else {
            next();
          }
        } else {
          var response = {
            status: 401,
            message: "Invalid receiver key",
            code: "E0060",
          };
          return res.status(httpStatus.OK).send(response);
        }
      } else if (receiver_id) {
        if (result?.status == 200 && result?.data?.receiver_id) {
          if (result?.data?.receiver_id != receiver_id) {
            var response = {
              status: 401,
              message: "Invalid receiver key",
              code: "E0060",
            };
            return res.status(httpStatus.OK).send(response);
          } else {
            next();
          }
        } else {
          var response = {
            status: 401,
            message: "Invalid receiver key",
            code: "E0060",
          };
          return res.status(httpStatus.OK).send(response);
        }
      } else {
        next();
      }
    } else if (merchant_key && merchant_secret) {
      req.user = {
        type: "merchant",
        key: merchant_key,
        secret: merchant_secret,
      };

      let transaction_id = req.body.transaction_id;
      let sub_merchant_id = req.body.sub_merchant_id;

      let result = await nodeServerAPIService.check_merchant_key(
        merchant_key,
        merchant_secret
      );

      console.log("🚀 check_merchant_key ~ result:", result);

      if (result?.status != 200) {
        var response = {
          status: 401,
          message: "Invalid merchant key",
          code: "E0060",
        };
        return res.status(httpStatus.OK).send(response);
      }

      // >>>>>>>>>>>>>>>>>>>>>>>
      // Check Env mode
      if (result?.data?.type !== process.env.PAYOUT_MODE) {
        var response = {
          status: 401,
          message: "Invalid merchant key",
          code: "E0060",
        };
        return res.status(httpStatus.OK).send(response);
      }

      if (!sub_merchant_id) {
        req.body.sub_merchant_id = result?.data?.merchant_id;
      }

      if (transaction_id) {
        // Get Last Transaction By ID
        const stored_transaction = await transactionService.getById(
          transaction_id
        );
        console.log("🚀 ~ stored_transaction:", stored_transaction);
        if (stored_transaction.status !== httpStatus.OK) {
          return res.status(httpStatus.OK).send(stored_transaction);
        }

        if (result?.status == 200 && result?.data?.merchant_id) {
          if (
            result?.data?.merchant_id !=
              stored_transaction?.data?.sub_merchant_id &&
            helperService.isValid(stored_transaction?.data?.sub_merchant_id)
          ) {
            var response = {
              status: 401,
              message: "Invalid merchant key",
              code: "E0060",
            };
            return res.status(httpStatus.OK).send(response);
          } else {
            next();
          }
        } else {
          var response = {
            status: 401,
            message: "Invalid merchant key",
            code: "E0060",
          };
          return res.status(httpStatus.OK).send(response);
        }
      } else if (sub_merchant_id) {
        if (result?.status == 200 && result?.data?.merchant_id) {
          if (
            result?.data?.merchant_id != sub_merchant_id &&
            helperService.isValid(sub_merchant_id)
          ) {
            var response = {
              status: 401,
              message: "Invalid merchant key",
              code: "E0060",
            };
            return res.status(httpStatus.OK).send(response);
          } else {
            next();
          }
        } else {
          var response = {
            status: 401,
            message: "Invalid merchant key",
            code: "E0060",
          };
          return res.status(httpStatus.OK).send(response);
        }
      } else {
        next();
      }
    } else {
      var response = {
        status: 401,
        message: "Invalid access keys",
        code: "E0060",
      };
      return res.status(httpStatus.OK).send(response);
    }
  } catch (error) {
    console.log(error);
  }
});

const get_receiver_by_id_2 = catchAsync(async (req, res, next) => {
  let X_USERNAME = process.env.A_X_USERNAME;
  let X_PASSWORD = process.env.A_X_PASSWORD;
  let username = req.headers["xusername"];
  let password = req.headers["xpassword"];
  let merchant_key = req.headers["merchant-key"];
  let merchant_secret = req.headers["merchant-secret"];
  let receiver_key = req.headers["receiver-key"];
  let receiver_secret = req.headers["receiver-secret"];
  try {
    if (username && password) {
      if (username == X_USERNAME && password == X_PASSWORD) {
        req.user = {
          type: "admin",
          key: username,
          secret: password,
        };
        next();
      } else {
        var response = {
          status: 401,
          message: "Invalid access keys",
          code: "E0060",
        };
        res.status(httpStatus.OK).send(response);
      }
    } else if (receiver_key && receiver_secret) {
      let receiver_id = req.params.receiver_id;

      req.user = {
        type: "receiver",
        key: receiver_key,
        secret: receiver_secret,
      };

      let result = await get_receiver_id_by_key_secret(
        receiver_key,
        receiver_secret
      );
      if (result?.status == 200 && result?.data?.receiver_id) {
        if (result?.data?.receiver_id != receiver_id) {
          var response = {
            status: 401,
            message: "Invalid receiver key",
            code: "E0060",
          };
          res.status(httpStatus.OK).send(response);
        } else {
          next();
        }
      } else {
        var response = {
          status: 401,
          message: "Invalid receiver key",
          code: "E0060",
        };
        res.status(httpStatus.OK).send(response);
      }
    } else if (merchant_key && merchant_secret) {
      req.user = {
        type: "merchant",
        key: merchant_key,
        secret: merchant_secret,
      };

      let result = await nodeServerAPIService.check_merchant_key(
        merchant_key,
        merchant_secret
      );
      if (result) {
        next();
      } else {
        var response = {
          status: 401,
          message: "Invalid merchant key",
          code: "E0060",
        };
        res.status(httpStatus.OK).send(response);
      }
    } else {
      var response = {
        status: 401,
        message: "Invalid access keys",
        code: "E0060",
      };
      res.status(httpStatus.OK).send(response);
    }
  } catch (error) {
    console.log(error);
  }
});

const token = catchAsync(async (req, res, next) => {
  let X_USERNAME = process.env.A_X_USERNAME;
  let X_PASSWORD = process.env.A_X_PASSWORD;
  let username = req.headers["xusername"];
  let password = req.headers["xpassword"];
  let merchant_key = req.headers["merchant-key"];
  let merchant_secret = req.headers["merchant-secret"];
  let receiver_key = req.headers["receiver-key"];
  let receiver_secret = req.headers["receiver-secret"];
  try {
    if (username == X_USERNAME && password == X_PASSWORD) {
      next();
    } else if (receiver_key && receiver_secret) {
      
      let result = await get_receiver_id_by_key_secret(
        receiver_key,
        receiver_secret
      );
      if (result?.status == 200 && result?.data?.receiver_id) {

        // >>>>>>>>>>>>>>>>>>>>>>>
      // Check Env mode
      if (result?.data?.type !== process.env.PAYOUT_MODE) {
        var response = {
          status: 401,
          message: "Invalid receiver key",
          code: "E0060",
        };
        return res.status(httpStatus.OK).send(response);
      }

        next();
        
      } else {
        var response = {
          status: 401,
          message: "Invalid receiver key",
          code: "E0060",
        };
        res.status(httpStatus.OK).send(response);
      }
    } else if (merchant_key && merchant_secret) {
      
      let result = await nodeServerAPIService.check_merchant_key(
        merchant_key,
        merchant_secret
      );
      if (result) {
        // >>>>>>>>>>>>>>>>>>>>>>>
        // Check Env mode
        if (result?.data?.type !== process.env.PAYOUT_MODE) {
          var response = {
            status: 401,
            message: "Invalid merchant key",
            code: "E0060",
          };
          return res.status(httpStatus.OK).send(response);
        }
        next();
      } else {
        var response = {
          status: 401,
          message: "Invalid merchant key",
          code: "E0060",
        };
        res.status(httpStatus.OK).send(response);
      }
    } else {
      var response = {
        status: 401,
        message: "Invalid access token",
        code: "E0060",
      };
      res.status(httpStatus.OK).send(response);
    }
  } catch (error) {
    console.log(error);
  }
});

async function check_post_receiver_id(req, res, next) {
  let receiver_key = req.headers["receiver-key"];
  let receiver_secret = req.headers["receiver-secret"];
  let receiver_id = req.body.receiver_id;
  try {
    if (helperService.isValid(receiver_id)) {
      if (receiver_key && receiver_secret) {
        let result = await get_receiver_id_by_key_secret(
          receiver_key,
          receiver_secret
        );
        if (result?.status == 200 && result?.data?.receiver_id) {

          // >>>>>>>>>>>>>>>>>>>>>>>
          // Check Env mode
          if (result?.data?.type !== process.env.PAYOUT_MODE) {
            var response = {
              status: 401,
              message: "Invalid receiver key",
              code: "E0060",
            };
            return res.status(httpStatus.OK).send(response);
          }

          if (result?.data?.receiver_id != receiver_id) {
            var response = {
              status: 401,
              message: "Invalid receiver key",
              code: "E0060",
            };
            res.status(httpStatus.OK).send(response);
          } else {
            next();
          }
        } else {
          var response = {
            status: 401,
            message: "Invalid receiver key",
            code: "E0060",
          };
          res.status(httpStatus.OK).send(response);
        }
      } else {
        var response = {
          status: 401,
          message: "Invalid receiver key",
          code: "E0060",
        };
        res.status(httpStatus.OK).send(response);
      }
    } else {
      next();
    }
  } catch (error) {
    console.log(error);
  }
}

async function check_valid_merchant_id(sub_merchant_id, req) {
  let merchant_key = req.headers["merchant-key"];
  let merchant_secret = req.headers["merchant-secret"];
  try {
    if (merchant_key && merchant_secret) {
      let result = await get_sub_merchant_details(sub_merchant_id);
      if (result?.status == 200 && result?.data?.sub_merchant_id) {
        if (result?.data?.sub_merchant_id != sub_merchant_id) {
          var response = {
            status: 401,
            message: "Invalid merchant key",
            code: "E0060",
          };
          res.status(httpStatus.OK).send(response);
        } else {
          next();
        }
      } else {
        var response = {
          status: 401,
          message: "Invalid merchant key",
          code: "E0060",
        };
        res.status(httpStatus.OK).send(response);
      }
    } else {
      var response = {
        status: 401,
        message: "Invalid merchant key",
        code: "E0060",
      };
      res.status(httpStatus.OK).send(response);
    }
  } catch (error) {
    console.log(error);
  }
}

async function check_order_id(req, res, next) {
  try {
    let transactionResponse = await transactionsService.check_order_id_exists(
      req.body.order_id
    );
    if (transactionResponse?.status == 200) {
      var response = {
        status: 400,
        message: "Order ID already processed",
        code: "E0040",
      };
      res.status(httpStatus.OK).send(response);
    } else {
      next();
    }
  } catch (error) {
    console.log(error);
  }
}

const token2 = catchAsync(async (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  let otherAuthHeader = req.headers;
  let username = otherAuthHeader.xusername;
  let password = otherAuthHeader.xpassword;
  let X_USERNAME = process.env.A_X_USERNAME;
  let X_PASSWORD = process.env.A_X_PASSWORD;
  let receiver_key = req.headers["receiver-key"];
  let receiver_secret = req.headers["receiver-secret"];
  try {
    if (username && password) {
      if (username == X_USERNAME && password == X_PASSWORD) {
        req.user = {
          type: "admin",
          key: username,
          secret: password,
        };
        next();
      } else {
        var response = {
          status: 401,
          message: "Invalid access token",
          code: "E0060",
        };
        res.status(httpStatus.OK).send(response);
      }
    } else if (token) {
      jwt.verify(
        token,
        process.env.ACCESS_TOKEN_SECRET,
        async (err, payload) => {
          if (err) {
            if (err.message == "jwt expired") {
              res.status(403).send({
                status: 404,
                message: "Token Expired Please Login",
                code: "E0059",
              });
            } else {
              res.status(403).send({
                status: 403,
                message: "Unable To Validate Token",
                code: "E0060",
              });
            }
          } else {
            let user = await verifyAccessToken(payload.payload);
            user.token = token;
            req.user = user;
            if (req.user?.type === "admin" || req.user?.type === "merchant") {
              next();
            } else {
              res.status(403).send({
                status: 403,
                message:
                  "Access is restricted to administrators and merchant only.",
                code: "E0060",
              });
            }
          }
        }
      );
    } else if (receiver_key && receiver_secret) {
      let receiver_id = "";
      if (req.body.receiver_id) {
        receiver_id = req.body.receiver_id;
      } else if (req.params.receiver_id) {
        receiver_id = req.params.receiver_id;
      }

      req.user = {
        type: "admin",
        key: username,
        secret: password,
      };

      check_valid_receiver_id(receiver_id, req);
    } else {
      var response = {
        status: 401,
        message: "Invalid access token",
        code: "E0060",
      };
      res.status(httpStatus.OK).send(response);
    }
  } catch (error) {
    console.log(error);
  }
});

const admin_auth = catchAsync(async (req, res, next) => {
  let X_USERNAME = process.env.A_X_USERNAME;
  let X_PASSWORD = process.env.A_X_PASSWORD;
  let xusername = req.headers["xusername"];
  let xpassword = req.headers["xpassword"];
  try {
    if (xusername && xpassword) {
      if (xusername == X_USERNAME && xpassword == X_PASSWORD) {
        req.user = {
          type: "admin",
          key: xusername,
          secret: xpassword,
        };
        next();
      } else {
        var response = {
          status: 401,
          message: "Invalid access",
          code: "E0060",
        };
        res.status(httpStatus.OK).send(response);
      }
    } else {
      var response = {
        status: 401,
        message: "Invalid access",
        code: "E0060",
      };
      res.status(httpStatus.OK).send(response);
    }
  } catch (error) {
    console.log(error);
  }
});

const merchant_auth = catchAsync(async (req, res, next) => {
  let merchant_key = req.headers["merchant-key"];
  let merchant_secret = req.headers["merchant-secret"];
  try {
    if (merchant_key && merchant_secret) {
      if (xusername == X_USERNAME && xpassword == X_PASSWORD) {
        let sub_merchant_id = "";
        if (req.body.sub_merchant_id) {
          sub_merchant_id = req.body.sub_merchant_id;
        } else if (req.params.sub_merchant_id) {
          sub_merchant_id = req.params.sub_merchant_id;
        }
        req.user = {
          type: "merchant",
          key: merchant_key,
          secret: merchant_secret,
        };
        check_valid_merchant_id(sub_merchant_id, req);
      } else {
        var response = {
          status: 401,
          message: "Invalid access",
          code: "E0060",
        };
        res.status(httpStatus.OK).send(response);
      }
    } else {
      next();
    }
  } catch (error) {
    console.log(error);
  }
});

const receiver_auth = catchAsync(async (req, res, next) => {
  let receiver_key = req.headers["receiver-key"];
  let receiver_secret = req.headers["receiver-secret"];
  try {
    if (receiver_key && receiver_secret) {
      let receiver_id = "";
      if (req.body.receiver_id) {
        receiver_id = req.body.receiver_id;
      } else if (req.params.receiver_id) {
        receiver_id = req.params.receiver_id;
      }

      req.user = {
        type: "receiver",
        key: receiver_key,
        secret: receiver_secret,
      };

      check_valid_receiver_id(receiver_id, req);
    } else {
      next();
    }
  } catch (error) {
    console.log(error);
  }
});

const validate_receiver = catchAsync(async (req, res, next) => {
  let receiver_key = req.headers["receiver-key"];
  let receiver_secret = req.headers["receiver-secret"];
  try {
    if (receiver_key && receiver_secret) {
      let result = await get_receiver_id_by_key_secret(
        receiver_key,
        receiver_secret
      );
      if (result?.status == 200 && result?.data?.receiver_id) {
        let receiver_id = "";
        if (req.body.receiver_id) {
          receiver_id = req.body.receiver_id;
        } else if (req.params.receiver_id) {
          receiver_id = req.params.receiver_id;
        }
        console.log("🚀 ~ receiver_id:", receiver_id);

        if (result?.data?.receiver_id != receiver_id) {
          var response = {
            status: 401,
            message: "Invalid receiver key",
            code: "E0060",
          };
          res.status(httpStatus.OK).send(response);
        } else {
          next();
        }
      } else {
        var response = {
          status: 401,
          message: "Invalid receiver key",
          code: "E0060",
        };
        res.status(httpStatus.OK).send(response);
      }
      // -------------------------------------------------------
    } else {
      var response = {
        status: 401,
        message: "Invalid receiver key",
        code: "E0060",
      };
      res.status(httpStatus.OK).send(response);
    }
  } catch (error) {
    console.log(error);
  }
});


const validate_receiver_keys_list = catchAsync(async (req, res, next) => {
  let X_USERNAME = process.env.A_X_USERNAME;
  let X_PASSWORD = process.env.A_X_PASSWORD;
  let xusername = req.headers["xusername"];
  let xpassword = req.headers["xpassword"];
  try {
    if (xusername && xpassword) {
      if (xusername == X_USERNAME && xpassword == X_PASSWORD) {
        next();
      } else {
        var response = {
          status: 401,
          message: "Invalid access",
          code: "E0060",
        };
        res.status(httpStatus.OK).send(response);
      }
    } else {
      var response = {
        status: 401,
        message: "Invalid access",
        code: "E0060",
      };
      res.status(httpStatus.OK).send(response);
    }
  } catch (error) {
    console.log(error);
  }
});

module.exports = {
  API_USER,
  token,
  check_post_receiver_id,
  validate_receiver,
  check_order_id,
  admin_auth,
  merchant_auth,
  receiver_auth,
  //
  get_receiver_by_id,
  manage_receiver,
  delete_receiver,
  list_receiver,
  manage_payout,
  transaction_details,
  transaction_list,
  add_receiver,
  check_access_token,
  transaction_attachment,
  validate_receiver_keys_list
};
