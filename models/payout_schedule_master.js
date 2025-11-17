"use strict";
const { Model } = require("sequelize");
const moment = require("moment");
module.exports = (sequelize, DataTypes) => {
  class payout_schedule_master extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      
    }
  }
  payout_schedule_master.init(
    {
      sub_merchant_id: DataTypes.INTEGER,
      plan_id: DataTypes.INTEGER,
      active: DataTypes.INTEGER, // 1: Active, 0: Not-Active
      deleted: DataTypes.INTEGER, // 1: Deleted, 0: Not-Deleted
    },
    {
      sequelize,
      modelName: "payout_schedule_master",
      tableName: "payout_schedule_master",
      timestamps: false,
      underscored: true,
    }
  );

  payout_schedule_master.prototype.toJSON = function () {
    const values = Object.assign({}, this.get());

    values.created_at = moment(values.created_at).format("YYYY-MM-DD hh:mm A");
    values.updated_at = moment(values.updated_at).format("YYYY-MM-DD hh:mm A");

    return values;
  };
  return payout_schedule_master;
};
