
import os
import requests
import logging
from logging_config import app_logger, error_logger


def get_gemini_response(user_message):
    """
    Sends a chat message to Gemini 2.5 Flash API and returns the AI response text.
    """
    api_key = os.getenv('LLM_API_KEY')
    endpoint = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent'
    headers = {
        'Content-Type': 'application/json',
        'x-goog-api-key': api_key
    }
    payload = {
        "contents": [
            {"role": "user", "parts": [{"text": user_message}]}
        ]
    }
    try:
        app_logger.info(f"Gemini API user message recieved")
        response = requests.post(endpoint, json=payload, headers=headers)
        response.raise_for_status()
        data = response.json()
        ai_text = data.get('candidates', [{}])[0].get('content', {}).get('parts', [{}])[0].get('text', '')
        app_logger.info(f"Gemini API response generated")
        return ai_text
    except Exception as e:
        error_logger.error(f"Gemini API Error: {e}", exc_info=True)
        return f"[Gemini API Error]: {str(e)}"

def get_gemini_response_stream(user_message, chunk_size=20):
    """
    Simulates streaming Gemini response by yielding chunks of text.
    """
    try:
        full_text = get_gemini_response(user_message)
        for i in range(0, len(full_text), chunk_size):
            yield full_text[i:i+chunk_size]
    except Exception as e:
        error_logger.error(f"Gemini stream error: {e}", exc_info=True)
