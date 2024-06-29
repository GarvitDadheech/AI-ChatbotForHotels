const fs = require('fs');
const axios = require('axios');
const readlineSync = require('readline-sync');


const OPENAI_API_KEY = 'Replace with your actual OpenAI API key';
const WEBHOOK_URL = 'Replace with your webhook.site URL';

// Load the hotel data from hotels.json
const hotels = JSON.parse(fs.readFileSync('hotels.json', 'utf-8'));

// Array to store conversation context
let conversationContext = [];

// Function to get a response from GPT-4 Turbo
const getGPT4TurboResponse = async (userQuestion, context) => {
    const prompt = `
    User's question: ${userQuestion}
    Here is the hotel data: ${JSON.stringify(hotels)}
    Context: ${context.join('\n')}
    Answer based on the hotel data in the same language as the user's question:

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

// Function to send booking confirmation email
const sendBookingConfirmation = async (email, name, phone, hotel) => {
    const bookingDetails = {
        email: email,
        name: name,
        phone: phone,
        hotel: hotel
    };

    try {
        await axios.post(WEBHOOK_URL, bookingDetails, {
            headers: {
                'Content-Type': 'application/json'
            }
        });
        console.log(`Booking confirmation sent successfully to ${email}.`);
    } catch (error) {
        console.error('Error sending booking confirmation:', error.message);
    }
};

// Main function to run the terminal app
const main = async () => {
    console.log('Welcome to the Hotel Info Chatbot!');
    while (true) {
        const userQuestion = readlineSync.question('Ask a question about the hotels (or type "exit" to quit): ');
        if (userQuestion.toLowerCase() === 'exit') {
            console.log('Goodbye!');
            break;
        }

        if (userQuestion.toLowerCase().includes('book hotel')) {
            // Prompt for booking details
            const email = readlineSync.question('Please enter your email: ');
            const name = readlineSync.question('Please enter your name: ');
            const phone = readlineSync.question('Please enter your phone number: ');

            // Extract hotel name from user's question (assuming it contains the hotel name)
            const hotelNameMatch = userQuestion.match(/book hotel (.+)/i);
            if (hotelNameMatch && hotelNameMatch[1]) {
                const hotelName = hotelNameMatch[1].trim();
                const hotel = hotels.find(h => h.name.toLowerCase() === hotelName.toLowerCase());

                if (hotel) {
                    // Confirm booking and send confirmation email
                    await sendBookingConfirmation(email, name, phone, hotel);
                    console.log(`Your booking at ${hotel.name} is confirmed.`);
                } else {
                    console.log('Sorry, the specified hotel could not be found.');
                }
            } else {
                console.log('Please specify the hotel name you want to book.');
            }
        } else {
            const gpt4TurboResponse = await getGPT4TurboResponse(userQuestion, conversationContext);
            console.log(`GPT-4 Turbo: ${gpt4TurboResponse}`);

            // Store user question and GPT-4 response in context
            conversationContext.push(`User: ${userQuestion}`);
            conversationContext.push(`GPT-4 Turbo: ${gpt4TurboResponse}`);
        }
    }
};

// Run the main function
main();
