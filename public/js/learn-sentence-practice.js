// Sentence Practice Game
console.log('=== SENTENCE PRACTICE JS LOADED v20240823-0336 ===');
console.log('🚨 TRANSLATION LANGUAGE MESSAGE FIXED - DEDICATED METHOD WITH BLACK BACKGROUND 🚨');
console.log('🔄 SKIP SENTENCE FUNCTIONALITY - ALWAYS ALLOW SKIPPING 🚨');
console.log('🎯 TYPING BOX ENHANCED - LONGER WIDTH, BLACK BORDER, DYNAMIC ADJUSTMENT 🚨');
console.log('🕐 TIMESTAMP: ' + new Date().toISOString());

// Global test variable
window.SENTENCE_PRACTICE_DEBUG = true;
console.log('Global debug variable set:', window.SENTENCE_PRACTICE_DEBUG);

class SentencePractice {
    constructor() {
        console.log('=== SENTENCE PRACTICE CONSTRUCTOR CALLED ===');
        this.sentences = [];
        this.currentSentenceIndex = 0;
        this.currentWordIndex = 0;
        this.currentCharIndex = 0;
        this.typedWords = [];
        this.currentWordChars = [];
        this.isGameActive = false;
        this.typingMode = 'word'; // Changed to word mode
        
        // Settings
        this.sentenceFontSize = 24;
        this.typingFontSize = 24;
        this.translationLanguage = 'zh';
        this.showSentenceTranslation = true;
        this.showWordHintTranslation = true;
        
        // Translation mode settings
        this.wordByWordEnabled = false;
        this.fullSentenceEnabled = false;
        
        // Sound settings
        this.enableTypingSound = true;
        this.soundType = 1;
        this.soundVolume = 50;
        this.soundManager = null;
        
        // Auto pronounce settings
        this.autoPronounceBefore = true;
        this.autoPronounceAfter = true;
        
        // Pronunciation state management
        this.isPronouncing = false;
        
        // Dictation mode
        this.dictationMode = false;
        
        // Column width setting
        this.columnWidth = 800; // Default column width
        
        // Speech synthesis
        this.speechSynthesis = window.speechSynthesis;
        this.availableVoices = [];
        this.selectedVoice = null;
        this.speechSpeed = 1.0;
        
        // Translation service
        this.dictionaryService = null;
        
        this.initialize();
    }
    
    async initialize() {
        this.loadSentences();
        this.initializeSoundManager();
        this.initializeDictionaryService();
        this.initializeSpeechSynthesis();
        this.loadSettings();
        this.setupEventListeners();
        
        // Initialize translation service
        if (this.dictionaryService) {
            this.dictionaryService.preTranslateCommonWords(this.translationLanguage);
        }
        
        this.startGame();
    }
    
    loadSentences() {
        try {
            const practiceData = sessionStorage.getItem('sentencePracticeData');
            if (practiceData) {
                this.sentences = JSON.parse(practiceData);
                console.log(`Loaded ${this.sentences.length} sentences for practice`);
            } else {
                console.error('No sentence practice data found');
                this.showMessage('No sentences found. Please go back and select some sentences first.');
            }
        } catch (error) {
            console.error('Error loading sentences:', error);
            this.showMessage('Error loading sentences. Please try again.');
        }
    }
    
    initializeSoundManager() {
        this.soundManager = new SoundManager();
        this.soundManager.loadSounds();
    }
    
    initializeDictionaryService() {
        this.dictionaryService = new DictionaryService();
    }
    
    initializeSpeechSynthesis() {
        if (this.speechSynthesis) {
            this.speechSynthesis.onvoiceschanged = () => {
                this.availableVoices = this.speechSynthesis.getVoices();
                this.populateVoiceSelect();
            };
        }
    }
    
    loadSettings() {
        // Load saved settings from localStorage
        const savedFont = localStorage.getItem('selectedFont') || 'system-ui';
        const savedUIFontSize = localStorage.getItem('uiFontSize') || '16';
        this.sentenceFontSize = parseInt(localStorage.getItem('sentenceFontSize')) || 24;
        this.typingFontSize = parseInt(localStorage.getItem('typingFontSize')) || 24;
        this.translationLanguage = localStorage.getItem('translationLanguage') || 'zh';
        this.showSentenceTranslation = localStorage.getItem('showSentenceTranslation') !== 'false';
        this.showWordHintTranslation = localStorage.getItem('showWordHintTranslation') !== 'false';
        
        // Load translation mode settings
        this.wordByWordEnabled = localStorage.getItem('wordByWordEnabled') === 'true';
        this.fullSentenceEnabled = localStorage.getItem('fullSentenceEnabled') === 'true';
        
        this.enableTypingSound = localStorage.getItem('enableTypingSound') !== 'false';
        this.soundType = parseInt(localStorage.getItem('soundType')) || 1;
        this.soundVolume = parseInt(localStorage.getItem('soundVolume')) || 50;
        
        this.autoPronounceBefore = localStorage.getItem('autoPronounceBefore') !== 'false';
        this.autoPronounceAfter = localStorage.getItem('autoPronounceAfter') !== 'false';
        
        // Load dictation mode setting
        this.dictationMode = localStorage.getItem('dictationMode') === 'true';
        this.speechSpeed = parseFloat(localStorage.getItem('speechSpeed')) || 1.0;
        
        // Load column width setting
        this.columnWidth = parseInt(localStorage.getItem('columnWidth')) || 800;
        
        this.updateUI();
    }
    
    setupEventListeners() {
        // Sentence display area for typing
        const sentenceDisplayArea = document.getElementById('sentenceDisplayArea');
        if (sentenceDisplayArea) {
            sentenceDisplayArea.addEventListener('keydown', (e) => this.handleKeyDown(e));
            sentenceDisplayArea.addEventListener('click', () => {
                this.focusSentenceArea();
                // Auto-pronounce before typing if enabled
                if (this.autoPronounceBefore) {
                    this.speakCurrentSentence();
                }
            });
        }
        
        // Space container event listeners (delegated)
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('space-container')) {
                this.handleSpaceContainerClick(e.target);
            }
        });
        
        // Character click event listeners (delegated)
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('char') && e.target.hasAttribute('data-char-index')) {
                this.handleCharacterClick(e.target);
            }
        });
        
        // Chrome-specific: Initialize speech synthesis after user interaction
        const initializeSpeech = () => {
            if ('speechSynthesis' in window) {
                // Force Chrome to load voices
                speechSynthesis.getVoices();
                // Remove the event listener after first interaction
                document.removeEventListener('click', initializeSpeech);
                document.removeEventListener('keydown', initializeSpeech);
            }
        };
        
        // Add listeners for user interaction
        document.addEventListener('click', initializeSpeech);
        document.addEventListener('keydown', initializeSpeech);
        
        // Completed word click event listeners (delegated)
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('completed-word') && e.target.hasAttribute('data-word-index')) {
                this.handleCompletedWordClick(e.target);
            }
        });
        
        document.addEventListener('keydown', (e) => {
            if (e.target.classList.contains('space-container')) {
                this.handleSpaceContainerKeyDown(e);
            }
        });
        
        document.addEventListener('input', (e) => {
            if (e.target.classList.contains('space-container')) {
                this.handleSpaceContainerInput(e);
            }
        });
        
        // Global keyboard event for completion popup
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                const popup = document.getElementById('completionPopup');
                if (popup && popup.classList.contains('show')) {
                    console.log('Enter key pressed - restarting practice');
                    this.restartPractice();
                }
            }
        });
        
        // Completion popup
        const closePopupBtn = document.getElementById('closePopupBtn');
        if (closePopupBtn) {
            closePopupBtn.addEventListener('click', () => this.hideCompletionPopup());
        }
        
        // Play Again button
        const playAgainBtn = document.getElementById('playAgainBtn');
        if (playAgainBtn) {
            playAgainBtn.addEventListener('click', () => this.restartPractice());
        }
        
        // Close dropdowns when clicking outside
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.sound-container')) {
                this.hideSoundDropdown();
            }
            if (!e.target.closest('.autopronounce-container')) {
                this.hideAutoPronounceDropdown();
            }
            if (!e.target.closest('.preference-dropdown')) {
                this.hidePreferenceDropdown();
            }
        });
        
        // Volume slider event listener for CSS variable update
        const soundVolumeSlider = document.getElementById('soundVolume');
        if (soundVolumeSlider) {
            soundVolumeSlider.addEventListener('input', (e) => {
                const value = e.target.value;
                e.target.style.setProperty('--value', `${value}%`);
            });
        }
    }
    
    startGame() {
        if (this.sentences.length === 0) {
            this.showMessage('No sentences available for practice.');
            return;
        }
        
        this.isGameActive = true;
        this.currentSentenceIndex = 0;
        this.currentWordIndex = 0;
        this.currentCharIndex = 0;
        this.typedWords = [];
        this.currentWordChars = [];
        
        this.updateProgress();
        this.displayCurrentSentence();
        this.focusSentenceArea();
        
        // Pronounce first sentence before typing if enabled
        if (this.autoPronounceBefore) {
            setTimeout(() => {
                this.speakCurrentSentence();
            }, 300);
        }
    }
    
    parseSentenceIntoWords(sentence) {
        console.log('=== PARSING SENTENCE ===');
        console.log('Original sentence:', sentence);
        
        // Split sentence into words while preserving punctuation
        const words = [];
        const regex = /(\S+)/g;
        let match;
        
        while ((match = regex.exec(sentence)) !== null) {
            const word = match[0];
            console.log('Found word:', word);
            
            const wordInfo = {
                text: word,
                startIndex: match.index,
                endIndex: match.index + word.length,
                characters: [],
                punctuation: ''
            };
            
            // Separate word from punctuation
            const wordMatch = word.match(/^(.+?)([.,!?]*)$/);
            if (wordMatch) {
                const baseWord = wordMatch[1];
                const punctuation = wordMatch[2];
                
                console.log('Base word:', baseWord, 'Punctuation:', punctuation);
                
                // Process each character in the base word
                for (let i = 0; i < baseWord.length; i++) {
                    const char = baseWord[i];
                    
                    wordInfo.characters.push({
                        char: char,
                        isPunctuation: false
                    });
                }
                
                // Add punctuation if any
                if (punctuation) {
                    wordInfo.punctuation = punctuation;
                }
            }
            
            words.push(wordInfo);
        }
        
        console.log('Final parsed words:', words);
        return words;
    }
    
    renderCurrentWord(word) {
        const baseWord = word.text.replace(/[.,!?]*$/, '');
        let html = `<span class="word current" data-word="${baseWord}">`;
        
        // Render each character in the current word
        word.characters.forEach((charInfo, charIndex) => {
            if (charIndex < this.currentWordChars.length && this.currentWordChars[charIndex] !== undefined) {
                // Typed character
                const typedChar = this.currentWordChars[charIndex];
                const expectedChar = charInfo.char;
                const isCorrect = typedChar.toLowerCase() === expectedChar.toLowerCase();
                const isCursorPosition = charIndex === this.currentCharIndex;
                const cursorClass = isCursorPosition ? 'cursor-position' : '';
                
                console.log(`Rendering char ${charIndex}: typed="${typedChar}", expected="${expectedChar}", correct=${isCorrect}`);
                
                html += `<span class="char ${isCorrect ? 'correct' : 'incorrect'} ${cursorClass}" data-char-index="${charIndex}">${typedChar}</span>`;
            } else if (charIndex === this.currentCharIndex) {
                // Current character position (cursor)
                html += `<span class="char current underscore cursor-position" data-char-index="${charIndex}">_</span>`;
            } else {
                // Future characters
                html += `<span class="char underscore" data-char-index="${charIndex}">_</span>`;
            }
        });
        
        // Add punctuation if any
        if (word.punctuation) {
            html += `<span class="punctuation">${word.punctuation}</span>`;
        }
        
        html += '</span>';
        return html;
    }
    
    renderBlankWord(word) {
        const baseWord = word.text.replace(/[.,!?]*$/, '');
        let html = `<span class="word blank" data-word="${baseWord}">`;
        
        // Render underscores for each character
        word.characters.forEach((charInfo, charIndex) => {
            html += `<span class="char underscore">_</span>`;
        });
        
        // Add punctuation if any
        if (word.punctuation) {
            html += `<span class="punctuation">${word.punctuation}</span>`;
        }
        
        html += '</span>';
        return html;
    }
    
    displayCurrentSentence() {
        console.log('displayCurrentSentence called');
        console.log('Current sentence index:', this.currentSentenceIndex);
        console.log('Sentences length:', this.sentences.length);
        
        if (this.currentSentenceIndex >= this.sentences.length) {
            console.log('Sentence index out of bounds - showing completion popup');
            this.showCompletionPopup();
            return;
        }
        
        const sentence = this.sentences[this.currentSentenceIndex];
        const sentenceNumber = document.getElementById('currentSentenceNumber');
        const sentenceText = document.getElementById('currentSentence');
        const sentenceTranslation = document.getElementById('currentSentenceTranslation');
        
        if (sentenceNumber) {
            if (this.dictationMode) {
                // Hide hint message in dictation mode
                sentenceNumber.textContent = '';
            } else {
                // Show hint message in normal mode
                sentenceNumber.textContent = sentence.text;
            }
        }
        
        if (sentenceText) {
            // Parse sentence into words
            const words = this.parseSentenceIntoWords(sentence.text);
            let displayHTML = '';
            
            words.forEach((word, wordIndex) => {
                // Add word display
                if (wordIndex < this.typedWords.length) {
                    // Completed word
                    const typedWord = this.typedWords[wordIndex];
                    // Compare against base word (without punctuation) since users don't type punctuation
                    const baseWord = word.text.replace(/[.,!?]*$/, '');
                    const isCorrect = typedWord.toLowerCase() === baseWord.toLowerCase();
                    
                    console.log(`Word validation: typed="${typedWord}", expected="${baseWord}", correct=${isCorrect}`);
                    
                    // Make completed words clickable for editing
                    displayHTML += `<span class="word ${isCorrect ? 'correct' : 'incorrect'} completed-word" data-word-index="${wordIndex}" data-word="${baseWord}">${typedWord}</span>`;
                } else if (wordIndex === this.typedWords.length) {
                    // Current word being typed
                    displayHTML += this.renderCurrentWord(word);
                } else {
                    // Future word
                    displayHTML += this.renderBlankWord(word);
                }
                
                // Add space between words (except after the last word)
                if (wordIndex < words.length - 1) {
                    displayHTML += '<span class="space-container" contenteditable="true" tabindex="0" data-space-index="' + wordIndex + '"> </span>';
                }
            });
            
            sentenceText.innerHTML = displayHTML;
            
            // Apply translation display after rendering
            this.applyTranslationDisplay();
        }
        
        // Translation is now handled by applyTranslationDisplay() method
    }
    

    
    handleCharacterInput(typedChar, expectedChar) {
        // Check if the typed character matches the expected character (case-insensitive)
        const isCorrect = typedChar.toLowerCase() === expectedChar.toLowerCase();
        
        console.log(`Typed: "${typedChar}", Expected: "${expectedChar}", Correct: ${isCorrect}, Position: ${this.currentCharIndex}`);
        
        // Store the typed character at the current position
        this.currentWordChars[this.currentCharIndex] = typedChar;
        
        console.log('Current word chars after storing:', this.currentWordChars);
        
        // Play typing sound
        if (this.enableTypingSound && this.soundManager) {
            this.soundManager.playTypingSound(this.soundType, this.soundVolume / 100);
        }
        
        // Always advance to next character (allow continued typing)
        this.currentCharIndex++;
        console.log(`Advanced to character ${this.currentCharIndex}`);
        
        // Update display
        this.displayCurrentSentence();
        
        // Check if current word is completed
        const words = this.parseSentenceIntoWords(this.sentences[this.currentSentenceIndex].text);
        const currentWord = words[this.typedWords.length];
        
        if (this.currentCharIndex >= currentWord.characters.length) {
            console.log('Word length reached, checking if correct...');
            // Only complete the word if it's correct
            if (this.isCurrentWordCorrect()) {
                console.log('Word is correct, completing...');
                this.completeCurrentWord();
            } else {
                console.log('Word has errors - staying in typing mode for editing');
                // Don't complete the word - stay in typing mode for editing
                // The word will remain editable until all characters are correct
            }
        }
    }
    
    handleBackspace() {
        console.log('Backspace pressed, current char index:', this.currentCharIndex);
        console.log('Typed words:', this.typedWords);
        
        // If we're at the beginning of current word and there are previous words
        if (this.currentCharIndex === 0 && this.typedWords.length > 0) {
            // Go back to the previous word
            console.log('Going back to previous word');
            this.goBackToPreviousWord();
            return;
        }
        
        if (this.currentCharIndex > 0) {
            // Delete character at the position before current cursor
            const deletePosition = this.currentCharIndex - 1;
            const deletedChar = this.currentWordChars[deletePosition];
            
            console.log(`Deleting character "${deletedChar}" at position ${deletePosition}`);
            
            // Remove the character
            this.currentWordChars[deletePosition] = undefined;
            
            // Move cursor back
            this.currentCharIndex = deletePosition;
            
            console.log('Current word chars after deletion:', this.currentWordChars);
            console.log('New cursor position:', this.currentCharIndex);
            
            // Update display
            this.displayCurrentSentence();
        } else {
            console.log('Cannot delete - already at beginning of first word');
        }
    }
    
    isCurrentWordCorrect() {
        const words = this.parseSentenceIntoWords(this.sentences[this.currentSentenceIndex].text);
        const currentWord = words[this.typedWords.length];
        
        if (!currentWord) return false;
        
        console.log('Checking word correctness:');
        console.log('Current word chars:', this.currentWordChars);
        console.log('Expected word chars:', currentWord.characters.map(c => c.char));
        console.log('Current char index:', this.currentCharIndex);
        console.log('Word length:', currentWord.characters.length);
        
        // First check if all characters are typed
        if (this.currentCharIndex < currentWord.characters.length) {
            console.log('Word not fully typed yet');
            return false;
        }
        
        // Then check if all typed characters match the expected characters
        for (let i = 0; i < currentWord.characters.length; i++) {
            const typedChar = this.currentWordChars[i];
            const expectedChar = currentWord.characters[i].char;
            
            if (!typedChar || typedChar.toLowerCase() !== expectedChar.toLowerCase()) {
                console.log(`Mismatch at position ${i}: typed "${typedChar}" vs expected "${expectedChar}"`);
                return false;
            }
        }
        
        console.log('Word is completely correct!');
        return true;
    }
    
    completeCurrentWord() {
        // Get the typed word
        const typedWord = this.currentWordChars.join('');
        
        // Add to completed words
        this.typedWords.push(typedWord);
        
        // Reset for next word
        this.currentWordChars = [];
        this.currentCharIndex = 0;
        
        // Update display
        this.displayCurrentSentence();
        
        // Check if sentence is completed
        const words = this.parseSentenceIntoWords(this.sentences[this.currentSentenceIndex].text);
        if (this.typedWords.length >= words.length) {
            console.log('All words completed, checking sentence...');
            if (this.isCurrentSentenceCorrect()) {
                console.log('Sentence is correct, completing...');
                this.completeCurrentSentence();
            } else {
                console.log('Sentence has errors, not completing');
            }
        }
    }
    
    isCurrentSentenceCorrect() {
        const currentSentence = this.sentences[this.currentSentenceIndex];
        if (!currentSentence) return false;
        
        const words = this.parseSentenceIntoWords(currentSentence.text);
        
        console.log('Checking sentence correctness:');
        console.log('Expected words:', words.map(w => w.text));
        console.log('Typed words:', this.typedWords);
        
        // Check if all typed words match the expected words (without punctuation)
        for (let i = 0; i < this.typedWords.length; i++) {
            const baseWord = words[i].text.replace(/[.,!?]*$/, '');
            if (this.typedWords[i].toLowerCase() !== baseWord.toLowerCase()) {
                console.log(`Mismatch at word ${i}: typed "${this.typedWords[i]}" vs expected "${baseWord}"`);
                return false;
            }
        }
        
        console.log('Sentence is correct!');
        return true;
    }
    
    showTemporaryMessage(message, type = 'info') {
        // Create a temporary message element
        const messageDiv = document.createElement('div');
        messageDiv.className = `temp-message ${type}`;
        messageDiv.textContent = message;
        
        // Special styling for translation language messages
        let backgroundColor = '#4444ff'; // default blue for success
        if (type === 'error') {
            backgroundColor = '#ff4444'; // red for error
        } else if (message.includes('Translation language set to:')) {
            backgroundColor = '#000000'; // black for translation language messages
            console.log('🎯 Translation language message detected - using black background');
        }
        
        console.log(`📝 Message: "${message}" | Type: ${type} | Background: ${backgroundColor}`);
        
        messageDiv.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: ${backgroundColor};
            color: white;
            padding: 10px 20px;
            border-radius: 5px;
            z-index: 1000;
            font-size: 14px;
            font-weight: 500;
        `;
        
        document.body.appendChild(messageDiv);
        
        // Remove the message after 3 seconds
        setTimeout(() => {
            if (messageDiv.parentNode) {
                messageDiv.parentNode.removeChild(messageDiv);
            }
        }, 3000);
    }
    
    showTranslationLanguageMessage(languageName) {
        // Create a temporary message element specifically for translation language
        const messageDiv = document.createElement('div');
        messageDiv.className = 'temp-message translation-language';
        messageDiv.textContent = `Translation language set to: ${languageName}`;
        
        console.log('🎯 Creating translation language message with black background');
        
        messageDiv.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: #000000;
            color: white;
            padding: 10px 20px;
            border-radius: 5px;
            z-index: 1000;
            font-size: 14px;
            font-weight: 500;
        `;
        
        document.body.appendChild(messageDiv);
        
        // Remove the message after 3 seconds
        setTimeout(() => {
            if (messageDiv.parentNode) {
                messageDiv.parentNode.removeChild(messageDiv);
            }
        }, 3000);
    }
    

    
    handleKeyDown(event) {
        if (!this.isGameActive) return;
        
        const words = this.parseSentenceIntoWords(this.sentences[this.currentSentenceIndex].text);
        const currentWord = words[this.typedWords.length];
        
        if (!currentWord) return;
        
        if (event.key === 'Backspace') {
            event.preventDefault();
            this.handleBackspace();
        } else if (event.key === 'Enter') {
            event.preventDefault();
            this.skipSentence();
        } else if (event.key === 'Tab') {
            event.preventDefault();
            this.skipSentence();
        } else if (event.key === ' ') {
            event.preventDefault();
            // Only skip to next word if current word is completed
            const words = this.parseSentenceIntoWords(this.sentences[this.currentSentenceIndex].text);
            const currentWord = words[this.typedWords.length];
            
            if (this.currentCharIndex >= currentWord.characters.length) {
                // Current word is completed, move to next word
                this.completeCurrentWord();
            } else {
                // Current word is not completed, ignore space key
                console.log('Space key ignored - current word not completed');
            }
        } else if (event.key.length === 1) {
            event.preventDefault();
            const expectedChar = currentWord.characters[this.currentCharIndex];
            if (expectedChar) {
                this.handleCharacterInput(event.key, expectedChar.char);
            }
        }
    }
    

    
    completeCurrentSentence() {
        console.log('completeCurrentSentence called');
        console.log('Current sentence index:', this.currentSentenceIndex);
        console.log('Typed words:', this.typedWords);
        console.log('Is sentence correct:', this.isCurrentSentenceCorrect());
        
        // Additional safety check - only complete if sentence is actually correct
        if (!this.isCurrentSentenceCorrect()) {
            console.log('Validation failed - not completing sentence');
            this.showTemporaryMessage('Please complete the sentence correctly before proceeding', 'error');
            return;
        }
        
        console.log('Validation passed - completing sentence');
        
        // Auto-pronounce after completion if enabled
        if (this.autoPronounceAfter) {
            const currentSentence = this.sentences[this.currentSentenceIndex];
            if (currentSentence) {
                // Cancel any ongoing pronunciation and start new one
                if (this.isPronouncing) {
                    speechSynthesis.cancel();
                }
                
                this.isPronouncing = true;
                const utterance = new SpeechSynthesisUtterance(currentSentence.text);
                
                // Set voice and speed
                if (this.selectedVoice) {
                    utterance.voice = this.selectedVoice;
                }
                utterance.rate = this.speechSpeed || 1.0;
                utterance.lang = this.selectedVoice ? this.selectedVoice.lang : 'en-US';
                
                // Handle pronunciation end
                utterance.onend = () => {
                    this.isPronouncing = false;
                    console.log('After pronunciation finished');
                    // Move to next sentence after pronunciation completes
                    this.moveToNextSentence();
                };
                
                utterance.onerror = () => {
                    this.isPronouncing = false;
                    console.log('After pronunciation error');
                    // Move to next sentence even if pronunciation fails
                    this.moveToNextSentence();
                };
                
                speechSynthesis.speak(utterance);
            } else {
                // No sentence to pronounce, move to next immediately
                this.moveToNextSentence();
            }
        } else {
            // No after pronunciation, move to next immediately
            this.moveToNextSentence();
        }
    }
    
    moveToNextSentence() {
        this.currentSentenceIndex++;
        this.currentWordIndex = 0;
        this.currentCharIndex = 0;
        this.typedWords = [];
        this.currentWordChars = [];
        
        this.updateProgress();
        
        if (this.currentSentenceIndex >= this.sentences.length) {
            console.log('All sentences completed - showing popup');
            this.showCompletionPopup();
        } else {
            this.displayCurrentSentence();
            this.focusSentenceArea();
            
            // Auto-pronounce before typing if enabled
            if (this.autoPronounceBefore) {
                setTimeout(() => {
                    this.speakCurrentSentence();
                }, 300);
            }
        }
    }
    
    skipSentence() {
        // Always allow skipping, regardless of completion status
        console.log('🔄 Skipping to next sentence');
        this.moveToNextSentence();
    }
    
    updateProgress() {
        const progressFill = document.getElementById('progressFill');
        const progressText = document.getElementById('progressText');
        
        if (progressFill && progressText) {
            const progress = (this.currentSentenceIndex / this.sentences.length) * 100;
            progressFill.style.width = `${progress}%`;
            progressText.textContent = `${this.currentSentenceIndex}/${this.sentences.length} sentences`;
        }
    }
    
    focusSentenceArea() {
        const sentenceArea = document.getElementById('sentenceDisplayArea');
        if (sentenceArea) {
            sentenceArea.focus();
        }
    }
    
    handleSpaceContainerClick(spaceContainer) {
        // Focus the space container
        spaceContainer.focus();
        console.log('Space container clicked and focused');
    }
    
    handleSpaceContainerKeyDown(event) {
        const spaceContainer = event.target;
        
        if (event.key === 'Backspace') {
            event.preventDefault();
            // Clear the space container content
            spaceContainer.textContent = ' ';
            console.log('Space container backspace - cleared content');
        } else if (event.key === 'Enter' || event.key === 'Tab') {
            event.preventDefault();
            // Move to next word
            this.completeCurrentWord();
            console.log('Space container enter/tab - moving to next word');
        } else if (event.key === ' ') {
            event.preventDefault();
            // Only skip to next word if current word is completed
            const words = this.parseSentenceIntoWords(this.sentences[this.currentSentenceIndex].text);
            const currentWord = words[this.typedWords.length];
            
            if (this.currentCharIndex >= currentWord.characters.length) {
                // Current word is completed, move to next word
                this.completeCurrentWord();
                console.log('Space container space - moving to next word');
            } else {
                // Current word is not completed, ignore space key
                console.log('Space container space ignored - current word not completed');
            }
        } else if (event.key.length === 1) {
            // Allow typing in space container (will be handled by input event)
            console.log('Space container character typed:', event.key);
        }
    }
    
    handleSpaceContainerInput(event) {
        const spaceContainer = event.target;
        const content = spaceContainer.textContent;
        
        // Keep only the last character typed
        if (content.length > 1) {
            spaceContainer.textContent = content.slice(-1);
        }
        
        // Ensure there's always a space character
        if (spaceContainer.textContent === '') {
            spaceContainer.textContent = ' ';
        }
        
        console.log('Space container input - content:', spaceContainer.textContent);
    }
    
    handleCharacterClick(characterElement) {
        const charIndex = parseInt(characterElement.getAttribute('data-char-index'));
        console.log('Character clicked at index:', charIndex);
        
        // Set cursor position to clicked character
        this.currentCharIndex = charIndex;
        
        // Update display to show new cursor position
        this.displayCurrentSentence();
        
        // Focus the sentence area for typing
        this.focusSentenceArea();
    }
    
    goBackToPreviousWord() {
        if (this.typedWords.length === 0) {
            console.log('No previous words to go back to');
            return;
        }
        
        // Get the last typed word
        const lastTypedWord = this.typedWords.pop();
        console.log('Going back to word:', lastTypedWord);
        
        // Convert the word back to individual characters
        this.currentWordChars = lastTypedWord.split('');
        this.currentCharIndex = this.currentWordChars.length; // Position cursor at end
        
        console.log('Current word chars restored:', this.currentWordChars);
        console.log('Cursor position set to:', this.currentCharIndex);
        
        // Update display
        this.displayCurrentSentence();
        
        // Focus the sentence area for typing
        this.focusSentenceArea();
    }
    
    handleCompletedWordClick(wordElement) {
        const wordIndex = parseInt(wordElement.getAttribute('data-word-index'));
        console.log('Completed word clicked at index:', wordIndex);
        
        // Remove all words after the clicked word
        while (this.typedWords.length > wordIndex) {
            this.typedWords.pop();
        }
        
        // Get the clicked word and convert it back to characters
        const clickedWord = this.typedWords[wordIndex];
        this.currentWordChars = clickedWord.split('');
        this.currentCharIndex = this.currentWordChars.length; // Position cursor at end
        
        console.log('Restored to word:', clickedWord);
        console.log('Current word chars:', this.currentWordChars);
        console.log('Cursor position:', this.currentCharIndex);
        
        // Update display
        this.displayCurrentSentence();
        
        // Focus the sentence area for typing
        this.focusSentenceArea();
    }
    
    speakCurrentSentence() {
        const currentSentence = this.sentences[this.currentSentenceIndex];
        if (currentSentence) {
            // Cancel any ongoing pronunciation
            if (this.isPronouncing) {
                speechSynthesis.cancel();
            }
            
            this.isPronouncing = true;
            const utterance = new SpeechSynthesisUtterance(currentSentence.text);
            
            // Set voice and speed
            if (this.selectedVoice) {
                utterance.voice = this.selectedVoice;
            }
            utterance.rate = this.speechSpeed || 1.0;
            utterance.lang = this.selectedVoice ? this.selectedVoice.lang : 'en-US';
            
            // Handle pronunciation end
            utterance.onend = () => {
                this.isPronouncing = false;
                console.log('Pronunciation finished');
            };
            
            utterance.onerror = () => {
                this.isPronouncing = false;
                console.log('Pronunciation error');
            };
            
            speechSynthesis.speak(utterance);
        }
    }
    
    pronounceCurrentSentence() {
        const currentSentence = this.sentences[this.currentSentenceIndex];
        if (currentSentence) {
            this.playPronunciation(currentSentence.text);
        }
    }
    
    pronounceWord(word) {
        this.playPronunciation(word);
    }
    
    playPronunciation(word) {
        // Use Web Speech API with user preferences
        if ('speechSynthesis' in window) {
            // Chrome requires user interaction before speech synthesis
            // This is a workaround for Chrome's autoplay policy
            if (speechSynthesis.speaking) {
                speechSynthesis.cancel();
            }
            
            const utterance = new SpeechSynthesisUtterance(word);
            utterance.rate = this.speechSpeed || 1.0;
            utterance.pitch = 1.0;
            utterance.volume = 1.0;
            
            // Use selected voice if available
            if (this.selectedVoice) {
                utterance.voice = this.selectedVoice;
            } else {
                // Fallback to English voice
                const voices = speechSynthesis.getVoices();
                const englishVoice = voices.find(voice => 
                    voice.lang.startsWith('en') && voice.default
                ) || voices.find(voice => 
                    voice.lang.startsWith('en')
                );
                
                if (englishVoice) {
                    utterance.voice = englishVoice;
                }
            }
            
            // Chrome-specific fix: ensure voices are loaded
            if (speechSynthesis.getVoices().length === 0) {
                // Wait for voices to load
                speechSynthesis.onvoiceschanged = () => {
                    speechSynthesis.speak(utterance);
                };
            } else {
                speechSynthesis.speak(utterance);
            }
        }
    }
    
    showCompletionPopup() {
        const popup = document.getElementById('completionPopup');
        const message = document.getElementById('completionMessage');
        
        if (popup && message) {
            message.textContent = `You've completed all ${this.sentences.length} sentences!`;
            popup.classList.add('show');
        }
    }
    
    hideCompletionPopup() {
        const popup = document.getElementById('completionPopup');
        if (popup) {
            popup.classList.remove('show');
        }
    }
    
    restartPractice() {
        this.hideCompletionPopup();
        this.startGame();
    }
    
    // UI Control Methods
    
    toggleSoundDropdown() {
        const dropdown = document.getElementById('soundDropdown');
        if (dropdown) {
            dropdown.classList.toggle('show');
        }
    }
    
    hideSoundDropdown() {
        const dropdown = document.getElementById('soundDropdown');
        if (dropdown) {
            dropdown.classList.remove('show');
        }
    }
    
    toggleAutoPronounceDropdown() {
        const dropdown = document.getElementById('autoPronounceDropdown');
        if (!dropdown) return;
        dropdown.classList.toggle('show');
        
        // Outside click to close
        const onDoc = (e) => {
            if (!dropdown.contains(e.target) && !e.target.closest('.autopronounce-container')) {
                dropdown.classList.remove('show');
                document.removeEventListener('click', onDoc, true);
            }
        };
        setTimeout(() => document.addEventListener('click', onDoc, true), 0);
    }
    
    hideAutoPronounceDropdown() {
        const dropdown = document.getElementById('autoPronounceDropdown');
        if (dropdown) {
            dropdown.classList.remove('show');
        }
    }
    
    togglePreferenceDropdown() {
        const dropdown = document.getElementById('preferenceDropdown');
        if (dropdown) {
            dropdown.classList.toggle('show');
        }
    }
    
    hidePreferenceDropdown() {
        const dropdown = document.getElementById('preferenceDropdown');
        if (dropdown) {
            dropdown.classList.remove('show');
        }
    }
    
    // Translation mode dropdown functionality
    toggleTranslationModeDropdown() {
        const menu = document.getElementById('translationModeMenu');
        if (!menu) return;
        menu.classList.toggle('show');
        // Sync switch UI from state
        const w = document.getElementById('wordByWordSwitch');
        const f = document.getElementById('fullSentenceSwitch');
        if (w) w.setAttribute('aria-pressed', String(this.wordByWordEnabled));
        if (f) f.setAttribute('aria-pressed', String(this.fullSentenceEnabled));
        // Outside click to close
        const onDoc = (e) => {
            if (!menu.contains(e.target) && !e.target.closest('.translation-mode-dropdown')) {
                menu.classList.remove('show');
                document.removeEventListener('click', onDoc, true);
            }
        };
        setTimeout(() => document.addEventListener('click', onDoc, true), 0);
    }
    
    toggleWordByWordTranslation(event) {
        event.stopPropagation();
        this.wordByWordEnabled = !this.wordByWordEnabled;
        localStorage.setItem('wordByWordEnabled', this.wordByWordEnabled);
        const w = document.getElementById('wordByWordSwitch');
        if (w) w.setAttribute('aria-pressed', String(this.wordByWordEnabled));
        this.applyTranslationDisplay();
    }
    
    toggleFullSentenceTranslation(event) {
        event.stopPropagation();
        this.fullSentenceEnabled = !this.fullSentenceEnabled;
        localStorage.setItem('fullSentenceEnabled', this.fullSentenceEnabled);
        const f = document.getElementById('fullSentenceSwitch');
        if (f) f.setAttribute('aria-pressed', String(this.fullSentenceEnabled));
        this.applyTranslationDisplay();
    }
    
    applyTranslationDisplay() {
        // Full sentence: translate/show all text when on; hide when off
        if (this.fullSentenceEnabled) {
            this.showCachedTranslation();
            this.showingTranslation = true;
        } else {
            // Hide full translation
            this.showOriginalText();
            this.showingTranslation = false;
        }

        // Word-by-word: show/hide inline below each original word when enabled
        this.updateWordByWordDisplay();
    }
    
    updateWordByWordDisplay() {
        const container = document.getElementById('sentenceDisplayArea');
        if (!container) return;
        
        // Find all word elements
        const wordElements = container.querySelectorAll('.word');
        if (!wordElements || wordElements.length === 0) return;
        
        wordElements.forEach((wordEl) => {
            // Remove previous inline translation if exists
            const existing = wordEl.querySelector(':scope > .inline-translation');
            if (existing) existing.remove();
            
            if (this.wordByWordEnabled) {
                const word = wordEl.getAttribute('data-word');
                if (!word) return;
                const trans = this.getCachedWordTranslation(word);
                const span = document.createElement('span');
                span.className = 'inline-translation';
                span.textContent = trans || '…';
                // Ensure stacked under the word
                span.style.display = 'block';
                span.style.fontSize = '12px';
                span.style.lineHeight = '1';
                span.style.color = '#666';
                span.style.marginTop = '2px';
                wordEl.appendChild(span);
                if (!trans) this.fetchAndFillWordTranslation(word, span);
            }
        });
    }
    
    getCachedWordTranslation(word) {
        // Use the dictionaryService cache if available
        const lang = this.translationLanguage || 'zh';
        const key = `${word}_${lang}`;
        if (this.dictionaryService && this.dictionaryService.popupTranslationCache && this.dictionaryService.popupTranslationCache.has(key)) {
            return this.dictionaryService.popupTranslationCache.get(key);
        }
        return '';
    }
    
    async fetchAndFillWordTranslation(word, spanEl) {
        try {
            const lang = this.translationLanguage || 'zh';
            // If already cached by the time this runs, use it
            const cached = this.getCachedWordTranslation(word);
            if (cached) {
                spanEl.textContent = cached;
                return;
            }
            // Fetch translation via service and cache
            const t = await this.dictionaryService.getWordTranslation(word, lang);
            if (t) {
                spanEl.textContent = t;
            } else {
                spanEl.textContent = '';
            }
        } catch (_) {
            spanEl.textContent = '';
        }
    }
    
    showCachedTranslation() {
        // For sentence practice, show translation in the existing currentSentenceTranslation element
        const currentSentence = this.sentences[this.currentSentenceIndex];
        if (!currentSentence) return;
        
        // Get or fetch translation
        this.getSentenceTranslation(currentSentence.text).then(translation => {
            if (translation) {
                this.displaySentenceTranslation(translation);
            }
        });
    }
    
    showOriginalText() {
        // Hide translation display
        this.hideSentenceTranslation();
    }
    
    async getSentenceTranslation(sentenceText) {
        const lang = this.translationLanguage || 'zh';
        const cacheKey = `sentence_${sentenceText}_${lang}`;
        
        // Check cache first
        if (this.dictionaryService && this.dictionaryService.popupTranslationCache && this.dictionaryService.popupTranslationCache.has(cacheKey)) {
            return this.dictionaryService.popupTranslationCache.get(cacheKey);
        }
        
        try {
            const translation = await this.dictionaryService.translateText(sentenceText, 'en', lang);
            if (translation) {
                this.dictionaryService.popupTranslationCache.set(cacheKey, translation);
                return translation;
            }
        } catch (error) {
            console.error('Sentence translation error:', error);
        }
        
        return null;
    }
    
    displaySentenceTranslation(translation) {
        // Use the existing currentSentenceTranslation element
        const translationElement = document.getElementById('currentSentenceTranslation');
        if (translationElement) {
            translationElement.textContent = translation;
            translationElement.style.display = 'block';
            translationElement.style.color = '#666';
            translationElement.style.fontStyle = 'italic';
            translationElement.style.fontSize = '14px';
            translationElement.style.marginTop = '4px';
        }
    }
    
    hideSentenceTranslation() {
        const translationElement = document.getElementById('currentSentenceTranslation');
        if (translationElement) {
            translationElement.textContent = '';
            translationElement.style.display = 'none';
        }
    }
    
    // Settings Methods
    updateFont(fontFamily) {
        document.body.style.fontFamily = fontFamily;
        localStorage.setItem('selectedFont', fontFamily);
    }
    
    updateUIFontSize(size) {
        document.body.style.fontSize = `${size}px`;
        localStorage.setItem('uiFontSize', size);
    }
    
    updateSentenceFontSize(size) {
        this.sentenceFontSize = parseInt(size);
        // Update the sentence hint area (the sentence under progress counter)
        const sentenceNumber = document.getElementById('currentSentenceNumber');
        if (sentenceNumber) {
            sentenceNumber.style.fontSize = `${this.sentenceFontSize}px`;
        }
        localStorage.setItem('sentenceFontSize', this.sentenceFontSize);
    }
    
    updateTypingAreaFontSize(size) {
        this.typingFontSize = parseInt(size);
        // Update the typing area (sentence display area) font size
        const sentenceText = document.getElementById('currentSentence');
        if (sentenceText) {
            sentenceText.style.fontSize = `${this.typingFontSize}px`;
        }
        localStorage.setItem('typingFontSize', this.typingFontSize);
    }
    
    updateTranslationLanguage(language) {
        this.translationLanguage = language;
        localStorage.setItem('translationLanguage', this.translationLanguage);
        console.log('Translation language updated to:', language);
    }
    
    applyTranslationSettings() {
        console.log('Applying translation settings...');
        console.log('Current translation language:', this.translationLanguage);
        
        // Update the translation service with new language
        if (window.unifiedTranslationService) {
            window.unifiedTranslationService.setTargetLanguage(this.translationLanguage);
            console.log('Translation service updated with language:', this.translationLanguage);
        }
        
        // Clear translation cache for new language
        if (this.dictionaryService && this.dictionaryService.popupTranslationCache) {
            this.dictionaryService.popupTranslationCache.clear();
        }
        
        // Pre-translate common words for new language
        if (this.dictionaryService) {
            this.dictionaryService.preTranslateCommonWords(this.translationLanguage);
        }
        
        // Refresh translation display
        this.applyTranslationDisplay();
        
        // Show feedback to user with black background
        this.showTranslationLanguageMessage(this.getLanguageDisplayName(this.translationLanguage));
        
        // Close the preference dropdown
        this.hidePreferenceDropdown();
    }
    
    getLanguageDisplayName(languageCode) {
        const languageNames = {
            'zh': 'Chinese (S)',
            'zh-tw': 'Chinese (T)',
            'en': 'English',
            'es': 'Spanish',
            'fr': 'French',
            'de': 'German',
            'it': 'Italian',
            'ja': 'Japanese',
            'ko': 'Korean',
            'pt': 'Portuguese',
            'ru': 'Russian',
            'ar': 'Arabic'
        };
        return languageNames[languageCode] || languageCode;
    }
    
    updateVoice(voiceName) {
        this.selectedVoice = this.availableVoices.find(voice => voice.name === voiceName);
        localStorage.setItem('selectedVoice', voiceName);
        this.updateCurrentVoiceDisplay();
    }
    
    updateSpeed(speed) {
        this.speechSpeed = parseFloat(speed);
        localStorage.setItem('speechSpeed', this.speechSpeed);
        this.updateSpeedDisplay();
    }
    
    resetSpeed() {
        this.speechSpeed = 1.0;
        localStorage.setItem('speechSpeed', this.speechSpeed);
        this.updateSpeedDisplay();
        const speedSlider = document.getElementById('speedSlider');
        if (speedSlider) {
            speedSlider.value = this.speechSpeed;
        }
    }
    
    updateColumnWidth(width) {
        this.columnWidth = parseInt(width);
        localStorage.setItem('columnWidth', this.columnWidth);
        
        // Update CSS variable for typing box width
        document.documentElement.style.setProperty('--column-width', this.columnWidth + 'px');
        
        console.log('🎯 Column width updated to:', this.columnWidth + 'px');
    }
    
    testVoice() {
        if (this.selectedVoice) {
            const utterance = new SpeechSynthesisUtterance('Test voice');
            utterance.voice = this.selectedVoice;
            utterance.rate = this.speechSpeed || 1.0;
            speechSynthesis.speak(utterance);
        }
    }
    
    toggleSwitch(type) {
        if (type === 'before') {
            this.autoPronounceBefore = !this.autoPronounceBefore;
            localStorage.setItem('autoPronounceBefore', this.autoPronounceBefore);
        } else if (type === 'after') {
            this.autoPronounceAfter = !this.autoPronounceAfter;
            localStorage.setItem('autoPronounceAfter', this.autoPronounceAfter);
        }
        this.updateSwitchDisplay(type);
    }
    
    previewSound() {
        if (this.soundManager) {
            this.soundManager.playTypingSound(this.soundType, this.soundVolume / 100);
        }
    }
    
    resetSoundSettings() {
        this.enableTypingSound = true;
        this.soundType = 1;
        this.soundVolume = 50;
        
        localStorage.setItem('enableTypingSound', this.enableTypingSound);
        localStorage.setItem('soundType', this.soundType);
        localStorage.setItem('soundVolume', this.soundVolume);
        
        this.updateSoundSettingsDisplay();
    }
    
    // Helper Methods
    populateVoiceSelect() {
        const voiceSelect = document.getElementById('voiceSelect');
        if (!voiceSelect) return;
        
        const voices = speechSynthesis.getVoices();
        voiceSelect.innerHTML = '';
        
        // Filter for only the 5 specific voices (like Learn Original Words)
        const allowedVoices = [
            'Google US English',
            'Google UK English Female', 
            'Google UK English Male',
            'Samantha',
            'Aaron'
        ];
        
        const filteredVoices = voices.filter(voice => {
            return allowedVoices.some(allowedName => {
                const voiceName = voice.name.toLowerCase();
                
                // Exact match or contains match for system voices
                if (allowedName === 'Samantha' && voiceName.includes('samantha')) return true;
                if (allowedName === 'Aaron' && voiceName.includes('aaron')) return true;
                
                // For Google voices, check for pattern matches
                if (allowedName === 'Google US English') {
                    return voiceName.includes('google') && 
                           voiceName.includes('us') && 
                           voiceName.includes('english') &&
                           voice.lang === 'en-US';
                }
                if (allowedName === 'Google UK English Female') {
                    return voiceName.includes('google') && 
                           voiceName.includes('uk') && 
                           voiceName.includes('english') &&
                           voiceName.includes('female') &&
                           voice.lang === 'en-GB';
                }
                if (allowedName === 'Google UK English Male') {
                    return voiceName.includes('google') && 
                           voiceName.includes('uk') && 
                           voiceName.includes('english') &&
                           voiceName.includes('male') &&
                           voice.lang === 'en-GB';
                }
                
                return false;
            });
        }).sort((a, b) => {
            // Sort in the order shown in the image
            const getOrderIndex = (voice) => {
                const name = voice.name.toLowerCase();
                if (name.includes('google') && name.includes('us')) return 0;
                if (name.includes('google') && name.includes('uk') && name.includes('female')) return 1;
                if (name.includes('google') && name.includes('uk') && name.includes('male')) return 2;
                if (name.includes('samantha')) return 3;
                if (name.includes('aaron')) return 4;
                return 999;
            };
            
            return getOrderIndex(a) - getOrderIndex(b);
        });
        
        filteredVoices.forEach(voice => {
            const option = document.createElement('option');
            option.value = voice.name;
            
            // Add appropriate labels based on voice type
            const voiceName = voice.name.toLowerCase();
            let displayText = `${voice.name} (${voice.lang})`;
            
            if (voiceName.includes('google')) {
                displayText += ' - Online';
            } else {
                displayText += ' - System';
            }
            
            if (voiceName.includes('google') && voiceName.includes('uk') && voiceName.includes('female')) {
                displayText += ' - 🎯 PREFERRED';
            }
            
            option.textContent = displayText;
            voiceSelect.appendChild(option);
        });
        
        // Auto-select preferred voice
        this.autoSelectPreferredVoice();
    }
    
    autoSelectPreferredVoice() {
        const voiceSelect = document.getElementById('voiceSelect');
        if (!voiceSelect) return;
        
        const voices = Array.from(voiceSelect.options);
        
        // First priority: Use inherited voice from homepage/previous subpage
        const inheritedVoiceName = localStorage.getItem('vocabKillerVoice');
        if (inheritedVoiceName) {
            const inheritedVoice = voices.find(option => 
                option.value === inheritedVoiceName
            );
            if (inheritedVoice) {
                voiceSelect.value = inheritedVoice.value;
                this.updateVoice(inheritedVoice.value);
                console.log('Selected inherited voice:', inheritedVoiceName);
                return;
            }
        }
        
        // Second priority: Use preferred voice (Google UK English Female)
        const preferredVoice = voices.find(option => 
            option.textContent.includes('PREFERRED')
        );
        
        if (preferredVoice) {
            voiceSelect.value = preferredVoice.value;
            this.updateVoice(preferredVoice.value);
            console.log('Selected preferred voice:', preferredVoice.value);
        }
    }
    
    updateVoice(voiceName) {
        localStorage.setItem('vocabKillerVoice', voiceName);
        this.selectedVoice = speechSynthesis.getVoices().find(voice => voice.name === voiceName);
        this.updateVoiceInfo();
    }
    
    updateVoiceInfo() {
        const currentVoice = document.getElementById('currentVoice');
        if (currentVoice && this.selectedVoice) {
            currentVoice.textContent = `Current: ${this.selectedVoice.name}`;
        }
    }
    
    // Method called from HTML
    updateVoice(voiceName) {
        localStorage.setItem('vocabKillerVoice', voiceName);
        this.selectedVoice = speechSynthesis.getVoices().find(voice => voice.name === voiceName);
        this.updateVoiceInfo();
    }
    
    updateSpeed(speed) {
        localStorage.setItem('vocabKillerSpeechSpeed', speed);
        this.speechSpeed = parseFloat(speed);
        
        const speedValue = document.getElementById('speedValue');
        if (speedValue) {
            speedValue.textContent = speed + 'x';
        }
        
        // Update slider fill color
        const speedSlider = document.getElementById('speedSlider');
        if (speedSlider) {
            const min = parseFloat(speedSlider.min);
            const max = parseFloat(speedSlider.max);
            const value = parseFloat(speed);
            const percentage = ((value - min) / (max - min)) * 100;
            speedSlider.style.setProperty('--value', `${percentage}%`);
        }
    }
    
    resetSpeed() {
        this.updateSpeed('1.0');
        const speedSlider = document.getElementById('speedSlider');
        if (speedSlider) {
            speedSlider.value = '1.0';
        }
    }
    
    // Dictation Mode Methods
    toggleDictationMode() {
        this.dictationMode = !this.dictationMode;
        localStorage.setItem('dictationMode', this.dictationMode);
        this.updateDictationModeDisplay();
        
        // Update sentence display based on dictation mode
        this.displayCurrentSentence();
        
        console.log('Dictation mode:', this.dictationMode ? 'enabled' : 'disabled');
    }
    
    updateDictationModeDisplay() {
        const dictationBtn = document.querySelector('.dictation-btn');
        if (dictationBtn) {
            if (this.dictationMode) {
                dictationBtn.classList.add('active');
            } else {
                dictationBtn.classList.remove('active');
            }
        }
    }
    
    updateCurrentVoiceDisplay() {
        const currentVoice = document.getElementById('currentVoice');
        if (currentVoice && this.selectedVoice) {
            currentVoice.textContent = `Current: ${this.selectedVoice.name}`;
        }
    }
    
    updateSpeedDisplay() {
        const speedValue = document.getElementById('speedValue');
        if (speedValue) {
            speedValue.textContent = `${this.speechSpeed}x`;
        }
    }
    
    updateSwitchDisplay(type) {
        const switchElement = document.getElementById(`switch${type.charAt(0).toUpperCase() + type.slice(1)}`);
        if (switchElement) {
            const isChecked = type === 'before' ? this.autoPronounceBefore : this.autoPronounceAfter;
            if (isChecked) {
                switchElement.classList.add('on');
                switchElement.setAttribute('aria-checked', 'true');
            } else {
                switchElement.classList.remove('on');
                switchElement.setAttribute('aria-checked', 'false');
            }
        }
    }
    
    updateSoundSettingsDisplay() {
        const enableTypingSoundCheckbox = document.getElementById('enableTypingSound');
        const soundTypeSelect = document.getElementById('soundType');
        const soundVolumeSlider = document.getElementById('soundVolume');
        const volumeLabel = document.getElementById('volumeLabel');
        
        if (enableTypingSoundCheckbox) {
            enableTypingSoundCheckbox.checked = this.enableTypingSound;
        }
        if (soundTypeSelect) {
            soundTypeSelect.value = this.soundType;
        }
        if (soundVolumeSlider) {
            soundVolumeSlider.value = this.soundVolume;
            // Update CSS variable for volume slider fill
            soundVolumeSlider.style.setProperty('--value', `${this.soundVolume}%`);
        }
        if (volumeLabel) {
            volumeLabel.textContent = `${this.soundVolume}%`;
        }
    }
    
    updateUI() {
        // Apply saved font
        const savedFont = localStorage.getItem('selectedFont') || 'system-ui';
        this.updateFont(savedFont);
        
        // Set font select value
        const fontSelect = document.getElementById('fontSelect');
        if (fontSelect) {
            fontSelect.value = savedFont;
        }
        
        // Apply saved UI font size
        const savedUIFontSize = localStorage.getItem('uiFontSize') || '16';
        this.updateUIFontSize(savedUIFontSize);
        
        // Set UI font size select value
        const uiFontSizeSelect = document.getElementById('uiFontSizeSelect');
        if (uiFontSizeSelect) {
            uiFontSizeSelect.value = savedUIFontSize;
        }
        
        // Set translation language select value
        const translationLanguageSelect = document.getElementById('translationLanguageSelect');
        if (translationLanguageSelect) {
            translationLanguageSelect.value = this.translationLanguage;
        }
        
        // Apply saved sentence font size to the sentence hint area
        const sentenceNumber = document.getElementById('currentSentenceNumber');
        if (sentenceNumber) {
            sentenceNumber.style.fontSize = `${this.sentenceFontSize}px`;
        }
        
        // Apply saved typing font size to the typing area
        const sentenceText = document.getElementById('currentSentence');
        if (sentenceText) {
            sentenceText.style.fontSize = `${this.typingFontSize}px`;
        }
        
        this.updateSoundSettingsDisplay();
        this.updateSwitchDisplay('before');
        this.updateSwitchDisplay('after');
        
        // Update dictation mode display
        this.updateDictationModeDisplay();
        this.updateSpeedDisplay();
        
        // Initialize voice select if voices are already available
        if (speechSynthesis.getVoices().length > 0) {
            this.populateVoiceSelect();
        }
        
        // Initialize speed slider fill
        const speedSlider = document.getElementById('speedSlider');
        if (speedSlider) {
            const min = parseFloat(speedSlider.min);
            const max = parseFloat(speedSlider.max);
            const value = parseFloat(speedSlider.value);
            const percentage = ((value - min) / (max - min)) * 100;
            speedSlider.style.setProperty('--value', `${percentage}%`);
        }
        
        // Update translation mode switches
        const wordByWordSwitch = document.getElementById('wordByWordSwitch');
        const fullSentenceSwitch = document.getElementById('fullSentenceSwitch');
        if (wordByWordSwitch) {
            wordByWordSwitch.setAttribute('aria-pressed', String(this.wordByWordEnabled));
        }
        if (fullSentenceSwitch) {
            fullSentenceSwitch.setAttribute('aria-pressed', String(this.fullSentenceEnabled));
        }
        
        // Initialize column width
        document.documentElement.style.setProperty('--column-width', this.columnWidth + 'px');
        
        // Set column width select value
        const columnWidthSelect = document.getElementById('columnWidthSelect');
        if (columnWidthSelect) {
            columnWidthSelect.value = this.columnWidth;
        }
    }
    
    showMessage(message) {
        // Simple message display - can be enhanced
        alert(message);
    }
    
    showTemporaryMessage(message, type = 'info') {
        // Create temporary message element
        const messageDiv = document.createElement('div');
        messageDiv.className = `temp-message ${type}`;
        messageDiv.textContent = message;
        messageDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'success' ? '#4CAF50' : type === 'error' ? '#f44336' : '#2196F3'};
            color: white;
            padding: 12px 20px;
            border-radius: 4px;
            z-index: 10000;
            font-size: 14px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.2);
            transition: opacity 0.3s ease;
        `;
        
        document.body.appendChild(messageDiv);
        
        // Remove after 3 seconds
        setTimeout(() => {
            messageDiv.style.opacity = '0';
            setTimeout(() => {
                if (messageDiv.parentNode) {
                    messageDiv.parentNode.removeChild(messageDiv);
                }
            }, 300);
        }, 3000);
    }
    
    closeSubpage() {
        console.log('🔄 NAVIGATING BACK TO LEARN ORIGINAL TEXT SUBPAGE 🚨');
        window.location.href = '/learn-original-text-subpage.html';
    }
}

// Dictionary service using Free Dictionary API
class DictionaryService {
    constructor() {
        this.baseUrl = 'https://api.dictionaryapi.dev/api/v2/entries/en';
        this.googleTranslateUrl = 'https://translate.googleapis.com/translate_a/single';
        this.cache = new Map();
        this.popupTranslationCache = new Map(); // Cache for popup translations
        this.maxCacheSize = 100; // Maximum number of cached items
    }

    // Cache management method
    manageCacheSize() {
        if (this.popupTranslationCache.size > this.maxCacheSize) {
            // Remove oldest entries (first 20% of cache)
            const entriesToRemove = Math.floor(this.maxCacheSize * 0.2);
            const keys = Array.from(this.popupTranslationCache.keys()).slice(0, entriesToRemove);
            keys.forEach(key => this.popupTranslationCache.delete(key));
        }
    }

    // Pre-translate common words for faster popup response
    async preTranslateCommonWords(targetLanguage = 'zh') {
        const commonWords = ['hello', 'world', 'good', 'bad', 'big', 'small', 'fast', 'slow', 'new', 'old'];
        
        const translationPromises = commonWords.map(async (word) => {
            const cacheKey = `${word}_${targetLanguage}`;
            if (!this.popupTranslationCache.has(cacheKey)) {
                try {
                    const translation = await this.translateText(word, 'en', targetLanguage);
                    if (translation) {
                        this.popupTranslationCache.set(cacheKey, translation);
                    }
                } catch (error) {
                    console.error(`Failed to pre-translate ${word}:`, error);
                }
            }
        });
        
        // Run pre-translations in parallel but don't wait for completion
        Promise.allSettled(translationPromises);
    }

    async getWordTranslation(word, targetLanguage = 'zh') {
        const cleanWord = word.toLowerCase().trim();
        const cacheKey = `${cleanWord}_${targetLanguage}`;
        
        // Check cache first
        if (this.popupTranslationCache.has(cacheKey)) {
            return this.popupTranslationCache.get(cacheKey);
        }
        
        try {
            const translation = await this.translateText(cleanWord, 'en', targetLanguage);
            if (translation) {
                this.popupTranslationCache.set(cacheKey, translation);
                this.manageCacheSize();
                return translation;
            }
        } catch (error) {
            console.error('Translation error:', error);
        }
        
        return null;
    }

    async translateText(text, fromLang, toLang) {
        try {
            // Use UnifiedTranslationService if available
            if (window.unifiedTranslationService) {
                const result = await window.unifiedTranslationService.translateText(text, fromLang, toLang);
                return result.translation;
            }
            
            // Fallback to Google Translate
            const response = await fetch(`${this.googleTranslateUrl}?client=gtx&sl=${fromLang}&tl=${toLang}&dt=t&q=${encodeURIComponent(text)}`);
            const data = await response.json();
            
            if (data && data[0] && data[0][0]) {
                return data[0][0][0];
            }
        } catch (error) {
            console.error('Translation error:', error);
        }
        
        return null;
    }
}

// Initialize the game when the page loads
let sentencePractice;
document.addEventListener('DOMContentLoaded', () => {
    sentencePractice = new SentencePractice();
});

