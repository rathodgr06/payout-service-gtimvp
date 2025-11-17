"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class receiver extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }
  }
  receiver.init(
    {
      receiver_id: DataTypes.INTEGER,
      type: DataTypes.STRING,
      receiver_key: DataTypes.STRING,
      receiver_secret: DataTypes.STRING,
      deleted: DataTypes.INTEGER // 1: Deleted, 0: Not Deleted
    },
    {
      sequelize,
      modelName: "receiver_key_secret",
      tableName: "receiver_key_and_secret",
      timestamps: false,
    }
  );
  return receiver;
};
