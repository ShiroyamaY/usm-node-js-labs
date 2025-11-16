export const up = async (queryInterface, Sequelize) => {
  await queryInterface.createTable('todos', {
    id: {
      type: Sequelize.UUID,
      defaultValue: Sequelize.UUIDV4,
      primaryKey: true
    },
    title: {
      type: Sequelize.TEXT,
      allowNull: false
    },
    completed: {
      type: Sequelize.BOOLEAN,
      defaultValue: false
    },
    category_id: {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: 'categories',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    },
    user_id: {
      type: Sequelize.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    },
    due_date: {
      type: Sequelize.DATE,
      allowNull: true
    },
    created_at: {
      type: Sequelize.DATE,
      allowNull: false,
      defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
    },
    updated_at: {
      type: Sequelize.DATE,
      allowNull: false,
      defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
    }
  });

  await queryInterface.addIndex('todos', ['user_id']);
  await queryInterface.addIndex('todos', ['category_id']);
  await queryInterface.addIndex('todos', ['completed']);
};

export const down = async (queryInterface) => {
  await queryInterface.dropTable('todos');
};