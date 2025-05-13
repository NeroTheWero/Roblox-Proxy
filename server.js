// Universal Roblox AI ChatBot Proxy Server
// This server acts as a middleware between the Roblox client and AI APIs
// It handles requests from the Roblox client and forwards them to AI services

const express = require('express');
const cors = require('cors');
const axios = require('axios');
const app = express();
const PORT = process.env.PORT || 5000;

// Configure middleware
app.use(express.json());
app.use(cors());

// Environmental variables for API keys
// Using the provided Gemini API key
const AI_API_KEY = process.env.GEMINI_API_KEY || "AIzaSyAWHh4EEvfugfzYNfb7hq0g3e_HVtOoCgk";
const API_TYPE = "simple"; // Use "openai", "gemini", or "simple" for basic responses only

// Health check endpoint
app.get('/', (req, res) => {
  res.status(200).send({
    status: 'OK',
    message: 'Universal Roblox AI ChatBot Proxy Server is running',
    version: '1.2.0'
  });
});

// API endpoints
const API_ENDPOINTS = {
  openai: 'https://api.openai.com/v1/chat/completions',
  gemini: 'https://generativelanguage.googleapis.com/v1/models/gemini-pro:generateContent'
};

// Default models for each API
const DEFAULT_MODELS = {
  openai: 'gpt-3.5-turbo',
  gemini: 'gemini-pro'
};

// Main proxy endpoint for AI chat
app.post('/api/chat', async (req, res) => {
  try {
    const { message, context, personality, gameInfo } = req.body;
    
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Authentication - can be enhanced with proper auth
    const clientToken = req.headers['x-client-token'] || '';
    // Simplified auth for demo - in production use proper authentication
    if (clientToken !== 'roblox-chatbot-client') {
      console.log('Authentication failed - using default limited response');
    }

    // Log request for debugging (remove in production)
    console.log(`Request from client: "${message.substring(0, 50)}..."`);
    
    // Prepare system prompt with personality and context
    const systemPrompt = `You are a ${personality || 'helpful assistant'} in a Roblox game. 
      ${gameInfo ? `You are in the game "${gameInfo.name}" created by ${gameInfo.creator}.` : ''}
      Keep your responses concise and appropriate for all ages.
      Respond to the user's message in a natural, conversational way.`;
    
    // Prepare messages for API
    const messages = [
      { role: 'system', content: systemPrompt }
    ];
    
    // Add context if provided
    if (context && Array.isArray(context)) {
      context.forEach(item => {
        messages.push({ 
          role: item.role || 'user', 
          content: item.content 
        });
      });
    }
    
    // Add current message
    messages.push({ role: 'user', content: message });
    
    // Prepare API request based on API type
    let apiResponse;
    
    if (API_TYPE === "simple") {
      console.log("Using simple response mode");
      
      // Generate a more varied and responsive AI-like message
      let simpleResponse = "";
      
      // Check for specific keywords to give better context-dependent responses
      if (message.toLowerCase().includes('hello') || message.toLowerCase().includes('hi')) {
        simpleResponse = "Hello! I'm your AI assistant in this Roblox game. How can I help you today?";
      } 
      else if (message.toLowerCase().includes('help')) {
        simpleResponse = "I'd be happy to help! I can answer questions, chat with you, or follow simple commands in the game.";
      } 
      else if (message.toLowerCase().includes('follow')) {
        simpleResponse = "Sure, I'll follow you around! Just lead the way and I'll stay close by.";
      }
      else if (message.toLowerCase().includes('stop') || message.toLowerCase().includes('stay')) {
        simpleResponse = "Alright, I'll stay right here until you need me to move again.";
      }
      else if (message.toLowerCase().includes('dance')) {
        simpleResponse = "Watch me dance! I've got some cool moves to show you!";
      }
      else if (message.toLowerCase().includes('bye') || message.toLowerCase().includes('goodbye')) {
        simpleResponse = "It was nice chatting with you! Goodbye, and have a great time in the game!";
      }
      else if (message.toLowerCase().includes('name')) {
        simpleResponse = "My name is AI Assistant! I'm an AI chatbot built to interact with players in Roblox games.";
      }
      else if (message.toLowerCase().includes('game') || message.toLowerCase().includes('play')) {
        simpleResponse = "This game looks fun! I'm here to make your gaming experience more interactive and enjoyable.";
      } 
      else {
        // For other messages, provide a thoughtful generic response
        const genericResponses = [
          "That's an interesting point! What else would you like to talk about?",
          "I understand what you're saying. How can I assist you further?",
          "Thanks for sharing that with me. Is there anything specific you'd like to know?",
          "I'm processing what you said. Can you tell me more about what you're interested in?",
          "That's good to know! What else is on your mind?",
          "I appreciate you chatting with me. What would you like to do next in the game?"
        ];
        
        // Select a random response from the array
        simpleResponse = genericResponses[Math.floor(Math.random() * genericResponses.length)];
      }
      
      return res.status(200).json({
        response: simpleResponse,
        status: 'simple'
      });
    }
    else if (API_TYPE === "gemini") {
      console.log("Using Gemini API");
      
      try {
        // Format for Gemini API
        const geminiPayload = {
          contents: [
            {
              parts: [
                { text: systemPrompt },
                ...messages.filter(m => m.role !== "system").map(m => ({ text: m.content }))
              ]
            }
          ],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 150,
            topP: 0.8,
            topK: 40
          }
        };
        
        // Log payload for debugging
        console.log("Gemini payload:", JSON.stringify(geminiPayload).substring(0, 200) + "...");
        
        // Make request to Gemini API with API key as query param
        const endpoint = `${API_ENDPOINTS.gemini}?key=${AI_API_KEY}`;
        console.log("Gemini endpoint:", endpoint);
        
        apiResponse = await axios.post(endpoint, geminiPayload, {
          headers: {
            'Content-Type': 'application/json'
          }
        });
        
        console.log("Gemini API response status:", apiResponse.status);
      } catch (error) {
        console.error("Gemini API error:", error.message);
        if (error.response) {
          console.error("Response status:", error.response.status);
          console.error("Response data:", JSON.stringify(error.response.data));
        }
        throw error; // Rethrow to be caught by the outer catch block
      }
      
      // Extract response from Gemini format
      if (apiResponse.data && 
          apiResponse.data.candidates && 
          apiResponse.data.candidates.length > 0 &&
          apiResponse.data.candidates[0].content &&
          apiResponse.data.candidates[0].content.parts &&
          apiResponse.data.candidates[0].content.parts.length > 0) {
        
        return res.status(200).json({
          response: apiResponse.data.candidates[0].content.parts[0].text.trim(),
          status: 'success',
          provider: 'gemini'
        });
      }
      
    } else {
      console.log("Using OpenAI API");
      
      // Make request to OpenAI API
      apiResponse = await axios.post(API_ENDPOINTS.openai, {
        model: DEFAULT_MODELS.openai,
        messages: messages,
        max_tokens: 150,
        temperature: 0.7,
      }, {
        headers: {
          'Authorization': `Bearer ${AI_API_KEY}`,
          'Content-Type': 'application/json'
        }
      });
      
      // Extract response from OpenAI format
      if (apiResponse.data && 
          apiResponse.data.choices && 
          apiResponse.data.choices.length > 0) {
        
        return res.status(200).json({
          response: apiResponse.data.choices[0].message.content.trim(),
          status: 'success',
          provider: 'openai'
        });
      }
    }
    
    // If we've reached here, something went wrong with the API call
    // We'll use a fallback response
    console.log("Failed to get proper response from API, using fallback");
    
    return res.status(200).json({
      response: "I'm sorry, I couldn't process your message properly. Could you try again?",
      status: 'error',
      error: 'Failed to parse API response'
    });
    
  } catch (error) {
    console.error('Error processing chat request:', error.message);
    
    // Create a fallback response
    console.log("Using fallback response");
    
    // Generate a simple response without external API
    let fallbackResponse = "I'm sorry, my AI features are currently limited. ";
    
    if (req.body.message.toLowerCase().includes('hello') || req.body.message.toLowerCase().includes('hi')) {
      fallbackResponse += "Hello there! How can I help you today?";
    } else if (req.body.message.toLowerCase().includes('help')) {
      fallbackResponse += "I wish I could help more, but my systems are operating in limited mode.";
    } else if (req.body.message.toLowerCase().includes('game')) {
      fallbackResponse += "I can see you're trying to talk about a game. That sounds interesting!";
    } else {
      fallbackResponse += "I understand you're trying to communicate with me, but I'm in basic mode right now.";
    }
    
    return res.status(200).json({
      response: fallbackResponse,
      status: 'fallback',
      error: error.message
    });
  }
});

// Backup endpoint for simple responses (used when main API is down)
app.post('/api/simple-chat', (req, res) => {
  try {
    const { message } = req.body;
    
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }
    
    // Generate a simple response without external API
    let response = "I'm sorry, my AI features are currently limited. ";
    
    if (message.toLowerCase().includes('hello') || message.toLowerCase().includes('hi')) {
      response += "Hello there! How can I help you today?";
    } else if (message.toLowerCase().includes('help')) {
      response += "I wish I could help more, but my systems are operating in limited mode.";
    } else if (message.toLowerCase().includes('game')) {
      response += "I can see you're playing a game! I hope you're having fun.";
    } else {
      response += "I understand you're trying to communicate with me, but I'm in basic mode right now.";
    }
    
    res.status(200).json({
      response: response,
      status: 'limited'
    });
    
  } catch (error) {
    console.error('Error processing simple chat request:', error.message);
    res.status(500).json({
      response: "I'm having trouble responding right now.",
      status: 'error',
      error: error.message
    });
  }
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Roblox AI ChatBot Proxy Server running on port ${PORT}`);
  console.log(`Server health check available at http://localhost:${PORT}/`);
});
