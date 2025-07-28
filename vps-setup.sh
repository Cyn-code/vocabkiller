#!/bin/bash

# VocabKiller spaCy Setup Script for VPS
# Run this on your VPS: bash vps-setup.sh

echo "Setting up VocabKiller spaCy environment..."

# Create directory
mkdir -p /root/vocabkiller
cd /root/vocabkiller

# Create virtual environment
echo "Creating virtual environment..."
python3 -m venv vocabkiller-venv

# Activate environment
source vocabkiller-venv/bin/activate

# Upgrade pip
pip install --upgrade pip

# Install spaCy
echo "Installing spaCy..."
pip install spacy

# Download English model
echo "Downloading spaCy English model..."
python -m spacy download en_core_web_sm

# Install Flask for API
echo "Installing Flask..."
pip install flask flask-cors

# Create API file
echo "Creating API file..."
cat > app.py << 'EOF'
from flask import Flask, request, jsonify
from flask_cors import CORS
import spacy
import sys
import subprocess

app = Flask(__name__)
CORS(app)

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
            "success": True,
            "method": "spaCy"
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

@app.route('/lemmatize', methods=['POST'])
def lemmatize():
    """API endpoint for lemmatization"""
    try:
        data = request.get_json()
        word = data.get('word', '').strip()
        
        if not word:
            return jsonify({"error": "Word is required"}), 400
        
        result = lemmatize_word(word)
        return jsonify(result)
        
    except Exception as e:
        return jsonify({"error": f"Request error: {str(e)}"}), 500

@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint"""
    return jsonify({"status": "healthy", "service": "VocabKiller spaCy API"})

if __name__ == '__main__':
    print("Starting VocabKiller spaCy API...")
    app.run(host='0.0.0.0', port=5000, debug=False)
EOF

# Create systemd service file
echo "Creating systemd service..."
cat > /etc/systemd/system/vocabkiller-spacy.service << 'EOF'
[Unit]
Description=VocabKiller spaCy API
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/root/vocabkiller
Environment=PATH=/root/vocabkiller/vocabkiller-venv/bin
ExecStart=/root/vocabkiller/vocabkiller-venv/bin/python app.py
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

# Enable and start service
echo "Enabling and starting service..."
systemctl daemon-reload
systemctl enable vocabkiller-spacy
systemctl start vocabkiller-spacy

echo "Setup complete!"
echo "API will be available at: http://8.218.249.176:5000"
echo "Test with: curl -X POST http://8.218.249.176:5000/lemmatize -H 'Content-Type: application/json' -d '{\"word\": \"books\"}'" 