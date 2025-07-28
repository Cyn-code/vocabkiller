from http.server import BaseHTTPRequestHandler
import json
import spacy
import sys
import subprocess

def lemmatize_word(word):
    """Lemmatize a word using spaCy"""
    try:
        # Load spaCy model
        nlp = spacy.load("en_core_web_sm")
        doc = nlp(word)
        token = doc[0]
        
        return {
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
            
            return {
                "original": word,
                "lemma": token.lemma_,
                "pos": token.pos_,
                "success": True,
                "method": "spaCy (downloaded)"
            }
        except Exception as e:
            return {
                "original": word,
                "lemma": word,
                "pos": "UNKNOWN",
                "success": False,
                "error": f"Failed to load spaCy: {str(e)}"
            }
    except Exception as e:
        return {
            "original": word,
            "lemma": word,
            "pos": "UNKNOWN",
            "success": False,
            "error": f"spaCy error: {str(e)}"
        }

class handler(BaseHTTPRequestHandler):
    def do_POST(self):
        # Set CORS headers
        self.send_response(200)
        self.send_header('Content-type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()
        
        try:
            # Get request body
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            data = json.loads(post_data.decode('utf-8'))
            
            word = data.get('word', '').strip()
            
            if not word:
                response = {"error": "Word is required"}
            else:
                response = lemmatize_word(word)
                
        except Exception as e:
            response = {"error": f"Request error: {str(e)}"}
        
        # Send response
        self.wfile.write(json.dumps(response).encode())
    
    def do_OPTIONS(self):
        # Handle CORS preflight
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers() 