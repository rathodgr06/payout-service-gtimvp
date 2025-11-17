"use strict";
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    const tableName = 'payout_routes';

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
        country_name: {
          type: Sequelize.STRING,
          allowNull: true,
        },
        country_iso: {
          type: Sequelize.STRING,
          allowNull: true,
        },
        account_type: {
          type: Sequelize.STRING,
          allowNull: true,
        },
        currency: {
          type: Sequelize.STRING,
          allowNull: true,
        },
        payer_id: {
          type: Sequelize.STRING,
          allowNull: true,
        },
        psp_name: {
          type: Sequelize.STRING,
          allowNull: true,
        },
        psp_id: {
          type: Sequelize.INTEGER,
          allowNull: true,
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
    await queryInterface.dropTable("payout_routes");
  },
};
