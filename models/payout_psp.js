"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class payout_psp extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      payout_psp.hasMany(models.payout_mid, { foreignKey: 'psp_id' });
    }
  }
  payout_psp.init(
    {
      psp_name: DataTypes.STRING,
      psp_key: DataTypes.STRING,
      country_id: DataTypes.STRING,
      country_name: DataTypes.STRING,
      remark: DataTypes.STRING,
      status: DataTypes.INTEGER, // 1: Active, 0: Not-Active
      deleted: DataTypes.INTEGER, // 1: Deleted, 0: Not-Deleted
      // created_at: DataTypes.DATE,
      // updated_at: DataTypes.DATE,
    },
    {
      sequelize,
      modelName: "payout_psp",
      tableName: "payout_psps",
        timestamps: false,
    }
  );
  return payout_psp;
};
