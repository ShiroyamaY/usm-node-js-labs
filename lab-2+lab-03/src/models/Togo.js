export default (sequelize, DataTypes) => {
  const Todo = sequelize.define('Todo', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    title: {
      type: DataTypes.TEXT,
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [2, 120]
      }
    },
    completed: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    category_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'categories',
        key: 'id'
      }
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    due_date: {
      type: DataTypes.DATE,
      allowNull: true
    }
  }, {
    tableName: 'todos',
    underscored: true,
    timestamps: true
  });

  return Todo;
};