// conversation.js

const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('./sequelize');

class Conversation extends Model {}

Conversation.init({
  conversationId: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    allowNull: false,
    primaryKey: true,
  },
  messages: {
    type: DataTypes.JSON,
    allowNull: false,
  },
}, {
  sequelize,
  modelName: 'Conversation',
});

module.exports = Conversation;
