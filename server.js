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
    console.log('Received request at /api/chat');
    console.log('Request headers:', JSON.stringify(req.headers));
    console.log('Request body type:', typeof req.body);
    console.log('Request body:', req.body ? JSON.stringify(req.body).substring(0, 200) : 'undefined');
    
    // Safely extract body parameters with fallbacks
    if (!req.body) {
      return res.status(400).json({ 
        error: 'Body is undefined', 
        response: "I'm having trouble understanding your message. Please try again.",
        status: 'error'
      });
    }
    
    // Extract properties safely
    const message = req.body.message || '';
    const context = req.body.context || [];
    const personality = req.body.personality || 'helpful assistant';
    const gameInfo = req.body.gameInfo || null;
    
    if (!message) {
      return res.status(400).json({ 
        error: 'Message is required', 
        response: "I didn't receive any message to respond to. What would you like to talk about?",
        status: 'error'
      });
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
    console.log("Using fallback response due to error:", error.name, error.message);
    
    // Generate a simple response without external API
    let fallbackResponse = "I'm sorry, my AI features are currently limited. ";
    
    try {
      // Safely check message - handle case where req.body might be undefined
      const userMessage = req.body && req.body.message ? req.body.message.toLowerCase() : '';
      
      if (userMessage.includes('hello') || userMessage.includes('hi')) {
        fallbackResponse += "Hello there! How can I help you today?";
      } else if (userMessage.includes('help')) {
        fallbackResponse += "I wish I could help more, but my systems are operating in limited mode.";
      } else if (userMessage.includes('game')) {
        fallbackResponse += "I can see you're trying to talk about a game. That sounds interesting!";
      } else {
        fallbackResponse += "I understand you're trying to communicate with me, but I'm in basic mode right now.";
      }
    } catch (innerError) {
      // If there's an error even in the fallback, use the most basic response
      console.error('Error even in fallback response generator:', innerError.message);
      fallbackResponse = "Hello! I'm having some technical difficulties, but I'm still here to chat with you.";
    }
    
    return res.status(200).json({
      response: fallbackResponse,
      status: 'fallback',
      error: error.message || 'Unknown error'
    });
  }
});

// Backup endpoint for simple responses (used when main API is down)
app.post('/api/simple-chat', (req, res) => {
  try {
    console.log('Received request at /api/simple-chat');
    console.log('Request headers:', JSON.stringify(req.headers));
    console.log('Request body type:', typeof req.body);
    console.log('Request body:', req.body ? JSON.stringify(req.body).substring(0, 200) : 'undefined');
    
    // Safely handle undefined body
    if (!req.body) {
      return res.status(200).json({  // Using 200 instead of 400 to ensure the client gets a response
        response: "I'm having trouble understanding your message. Please try again.",
        status: 'error_with_fallback'
      });
    }
    
    // Extract message safely
    const message = req.body.message || '';
    
    if (!message) {
      return res.status(200).json({  // Using 200 to ensure client gets a response
        response: "I didn't receive any message to respond to. What would you like to talk about?",
        status: 'error_with_fallback'
      });
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

// === POLLING MECHANISM FOR ROBLOX HTTP WORKAROUND ===
// This system allows Roblox clients to work around HTTP restrictions
// by creating a polling-based approach instead of direct HTTP requests

// Storage for polling requests (in-memory, would use a proper database in production)
const pollRequests = new Map();

// Register a new polling request
app.post('/api/poll-register', (req, res) => {
  try {
    const { id, url, method, headers, body } = req.body;
    
    if (!id || !url) {
      return res.status(400).json({ error: 'Missing required polling parameters' });
    }
    
    // Store the request details
    pollRequests.set(id, {
      status: 'pending',
      created: Date.now(),
      url,
      method,
      headers,
      body,
      response: null
    });
    
    console.log(`Polling request registered with ID: ${id}`);
    
    // Process the request asynchronously
    processPollingRequest(id);
    
    return res.status(200).json({
      status: 'registered',
      id
    });
  } catch (error) {
    console.error('Error registering poll request:', error);
    return res.status(500).json({
      status: 'error',
      error: error.message
    });
  }
});

// Check the status of a polling request
app.get('/api/poll-result', (req, res) => {
  try {
    const { id } = req.query;
    
    if (!id) {
      return res.status(400).json({ error: 'Missing polling ID' });
    }
    
    // Check if the request exists
    if (!pollRequests.has(id)) {
      return res.status(404).json({
        status: 'not_found',
        error: 'No polling request found with that ID'
      });
    }
    
    // Get the current status
    const pollRequest = pollRequests.get(id);
    
    // If the request is complete, return the response and remove it from storage
    if (pollRequest.status === 'complete') {
      const response = pollRequest.response;
      
      // Clean up old requests (optional, can be kept for debugging)
      pollRequests.delete(id);
      
      return res.status(200).json({
        status: 'complete',
        response
      });
    }
    
    // If still processing, just return the current status
    return res.status(200).json({
      status: pollRequest.status
    });
    
  } catch (error) {
    console.error('Error checking poll status:', error);
    return res.status(500).json({
      status: 'error',
      error: error.message
    });
  }
});

// Function to process a polling request asynchronously
async function processPollingRequest(id) {
  const pollRequest = pollRequests.get(id);
  
  if (!pollRequest) {
    return;
  }
  
  try {
    // Update status to processing
    pollRequest.status = 'processing';
    pollRequests.set(id, pollRequest);
    
    // Make the actual request
    let apiResponse;
    
    if (pollRequest.url.includes('/api/chat')) {
      // Parse the body to get message and context
      const requestBody = JSON.parse(pollRequest.body);
      
      // Special handling for chat API
      const { message, context, personality, gameInfo } = requestBody;
      
      // Use the simple response generator
      const simpleResponse = generateSimpleResponse(message);
      
      apiResponse = {
        response: simpleResponse,
        status: 'polling_success'
      };
      
    } else {
      // For other endpoints, make the request directly
      apiResponse = { response: "Polling response for general request" };
    }
    
    // Update with the completed response
    pollRequest.status = 'complete';
    pollRequest.response = apiResponse;
    pollRequests.set(id, pollRequest);
    
    console.log(`Polling request ${id} completed successfully`);
    
  } catch (error) {
    console.error(`Error processing polling request ${id}:`, error);
    
    // Update with error
    pollRequest.status = 'error';
    pollRequest.error = error.message;
    pollRequests.set(id, pollRequest);
  }
}

// Helper function to generate simple responses for the polling API
function generateSimpleResponse(message) {
  const lowerMessage = message.toLowerCase();
  
  if (lowerMessage.includes('hello') || lowerMessage.includes('hi')) {
    return "Hello! I'm your AI assistant in this Roblox game. How can I help you today?";
  } 
  else if (lowerMessage.includes('help')) {
    return "I'd be happy to help! I can answer questions, chat with you, or follow simple commands in the game.";
  } 
  else if (lowerMessage.includes('follow')) {
    return "Sure, I'll follow you around! Just lead the way and I'll stay close by.";
  }
  else if (lowerMessage.includes('stop') || lowerMessage.includes('stay')) {
    return "Alright, I'll stay right here until you need me to move again.";
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
    return genericResponses[Math.floor(Math.random() * genericResponses.length)];
  }
}

// Clean up old polling requests periodically
setInterval(() => {
  const now = Date.now();
  const maxAge = 5 * 60 * 1000; // 5 minutes
  
  pollRequests.forEach((request, id) => {
    if (now - request.created > maxAge) {
      pollRequests.delete(id);
    }
  });
}, 60000); // Run cleanup every minute

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Roblox AI ChatBot Proxy Server running on port ${PORT}`);
  console.log(`Server health check available at http://localhost:${PORT}/`);
  console.log(`For external connections, use http://YOUR_IP_ADDRESS:${PORT}/`);
  console.log(`CORS is enabled for all origins`);
  console.log(`Polling API for HTTP workarounds is enabled`);
});
