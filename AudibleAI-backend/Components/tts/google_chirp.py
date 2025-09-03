import os
import requests
import logging
from logging_config import app_logger, error_logger

def generate_tts_audio(text, voice="en-US-Wavenet-D", speaking_rate="1.0", pitch="0.0"):
    """
    Calls Google Chirp TTS API and returns audio content (base64).
    """
    CHIRP_API_URL = "https://texttospeech.googleapis.com/v1/text:synthesize"  # Example endpoint
    CHIRP_API_KEY = os.getenv("TTS_API_KEY")

    # Default voice settings
    DEFAULT_VOICE = "en-US-Wavenet-D"
    DEFAULT_RATE = 1.0
    DEFAULT_PITCH = 0.0

    if not voice:
        voice = DEFAULT_VOICE

    if not speaking_rate:
        speaking_rate = DEFAULT_RATE

    if not pitch:
        pitch = DEFAULT_PITCH

    if not CHIRP_API_KEY:
        raise ValueError("TTS_API_KEY is not set in environment variables.")

    headers = {
        "X-Goog-Api-Key": CHIRP_API_KEY,
        "Content-Type": "application/json"
    }
    payload = {
        "input": {"text": text},
        "voice": {"languageCode": voice.split('-')[0] + '-' + voice.split('-')[1], "name": voice},
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
        audio_content_base64 = response.json().get("audioContent")
        if not audio_content_base64:
            raise ValueError("No audio content returned from TTS API.")
        return audio_content_base64  # base64-encoded string
    except Exception as e:
        error_logger.error(f"TTS generation error: {e}", exc_info=True)
        raise
