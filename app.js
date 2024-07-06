const fs = require('fs');
const axios = require('axios');
const readlineSync = require('readline-sync');
require('dotenv').config();
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;


// Load the hotel data from hotels.json
const rooms = JSON.parse(fs.readFileSync('hotels.json', 'utf-8'));

// Array to store conversation context
let conversationContext = [];

// Load existing bookings from data.json or initialize an empty array if the file does not exist
let bookings = [];
if (fs.existsSync('data.json')) {
    try {
        const bookingsData = fs.readFileSync('data.json', 'utf-8');
        bookings = JSON.parse(bookingsData);
    } catch (error) {
        console.error('Error reading data.json:', error.message);
    }
}

// Function to get a response from GPT-4 Turbo
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
    If the user dont tells the email, name, phone number, number of rooms, check-in/check-out dates, then assist him again to provide the missing information.
    If the user provides all the information, then write "Please confirm your booking details" (the tone of the user dont matter here, you have to always respond "Please confirm your booking details")and return the JSON in the following format:
    {
        "email": ",
        "name": "",
        "phone": "",
        "numberOfRooms": '',
        "checkInDate": "",
        "checkOutDate": ""
        "Number of nights": "",
        "Total cost": "",
        "roomId": ""
    }
    And if user affirms the booking, then send "Your booking is confirmed, Thank you for your booking!(the tone of the user dont matter here, you have to always respond "Your booking is confirmed, Thank you for your booking!")"
    `;

    try {
        const response = await axios.post(
            'https://api.openai.com/v1/chat/completions', // Ensure using the correct API endpoint for GPT-4 Turbo
            {
                model: 'gpt-4-turbo', // Use the GPT-4 Turbo model name
                messages: [{ role: 'user', content: prompt }, ...context.map(msg => ({ role: 'assistant', content: msg }))],
                max_tokens: 150,
                temperature: 0.7,
            },
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${OPENAI_API_KEY}`
                }
            }
        );
        return response.data.choices[0].message.content.trim();
    } catch (error) {
        console.error('Error getting response from OpenAI:', error.response ? error.response.data : error.message);
        return 'Sorry, I could not get the response from OpenAI.';
    }
};

// Function to save booking to data.json
const saveBooking = (booking) => {
    bookings.push(booking);
    fs.writeFileSync('data.json', JSON.stringify(bookings, null, 2), 'utf-8');
    console.log('Booking saved successfully!');
};


// Main function to run the terminal app
const main = async () => {
    console.log('Welcome to the Hotel Info Chatbot!');
    while (true) {
        const userQuestion = readlineSync.question('Ask a question about the hotel (or type "exit" to quit): ');
        if (userQuestion.toLowerCase() === 'exit') {
            console.log('Goodbye!');
            break;
        }

        const gpt4TurboResponse = await getGPT4TurboResponse(userQuestion, conversationContext);
        if (gpt4TurboResponse.includes('Please confirm your booking details')) {
            bookingInProgress = true;
            bookingDetails = JSON.parse(gpt4TurboResponse.match(/\{.*\}/s)[0]);
            console.log("These are your booking details.",bookingDetails);
            console.log('Are you sure to confirm the room?');
        } else if (gpt4TurboResponse.includes('Your booking is confirmed, Thank you for your booking!')) {
            if (bookingInProgress && bookingDetails) {
                saveBooking(bookingDetails);
                bookingInProgress = false;
                bookingDetails = null;
            }
            console.log('Your booking is confirmed, Thank you for your booking!');
        } else {
            // Store user question and GPT-4 response in context
            console.log('GPT-4 Turbo:', gpt4TurboResponse);
            conversationContext.push(`User: ${userQuestion}`);
            conversationContext.push(`GPT-4 Turbo: ${gpt4TurboResponse}`);
        }
    }
};

// Run the main function
main();
