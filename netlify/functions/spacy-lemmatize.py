import json
import spacy
import sys
import subprocess
import os

def handler(event, context):
    """
    Netlify Function handler for spaCy lemmatization
    """
    
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
    
    try:
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
            
            # Load spaCy model and process word
            try:
                # Try to load the model
                nlp = spacy.load("en_core_web_sm")
                doc = nlp(word)
                token = doc[0]
                
                result = {
                    "original": word,
                    "lemma": token.lemma_,
                    "pos": token.pos_,
                    "success": True,
                    "method": "spaCy"
                }
            except OSError:
                # Model not found, try to download it
                try:
                    subprocess.check_call([
                        sys.executable, "-m", "spacy", "download", "en_core_web_sm"
                    ])
                    nlp = spacy.load("en_core_web_sm")
                    doc = nlp(word)
                    token = doc[0]
                    
                    result = {
                        "original": word,
                        "lemma": token.lemma_,
                        "pos": token.pos_,
                        "success": True,
                        "method": "spaCy (downloaded)"
                    }
                except Exception as download_error:
                    result = {
                        "original": word,
                        "lemma": word,
                        "pos": "UNKNOWN",
                        "success": False,
                        "error": f"Failed to download spaCy model: {str(download_error)}"
                    }
            except Exception as spacy_error:
                result = {
                    "original": word,
                    "lemma": word,
                    "pos": "UNKNOWN",
                    "success": False,
                    "error": f"spaCy error: {str(spacy_error)}"
                }
            
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
        return {
            'statusCode': 500,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({'error': f'Function error: {str(e)}'})
        } 