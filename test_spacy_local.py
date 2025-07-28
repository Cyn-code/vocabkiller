#!/usr/bin/env python3
"""
Local test script for spaCy lemmatization
"""

import spacy
import sys

def test_spacy_installation():
    """Test if spaCy is installed and working"""
    try:
        print("Testing spaCy installation...")
        
        # Try to load the model
        print("Loading spaCy model...")
        nlp = spacy.load("en_core_web_sm")
        print("✅ spaCy model loaded successfully!")
        
        # Test lemmatization
        test_words = ["books", "running", "beautiful", "went", "children"]
        
        print("\nTesting lemmatization:")
        for word in test_words:
            doc = nlp(word)
            token = doc[0]
            print(f"  {word} → {token.lemma_} ({token.pos_})")
        
        return True
        
    except OSError as e:
        print(f"❌ spaCy model not found: {e}")
        print("Installing spaCy model...")
        try:
            import subprocess
            subprocess.check_call([sys.executable, "-m", "spacy", "download", "en_core_web_sm"])
            print("✅ spaCy model installed successfully!")
            return test_spacy_installation()  # Test again
        except Exception as install_error:
            print(f"❌ Failed to install spaCy model: {install_error}")
            return False
            
    except Exception as e:
        print(f"❌ spaCy error: {e}")
        return False

if __name__ == "__main__":
    success = test_spacy_installation()
    if success:
        print("\n🎉 spaCy is working correctly!")
    else:
        print("\n💥 spaCy is not working properly.")
        sys.exit(1) 