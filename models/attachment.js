"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class attachment extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }
  }
  attachment.init(
    {
      transaction_id: DataTypes.STRING,
      external_id: DataTypes.STRING,
      receiver_id: DataTypes.STRING,
      file_name: DataTypes.STRING,
      original_name: DataTypes.STRING,
      file_path: DataTypes.STRING,
      mimetype: DataTypes.STRING,
      type: DataTypes.STRING,
    },
    {
      sequelize,
      modelName: "attachment",
      tableName:"transaction_attachment",
      timestamps:false
    }
  );
  return attachment;
};
