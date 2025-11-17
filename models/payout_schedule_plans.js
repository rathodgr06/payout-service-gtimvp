"use strict";
const { Model } = require("sequelize");
const moment = require('moment');
module.exports = (sequelize, DataTypes) => {
  class payout_schedule_plans extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      // Define the association to Receiver
      payout_schedule_plans.hasMany(models.payout_schedule_items, {
        foreignKey: 'plan_id',
        as: 'schedules',
      });
    }
  }
  payout_schedule_plans.init(
    {
      plan_name: DataTypes.STRING,
      country_iso_code: DataTypes.STRING,
      is_default: DataTypes.INTEGER,
      active: DataTypes.INTEGER, // 1: Active, 0: Not-Active
      deleted: DataTypes.INTEGER, // 1: Deleted, 0: Not-Deleted
    },
    {
      sequelize,
      modelName: "payout_schedule_plans",
      tableName: "payout_schedule_plans",
      timestamps: false,
      underscored: true,
    }
  );

  payout_schedule_plans.prototype.toJSON = function () {
    const values = Object.assign({}, this.get());

    values.created_at = moment(values.created_at).format("YYYY-MM-DD hh:mm A");
    values.updated_at = moment(values.updated_at).format("YYYY-MM-DD hh:mm A");

    return values;
  };
  return payout_schedule_plans;
};
