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

    async getWordTranslation(word, targetLang = 'zh') {
        try {
            // Check cache first for faster response
            const cacheKey = `${word}_${targetLang}`;
            if (this.popupTranslationCache.has(cacheKey)) {
                return this.popupTranslationCache.get(cacheKey);
            }
            
            // Use Lingva Translate API for consistency and speed
            const translation = await this.translateText(word, 'en', targetLang);
            
            // Cache the result
            if (translation) {
                this.popupTranslationCache.set(cacheKey, translation);
                this.manageCacheSize(); // Manage cache size
            }
            
            return translation;
        } catch (error) {
            console.error('Word translation error:', error);
            return null;
        }
    }

    async translateText(text, fromLang = 'en', toLang = 'zh') {
        try {
            // Handle special language codes for the API
            let apiLangCode = toLang;
            if (toLang === 'zh-tw') {
                apiLangCode = 'zh_TW'; // Traditional Chinese
            } else if (toLang === 'zh') {
                apiLangCode = 'zh'; // Simplified Chinese
            }
            
            // Primary: Using Lingva Translate with timeout
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 second timeout
            
            try {
                const response = await fetch(
                    `https://lingva.ml/api/v1/${fromLang}/${apiLangCode}/${encodeURIComponent(text)}`,
                    { signal: controller.signal }
                );
                
                clearTimeout(timeoutId);
                
                if (response.ok) {
                    const data = await response.json();
                    return data.translation || `[Translation unavailable: ${text}]`;
                } else {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
            } catch (fetchError) {
                clearTimeout(timeoutId);
                if (fetchError.name === 'AbortError') {
                    throw new Error('Translation timeout');
                }
                throw fetchError;
                }
            } catch (error) {
            console.error('Lingva Translate error:', error);
            // Fallback to Google Translate
            try {
                return await this.translateWithFallback(text, fromLang, toLang);
            } catch (fallbackError) {
                console.error('Fallback translation error:', fallbackError);
                return `[Translation failed: ${text}]`;
            }
        }
    }

    // Fallback translation using Google Translate
    async translateWithFallback(text, fromLang = 'en', toLang = 'zh') {
        try {
            // Using Google Translate directly as fallback
            const response = await fetch(
                `${this.googleTranslateUrl}?client=gtx&sl=${fromLang}&tl=${toLang === 'zh-tw' ? 'zh-TW' : toLang}&dt=t&q=${encodeURIComponent(text)}`
            );
            
            if (response.ok) {
                const data = await response.json();
                return data[0][0][0] || `[Fallback translation unavailable: ${text}]`;
            } else {
                throw new Error(`Fallback HTTP error! status: ${response.status}`);
            }
        } catch (error) {
            console.error('Google Translate fallback error:', error);
            return `[Translation unavailable: ${text}]`;
        }
    }
}

// Context-Based Vocabulary Practice
class ContextBasedVocabularyPractice {
    constructor() {
        this.originalText = '';
        this.unknownWords = [];
        this.filteredSegments = [];
        this.showParagraphs = false;
        this.processedText = '';
        this.placeholderMap = new Map();
        this.currentWordIndex = 0;
        this.currentOccurrenceIndex = 0;
        

        
        // Translation toggle states
        this.wordHintTranslation = true;
        this.sentenceTranslation = true;
        this.gapFillTranslation = true;
        
        // Initialize preference properties
        this.currentFont = localStorage.getItem('vocabKillerFont') || '\'Adobe Garamond Pro\', serif';
        this.currentFontSize = parseInt(localStorage.getItem('vocabKillerFontSize')) || 14;
        this.wordFontSize = parseInt(localStorage.getItem('vocabKillerWordFontSize')) || 48;
        this.typingFontSize = parseInt(localStorage.getItem('vocabKillerTypingFontSize')) || 24;
        this.translationLanguage = localStorage.getItem('vocabKillerTranslationLanguage') || 'zh';
        this.currentVoice = localStorage.getItem('vocabKillerVoice') || '';
        this.speechRate = parseFloat(localStorage.getItem('vocabKillerSpeechSpeed')) || 1.0;
        this.dictationMode = localStorage.getItem('vocabKillerDictationMode') === 'true';
        this.autoPronounceBefore = true; // default ON
        this.autoPronounceAfter = true;  // default ON
        this.autoPronounceSentence = false; // default OFF
        this.lastPronouncedWord = null; // Track last pronounced word to avoid duplicates
        this.lastPronouncedWordInUpdate = null; // Track last word pronounced in updateWordInfo
        this.lastReadSentenceWord = null; // Track last word whose sentence was read
        this.listRepeatCount = parseInt(localStorage.getItem('vocabKillerListRepeatCount')) || 1;
        this.wordRepeatCount = parseInt(localStorage.getItem('vocabKillerWordRepeatCount')) || 1;
        this.autoAdvance = localStorage.getItem('vocabKillerAutoAdvance') !== 'false'; // Default to true
        
        // Initialize Dictionary Service for superior translation
        this.dictionaryService = new DictionaryService();
        
        // Initialize sound manager if available
        if (typeof SoundManager !== 'undefined') {
            this.soundManager = new SoundManager();
            console.log('Context Practice: Sound manager initialized');
        } else {
            console.warn('Context Practice: SoundManager not available');
        }
        
        this.initialize();
    }
    
        initialize() {
        console.log('Context Practice: initialize called');
        
        try {
            // Simple test to see if JavaScript is working
            const wordDisplay = document.getElementById('currentWord');
            if (wordDisplay) {
                wordDisplay.innerHTML = '<div style="text-align: center; padding: 20px;"><h3>Context Practice Loading...</h3><p>Initializing...</p></div>';
            }
            
            // Initialize sound manager
            if (this.soundManager) {
                this.soundManager.loadSettings();
            }
            
            // Initialize Dictionary Service
            const targetLanguage = document.getElementById('translationLanguageSelect')?.value || 'zh';
            this.dictionaryService.preTranslateCommonWords(targetLanguage);
            
            // Load saved preferences
        this.loadPreferences();
        this.loadAutoPronouncePreferences();
            
            // Update UI elements with saved preferences
            this.updateUIWithPreferences();
            
            this.loadDataFromSession();
        } catch (error) {
            console.error('Context Practice: Initialization error:', error);
            const wordDisplay = document.getElementById('currentWord');
            if (wordDisplay) {
                wordDisplay.innerHTML = `<div style="text-align: center; padding: 20px; color: red;">
                    <h3>Initialization Error</h3>
                    <p>${error.message}</p>
                </div>`;
            }
        }
    }
    
    updateUIWithPreferences() {
        // Update font and size
        document.body.style.fontFamily = this.currentFont;
        document.body.style.fontSize = this.currentFontSize + 'px';
        
        // Set CSS custom properties for preference fonts
        document.documentElement.style.setProperty('--preference-font', this.currentFont);
        document.documentElement.style.setProperty('--preference-font-size', this.currentFontSize + 'px');
        
        // Apply font to all text elements
        this.updateFont(this.currentFont);
        
        // Apply specific font sizes to their target elements
        this.updateFontSize(this.currentFontSize);
        this.updateWordFontSize(this.wordFontSize);
        this.updateTypingAreaFontSize(this.typingFontSize);
        
        // Update dictation button state
        const dictationBtn = document.querySelector('.dictation-btn');
        if (dictationBtn) {
                if (this.dictationMode) {
                dictationBtn.classList.add('active');
                    } else {
                dictationBtn.classList.remove('active');
            }
        }
        
        // Update repeat badges
        const listRepeatBadge = document.getElementById('listRepeatBadge');
        if (listRepeatBadge) {
            listRepeatBadge.textContent = this.listRepeatCount;
        }
        
        const wordRepeatBadge = document.getElementById('wordRepeatBadge');
        if (wordRepeatBadge) {
            wordRepeatBadge.textContent = this.wordRepeatCount;
        }
    }
    
    loadDataFromSession() {
        console.log('Context Practice: loadDataFromSession called');
        
        const contextPracticeData = sessionStorage.getItem('contextPracticeData');
        console.log('contextPracticeData:', contextPracticeData);
        
        if (contextPracticeData) {
            try {
                const data = JSON.parse(contextPracticeData);
                console.log('Parsed data:', data);
                
                this.originalText = data.text || '';
                this.unknownWords = data.unknownWords || [];
                this.filteredSegments = data.filteredSegments || [];
                this.showParagraphs = data.showParagraphs || false;
                
                console.log('Loaded data:', {
                    originalText: this.originalText,
                    unknownWords: this.unknownWords,
                    filteredSegments: this.filteredSegments,
                    showParagraphs: this.showParagraphs
                });
                
                this.processTextForContextPractice();
                
            } catch (error) {
                console.error('Error parsing contextPracticeData:', error);
                this.showError('Failed to load data from session storage');
            }
        } else {
            console.log('No contextPracticeData found in sessionStorage');
            this.showError('No data found. Please go back to "Learn Sentences with Unique Words" and add words to the Unknown Word List first.');
        }
    }
    
    processTextForContextPractice() {
        console.log('Context Practice: processTextForContextPractice called');
        
        if (this.unknownWords.length === 0) {
            this.showError('No unknown words found. Please add words to the Unknown Word List first.');
            return;
        }
        
        this.createTextWithPlaceholders();
        this.displayProcessedText();
    }
    
    createTextWithPlaceholders() {
        console.log('Context Practice: createTextWithPlaceholders called');
        
        let textToProcess = this.originalText;
        if (this.filteredSegments && this.filteredSegments.length > 0) {
            textToProcess = this.filteredSegments.join('\n\n');
        }
        
        // Normalize apostrophes in unknown words
        this.unknownWords = this.unknownWords.map(word => this.normalizeApostrophes(word));
        
        // Normalize apostrophes in text to process
        textToProcess = this.normalizeApostrophes(textToProcess);
        
        console.log('Text to process:', textToProcess);
        console.log('Unknown words (normalized):', this.unknownWords);
        console.log('Unknown words details:', this.unknownWords.map((word, index) => ({
            index,
            word,
            length: word.length,
            hasApostrophe: word.includes("'"),
            hasChineseApostrophe: word.includes("＇"),
            escaped: this.escapeRegex(word)
        })));
        
        // Store original sentences before processing
        const originalSentences = textToProcess.split(/(?<=[.!?])\s+/).filter(sentence => {
            if (!sentence.trim()) return false;
            // Skip sentences that are already in Chinese
            const isChineseSentence = /[\u4e00-\u9fff]/.test(sentence.trim());
            return !isChineseSentence;
        });
        this.originalSentences = originalSentences;
        
        this.processedText = textToProcess;
        this.placeholderMap.clear();
        
        // Track all word occurrences with unique indices
        this.wordOccurrences = [];
        let occurrenceIndex = 0;
        
        // Replace unknown words with character-by-character placeholders
        this.unknownWords.forEach((word, wordIndex) => {
            // Use a more robust regex that handles both English and Chinese apostrophes
            const escapedWord = this.escapeRegex(word);
            // Create regex that matches both apostrophe types
            const apostropheRegex = escapedWord.replace(/['＇]/g, "['＇]");
            const regex = new RegExp(`\\b${apostropheRegex}\\b`, 'gi');
            
            // Find all occurrences of this word
            let match;
            while ((match = regex.exec(textToProcess)) !== null) {
                const placeholder = this.createCharacterBlanks(word, occurrenceIndex, wordIndex);
                
                console.log(`Found occurrence ${occurrenceIndex} of word: "${word}" at position ${match.index}`);
                
                // Store occurrence info
                this.wordOccurrences.push({
                    occurrenceIndex: occurrenceIndex,
                    wordIndex: wordIndex,
                    word: word,
                    position: match.index
                });
                
                // Replace this specific occurrence
                const beforeMatch = textToProcess.substring(0, match.index);
                const afterMatch = textToProcess.substring(match.index + match[0].length);
                textToProcess = beforeMatch + placeholder + afterMatch;
                
                // Update regex lastIndex to continue searching
                regex.lastIndex = match.index + placeholder.length;
                
                occurrenceIndex++;
            }
            
            this.placeholderMap.set(wordIndex, word);
            console.log(`Replaced all occurrences of "${word}" with character blanks`);
        });
        
        this.processedText = textToProcess;
        
        // Split into sentences and wrap each in a paragraph with its own translation
        const sentences = this.processedText.split(/(?<=[.!?])\s+/);
        this.processedText = sentences.map((sentence, index) => {
            if (!sentence.trim()) return '';
            
            // Skip sentences that are already in Chinese (like "錢德勒：(唱歌) 我會緊緊抱住你。")
            const isChineseSentence = /[\u4e00-\u9fff]/.test(sentence.trim());
            if (isChineseSentence) {
                return ''; // Don't display Chinese sentences at all
            }
            
            return `<div class="sentence-paragraph">
                <div class="sentence-content">${sentence.trim()}</div>
                <div class="sentence-translation" data-target="sentence" data-sentence-index="${index}">[Sentence ${index + 1} translation]</div>
            </div>`;
        }).filter(Boolean).join('');
        
        console.log('Final processed text with character blanks:', this.processedText);
        console.log('Placeholder map:', this.placeholderMap);
        console.log('Original sentences for translation:', this.originalSentences);
    }
    
    createCharacterBlanks(word, occurrenceIndex, wordIndex) {
        const chars = [];
        for (let i = 0; i < word.length; i++) {
            chars.push(`<span 
                class="char-blank" 
                contenteditable="true" 
                data-index="${i}" 
                data-word="${word.toLowerCase()}"
                data-word-index="${wordIndex}"
                data-occurrence-index="${occurrenceIndex}"
                maxlength="1"
                ></span>`);
        }
        
        // Create a container for the word and its translation positioned under the blanks
        const wordContainer = `<div class="word-blank-container" data-word-index="${wordIndex}" data-occurrence-index="${occurrenceIndex}">
            <div class="char-blanks-wrapper">${chars.join('')}</div>
            <div class="gap-fill-translation" data-target="gap-fill" data-word="${word}" data-word-index="${wordIndex}" data-occurrence-index="${occurrenceIndex}">[${word}]</div>
        </div>`;
        
        return wordContainer;
    }
    
    escapeRegex(string) {
        // Handle apostrophes specially for contractions - don't escape them
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }
    
    normalizeApostrophes(text) {
        // Convert Chinese apostrophes (＇) to English apostrophes (')
        return text.replace(/＇/g, "'");
    }
    
    displayProcessedText() {
        console.log('Context Practice: displayProcessedText called');
        
        const container = document.getElementById('originalTextContainer');
        if (!container) {
            console.error('originalTextContainer not found');
            return;
        }
        
        // Display the interactive text with sentence structure
        const interactiveHtml = `<div class="text-content">
            ${this.processedText}
        </div>`;
        
        console.log('Interactive HTML:', interactiveHtml);
        container.innerHTML = interactiveHtml;
        
        // Update word display area
        const wordDisplay = document.getElementById('currentWord');
        if (wordDisplay) {
            wordDisplay.innerHTML = `<div style="text-align: center; padding: 20px;">
            </div>`;
        }
        
        // Setup interactive placeholders
        this.setupInteractivePlaceholders();
            this.updateProgress();
        this.updateWordInfo();
        
        // Setup translation controls
        this.setupTranslationControls();
        this.setupAutoAdvanceToggle();
        
        // Populate translations after text is displayed
        this.populateTranslations();
        
        // Auto-pronounce sentence if enabled
        if (this.autoPronounceSentence && this.originalText) {
            setTimeout(() => {
                this.playSentencePronunciation(this.originalText);
            }, 500); // Small delay to ensure everything is loaded
        }
    }
    
    setupInteractivePlaceholders() {
        console.log('Context Practice: setupInteractivePlaceholders called');
        
        // Add event listeners for all character blanks
        const charBlanks = document.querySelectorAll('.char-blank');
        console.log('Found character blanks:', charBlanks.length);
        
        // Global input handler for character blanks
        document.addEventListener('input', (e) => {
            const el = e.target;
            if (!el.classList.contains('char-blank')) return;

            const value = el.textContent.trim();
            const wrapper = el.closest('.char-blanks-wrapper');
            const siblings = Array.from(wrapper.children);
            const index = siblings.indexOf(el);

            // Keep only first character
            if (value.length > 0) {
                el.textContent = value[0];
                
                // Play typing sound if enabled
                if (this.soundManager && this.soundManager.enabled) {
                    console.log('Context Practice: Playing typing sound');
                    this.soundManager.playTypingSound();
                }
            }

            // Auto-focus next blank if current is filled AND correct
            if (value && index < siblings.length - 1) {
                const wordIndex = el.getAttribute('data-word-index');
                if (wordIndex !== null) {
                    const word = this.unknownWords[wordIndex];
                    const wordCharacters = word.split('');
                    const currentChar = value[0];
                    const correctChar = wordCharacters[index];
                    
                    // Only advance if current character is correct
                    if (currentChar.toLowerCase() === correctChar.toLowerCase()) {
                        const next = siblings[index + 1];
                        if (next.classList.contains('char-blank') && !next.textContent.trim()) {
                            next.focus();
                        }
                    }
                }
            }

            // Update current occurrence index based on focused element
            const occurrenceIndex = el.getAttribute('data-occurrence-index');
            if (occurrenceIndex !== null) {
                this.currentOccurrenceIndex = parseInt(occurrenceIndex);
                const occurrence = this.wordOccurrences[this.currentOccurrenceIndex];
                if (occurrence) {
                    this.currentWordIndex = occurrence.wordIndex;
                    this.updateWordInfo();
                    
                    // Update character validation for this occurrence
                    this.updateCharacterValidation(wrapper, occurrence.wordIndex);
                }
            }

            // Check if whole word is complete
            this.checkWordCompletion(el);
        });
        
        // Global keydown handler for backspace navigation
        document.addEventListener('keydown', (e) => {
            const el = e.target;
            if (!el.classList.contains('char-blank')) return;

            const wrapper = el.closest('.char-blanks-wrapper');
            const siblings = Array.from(wrapper.children);
            const index = siblings.indexOf(el);

            if (e.key === 'Backspace') {
                if (!el.textContent && index > 0) {
                    // If current blank is empty, go to previous and clear it
                    e.preventDefault();
                    const prev = siblings[index - 1];
                    prev.focus();
                    prev.textContent = '';
                    
                    // Update character validation
                    const occurrenceIndex = el.getAttribute('data-occurrence-index');
                    if (occurrenceIndex !== null) {
                        const occurrence = this.wordOccurrences[parseInt(occurrenceIndex)];
                        if (occurrence) {
                            this.updateCharacterValidation(wrapper, occurrence.wordIndex);
                        }
                    }
                } else if (el.textContent) {
                    // If current blank has content, clear it
                    el.textContent = '';
                    
                    // Update character validation
                    const occurrenceIndex = el.getAttribute('data-occurrence-index');
                    if (occurrenceIndex !== null) {
                        const occurrence = this.wordOccurrences[parseInt(occurrenceIndex)];
                        if (occurrence) {
                            this.updateCharacterValidation(wrapper, occurrence.wordIndex);
                        }
                    }
                }
            }
            
            // Prevent line breaks
            if (e.key === 'Enter') {
                e.preventDefault();
            }
        });
        
        // Global focus handler to update word info when clicking on different blanks
        document.addEventListener('focusin', (e) => {
            const el = e.target;
            if (el.classList.contains('char-blank')) {
                const occurrenceIndex = el.getAttribute('data-occurrence-index');
                if (occurrenceIndex !== null) {
                    this.currentOccurrenceIndex = parseInt(occurrenceIndex);
                    const occurrence = this.wordOccurrences[this.currentOccurrenceIndex];
                    if (occurrence) {
                        this.currentWordIndex = occurrence.wordIndex;
                        this.updateWordInfo();
                        
                        // Auto-pronounce before if enabled and this is a new word
                        if (this.autoPronounceBefore && occurrence.word !== this.lastPronouncedWord) {
                            this.playPronunciation(occurrence.word);
                            this.lastPronouncedWord = occurrence.word;
                        }
                        
                        // Auto-read sentence if enabled and this is a new word
                        if (this.autoPronounceSentence && occurrence.word !== this.lastReadSentenceWord) {
                            setTimeout(() => {
                                this.playSentencePronunciation(this.originalText);
                            }, 200);
                            this.lastReadSentenceWord = occurrence.word;
                        }
                    }
                }
            }
        });
        
        // Focus on first character blank
        if (charBlanks.length > 0) {
        setTimeout(() => {
                charBlanks[0].focus();
                // Update word info for first occurrence
                const occurrenceIndex = charBlanks[0].getAttribute('data-occurrence-index');
                if (occurrenceIndex !== null) {
                    this.currentOccurrenceIndex = parseInt(occurrenceIndex);
                    const occurrence = this.wordOccurrences[this.currentOccurrenceIndex];
                    if (occurrence) {
                        this.currentWordIndex = occurrence.wordIndex;
                        this.updateWordInfo();
                    }
                }
            }, 100);
        }
        
        // Setup sound event listeners
        this.setupSoundEventListeners();
    }
    
    updateCharacterValidation(wrapper, wordIndex) {
        const word = this.unknownWords[wordIndex];
        if (!word) return;
        
        const wordCharacters = word.split('');
        const blanks = Array.from(wrapper.children)
            .filter(span => span.classList.contains('char-blank') && 
                           span.getAttribute('data-word-index') === wordIndex.toString());
        
        // Update each character blank with appropriate styling
        blanks.forEach((blank, index) => {
            const typedChar = blank.textContent.trim();
            const correctChar = wordCharacters[index];
            
            // Remove existing character classes
            blank.classList.remove('correct', 'incorrect');
            
            if (typedChar) {
                if (typedChar.toLowerCase() === correctChar.toLowerCase()) {
                    // Correct character
                    blank.classList.add('correct');
        } else {
                    // Wrong character
                    blank.classList.add('incorrect');
                }
            }
        });
    }
    

    

    
    checkWordCompletion(currentSpan) {
        const word = currentSpan.getAttribute('data-word');
        const occurrenceIndex = currentSpan.getAttribute('data-occurrence-index');
        const wrapper = currentSpan.closest('.char-blanks-wrapper');
        const blanks = Array.from(wrapper.children)
            .filter(span => span.classList.contains('char-blank') && 
                           span.getAttribute('data-occurrence-index') === occurrenceIndex);

        const typed = blanks.map(span => span.textContent || '').join('').toLowerCase();

        if (typed.length === word.length) {
            if (typed === word) {
                blanks.forEach(span => {
                    span.classList.add('correct');
                    span.contentEditable = 'false';
                });
                console.log('Occurrence completed correctly:', word, '(occurrence index:', occurrenceIndex, ')');
                
                // Auto-pronounce after if enabled
                if (this.autoPronounceAfter) {
                    this.playPronunciation(word);
                }
                
                // Auto-advance to next occurrence after a short delay (if enabled)
                if (this.autoAdvance) {
                    setTimeout(() => {
                        this.advanceToNextWord();
                    }, 500); // 500ms delay for user to see the completion
                    }
                } else {
                blanks.forEach(span => {
                    span.classList.add('incorrect');
                });
                console.log('Occurrence incorrect:', typed, 'vs', word);
            }
            
            this.updateProgress();
        }
    }
    
    advanceToNextWord() {
        // Find the next incomplete occurrence
        const nextOccurrenceIndex = this.findNextIncompleteWord();
        
        if (nextOccurrenceIndex !== -1) {
            // Update current occurrence index
            this.currentOccurrenceIndex = nextOccurrenceIndex;
            const occurrence = this.wordOccurrences[nextOccurrenceIndex];
            this.currentWordIndex = occurrence.wordIndex;
            this.updateWordInfo();
            
            // Focus on the first character blank of the next occurrence
            this.focusOnNextWord(nextOccurrenceIndex);
            
            // Add a brief visual feedback
            this.showAdvanceFeedback(nextOccurrenceIndex);
            
            // Auto-pronounce sentence if enabled when advancing to new context
            if (this.autoPronounceSentence && this.originalText) {
                setTimeout(() => {
                    this.playSentencePronunciation(this.originalText);
                }, 300); // Small delay after visual feedback
            }
            
            console.log(`Advanced to next occurrence: ${occurrence.word} (occurrence index: ${nextOccurrenceIndex}, word index: ${occurrence.wordIndex})`);
        } else {
            console.log('No more incomplete occurrences found');
        }
    }
    
    findNextIncompleteWord() {
        // Look for the next occurrence that hasn't been completed
        for (let i = this.currentOccurrenceIndex + 1; i < this.wordOccurrences.length; i++) {
            const wordContainer = document.querySelector(`[data-occurrence-index="${i}"]`);
            if (wordContainer) {
                const blanks = wordContainer.querySelectorAll('.char-blank');
                const allCorrect = Array.from(blanks).every(blank => 
                    blank.classList.contains('correct') && blank.textContent.trim()
                );
                
                if (!allCorrect) {
                    return i;
                }
            }
        }
        
        // If no incomplete occurrences found after current, check from beginning
        for (let i = 0; i < this.currentOccurrenceIndex; i++) {
            const wordContainer = document.querySelector(`[data-occurrence-index="${i}"]`);
            if (wordContainer) {
                const blanks = wordContainer.querySelectorAll('.char-blank');
                const allCorrect = Array.from(blanks).every(blank => 
                    blank.classList.contains('correct') && blank.textContent.trim()
                );
                
                if (!allCorrect) {
                    return i;
                }
            }
        }
        
        return -1; // No incomplete occurrences found
    }
    
    focusOnNextWord(occurrenceIndex) {
        // Find the first empty character blank in the next occurrence
        const wordContainer = document.querySelector(`[data-occurrence-index="${occurrenceIndex}"]`);
        if (wordContainer) {
            const blanks = wordContainer.querySelectorAll('.char-blank');
            const firstEmptyBlank = Array.from(blanks).find(blank => 
                !blank.textContent.trim() && !blank.classList.contains('correct')
            );
            
            if (firstEmptyBlank) {
                firstEmptyBlank.focus();
            } else {
                // If all blanks are filled but incorrect, focus on the first one
                if (blanks.length > 0) {
                    blanks[0].focus();
                }
            }
        }
    }
    
    showAdvanceFeedback(occurrenceIndex) {
        // Add a brief flash effect to the new occurrence container
        const wordContainer = document.querySelector(`[data-occurrence-index="${occurrenceIndex}"]`);
        if (wordContainer) {
            // Add a temporary flash class
            wordContainer.classList.add('word-advance-flash');
            
            // Remove the flash class after animation
        setTimeout(() => {
                wordContainer.classList.remove('word-advance-flash');
            }, 300);
        }
    }
    
    updateCurrentWordHighlight() {
        // Remove highlight from all word containers
        const allWordContainers = document.querySelectorAll('.word-blank-container');
        allWordContainers.forEach(container => {
            container.classList.remove('current-word-highlight');
        });
        
        // Add highlight to current occurrence container
        const currentWordContainer = document.querySelector(`[data-occurrence-index="${this.currentOccurrenceIndex}"]`);
        if (currentWordContainer) {
            currentWordContainer.classList.add('current-word-highlight');
        }
    }
    
    setupAutoAdvanceToggle() {
        const autoAdvanceToggle = document.getElementById('autoAdvanceToggle');
        if (autoAdvanceToggle) {
            // Set initial state
            autoAdvanceToggle.checked = this.autoAdvance;
            
            // Add event listener
            autoAdvanceToggle.addEventListener('change', (e) => {
                this.autoAdvance = e.target.checked;
                localStorage.setItem('vocabKillerAutoAdvance', this.autoAdvance.toString());
                console.log(`Auto-advance toggled to: ${this.autoAdvance}`);
            });
        }
    }
    

    
    updateProgress() {
        const progressFill = document.getElementById('progressFill');
        const progressText = document.getElementById('progressText');
        
        // Count completed occurrences (occurrences where ALL character blanks are correct)
        const completedOccurrences = new Set();
        const wordContainers = document.querySelectorAll('.word-blank-container');
        
        wordContainers.forEach(container => {
            const occurrenceIndex = container.getAttribute('data-occurrence-index');
            if (occurrenceIndex !== null) {
                const blanks = container.querySelectorAll('.char-blank');
                const allCorrect = Array.from(blanks).every(blank => 
                    blank.classList.contains('correct') && blank.textContent.trim()
                );
                
                if (allCorrect) {
                    completedOccurrences.add(occurrenceIndex);
                }
            }
        });
        
        const completedCount = completedOccurrences.size;
        const totalOccurrences = this.wordOccurrences.length;
        const progressPercentage = totalOccurrences > 0 ? (completedCount / totalOccurrences) * 100 : 0;
        
        console.log(`Progress: ${completedCount}/${totalOccurrences} occurrences (${progressPercentage}%)`);
        
        if (progressFill && progressText) {
            progressFill.style.width = `${progressPercentage}%`;
            progressText.textContent = `${completedCount}/${totalOccurrences} occurrences`;
        }
        
        // Check if all occurrences are completed
        if (completedCount === totalOccurrences && totalOccurrences > 0) {
            this.showCompletionMessage();
        }
    }
    
        updateWordInfo() {
        const wordDisplay = document.getElementById('currentWordDisplay');
        const translationDisplay = document.getElementById('currentWordTranslation');
        
        if (this.unknownWords.length > 0 && this.currentWordIndex < this.unknownWords.length) {
            const currentWord = this.unknownWords[this.currentWordIndex];
            
            if (wordDisplay) {
                wordDisplay.textContent = currentWord;
            }
            
            if (translationDisplay) {
                // Get real translation for the word using DictionaryService
                const targetLanguage = document.getElementById('translationLanguageSelect')?.value || 'zh';
                this.dictionaryService.getWordTranslation(currentWord, targetLanguage).then(translation => {
                    translationDisplay.textContent = translation || `[${currentWord}]`;
                }).catch(error => {
                    console.error('Translation error:', error);
                    translationDisplay.textContent = `[${currentWord}]`;
                });
            }
            
            // Update visual highlighting for current word
            this.updateCurrentWordHighlight();
            
            // Auto-pronounce before if enabled and this is a new word
            if (this.autoPronounceBefore && currentWord !== this.lastPronouncedWordInUpdate) {
                this.playPronunciation(currentWord);
                this.lastPronouncedWordInUpdate = currentWord;
            }
        } else {
            if (wordDisplay) wordDisplay.textContent = '';
            if (translationDisplay) translationDisplay.textContent = '';
        }
    }
    
    // Translation Control Functions
    setupTranslationControls() {
        console.log('Setting up translation controls...');
        
        // Toggle dropdown visibility
        const translationBtn = document.getElementById('translation-toggle-btn');
        const dropdown = document.getElementById('translation-dropdown');
        
        if (translationBtn && dropdown) {
            translationBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                dropdown.classList.toggle('hidden');
                console.log('Translation dropdown toggled');
            });
            } else {
            console.error('Translation button or dropdown not found');
        }
        
        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (dropdown && translationBtn && !translationBtn.contains(e.target) && !dropdown.contains(e.target)) {
                dropdown.classList.add('hidden');
            }
        });
        
        // Setup toggle switches with debug logging
        this.setupToggle('toggle-word-hint', 'word-hint');
        this.setupToggle('toggle-sentence', 'sentence');
        this.setupToggle('toggle-gap-fill', 'gap-fill');
        
        console.log('Translation controls setup complete');
    }
    
    setupToggle(id, target) {
        const checkbox = document.getElementById(id);
        if (!checkbox) {
            console.error(`Toggle checkbox not found: ${id}`);
            return;
        }
        
        const elements = document.querySelectorAll(`[data-target="${target}"]`);
        console.log(`Found ${elements.length} elements for target: ${target}`);
        
        // Set initial state based on saved preferences
        const savedState = localStorage.getItem(`translation_${id}`);
        if (savedState !== null) {
            checkbox.checked = savedState === 'true';
        }
        
        // Apply initial visibility
        this.updateTranslationVisibility(target, checkbox.checked);
        
        // Update on change
        checkbox.addEventListener('change', (e) => {
            const isChecked = e.target.checked;
            console.log(`Toggle ${id} changed to: ${isChecked}`);
            localStorage.setItem(`translation_${id}`, isChecked.toString());
            this.updateTranslationVisibility(target, isChecked);
        });
    }
    
    updateTranslationVisibility(target, isVisible) {
        const elements = document.querySelectorAll(`[data-target="${target}"]`);
        console.log(`Updating visibility for target "${target}": ${isVisible ? 'show' : 'hide'} (${elements.length} elements)`);
        
        elements.forEach(el => {
            if (target === 'gap-fill') {
                el.style.display = isVisible ? 'inline' : 'none';
        } else {
                el.style.display = isVisible ? 'block' : 'none';
            }
            console.log(`Element ${el.className} display set to: ${el.style.display}`);
        });
    }
    

    
    // Populate all translations with enhanced API workflow
    async populateTranslations() {
        console.log('Populating translations with enhanced API workflow...');
        
        const targetLanguage = document.getElementById('translationLanguageSelect')?.value || 'zh';
        
        // Populate gap-fill translations using DictionaryService
        const gapFillElements = document.querySelectorAll('.gap-fill-translation[data-word]');
        for (const element of gapFillElements) {
            const word = element.getAttribute('data-word');
            if (word && element.textContent === `[${word}]`) {
                try {
                    // Get translation using DictionaryService
                    const translation = await this.dictionaryService.getWordTranslation(word, targetLanguage);
                    element.textContent = translation || `[${word}]`;
                } catch (error) {
                    console.error(`Failed to process gap-fill word "${word}":`, error);
                    element.textContent = `[${word}]`;
                }
            }
        }
        
        // Populate individual sentence translations using original sentences
        const sentenceElements = document.querySelectorAll('.sentence-translation[data-target="sentence"]');
        for (const element of sentenceElements) {
            const sentenceIndex = parseInt(element.getAttribute('data-sentence-index'));
            if (element.textContent.includes('Sentence') && this.originalSentences && this.originalSentences[sentenceIndex]) {
                try {
                    const originalSentenceText = this.originalSentences[sentenceIndex];
                    
                    // Only translate if the sentence contains English text (not just Chinese)
                    const hasEnglishText = /[a-zA-Z]/.test(originalSentenceText);
                    if (hasEnglishText) {
                        const sentenceTranslation = await this.dictionaryService.translateText(originalSentenceText, 'en', targetLanguage);
                        element.textContent = sentenceTranslation || `[Translation error]`;
        } else {
                        // Hide translation element if sentence is already in Chinese
                        element.style.display = 'none';
                    }
                } catch (error) {
                    console.error(`Failed to translate sentence ${sentenceIndex}:`, error);
                    element.textContent = `[Translation error]`;
                }
            }
        }
        
        console.log('Enhanced translation population complete');
    }
    
    showCompletionMessage() {
        console.log('All placeholders completed!');
        
        // Show completion popup
        const completionPopup = document.getElementById('completionPopup');
        if (completionPopup) {
            completionPopup.classList.add('show');
            
            // Apply user preferences to popup elements
            this.applyPreferencesToPopup();
            
            // Set up keyboard listener for Enter key
            this.setupCompletionKeyboard();
            
            // Set up click listener for Play Again button
            this.setupPlayAgainButton();
            
            // Set up click listener for close button
            this.setupCloseButton();
            
            // Focus on the Play Again button
            const playAgainBtn = document.getElementById('playAgainBtn');
            if (playAgainBtn) {
                playAgainBtn.focus();
            }
        }
    }
    
    applyPreferencesToPopup() {
        // Apply font family and font size preferences to popup elements
        const popupContent = document.querySelector('.completion-popup-content');
        const title = document.querySelector('.completion-title');
        const message = document.querySelector('.completion-message');
        const button = document.querySelector('.completion-btn');
        
        if (popupContent) {
            popupContent.style.fontFamily = this.currentFont;
            popupContent.style.fontSize = `${this.currentFontSize}px`;
        }
        
        if (title) {
            title.style.fontFamily = this.currentFont;
            title.style.fontSize = `${this.currentFontSize * 2}px`; // Larger title
        }
        
        if (message) {
            message.style.fontFamily = this.currentFont;
            message.style.fontSize = `${this.currentFontSize * 1.3}px`; // Medium message
        }
        
        if (button) {
            button.style.fontFamily = this.currentFont;
            button.style.fontSize = `${this.currentFontSize * 1.1}px`; // Slightly larger button
        }
    }
    
    setupCompletionKeyboard() {
        // Remove any existing keyboard listener
        document.removeEventListener('keydown', this.completionKeyboardHandler);
        
        // Create new keyboard handler
        this.completionKeyboardHandler = (event) => {
            if (event.key === 'Enter') {
                event.preventDefault();
                this.restartPractice();
            }
        };
        
        // Add keyboard listener
        document.addEventListener('keydown', this.completionKeyboardHandler);
    }
    
    setupPlayAgainButton() {
        // Remove any existing click listener
        const playAgainBtn = document.getElementById('playAgainBtn');
        if (playAgainBtn) {
            // Remove existing onclick attribute and add event listener
            playAgainBtn.removeAttribute('onclick');
            
            // Store the click handler for later removal
            this.playAgainClickHandler = (event) => {
                event.preventDefault();
                console.log('Play Again button clicked');
                this.restartPractice();
            };
            
            playAgainBtn.addEventListener('click', this.playAgainClickHandler);
        }
    }
    
    setupCloseButton() {
        // Set up click listener for close button
        const closeBtn = document.getElementById('closePopupBtn');
        if (closeBtn) {
            // Store the click handler for later removal
            this.closeClickHandler = (event) => {
                event.preventDefault();
                console.log('Close button clicked');
                this.hideCompletionPopup();
            };
            
            closeBtn.addEventListener('click', this.closeClickHandler);
        }
    }
    
    hideCompletionPopup() {
        console.log('Hiding completion popup...');
        
        // Hide completion popup
        const completionPopup = document.getElementById('completionPopup');
        if (completionPopup) {
            completionPopup.classList.remove('show');
        }
        
        // Remove keyboard listener
        if (this.completionKeyboardHandler) {
            document.removeEventListener('keydown', this.completionKeyboardHandler);
            this.completionKeyboardHandler = null;
        }
        
        // Remove click listeners
        const playAgainBtn = document.getElementById('playAgainBtn');
        if (playAgainBtn && this.playAgainClickHandler) {
            playAgainBtn.removeEventListener('click', this.playAgainClickHandler);
        }
        
        const closeBtn = document.getElementById('closePopupBtn');
        if (closeBtn && this.closeClickHandler) {
            closeBtn.removeEventListener('click', this.closeClickHandler);
        }
    }
    
    restartPractice() {
        console.log('Restarting practice...');
        
        // Hide completion popup and clean up listeners
        this.hideCompletionPopup();
        
        // Restart the practice
        this.loadDataFromSession();
    }
    
    showError(message) {
        console.error('Context Practice Error:', message);
        
        const wordDisplay = document.getElementById('currentWord');
        if (wordDisplay) {
            wordDisplay.innerHTML = `<div style="text-align: center; padding: 20px; color: red;">
                <h3>Error</h3>
                <p>${message}</p>
            </div>`;
        }
        
        const container = document.getElementById('originalTextContainer');
        if (container) {
            container.innerHTML = `<div style="text-align: center; padding: 20px; color: red;">
                <p>${message}</p>
            </div>`;
        }
    }
    
    closeSubpage() {
        window.location.href = '/learn-sentences-with-unique-words.html';
    }
    
    // Preference Functions
    togglePreferenceDropdown() {
        const dropdown = document.getElementById('preferenceDropdown');
        dropdown.classList.toggle('show');
        
        // Load current preferences
        this.loadPreferences();
    }
    
    hidePreferenceDropdown() {
        const dropdown = document.getElementById('preferenceDropdown');
        if (dropdown) {
            dropdown.classList.remove('show');
        }
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
        
        // Set initial word info block visibility based on dictation mode
        const wordInfoBlock = document.querySelector('.word-info');
        if (wordInfoBlock) {
            if (this.dictationMode) {
                wordInfoBlock.style.display = 'none'; // Hide info block in dictation mode
            } else {
                wordInfoBlock.style.display = 'block'; // Show info block in normal mode
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
                
                // Fix: Set selectedVoice as the actual SpeechSynthesisVoice object on load
                const voices = speechSynthesis.getVoices();
                this.selectedVoice = voices.find(voice => voice.name === savedVoice) || null;
                
                this.updateVoiceInfo();
            }, 100);
        }
        
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
        
        // Set CSS custom property for preference font
        document.documentElement.style.setProperty('--preference-font', font);
        
        // Update all text elements to ensure font consistency
        const textElements = [
            'currentWord',
            'typingInput', 
            'originalText',
            'progressText',
            'currentWordDisplay',
            'currentWordTranslation',
            'translationStatus'
        ];
        
        textElements.forEach(elementId => {
            const element = document.getElementById(elementId);
            if (element) {
                element.style.fontFamily = font;
            }
        });
        
        // Also apply to all elements with specific classes
        const classSelectors = [
            '.progress-text',
            '.word-info',
            '.word',
            '.translation',
            '.header h1',
            '.nav-word-info',
            '.nav-word',
            '.nav-translation'
        ];
        
        classSelectors.forEach(selector => {
            const elements = document.querySelectorAll(selector);
            elements.forEach(element => {
                element.style.fontFamily = font;
            });
        });
    }
    
    updateFontSize(size) {
        localStorage.setItem('vocabKillerFontSize', size);
        this.currentFontSize = parseInt(size);
        document.body.style.fontSize = size + 'px';
        
        // Set CSS custom property for preference font size
        document.documentElement.style.setProperty('--preference-font-size', size + 'px');
        
        // Apply to UI elements and progress text only
        const uiElements = [
            'progressText',
            'translationStatus'
        ];
        
        uiElements.forEach(elementId => {
            const element = document.getElementById(elementId);
            if (element) {
                element.style.fontSize = size + 'px';
            }
        });
        
        // Apply to UI classes
        const uiClassSelectors = [
            '.header h1',
            '.nav-word-info',
            '.nav-word',
            '.nav-translation',
            '.progress-text'
        ];
        
        uiClassSelectors.forEach(selector => {
            const elements = document.querySelectorAll(selector);
            elements.forEach(element => {
                element.style.fontSize = size + 'px';
            });
        });
    }
    
    updateWordFontSize(size) {
        this.wordFontSize = parseInt(size);
        localStorage.setItem('vocabKillerWordFontSize', size);
        
        console.log('Updating word font size to:', this.wordFontSize + 'px');
        
        // Apply to word info block elements only
        const wordInfoElements = [
            'currentWordDisplay',
            'currentWordTranslation'
        ];
        
        wordInfoElements.forEach(elementId => {
            const element = document.getElementById(elementId);
            if (element) {
                element.style.fontSize = this.wordFontSize + 'px';
                console.log('Applied font size to', elementId + ':', this.wordFontSize + 'px');
            }
        });
        
        // Apply to word info classes
        const wordInfoClassSelectors = [
            '.word-info .word',
            '.word-info .translation'
        ];
        
        wordInfoClassSelectors.forEach(selector => {
            const elements = document.querySelectorAll(selector);
            elements.forEach(element => {
                element.style.fontSize = this.wordFontSize + 'px';
            });
        });
    }
    
    updateTypingAreaFontSize(size) {
        this.typingFontSize = parseInt(size);
        localStorage.setItem('vocabKillerTypingFontSize', size);
        
        console.log('Updating typing area font size to:', this.typingFontSize + 'px');
        
        // Apply to sentence text
        const sentenceElements = document.querySelectorAll('.original-text, .normal-text');
        sentenceElements.forEach(element => {
            element.style.fontSize = this.typingFontSize + 'px';
        });
        
        // Apply to character blanks (placeholders)
        const charBlanks = document.querySelectorAll('.char-blank');
        charBlanks.forEach(blank => {
            blank.style.fontSize = this.typingFontSize + 'px';
        });
        
        console.log('Applied font size to', sentenceElements.length, 'sentence elements and', charBlanks.length, 'character blanks');
        
        // Also apply to typing input if it exists
        const typingInput = document.getElementById('typingInput');
        if (typingInput) {
            typingInput.style.fontSize = this.typingFontSize + 'px';
            console.log('Applied font size to typingInput:', typingInput.style.fontSize);
            // Also adjust padding for larger fonts to maintain good UX
            const padding = Math.max(20, this.typingFontSize * 0.8);
            typingInput.style.padding = padding + 'px';
        }
    }
    
    updateTranslationLanguage(language) {
        localStorage.setItem('vocabKillerTranslationLanguage', language);
        this.translationLanguage = language;
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
        console.log('Available voices:', voices.map(v => `${v.name} (${v.lang})`));
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
                    return (voiceName.includes('google') && 
                           voiceName.includes('uk') && 
                           voiceName.includes('english') &&
                           voiceName.includes('female') &&
                           voice.lang === 'en-GB') ||
                          (voiceName.includes('google') && 
                           voiceName.includes('british') && 
                           voiceName.includes('female') &&
                           voice.lang === 'en-GB') ||
                          (voiceName.includes('google') && 
                           voiceName.includes('en-gb') && 
                           voiceName.includes('female') &&
                           voice.lang === 'en-GB');
                }
                if (allowedName === 'Google UK English Male') {
                    return (voiceName.includes('google') && 
                           voiceName.includes('uk') && 
                           voiceName.includes('english') &&
                           voiceName.includes('male') &&
                           voice.lang === 'en-GB') ||
                          (voiceName.includes('google') && 
                           voiceName.includes('british') && 
                           voiceName.includes('male') &&
                           voice.lang === 'en-GB') ||
                          (voiceName.includes('google') && 
                           voiceName.includes('en-gb') && 
                           voiceName.includes('male') &&
                           voice.lang === 'en-GB');
                }
                
                return false;
            });
        });
        
        // Add filtered voices to select
        console.log('Filtered voices:', filteredVoices.map(v => `${v.name} (${v.lang})`));
        filteredVoices.forEach(voice => {
            const option = document.createElement('option');
            option.value = voice.name;
            option.textContent = voice.name;
            voiceSelect.appendChild(option);
        });
        
        // If no voices found, add a default option
        if (filteredVoices.length === 0) {
            const option = document.createElement('option');
            option.value = '';
            option.textContent = 'No voices available';
            voiceSelect.appendChild(option);
        }
    }
    
    updateVoice(voiceName) {
        localStorage.setItem('vocabKillerVoice', voiceName);
        this.currentVoice = voiceName;
        
        // Fix: Set selectedVoice as the actual SpeechSynthesisVoice object, not just the name
        const voices = speechSynthesis.getVoices();
        this.selectedVoice = voices.find(voice => voice.name === voiceName) || null;
        
        this.updateVoiceInfo();
    }
    
    updateVoiceInfo() {
        const currentVoiceElement = document.getElementById('currentVoice');
        if (currentVoiceElement) {
            currentVoiceElement.textContent = 'Current: ' + (this.currentVoice || 'Default');
        }
    }
    
    testVoice() {
        const voiceSelect = document.getElementById('voiceSelect');
        if (!voiceSelect || !voiceSelect.value) {
            console.log('No voice selected for testing');
            return;
        }
        
        const voices = speechSynthesis.getVoices();
        const selectedVoice = voices.find(voice => voice.name === voiceSelect.value);
        
        if (selectedVoice) {
            const utterance = new SpeechSynthesisUtterance('This is a test of the selected voice.');
            utterance.voice = selectedVoice;
            utterance.rate = this.speechRate || 1.0;
            speechSynthesis.speak(utterance);
        }
    }
    
    updateSpeed(speed) {
        this.speechRate = parseFloat(speed);
        localStorage.setItem('vocabKillerSpeechSpeed', speed);
        
        const speedValue = document.getElementById('speedValue');
        if (speedValue) {
            speedValue.textContent = speed + 'x';
        }
    }
    
    resetSpeed() {
        this.updateSpeed('1.0');
    }
    
    // Sound Settings Functions
    toggleSoundDropdown() {
        const dropdown = document.getElementById('soundDropdown');
        dropdown.classList.toggle('show');
        this.loadSoundSettings();
    }
    
    loadSoundSettings() {
        console.log('Context Practice: Loading sound settings');
        if (!this.soundManager) {
            console.warn('Context Practice: No sound manager available');
            return;
        }

        const settings = this.soundManager.getSettings();
        console.log('Context Practice: Sound settings:', settings);

        // Update checkbox
        const enableCheckbox = document.getElementById('enableTypingSound');
        if (enableCheckbox) {
            enableCheckbox.checked = settings.enabled;
            console.log('Context Practice: Updated checkbox to:', settings.enabled);
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
            this.updateVolumeSliderFill(volumeSlider);
        }

        // Update volume label
        const volumeLabel = document.getElementById('volumeLabel');
        if (volumeLabel) {
            volumeLabel.textContent = settings.volume + '%';
        }
    }
    
    previewSound() {
        console.log('Context Practice: Preview sound called');
        if (this.soundManager) {
            console.log('Context Practice: Playing preview sound');
            this.soundManager.playTypingSound();
        } else {
            console.warn('Context Practice: No sound manager for preview');
        }
    }
    
    resetSoundSettings() {
        if (this.soundManager) {
            this.soundManager.resetToDefaults();
            this.loadSoundSettings();
        }
    }
    
    setupSoundEventListeners() {
        console.log('Context Practice: Setting up sound event listeners');
        
        // Enable/disable checkbox
        const enableCheckbox = document.getElementById('enableTypingSound');
        if (enableCheckbox) {
            enableCheckbox.addEventListener('change', (e) => {
                console.log('Context Practice: Checkbox changed to:', e.target.checked);
                if (this.soundManager) {
                    this.soundManager.setEnabled(e.target.checked);
                }
            });
        }
        
        // Volume slider
        const volumeSlider = document.getElementById('soundVolume');
        if (volumeSlider) {
            this.updateVolumeSliderFill(volumeSlider);
            
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
                soundDropdown.classList.remove('show');
            }
        });
        
        // Click outside to close auto pronounce dropdown
        document.addEventListener('click', (e) => {
            const autopronounceContainer = document.querySelector('.autopronounce-container');
            const dropdown = document.getElementById('autoPronounceDropdown');
            
            if (autopronounceContainer && dropdown && !autopronounceContainer.contains(e.target)) {
                dropdown.style.display = 'none';
            }
        });
        
        // Click outside to close preference dropdown
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.preference-dropdown')) {
                this.hidePreferenceDropdown();
            }
        });
    }
    
    updateVolumeSliderFill(slider) {
        const value = slider.value;
        const max = slider.max;
        const percentage = (value / max) * 100;
        
        // Create linear gradient with black fill
        slider.style.background = `linear-gradient(to right, black 0%, black ${percentage}%, #ddd ${percentage}%, #ddd 100%)`;
    }
    
    // Dictation Mode Functions
    toggleDictationMode() {
        this.dictationMode = !this.dictationMode;
        localStorage.setItem('vocabKillerDictationMode', this.dictationMode);
        
        const dictationBtn = document.querySelector('.dictation-btn');
        if (dictationBtn) {
            if (this.dictationMode) {
                dictationBtn.classList.add('active');
            } else {
                dictationBtn.classList.remove('active');
            }
        }
        
        // Control word info block visibility based on dictation mode
        const wordInfoBlock = document.querySelector('.word-info');
        if (wordInfoBlock) {
            if (this.dictationMode) {
                wordInfoBlock.style.display = 'none'; // Hide info block in dictation mode
            } else {
                wordInfoBlock.style.display = 'block'; // Show info block in normal mode
            }
        }
    }
    
    // Auto Pronounce Functions
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

    setAutoPronounceSentence(enabled) {
        this.autoPronounceSentence = !!enabled;
        sessionStorage.setItem('vocabKillerAutoPronounceSentence', this.autoPronounceSentence.toString());
        this.updateAutoPronounceButtonState();
    }

    loadAutoPronouncePreferences() {
        const savedBefore = sessionStorage.getItem('vocabKillerAutoPronounceBefore');
        const savedAfter = sessionStorage.getItem('vocabKillerAutoPronounceAfter');
        const savedSentence = sessionStorage.getItem('vocabKillerAutoPronounceSentence');
        if (savedBefore !== null) this.autoPronounceBefore = savedBefore === 'true';
        if (savedAfter !== null) this.autoPronounceAfter = savedAfter === 'true';
        if (savedSentence !== null) this.autoPronounceSentence = savedSentence === 'true';
        this.updateAutoPronounceButtonState();

        // Sync custom switches if present
        const switchBefore = document.getElementById('switchBefore');
        const switchAfter = document.getElementById('switchAfter');
        const switchSentence = document.getElementById('switchSentence');
        if (switchBefore) {
            switchBefore.setAttribute('aria-checked', this.autoPronounceBefore ? 'true' : 'false');
            switchBefore.classList.toggle('on', this.autoPronounceBefore);
        }
        if (switchAfter) {
            switchAfter.setAttribute('aria-checked', this.autoPronounceAfter ? 'true' : 'false');
            switchAfter.classList.toggle('on', this.autoPronounceAfter);
        }
        if (switchSentence) {
            switchSentence.setAttribute('aria-checked', this.autoPronounceSentence ? 'true' : 'false');
            switchSentence.classList.toggle('on', this.autoPronounceSentence);
        }
    }

    updateAutoPronounceButtonState() {
        const btn = document.querySelector('.autopronounce-btn');
        if (!btn) return;
        if (this.autoPronounceBefore || this.autoPronounceAfter || this.autoPronounceSentence) {
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
        } else if (which === 'sentence') {
            this.setAutoPronounceSentence(!this.autoPronounceSentence);
            const el = document.getElementById('switchSentence');
            if (el) {
                el.setAttribute('aria-checked', this.autoPronounceSentence ? 'true' : 'false');
                el.classList.toggle('on', this.autoPronounceSentence);
            }
        }
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
            utterance.rate = this.speechRate || 1.0;
            utterance.pitch = 1.0;
            utterance.volume = 1.0;
            
            // Use selected voice if available
            if (this.selectedVoice && this.selectedVoice.name) {
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
    
    playSentencePronunciation(sentence) {
        // Use Web Speech API with user preferences for sentence reading
        if ('speechSynthesis' in window) {
            // Chrome requires user interaction before speech synthesis
            // This is a workaround for Chrome's autoplay policy
            if (speechSynthesis.speaking) {
                speechSynthesis.cancel();
            }
            
            const utterance = new SpeechSynthesisUtterance(sentence);
            utterance.rate = this.speechRate || 1.0;
            utterance.pitch = 1.0;
            utterance.volume = 1.0;
            
            // Use selected voice if available
            if (this.selectedVoice && this.selectedVoice.name) {
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
    
    // List Repeat Functions
    toggleListRepeatDropdown() {
        const dropdown = document.getElementById('listRepeatDropdown');
        dropdown.classList.toggle('show');
    }
    
    selectListRepeatOption(count) {
        this.listRepeatCount = count;
        localStorage.setItem('vocabKillerListRepeatCount', count);
        
        const badge = document.getElementById('listRepeatBadge');
        if (badge) {
            badge.textContent = count;
        }
        
        const dropdown = document.getElementById('listRepeatDropdown');
        if (dropdown) {
            dropdown.classList.remove('show');
        }
    }
    
    // Word Repeat Functions
    toggleWordRepeatDropdown() {
        const dropdown = document.getElementById('wordRepeatDropdown');
        dropdown.classList.toggle('show');
    }
    
    selectWordRepeatOption(count) {
        this.wordRepeatCount = count;
        localStorage.setItem('vocabKillerWordRepeatCount', count);
        
        const badge = document.getElementById('wordRepeatBadge');
        if (badge) {
            badge.textContent = count;
        }
        
        const dropdown = document.getElementById('wordRepeatDropdown');
        if (dropdown) {
            dropdown.classList.remove('show');
        }
    }
}

// Initialize the context practice
var typingGame;

document.addEventListener('DOMContentLoaded', () => {
    console.log('Context Practice: DOM loaded, initializing...');
    try {
        typingGame = new ContextBasedVocabularyPractice();
        console.log('Context Practice: Initialization complete');
            } catch (error) {
        console.error('Context Practice: Initialization error:', error);
        // Show error on page
        const wordDisplay = document.getElementById('currentWord');
        if (wordDisplay) {
            wordDisplay.innerHTML = `<div style="text-align: center; padding: 20px; color: red;">
                <h3>Error Loading Context Practice</h3>
                <p>${error.message}</p>
            </div>`;
        }
    }
}); 