from markdown_it import MarkdownIt
from mdit_plain.renderer import RendererPlain
import re

def clean_markdown_for_tts(markdown_text):
    """
    Convert markdown to plain text suitable for TTS processing.
    Uses mdit_plain renderer for efficient markdown to plain text conversion.
    
    Args:
        markdown_text (str): The markdown text to process
        
    Returns:
        str: Clean plain text suitable for TTS
    """
    # Initialize markdown parser with plain text renderer
    parser = MarkdownIt(renderer_cls=RendererPlain)
    
    # Convert markdown to plain text
    text = parser.render(markdown_text)
    
    # Clean up any remaining artifacts
    
    # Fix spacing around punctuation
    text = re.sub(r'\s+([.,!?])', r'\1', text)
    
    # Replace common symbols with spoken words
    replacements = {
        '/': ' slash ',
        '\\': ' backslash ',
        '=': ' equals ',
        '>': ' greater than ',
        '<': ' less than ',
        '{}': ' curly braces ',
        '()': ' parentheses ',
        '[]': ' square brackets ',
        'e.g.': 'for example',
        'i.e.': 'that is',
        'etc.': 'etcetera'
    }
    
    for old, new in replacements.items():
        text = text.replace(old, new)
    
    # Normalize whitespace
    text = ' '.join(text.split())
    
    return text.strip()
