const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const axios = require('axios');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 8080;

// Important: Set up correct middleware for handling Roblox requests
app.use(cors({
  origin: '*',
  methods: ['POST', 'GET', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Support both JSON and raw text bodies (important for compatibility)
app.use(bodyParser.json({ type: 'application/json' }));
app.use(bodyParser.text({ type: 'text/plain' }));
app.use(bodyParser.raw({ type: '*/*' }));

// Test route to check if server is running
app.get('/', (req, res) => {
  res.send('Roblox AI Proxy is running!');
});

// The main route that will handle requests from the Roblox script
app.post('/', async (req, res) => {
  console.log('Received request from Roblox');
  console.log('Headers:', req.headers);
  console.log('Body type:', typeof req.body);
  
  try {
    let prompt;
    let bodyData = req.body;

    // Handle different request body formats
    if (typeof bodyData === 'string') {
      try {
        bodyData = JSON.parse(bodyData);
      } catch (e) {
        console.log('Body is not valid JSON, treating as plain text');
      }
    }

    // Extract prompt from various possible formats
    if (typeof bodyData === 'string') {
      prompt = bodyData;
    } else if (bodyData && bodyData.prompt) {
      prompt = bodyData.prompt;
    } else if (bodyData && bodyData.contents && 
              bodyData.contents[0] && 
              bodyData.contents[0].parts && 
              bodyData.contents[0].parts[0]) {
      prompt = bodyData.contents[0].parts[0].text;
    } else {
      return res.status(400).send('Invalid request format. Could not extract prompt.');
    }

    console.log('Extracted prompt:', prompt);

    // Call the Gemini API (you'll need to add your API key to .env)
    const geminiResponse = await axios.post(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent',
      {
        contents: [{ parts: [{ text: prompt }] }]
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': process.env.GEMINI_API_KEY
        }
      }
    );

    // Extract the response text
    const responseText = geminiResponse.data.candidates[0].content.parts[0].text;
    console.log('AI response:', responseText);

    // Send response back in a format the Roblox script can understand
    res.json({
      response: responseText,
      candidates: [{
        content: {
          parts: [{ text: responseText }]
        }
      }]
    });
    
  } catch (error) {
    console.error('Error processing request:', error);
    
    // Send a clear error message
    res.status(500).json({
      error: 'Internal server error',
      message: error.message,
      details: error.response ? error.response.data : null
    });
  }
});

// Start the server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`API Key configured: ${process.env.GEMINI_API_KEY ? 'Yes' : 'No'}`);
});
