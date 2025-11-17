"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const tableName = "payout_schedule_master";

    const tableExists = await queryInterface.sequelize.query(
      `SHOW TABLES LIKE '${tableName}'`
    );

    if (tableExists[0].length === 0) {
      await queryInterface.createTable(tableName, {
        id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          autoIncrement: true,
          primaryKey: true,
        },
        sub_merchant_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          defaultValue: 0,
        },
        plan_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          defaultValue: 0,
        },
        active: {
          type: Sequelize.INTEGER,
          allowNull: false,
          defaultValue: 1, // Set default value to 1
        },
        deleted: {
          type: Sequelize.INTEGER,
          allowNull: false,
          defaultValue: 0, // Set default value to 0
        },
        created_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
        },
        updated_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
        },
      });
    }
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable(tableName);
  },
};
