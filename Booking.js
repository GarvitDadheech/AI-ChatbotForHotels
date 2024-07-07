// booking.js

const { DataTypes } = require('sequelize');
const { sequelize } = require('./sequelize');

const Booking = sequelize.define('Booking', {
  email: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  phone: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  numberOfRooms: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  checkInDate: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  checkOutDate: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  totalCost: {
    type: DataTypes.FLOAT,
    allowNull: false,
  },
  roomId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
});

module.exports = Booking;
