// VocabKiller Learn Original Words Typing Game
// Inspired by Qwerty Learner's typing engine

class VocabKillerTypingGame {
    constructor() {
        this.words = [];
        this.currentIndex = 0;
        this.typedInput = '';
        this.completedWords = new Set();
        this.definitions = {};
        this.pronunciations = {};
        this.startTime = null;
        this.isGameActive = false;
        
        // Character-by-character typing
        this.currentCharIndex = 0;
        this.wordCharacters = [];
        this.typedCharacters = [];
        this.isTypingCorrect = true;
        
        // Preference settings - match homepage defaults
        this.currentFont = '\'Adobe Garamond Pro\', serif';
        this.currentFontSize = 14;
        this.wordFontSize = 48; // Font size for word display
        this.typingFontSize = 24; // Font size for typing box
        this.translationLanguage = 'zh';
        this.selectedVoice = null;
        this.speechSpeed = 1.0;
        this.inheritedVoiceName = null; // Voice inherited from homepage/previous subpage
        
        // Translation settings
        this.translations = {};
        this.translationProgress = 0;
        this.isTranslating = false;
        this.translationsVisible = false; // Track translation visibility
        
        // Repeat settings
        this.listRepeatCount = 1;
        this.wordRepeatCount = 1;
        this.currentListRound = 1;
        this.currentWordRepeat = 1;
        this.originalWords = [];
        
        // Toggle system
        this.activeRepeatMode = 'none'; // 'word', 'list', or 'none'
        
        // Dictation mode settings
        this.dictationMode = false;

        // Auto Pronounce settings (session-scoped)
        this.autoPronounceBefore = true; // default ON
        this.autoPronounceAfter = true;  // default ON
        
        // Initialize sound manager if available
        if (typeof SoundManager !== 'undefined') {
            this.soundManager = new SoundManager();
        }
        
        this.initialize();
    }
    
    initialize() {
        this.loadWordsFromSession();
        this.setupEventListeners();
        this.setupDropdownAutoHide();
        this.loadPreferences();
        this.loadAutoPronouncePreferences();
        this.loadRepeatSettings();
        this.initializeRepeatSystem();
        this.applyInitialFontSettings();
        this.displayCurrentWord();
        this.updateProgress();
        this.updateNavigationButtons();
        
        // Force refresh font sizes after a short delay to ensure DOM is ready
        setTimeout(() => {
            this.refreshFontSizes();
        }, 100);
        
        // Start automatic translation
        this.startAutomaticTranslation();
    }
    
    loadWordsFromSession() {
        const savedData = sessionStorage.getItem('learnUnknownWords2Data');
        console.log('loadWordsFromSession called');
        console.log('savedData:', savedData);
        
        if (savedData) {
            try {
                const data = JSON.parse(savedData);
                this.words = data.unknownWords || [];
                console.log(`Loaded ${this.words.length} words for typing game`);
                console.log('words:', this.words);
                
                // Load voice selection from session data
                if (data.selectedVoice) {
                    this.inheritedVoiceName = data.selectedVoice;
                    console.log('Inherited voice from session:', this.inheritedVoiceName);
                }
                if (data.speechSpeed) {
                    this.speechSpeed = data.speechSpeed;
                    console.log('Inherited speech speed from session:', this.speechSpeed);
                }
                
                if (this.words.length === 0) {
                    // Use default test word instead of showing error
                    this.words = ['test'];
                    console.log('No words found, using default test word');
                }
            } catch (error) {
                console.error('Error parsing saved data:', error);
                // Use default test word instead of showing error
                this.words = ['test'];
                console.log('Error parsing data, using default test word');
            }
        } else {
            console.error('No words data found');
            // Use default test word instead of showing error
            this.words = ['test'];
            console.log('No data found, using default test word');
        }
    }
    
    setupEventListeners() {
        const input = document.getElementById('typingInput');
        
        // Real-time input handling (Qwerty Learner style)
        input.addEventListener('input', (e) => this.handleInput(e.target.value));
        
        // Click to pronounce functionality
        input.addEventListener('click', () => {
            if (this.autoPronounceBefore) {
                this.speakCurrentWord();
            }
        });
        
        // Handle special keys
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                this.checkWordCompletion();
            } else if (e.key === 'Escape') {
                e.preventDefault();
                this.closeSubpage();
            }
        });
        

        
        // Prevent form submission
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && e.target.tagName !== 'INPUT') {
                e.preventDefault();
            }
        });
        
        // Sound control event listeners
        this.setupSoundEventListeners();
        
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
    }
    
    handleInput(value) {
        if (!this.isGameActive) {
            this.startGame();
        }
        
        // Completely rebuild the state based on current input
        this.typedCharacters = [];
        this.currentCharIndex = 0;
        
        // Match input characters with word characters (case-insensitive)
        for (let i = 0; i < value.length && i < this.wordCharacters.length; i++) {
            if (value[i].toLowerCase() === this.wordCharacters[i].toLowerCase()) {
                this.typedCharacters.push(value[i]);
                this.currentCharIndex = i + 1;
            } else {
                // Wrong character - stop here
                break;
            }
        }
        
        this.typedInput = value;
        this.updateWordDisplay();
        
        // Play typing sound if enabled
        if (this.soundManager && this.soundManager.enabled) {
            this.soundManager.playTypingSound();
        }
        
        // Check if word is complete
        if (this.currentCharIndex >= this.wordCharacters.length) {
            this.completeWord();
        }
    }
    
    validateTyping() {
        const currentWord = this.words[this.currentIndex];
        const isCorrect = this.typedInput.toLowerCase() === currentWord.toLowerCase();
        
        // Visual feedback for input field
        const input = document.getElementById('typingInput');
        input.classList.remove('correct', 'incorrect');
        
        if (this.typedInput.length > 0) {
            if (isCorrect) {
                input.classList.add('correct');
            } else {
                input.classList.add('incorrect');
            }
        }
    }
    
    updateWordDisplay() {
        const currentWordElement = document.getElementById('currentWord');
        
        if (this.currentIndex < this.words.length) {
            const word = this.words[this.currentIndex];
            
            // Get translation for the word
            const translation = this.translations[word] || '';
            
            // Create character-by-character display
            const characterDisplay = this.wordCharacters.map((char, index) => {
                let charClass = 'character-pending';
                
                if (index < this.typedCharacters.length) {
                    charClass = 'character-correct';
                } else if (index === this.currentCharIndex && this.typedInput.length > this.typedCharacters.length) {
                    // Current character is wrong (user typed something different)
                    charClass = 'character-wrong';
                }
                
                // In dictation mode, show underscores for pending characters and actual characters for completed parts
                if (this.dictationMode) {
                    if (index < this.typedCharacters.length) {
                        // Show actual character for completed parts
                        return `<span class="${charClass}">${char}</span>`;
                    } else {
                        // Show underscore for pending characters
                        return `<span class="${charClass}">_</span>`;
                    }
                } else {
                    // Normal mode - always show actual characters
                    return `<span class="${charClass}">${char}</span>`;
                }
            }).join(this.dictationMode ? ' ' : ''); // Wide spacing for dictation, tight spacing for normal mode
            
            // Update the word display
            const wordTextElement = currentWordElement.querySelector('.word-text');
            if (wordTextElement) {
                wordTextElement.innerHTML = characterDisplay;
            }
        }
    }
    
    checkWordCompletion() {
        const currentWord = this.words[this.currentIndex];
        
        if (this.typedInput.toLowerCase() === currentWord.toLowerCase()) {
            this.completeWord();
        } else {
            // Show error feedback
            this.showErrorFeedback();
        }
    }
    
    completeWord() {
        const currentWord = this.words[this.currentIndex];
        
        // Mark as completed
        this.completedWords.add(currentWord);
        
        // Play pronunciation
        if (this.autoPronounceAfter) {
            this.playPronunciation(currentWord);
        }
        
        // Move to next word after delay
        setTimeout(() => {
            this.nextWord();
        }, 1000); // Reduced delay since no definition to show
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
    
    nextWord() {
        this.currentIndex++;
        this.typedInput = '';
        
        // Reset character-by-character typing state
        this.currentCharIndex = 0;
        this.wordCharacters = [];
        this.typedCharacters = [];
        this.isTypingCorrect = true;
        
        if (this.currentIndex >= this.words.length) {
            this.completeGame();
        } else {
            this.displayCurrentWord();
            this.updateProgress();
            this.updateNavigationButtons();
            this.clearInput();
            this.focusInput();
            // Word will be spoken automatically by displayCurrentWord()
        }
    }
    
    displayCurrentWord() {
        const currentWordElement = document.getElementById('currentWord');
        
        if (this.currentIndex < this.words.length) {
            const word = this.words[this.currentIndex];
            
            // Initialize character-by-character typing
            this.wordCharacters = word.split('');
            this.currentCharIndex = 0;
            this.typedCharacters = [];
            this.isTypingCorrect = true;
            
            // Get translation for the word
            const translation = this.translations[word] || '';
            
            console.log(`Displaying word: ${word}, translation: ${translation}`);
            console.log('All translations:', this.translations);
            
            // Create character-by-character display
            const characterDisplay = this.wordCharacters.map((char, index) => {
                let charClass = 'character-pending';
                if (index < this.typedCharacters.length) {
                    charClass = 'character-correct';
                } else if (index === this.currentCharIndex) {
                    charClass = 'character-current';
                }
                
                // In dictation mode, show underscores for pending characters and actual characters for completed parts
                if (this.dictationMode) {
                    if (index < this.typedCharacters.length) {
                        // Show actual character for completed parts
                        return `<span class="${charClass}">${char}</span>`;
                    } else {
                        // Show underscore for pending characters
                        return `<span class="${charClass}">_</span>`;
                    }
                } else {
                    // Normal mode - always show actual characters
                    return `<span class="${charClass}">${char}</span>`;
                }
            }).join(this.dictationMode ? ' ' : ''); // Wide spacing for dictation, tight spacing for normal mode
            
            currentWordElement.innerHTML = `
                <div style="display: flex; flex-direction: column; align-items: center; gap: 5px;">
                    <div style="display: flex; align-items: center; gap: 10px; position: relative;">
                        <div style="position: relative; display: inline-block;">
                            <span class="word-text">${characterDisplay}</span>
                            ${translation && this.translationsVisible ? `<div class="word-translation" style="font-size: 14px; color: #666; text-align: center; margin-top: -5px; position: absolute; left: 50%; transform: translateX(-50%); white-space: nowrap;">${translation}</div>` : ''}
                        </div>
                        <button class="speak-word-btn" onclick="typingGame.speakCurrentWord()" title="Speak word" style="display: inline-block;">
                            <img src="/images/ReadText.svg" alt="Speak" style="width: 24px; height: 24px;" />
                        </button>
                    </div>
                </div>
            `;
            
            // Re-apply font size after updating the word display
            setTimeout(() => {
                if (currentWordElement) {
                    currentWordElement.style.fontSize = this.wordFontSize + 'px';
                    console.log('Re-applied font size after word display update:', currentWordElement.style.fontSize);
                }
            }, 10);
            

        }
    }
    
    updateProgress() {
        const progressFill = document.getElementById('progressFill');
        const progressText = document.getElementById('progressText');
        
        const progress = (this.currentIndex / this.words.length) * 100;
        progressFill.style.width = `${progress}%`;
        progressText.textContent = `${this.currentIndex}/${this.words.length} words`;
    }
    
    clearInput() {
        const input = document.getElementById('typingInput');
        input.value = '';
        input.classList.remove('correct', 'incorrect');
        this.typedInput = '';
    }
    
    focusInput() {
        const input = document.getElementById('typingInput');
        input.focus();
    }
    

    
    showErrorFeedback() {
        const input = document.getElementById('typingInput');
        input.classList.add('incorrect');
        
        // Shake animation
        input.style.animation = 'shake 0.5s';
        setTimeout(() => {
            input.style.animation = '';
        }, 500);
        
        setTimeout(() => {
            input.classList.remove('incorrect');
        }, 1000);
    }
    
    startGame() {
        this.isGameActive = true;
        this.startTime = Date.now();
    }
    
    completeGame() {
        this.isGameActive = false;
        
        // Update completion message with word count
        const completionMessage = document.getElementById('completionMessage');
        if (completionMessage) {
            completionMessage.textContent = `You've completed all ${this.words.length} words!`;
        }
        
        // Show completion popup
        const completionPopup = document.getElementById('completionPopup');
        if (completionPopup) {
            completionPopup.classList.add('show');
        }
    }
    
    restartGame() {
        // Hide completion popup
        const completionPopup = document.getElementById('completionPopup');
        if (completionPopup) {
            completionPopup.classList.remove('show');
        }
        
        // Reset game state
        this.currentIndex = 0;
        this.typedInput = '';
        this.completedWords.clear();
        this.isGameActive = false;
        this.startTime = null;
        
        // Reset character-by-character typing state
        this.currentCharIndex = 0;
        this.wordCharacters = [];
        this.typedCharacters = [];
        this.isTypingCorrect = true;
        
        // Reset repeat counters
        this.currentListRound = 1;
        this.currentWordRepeat = 1;
        
        // Restart the game
        this.displayCurrentWord();
        this.updateProgress();
        this.updateNavigationButtons();
        this.clearInput();
        this.focusInput();
        this.startGame();
    }
    
    speakCurrentWord() {
        const currentWord = this.words[this.currentIndex];
        if (currentWord) {
            this.playPronunciation(currentWord);
        }
    }
    
    closeSubpage() {
        // Close the current window/tab
        window.close();
        
        // Fallback: if window.close() doesn't work, try to go back
        if (!window.closed) {
            window.history.back();
        }
    }
    
    hideCompletionPopup() {
        // Hide completion popup only
        const completionPopup = document.getElementById('completionPopup');
        if (completionPopup) {
            completionPopup.classList.remove('show');
        }
    }
    
    toggleDictationMode() {
        this.dictationMode = !this.dictationMode;
        
        // Update button visual state
        const dictationBtn = document.querySelector('.dictation-btn');
        if (dictationBtn) {
            if (this.dictationMode) {
                dictationBtn.classList.add('active');
            } else {
                dictationBtn.classList.remove('active');
            }
        }
        
        // Re-display current word with new mode
        this.displayCurrentWord();
        // Refresh navigation buttons to reflect dictation mode label visibility
        this.updateNavigationButtons();
        
        // Auto-play pronunciation in dictation mode
        if (this.dictationMode) {
            setTimeout(() => {
                this.speakCurrentWord();
            }, 500);
        }
        
        // Save preference
        localStorage.setItem('vocabKillerDictationMode', this.dictationMode.toString());
    }

    // Auto Pronounce UI and persistence
    toggleAutoPronounceDropdown() {
        const dropdown = document.getElementById('autoPronounceDropdown');
        if (!dropdown) return;
        const isOpen = dropdown.style.display === 'block';
        dropdown.style.display = isOpen ? 'none' : 'block';
        this.updateAutoPronounceButtonState();
        // Initialize checkbox states when opened
        if (!isOpen) {
            const beforeToggle = document.getElementById('autoPronounceBeforeToggle');
            const afterToggle = document.getElementById('autoPronounceAfterToggle');
            if (beforeToggle) beforeToggle.checked = this.autoPronounceBefore;
            if (afterToggle) afterToggle.checked = this.autoPronounceAfter;
        }
    }

    setAutoPronounceBefore(enabled) {
        this.autoPronounceBefore = !!enabled;
        sessionStorage.setItem('vocabKillerAutoPronounceBefore', this.autoPronounceBefore.toString());
        this.updateAutoPronounceButtonState();
    }

    setAutoPronounceAfter(enabled) {
        this.autoPronounceAfter = !!enabled;
        sessionStorage.setItem('vocabKillerAutoPronounceAfter', this.autoPronounceAfter.toString());
        this.updateAutoPronounceButtonState();
    }

    loadAutoPronouncePreferences() {
        const savedBefore = sessionStorage.getItem('vocabKillerAutoPronounceBefore');
        const savedAfter = sessionStorage.getItem('vocabKillerAutoPronounceAfter');
        if (savedBefore !== null) this.autoPronounceBefore = savedBefore === 'true';
        if (savedAfter !== null) this.autoPronounceAfter = savedAfter === 'true';
        this.updateAutoPronounceButtonState();

        // Sync custom switches if present
        const switchBefore = document.getElementById('switchBefore');
        const switchAfter = document.getElementById('switchAfter');
        if (switchBefore) {
            switchBefore.setAttribute('aria-checked', this.autoPronounceBefore ? 'true' : 'false');
            switchBefore.classList.toggle('on', this.autoPronounceBefore);
        }
        if (switchAfter) {
            switchAfter.setAttribute('aria-checked', this.autoPronounceAfter ? 'true' : 'false');
            switchAfter.classList.toggle('on', this.autoPronounceAfter);
        }
    }

    updateAutoPronounceButtonState() {
        const btn = document.querySelector('.autopronounce-btn');
        if (!btn) return;
        if (this.autoPronounceBefore || this.autoPronounceAfter) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    }

    toggleSwitch(which) {
        if (which === 'before') {
            this.setAutoPronounceBefore(!this.autoPronounceBefore);
            const el = document.getElementById('switchBefore');
            if (el) {
                el.setAttribute('aria-checked', this.autoPronounceBefore ? 'true' : 'false');
                el.classList.toggle('on', this.autoPronounceBefore);
            }
        } else if (which === 'after') {
            this.setAutoPronounceAfter(!this.autoPronounceAfter);
            const el = document.getElementById('switchAfter');
            if (el) {
                el.setAttribute('aria-checked', this.autoPronounceAfter ? 'true' : 'false');
                el.classList.toggle('on', this.autoPronounceAfter);
            }
        }
    }
    
    toggleTranslations() {
        if (this.translationsVisible) {
            this.hideTranslations();
        } else {
            this.showTranslations();
        }
        this.updateTranslationStatus();
    }
    
    showTranslations() {
        if (this.translationsVisible) return; // Already showing
        this.translationsVisible = true;
        this.displayCurrentWord(); // Re-display with translations
        this.updateTranslationStatus();
    }
    
    hideTranslations() {
        if (!this.translationsVisible) return; // Already hidden
        this.translationsVisible = false;
        this.displayCurrentWord(); // Re-display without translations
        this.updateTranslationStatus();
    }
    
    updateTranslationStatus() {
        const statusElement = document.getElementById('translationStatus');
        if (statusElement) {
            statusElement.textContent = this.translationsVisible ? 'Hide' : 'Show';
        }
    }
    
    // Sound control functions
    toggleSoundDropdown() {
        const dropdown = document.getElementById('soundDropdown');
        if (dropdown) {
            dropdown.style.display = dropdown.style.display === 'block' ? 'none' : 'block';
            this.loadSoundSettings();
        }
    }
    
    loadSoundSettings() {
        if (!this.soundManager) return;
        
        const settings = this.soundManager.getSettings();
        
        // Update checkbox
        const enableCheckbox = document.getElementById('enableTypingSound');
        if (enableCheckbox) {
            enableCheckbox.checked = settings.enabled;
        }
        
        // Update sound type dropdown
        const soundTypeSelect = document.getElementById('soundType');
        if (soundTypeSelect) {
            soundTypeSelect.value = settings.currentType;
        }
        
        // Update volume slider
        const volumeSlider = document.getElementById('soundVolume');
        if (volumeSlider) {
            volumeSlider.value = settings.volume;
        }
        
        // Update volume label
        const volumeLabel = document.getElementById('volumeLabel');
        if (volumeLabel) {
            volumeLabel.textContent = settings.volume + '%';
        }
    }
    
    previewSound() {
        if (this.soundManager) {
            this.soundManager.playTypingSound();
        }
    }
    
    updateVolumeSliderFill(slider) {
        const value = slider.value;
        const max = slider.max;
        const percentage = (value / max) * 100;
        
        // Create linear gradient with black fill
        slider.style.background = `linear-gradient(to right, black 0%, black ${percentage}%, #ddd ${percentage}%, #ddd 100%)`;
    }
    
    setupSoundEventListeners() {
        // Enable/disable checkbox
        const enableCheckbox = document.getElementById('enableTypingSound');
        if (enableCheckbox) {
            enableCheckbox.addEventListener('change', (e) => {
                if (this.soundManager) {
                    this.soundManager.setEnabled(e.target.checked);
                }
            });
        }
        
        // Initialize volume slider fill
        const volumeSlider = document.getElementById('soundVolume');
        if (volumeSlider) {
            this.updateVolumeSliderFill(volumeSlider);
            
            // Volume slider event listener
            volumeSlider.addEventListener('input', (e) => {
                if (this.soundManager) {
                    this.soundManager.setVolume(parseInt(e.target.value));
                }
                
                // Update volume label
                const volumeLabel = document.getElementById('volumeLabel');
                if (volumeLabel) {
                    volumeLabel.textContent = e.target.value + '%';
                }
                
                // Update black fill bar
                this.updateVolumeSliderFill(e.target);
            });
        }
        
        // Sound type dropdown
        const soundTypeSelect = document.getElementById('soundType');
        if (soundTypeSelect) {
            soundTypeSelect.addEventListener('change', (e) => {
                if (this.soundManager) {
                    this.soundManager.setSoundType(parseInt(e.target.value));
                }
            });
        }
        
        // Click outside to close dropdown
        document.addEventListener('click', (e) => {
            const soundContainer = document.querySelector('.sound-container');
            const soundDropdown = document.getElementById('soundDropdown');
            
            if (soundContainer && soundDropdown && !soundContainer.contains(e.target)) {
                soundDropdown.style.display = 'none';
            }
        });
    }
    
    showError(message) {
        const gameContainer = document.querySelector('.game-container');
        gameContainer.innerHTML = `
            <div class="error-message">
                <h2>Error</h2>
                <p>${message}</p>
                <div class="game-controls">
                    <button class="control-btn" onclick="typingGame.closeSubpage()">
                        Go Back
                    </button>
                </div>
            </div>
        `;
    }
    
    // Preference Functions
    togglePreferenceDropdown() {
        const dropdown = document.getElementById('preferenceDropdown');
        dropdown.classList.toggle('show');
        
        // Load current preferences
        this.loadPreferences();
    }
    
    loadPreferences() {
        // Load font preference - match homepage default
        const savedFont = localStorage.getItem('vocabKillerFont') || '\'Adobe Garamond Pro\', serif';
        this.currentFont = savedFont;
        const fontSelect = document.getElementById('fontSelect');
        if (fontSelect) {
            fontSelect.value = savedFont;
        }
        
        // Load font size preference - match homepage default
        const savedFontSize = localStorage.getItem('vocabKillerFontSize') || '14';
        this.currentFontSize = parseInt(savedFontSize);
        const fontSizeSelect = document.getElementById('fontSizeSelect');
        if (fontSizeSelect) {
            fontSizeSelect.value = savedFontSize;
        }
        
        // Load word font size preference
        const savedWordFontSize = localStorage.getItem('vocabKillerWordFontSize') || '48';
        this.wordFontSize = parseInt(savedWordFontSize);
        const wordFontSizeSelect = document.getElementById('wordFontSizeSelect');
        if (wordFontSizeSelect) {
            wordFontSizeSelect.value = savedWordFontSize;
        }
        
        // Load typing font size preference
        const savedTypingFontSize = localStorage.getItem('vocabKillerTypingFontSize') || '24';
        this.typingFontSize = parseInt(savedTypingFontSize);
        const typingFontSizeSelect = document.getElementById('typingFontSizeSelect');
        if (typingFontSizeSelect) {
            typingFontSizeSelect.value = savedTypingFontSize;
        }
        
        // Load translation language preference
        const savedTranslationLanguage = localStorage.getItem('vocabKillerTranslationLanguage') || 'zh';
        this.translationLanguage = savedTranslationLanguage;
        const translationLanguageSelect = document.getElementById('translationLanguageSelect');
        if (translationLanguageSelect) {
            translationLanguageSelect.value = savedTranslationLanguage;
        }
        
        // Load speech preferences
        this.loadSpeechPreferences();
        
        // Load dictation mode preference
        const savedDictationMode = localStorage.getItem('vocabKillerDictationMode');
        if (savedDictationMode !== null) {
            this.dictationMode = savedDictationMode === 'true';
        }
        
        // Update dictation button state
        const dictationBtn = document.querySelector('.dictation-btn');
        if (dictationBtn) {
            if (this.dictationMode) {
                dictationBtn.classList.add('active');
            } else {
                dictationBtn.classList.remove('active');
            }
        }
    }
    
    loadSpeechPreferences() {
        // Load voice preference
        const savedVoice = localStorage.getItem('vocabKillerVoice') || '';
        const voiceSelect = document.getElementById('voiceSelect');
        if (voiceSelect) {
            this.populateVoiceSelect();
            setTimeout(() => {
                voiceSelect.value = savedVoice;
                this.updateVoiceInfo();
            }, 100);
        }
        
        // (Audio toggle removed)
        
        // Load speed preference
        const savedSpeed = localStorage.getItem('vocabKillerSpeechSpeed') || '1.0';
        const speedSlider = document.getElementById('speedSlider');
        const speedValue = document.getElementById('speedValue');
        if (speedSlider && speedValue) {
            speedSlider.value = savedSpeed;
            speedValue.textContent = savedSpeed + 'x';
        }
    }
    
    updateFont(font) {
        localStorage.setItem('vocabKillerFont', font);
        this.currentFont = font;
        document.body.style.fontFamily = font;
        
        // Update game elements
        const currentWord = document.getElementById('currentWord');
        const typingInput = document.getElementById('typingInput');
        const definitionText = document.getElementById('definitionText');
        
        if (currentWord) currentWord.style.fontFamily = font;
        if (typingInput) typingInput.style.fontFamily = font;
        if (definitionText) definitionText.style.fontFamily = font;
    }
    
    updateFontSize(size) {
        localStorage.setItem('vocabKillerFontSize', size);
        this.currentFontSize = parseInt(size);
        document.body.style.fontSize = size + 'px';
        
        // Update game elements (but don't override word font size)
        const definitionText = document.getElementById('definitionText');
        
        if (definitionText) definitionText.style.fontSize = size + 'px';
    }
    
    updateWordFontSize(size) {
        this.wordFontSize = parseInt(size);
        localStorage.setItem('vocabKillerWordFontSize', size);
        
        console.log('Updating word font size to:', this.wordFontSize + 'px');
        
        // Apply word font size using CSS custom property
        document.documentElement.style.setProperty('--word-font-size', this.wordFontSize + 'px');
        
        // Also apply directly to element as fallback
        const currentWord = document.getElementById('currentWord');
        if (currentWord) {
            currentWord.style.fontSize = this.wordFontSize + 'px';
            console.log('Applied font size to currentWord:', currentWord.style.fontSize);
        } else {
            console.log('currentWord element not found');
        }
        
        // Force a re-render of the word display
        this.displayCurrentWord();
    }
    
    updateTypingFontSize(size) {
        this.typingFontSize = parseInt(size);
        localStorage.setItem('vocabKillerTypingFontSize', size);
        
        console.log('Updating typing font size to:', this.typingFontSize + 'px');
        
        // Apply typing box font size using CSS custom property
        document.documentElement.style.setProperty('--typing-font-size', this.typingFontSize + 'px');
        
        // Also apply directly to element as fallback
        const typingInput = document.getElementById('typingInput');
        if (typingInput) {
            typingInput.style.fontSize = this.typingFontSize + 'px';
            console.log('Applied font size to typingInput:', typingInput.style.fontSize);
            // Also adjust padding for larger fonts to maintain good UX
            const padding = Math.max(20, this.typingFontSize * 0.8);
            typingInput.style.padding = padding + 'px';
        } else {
            console.log('typingInput element not found');
        }
    }
    
    updateTranslationLanguage(language) {
        localStorage.setItem('vocabKillerTranslationLanguage', language);
        this.translationLanguage = language;
        
        // Restart translation with new language if words are loaded
        if (this.words.length > 0) {
            this.startAutomaticTranslation();
        }
    }
    
    applyTranslationSettings() {
        // This function can be used to apply translation settings
        // For now, just show a confirmation
        console.log('Translation settings applied');
    }
    
    // Speech Control Functions
    populateVoiceSelect() {
        const voiceSelect = document.getElementById('voiceSelect');
        if (!voiceSelect) return;
        
        const voices = speechSynthesis.getVoices();
        voiceSelect.innerHTML = '';
        
        // Filter for only the 5 specific voices
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
        if (this.inheritedVoiceName) {
            const inheritedVoice = voices.find(option => 
                option.value === this.inheritedVoiceName
            );
            if (inheritedVoice) {
                voiceSelect.value = inheritedVoice.value;
                this.updateVoice(inheritedVoice.value);
                console.log('Selected inherited voice:', this.inheritedVoiceName);
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
    
    testVoice() {
        if (this.selectedVoice) {
            const utterance = new SpeechSynthesisUtterance('Test voice');
            utterance.voice = this.selectedVoice;
            utterance.rate = this.speechSpeed || 1.0;
            speechSynthesis.speak(utterance);
        }
    }
    
    updateSpeed(speed) {
        localStorage.setItem('vocabKillerSpeechSpeed', speed);
        this.speechSpeed = parseFloat(speed);
        
        const speedValue = document.getElementById('speedValue');
        if (speedValue) {
            speedValue.textContent = speed + 'x';
        }
    }
    
    resetSpeed() {
        this.updateSpeed('1.0');
        const speedSlider = document.getElementById('speedSlider');
        if (speedSlider) {
            speedSlider.value = '1.0';
        }
    }
    
    // Setup dropdown auto-hide
    setupDropdownAutoHide() {
        document.addEventListener('click', (e) => {
            const preferenceDropdown = document.getElementById('preferenceDropdown');
            const soundDropdown = document.getElementById('soundDropdown');
            const listRepeatDropdown = document.getElementById('listRepeatDropdown');
            const wordRepeatDropdown = document.getElementById('wordRepeatDropdown');
            const autoPronounceDropdown = document.getElementById('autoPronounceDropdown');
            const autoPronounceContainer = document.querySelector('.autopronounce-container');
            
            if (preferenceDropdown && !preferenceDropdown.contains(e.target) && !e.target.closest('.preference-btn')) {
                preferenceDropdown.classList.remove('show');
            }
            
            if (soundDropdown && !soundDropdown.contains(e.target) && !e.target.closest('.sound-container')) {
                soundDropdown.style.display = 'none';
            }
            
            if (listRepeatDropdown && !listRepeatDropdown.contains(e.target) && !e.target.closest('.repeat-btn[onclick*="toggleListRepeatDropdown"]')) {
                listRepeatDropdown.classList.remove('show');
            }
            
            if (wordRepeatDropdown && !wordRepeatDropdown.contains(e.target) && !e.target.closest('.repeat-btn[onclick*="toggleWordRepeatDropdown"]')) {
                wordRepeatDropdown.classList.remove('show');
            }

            // Close Auto Pronounce dropdown when clicking outside
            if (autoPronounceDropdown) {
                const clickedInside = autoPronounceContainer && autoPronounceContainer.contains(e.target);
                if (!clickedInside) {
                    autoPronounceDropdown.style.display = 'none';
                }
            }
        });

        // Close Auto Pronounce dropdown on Escape
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                const autoPronounceDropdown = document.getElementById('autoPronounceDropdown');
                if (autoPronounceDropdown) autoPronounceDropdown.style.display = 'none';
            }
        });
    }
    
    // Translation Functions
    startAutomaticTranslation() {
        if (this.words.length === 0) return;
        
        console.log('Starting automatic translation for words:', this.words);
        
        this.isTranslating = true;
        this.translationProgress = 0;
        this.translations = {};
        
        // Show progress bar
        const progressBar = document.getElementById('translationProgressBar');
        if (progressBar) {
            progressBar.classList.add('show');
        }
        
        // Start translating words
        this.translateWords();
        
        // Set up periodic display updates while translating
        this.translationUpdateInterval = setInterval(() => {
            if (this.isTranslating) {
                this.displayCurrentWord();
            } else {
                clearInterval(this.translationUpdateInterval);
            }
        }, 500); // Update display every 500ms while translating
    }
    
    async translateWords() {
        const targetLanguage = this.translationLanguage || 'zh';
        
        for (let i = 0; i < this.words.length; i++) {
            const word = this.words[i];
            
            // Update progress
            this.translationProgress = (i / this.words.length) * 100;
            this.updateTranslationProgress();
            
            try {
                // Use Google Translate API
                const translation = await this.translateWord(word, targetLanguage);
                this.translations[word] = translation;
                
                console.log(`Translated "${word}" to "${translation}"`);
                
                // Update the display immediately when translation is available
                if (this.currentIndex === i) {
                    this.displayCurrentWord();
                }
                
                // Update navigation buttons when translations are available
                this.updateNavigationButtons();
                
            } catch (error) {
                console.error(`Failed to translate ${word}:`, error);
                this.translations[word] = 'Translation failed';
            }
            
            // Small delay to prevent overwhelming the API
            await new Promise(resolve => setTimeout(resolve, 200));
        }
        
        // Complete translation
        this.translationProgress = 100;
        this.isTranslating = false;
        this.updateTranslationProgress();
        
        // Update display one final time to show all translations
        this.displayCurrentWord();
        
        // Hide progress bar after completion
        setTimeout(() => {
            const progressBar = document.getElementById('translationProgressBar');
            if (progressBar) {
                progressBar.classList.remove('show');
            }
        }, 2000);
    }
    
    async translateWord(word, targetLanguage) {
        try {
            const response = await fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=${targetLanguage}&dt=t&q=${encodeURIComponent(word)}`);
            const data = await response.json();
            
            if (data && data[0] && data[0][0] && data[0][0][0]) {
                return data[0][0][0];
            } else {
                throw new Error('Invalid response format');
            }
        } catch (error) {
            console.error('Translation error:', error);
            // Return a simple fallback translation
            return `[${word}]`;
        }
    }
    
    toggleTranslationProgress() {
        const progressBar = document.getElementById('translationProgressBar');
        if (progressBar) {
            progressBar.classList.toggle('show');
        }
    }
    
    updateTranslationProgress() {
        const progressFill = document.getElementById('translationProgressFill');
        if (progressFill) {
            progressFill.style.width = `${this.translationProgress}%`;
        }
    }
    
    applyInitialFontSettings() {
        console.log('Applying initial font settings...');
        console.log('Word font size:', this.wordFontSize);
        console.log('Typing font size:', this.typingFontSize);
        
        // Apply font family
        document.body.style.fontFamily = this.currentFont;
        
        // Apply font size
        document.body.style.fontSize = this.currentFontSize + 'px';
        
        // Apply CSS custom properties for font sizes
        document.documentElement.style.setProperty('--word-font-size', this.wordFontSize + 'px');
        document.documentElement.style.setProperty('--typing-font-size', this.typingFontSize + 'px');
        
        // Update game elements
        const currentWord = document.getElementById('currentWord');
        const typingInput = document.getElementById('typingInput');
        const definitionText = document.getElementById('definitionText');
        
        if (currentWord) {
            currentWord.style.fontFamily = this.currentFont;
            currentWord.style.fontSize = this.wordFontSize + 'px';
            console.log('Applied initial font size to currentWord:', currentWord.style.fontSize);
        } else {
            console.log('currentWord element not found during initialization');
        }
        
        if (typingInput) {
            typingInput.style.fontFamily = this.currentFont;
            typingInput.style.fontSize = this.typingFontSize + 'px';
            console.log('Applied initial font size to typingInput:', typingInput.style.fontSize);
            // Adjust padding for typing box based on font size
            const padding = Math.max(20, this.typingFontSize * 0.8);
            typingInput.style.padding = padding + 'px';
        } else {
            console.log('typingInput element not found during initialization');
        }
        
        if (definitionText) {
            definitionText.style.fontFamily = this.currentFont;
            definitionText.style.fontSize = this.currentFontSize + 'px';
        }
    }
    
    refreshFontSizes() {
        console.log('Refreshing font sizes...');
        
        // Re-apply CSS custom properties
        document.documentElement.style.setProperty('--word-font-size', this.wordFontSize + 'px');
        document.documentElement.style.setProperty('--typing-font-size', this.typingFontSize + 'px');
        
        // Re-apply direct styles
        const currentWord = document.getElementById('currentWord');
        const typingInput = document.getElementById('typingInput');
        
        if (currentWord) {
            currentWord.style.fontSize = this.wordFontSize + 'px';
            console.log('Refreshed word font size:', currentWord.style.fontSize);
        }
        
        if (typingInput) {
            typingInput.style.fontSize = this.typingFontSize + 'px';
            console.log('Refreshed typing font size:', typingInput.style.fontSize);
            // Adjust padding
            const padding = Math.max(20, this.typingFontSize * 0.8);
            typingInput.style.padding = padding + 'px';
        }
    }
    
    goToLastWord() {
        if (this.currentIndex > 0) {
            this.currentIndex--;
            this.clearInput();
            this.displayCurrentWord();
            this.updateProgress();
            this.updateNavigationButtons();
            this.focusInput();
            
            // Automatically pronounce the new word
            if (this.autoPronounceBefore) {
                setTimeout(() => {
                    this.speakCurrentWord();
                }, 500);
            }
        }
    }
    
    goToNextWord() {
        if (this.currentIndex < this.words.length - 1) {
            this.currentIndex++;
            this.clearInput();
            this.displayCurrentWord();
            this.updateProgress();
            this.updateNavigationButtons();
            this.focusInput();
            
            // Automatically pronounce the new word
            if (this.autoPronounceBefore) {
                setTimeout(() => {
                    this.speakCurrentWord();
                }, 500);
            }
        }
    }
    
    updateNavigationButtons() {
        const lastWordBtn = document.getElementById('lastWordBtn');
        const nextWordBtn = document.getElementById('nextWordBtn');
        const lastWordInfo = document.getElementById('lastWordInfo');
        const nextWordInfo = document.getElementById('nextWordInfo');
        
        // When in dictation mode, hide labels and show only arrows
        if (this.dictationMode) {
            // Hide text containers
            if (lastWordInfo) {
                lastWordInfo.style.display = 'none';
                lastWordInfo.innerHTML = '';
            }
            if (nextWordInfo) {
                nextWordInfo.style.display = 'none';
                nextWordInfo.innerHTML = '';
            }
            // Keep arrow buttons enabled/disabled appropriately
            if (lastWordBtn) lastWordBtn.disabled = this.currentIndex <= 0;
            if (nextWordBtn) nextWordBtn.disabled = this.currentIndex >= this.words.length - 1;
            return;
        }

        // Normal mode: show labels with previous/next words and their translations
        if (lastWordInfo) lastWordInfo.style.display = '';
        if (nextWordInfo) nextWordInfo.style.display = '';

        // Update last word button
        if (this.currentIndex > 0) {
            const lastWord = this.words[this.currentIndex - 1];
            const lastTranslation = this.translations[lastWord] || '';
            if (lastWordBtn) lastWordBtn.disabled = false;
            if (lastWordInfo) {
                lastWordInfo.innerHTML = `
                <div class="nav-word">${lastWord}</div>
                <div class="nav-translation">${lastTranslation}</div>
            `;
            }
        } else {
            if (lastWordBtn) lastWordBtn.disabled = true;
            if (lastWordInfo) {
                lastWordInfo.innerHTML = `
                <div class="nav-word">Previous</div>
                <div class="nav-translation">Word</div>
            `;
            }
        }
        
        // Update next word button
        if (this.currentIndex < this.words.length - 1) {
            const nextWord = this.words[this.currentIndex + 1];
            const nextTranslation = this.translations[nextWord] || '';
            if (nextWordBtn) nextWordBtn.disabled = false;
            if (nextWordInfo) {
                nextWordInfo.innerHTML = `
                <div class="nav-word">${nextWord}</div>
                <div class="nav-translation">${nextTranslation}</div>
            `;
            }
        } else {
            if (nextWordBtn) nextWordBtn.disabled = true;
            if (nextWordInfo) {
                nextWordInfo.innerHTML = `
                <div class="nav-word">Next</div>
                <div class="nav-translation">Word</div>
            `;
            }
        }
    }
    

    
    toggleListRepeatDropdown() {
        const dropdown = document.getElementById('listRepeatDropdown');
        dropdown.classList.toggle('show');
        
        // Hide other dropdowns
        document.getElementById('wordRepeatDropdown').classList.remove('show');
        document.getElementById('preferenceDropdown').classList.remove('show');
        
        // If switching to List Repeat mode, update the active mode
        if (dropdown.classList.contains('show')) {
            this.toggleRepeatMode('list');
        }
    }
    
    toggleWordRepeatDropdown() {
        const dropdown = document.getElementById('wordRepeatDropdown');
        dropdown.classList.toggle('show');
        
        // Hide other dropdowns
        document.getElementById('listRepeatDropdown').classList.remove('show');
        document.getElementById('preferenceDropdown').classList.remove('show');
        
        // If switching to Word Repeat mode, update the active mode
        if (dropdown.classList.contains('show')) {
            this.toggleRepeatMode('word');
        }
    }
    
    selectListRepeatOption(value) {
        this.listRepeatCount = parseInt(value);
        localStorage.setItem('vocabKillerListRepeat', value);
        console.log('List repeat set to:', this.listRepeatCount);
        
        // Update badge
        const badge = document.getElementById('listRepeatBadge');
        if (badge) {
            badge.textContent = value;
        }
        
        // Toggle to List Repeat mode
        this.toggleRepeatMode('list');
        
        // Hide dropdown
        document.getElementById('listRepeatDropdown').classList.remove('show');
    }
    
    selectWordRepeatOption(value) {
        this.wordRepeatCount = parseInt(value);
        localStorage.setItem('vocabKillerWordRepeat', value);
        console.log('Word repeat set to:', this.wordRepeatCount);
        
        // Update badge
        const badge = document.getElementById('wordRepeatBadge');
        if (badge) {
            badge.textContent = value;
        }
        
        // Toggle to Word Repeat mode
        this.toggleRepeatMode('word');
        
        // Hide dropdown
        document.getElementById('wordRepeatDropdown').classList.remove('show');
    }
    
    loadRepeatSettings() {
        // Reset to default: List Repeat with 1
        this.listRepeatCount = 1;
        this.wordRepeatCount = 1;
        this.activeRepeatMode = 'list';
        
        // Save default settings
        localStorage.setItem('vocabKillerListRepeat', '1');
        localStorage.setItem('vocabKillerWordRepeat', '1');
        localStorage.setItem('vocabKillerActiveRepeatMode', 'list');
        
        // Update list repeat badge
        const listRepeatBadge = document.getElementById('listRepeatBadge');
        if (listRepeatBadge) {
            listRepeatBadge.textContent = '1';
        }
        
        // Update word repeat badge
        const wordRepeatBadge = document.getElementById('wordRepeatBadge');
        if (wordRepeatBadge) {
            wordRepeatBadge.textContent = '1';
        }
        
        // Update visual state
        this.updateRepeatModeVisuals();
    }
    
    toggleRepeatMode(mode) {
        this.activeRepeatMode = mode;
        localStorage.setItem('vocabKillerActiveRepeatMode', mode);
        
        if (mode === 'word') {
            // Disable List Repeat
            this.disableListRepeat();
            this.enableWordRepeat();
        } else if (mode === 'list') {
            // Disable Word Repeat
            this.disableWordRepeat();
            this.enableListRepeat();
        } else {
            // Enable both (none mode)
            this.enableBothRepeats();
        }
        
        this.updateRepeatModeVisuals();
        console.log('Active repeat mode:', this.activeRepeatMode);
    }
    
    disableListRepeat() {
        const listRepeatBtn = document.querySelector('.repeat-btn[onclick*="toggleListRepeatDropdown"]');
        const listRepeatBadge = document.getElementById('listRepeatBadge');
        
        if (listRepeatBtn) {
            listRepeatBtn.classList.add('disabled');
        }
        if (listRepeatBadge) {
            listRepeatBadge.classList.add('disabled');
        }
    }
    
    enableListRepeat() {
        const listRepeatBtn = document.querySelector('.repeat-btn[onclick*="toggleListRepeatDropdown"]');
        const listRepeatBadge = document.getElementById('listRepeatBadge');
        
        if (listRepeatBtn) {
            listRepeatBtn.classList.remove('disabled');
        }
        if (listRepeatBadge) {
            listRepeatBadge.classList.remove('disabled');
        }
    }
    
    disableWordRepeat() {
        const wordRepeatBtn = document.querySelector('.repeat-btn[onclick*="toggleWordRepeatDropdown"]');
        const wordRepeatBadge = document.getElementById('wordRepeatBadge');
        
        if (wordRepeatBtn) {
            wordRepeatBtn.classList.add('disabled');
        }
        if (wordRepeatBadge) {
            wordRepeatBadge.classList.add('disabled');
        }
    }
    
    enableWordRepeat() {
        const wordRepeatBtn = document.querySelector('.repeat-btn[onclick*="toggleWordRepeatDropdown"]');
        const wordRepeatBadge = document.getElementById('wordRepeatBadge');
        
        if (wordRepeatBtn) {
            wordRepeatBtn.classList.remove('disabled');
        }
        if (wordRepeatBadge) {
            wordRepeatBadge.classList.remove('disabled');
        }
    }
    
    enableBothRepeats() {
        this.enableListRepeat();
        this.enableWordRepeat();
    }
    
    updateRepeatModeVisuals() {
        // Reset all buttons
        const allRepeatBtns = document.querySelectorAll('.repeat-btn');
        const allRepeatBadges = document.querySelectorAll('.repeat-badge');
        
        allRepeatBtns.forEach(btn => btn.classList.remove('active', 'disabled'));
        allRepeatBadges.forEach(badge => badge.classList.remove('active', 'disabled'));
        
        // Apply active state based on mode
        if (this.activeRepeatMode === 'word') {
            const wordRepeatBtn = document.querySelector('.repeat-btn[onclick*="toggleWordRepeatDropdown"]');
            const wordRepeatBadge = document.getElementById('wordRepeatBadge');
            
            if (wordRepeatBtn) wordRepeatBtn.classList.add('active');
            if (wordRepeatBadge) wordRepeatBadge.classList.add('active');
            
            this.disableListRepeat();
        } else if (this.activeRepeatMode === 'list') {
            const listRepeatBtn = document.querySelector('.repeat-btn[onclick*="toggleListRepeatDropdown"]');
            const listRepeatBadge = document.getElementById('listRepeatBadge');
            
            if (listRepeatBtn) listRepeatBtn.classList.add('active');
            if (listRepeatBadge) listRepeatBadge.classList.add('active');
            
            this.disableWordRepeat();
        }
    }
    
    initializeRepeatSystem() {
        // Store original words for list repeat
        this.originalWords = [...this.words];
        this.currentListRound = 1;
        this.currentWordRepeat = 1;
    }
    
    nextWord() {
        this.currentIndex++;
        this.typedInput = '';
        
        // Reset character-by-character typing state
        this.currentCharIndex = 0;
        this.wordCharacters = [];
        this.typedCharacters = [];
        this.isTypingCorrect = true;
        
        if (this.currentIndex >= this.words.length) {
            // Check if we need to repeat the list (only if List Repeat mode is active)
            if (this.activeRepeatMode === 'list' && this.currentListRound < this.listRepeatCount) {
                this.currentListRound++;
                this.currentIndex = 0;
                console.log(`Starting list round ${this.currentListRound}/${this.listRepeatCount}`);
            } else {
                this.completeGame();
                return;
            }
        }
        
        this.displayCurrentWord();
        this.updateProgress();
        this.updateNavigationButtons();
        this.clearInput();
        this.focusInput();
        
        // Automatically pronounce the new word (respect before-typing toggle)
        if (this.autoPronounceBefore) {
            setTimeout(() => {
                this.speakCurrentWord();
            }, 500);
        }
    }
    
    completeWord() {
        const currentWord = this.words[this.currentIndex];
        
        // Mark as completed
        this.completedWords.add(currentWord);
        
        // Play pronunciation
        if (this.autoPronounceAfter) {
            this.playPronunciation(currentWord);
        }
        
        // Check word repeat (only if Word Repeat mode is active)
        if (this.activeRepeatMode === 'word' && this.currentWordRepeat < this.wordRepeatCount) {
            this.currentWordRepeat++;
            console.log(`Repeating word ${this.currentWordRepeat}/${this.wordRepeatCount} times`);
            // Reset for same word - including character-by-character typing state
            this.typedInput = '';
            this.currentCharIndex = 0;
            this.wordCharacters = [];
            this.typedCharacters = [];
            this.isTypingCorrect = true;
            this.clearInput();
            this.focusInput();
            this.displayCurrentWord(); // Re-display the word to show gray characters
        } else {
            // Move to next word after delay
            setTimeout(() => {
                this.nextWord();
            }, 1000);
            // Reset word repeat counter
            this.currentWordRepeat = 1;
        }
    }
}

// Add shake animation to CSS
const style = document.createElement('style');
style.textContent = `
    @keyframes shake {
        0%, 100% { transform: translateX(0); }
        25% { transform: translateX(-5px); }
        75% { transform: translateX(5px); }
    }
`;
document.head.appendChild(style);

// Initialize the game
let typingGame;

document.addEventListener('DOMContentLoaded', () => {
    typingGame = new VocabKillerTypingGame();
}); 