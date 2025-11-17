'use strict';

module.exports = {
    up: async (queryInterface, Sequelize) => {
        const tableName = 'payers';

        const tableExists = await queryInterface.sequelize.query(
            `SHOW TABLES LIKE '${tableName}'`
        );

        if (tableExists[0].length === 0) {
            await queryInterface.createTable(tableName, {
                id: {
                    type: Sequelize.INTEGER,
                    allowNull: false,
                    primaryKey: true,
                    autoIncrement: true,
                },
                payer_id: {
                    type: Sequelize.STRING(255),
                    allowNull: true
                },
                super_merchant_id: {
                    type: Sequelize.STRING(255),
                    allowNull: true
                },
                sub_merchant_id: {
                    type: Sequelize.STRING(255),
                    allowNull: true
                },
                first_name: {
                    type: Sequelize.STRING(255),
                    allowNull: true
                },
                last_name: {
                    type: Sequelize.STRING(255),
                    allowNull: true
                },
                service_id: {
                    type: Sequelize.INTEGER,
                    allowNull: true
                },
                service_name: {
                    type: Sequelize.STRING(255),
                    allowNull: true
                },
                country_iso_code: {
                    type: Sequelize.STRING(255),
                    allowNull: true
                },
                currency: {
                    type: Sequelize.STRING(255),
                    allowNull: true
                },
                increment: {
                    type: Sequelize.STRING(255),
                    allowNull: true
                },
                bank_name: {
                    type: Sequelize.STRING(255),
                    allowNull: true
                },
                precision: {
                    type: Sequelize.STRING(255),
                    allowNull: true
                },
                transaction_types: {
                    type: Sequelize.STRING(255),
                    allowNull: true
                },
                credit_party_identifiers_accepted: {
                    type: Sequelize.STRING(255),
                    allowNull: true
                },
                credit_party_information: {
                    type: Sequelize.STRING(255),
                    allowNull: true
                },
                credit_party_verification: {
                    type: Sequelize.STRING(255),
                    allowNull: true
                },
                maximum_transaction_amount: {
                    type: Sequelize.STRING(255),
                    allowNull: true
                },
                minimum_transaction_amount: {
                    type: Sequelize.STRING(255),
                    allowNull: true
                },
                purpose_of_remittance_values_accepted: {
                    type: Sequelize.STRING(255),
                    allowNull: true
                },
                required_documents: {
                    type: Sequelize.STRING(255),
                    allowNull: true
                },
                required_receiving_entity_fields: {
                    type: Sequelize.STRING(255),
                    allowNull: true
                },
                required_sending_entity_fields: {
                    type: Sequelize.STRING(255),
                    allowNull: true
                },
                active: {
                    type: Sequelize.INTEGER,
                    allowNull: true
                },
                black_listed: {
                    type: Sequelize.INTEGER,
                    allowNull: true
                },
                created_at: {
                    type: Sequelize.DATE,
                    allowNull: true
                },
                updated_at: {
                    type: Sequelize.DATE,
                    allowNull: true
                }
            });
        }
    },

    down: async (queryInterface) => {
        await queryInterface.dropTable('payers');
    }
};
