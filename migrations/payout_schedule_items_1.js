"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const tableName = "payout_schedule_items";

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
        plan_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          defaultValue: 0, // Set default value to 0
        },
        currency: {
          type: Sequelize.STRING,
          allowNull: true,
        },
        frequency: {
          type: Sequelize.STRING,
          allowNull: true,
        },
        occurrence: {
          type: Sequelize.INTEGER,
          allowNull: false,
          defaultValue: 0, // Set default value to 0
        },
        start: {
          type: Sequelize.STRING,
          allowNull: true,
        },
        run_next_at: {
          type: Sequelize.STRING,
          allowNull: true,
        },
        min_amount: {
          type: Sequelize.DECIMAL(10, 2),
          allowNull: false,
          defaultValue: 0.0,
        },
        payout_time: {
          type: Sequelize.STRING,
          allowNull: true,
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
