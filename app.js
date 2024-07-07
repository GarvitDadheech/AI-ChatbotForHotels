const express = require('express');
const fs = require('fs');
const axios = require('axios');
const cors = require('cors');
const app = express();
require('dotenv').config();
const { sequelize, testConnection } = require('./sequelize');
const Conversation = require('./Conversation');
const Booking = require('./Booking');
const sendBookingConfirmation = require('./mailer'); // Import the mailer function

app.use(cors());
app.use(express.json());

testConnection().then(() => {
  console.log('Database connection test completed.');
}).catch((error) => {
  console.error('Error testing database connection:', error);
});

const rooms = JSON.parse(fs.readFileSync('hotels.json', 'utf-8'));

let conversationContext = [];

let bookings = [];
if (fs.existsSync('data.json')) {
  try {
    const bookingsData = fs.readFileSync('data.json', 'utf-8');
    if (bookingsData.trim() !== '') {
      bookings = JSON.parse(bookingsData);
    } else {
      console.log('data.json is empty.');
    }
  } catch (error) {
    console.error('Error reading data.json:', error.message);
  }
}

const getGPT4TurboResponse = async (userQuestion, context) => {
  const prompt = `
    You are the hotel booking assistant who helps users book rooms. I will provide you the room data in a json format.
    Also I will provide you the user's question and the context of the conversation.
    Here is the room data: ${JSON.stringify(rooms, null, 2)}
    User's question: ${userQuestion}
    Context: ${context.join('\n')}
    Answer based on the room data in the same language as the user's question.
    If you think that the user wants to book a room, then ask the user for the email, name, phone number, number of rooms, and check-in/check-out dates.
    Now calculate the total cost of the booking and the nights of stay and also get the roomId of the selected room from the user.
    If the user doesn't tell the email, name, phone number, number of rooms, check-in/check-out dates, then assist him again to provide the missing information.
    If the user provides all the information, then write "Please confirm your booking details" (the tone of the user doesn't matter here, you have to always respond "Please confirm your booking details") and return the JSON in the following format:
    {
        "email": "",
        "name": "",
        "phone": "",
        "numberOfRooms": "",
        "checkInDate": "",
        "checkOutDate": "",
        "Number of nights": "",
        "Total cost": "",
        "roomId": ""
    }
    And if the user affirms the booking, then send "Your booking is confirmed, Thank you for your booking!" (the tone of the user doesn't matter here, you have to always respond "Your booking is confirmed, Thank you for your booking!").
  `;

  try {
    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-4-turbo',
        messages: [{ role: 'user', content: prompt }, ...context.map(msg => ({ role: 'assistant', content: msg }))],
        max_tokens: 150,
        temperature: 0.7,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
        }
      }
    );
    return response.data.choices[0].message.content.trim();
  } catch (error) {
    console.error('Error getting response from OpenAI:', error.response ? error.response.data : error.message);
    return 'Sorry, I could not get the response from OpenAI.';
  }
};

const saveBooking = async (bookingDetails) => {
  try {
    const newBooking = await Booking.create(bookingDetails);
    console.log('Booking saved successfully:', newBooking.toJSON());
  } catch (error) {
    console.error('Error saving booking:', error);
  }
};

const main = async (userQuestion, conversationId) => {
  let conversation;

  try {
    conversation = await Conversation.findOne({ where: { conversationId } });
    if (!conversation) {
      conversation = await Conversation.create({ conversationId, messages: [] });
    }
  } catch (error) {
    console.error('Error fetching/creating conversation:', error);
    return 'Error fetching/creating conversation.';
  }

  conversationContext = conversation.messages.map(msg => msg.text);

  const gpt4TurboResponse = await getGPT4TurboResponse(userQuestion, conversationContext);

  if (gpt4TurboResponse.includes('Sorry, I could not get the response from OpenAI.')) {
    return "Sorry, Our servers are down, Please try again in sometime.";
  }

  if (gpt4TurboResponse.includes('Please confirm your booking details')) {
    const bookingDetails = JSON.parse(gpt4TurboResponse.match(/\{.*\}/s)[0]);
    console.log("These are your booking details:", bookingDetails);
    sendBookingConfirmation(bookingDetails); // Send booking confirmation email
    console.log('Are you sure to confirm the room?');
    await saveBooking(bookingDetails); // Save booking to the database
  } else if (gpt4TurboResponse.includes('Your booking is confirmed, Thank you for your booking!')) {
    console.log('Your booking is confirmed, Thank you for your booking!');
  } else {
    conversation.messages.push({ sender: 'user', text: userQuestion });
    conversation.messages.push({ sender: 'assistant', text: gpt4TurboResponse });
    await conversation.save();
  }

  return gpt4TurboResponse;
};

app.post('/chat', async (req, res) => {
  const { text, conversationId } = req.body;
  
  const response = await main(text, conversationId);
  
  const conversation = await Conversation.findOne({ where: { conversationId } });
  
  res.json({ response, conversation });
});

const PORT = 3001;
sequelize.sync().then(async () => {
  await testConnection();
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
});
