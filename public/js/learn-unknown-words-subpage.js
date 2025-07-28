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

    async getWordDefinition(word, includeLanguageExplanations = true) {
        const cleanWord = word.toLowerCase().trim();
        
        // Check cache first
        if (this.cache.has(cleanWord)) {
            return this.cache.get(cleanWord);
        }

        try {
            // Try Free Dictionary API first
            const dictData = await this.getFreeDictionaryData(cleanWord);
            if (dictData && !dictData.error) {
                // Only add comprehensive language explanations if requested (for main text, not popup)
                if (includeLanguageExplanations) {
                    try {
                        const languageData = await this.createLanguageExplanation(cleanWord, dictData);
                        dictData.languageExplanations = languageData;
                        
                        // Create bilingual content
                        const bilingualContent = this.createBilingualContent(dictData, languageData);
                        dictData.bilingualContent = bilingualContent;
                    } catch (error) {
                        console.error('Language explanation error:', error);
                        // Continue without language explanations if translation fails
                    }
                }
                
                this.cache.set(cleanWord, dictData);
                return dictData;
            }
        } catch (error) {
            console.error('Free Dictionary API error:', error);
        }

        // Fallback to Google Translate only
        try {
            const translation = await this.getWordTranslation(cleanWord);
            const fallbackData = {
                word: cleanWord,
                error: 'Word not found in dictionary',
                translation: translation,
                source: 'google-translate-only'
            };
            
            this.cache.set(cleanWord, fallbackData);
            return fallbackData;
        } catch (error) {
            console.error('Translation error:', error);
            const errorData = { error: 'Translation failed' };
            this.cache.set(cleanWord, errorData);
            return errorData;
        }
    }

    async getFreeDictionaryData(word) {
        const response = await fetch(`${this.baseUrl}/${word}`);
        
        if (response.ok) {
            const data = await response.json();
            return this.processDictionaryResponse(data);
        } else {
            return { error: 'Word not found' };
        }
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

    async translateDefinitionToLanguage(definition, word, targetLang = 'zh') {
        // Include word context for better translation
        const context = `The word "${word}" means: ${definition}`;
        const translation = await this.translateText(context, 'en', targetLang);
        
        // Clean up the translation (remove the context part for Chinese)
        if (targetLang === 'zh' || targetLang === 'zh-tw') {
            if (translation && translation.includes('：')) {
                return translation.split('：')[1] || translation;
            }
        }
        return translation || definition;
    }

    async translateExampleToLanguage(example, word, targetLang = 'zh') {
        // Include word context for better translation
        const context = `Example sentence with "${word}": ${example}`;
        const translation = await this.translateText(context, 'en', targetLang);
        
        // Clean up the translation (remove the context part for Chinese)
        if (targetLang === 'zh' || targetLang === 'zh-tw') {
            if (translation && translation.includes('：')) {
                return translation.split('：')[1] || translation;
            }
        }
        return translation || example;
    }

    async createLanguageExplanation(word, englishData, targetLang = 'zh') {
        const languageData = {
            word: word,
            translatedWord: await this.getWordTranslation(word, targetLang),
            partOfSpeech: {},
            definitions: [],
            examples: []
        };

        // For Chinese, use traditional part of speech mapping
        const partOfSpeechMap = {
            'noun': '名词',
            'verb': '动词',
            'adjective': '形容词',
            'adverb': '副词',
            'pronoun': '代词',
            'preposition': '介词',
            'conjunction': '连词',
            'interjection': '感叹词'
        };

        // Process each meaning
        for (const meaning of englishData.meanings) {
            const translatedPartOfSpeech = targetLang === 'zh' || targetLang === 'zh-tw' 
                ? (partOfSpeechMap[meaning.partOfSpeech] || meaning.partOfSpeech)
                : meaning.partOfSpeech; // Keep English for other languages
            
            // Translate definitions
            for (const def of meaning.definitions) {
                const translatedDefinition = await this.translateDefinitionToLanguage(def.definition, word, targetLang);
                languageData.definitions.push({
                    partOfSpeech: translatedPartOfSpeech,
                    definition: translatedDefinition
                });
            }

            // Translate examples
            for (const def of meaning.definitions) {
                if (def.example) {
                    const translatedExample = await this.translateExampleToLanguage(def.example, word, targetLang);
                    languageData.examples.push(translatedExample);
                }
            }
        }

        return languageData;
    }

    createBilingualContent(englishData, languageData) {
        const bilingualContent = {
            definitions: [],
            examples: []
        };

        // Create bilingual definitions
        if (englishData.meanings && languageData.definitions) {
            let languageIndex = 0;
            
            for (const meaning of englishData.meanings) {
                for (const def of meaning.definitions) {
                    const languageDef = languageData.definitions[languageIndex];
                    
                    bilingualContent.definitions.push({
                        englishPartOfSpeech: meaning.partOfSpeech,
                        translatedPartOfSpeech: languageDef ? languageDef.partOfSpeech : meaning.partOfSpeech,
                        englishDefinition: def.definition,
                        translatedDefinition: languageDef ? languageDef.definition : def.definition
                    });
                    
                    languageIndex++;
                }
            }
        }

        // Create bilingual examples
        if (englishData.meanings && languageData.examples) {
            let languageIndex = 0;
            
            for (const meaning of englishData.meanings) {
                for (const def of meaning.definitions) {
                    if (def.example) {
                        const languageExample = languageData.examples[languageIndex];
                        
                        bilingualContent.examples.push({
                            englishExample: def.example,
                            translatedExample: languageExample || def.example
                        });
                        
                        languageIndex++;
                    }
                }
            }
        }

        return bilingualContent;
    }

    processDictionaryResponse(data) {
        if (!data || data.length === 0) {
            return { error: 'Word not found' };
        }

        const wordData = data[0];
        
        return {
            word: wordData.word,
            phonetic: wordData.phonetic,
            meanings: wordData.meanings.map(meaning => ({
                partOfSpeech: meaning.partOfSpeech,
                definitions: meaning.definitions.map(def => ({
                    definition: def.definition,
                    example: def.example
                }))
            })),
            audioUrl: wordData.phonetics.find(p => p.audio)?.audio
        };
    }

    speakWord(word) {
        const utterance = new SpeechSynthesisUtterance(word);
        utterance.lang = 'en-US';
        utterance.rate = 0.8;
        utterance.pitch = 1;
        
        window.speechSynthesis.speak(utterance);
    }

    async playAudioUrl(audioUrl) {
        if (audioUrl) {
            const audio = new Audio(audioUrl);
            try {
                await audio.play();
            } catch (error) {
                console.error('Audio playback error:', error);
                // Fallback to speech synthesis
                this.speakWord(word);
            }
        } else {
            // Fallback to speech synthesis
            this.speakWord(word);
        }
    }
}

// Unknown Words Learning System
class UnknownWordsLearningSystem {
    constructor() {
        this.originalText = '';
        this.unknownWords = new Set();
        this.dictionaryCache = new Map();
        this.currentPopupWord = null;
        this.dictionaryService = new DictionaryService();
        
        // Enhanced navbar functionality
        this.currentFont = 'Arial';
        this.currentFontSize = '18';
        this.translationLanguage = 'zh';
        this.isPlaying = false;
        this.speechSynthesis = window.speechSynthesis;
        this.speechUtterance = null;
        
        // Translation toggle functionality
        this.showingTranslation = false;
        this.originalContent = '';
        this.translatedContent = '';
        
        // Translation progress and caching
        this.translationProgress = {
            current: 0,
            total: 0,
            isTranslating: false
        };
        this.translatedParagraphs = new Map();
        this.translationCache = new Map();
        
        // Speech controls
        this.availableVoices = [];
        this.selectedVoice = null;
        this.speechSpeed = 1.0;
        this.isSpeaking = false;
        
        // Speech state management for popup integration
        this.mainTextPausedByPopup = false;
        this.pausedMainText = '';
        this.pausedMainTextType = '';
        this.popupUtterance = null;
        

    }

    initialize() {
        this.loadData();
        this.initializePreferences();
        this.renderOriginalText();
        this.setupEventListeners();
        this.updateUnknownWordsList();

        
        // Start pre-translating common words in background
        const targetLanguage = document.getElementById('translationLanguageSelect')?.value || 'zh';
        this.dictionaryService.preTranslateCommonWords(targetLanguage);
        
        // Set widget to expanded state
        const widget = document.getElementById('cambridgeDictionaryWidget');
        if (widget) {
            widget.classList.add('expanded');
            // Update content height after a short delay to ensure DOM is ready
            setTimeout(() => {
                this.updateWidgetContentHeight();
            }, 100);
        }
    }

    loadData() {
        // Load data from sessionStorage - use new homepage state format
        const savedState = sessionStorage.getItem('homepageState');
        if (savedState) {
            const state = JSON.parse(savedState);
            this.originalText = state.originalText || '';
            this.unknownWords = new Set(state.unknownWords || []);
            this.currentFont = state.fontFamily || 'Arial';
            this.currentFontSize = state.fontSize || 18;
            this.translationLanguage = state.targetLanguage || 'zh';
        } else {
            // Fallback to old format
            const savedData = sessionStorage.getItem('unknownWordsData');
            if (savedData) {
                const data = JSON.parse(savedData);
                this.originalText = data.originalText || '';
                this.unknownWords = new Set(data.unknownWords || []);
                this.currentFont = data.fontFamily || 'Arial';
                this.currentFontSize = data.fontSize || 18;
                this.translationLanguage = data.targetLanguage || 'zh';
            }
        }
    }

      renderOriginalText() {
    const container = document.getElementById('originalTextContainer');
    if (!container || !this.originalText) {
      container.innerHTML = '<p class="text-gray-500">No text available</p>';
      return;
    }

    // Split by paragraphs (preserve blank lines)
    const paragraphs = this.originalText.split(/\n/);
    
    const html = paragraphs.map(paragraph => {
      if (paragraph.trim() === '') {
        // Preserve blank paragraphs
        return '<div class="paragraph blank-paragraph"></div>';
      } else {
        // Process words in non-blank paragraphs
        const words = paragraph.split(/\s+/);
        const wordsHtml = words.map(word => {
          const cleanWord = this.cleanWord(word);
          const isUnknown = this.unknownWords.has(cleanWord);
          return `<span class="word ${isUnknown ? 'unknown-word' : ''}" 
                           data-word="${cleanWord}" 
                           onclick="learningSystem.showDictionary(event, '${cleanWord}')">
                    ${word}
                  </span>`;
        }).join(' ');
        return `<div class="paragraph">${wordsHtml}</div>`;
      }
    }).join('');
    
    container.innerHTML = html;
    
    // Store original content for translation toggle
    this.originalContent = html;
  }

    cleanWord(word) {
        return word.toLowerCase().replace(/[^\w]/g, '');
    }

      async showDictionary(event, word) {
    this.currentPopupWord = word;
    
    // Calculate position near the clicked word
    const wordElement = event.target;
    const rect = wordElement.getBoundingClientRect();
    const popupContent = document.getElementById('popupContent');
    
    // Position popup near the word
    let left = rect.left;
    let top = rect.bottom + 5; // 5px below the word
    
    // Apply position first
    popupContent.style.left = left + 'px';
    popupContent.style.top = top + 'px';
    
    this.showPopup();
    await this.loadDictionaryData(word);
    
    // Auto-speak the word
    this.pronounceWord();
    
    // Adjust position after content is loaded
    this.adjustPopupPosition();
  }

      showPopup() {
    const popup = document.getElementById('dictionaryPopup');
    popup.classList.remove('hidden');
    this.initializeSectionStates();
  }

    closePopup() {
        const popup = document.getElementById('dictionaryPopup');
        popup.classList.add('hidden');
        this.currentPopupWord = null;
    }

    async loadDictionaryData(word) {
        this.showLoadingState();
        
        try {
            // Get dictionary data without language explanations for faster popup loading
            const data = await this.dictionaryService.getWordDefinition(word, false);
            
            if (data.error) {
                this.showErrorState(data.error);
                return;
            }
            
            // Display the data first (basic dictionary info) - immediate display
            this.displayDictionaryData(data);
            
            // Show popup immediately with basic info
            this.showPopup();
            
            // Start translation in background if language is set
            const targetLanguage = document.getElementById('translationLanguageSelect').value;
            if (targetLanguage && targetLanguage !== '') {
                // Use setTimeout to make translation non-blocking
                setTimeout(() => {
                    this.translatePopupContent(data, targetLanguage);
                }, 100);
            }
            
        } catch (error) {
            console.error('Dictionary lookup error:', error);
            this.showErrorState('Failed to load dictionary data');
        }
    }

      showLoadingState() {
    document.getElementById('popupWord').textContent = this.currentPopupWord;
    document.getElementById('popupPhonetic').innerHTML = '<div class="loading">Loading...</div>';
    document.getElementById('popupTranslation').innerHTML = '';
    document.getElementById('popupMeanings').innerHTML = '';
    document.getElementById('popupExamples').innerHTML = '';
  }

      displayDictionaryData(data) {
    // Always display word
    document.getElementById('popupWord').textContent = data.word;
    
    // Display translation in user's language
    if (data.translation) {
      const languageName = this.getLanguageName(this.translationLanguage);
      document.getElementById('popupTranslation').innerHTML = 
        `<div class="translation">${data.translation}</div>`;
    } else {
      document.getElementById('popupTranslation').innerHTML = '';
    }
    
    if (data.error && !data.translation) {
      this.showErrorState(data.error);
      return;
    }
    
    // Display phonetic (if available)
    if (data.phonetic) {
      document.getElementById('popupPhonetic').innerHTML = 
        `<div class="phonetic">/${data.phonetic}/</div>`;
    } else {
      document.getElementById('popupPhonetic').innerHTML = '';
    }
    
    // Display bilingual definitions (if available)
    if (data.bilingualContent && data.bilingualContent.definitions.length > 0) {
      this.displayBilingualDefinitions(data.bilingualContent.definitions);
    } else if (data.languageExplanations && data.languageExplanations.definitions.length > 0) {
      // Display language-specific definitions
      const definitionsHtml = data.languageExplanations.definitions.map(def => 
        `<div class="definition">${def.definition}</div>`
      ).join('');
      
      document.getElementById('popupMeanings').innerHTML = `
        <div class="meaning">
          <div class="part-of-speech">${data.languageExplanations.definitions[0].partOfSpeech}</div>
          <div class="definitions">${definitionsHtml}</div>
        </div>
      `;
    } else if (!data.error && data.meanings && data.meanings.length > 0) {
      // Fallback to English-only display
      const meaningsHtml = data.meanings.map(meaning => {
        const definitionsHtml = meaning.definitions.map(def => 
          `<div class="definition">${def.definition}</div>`
        ).join('');
        
        return `
          <div class="meaning">
            <div class="part-of-speech">${meaning.partOfSpeech}</div>
            <div class="definitions">${definitionsHtml}</div>
          </div>
        `;
      }).join('');
      
      document.getElementById('popupMeanings').innerHTML = meaningsHtml;
    } else {
      document.getElementById('popupMeanings').innerHTML = '';
    }
    
    // Display bilingual examples if available
    if (data.bilingualContent && data.bilingualContent.examples.length > 0) {
      this.displayBilingualExamples(data.bilingualContent.examples);
    } else if (data.languageExplanations && data.languageExplanations.examples.length > 0) {
      // Display language-specific examples
      const examplesHtml = data.languageExplanations.examples.map(example => 
        `<div class="example">"${example}"</div>`
      ).join('');
      
      document.getElementById('popupExamples').innerHTML = examplesHtml;
    } else if (!data.error && data.meanings) {
      // Fallback to English-only display
      const examples = data.meanings
        .flatMap(meaning => meaning.definitions)
        .filter(def => def.example)
        .map(def => def.example);
      
      if (examples.length > 0) {
        const examplesHtml = examples.map(example => 
          `<div class="example">"${example}"</div>`
        ).join('');
        
        document.getElementById('popupExamples').innerHTML = 
          `<div class="examples-title">Examples:</div>${examplesHtml}`;
      } else {
        document.getElementById('popupExamples').innerHTML = '';
      }
    } else {
      document.getElementById('popupExamples').innerHTML = '';
    }
  }

      showErrorState(error) {
    document.getElementById('popupMeanings').innerHTML = 
      `<div class="error">Word not found</div>`;
  }

  displayBilingualDefinitions(bilingualDefinitions) {
    if (!bilingualDefinitions || bilingualDefinitions.length === 0) {
      document.getElementById('popupMeanings').innerHTML = '';
      return;
    }

    const html = bilingualDefinitions.map(def => `
      <div class="bilingual-meaning">
        <div class="bilingual-part-of-speech">
          <span class="english-pos">${def.englishPartOfSpeech}</span>
          <span class="chinese-pos">${def.translatedPartOfSpeech}</span>
        </div>
        <div class="bilingual-definition-content">
          <div class="english-definition">${def.englishDefinition}</div>
          <div class="chinese-definition">${def.translatedDefinition}</div>
        </div>
      </div>
    `).join('');

    document.getElementById('popupMeanings').innerHTML = html;
  }

  displayBilingualExamples(bilingualExamples) {
    if (!bilingualExamples || bilingualExamples.length === 0) {
      document.getElementById('popupExamples').innerHTML = '';
      return;
    }

    const html = bilingualExamples.map(example => `
      <div class="bilingual-example">
        <div class="english-example">"${example.englishExample}"</div>
        <div class="chinese-example">"${example.translatedExample}"</div>
      </div>
    `).join('');

    document.getElementById('popupExamples').innerHTML = html;
  }

    pronounceWord() {
        if (this.currentPopupWord) {
            // Pause main text reading if it's currently playing
            if (this.isPlaying && this.speechSynthesis) {
                this.pauseMainTextForPopup();
            }
            
            // Speak the popup word
            if (this.selectedVoice && 'speechSynthesis' in window) {
                // Cancel any current speech first
                speechSynthesis.cancel();
                
                this.popupUtterance = new SpeechSynthesisUtterance(this.currentPopupWord);
                this.popupUtterance.voice = this.selectedVoice;
                this.popupUtterance.rate = this.speechSpeed;
                this.popupUtterance.volume = 0.8;
                
                // Set up event handlers for popup word
                this.popupUtterance.onend = () => {
                    this.popupUtterance = null;
                    // Don't automatically resume main text - let user control via play/resume
                };
                
                this.popupUtterance.onerror = () => {
                    this.popupUtterance = null;
                };
                
                speechSynthesis.speak(this.popupUtterance);
            } else {
                this.dictionaryService.speakWord(this.currentPopupWord);
            }
        }
    }
    
    pauseMainTextForPopup() {
        if (this.isPlaying && this.speechSynthesis) {
            // Pause the main text reading
            this.speechSynthesis.pause();
            this.isPlaying = false;
            this.mainTextPausedByPopup = true;
            
            // Store the current text being read for potential resume
            if (this.speechUtterance) {
                this.pausedMainText = this.speechUtterance.text;
                // Try to determine if this was highlighted or whole text
                const selection = window.getSelection();
                const highlightedText = selection.toString().trim();
                this.pausedMainTextType = (highlightedText && this.pausedMainText.includes(highlightedText)) ? 'highlighted' : 'whole';
            }
            
            this.updatePlayResumeIcon();
        }
    }

    addToUnknownWords() {
        if (this.currentPopupWord) {
            this.unknownWords.add(this.currentPopupWord);
            this.saveUnknownWords();
            this.updateWordDisplay(this.currentPopupWord);
            this.updateUnknownWordsList();
            this.closePopup();
        }
    }
    
    removeFromUnknownWords() {
        if (this.currentPopupWord) {
            if (this.unknownWords.has(this.currentPopupWord)) {
                this.unknownWords.delete(this.currentPopupWord);
                this.saveUnknownWords();
                this.updateWordDisplay(this.currentPopupWord);
                this.updateUnknownWordsList();
                this.closePopup();
            } else {
                this.showCustomMessage('This word is not in your Unknown Words List.');
            }
        }
    }
    
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
    
    async updateUnknownWordsList() {
        const listContainer = document.getElementById('unknownWordsList');
        const countContainer = document.getElementById('unknownWordsCount');
        if (!listContainer || !countContainer) return;
        
        const words = Array.from(this.unknownWords);
        
        // Update word count
        countContainer.textContent = `${words.length} unknown word${words.length !== 1 ? 's' : ''}`;
        
        if (words.length === 0) {
            listContainer.innerHTML = '<div class="text-gray-500 text-center py-8">No unknown words added yet</div>';
            return;
        }
        
        // Process words without lemmatization
        const wordElements = [];
        for (const word of words) {
            const wordElement = `
                <div class="unknown-word-item" data-word="${word}">
                    <span class="unknown-word-text" onclick="learningSystem.searchWordInCambridge('${word}')" style="cursor: pointer;">${word}</span>
                    <div class="unknown-word-actions">
                        <button class="speak-word-btn" onclick="learningSystem.speakUnknownWord('${word}')" title="Speak word">
                            <img src="/ReadText.svg" alt="Speak" />
                        </button>
                        <button class="remove-word-btn" onclick="learningSystem.removeWordFromList('${word}')" title="Remove from list">
                            <img src="/Remove.svg" alt="Remove" />
                        </button>
                    </div>
                </div>
            `;
            wordElements.push(wordElement);
        }
        
        listContainer.innerHTML = wordElements.join('');
    }
    
    removeWordFromList(word) {
        if (this.unknownWords.has(word)) {
            // Animate the removal
            const wordElement = document.querySelector(`[data-word="${word}"]`);
            if (wordElement) {
                wordElement.classList.add('removing-word');
                setTimeout(() => {
                    this.unknownWords.delete(word);
                    this.saveUnknownWords();
                    this.updateWordDisplay(word);
                    this.updateUnknownWordsList();
                }, 500);
            }
        }
    }
    
    speakUnknownWord(word) {
        if (this.selectedVoice && 'speechSynthesis' in window) {
            const utterance = new SpeechSynthesisUtterance(word);
            utterance.voice = this.selectedVoice;
            utterance.rate = this.speechSpeed;
            utterance.volume = 0.8;
            
            this.isSpeaking = true;
            utterance.onend = () => {
                this.isSpeaking = false;
            };
            
            speechSynthesis.speak(utterance);
        } else {
            this.dictionaryService.speakWord(word);
        }
    }
    

    
    async translateUnknownWords() {
        const words = Array.from(this.unknownWords);
        if (words.length === 0) {
            this.showCustomMessage('No unknown words to translate.');
            return;
        }
        
        const targetLanguage = document.getElementById('translationLanguageSelect')?.value || 'zh';
        const listContainer = document.getElementById('unknownWordsList');
        
        if (!listContainer) return;
        
        try {
            // Show loading state
            listContainer.innerHTML = '<div class="text-gray-500 text-center py-8">Translating words...</div>';
            
            // Translate each word
            const translatedWords = [];
            for (const word of words) {
                try {
                    const translation = await this.dictionaryService.getWordTranslation(word, targetLanguage);
                    translatedWords.push({ word, translation });
                } catch (error) {
                    console.error(`Translation error for word "${word}":`, error);
                    translatedWords.push({ word, translation: '[Translation failed]' });
                }
            }
            
            // Display translated words
            const html = translatedWords.map(({ word, translation }) => `
                <div class="unknown-word-item" data-word="${word}">
                    <div style="flex: 1;">
                        <div class="unknown-word-text">${word}</div>
                        <div style="font-size: 11px; color: #666; margin-top: 2px;">${translation}</div>
                    </div>
                    <div class="unknown-word-actions">
                        <button class="speak-word-btn" onclick="learningSystem.speakUnknownWord('${word}')" title="Speak word">
                            <img src="/ReadText.svg" alt="Speak" />
                        </button>
                        <button class="remove-word-btn" onclick="learningSystem.removeWordFromList('${word}')" title="Remove from list">
                            <img src="/Remove.svg" alt="Remove" />
                        </button>
                    </div>
                </div>
            `).join('');
            
            listContainer.innerHTML = html;
            
        } catch (error) {
            console.error('Translation error:', error);
            listContainer.innerHTML = '<div class="text-red-500 text-center py-8">Translation failed. Please try again.</div>';
        }
    }
    
    navigateToSubpage2() {
        // Save current state to sessionStorage
        const currentState = {
            unknownWords: Array.from(this.unknownWords),
            originalText: this.originalText,
            fontFamily: this.currentFont,
            fontSize: this.currentFontSize,
            targetLanguage: this.translationLanguage,
            selectedVoice: this.selectedVoice ? this.selectedVoice.name : null,
            speechSpeed: this.speechSpeed
        };
        
        sessionStorage.setItem('learnUnknownWords2Data', JSON.stringify(currentState));
        
        // Open new subpage
        window.open('/learn-unknown-words-2-subpage.html', '_blank');
    }

    saveUnknownWords() {
        sessionStorage.setItem('unknownWordsList', 
            JSON.stringify(Array.from(this.unknownWords)));
    }

    updateWordDisplay(word) {
        const wordElements = document.querySelectorAll(`[data-word="${word}"]`);
        wordElements.forEach(element => {
            if (this.unknownWords.has(word)) {
                element.classList.add('unknown-word');
            } else {
                element.classList.remove('unknown-word');
            }
        });
    }

      setupEventListeners() {
    // Close popup with Escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.closePopup();
      }
    });
    
    // Close popup when clicking outside
    document.addEventListener('click', (e) => {
      const popup = document.getElementById('dictionaryPopup');
      const popupContent = document.getElementById('popupContent');
      
      // If popup is visible and click is outside popup content
      if (!popup.classList.contains('hidden') && 
          !popupContent.contains(e.target) && 
          !e.target.classList.contains('word')) {
        this.closePopup();
      }
    });

    // Setup dropdown auto-hide
    this.setupDropdownAutoHide();
  }

  setupDropdownAutoHide() {
    const preferenceDropdown = document.getElementById('preferenceDropdown');
    const preferenceBtn = document.querySelector('.preference-btn');
    const readOptionsDropdown = document.getElementById('readOptionsDropdown');
    const readTextBtn = document.querySelector('.read-text-btn');
    
    // Hide dropdowns when clicking outside
    document.addEventListener('click', (e) => {
      // Hide preference dropdown
      if (preferenceDropdown && preferenceBtn) {
        if (!preferenceDropdown.contains(e.target) && !preferenceBtn.contains(e.target)) {
          preferenceDropdown.classList.remove('show');
        }
      }
      
      // Hide read options dropdown
      if (readOptionsDropdown && readTextBtn) {
        if (!readOptionsDropdown.contains(e.target) && !readTextBtn.contains(e.target)) {
          readOptionsDropdown.classList.remove('show');
        }
      }
    });
    
    // Prevent dropdown from closing when clicking on select elements
    if (preferenceDropdown) {
      preferenceDropdown.addEventListener('click', (e) => {
        if (e.target.tagName === 'SELECT' || e.target.tagName === 'OPTION') {
          e.stopPropagation();
        }
      });
    }
    
    // Hide dropdowns when mouse leaves (but not immediately)
    if (preferenceDropdown) {
      preferenceDropdown.addEventListener('mouseleave', () => {
        // Add a small delay to allow clicking on elements inside
        setTimeout(() => {
          if (!preferenceDropdown.matches(':hover')) {
            preferenceDropdown.classList.remove('show');
          }
        }, 100);
      });
    }
    
    if (readOptionsDropdown) {
      readOptionsDropdown.addEventListener('mouseleave', () => {
        readOptionsDropdown.classList.remove('show');
      });
    }
  }

  adjustPopupPosition() {
    const popupContent = document.getElementById('popupContent');
    const rect = popupContent.getBoundingClientRect();
    
    // Check if popup goes off screen
    if (rect.right > window.innerWidth) {
      popupContent.style.left = (window.innerWidth - rect.width - 10) + 'px';
    }
    
    if (rect.bottom > window.innerHeight) {
      popupContent.style.top = (window.innerHeight - rect.height - 10) + 'px';
    }
    
    // Ensure popup doesn't go off the left edge
    if (rect.left < 10) {
      popupContent.style.left = '10px';
    }
    
    // Ensure popup doesn't go off the top edge
    if (rect.top < 10) {
      popupContent.style.top = '10px';
    }
  }

  // Section state management
  sectionStates = {
    meanings: true,   // Default expanded
    examples: false   // Default collapsed
  };

  toggleSection(sectionName) {
    const content = document.getElementById(sectionName + 'Content');
    const button = document.getElementById(sectionName + 'ExpandBtn');
    const isCollapsed = content.classList.contains('collapsed');
    
    if (isCollapsed) {
      this.expandSection(sectionName);
    } else {
      this.collapseSection(sectionName);
    }
  }

  expandSection(sectionName) {
    const content = document.getElementById(sectionName + 'Content');
    const button = document.getElementById(sectionName + 'ExpandBtn');
    
    content.classList.remove('collapsed');
    button.classList.add('expanded');
    this.sectionStates[sectionName] = true;
  }

  collapseSection(sectionName) {
    const content = document.getElementById(sectionName + 'Content');
    const button = document.getElementById(sectionName + 'ExpandBtn');
    
    content.classList.add('collapsed');
    button.classList.remove('expanded');
    this.sectionStates[sectionName] = false;
  }

  initializeSectionStates() {
    // Set initial states
    this.expandSection('meanings');
    this.collapseSection('examples');
  }

  // Enhanced navbar functionality methods
  
  initializePreferences() {
    // Load preferences from localStorage or use defaults
    this.currentFont = localStorage.getItem('vocabKillerFont') || 'Arial';
    this.currentFontSize = localStorage.getItem('vocabKillerFontSize') || '18';
    this.translationLanguage = localStorage.getItem('vocabKillerTranslationLanguage') || 'zh';
    this.speechSpeed = parseFloat(localStorage.getItem('vocabKillerSpeechSpeed') || '1.0');
    const savedVoice = localStorage.getItem('vocabKillerSelectedVoice') || '';
    
    // Apply preferences to UI
    this.updateUIWithPreferences();
    this.applyFontPreferences();
    this.initializeSpeechControls();
  }

  updateUIWithPreferences() {
    // Update dropdown selections
    const fontSelect = document.getElementById('fontSelect');
    const fontSizeSelect = document.getElementById('fontSizeSelect');
    const translationLanguageSelect = document.getElementById('translationLanguageSelect');
    
    if (fontSelect) fontSelect.value = this.currentFont;
    if (fontSizeSelect) fontSizeSelect.value = this.currentFontSize;
    if (translationLanguageSelect) translationLanguageSelect.value = this.translationLanguage;
  }

  applyFontPreferences() {
    // Apply font and size to the text container
    const textContainer = document.getElementById('originalTextContainer');
    if (textContainer) {
      textContainer.style.fontFamily = this.currentFont;
      textContainer.style.fontSize = this.currentFontSize + 'px';
    }
  }

  togglePreferenceDropdown() {
    const dropdown = document.getElementById('preferenceDropdown');
    if (dropdown) {
      dropdown.classList.toggle('show');
    }
  }

  updateFont(font) {
    this.currentFont = font;
    localStorage.setItem('vocabKillerFont', font);
    this.applyFontPreferences();
  }

  updateFontSize(size) {
    this.currentFontSize = size;
    localStorage.setItem('vocabKillerFontSize', size);
    this.applyFontPreferences();
  }

  updateTranslationLanguage(language) {
    this.translationLanguage = language;
    localStorage.setItem('vocabKillerTranslationLanguage', language);
    
    // Clear all translation caches when language changes
    this.dictionaryService.popupTranslationCache.clear();
    this.translationCache.clear();
    this.translatedParagraphs.clear();
    
    // Start pre-translating common words in new language
    this.dictionaryService.preTranslateCommonWords(language);
    
    // Don't automatically re-translate popup - let user click "Apply Translation Settings" instead
    // This prevents the dropdown from closing and gives user control
  }

  async reloadPopupTranslation() {
    if (!this.currentPopupWord) return;
    
    // Show loading state
    this.showLoadingState();
    
    // Re-fetch dictionary data with new language
    await this.loadDictionaryData(this.currentPopupWord);
  }

  readText(type = 'whole') {
    let textToRead = '';
    
    if (type === 'highlighted') {
      // Get highlighted text from selection
      const selection = window.getSelection();
      textToRead = selection.toString().trim();
      
      if (!textToRead) {
        alert('Please select text to read');
        return;
      }
    } else {
      // Read entire text
      if (!this.originalText) {
        alert('No text to read');
        return;
      }
      textToRead = this.originalText;
    }

    if (textToRead && this.selectedVoice && 'speechSynthesis' in window) {
      // Stop any current speech
      if (this.speechSynthesis) {
        this.speechSynthesis.cancel();
      }
      
      // Clear any popup-related state
      this.mainTextPausedByPopup = false;
      this.pausedMainText = '';
      this.pausedMainTextType = '';
      this.popupUtterance = null;
      
      // Create new utterance with selected voice and speed
      this.speechUtterance = new SpeechSynthesisUtterance(textToRead);
      this.speechUtterance.voice = this.selectedVoice;
      this.speechUtterance.rate = this.speechSpeed;
      this.speechUtterance.volume = 0.8;
      
      // Set up event handlers
      this.speechUtterance.onend = () => {
        this.isPlaying = false;
        this.isSpeaking = false;
        this.mainTextPausedByPopup = false;
        this.pausedMainText = '';
        this.pausedMainTextType = '';
        this.updatePlayResumeIcon();
      };
      
      this.speechUtterance.onpause = () => {
        this.isPlaying = false;
        this.updatePlayResumeIcon();
      };
      
      this.speechUtterance.onresume = () => {
        this.isPlaying = true;
        this.updatePlayResumeIcon();
      };
      
      // Start speaking
      this.speechSynthesis = speechSynthesis;
      this.speechSynthesis.speak(this.speechUtterance);
      this.isPlaying = true;
      this.isSpeaking = true;
      this.updatePlayResumeIcon();
    }
  }

  // Function to read highlighted text specifically
  readHighlightedText() {
    this.readText('highlighted');
  }

  // Function to read entire text
  readEntireText() {
    this.readText('whole');
  }

  togglePlayResume() {
    if (this.speechSynthesis) {
      if (this.isPlaying) {
        // Pause current speech
        this.speechSynthesis.pause();
        this.isPlaying = false;
        this.updatePlayResumeIcon();
      } else {
        // Resume speech
        if (this.mainTextPausedByPopup && this.pausedMainText) {
          // Resume main text that was paused by popup
          this.resumeMainTextFromPopup();
        } else {
          // Regular resume
          this.speechSynthesis.resume();
          this.isPlaying = true;
          this.updatePlayResumeIcon();
        }
      }
    }
  }
  
  resumeMainTextFromPopup() {
    if (this.pausedMainText && this.selectedVoice) {
      // Cancel any popup speech first
      if (this.popupUtterance) {
        speechSynthesis.cancel();
        this.popupUtterance = null;
      }
      
      // Create new utterance for the paused main text
      this.speechUtterance = new SpeechSynthesisUtterance(this.pausedMainText);
      this.speechUtterance.voice = this.selectedVoice;
      this.speechUtterance.rate = this.speechSpeed;
      this.speechUtterance.volume = 0.8;
      
      // Set up event handlers
      this.speechUtterance.onend = () => {
        this.isPlaying = false;
        this.isSpeaking = false;
        this.mainTextPausedByPopup = false;
        this.pausedMainText = '';
        this.pausedMainTextType = '';
        this.updatePlayResumeIcon();
      };
      
      this.speechUtterance.onpause = () => {
        this.isPlaying = false;
        this.updatePlayResumeIcon();
      };
      
      this.speechUtterance.onresume = () => {
        this.isPlaying = true;
        this.updatePlayResumeIcon();
      };
      
      // Start speaking
      this.speechSynthesis.speak(this.speechUtterance);
      this.isPlaying = true;
      this.isSpeaking = true;
      this.mainTextPausedByPopup = false; // Clear the paused state
      this.updatePlayResumeIcon();
    }
  }

  updatePlayResumeIcon() {
    const icon = document.getElementById('playResumeIcon');
    if (icon) {
      icon.src = this.isPlaying ? '/pause.svg' : '/play.svg';
      icon.alt = this.isPlaying ? 'Pause' : 'Play';
    }
  }

  async translateText() {
    if (!this.originalText) return;
    
    try {
      // Show loading state
      const textContainer = document.getElementById('originalTextContainer');
      const originalContent = textContainer.innerHTML;
      textContainer.innerHTML = '<p class="text-gray-500">Translating...</p>';
      
      // Translate the text
      const translatedText = await this.dictionaryService.translateText(
        this.originalText, 
        'en', 
        this.translationLanguage
      );
      
      if (translatedText) {
        // Display bilingual content like homepage
        textContainer.innerHTML = `
          <div class="bilingual-translation">
            <div class="original-text">
              <h3>Original Text:</h3>
              <div class="text-content">${this.originalText}</div>
            </div>
            <div class="translated-text">
              <h3>Translated Text (${this.getLanguageName(this.translationLanguage)}):</h3>
              <div class="text-content">${translatedText}</div>
            </div>
          </div>
        `;
      } else {
        textContainer.innerHTML = originalContent;
      }
    } catch (error) {
      console.error('Translation error:', error);
      // Restore original content on error
      const textContainer = document.getElementById('originalTextContainer');
      textContainer.innerHTML = '<p class="text-gray-500">Translation failed. Please try again.</p>';
    }
  }

  getLanguageName(languageCode) {
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

  // Read text dropdown functionality
  toggleReadOptions() {
    const dropdown = document.getElementById('readOptionsDropdown');
    if (dropdown) {
      dropdown.classList.toggle('show');
    }
  }

  // Translation toggle functionality
  toggleTranslation() {
    if (this.showingTranslation) {
      this.showOriginalText();
    } else {
      // Check if we have cached translations
      if (this.translatedParagraphs.size > 0) {
        this.showCachedTranslation();
      } else {
        this.showTranslation();
      }
    }
    this.showingTranslation = !this.showingTranslation;
  }

  showCachedTranslation() {
    const container = document.getElementById('originalTextContainer');
    const paragraphs = this.originalText.split('\n');
    
    const html = paragraphs.map((paragraph, index) => {
      if (paragraph.trim() === '') {
        return '<div class="paragraph blank-paragraph"></div>';
      } else {
        // Process words in non-blank paragraphs
        const words = paragraph.split(/\s+/);
        const wordsHtml = words.map(word => {
          const cleanWord = this.cleanWord(word);
          const isUnknown = this.unknownWords.has(cleanWord);
          return `<span class="word ${isUnknown ? 'unknown-word' : ''}" 
                           data-word="${cleanWord}" 
                           onclick="learningSystem.showDictionary(event, '${cleanWord}')">
                    ${word}
                  </span>`;
        }).join(' ');
        
        // Get cached translation
        const translation = this.translatedParagraphs.get(index) || '';
        
        return `
          <div class="translation-paragraph">
            <div class="english-text paragraph">${wordsHtml}</div>
            <div class="translated-text paragraph">${translation}</div>
          </div>
        `;
      }
    }).join('');
    
    container.innerHTML = html;
  }

  cancelTranslation() {
    this.translationProgress.isTranslating = false;
  }

  showOriginalText() {
    const container = document.getElementById('originalTextContainer');
    if (container && this.originalContent) {
      container.innerHTML = this.originalContent;
    }
  }

  async showTranslation() {
    if (!this.originalText) return;
    
    try {
      // Store original content if not already stored
      if (!this.originalContent) {
        const container = document.getElementById('originalTextContainer');
        this.originalContent = container.innerHTML;
      }
      
      // Split text into paragraphs
      const paragraphs = this.originalText.split('\n');
      this.translationProgress.total = paragraphs.length;
      this.translationProgress.current = 0;
      this.translationProgress.isTranslating = true;
      
      // Show initial progress display
      this.displayTranslationProgress(paragraphs);
      
      // Translate paragraphs in parallel batches for better performance
      const batchSize = 3; // Process 3 paragraphs at a time
      const nonEmptyParagraphs = paragraphs
        .map((paragraph, index) => ({ paragraph, index }))
        .filter(({ paragraph }) => paragraph.trim() !== '');
      
      for (let i = 0; i < nonEmptyParagraphs.length; i += batchSize) {
        if (!this.translationProgress.isTranslating) {
          break; // Stop if translation was cancelled
        }
        
        const batch = nonEmptyParagraphs.slice(i, i + batchSize);
        
        // Process batch in parallel
        const batchPromises = batch.map(async ({ paragraph, index }) => {
          try {
            // Check cache first
            const cacheKey = `${paragraph}_${this.translationLanguage}`;
            let translation;
            
            if (this.translationCache.has(cacheKey)) {
              translation = this.translationCache.get(cacheKey);
            } else {
              // Translate paragraph
              translation = await this.dictionaryService.translateText(
                paragraph, 
                'en', 
                this.translationLanguage
              );
              
              // Cache the result
              if (translation) {
                this.translationCache.set(cacheKey, translation);
              }
            }
            
            // Store translation
            this.translatedParagraphs.set(index, translation || '');
            
          } catch (error) {
            console.error(`Translation error for paragraph ${index}:`, error);
            // Store error message instead of empty string
            this.translatedParagraphs.set(index, `[Translation error: ${paragraph.substring(0, 30)}...]`);
          }
        });
        
        // Wait for batch to complete
        await Promise.all(batchPromises);
        
        // Update progress
        this.translationProgress.current = Math.min(i + batchSize, nonEmptyParagraphs.length);
        this.updateTranslationProgress(paragraphs, this.translationProgress.current);
        
        // Small delay between batches to avoid overwhelming the server
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      this.translationProgress.isTranslating = false;
      
      // Final display update to show all completed translations
      this.displayFinalTranslations(paragraphs);
      
    } catch (error) {
      console.error('Translation error:', error);
      const textContainer = document.getElementById('originalTextContainer');
      textContainer.innerHTML = this.originalContent;
      this.translationProgress.isTranslating = false;
    }
  }

  displayTranslationProgress(paragraphs) {
    const container = document.getElementById('originalTextContainer');
    
    const html = paragraphs.map((paragraph, index) => {
      if (paragraph.trim() === '') {
        return '<div class="paragraph blank-paragraph"></div>';
      } else {
        // Process words in non-blank paragraphs
        const words = paragraph.split(/\s+/);
        const wordsHtml = words.map(word => {
          const cleanWord = this.cleanWord(word);
          const isUnknown = this.unknownWords.has(cleanWord);
          return `<span class="word ${isUnknown ? 'unknown-word' : ''}" 
                           data-word="${cleanWord}" 
                           onclick="learningSystem.showDictionary(event, '${cleanWord}')">
                    ${word}
                  </span>`;
        }).join(' ');
        
        // Check if we have cached translation
        const hasTranslation = this.translatedParagraphs.has(index);
        const isCurrentlyTranslating = index === this.translationProgress.current;
        const isWaitingForTranslation = index > this.translationProgress.current;
        
        let translationContent = '';
        if (hasTranslation) {
          const translation = this.translatedParagraphs.get(index);
          translationContent = `<div class="translated-text paragraph">${translation}</div>`;
        } else if (isCurrentlyTranslating) {
          translationContent = `
            <div class="translation-progress">
              <div class="loading-indicator">
                <img src="/Processing.svg" alt="Processing" class="w-4 h-4 animate-spin" />
                Translating...
              </div>
            </div>
          `;
        } else if (isWaitingForTranslation) {
          translationContent = `
            <div class="translation-progress">
              <div class="waiting-indicator">
                <img src="/waiting.svg" alt="Waiting" class="w-4 h-4" />
                Waiting for translation...
              </div>
            </div>
          `;
        }
        
        return `
          <div class="translation-paragraph">
            <div class="english-text paragraph">${wordsHtml}</div>
            ${translationContent}
          </div>
        `;
      }
    }).join('');
    
    container.innerHTML = html;
  }

  updateTranslationProgress(paragraphs, currentIndex) {
    const container = document.getElementById('originalTextContainer');
    const translationParagraphs = container.querySelectorAll('.translation-paragraph');
    
    // Update the current paragraph's translation
    if (translationParagraphs[currentIndex]) {
      const translationDiv = translationParagraphs[currentIndex].querySelector('.translation-progress');
      if (translationDiv) {
        const translation = this.translatedParagraphs.get(currentIndex);
        if (translation) {
          translationDiv.innerHTML = `<div class="translated-text paragraph">${translation}</div>`;
        }
      }
    }
    
    // Update progress indicators for upcoming paragraphs
    for (let i = currentIndex + 1; i < paragraphs.length; i++) {
      if (translationParagraphs[i]) {
        const translationDiv = translationParagraphs[i].querySelector('.translation-progress');
        if (translationDiv && !this.translatedParagraphs.has(i)) {
          if (i === currentIndex + 1) {
            // Next paragraph is currently translating
            translationDiv.innerHTML = `
              <div class="loading-indicator">
                <img src="/Processing.svg" alt="Processing" class="w-4 h-4 animate-spin" />
                Translating...
              </div>
            `;
          } else {
            // Future paragraphs are waiting
            translationDiv.innerHTML = `
              <div class="waiting-indicator">
                <img src="/waiting.svg" alt="Waiting" class="w-4 h-4" />
                Waiting for translation...
              </div>
            `;
          }
        }
      }
    }
  }

  displayFinalTranslations(paragraphs) {
    const container = document.getElementById('originalTextContainer');
    
    const html = paragraphs.map((paragraph, index) => {
      if (paragraph.trim() === '') {
        return '<div class="paragraph blank-paragraph"></div>';
      } else {
        // Process words in non-blank paragraphs
        const words = paragraph.split(/\s+/);
        const wordsHtml = words.map(word => {
          const cleanWord = this.cleanWord(word);
          const isUnknown = this.unknownWords.has(cleanWord);
          return `<span class="word ${isUnknown ? 'unknown-word' : ''}" 
                           data-word="${cleanWord}" 
                           onclick="learningSystem.showDictionary(event, '${cleanWord}')">
                    ${word}
                  </span>`;
        }).join(' ');
        
        // Get the final translation for this paragraph
        const translation = this.translatedParagraphs.get(index) || '';
        
        return `
          <div class="translation-paragraph">
            <div class="english-text paragraph">${wordsHtml}</div>
            <div class="translated-text paragraph">${translation}</div>
          </div>
        `;
      }
    }).join('');
    
    container.innerHTML = html;
  }

  displayTranslationInParagraphs(originalText, translatedText) {
    const container = document.getElementById('originalTextContainer');
    const originalParagraphs = originalText.split('\n');
    const translatedParagraphs = translatedText.split('\n');
    
    const html = originalParagraphs.map((paragraph, index) => {
      const translatedParagraph = translatedParagraphs[index] || '';
      
      if (paragraph.trim() === '') {
        return '<div class="paragraph blank-paragraph"></div>';
      } else {
        // Process words in non-blank paragraphs
        const words = paragraph.split(/\s+/);
        const wordsHtml = words.map(word => {
          const cleanWord = this.cleanWord(word);
          const isUnknown = this.unknownWords.has(cleanWord);
          return `<span class="word ${isUnknown ? 'unknown-word' : ''}" 
                           data-word="${cleanWord}" 
                           onclick="learningSystem.showDictionary(event, '${cleanWord}')">
                    ${word}
                  </span>`;
        }).join(' ');
        
        return `
          <div class="translation-paragraph">
            <div class="english-text paragraph">${wordsHtml}</div>
            <div class="translated-text paragraph">${translatedParagraph}</div>
          </div>
        `;
      }
    }).join('');
    
    container.innerHTML = html;
  }

  closeSubpage() {
    // Stop any ongoing speech
    if (this.speechSynthesis) {
      this.speechSynthesis.cancel();
    }
    
    // Stop any ongoing translation
    this.translationProgress.isTranslating = false;
    
    // Clear translation cache
    this.translatedParagraphs.clear();
    this.translationCache.clear();
    
    // Return to homepage
    window.location.href = '/';
  }

  // Speech Controls Methods
  initializeSpeechControls() {
    this.loadVoices();
    this.updateSpeechUI();
  }

  loadVoices() {
    if ('speechSynthesis' in window) {
      // Load available voices
      const loadVoices = () => {
        this.availableVoices = speechSynthesis.getVoices();
        this.populateVoiceSelect();
        this.autoSelectPreferredVoice();
      };

      // Load voices immediately if available
      if (speechSynthesis.getVoices().length > 0) {
        loadVoices();
      } else {
        // Wait for voices to load
        speechSynthesis.onvoiceschanged = loadVoices;
      }
    }
  }

  populateVoiceSelect() {
    const voiceSelect = document.getElementById('voiceSelect');
    if (!voiceSelect) return;

    voiceSelect.innerHTML = '';
    
    // Filter for English voices
    const englishVoices = this.availableVoices.filter(voice => 
      voice.lang.startsWith('en') && 
      (voice.name.toLowerCase().includes('google') || voice.name.toLowerCase().includes('chrome'))
    );

    // Add preferred voices first
    const preferredVoices = [
      { name: 'Google UK English Female', pattern: /google.*uk.*english.*female/i },
      { name: 'Google UK English Male', pattern: /google.*uk.*english.*male/i },
      { name: 'Google US English', pattern: /google.*us.*english/i }
    ];

    preferredVoices.forEach(preferred => {
      const voice = englishVoices.find(v => preferred.pattern.test(v.name));
      if (voice) {
        const option = document.createElement('option');
        option.value = voice.name;
        option.textContent = `${voice.name} (${voice.lang}) - Online`;
        if (preferred.name === 'Google UK English Female') {
          option.textContent += ' - 🎯 PREFERRED';
        }
        voiceSelect.appendChild(option);
      }
    });

    // Add other English voices
    englishVoices.forEach(voice => {
      if (!preferredVoices.some(preferred => preferred.pattern.test(voice.name))) {
        const option = document.createElement('option');
        option.value = voice.name;
        option.textContent = `${voice.name} (${voice.lang}) - Online`;
        voiceSelect.appendChild(option);
      }
    });

    // Add fallback option
    if (englishVoices.length === 0) {
      const option = document.createElement('option');
      option.value = '';
      option.textContent = 'No English voices available';
      voiceSelect.appendChild(option);
    }
  }

  autoSelectPreferredVoice() {
    const voiceSelect = document.getElementById('voiceSelect');
    if (!voiceSelect) return;

    // Try to auto-select Google UK English Female
    const preferredVoice = Array.from(voiceSelect.options).find(option => 
      option.textContent.includes('Google UK English Female')
    );

    if (preferredVoice) {
      voiceSelect.value = preferredVoice.value;
      this.updateVoice(preferredVoice.value);
    } else if (voiceSelect.options.length > 0) {
      // Select first available voice
      voiceSelect.value = voiceSelect.options[0].value;
      this.updateVoice(voiceSelect.options[0].value);
    }
  }

  updateSpeechUI() {
    // Update speed slider and value
    const speedSlider = document.getElementById('speedSlider');
    const speedValue = document.getElementById('speedValue');
    
    if (speedSlider) {
      speedSlider.value = this.speechSpeed;
    }
    if (speedValue) {
      speedValue.textContent = this.speechSpeed.toFixed(1);
    }
  }

  updateVoice(voiceName) {
    this.selectedVoice = this.availableVoices.find(voice => voice.name === voiceName);
    if (this.selectedVoice) {
      localStorage.setItem('vocabKillerSelectedVoice', voiceName);
      this.updateVoiceInfo();
    }
  }

  updateSpeed(speed) {
    this.speechSpeed = parseFloat(speed);
    localStorage.setItem('vocabKillerSpeechSpeed', this.speechSpeed.toString());
    
    const speedValue = document.getElementById('speedValue');
    if (speedValue) {
      speedValue.textContent = this.speechSpeed.toFixed(1);
    }
  }

  resetSpeed() {
    this.updateSpeed(1.0);
    const speedSlider = document.getElementById('speedSlider');
    if (speedSlider) {
      speedSlider.value = 1.0;
    }
  }

  testVoice() {
    if (this.selectedVoice && 'speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance('Hello, this is a voice test');
      utterance.voice = this.selectedVoice;
      utterance.rate = this.speechSpeed;
      utterance.volume = 0.8;
      
      this.isSpeaking = true;
      utterance.onend = () => {
        this.isSpeaking = false;
      };
      
      speechSynthesis.speak(utterance);
    }
  }

  updateVoiceInfo() {
    const voiceInfo = document.getElementById('voiceInfo');
    if (voiceInfo && this.selectedVoice) {
      voiceInfo.textContent = `Current: ${this.selectedVoice.name} (${this.selectedVoice.lang}) - Online`;
    }
  }

  // Update existing speech methods to use selected voice and speed
  speakWord(word) {
    if (this.selectedVoice && 'speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(word);
      utterance.voice = this.selectedVoice;
      utterance.rate = this.speechSpeed;
      utterance.volume = 0.8;
      
      this.isSpeaking = true;
      utterance.onend = () => {
        this.isSpeaking = false;
      };
      
      speechSynthesis.speak(utterance);
    }
  }

  // Apply translation settings button functionality
  async applyTranslationSettings() {
    const targetLanguage = document.getElementById('translationLanguageSelect').value;
    
    if (!targetLanguage) {
      // If no translation language is selected, hide translation
      this.showOriginalText();
      return;
    }
    
    // Clear existing translation cache
    this.translationCache.clear();
    this.originalTextTranslations = [];
    this.showOriginalTextTranslation = false;
    
    // Start new translation with selected language
    await this.showTranslation();
  }



  // Enhanced method to translate popup content including definitions and examples
  async translatePopupContent(data, targetLanguage) {
    try {
      const word = data.word || '';
      
      // 1. Translate the word itself
      await this.translatePopupWord(word, targetLanguage);
      
      // 2. Translate definitions and examples if available
      if (data.meanings && data.meanings.length > 0) {
        await this.translatePopupDefinitions(data.meanings, word, targetLanguage);
        await this.translatePopupExamples(data.meanings, word, targetLanguage);
      }
      
    } catch (error) {
      console.error('Popup translation error:', error);
    }
  }

  // Translate just the word in popup
  async translatePopupWord(word, targetLanguage) {
    try {
      const translationContainer = document.getElementById('popupTranslation');
      if (!translationContainer) return;
      
      const cacheKey = `${word}_${targetLanguage}`;
      
      // Check popup translation cache first
      if (this.dictionaryService.popupTranslationCache.has(cacheKey)) {
        const cachedTranslation = this.dictionaryService.popupTranslationCache.get(cacheKey);
        translationContainer.innerHTML = `<div class="translation">${cachedTranslation}</div>`;
        return;
      }
      
      // Show translation loading state
      translationContainer.innerHTML = '<div class="loading">Translating...</div>';
      
      // Translate the word
      const translation = await this.dictionaryService.getWordTranslation(word, targetLanguage);
      
      if (translation) {
        // Cache the translation for future use
        this.dictionaryService.popupTranslationCache.set(cacheKey, translation);
        translationContainer.innerHTML = `<div class="translation">${translation}</div>`;
      } else {
        translationContainer.innerHTML = '<div class="error">Translation failed</div>';
      }
      
    } catch (error) {
      console.error('Popup word translation error:', error);
      const translationContainer = document.getElementById('popupTranslation');
      if (translationContainer) {
        translationContainer.innerHTML = '<div class="error">Translation failed</div>';
      }
    }
  }

  // Translate definitions in popup
  async translatePopupDefinitions(meanings, word, targetLanguage) {
    try {
      const meaningsContainer = document.getElementById('popupMeanings');
      if (!meaningsContainer) return;
      
      // Get current English content
      const currentContent = meaningsContainer.innerHTML;
      if (!currentContent || currentContent.includes('loading') || currentContent.includes('error')) {
        return; // Skip if already loading or has error
      }
      
      // Create bilingual definitions
      const bilingualDefinitions = [];
      
      for (const meaning of meanings) {
        const partOfSpeech = meaning.partOfSpeech;
        const definitions = meaning.definitions || [];
        
        const bilingualDefs = [];
        for (const def of definitions) {
          const englishDef = def.definition;
          const cacheKey = `def_${word}_${englishDef}_${targetLanguage}`;
          
          let chineseDef = englishDef; // Default to English if translation fails
          
          // Check cache first
          if (this.dictionaryService.popupTranslationCache.has(cacheKey)) {
            chineseDef = this.dictionaryService.popupTranslationCache.get(cacheKey);
          } else {
            try {
              // Translate definition
              const translatedDef = await this.dictionaryService.translateDefinitionToLanguage(englishDef, word, targetLanguage);
              if (translatedDef && translatedDef !== englishDef) {
                chineseDef = translatedDef;
                this.dictionaryService.popupTranslationCache.set(cacheKey, chineseDef);
              }
            } catch (error) {
              console.error('Definition translation error:', error);
            }
          }
          
          bilingualDefs.push({
            english: englishDef,
            chinese: chineseDef
          });
        }
        
        bilingualDefinitions.push({
          partOfSpeech: partOfSpeech,
          definitions: bilingualDefs
        });
      }
      
      // Display bilingual definitions
      this.displayBilingualDefinitionsInPopup(bilingualDefinitions);
      
    } catch (error) {
      console.error('Popup definitions translation error:', error);
    }
  }

  // Translate examples in popup
  async translatePopupExamples(meanings, word, targetLanguage) {
    try {
      const examplesContainer = document.getElementById('popupExamples');
      if (!examplesContainer) return;
      
      // Get current English content
      const currentContent = examplesContainer.innerHTML;
      if (!currentContent || currentContent.includes('loading') || currentContent.includes('error')) {
        return; // Skip if already loading or has error
      }
      
      // Collect all examples
      const examples = [];
      for (const meaning of meanings) {
        const definitions = meaning.definitions || [];
        for (const def of definitions) {
          if (def.example) {
            examples.push(def.example);
          }
        }
      }
      
      if (examples.length === 0) return;
      
      // Create bilingual examples
      const bilingualExamples = [];
      
      for (const example of examples) {
        const cacheKey = `ex_${word}_${example}_${targetLanguage}`;
        
        let chineseExample = example; // Default to English if translation fails
        
        // Check cache first
        if (this.dictionaryService.popupTranslationCache.has(cacheKey)) {
          chineseExample = this.dictionaryService.popupTranslationCache.get(cacheKey);
        } else {
          try {
            // Translate example
            const translatedExample = await this.dictionaryService.translateExampleToLanguage(example, word, targetLanguage);
            if (translatedExample && translatedExample !== example) {
              chineseExample = translatedExample;
              this.dictionaryService.popupTranslationCache.set(cacheKey, chineseExample);
            }
          } catch (error) {
            console.error('Example translation error:', error);
          }
        }
        
        bilingualExamples.push({
          english: example,
          chinese: chineseExample
        });
      }
      
      // Display bilingual examples
      this.displayBilingualExamplesInPopup(bilingualExamples);
      
    } catch (error) {
      console.error('Popup examples translation error:', error);
    }
  }

  // Display bilingual definitions in popup
  displayBilingualDefinitionsInPopup(bilingualDefinitions) {
    const meaningsContainer = document.getElementById('popupMeanings');
    if (!meaningsContainer) return;
    
    const meaningsHtml = bilingualDefinitions.map(meaning => {
      const definitionsHtml = meaning.definitions.map(def => 
        `<div class="bilingual-meaning">
          <div class="english-definition">${def.english}</div>
          <div class="chinese-definition">${def.chinese}</div>
        </div>`
      ).join('');
      
      return `
        <div class="meaning">
          <div class="part-of-speech">${meaning.partOfSpeech}</div>
          <div class="definitions">${definitionsHtml}</div>
        </div>
      `;
    }).join('');
    
    meaningsContainer.innerHTML = meaningsHtml;
  }

  // Display bilingual examples in popup
  displayBilingualExamplesInPopup(bilingualExamples) {
    const examplesContainer = document.getElementById('popupExamples');
    if (!examplesContainer) return;
    
    const examplesHtml = bilingualExamples.map(example => 
      `<div class="bilingual-example">
        <div class="english-example">"${example.english}"</div>
        <div class="chinese-example">"${example.chinese}"</div>
      </div>`
    ).join('');
    
    examplesContainer.innerHTML = examplesHtml;
  }
}

// Initialize subpage when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Initialize the learning system
    window.learningSystem = new UnknownWordsLearningSystem();
    window.learningSystem.initialize();
    
    // Initialize dictionary service
    window.dictionaryService = new DictionaryService();
}); 