// VocabKiller Learn All Unique Words Typing Game
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

        // Initialize translation manager
        if (typeof SubpageTranslationManager !== 'undefined') {
            this.translationManager = new SubpageTranslationManager();
            console.log('Learn All Unique Words: Translation manager initialized');
        } else {
            console.warn('Learn All Unique Words: SubpageTranslationManager not available');
        }

        // Typing mode settings
        this.typingMode = 'original'; // 'original' or 'baseform'
        this.originalWords = []; // Store original words
        this.baseFormWords = []; // Store base form words

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

        // Initialize floating unique words list
        this.initializeFloatingUniqueWordsList();

        // Load base form settings
        this.loadBaseFormSettings();

        // Load typing mode settings
        this.loadTypingModeSettings();
    }

    loadWordsFromSession() {
        const savedData = sessionStorage.getItem('homepageState');
        console.log('loadWordsFromSession called');
        console.log('savedData:', savedData);

        if (savedData) {
            try {
                const data = JSON.parse(savedData);
                this.words = data.uniqueWords || [];
                console.log(`Loaded ${this.words.length} unique words for typing game`);
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
                    console.log('No unique words found, using default test word');
                }
                
                // Store original words for typing mode switching
                this.originalWords = [...this.words];
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

            // Update floating unique words list
            this.updateFloatingUniqueWordsList();


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

                // Update floating unique words list when translations are available
                this.updateFloatingUniqueWordsList();

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
            // Use new translation manager with cache support
            if (this.translationManager) {
                return await this.translationManager.translateWord(word);
            }
            
            // Fallback to unified translation service
            if (!this.unifiedTranslationService) {
                this.unifiedTranslationService = new UnifiedTranslationService();
            }
            
            const result = await this.unifiedTranslationService.translateVocabulary(word, targetLanguage);
            return result.translation;
        } catch (error) {
            console.error('Translation error:', error);
            return `[Translation failed: ${word}]`;
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

    // Floating Unique Words List Functions
    initializeFloatingUniqueWordsList() {
        this.uniqueWordsTranslationsVisible = false;
        this.uniqueWordsListCollapsed = false;
        this.baseFormEnabled = false;
        this.updateFloatingUniqueWordsList();

        // Add intro animation
        const floatingList = document.getElementById('floatingUniqueWordsList');
        if (floatingList) {
            floatingList.classList.add('floating-list-intro');
            // Remove animation class after animation completes
            setTimeout(() => {
                floatingList.classList.remove('floating-list-intro');
            }, 1000);
        }

        // Initialize click-outside collapse functionality
        this.initializeClickOutsideCollapse();

        // Initialize draggable functionality
        setTimeout(() => {
            this.initializeDraggable();
        }, 100); // Small delay to ensure DOM is ready
    }

    updateFloatingUniqueWordsList() {
        const listContainer = document.getElementById('uniqueWordsList');
        const countContainer = document.getElementById('uniqueWordsCount');
        if (!listContainer || !countContainer) return;

        const words = this.words || [];

        // Update word count
        countContainer.innerHTML = `
            <div class="word-count">${words.length} unique word${words.length !== 1 ? 's' : ''}</div>
        `;

        if (words.length === 0) {
            listContainer.innerHTML = '<div class="text-gray-500 text-center py-8">No unique words available</div>';
            return;
        }

        // Get saved data
        const baseForms = JSON.parse(localStorage.getItem('vocabKillerBaseForms') || '{}');
        const customTranslations = JSON.parse(localStorage.getItem('vocabKillerCustomTranslations') || '{}');

        // Create word elements
        const wordElements = [];
        for (const word of words) {
            const translation = customTranslations[word] || this.translations[word] || '';
            const baseForm = baseForms[word] || '';

            const wordElement = `
                <div class="unique-word-item" data-word="${word}">
                    <div class="word-info">
                        <div class="word-line">
                            <span class="unique-word-text" onclick="typingGame.toggleBaseFormInput('${word}')" style="cursor: pointer;">${word}</span>
                            ${this.baseFormEnabled ? `
                                <span class="base-form-display ${baseForm ? '' : 'hidden'}" onclick="event.stopPropagation(); typingGame.toggleBaseFormInput('${word}')" style="cursor: pointer;">     ${baseForm || ''}</span>
                                <button class="edit-base-form-btn ${baseForm ? '' : 'hidden'}" onclick="event.stopPropagation(); typingGame.reEditBaseForm('${word}')" title="Edit base form">
                                    <img src="/images/Edit.svg" alt="Edit" />
                                </button>
                            ` : ''}
                        </div>
                        ${this.baseFormEnabled ? `
                            <div class="base-form-input-container ${baseForm ? 'hidden' : ''}">
                                <input type="text" class="base-form-input" 
                                       placeholder="Enter base form..." 
                                       value="${baseForm}"
                                       onkeypress="if(event.key==='Enter') typingGame.saveBaseForm('${word}', event)"
                                       onblur="typingGame.cancelBaseForm('${word}', event)">
                                <button type="button" class="icon-btn" onclick="typingGame.saveBaseForm('${word}', event)" title="Save">
                                    <img src="/images/tick.svg" alt="Save" />
                                </button>
                                <button type="button" class="icon-btn" onclick="typingGame.cancelBaseForm('${word}', event)" title="Cancel">
                                    <img src="/images/close.svg" alt="Cancel" />
                                </button>
                            </div>
                        ` : ''}
                        ${translation && this.uniqueWordsTranslationsVisible ? `
                            <div style="display: flex; align-items: center; gap: 4px; margin-top: 4px;">
                                <span class="translation-text" style="flex: 1;">${translation}</span>
                                <button class="edit-translation-btn" onclick="typingGame.editTranslation('${word}', event)" title="Edit translation">
                                    <img src="/images/Edit.svg" alt="Edit" />
                                </button>
                            </div>
                        ` : ''}
                    </div>
                    <div class="word-actions">
                        <button class="speak-word-btn" onclick="typingGame.speakUniqueWord('${word}')" title="Speak word">
                            <img src="/images/ReadText.svg" alt="Speak" />
                        </button>
                        <button class="remove-word-btn" onclick="typingGame.removeWordFromList('${word}')" title="Remove from list">
                            <img src="/images/Remove.svg" alt="Remove" />
                        </button>
                    </div>
                </div>
            `;

            wordElements.push(wordElement);
        }

        listContainer.innerHTML = wordElements.join('');
    }

    toggleUniqueWordsTranslations() {
        this.uniqueWordsTranslationsVisible = !this.uniqueWordsTranslationsVisible;

        // Update translation status
        const statusElement = document.getElementById('uniqueWordsTranslationStatus');
        if (statusElement) {
            statusElement.textContent = this.uniqueWordsTranslationsVisible ? 'Hide' : 'Show';
        }

        // Update the list to show/hide translations
        this.updateFloatingUniqueWordsList();
    }

    initializeClickOutsideCollapse() {
        const floatingList = document.getElementById('floatingUniqueWordsList');
        if (!floatingList) return;

        // Add click outside listener to document
        document.addEventListener('click', (e) => {
            // Check if click is outside the floating list
            if (!floatingList.contains(e.target) && !this.uniqueWordsListCollapsed) {
                this.collapseUniqueWordsList();
            }
        });

        // Add double-click listener to the Notes icon for expanding
        const header = floatingList.querySelector('.unique-words-header');
        if (header) {
            header.addEventListener('dblclick', (e) => {
                if (this.uniqueWordsListCollapsed) {
                    this.expandUniqueWordsList();
                    e.stopPropagation();
                }
            });
        }

        // Prevent clicks inside the list from bubbling up
        floatingList.addEventListener('click', (e) => {
            e.stopPropagation();
        });
    }

    collapseUniqueWordsList() {
        this.uniqueWordsListCollapsed = true;
        const floatingList = document.getElementById('floatingUniqueWordsList');
        
        if (floatingList) {
            floatingList.classList.add('collapsed');
        }
    }

    expandUniqueWordsList() {
        this.uniqueWordsListCollapsed = false;
        const floatingList = document.getElementById('floatingUniqueWordsList');
        
        if (floatingList) {
            floatingList.classList.remove('collapsed');
        }
    }

    toggleUniqueWordsList() {
        if (this.uniqueWordsListCollapsed) {
            this.expandUniqueWordsList();
        } else {
            this.collapseUniqueWordsList();
        }
    }

    speakUniqueWord(word) {
        if (word) {
            // Get base form if it exists
            const baseForms = JSON.parse(localStorage.getItem('vocabKillerBaseForms') || '{}');
            const baseForm = baseForms[word];
            
            // Speak original word first
            this.playPronunciation(word);
            
            // If base form exists and is different from original, speak it after a delay
            if (baseForm && baseForm !== word) {
                setTimeout(() => {
                    this.playPronunciation(baseForm);
                }, 1500); // 1.5 second delay between pronunciations
            }
        }
    }

    // Base Form Functionality
    toggleBaseForm() {
        this.baseFormEnabled = !this.baseFormEnabled;
        localStorage.setItem('vocabKillerBaseFormEnabled', this.baseFormEnabled);
        
        // Show/hide AI button based on base form state
        const aiContainer = document.getElementById('aiBaseFormButtonContainer');
        if (aiContainer) {
            aiContainer.style.display = this.baseFormEnabled ? 'block' : 'none';
        }
        
        // Hint is always visible
        const hint = document.getElementById('baseFormHint');
        if (hint) {
            hint.style.display = 'block'; // Always show the hint
        }
        
        // Update the toggle button appearance
        this.updateBaseFormToggleAppearance();
        
        // Update the word list display
        this.updateFloatingUniqueWordsList();
    }

    loadBaseFormSettings() {
        const saved = localStorage.getItem('vocabKillerBaseFormEnabled');
        this.baseFormEnabled = saved === 'true';
        
        // Show/hide AI button based on base form state
        const aiContainer = document.getElementById('aiBaseFormButtonContainer');
        if (aiContainer) {
            aiContainer.style.display = this.baseFormEnabled ? 'block' : 'none';
        }
        
        // Hint is always visible
        const hint = document.getElementById('baseFormHint');
        if (hint) {
            hint.style.display = 'block'; // Always show the hint
        }
        
        // Update the toggle button appearance
        this.updateBaseFormToggleAppearance();
    }
    
    updateBaseFormToggleAppearance() {
        const toggleBtn = document.querySelector('.base-form-toggle-btn');
        
        if (toggleBtn) {
            if (this.baseFormEnabled) {
                toggleBtn.classList.add('enabled');
            } else {
                toggleBtn.classList.remove('enabled');
            }
        }
    }

    // Typing Mode Functionality
    loadTypingModeSettings() {
        const saved = localStorage.getItem('vocabKillerTypingMode');
        this.typingMode = saved || 'original';
        
        // Update button appearance
        this.updateTypingModeButtons();
        
        // Prepare words for current mode
        this.prepareTypingWords();
    }

    setTypingMode(mode) {
        this.typingMode = mode;
        localStorage.setItem('vocabKillerTypingMode', mode);
        
        // Update button appearance
        this.updateTypingModeButtons();
        
        // Prepare words for new mode
        this.prepareTypingWords();
        
        // Restart the game with new words
        this.restartGame();
        
        // Show feedback message
        const modeText = mode === 'original' ? 'Original Words' : 'Base Form';
        this.showCustomMessage(`Switched to ${modeText} Typing Mode`);
    }

    updateTypingModeButtons() {
        const originalBtn = document.getElementById('originalModeBtn');
        const baseFormBtn = document.getElementById('baseFormModeBtn');
        
        if (originalBtn && baseFormBtn) {
            // Remove active class from both
            originalBtn.classList.remove('active');
            baseFormBtn.classList.remove('active');
            
            // Add active class to current mode
            if (this.typingMode === 'original') {
                originalBtn.classList.add('active');
            } else {
                baseFormBtn.classList.add('active');
            }
        }
    }

    prepareTypingWords() {
        if (!this.words || this.words.length === 0) return;
        
        // Store original words
        this.originalWords = [...this.words];
        
        if (this.typingMode === 'baseform') {
            // Get base forms from localStorage
            const baseForms = JSON.parse(localStorage.getItem('vocabKillerBaseForms') || '{}');
            
            // Create base form words array
            this.baseFormWords = this.words.map(word => {
                const baseForm = baseForms[word];
                return baseForm || word; // Use base form if exists, otherwise use original
            });
            
            // Update the words array used by the typing game
            this.words = [...this.baseFormWords];
        } else {
            // Use original words
            this.words = [...this.originalWords];
        }
        
        // Reset game state
        this.currentIndex = 0;
        this.completedWords.clear();
        
        // Update display
        this.displayCurrentWord();
        this.updateProgress();
        this.updateNavigationButtons();
    }

    toggleBaseFormInput(word) {
        if (!this.baseFormEnabled) return;

        const wordElement = document.querySelector(`[data-word="${word}"]`);
        if (!wordElement) return;

        const baseFormDisplay = wordElement.querySelector('.base-form-display');
        const baseFormContainer = wordElement.querySelector('.base-form-input-container');
        const editBtn = wordElement.querySelector('.edit-base-form-btn');

        if (baseFormContainer && baseFormDisplay) {
            const isHidden = baseFormContainer.classList.contains('hidden');

            if (isHidden) {
                // Show input, hide display
                baseFormContainer.classList.remove('hidden');
                baseFormDisplay.classList.add('hidden');
                if (editBtn) editBtn.classList.add('hidden');

                // Focus the input
                const input = baseFormContainer.querySelector('.base-form-input');
                if (input) {
                    input.focus();
                    input.select();
                }
            } else {
                // Hide input, show display
                baseFormContainer.classList.add('hidden');
                baseFormDisplay.classList.remove('hidden');
                if (editBtn) editBtn.classList.remove('hidden');
            }
        }
    }

    saveBaseForm(word, event) {
        if (event) {
            event.preventDefault();
            event.stopPropagation();
        }

        const wordElement = document.querySelector(`[data-word="${word}"]`);
        if (!wordElement) return;

        const input = wordElement.querySelector('.base-form-input');
        const baseFormDisplay = wordElement.querySelector('.base-form-display');
        const baseFormContainer = wordElement.querySelector('.base-form-input-container');
        const editBtn = wordElement.querySelector('.edit-base-form-btn');

        if (!input || !baseFormDisplay || !baseFormContainer) return;

        const baseForm = input.value.trim();

        if (baseForm) {
            // Save to localStorage (even if same as original word)
            const baseForms = JSON.parse(localStorage.getItem('vocabKillerBaseForms') || '{}');
            baseForms[word] = baseForm;
            localStorage.setItem('vocabKillerBaseForms', JSON.stringify(baseForms));

            // Update display by refreshing the entire list
            this.updateFloatingUniqueWordsList();

            // If in base form typing mode, refresh the typing words
            if (this.typingMode === 'baseform') {
                this.prepareTypingWords();
                this.displayCurrentWord();
            }

            this.showCustomMessage(`Base form saved: ${word} → ${baseForm}`);
        } else {
            // Cancel if empty
            this.cancelBaseForm(word);
        }
    }

    cancelBaseForm(word, event) {
        if (event) {
            event.preventDefault();
            event.stopPropagation();
        }

        const wordElement = document.querySelector(`[data-word="${word}"]`);
        if (!wordElement) return;

        const baseFormDisplay = wordElement.querySelector('.base-form-display');
        const baseFormContainer = wordElement.querySelector('.base-form-input-container');
        const editBtn = wordElement.querySelector('.edit-base-form-btn');

        if (baseFormDisplay && baseFormContainer) {
            baseFormContainer.classList.add('hidden');

            // Check if there's a saved base form
            const baseForms = JSON.parse(localStorage.getItem('vocabKillerBaseForms') || '{}');
            if (baseForms[word]) {
                baseFormDisplay.classList.remove('hidden');
                if (editBtn) editBtn.classList.remove('hidden');
            } else {
                baseFormDisplay.classList.add('hidden');
                if (editBtn) editBtn.classList.add('hidden');
            }
        }
    }

    reEditBaseForm(word) {
        if (!this.baseFormEnabled) return;

        const wordElement = document.querySelector(`[data-word="${word}"]`);
        if (!wordElement) return;

        const baseFormDisplay = wordElement.querySelector('.base-form-display');
        const baseFormContainer = wordElement.querySelector('.base-form-input-container');
        const editBtn = wordElement.querySelector('.edit-base-form-btn');
        const input = wordElement.querySelector('.base-form-input');

        if (baseFormDisplay && baseFormContainer && input) {
            // Set input value to current base form
            input.value = baseFormDisplay.textContent;

            // Show input, hide display
            baseFormContainer.classList.remove('hidden');
            baseFormDisplay.classList.add('hidden');
            if (editBtn) editBtn.classList.add('hidden');

            // Focus and select
            input.focus();
            input.select();
        }
    }

    // Word Management
    removeWordFromList(word) {
        if (!this.words.includes(word)) return;

        const wordElement = document.querySelector(`[data-word="${word}"]`);
        if (wordElement) {
            // Animate the removal
            wordElement.classList.add('removing-word');
            setTimeout(() => {
                // Remove from words array
                this.words = this.words.filter(w => w !== word);

                // Remove from base forms if exists
                const baseForms = JSON.parse(localStorage.getItem('vocabKillerBaseForms') || '{}');
                if (baseForms[word]) {
                    delete baseForms[word];
                    localStorage.setItem('vocabKillerBaseForms', JSON.stringify(baseForms));
                }

                // Remove from custom translations if exists
                const customTranslations = JSON.parse(localStorage.getItem('vocabKillerCustomTranslations') || '{}');
                if (customTranslations[word]) {
                    delete customTranslations[word];
                    localStorage.setItem('vocabKillerCustomTranslations', JSON.stringify(customTranslations));
                }

                // Update the display
                this.updateFloatingUniqueWordsList();
                this.showCustomMessage(`Removed "${word}" from list`);
            }, 300);
        }
    }

    // Translation Editing
    editTranslation(word, event) {
        if (event) {
            event.preventDefault();
            event.stopPropagation();
        }

        const wordElement = document.querySelector(`[data-word="${word}"]`);
        if (!wordElement) return;

        const translationText = wordElement.querySelector('.translation-text');
        const editBtn = wordElement.querySelector('.edit-translation-btn');

        if (!translationText || !editBtn) return;

        // Get current translation
        const currentTranslation = translationText.textContent;

        // Replace with input
        translationText.innerHTML = `
            <div style="display:flex; align-items:center; gap:4px;">
                <input type="text" value="${currentTranslation.replace(/"/g, '&quot;')}" 
                       class="translation-edit-input" 
                       onkeypress="if(event.key==='Enter') typingGame.saveTranslationEdit('${word}', event)"
                       onblur="typingGame.saveTranslationEdit('${word}', event)">
                <button type="button" class="icon-btn" onclick="typingGame.saveTranslationEdit('${word}', event)" 
                        title="Save">
                    <img src="/images/tick.svg" alt="Save" style="width: 12px; height: 12px;" />
                </button>
            </div>
        `;

        // Hide edit button
        editBtn.style.display = 'none';

        // Focus input
        const input = translationText.querySelector('.translation-edit-input');
        if (input) {
            input.focus();
            input.select();
        }
    }

    saveTranslationEdit(word, event) {
        if (event) {
            event.preventDefault();
            event.stopPropagation();
        }

        const wordElement = document.querySelector(`[data-word="${word}"]`);
        if (!wordElement) return;

        const translationText = wordElement.querySelector('.translation-text');
        const editBtn = wordElement.querySelector('.edit-translation-btn');
        const input = translationText?.querySelector('.translation-edit-input');

        if (!translationText || !editBtn || !input) return;

        const newTranslation = input.value.trim();

        if (newTranslation) {
            // Save custom translation
            const customTranslations = JSON.parse(localStorage.getItem('vocabKillerCustomTranslations') || '{}');
            customTranslations[word] = newTranslation;
            localStorage.setItem('vocabKillerCustomTranslations', JSON.stringify(customTranslations));

            // Update display
            translationText.textContent = newTranslation;
            editBtn.style.display = '';

            this.showCustomMessage(`Translation updated for "${word}"`);
        } else {
            // Cancel if empty
            this.cancelTranslationEdit(word);
        }
    }

    cancelTranslationEdit(word) {
        const wordElement = document.querySelector(`[data-word="${word}"]`);
        if (!wordElement) return;

        const translationText = wordElement.querySelector('.translation-text');
        const editBtn = wordElement.querySelector('.edit-translation-btn');

        if (!translationText || !editBtn) return;

        // Restore original translation
        const originalTranslation = this.translations[word] || '';
        translationText.textContent = originalTranslation;
        editBtn.style.display = '';
    }

    // Custom Message Display
    showCustomMessage(message) {
        const messageElement = document.getElementById('customMessage');
        const messageText = document.getElementById('messageText');

        if (messageElement && messageText) {
            messageText.textContent = message;
            messageElement.classList.remove('hidden');

            // Auto-hide after 3 seconds
            setTimeout(() => {
                this.hideCustomMessage();
            }, 3000);
        }
    }

    hideCustomMessage() {
        const messageElement = document.getElementById('customMessage');
        if (messageElement) {
            messageElement.classList.add('hidden');
        }
    }

    // AI Base Form Functionality
    openAiBaseFormModal() {
        // Show hint first if not hidden forever
        const hintHidden = localStorage.getItem('vocabKillerAiHintHidden');
        if (hintHidden !== 'forever') {
            this.showAiHintPopup();
        } else {
            this.showAiBaseFormModal();
        }
    }

    showAiHintPopup() {
        const hintMessage = `
            <div style="text-align: left; line-height: 1.5;">
                <strong>Convert to Base Form Using Your Own AI</strong><br><br>
                1) Click "Copy Prompt + Words" and paste into your own AI.<br>
                2) Copy AI's response from your own AI<br>
                3) Paste into "Paste AI Results"<br>
                4) Click "Preview & Validate" and then click "Apply to List"
            </div>
        `;

        // Create temporary popup
        const popup = document.createElement('div');
        popup.className = 'ai-hint-popup';

        const popupContent = document.createElement('div');
        popupContent.className = 'ai-hint-popup-content';
        popupContent.innerHTML = hintMessage;

        const buttonContainer = document.createElement('div');
        buttonContainer.style.cssText = 'margin-top: 20px; display: flex; gap: 10px; justify-content: flex-end;';

        const gotItBtn = document.createElement('button');
        gotItBtn.className = 'apply-translation-btn';
        gotItBtn.textContent = 'Got it';
        gotItBtn.onclick = () => this.closeAiHintPopup(false);

        const dontShowBtn = document.createElement('button');
        dontShowBtn.className = 'apply-translation-btn btn-invert';
        dontShowBtn.textContent = "Don't show again";
        dontShowBtn.onclick = () => this.closeAiHintPopup(true);

        buttonContainer.appendChild(gotItBtn);
        buttonContainer.appendChild(dontShowBtn);
        popupContent.appendChild(buttonContainer);
        popup.appendChild(popupContent);

        document.body.appendChild(popup);

        // Store reference for cleanup
        this.currentAiHintPopup = popup;
    }

    closeAiHintPopup(hideForever) {
        if (hideForever) {
            localStorage.setItem('vocabKillerAiHintHidden', 'forever');
        }

        if (this.currentAiHintPopup) {
            document.body.removeChild(this.currentAiHintPopup);
            this.currentAiHintPopup = null;
        }

        // Show the actual modal
        this.showAiBaseFormModal();
    }

    showAiBaseFormModal() {
        const modal = document.getElementById('aiBaseFormModal');

        if (modal) {
            modal.classList.remove('hidden');

            // Populate words display
            this.refreshAiWordsDisplay();
        }
    }

    closeAiBaseFormModal() {
        const modal = document.getElementById('aiBaseFormModal');
        if (modal) {
            modal.classList.add('hidden');
        }
    }

    hideAiHintOnce() {
        const hint = document.getElementById('aiHintModal');
        if (hint) {
            hint.style.display = 'none';
        }
    }

    hideAiHintForever() {
        localStorage.setItem('vocabKillerAiHintHidden', 'forever');
        this.hideAiHintOnce();
    }

    showAiTab(tab) {
        const copyTab = document.getElementById('aiTabCopy');
        const pasteTab = document.getElementById('aiTabPaste');
        const copyBtn = document.getElementById('aiTabCopyBtn');
        const pasteBtn = document.getElementById('aiTabPasteBtn');

        if (tab === 'copy') {
            copyTab.style.display = 'block';
            pasteTab.style.display = 'none';
            copyBtn.classList.remove('btn-invert');
            pasteBtn.classList.add('btn-invert');
        } else {
            copyTab.style.display = 'none';
            pasteTab.style.display = 'block';
            copyBtn.classList.add('btn-invert');
            pasteBtn.classList.remove('btn-invert');
        }
    }

    refreshAiWordsDisplay() {
        const display = document.getElementById('aiWordsDisplay');
        const copyBtn = document.getElementById('copyPromptBtn');

        if (!display) return;

        const words = this.words || [];

        if (words.length === 0) {
            display.innerHTML = '<div style="color: #666; text-align: center; padding: 20px;">No unique words available</div>';
            if (copyBtn) copyBtn.disabled = true;
            return;
        }

        // Display words
        display.innerHTML = words.map(word => `<span style="display: inline-block; margin: 2px 4px; padding: 2px 6px; background: #f0f0f0; border-radius: 3px;">${word}</span>`).join('');

        if (copyBtn) copyBtn.disabled = false;
    }

    copyPromptAndWords() {
        const words = this.words || [];

        if (words.length === 0) {
            this.showCustomMessage('No words to process');
            return;
        }

        const prompt = `Please convert the following English words to their base forms (lemmas). Return the result as a JSON object where each key is the original word and the value is its base form. If a word is already in its base form, use the same word as the value.

Words: ${words.join(', ')}

Example format:
{
  "running": "run",
  "better": "good",
  "children": "child",
  "run": "run"
}`;

        // Copy to clipboard
        navigator.clipboard.writeText(prompt).then(() => {
            this.showCustomMessage('Prompt and words copied to clipboard!');
        }).catch(err => {
            console.error('Failed to copy:', err);
            this.showCustomMessage('Failed to copy to clipboard');
        });
    }

    previewAiResults() {
        const input = document.getElementById('aiResultsInput');
        const preview = document.getElementById('aiPreviewArea');
        const applyBtn = document.getElementById('applyAiBtn');

        if (!input || !preview) return;

        const text = input.value.trim();

        if (!text) {
            preview.innerHTML = '<div style="color: #666;">No input to preview</div>';
            if (applyBtn) applyBtn.disabled = true;
            return;
        }

        try {
            const parsed = this.parseAiResults(text);

            if (Object.keys(parsed).length === 0) {
                preview.innerHTML = '<div style="color: #f56565;">No valid word mappings found</div>';
                if (applyBtn) applyBtn.disabled = true;
                return;
            }

            // Show preview
            const previewItems = Object.entries(parsed).map(([word, base]) =>
                `<div style="display: flex; justify-content: space-between; padding: 2px 0; border-bottom: 1px solid #eee;">
                    <span>${word}</span>
                    <span style="color: #666;">→</span>
                    <span style="font-weight: 500;">${base}</span>
                </div>`
            ).join('');

            preview.innerHTML = `
                <div style="margin-bottom: 8px; font-weight: 500;">Preview (${Object.keys(parsed).length} mappings):</div>
                ${previewItems}
            `;

            if (applyBtn) applyBtn.disabled = false;

        } catch (error) {
            preview.innerHTML = `<div style="color: #f56565;">Error parsing results: ${error.message}</div>`;
            if (applyBtn) applyBtn.disabled = true;
        }
    }

    parseAiResults(text) {
        const results = {};

        try {
            // Try JSON parsing first
            const json = JSON.parse(text);

            if (Array.isArray(json)) {
                // Handle array format: [["word", "base"], ...]
                json.forEach(item => {
                    if (Array.isArray(item) && item.length >= 2) {
                        results[item[0]] = item[1];
                    }
                });
            } else if (typeof json === 'object') {
                // Handle object format: {"word": "base", ...}
                Object.assign(results, json);
            }
        } catch (e) {
            // Try line-by-line parsing
            const lines = text.split('\n');

            lines.forEach(line => {
                line = line.trim();
                if (!line) return;

                // Try different formats
                let match = line.match(/^["']?([^"':]+)["']?\s*[:=]\s*["']?([^"']+)["']?$/);
                if (match) {
                    results[match[1].trim()] = match[2].trim();
                }
            });
        }

        return results;
    }

    applyAiBaseForms() {
        const input = document.getElementById('aiResultsInput');

        if (!input) return;

        const text = input.value.trim();

        if (!text) {
            this.showCustomMessage('No AI results to apply');
            return;
        }

        try {
            const parsed = this.parseAiResults(text);

            if (Object.keys(parsed).length === 0) {
                this.showCustomMessage('No valid mappings found');
                return;
            }

            // Apply to localStorage
            const baseForms = JSON.parse(localStorage.getItem('vocabKillerBaseForms') || '{}');
            let appliedCount = 0;

            Object.entries(parsed).forEach(([word, base]) => {
                if (this.words.includes(word) && base) {
                    baseForms[word] = base;
                    appliedCount++;
                }
            });

            localStorage.setItem('vocabKillerBaseForms', JSON.stringify(baseForms));

            // Update display
            this.updateFloatingUniqueWordsList();

            // Close modal
            this.closeAiBaseFormModal();

            this.showCustomMessage(`Applied ${appliedCount} base form mappings`);

        } catch (error) {
            this.showCustomMessage(`Error applying results: ${error.message}`);
        }
    }

    // Draggable Functionality
    initializeDraggable() {
        const floatingList = document.getElementById('floatingUniqueWordsList');
        const header = floatingList?.querySelector('.unique-words-header');

        if (!floatingList || !header) return;

        // Dragging state
        this.isDragging = false;
        this.dragOffset = { x: 0, y: 0 };
        this.currentPosition = { x: 0, y: 0 };

        // Load saved position
        this.loadFloatingListPosition();

        // Mouse events on header
        header.addEventListener('mousedown', (e) => this.startDrag(e));
        header.addEventListener('dblclick', () => this.resetFloatingListPosition());

        // Also allow dragging the entire collapsed element
        floatingList.addEventListener('mousedown', (e) => {
            if (this.uniqueWordsListCollapsed && e.target === floatingList) {
                this.startDrag(e);
            }
        });

        document.addEventListener('mousemove', (e) => this.drag(e));
        document.addEventListener('mouseup', () => this.endDrag());

        // Touch events for mobile
        header.addEventListener('touchstart', (e) => this.startDrag(e), { passive: false });
        floatingList.addEventListener('touchstart', (e) => {
            if (this.uniqueWordsListCollapsed && e.target === floatingList) {
                this.startDrag(e);
            }
        }, { passive: false });

        document.addEventListener('touchmove', (e) => this.drag(e), { passive: false });
        document.addEventListener('touchend', () => this.endDrag());

        // Window resize handler
        window.addEventListener('resize', () => this.validatePosition());

        // Escape key handler
        document.addEventListener('keydown', (e) => this.handleEscapeKey(e));

        // Resize observer for width changes
        if (window.ResizeObserver) {
            this.resizeObserver = new ResizeObserver(() => {
                if (!this.isDragging) {
                    this.saveFloatingListPosition();
                }
            });
            this.resizeObserver.observe(floatingList);
        }
    }

    startDrag(e) {
        // Allow dragging in both expanded and collapsed states

        // Don't start drag if clicking on buttons or interactive elements
        if (e.target.closest('button') || e.target.closest('select') || e.target.closest('input')) {
            return;
        }

        e.preventDefault();
        this.isDragging = true;

        const floatingList = document.getElementById('floatingUniqueWordsList');
        const header = floatingList?.querySelector('.unique-words-header');

        if (!floatingList || !header) return;

        // Add dragging classes
        floatingList.classList.add('dragging');
        header.classList.add('dragging');

        // Get current position
        const rect = floatingList.getBoundingClientRect();
        this.currentPosition = { x: rect.left, y: rect.top };

        // Calculate offset from mouse/touch to element
        const clientX = e.type.includes('touch') ? e.touches[0].clientX : e.clientX;
        const clientY = e.type.includes('touch') ? e.touches[0].clientY : e.clientY;

        this.dragOffset = {
            x: clientX - this.currentPosition.x,
            y: clientY - this.currentPosition.y
        };

        // Prevent text selection and scrolling
        document.body.style.userSelect = 'none';
        document.body.style.webkitUserSelect = 'none';
        document.body.style.overflow = 'hidden'; // Prevent scrolling during drag
    }

    drag(e) {
        if (!this.isDragging) return;

        e.preventDefault();

        const floatingList = document.getElementById('floatingUniqueWordsList');
        if (!floatingList) return;

        // Get mouse/touch position
        const clientX = e.type.includes('touch') ? e.touches[0].clientX : e.clientX;
        const clientY = e.type.includes('touch') ? e.touches[0].clientY : e.clientY;

        // Calculate new position
        let newX = clientX - this.dragOffset.x;
        let newY = clientY - this.dragOffset.y;

        // Apply boundary constraints
        const constraints = this.getBoundaryConstraints(floatingList);
        newX = Math.max(constraints.minX, Math.min(constraints.maxX, newX));
        newY = Math.max(constraints.minY, Math.min(constraints.maxY, newY));

        // Update position
        this.currentPosition = { x: newX, y: newY };
        floatingList.style.left = newX + 'px';
        floatingList.style.top = newY + 'px';
        floatingList.style.right = 'auto'; // Override right positioning
    }

    endDrag() {
        if (!this.isDragging) return;

        this.isDragging = false;

        const floatingList = document.getElementById('floatingUniqueWordsList');
        const header = floatingList?.querySelector('.unique-words-header');

        if (floatingList && header) {
            // Remove dragging classes
            floatingList.classList.remove('dragging');
            header.classList.remove('dragging');
        }

        // Restore text selection and scrolling
        document.body.style.userSelect = '';
        document.body.style.webkitUserSelect = '';
        document.body.style.overflow = '';

        // Save position
        this.saveFloatingListPosition();
    }

    getBoundaryConstraints(element) {
        const rect = element.getBoundingClientRect();
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;

        return {
            minX: 0,
            minY: 0,
            maxX: viewportWidth - rect.width,
            maxY: viewportHeight - rect.height
        };
    }

    saveFloatingListPosition() {
        const floatingList = document.getElementById('floatingUniqueWordsList');
        const position = {
            x: this.currentPosition.x,
            y: this.currentPosition.y,
            width: floatingList ? floatingList.offsetWidth : 280,
            height: floatingList ? floatingList.offsetHeight : 'auto',
            timestamp: Date.now()
        };
        localStorage.setItem('vocabKillerFloatingListPosition', JSON.stringify(position));
    }

    loadFloatingListPosition() {
        try {
            const saved = localStorage.getItem('vocabKillerFloatingListPosition');
            if (!saved) return;

            const position = JSON.parse(saved);
            const floatingList = document.getElementById('floatingUniqueWordsList');

            if (!floatingList || !position) return;

            // Validate position is still within viewport
            const constraints = this.getBoundaryConstraints(floatingList);
            const validX = Math.max(constraints.minX, Math.min(constraints.maxX, position.x));
            const validY = Math.max(constraints.minY, Math.min(constraints.maxY, position.y));

            // Apply position and width
            this.currentPosition = { x: validX, y: validY };
            floatingList.style.left = validX + 'px';
            floatingList.style.top = validY + 'px';
            floatingList.style.right = 'auto';

            // Restore width and height if saved
            if (position.width && position.width >= 200 && position.width <= 500) {
                floatingList.style.width = position.width + 'px';
            }
            if (position.height && position.height >= 200 && position.height <= 600) {
                floatingList.style.height = position.height + 'px';
            }

        } catch (error) {
            console.error('Error loading floating list position:', error);
        }
    }

    validatePosition() {
        const floatingList = document.getElementById('floatingUniqueWordsList');
        if (!floatingList) return;

        // Get current position
        const rect = floatingList.getBoundingClientRect();
        this.currentPosition = { x: rect.left, y: rect.top };

        // Apply boundary constraints
        const constraints = this.getBoundaryConstraints(floatingList);
        const validX = Math.max(constraints.minX, Math.min(constraints.maxX, this.currentPosition.x));
        const validY = Math.max(constraints.minY, Math.min(constraints.maxY, this.currentPosition.y));

        // Update position if needed
        if (validX !== this.currentPosition.x || validY !== this.currentPosition.y) {
            this.currentPosition = { x: validX, y: validY };
            floatingList.style.left = validX + 'px';
            floatingList.style.top = validY + 'px';
            floatingList.style.right = 'auto';
            this.saveFloatingListPosition();
        }
    }

    // Reset floating list to default position
    resetFloatingListPosition() {
        const floatingList = document.getElementById('floatingUniqueWordsList');
        if (!floatingList) return;

        // Reset to default position (top-right)
        floatingList.style.left = 'auto';
        floatingList.style.right = '20px';
        floatingList.style.top = '20px';

        // Clear saved position
        localStorage.removeItem('vocabKillerFloatingListPosition');

        // Update current position
        const rect = floatingList.getBoundingClientRect();
        this.currentPosition = { x: rect.left, y: rect.top };
    }

    // Handle escape key to cancel dragging
    handleEscapeKey(e) {
        if (e.key === 'Escape' && this.isDragging) {
            this.endDrag();
            // Reset to last saved position
            this.loadFloatingListPosition();
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