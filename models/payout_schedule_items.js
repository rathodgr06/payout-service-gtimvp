"use strict";
const { Model } = require("sequelize");
const moment = require('moment');
module.exports = (sequelize, DataTypes) => {
  class payout_schedule_items extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      // Define the association to Receiver
      payout_schedule_items.belongsTo(models.payout_schedule_plans, {
        foreignKey: "plan_id",
        as: 'plan',
      });
    }
  }
  payout_schedule_items.init(
    {
      plan_id: DataTypes.STRING,
      currency: DataTypes.STRING,
      frequency: DataTypes.STRING,
      occurrence: DataTypes.INTEGER,
      start: DataTypes.STRING,
      run_next_at: DataTypes.STRING,
      min_amount: DataTypes.DECIMAL(10, 2),
      payout_time: DataTypes.STRING,
      active: DataTypes.INTEGER, // 1: Active, 0: Not-Active
      deleted: DataTypes.INTEGER, // 1: Deleted, 0: Not-Deleted
    },
    {
      sequelize,
      modelName: "payout_schedule_items",
      tableName: "payout_schedule_items",
      timestamps: false,
      underscored: true,
    }
  );

  payout_schedule_items.prototype.toJSON = function () {
    const values = Object.assign({}, this.get());

    values.created_at = moment(values.created_at).format("YYYY-MM-DD hh:mm A");
    values.updated_at = moment(values.updated_at).format("YYYY-MM-DD hh:mm A");

    return values;
  };
  return payout_schedule_items;
};
