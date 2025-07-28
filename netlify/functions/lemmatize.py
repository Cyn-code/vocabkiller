import json
import spacy
import sys
import subprocess
import os

# Global variable to store loaded model
nlp = None

def load_spacy_model():
    """Load spaCy model with error handling"""
    global nlp
    
    if nlp is not None:
        return nlp
    
    try:
        # Try to load existing model
        nlp = spacy.load("en_core_web_sm")
        print("spaCy model loaded successfully")
        return nlp
    except OSError:
        # Model not found, download it
        print("Downloading spaCy model...")
        try:
            subprocess.check_call([
                sys.executable, "-m", "spacy", "download", "en_core_web_sm"
            ])
            nlp = spacy.load("en_core_web_sm")
            print("spaCy model downloaded and loaded successfully")
            return nlp
        except Exception as e:
            print(f"Failed to download spaCy model: {e}")
            # Return None to indicate failure
            return None

def lemmatize_word(word):
    """Lemmatize a single word using spaCy"""
    try:
        # Load model if not already loaded
        model = load_spacy_model()
        
        if model is None:
            return {
                "original": word,
                "lemma": word,
                "pos": "UNKNOWN",
                "success": False,
                "error": "spaCy model could not be loaded"
            }
        
        # Process the word
        doc = model(word)
        token = doc[0]
        
        return {
            "original": word,
            "lemma": token.lemma_,
            "pos": token.pos_,
            "success": True
        }
    except Exception as e:
        print(f"Lemmatization error for '{word}': {e}")
        return {
            "original": word,
            "lemma": word,
            "pos": "UNKNOWN",
            "success": False,
            "error": str(e)
        }

def handler(event, context):
    """Netlify Function handler"""
    try:
        # Handle CORS preflight requests
        if event.get('httpMethod') == 'OPTIONS':
            return {
                'statusCode': 200,
                'headers': {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Headers': 'Content-Type',
                    'Access-Control-Allow-Methods': 'POST, OPTIONS'
                },
                'body': ''
            }
        
        # Parse request
        if event.get('httpMethod') == 'POST':
            try:
                body = json.loads(event.get('body', '{}'))
                word = body.get('word', '').strip()
            except json.JSONDecodeError:
                return {
                    'statusCode': 400,
                    'headers': {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    },
                    'body': json.dumps({'error': 'Invalid JSON'})
                }
            
            if not word:
                return {
                    'statusCode': 400,
                    'headers': {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    },
                    'body': json.dumps({'error': 'Word is required'})
                }
            
            # Process lemmatization
            result = lemmatize_word(word)
            
            return {
                'statusCode': 200,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Headers': 'Content-Type'
                },
                'body': json.dumps(result)
            }
        else:
            return {
                'statusCode': 405,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({'error': 'Method not allowed. Use POST.'})
            }
            
    except Exception as e:
        print(f"Function error: {e}")
        return {
            'statusCode': 500,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({'error': 'Internal server error'})
        } 