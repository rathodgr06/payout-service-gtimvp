"use strict";
const { Model } = require("sequelize");
const moment = require("moment");
module.exports = (sequelize, DataTypes) => {
  class receiver extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      receiver.hasMany(models.payout_mid, { foreignKey: 'receiver_id' });
    }
  }
  receiver.init(
    {
      sub_merchant_id: DataTypes.STRING,
      receiver_name: DataTypes.STRING,
      registered_business_address: DataTypes.STRING,
      email: DataTypes.STRING,
      code: DataTypes.STRING,
      mobile_no: DataTypes.STRING,
      referral_code: DataTypes.STRING,
      webhook_url: DataTypes.STRING,
      webhook_secret: DataTypes.STRING,
      verification: DataTypes.STRING, // pending, verified, rejected, pending_manual_review
      active: DataTypes.STRING, // 1: Active, 0: Not-Active
      deleted: DataTypes.INTEGER // 1: Deleted, 0: Not Deleted
    },
    {
      sequelize,
      modelName: "receiver",
      tableName: "receivers",
      timestamps: false,
    }
  );

  receiver.prototype.toJSON = function () {
    const values = Object.assign({}, this.get());

    values.created_at = moment(values.created_at).format("YYYY-MM-DD hh:mm:ss");
    values.updated_at = moment(values.updated_at).format("YYYY-MM-DD hh:mm:ss");

    return values;
  };
  return receiver;
};
