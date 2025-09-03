import os
import requests
import logging
from logging_config import app_logger, error_logger

CHIRP_API_URL = "https://chirp.googleapis.com/v1/tts:generate"  # Example endpoint
CHIRP_API_KEY = os.getenv("TTS_API_KEY")

# Default voice settings
DEFAULT_VOICE = "en-US-Wavenet-D"
DEFAULT_RATE = 1.0
DEFAULT_PITCH = 0.0

def generate_tts_audio(text, voice=DEFAULT_VOICE, speaking_rate=DEFAULT_RATE, pitch=DEFAULT_PITCH):
    """
    Calls Google Chirp TTS API and returns audio content (bytes).
    """
    headers = {
        "Authorization": f"Bearer {CHIRP_API_KEY}",
        "Content-Type": "application/json"
    }
    payload = {
        "input": {"text": text},
        "voice": {"name": voice},
        "audioConfig": {
            "audioEncoding": "MP3",
            "speakingRate": speaking_rate,
            "pitch": pitch
        }
    }
    try:
        app_logger.info(f"TTS request: text={text[:30]}... voice={voice} rate={speaking_rate} pitch={pitch}")
        response = requests.post(CHIRP_API_URL, json=payload, headers=headers)
        response.raise_for_status()
        audio_content = response.json().get("audioContent")
        if not audio_content:
            raise ValueError("No audio content returned from TTS API.")
        return audio_content  # base64-encoded string
    except Exception as e:
        error_logger.error(f"TTS generation error: {e}", exc_info=True)
        raise
