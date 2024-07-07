// mailer.js

const nodemailer = require('nodemailer');
require('dotenv').config();

const transporter = nodemailer.createTransport({
  service: 'Gmail', // You can use other email services like Yahoo, Outlook, etc.
  auth: {
    user: process.env.EMAIL_USERNAME, // Your email address
    pass: process.env.EMAIL_PASSWORD, // Your email password or app-specific password
  },
});

const sendBookingConfirmation = (bookingDetails) => {
  const mailOptions = {
    from: process.env.EMAIL_USERNAME,
    to: bookingDetails.email,
    subject: 'Booking Confirmation',
    text: `
      Dear ${bookingDetails.name},

      Thank you for your booking!

      Here are your booking details:
      - Number of Rooms: ${bookingDetails.numberOfRooms}
      - Check-In Date: ${bookingDetails.checkInDate}
      - Check-Out Date: ${bookingDetails.checkOutDate}
      - Number of Nights: ${bookingDetails.numberOfNights}
      - Total Cost: ${bookingDetails.totalCost}
      - Room ID: ${bookingDetails.roomId}

      We look forward to welcoming you!

      Best regards,
      Your Hotel Team
    `,
  };

  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.error('Error sending email:', error);
    } else {
      console.log('Email sent:', info.response);
    }
  });
};

module.exports = sendBookingConfirmation;
