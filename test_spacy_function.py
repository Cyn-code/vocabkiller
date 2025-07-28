#!/usr/bin/env python3
"""
Test script that simulates the Netlify function behavior
"""

import json
import spacy
import sys
import subprocess

def load_spacy_model():
    """Load spaCy model with error handling"""
    try:
        # Try to load existing model
        nlp = spacy.load("en_core_web_sm")
        print("✅ spaCy model loaded successfully")
        return nlp
    except OSError:
        # Model not found, download it
        print("📥 Downloading spaCy model...")
        try:
            subprocess.check_call([
                sys.executable, "-m", "spacy", "download", "en_core_web_sm"
            ])
            nlp = spacy.load("en_core_web_sm")
            print("✅ spaCy model downloaded and loaded successfully")
            return nlp
        except Exception as e:
            print(f"❌ Failed to download spaCy model: {e}")
            return None

def lemmatize_word(word, model):
    """Lemmatize a single word using spaCy"""
    try:
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
        print(f"❌ Lemmatization error for '{word}': {e}")
        return {
            "original": word,
            "lemma": word,
            "pos": "UNKNOWN",
            "success": False,
            "error": str(e)
        }

def test_function_logic():
    """Test the complete function logic"""
    print("🧪 Testing Netlify Function Logic")
    print("=" * 50)
    
    # Load spaCy model
    model = load_spacy_model()
    
    if model is None:
        print("❌ Cannot proceed without spaCy model")
        return False
    
    # Test words
    test_words = [
        "books", "running", "beautiful", "went", "children", 
        "mice", "geese", "am", "is", "are", "was", "were",
        "studying", "studied", "studies", "happy", "happier", "happiest"
    ]
    
    print(f"\n📝 Testing {len(test_words)} words:")
    print("-" * 50)
    
    all_success = True
    
    for word in test_words:
        result = lemmatize_word(word, model)
        
        status = "✅" if result["success"] else "❌"
        print(f"{status} {result['original']} → {result['lemma']} ({result['pos']})")
        
        if not result["success"]:
            all_success = False
            print(f"   Error: {result.get('error', 'Unknown error')}")
    
    print("\n" + "=" * 50)
    
    if all_success:
        print("🎉 All tests passed! spaCy is working correctly.")
        return True
    else:
        print("💥 Some tests failed. Check the errors above.")
        return False

def simulate_netlify_request(word):
    """Simulate a Netlify function request"""
    print(f"\n🌐 Simulating Netlify request for: '{word}'")
    print("-" * 30)
    
    # Simulate the request
    request_body = json.dumps({"word": word})
    print(f"Request: {request_body}")
    
    # Process the request
    model = load_spacy_model()
    result = lemmatize_word(word, model)
    
    # Simulate the response
    response_body = json.dumps(result, indent=2)
    print(f"Response: {response_body}")
    
    return result

if __name__ == "__main__":
    print("🚀 VocabKiller spaCy Function Test")
    print("=" * 50)
    
    # Test the complete logic
    success = test_function_logic()
    
    if success:
        print("\n" + "=" * 50)
        print("🧪 Testing individual requests:")
        
        # Test individual requests
        test_requests = ["books", "running", "children"]
        for word in test_requests:
            simulate_netlify_request(word)
        
        print("\n" + "=" * 50)
        print("✅ Function logic is working correctly!")
        print("📋 Next step: Deploy to Netlify for production testing")
    else:
        print("\n❌ Function logic has issues that need to be fixed")
        sys.exit(1) 