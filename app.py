import os
import logging
import requests
from flask import Flask, request, jsonify, render_template
from flask_cors import CORS

# Setup logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Get API key from environment variable
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "")
GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent"

@app.route('/')
def index():
    """Render the main documentation page"""
    return render_template('index.html')

@app.route('/api/gemini', methods=['POST'])
def gemini_proxy():
    """
    Proxy endpoint that receives requests from Roblox and forwards them to Gemini API
    Expects JSON body with 'prompt' field
    """
    try:
        # Get data from request
        data = request.get_json()
        
        if not data or 'prompt' not in data:
            logger.error("Invalid request: missing prompt")
            return jsonify({
                'success': False,
                'error': 'Missing prompt parameter'
            }), 400
        
        prompt = data['prompt']
        logger.debug(f"Received prompt: {prompt}")
        
        # Check if API key is available
        if not GEMINI_API_KEY:
            logger.error("API key not configured")
            return jsonify({
                'success': False,
                'error': 'API key not configured on server'
            }), 500
        
        # Prepare request to Gemini API
        headers = {
            'Content-Type': 'application/json'
        }
        
        # Format the request body for Gemini API
        gemini_data = {
            "contents": [
                {
                    "parts": [
                        {
                            "text": prompt
                        }
                    ]
                }
            ],
            "generationConfig": {
                "temperature": 0.7,
                "maxOutputTokens": 500
            }
        }
        
        # Make request to Gemini API with API key in the URL
        gemini_url = f"{GEMINI_API_URL}?key={GEMINI_API_KEY}"
        logger.debug("Sending request to Gemini API")
        response = requests.post(gemini_url, json=gemini_data, headers=headers)
        
        # Check if the request was successful
        if response.status_code == 200:
            response_data = response.json()
            
            # Extract text from Gemini response
            try:
                ai_text = response_data['candidates'][0]['content']['parts'][0]['text']
                logger.debug(f"Received response from Gemini: {ai_text[:100]}...")
                
                return jsonify({
                    'success': True,
                    'response': ai_text
                })
            except (KeyError, IndexError) as e:
                logger.error(f"Error parsing Gemini response: {e}")
                logger.error(f"Response content: {response_data}")
                return jsonify({
                    'success': False,
                    'error': 'Error parsing Gemini response',
                    'details': str(e)
                }), 500
        else:
            logger.error(f"Gemini API error: {response.status_code} - {response.text}")
            return jsonify({
                'success': False,
                'error': f"Gemini API
