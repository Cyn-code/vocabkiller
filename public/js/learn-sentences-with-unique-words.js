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
            // Use Unified Translation Service
            if (!this.unifiedTranslationService) {
                this.unifiedTranslationService = new UnifiedTranslationService();
            }
            
            // Determine if this is vocabulary or sentence translation
            const isVocabulary = text.split(' ').length === 1 && text.length < 50;
            
            if (isVocabulary) {
                // Use vocabulary translation strategy
                const result = await this.unifiedTranslationService.translateVocabulary(text, toLang);
                return result.translation;
            } else {
                // Use sentence translation strategy
                const result = await this.unifiedTranslationService.translateSentence(text, toLang);
                return result.translation;
            }
            
        } catch (error) {
            console.error('Translation error:', error);
            return `[Translation failed: ${text}]`;
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
        this.currentFont = '\'Adobe Garamond Pro\', serif';
        this.currentFontSize = 14;
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
        this.inheritedVoiceName = null; // Voice inherited from homepage
        
        // Speech state management for popup integration
        this.mainTextPausedByPopup = false;
        this.pausedMainText = '';
        this.pausedMainTextType = '';
        this.popupUtterance = null;
        
        // Base form toggle state - default to disabled (white)
        this.baseFormEnabled = false; // Always start disabled
        
        // Translation dropdown state
        this.translationsVisible = false;
        this.translatedWordsData = null;
        this.originalWordsList = null;
        
        // Hover Read (whole text) state
        this.hoverReadEnabled = false;
        this.hoverReadActive = false;
        this.lastHoverWord = null; // track last spoken word to avoid repeats
        this.pendingHoverWord = null;
        this.hoverDwellTimer = null; // no dwell used for pointerover mode
        this.hoverPointer = null; // {x, y}
        this.hoverPointerPrev = null; // previous pointer for velocity
        this.hoverPointerPrevTs = 0;
        this.hoverRafId = null;
        this.wordByWordEnabled = false;
        this.fullSentenceEnabled = false;
        this.cleanToDisplayWord = new Map(); // map clean tokens to original display tokens (preserve apostrophes)
        
        // Collapse/Expand state for unknown words panel
        this.unknownWordsPanelCollapsed = false;
        
        // Collapse/Expand state for sentence practice panel
        this.sentencePracticePanelCollapsed = false;
        
        // Sentence selection system state
        this.currentSelection = {
            isActive: false,
            words: [],
            sentenceId: null
        };
        this.completedSentences = [];
        this.sentenceCounter = 0;
        
        // Click timing control for single/double click separation
        this.clickTimers = new Map();
        this.clickDelay = 300;
        
        // Sentence practice translation state
        this.sentencePracticeTranslationEnabled = false;
        this.sentenceTranslations = new Map(); // Cache for sentence translations
    }

    initialize() {
        // Force clear any cached lemmatization data
        this.clearAllLemmaData();
        
        this.loadData();
        this.initializePreferences();
        this.renderOriginalText();
        this.setupEventListeners();
        this.updateUnknownWordsList();
        
        // Initialize base form toggle state
        this.initializeBaseFormToggle();
        
        // Force reset base form state to ensure consistency
        this.forceResetBaseFormState();
        
        // Initialize translation status display
        this.updateTranslationStatus();

        // Initialize AI button visibility (depends on Base Form switch)
        this.updateAiButtonVisibility();
        // Prepare AI base form modal state
        this.refreshAiWordsDisplay();
        this.updateCopyPromptButtonState();
        this.resetAiPreviewState();

        
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
        
        // Initialize collapse state for unknown words panel
        this.initializeUnknownWordsPanelCollapse();
        
        // Initialize collapse state for sentence practice panel
        this.initializeSentencePracticePanelCollapse();
        
        // Initialize sentence selection system
        this.initializeSentenceSelection();
        
        // Restore sentence practice data from sessionStorage if available
        this.restoreSentencePracticeData();
    }
    
    clearAllLemmaData() {
        // Clear all possible lemmatization data
        localStorage.removeItem('userLemmaEdits');
        localStorage.removeItem('lemmaCache');
        localStorage.removeItem('spacyCache');
        localStorage.removeItem('vocabKillerBaseFormEnabled'); // Reset base form toggle to default
        localStorage.removeItem('vocabKillerBaseForms'); // Clear base form data
        sessionStorage.removeItem('lemmaData');
        sessionStorage.removeItem('spacyData');
        
        // Clear any cached unknown words that might have lemmatization
        const savedState = sessionStorage.getItem('homepageState');
        if (savedState) {
            try {
                const state = JSON.parse(savedState);
                // Remove any lemmatization data from the state
                if (state.unknownWords) {
                    // Keep only the original words, remove any lemma data
                    state.unknownWords = state.unknownWords.map(word => {
                        if (typeof word === 'object' && word.original) {
                            return word.original;
                        }
                        return word;
                    });
                    sessionStorage.setItem('homepageState', JSON.stringify(state));
                }
            } catch (e) {
                console.log('Error clearing lemma data:', e);
            }
        }
    }

    loadData() {
        // Clear ALL old lemmatization data
        localStorage.removeItem('userLemmaEdits');
        localStorage.removeItem('lemmaCache');
        sessionStorage.removeItem('lemmaData');
        
        // Clear any cached unknown words data that might have lemmatization
        const savedState = sessionStorage.getItem('homepageState');
        if (savedState) {
            const state = JSON.parse(savedState);
            this.originalText = state.originalText || '';
            this.unknownWords = new Set(state.unknownWords || []);
            console.log('Loaded unknown words from homepageState:', Array.from(this.unknownWords));
            this.currentFont = state.fontFamily || '\'Adobe Garamond Pro\', serif';
            this.currentFontSize = state.fontSize || 14;
            this.translationLanguage = state.targetLanguage || 'zh';
            
            // Load filtered segments and mode from homepage
            this.noteWords = state.noteWords || [];
            this.showParagraphs = state.showParagraphs || false;
            this.filteredSegments = state.filteredSegments || [];
            
            // Load voice settings from homepage
            if (state.selectedVoice) {
                this.inheritedVoiceName = state.selectedVoice;
                console.log('Inherited voice from homepage:', this.inheritedVoiceName);
            }
            if (state.speechSpeed) {
                this.speechSpeed = state.speechSpeed;
                console.log('Inherited speech speed from homepage:', this.speechSpeed);
            }
        } else {
            // Fallback to old format
            const savedData = sessionStorage.getItem('unknownWordsData');
            if (savedData) {
                const data = JSON.parse(savedData);
                this.originalText = data.originalText || '';
                this.unknownWords = new Set(data.unknownWords || []);
                console.log('Loaded unknown words from unknownWordsData:', Array.from(this.unknownWords));
                this.currentFont = data.fontFamily || '\'Adobe Garamond Pro\', serif';
                this.currentFontSize = data.fontSize || 14;
                this.translationLanguage = data.targetLanguage || 'zh';
            }
        }
        
        // Load unknown words from the correct sessionStorage key
        const savedUnknownWords = sessionStorage.getItem('unknownWordsList');
        if (savedUnknownWords) {
            try {
                const unknownWordsArray = JSON.parse(savedUnknownWords);
                this.unknownWords = new Set(unknownWordsArray);
                console.log('Loaded unknown words from sessionStorage:', unknownWordsArray);
            } catch (error) {
                console.error('Error loading unknown words from sessionStorage:', error);
            }
        }
        
        // Clear old data sources to prevent conflicts
        console.log('Clearing old unknown words data sources...');
        sessionStorage.removeItem('unknownWordsData');
        const homepageState = sessionStorage.getItem('homepageState');
        if (homepageState) {
            try {
                const state = JSON.parse(homepageState);
                if (state.unknownWords) {
                    state.unknownWords = [];
                    sessionStorage.setItem('homepageState', JSON.stringify(state));
                    console.log('Cleared unknownWords from homepageState');
                }
            } catch (error) {
                console.error('Error clearing homepageState unknownWords:', error);
            }
        }
    }

      renderOriginalText() {
    const container = document.getElementById('originalTextContainer');
    if (!container) {
      container.innerHTML = '<p class="text-gray-500">No text available</p>';
      return;
    }

    // Check if we have filtered segments from homepage
    if (this.filteredSegments && this.filteredSegments.length > 0) {
      // Display filtered segments (sentences or paragraphs containing selected words)
      const html = this.filteredSegments.map((segment, index) => {
        // Process words in each segment
        const words = segment.split(/\s+/);
        console.log(`Segment: "${segment}"`);
        console.log(`Split words:`, words);
        const wordsHtml = words.map(word => {
          console.log(`Raw word from split: "${word}"`);
          const cleanWord = this.cleanWord(word);
          const isUnknown = this.isWordUnknown(word);
          console.log(`Processing word: "${word}" -> cleanWord: "${cleanWord}", isUnknown: ${isUnknown}`);
          
          // Record a pretty display mapping for later list rendering
          if (cleanWord) {
            if (!this.cleanToDisplayWord.has(cleanWord)) {
              this.cleanToDisplayWord.set(cleanWord, word);
            }
          }
          
          // Always render the word span, even if cleanWord is empty
          const escapedWord = word.replace(/'/g, "\\'");
          const spanHtml = `<span class="word ${isUnknown ? 'unknown-word' : ''} word-selectable" 
                           data-word="${cleanWord || word}" 
                           onclick="learningSystem.handleWordSingleClick('${escapedWord}', this)"
                           ondblclick="learningSystem.handleWordDoubleClick('${escapedWord}', this)">
                    ${word}
                  </span>`;
          console.log(`Generated span for "${word}":`, spanHtml);
          return spanHtml;
        }).join(' ');
        
        const segmentType = this.showParagraphs ? 'paragraph' : 'sentence';
        return `<div class="segment ${segmentType}">
                  <div class="segment-header">
                    <span class="segment-label">${segmentType.charAt(0).toUpperCase() + segmentType.slice(1)} ${index + 1}</span>
                  </div>
                  <div class="segment-content">${wordsHtml}</div>
                </div>`;
      }).join('');
      
      container.innerHTML = html;
      this.originalContent = html;
      return;
    }

    // Fallback to original text if no filtered segments
    if (!this.originalText) {
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
          const isUnknown = this.isWordUnknown(word);
          console.log(`Processing word: "${word}" -> cleanWord: "${cleanWord}", isUnknown: ${isUnknown}`);
          
          // Record a pretty display mapping for later list rendering
          if (cleanWord) {
            if (!this.cleanToDisplayWord.has(cleanWord)) {
              this.cleanToDisplayWord.set(cleanWord, word);
            }
          }
          
          // Always render the word span, even if cleanWord is empty
          const escapedWord = word.replace(/'/g, "\\'");
          return `<span class="word ${isUnknown ? 'unknown-word' : ''} word-selectable" 
                           data-word="${cleanWord || word}" 
                           onclick="learningSystem.handleWordSingleClick('${escapedWord}', this)"
                           ondblclick="learningSystem.handleWordDoubleClick('${escapedWord}', this)">
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
  updateAiButtonVisibility() {
    const container = document.getElementById('aiBaseFormButtonContainer');
    if (!container) return;
    container.style.display = this.baseFormEnabled ? 'block' : 'none';
  }
  // ===== AI Base Form Workflow =====
  openAiBaseFormModal() {
    // 1. Close the "No Base Forms" popup if it's open
    this.closeNoBaseFormsPopup();
    
    // 2. Enable the Base Form switch if it's not already enabled
    if (!this.baseFormEnabled) {
      this.enableBaseFormSwitch();
    }
    
    // 3. Open the AI modal
    const modal = document.getElementById('aiBaseFormModal');
    if (modal) {
      modal.classList.remove('hidden');
      const features = document.getElementById('aiFeaturesContainer');
      const hint = document.getElementById('aiHintModal');
      const hideHintForever = localStorage.getItem('vk_hideAiBaseFormHint') === 'true';
      const shouldShowHint = !hideHintForever;
      if (hint && features) {
        if (shouldShowHint) {
          hint.style.display = 'block';
          features.style.display = 'none';
        } else {
          hint.style.display = 'none';
          features.style.display = 'block';
          this.showAiTab('copy');
          this.refreshAiWordsDisplay();
          this.updateCopyPromptButtonState();
        }
      }
    }
  }
  hideAiHintOnce() {
    const hint = document.getElementById('aiHintModal');
    const features = document.getElementById('aiFeaturesContainer');
    if (hint) hint.style.display = 'none';
    if (features) features.style.display = 'block';
    this.showAiTab('copy');
    this.refreshAiWordsDisplay();
    this.updateCopyPromptButtonState();
  }

  hideAiHintForever() {
    const hint = document.getElementById('aiHintModal');
    const features = document.getElementById('aiFeaturesContainer');
    if (hint) hint.style.display = 'none';
    if (features) features.style.display = 'block';
    try { localStorage.setItem('vk_hideAiBaseFormHint', 'true'); } catch (_) {}
    this.showAiTab('copy');
    this.refreshAiWordsDisplay();
    this.updateCopyPromptButtonState();
  }

  closeAiBaseFormModal() {
    const modal = document.getElementById('aiBaseFormModal');
    if (modal) modal.classList.add('hidden');
  }

  showAiTab(tab) {
    const isCopy = tab === 'copy';
    const copyEl = document.getElementById('aiTabCopy');
    const pasteEl = document.getElementById('aiTabPaste');
    const copyBtn = document.getElementById('aiTabCopyBtn');
    const pasteBtn = document.getElementById('aiTabPasteBtn');
    if (!copyEl || !pasteEl || !copyBtn || !pasteBtn) return;
    copyEl.style.display = isCopy ? 'block' : 'none';
    pasteEl.style.display = isCopy ? 'none' : 'block';
    copyBtn.classList.toggle('btn-invert', !isCopy);
    pasteBtn.classList.toggle('btn-invert', isCopy);
  }

  refreshAiWordsDisplay() {
    const words = Array.from(this.unknownWords || []);
    const deduped = Array.from(new Set(words.map(w => (w || '').toLowerCase()))).filter(w => w);
    const area = document.getElementById('aiWordsDisplay');
    if (area) {
      area.textContent = deduped.join(', ');
    }
  }

  updateCopyPromptButtonState() {
    const btn = document.getElementById('copyPromptBtn');
    if (!btn) return;
    const hasAny = (this.unknownWords && this.unknownWords.size > 0);
    btn.disabled = !hasAny;
  }

  buildAiPrompt() {
    const words = Array.from(this.unknownWords || []);
    const deduped = Array.from(new Set(words.map(w => (w || '').toLowerCase()))).filter(w => w);
    const header = 'Convert the following English words to their base (lemma) forms.\nReturn ONLY a JSON object like {"word":"base_form", ...}. Use lowercase for keys and values. If a word is already a base form, repeat it unchanged. No explanations.\n\nWords:';
    return `${header}\n${deduped.join(', ')}`;
  }

  async copyPromptAndWords() {
    try {
      const text = this.buildAiPrompt();
      await navigator.clipboard.writeText(text);
      this.showCustomMessage('Prompt and words copied');
    } catch (e) {
      console.error('Clipboard copy failed:', e);
      this.showCustomMessage('Failed to copy to clipboard');
    }
  }

  resetAiPreviewState() {
    const preview = document.getElementById('aiPreviewArea');
    const applyBtn = document.getElementById('applyAiBtn');
    if (preview) preview.innerHTML = '';
    if (applyBtn) applyBtn.disabled = true;
    this.aiParsedMap = null;
  }

  previewAiResults() {
    const input = document.getElementById('aiResultsInput');
    const preview = document.getElementById('aiPreviewArea');
    const applyBtn = document.getElementById('applyAiBtn');
    if (!input || !preview || !applyBtn) return;
    const text = (input.value || '').trim();
    if (!text) {
      preview.textContent = 'No input provided.';
      applyBtn.disabled = true;
      return;
    }
    // Try parse multiple formats
    const map = new Map();
    const wordsSet = new Set(Array.from(this.unknownWords || []).map(w => (w || '').toLowerCase()));
    const addPair = (w, b) => {
      const word = (w || '').toLowerCase().trim();
      const base = (b || '').toLowerCase().trim();
      if (!word || !wordsSet.has(word)) return;
      if (!base) return;
      map.set(word, base);
    };
    let parsed = false;
    try {
      const obj = JSON.parse(text);
      if (Array.isArray(obj)) {
        obj.forEach(pair => Array.isArray(pair) && pair.length >= 2 && addPair(pair[0], pair[1]));
        parsed = true;
      } else if (obj && typeof obj === 'object') {
        Object.entries(obj).forEach(([k, v]) => addPair(k, v));
        parsed = true;
      }
    } catch (_) {}
    if (!parsed) {
      // Fallback: line-based parsing
      const lines = text.split(/\n+/);
      for (const line of lines) {
        const m = line.match(/\s*([^:>,-]+)\s*(?:[:>-]|,)?\s*([^\s,>]+)\s*$/);
        if (m) addPair(m[1], m[2]);
      }
    }
    if (map.size === 0) {
      preview.textContent = 'Could not parse any word → base form pairs.';
      applyBtn.disabled = true;
      this.aiParsedMap = null;
      return;
    }
    // Render preview table
    const rows = Array.from(map.entries()).map(([w, b]) => `<tr><td style="padding:4px 8px; border:1px solid #e5e7eb;">${w}</td><td style="padding:4px 8px; border:1px solid #e5e7eb;">${b}</td></tr>`).join('');
    preview.innerHTML = `<table style="border-collapse:collapse; font-size:14px;"><thead><tr><th style="padding:4px 8px; border:1px solid #e5e7eb; text-align:left;">Word</th><th style=\"padding:4px 8px; border:1px solid #e5e7eb; text-align:left;\">Base form</th></tr></thead><tbody>${rows}</tbody></table>`;
    applyBtn.disabled = false;
    this.aiParsedMap = map;
  }

  applyAiBaseForms() {
    if (!this.aiParsedMap || this.aiParsedMap.size === 0) return;
    for (const [word, base] of this.aiParsedMap.entries()) {
      this.saveBaseForm(word, base);
    }
    this.updateUnknownWordsList();
    this.showCustomMessage('Base forms updated');
    this.closeAiBaseFormModal();
  }

  // No Unknown Words Popup Functions
  showNoUnknownWordsPopup() {
    const modal = document.getElementById('noUnknownWordsPopup');
    if (modal) modal.classList.remove('hidden');
  }

  closeNoUnknownWordsPopup() {
    const modal = document.getElementById('noUnknownWordsPopup');
    if (modal) modal.classList.add('hidden');
  }

  // No Base Forms Popup Functions
  showNoBaseFormsPopup() {
    const modal = document.getElementById('noBaseFormsPopup');
    if (modal) modal.classList.remove('hidden');
  }

  closeNoBaseFormsPopup() {
    const modal = document.getElementById('noBaseFormsPopup');
    if (modal) modal.classList.add('hidden');
  }

  // Open Learn Original Words subpage
  openLearnOriginalWords() {
    // Save current state to sessionStorage for original typing game
    const currentState = {
      unknownWords: Array.from(this.unknownWords),
      originalText: this.originalText,
      fontFamily: this.currentFont,
      fontSize: this.currentFontSize,
      targetLanguage: this.translationLanguage,
      selectedVoice: this.selectedVoice ? this.selectedVoice.name : null,
      speechSpeed: this.speechSpeed
    };
    
    // Use the correct session storage key for original typing game
    sessionStorage.setItem('learnUnknownWords2Data', JSON.stringify(currentState));
    
    // Close popup and open original typing game
    this.closeNoBaseFormsPopup();
    this.hideLearningOptions();
    window.open('/learn-original-words-typing-game.html', '_blank');
  }

  // Enable Base Form switch
  enableBaseFormSwitch() {
    if (!this.baseFormEnabled) {
      this.baseFormEnabled = true;
      localStorage.setItem('vocabKillerBaseFormEnabled', 'true');
      
      // Update toggle button appearance
      const toggleBtn = document.querySelector('.base-form-toggle-btn');
      if (toggleBtn) {
        toggleBtn.classList.add('enabled');
      }
      
      // Update AI button visibility
      try { this.updateAiButtonVisibility(); } catch (_) {}

      // Show all base form displays
      const baseFormDisplays = document.querySelectorAll('.base-form-display');
      baseFormDisplays.forEach(display => {
        display.classList.remove('hidden');
      });
      
      // Show base form input containers for words without saved base forms
      const baseFormInputContainers = document.querySelectorAll('.base-form-input-container');
      baseFormInputContainers.forEach(container => {
        const wordItem = container.closest('[data-word]');
        if (wordItem) {
          const word = wordItem.getAttribute('data-word');
          const savedBaseForm = this.loadBaseForm(word);
          if (!savedBaseForm) {
            container.classList.remove('hidden');
          }
        }
      });
      
      // Update the word list to reflect the new state
      this.updateUnknownWordsList();
    }
  }

    cleanWord(word) {
        // First trim whitespace
        let cleaned = word.trim();
        
        // Remove trailing punctuation (question marks, exclamation marks, periods, etc.)
        cleaned = cleaned.replace(/[.!?]+$/, '');
        
        // Remove leading punctuation
        cleaned = cleaned.replace(/^[.!?]+/, '');
        
        // Convert to lowercase and remove any remaining non-alphanumeric characters except apostrophes
        cleaned = cleaned.toLowerCase().replace(/[^a-z0-9']/g, '');
        
        console.log(`cleanWord: "${word}" -> "${cleaned}"`);
        return cleaned;
    }

    // Helper method to check if a word is in unknownWords (handles both formats)
    isWordUnknown(word) {
        console.log(`isWordUnknown checking: "${word}"`);
        console.log(`unknownWords contents:`, Array.from(this.unknownWords));
        
        // First try the original word
        if (this.unknownWords.has(word)) {
            console.log(`Found "${word}" in unknownWords (original)`);
            return true;
        }
        // Then try the cleaned version
        const cleanWord = this.cleanWord(word);
        const found = this.unknownWords.has(cleanWord);
        console.log(`Checking cleaned "${cleanWord}" in unknownWords: ${found}`);
        return found;
    }

    // Remove surrounding punctuation like commas/periods/quotes while keeping internal apostrophes (e.g., wouldn't)
    sanitizeDisplayWord(originalWord) {
        if (!originalWord) return originalWord;
        // Trim whitespace first
        let sanitized = String(originalWord).trim();
        // Strip leading and trailing punctuation (but not internal apostrophes/hyphens)
        sanitized = sanitized.replace(/^[^A-Za-z0-9]+/, '').replace(/[^A-Za-z0-9]+$/, '');
        return sanitized;
    }

      async showDictionary(event, word) {
    console.log(`showDictionary called with word: "${word}"`);
    console.log(`Event target:`, event.target);
    
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
            // Store the cleaned version of the word (without punctuation) for consistent matching
            const cleanedWord = this.cleanWord(this.currentPopupWord);
            this.unknownWords.add(cleanedWord);
            this.saveUnknownWords();
            this.updateWordDisplay(this.currentPopupWord);
            this.updateUnknownWordsList();
            this.closePopup();
        }
    }
    
    removeFromUnknownWords() {
        if (this.currentPopupWord) {
            // Try both original and cleaned versions for removal
            const cleanedWord = this.cleanWord(this.currentPopupWord);
            if (this.unknownWords.has(this.currentPopupWord)) {
                this.unknownWords.delete(this.currentPopupWord);
                this.saveUnknownWords();
                this.updateWordDisplay(this.currentPopupWord);
                this.updateUnknownWordsList();
                this.closePopup();
            } else if (this.unknownWords.has(cleanedWord)) {
                this.unknownWords.delete(cleanedWord);
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
        
        // Smart cache management - Option E
        this.updateTranslationCache(words);
        
        // Update word count
        countContainer.innerHTML = `
            <div class="word-count">${words.length} unknown word${words.length !== 1 ? 's' : ''}</div>
        `;
        
        if (words.length === 0) {
            listContainer.innerHTML = '<div class="text-gray-500 text-center py-8">No unknown words added yet</div>';
            try { this.refreshAiWordsDisplay(); this.updateCopyPromptButtonState(); } catch (_) {}
            return;
        }
        
        // Process words WITHOUT any lemmatization - clean display only
        const wordElements = [];
        for (const word of words) {
            // Ensure we only show the original word, no lemma data
            const cleanWord = typeof word === 'object' ? word.original || word.lemma || word : word;
            const savedBaseForm = this.loadBaseForm(cleanWord);
            const displayWord = this.sanitizeDisplayWord(this.cleanToDisplayWord.get(cleanWord) || cleanWord);
            
            const wordElement = `
                <div class="unknown-word-item" data-word="${cleanWord}">
                    <div class="word-info">
                        <span class="unknown-word-text" onclick="learningSystem.toggleBaseFormInput('${cleanWord}')" style="cursor: pointer;">${displayWord}</span>
                        ${this.baseFormEnabled ? `
                            <span class="base-form-display ${savedBaseForm ? '' : 'hidden'}" onclick="event.stopPropagation(); learningSystem.toggleBaseFormInput('${cleanWord}')" style="cursor: pointer;">${savedBaseForm || ''}</span>
                            <button class="edit-base-form-btn ${savedBaseForm ? '' : 'hidden'}" onclick="event.stopPropagation(); learningSystem.reEditBaseForm('${cleanWord}')" title="Edit base form" style="padding: 4px; margin-left: 8px;"><img src="/images/Edit.svg" alt="Edit" style="width: 20px; height: 20px;" /></button>
                            <div class="base-form-input-container ${savedBaseForm ? 'hidden' : ''}">
                                <input type="text" class="base-form-input" 
                                       placeholder="Base form" 
                                       value="${savedBaseForm}"
                                       data-word="${cleanWord}" 
                                       onkeypress="learningSystem.handleBaseFormKeypress(event, '${cleanWord}')"
                                       onblur="learningSystem.saveBaseForm('${cleanWord}', this.value)"
                                       title="Enter the base form of this word to study the root form">
                                <button class="tick-btn" onclick="learningSystem.completeBaseForm('${cleanWord}')" title="Complete">
                                    ✓
                                </button>
                            </div>
                        ` : ''}
                    </div>
                    <div class="unknown-word-actions">
                        <button class="speak-word-btn" onclick="learningSystem.speakUnknownWord('${cleanWord}')" title="Speak word">
                            <img src="/images/ReadText.svg" alt="Speak" />
                        </button>
                        <button class="remove-word-btn" onclick="learningSystem.removeWordFromList('${cleanWord}')" title="Remove from list">
                            <img src="/images/Remove.svg" alt="Remove" />
                        </button>
                    </div>
                </div>
            `;
            

            wordElements.push(wordElement);
        }
        
        listContainer.innerHTML = wordElements.join('');
        
        // Apply current font and font size to all unknown word items
        const unknownWordItems = listContainer.querySelectorAll('.unknown-word-item');
        unknownWordItems.forEach(item => {
          item.style.fontFamily = this.currentFont;
          item.style.fontSize = this.currentFontSize + 'px';
        });
        
        // Force remove any lemmatization display that might have been added
        setTimeout(() => {
            this.removeAllLemmaDisplay();
        }, 100);
        
        // Set up continuous monitoring to prevent lemmatization from being added
        this.startLemmaMonitoring();
        // Refresh AI modal state when list changes
        try { this.refreshAiWordsDisplay(); this.updateCopyPromptButtonState(); } catch (_) {}
    }
    
    updateTranslationCache(currentWords) {
        // If no translated data exists, nothing to clean
        if (!this.translatedWordsData) return;
        
        const oldWords = this.translatedWordsData.map(item => item.originalWord);
        const newWords = currentWords;
        
        // Keep translations for words that still exist
        const updatedTranslatedWords = this.translatedWordsData.filter(item => 
            newWords.includes(item.originalWord)
        );
        
        // Find words that need new translations
        const wordsToTranslate = newWords.filter(word => 
            !updatedTranslatedWords.some(item => item.originalWord === word)
        );
        
        // Update the cache with filtered data
        this.translatedWordsData = updatedTranslatedWords;
        
        // If there are new words to translate, do it in the background
        if (wordsToTranslate.length > 0) {
            console.log(`Found ${wordsToTranslate.length} new words to translate:`, wordsToTranslate);
            // Don't block the UI - translate in background
            this.translateSpecificWords(wordsToTranslate);
        }
    }
    
    async translateSpecificWords(wordsToTranslate) {
        if (wordsToTranslate.length === 0) return;
        
        const targetLanguage = document.getElementById('translationLanguageSelect')?.value || 'zh';
        const isBaseFormMode = this.baseFormEnabled;
        
        try {
            const newTranslatedWords = [];
            
            for (const word of wordsToTranslate) {
                try {
                    const baseForm = this.loadBaseForm(word);
                    let translations = [];
                    
                    // Always translate the original word
                    const originalTranslation = await this.dictionaryService.getWordTranslation(word, targetLanguage);
                    translations.push({ word: word, translation: originalTranslation, type: 'original' });
                    
                    // If base form mode is enabled and base form exists and is different from original word, translate it too
                    if (isBaseFormMode && baseForm && baseForm.trim() !== '' && baseForm.toLowerCase() !== word.toLowerCase()) {
                        try {
                            const baseFormTranslation = await this.dictionaryService.getWordTranslation(baseForm, targetLanguage);
                            translations.push({ word: baseForm, translation: baseFormTranslation, type: 'base-form' });
                        } catch (error) {
                            console.error(`Base form translation error for "${baseForm}":`, error);
                            translations.push({ word: baseForm, translation: '[Base form translation failed]', type: 'base-form' });
                        }
                    }
                    
                    newTranslatedWords.push({ originalWord: word, baseForm: baseForm, translations: translations });
                } catch (error) {
                    console.error(`Translation error for word "${word}":`, error);
                    newTranslatedWords.push({ 
                        originalWord: word, 
                        baseForm: null, 
                        translations: [{ word: word, translation: '[Translation failed]', type: 'original' }] 
                    });
                }
            }
            
            // Add new translations to existing cache
            if (this.translatedWordsData) {
                this.translatedWordsData = [...this.translatedWordsData, ...newTranslatedWords];
            } else {
                this.translatedWordsData = newTranslatedWords;
            }
            
            console.log('Translation cache updated with new words');
            
        } catch (error) {
            console.error('Background translation error:', error);
        }
    }
    
    removeAllLemmaDisplay() {
        // Remove any lemma display elements that might exist
        const listContainer = document.getElementById('unknownWordsList');
        if (!listContainer) return;
        
        // Remove any elements with lemma-related classes or content
        const lemmaElements = listContainer.querySelectorAll('.lemma-display, .edit-lemma-btn, [data-lemma]');
        lemmaElements.forEach(el => el.remove());
        
        // Remove any text that looks like lemmatization (e.g., "/ word")
        const wordItems = listContainer.querySelectorAll('.unknown-word-item');
        wordItems.forEach(item => {
            const textElement = item.querySelector('.unknown-word-text');
            if (textElement) {
                // Remove any text that contains "/" which indicates lemmatization
                const text = textElement.textContent;
                if (text.includes('/')) {
                    // Keep only the original word, remove the lemma part
                    const originalWord = text.split('/')[0].trim();
                    textElement.textContent = originalWord;
                }
                
                // Remove any emojis (📖, ✏️, etc.)
                const cleanText = textElement.textContent.replace(/[📖✏️🔊➖]/g, '').trim();
                textElement.textContent = cleanText;
            }
        });
        
        // Also check for any spans or other elements that might contain lemmatization
        const allSpans = listContainer.querySelectorAll('span');
        allSpans.forEach(span => {
            const text = span.textContent;
            if (text.includes('/') || text.includes('📖') || text.includes('✏️')) {
                // Remove the entire span if it contains lemmatization
                span.remove();
            }
        });
    }
    
    startLemmaMonitoring() {
        // Continuously monitor and remove any lemmatization that gets added
        setInterval(() => {
            this.removeAllLemmaDisplay();
        }, 1000); // Check every second
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
    
    initializeBaseFormToggle() {
        // Clear any existing state to ensure clean start
        localStorage.removeItem('vocabKillerBaseFormEnabled');
        localStorage.removeItem('vocabKillerBaseForms');
        
        // Always start with disabled state
        this.baseFormEnabled = false;
        localStorage.setItem('vocabKillerBaseFormEnabled', 'false');
        
        console.log('Initializing base form toggle, baseFormEnabled:', this.baseFormEnabled);
        // Ensure AI button visibility matches toggle on init
        try { this.updateAiButtonVisibility(); } catch (_) {}
        
        // Update toggle button appearance
        const toggleBtn = document.querySelector('.base-form-toggle-btn');
        if (toggleBtn) {
            toggleBtn.classList.remove('enabled');
            console.log('Toggle button enabled state:', this.baseFormEnabled);
        }
        
        // Hint is always visible
        const hint = document.getElementById('baseFormHint');
        if (hint) {
            hint.style.display = 'block';
        }
        
        // Force update the word list to reflect the disabled state
        setTimeout(() => {
            this.updateUnknownWordsList();
        }, 100);
    }
    
    forceResetBaseFormState() {
        // Force reset all base form related state
        this.baseFormEnabled = false;
        localStorage.setItem('vocabKillerBaseFormEnabled', 'false');
        
        // Clear all base form data
        localStorage.removeItem('vocabKillerBaseForms');
        
        // Update toggle button to OFF state
        const toggleBtn = document.querySelector('.base-form-toggle-btn');
        if (toggleBtn) {
            toggleBtn.classList.remove('enabled');
        }
        
        // Hide all base form displays
        const baseFormDisplays = document.querySelectorAll('.base-form-display');
        baseFormDisplays.forEach(display => {
            display.classList.add('hidden');
        });
        
        // Hide all base form input containers
        const baseFormInputContainers = document.querySelectorAll('.base-form-input-container');
        baseFormInputContainers.forEach(container => {
            container.classList.add('hidden');
        });
        
        console.log('Base form state force reset to disabled');
        
        // Update the word list to reflect the reset state
        this.updateUnknownWordsList();
    }
    
    reEditBaseForm(word) {
        if (!this.baseFormEnabled) return;
        
        // Use a more specific selector to get the main container div, not the span
        const wordItem = document.querySelector(`.unknown-word-item[data-word="${word}"]`);
        if (!wordItem) return;
        
        const inputContainer = wordItem.querySelector('.base-form-input-container');
        const display = wordItem.querySelector('.base-form-display');
        const editBtn = wordItem.querySelector('.edit-base-form-btn');
        
        if (inputContainer) {
            // Show input container
            inputContainer.classList.remove('hidden');
            
            const input = inputContainer.querySelector('.base-form-input');
            if (input) {
                // Load the current base form value into the input
                const currentBaseForm = this.loadBaseForm(word);
                input.value = currentBaseForm;
                input.focus();
                input.select(); // Select existing text for easy editing
            }
            
            // Hide display and edit button
            if (display) {
                display.classList.add('hidden');
            }
            if (editBtn) {
                editBtn.classList.add('hidden');
            }
        }
    }
    
    toggleBaseForm() {
        this.baseFormEnabled = !this.baseFormEnabled;
        localStorage.setItem('vocabKillerBaseFormEnabled', this.baseFormEnabled);
        

        
        // Update toggle button appearance
        const toggleBtn = document.querySelector('.base-form-toggle-btn');
        if (toggleBtn) {
            toggleBtn.classList.toggle('enabled', this.baseFormEnabled);

        }
        
        // Update AI button visibility with the new toggle state
        try { this.updateAiButtonVisibility(); } catch (_) {}

        // Show/hide all base form displays based on toggle state
        const baseFormDisplays = document.querySelectorAll('.base-form-display');
        baseFormDisplays.forEach(display => {
            if (this.baseFormEnabled) {
                display.classList.remove('hidden');
            } else {
                display.classList.add('hidden');
            }
        });
        
        // Show/hide all base form input containers based on toggle state
        const baseFormInputContainers = document.querySelectorAll('.base-form-input-container');
        baseFormInputContainers.forEach(container => {
            if (this.baseFormEnabled) {
                // Only show if there's no saved base form (for new words)
                const wordItem = container.closest('[data-word]');
                if (wordItem) {
                    const word = wordItem.getAttribute('data-word');
                    const savedBaseForm = this.loadBaseForm(word);
                    if (!savedBaseForm) {
                        container.classList.remove('hidden');
                    }
                }
            } else {
                container.classList.add('hidden');
            }
        });
        
        // Update the word list to reflect the new state
        this.updateUnknownWordsList();
    }
    
    toggleBaseFormInput(word) {
        if (!this.baseFormEnabled) return;
        
        // Use a more specific selector to get the main container div, not the span
        const wordItem = document.querySelector(`.unknown-word-item[data-word="${word}"]`);
        if (!wordItem) return;
        
        const inputContainer = wordItem.querySelector('.base-form-input-container');
        const display = wordItem.querySelector('.base-form-display');
        
        if (inputContainer && inputContainer.classList.contains('hidden')) {
            // Show input container, hide display and edit button
            inputContainer.classList.remove('hidden');
            const input = inputContainer.querySelector('.base-form-input');
            if (input) {
                // Load the current base form value into the input
                const currentBaseForm = this.loadBaseForm(word);
                input.value = currentBaseForm;
                input.focus();
                input.select(); // Select existing text for easy editing
            }
            if (display) {
                display.classList.add('hidden');
            }
            // Hide edit button if it exists
            const editBtn = wordItem.querySelector('.edit-base-form-btn');
            if (editBtn) {
                editBtn.classList.add('hidden');
            }
        } else if (inputContainer) {
            // Hide input container, show display and edit button
            inputContainer.classList.add('hidden');
            if (display) display.classList.remove('hidden');
            // Show edit button if it exists
            const editBtn = wordItem.querySelector('.edit-base-form-btn');
            if (editBtn) {
                editBtn.classList.remove('hidden');
            }
        } else {
            // If no input container exists but base form is enabled, we need to create one
            if (this.baseFormEnabled) {
                this.updateUnknownWordsList();
            }
        }
    }
    
    handleBaseFormKeypress(event, word) {
        if (event.key === 'Enter') {
            this.completeBaseForm(word);
        }
    }
    
    completeBaseForm(word) {
        // Use a more specific selector to get the main container div, not the span
        const wordItem = document.querySelector(`.unknown-word-item[data-word="${word}"]`);
        if (!wordItem) return;
        
        const input = wordItem.querySelector('.base-form-input');
        const baseForm = input ? input.value.trim() : '';
        
        if (baseForm) {
            this.saveBaseForm(word, baseForm);
        }
        
        // Hide the input container immediately
        const inputContainer = wordItem.querySelector('.base-form-input-container');
        if (inputContainer) {
            inputContainer.classList.add('hidden');
        }
        
        // Show the base form display immediately
        const display = wordItem.querySelector('.base-form-display');
        if (display) {
            display.classList.remove('hidden');
            display.textContent = baseForm;
        }
        
        // Show the edit button
        const editBtn = wordItem.querySelector('.edit-base-form-btn');
        if (editBtn) {
            editBtn.classList.remove('hidden');
        }
        
        // Don't call updateUnknownWordsList() here as it regenerates HTML and loses the immediate display
        // The display and edit button are already updated above
        
        // If translations are visible, update the translation text to include the new base form
        if (this.translationsVisible && this.translatedWordsData) {
            this.updateTranslationForBaseForm(word, baseForm);
        }
        
        // Auto-navigate to next base form input
        this.navigateToNextBaseFormInput(word);
    }
    
    navigateToNextBaseFormInput(currentWord) {
        // Get all unknown words
        const words = Array.from(this.unknownWords);
        const currentIndex = words.indexOf(currentWord);
        
        if (currentIndex === -1 || currentIndex === words.length - 1) {
            // If it's the last word or word not found, don't navigate
            return;
        }
        
        // Find the next word that doesn't have a base form yet
        for (let i = currentIndex + 1; i < words.length; i++) {
            const nextWord = words[i];
            const savedBaseForm = this.loadBaseForm(nextWord);
            
            // If the next word doesn't have a base form, open its input
            if (!savedBaseForm || savedBaseForm.trim() === '') {
                // Small delay to ensure the current input is properly closed
                setTimeout(() => {
                    this.openBaseFormInput(nextWord);
                }, 100);
                return;
            }
        }
        
        // If all remaining words have base forms, show a message
        this.showCustomMessage('All words have base forms!');
        setTimeout(() => this.hideCustomMessage(), 2000);
    }
    
    openBaseFormInput(word) {
        if (!this.baseFormEnabled) return;
        
        // Use a more specific selector to get the main container div, not the span
        const wordItem = document.querySelector(`.unknown-word-item[data-word="${word}"]`);
        if (!wordItem) return;
        
        const inputContainer = wordItem.querySelector('.base-form-input-container');
        const display = wordItem.querySelector('.base-form-display');
        const editBtn = wordItem.querySelector('.edit-base-form-btn');
        
        if (inputContainer) {
            // Show input container, hide display and edit button
            inputContainer.classList.remove('hidden');
            
            const input = inputContainer.querySelector('.base-form-input');
            if (input) {
                // Clear the input for new entry
                input.value = '';
                input.focus();
            }
            
            if (display) {
                display.classList.add('hidden');
            }
            
            if (editBtn) {
                editBtn.classList.add('hidden');
            }
        } else {
            // If no input container exists but base form is enabled, we need to create one
            if (this.baseFormEnabled) {
                this.updateUnknownWordsList();
                // Try to open the input again after the list is updated
                setTimeout(() => {
                    this.openBaseFormInput(word);
                }, 50);
            }
        }
    }
    
    updateTranslationForBaseForm(word, baseForm) {
        // Find the word in translatedWordsData and update its base form
        const wordData = this.translatedWordsData.find(item => item.originalWord === word);
        if (wordData) {
            wordData.baseForm = baseForm;
            
            // Update the translation text in the DOM
            const wordItem = document.querySelector(`.unknown-word-item[data-word="${word}"]`);
            if (wordItem) {
                const translationDiv = wordItem.querySelector('.translation-text');
                if (translationDiv) {
                    const originalTranslation = wordData.translations.find(t => t.type === 'original');
                    const baseFormTranslation = wordData.translations.find(t => t.type === 'base-form');
                    
                    let translationText = originalTranslation.translation;
                    if (baseForm && baseForm.trim() !== '' && baseForm.toLowerCase() !== word.toLowerCase()) {
                        if (baseFormTranslation && baseFormTranslation.translation) {
                            translationText += ` / ${baseFormTranslation.translation}`;
                        } else {
                            // Try to translate the base form on the fly
                            const targetLanguage = document.getElementById('translationLanguageSelect')?.value || 'zh';
                            this.dictionaryService.getWordTranslation(baseForm, targetLanguage).then(baseFormTrans => {
                                translationText += ` / ${baseFormTrans}`;
                                translationDiv.textContent = translationText;
                            }).catch(error => {
                                console.error('Failed to translate base form on the fly:', error);
                            });
                        }
                    }
                    translationDiv.textContent = translationText;
                }
            }
        }
    }
    
    saveBaseForm(word, baseForm) {
        if (baseForm && baseForm.trim()) {
            // Save base form to localStorage
            const baseForms = JSON.parse(localStorage.getItem('vocabKillerBaseForms') || '{}');
            baseForms[word] = baseForm.trim();
            localStorage.setItem('vocabKillerBaseForms', JSON.stringify(baseForms));
            
            // Show a brief confirmation
            this.showCustomMessage(`Base form "${baseForm.trim()}" saved for "${word}"`);
            setTimeout(() => this.hideCustomMessage(), 2000);
        }
    }
    
    loadBaseForm(word) {
        const baseForms = JSON.parse(localStorage.getItem('vocabKillerBaseForms') || '{}');
        return baseForms[word] || '';
    }
    
    speakUnknownWord(word) {
        if (this.selectedVoice && 'speechSynthesis' in window) {
            // Only include base form in speech if base form toggle is enabled
            let textToSpeak = word;
            
            if (this.baseFormEnabled) {
                const baseForm = this.loadBaseForm(word);
                if (baseForm) {
                    textToSpeak = `${word} ${baseForm}`;
                }
            }
            
            const utterance = new SpeechSynthesisUtterance(textToSpeak);
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
        
        // Check if Base Form mode is enabled to determine translation behavior
        const isBaseFormMode = this.baseFormEnabled;
        
        const targetLanguage = document.getElementById('translationLanguageSelect')?.value || 'zh';
        const listContainer = document.getElementById('unknownWordsList');
        
        if (!listContainer) return;
        
        try {
            // Show loading state based on mode
            const loadingMessage = isBaseFormMode ? 'Translating words and base forms...' : 'Translating words...';
            listContainer.innerHTML = `<div class="text-gray-500 text-center py-8">${loadingMessage}</div>`;
            
            // Translate each word and its base form if it exists
            const translatedWords = [];
            for (const word of words) {
                try {
                    const baseForm = this.loadBaseForm(word);
                    let translations = [];
                    
                    // Always translate the original word
                    const originalTranslation = await this.dictionaryService.getWordTranslation(word, targetLanguage);
                    translations.push({ word: word, translation: originalTranslation, type: 'original' });
                    
                    // If base form mode is enabled and base form exists and is different from original word, translate it too
                    if (isBaseFormMode && baseForm && baseForm.trim() !== '' && baseForm.toLowerCase() !== word.toLowerCase()) {
                        try {
                            const baseFormTranslation = await this.dictionaryService.getWordTranslation(baseForm, targetLanguage);
                            translations.push({ word: baseForm, translation: baseFormTranslation, type: 'base-form' });
                        } catch (error) {
                            console.error(`Base form translation error for "${baseForm}":`, error);
                            translations.push({ word: baseForm, translation: '[Base form translation failed]', type: 'base-form' });
                        }
                    }
                    
                    translatedWords.push({ originalWord: word, baseForm: baseForm, translations: translations });
                } catch (error) {
                    console.error(`Translation error for word "${word}":`, error);
                    translatedWords.push({ 
                        originalWord: word, 
                        baseForm: null, 
                        translations: [{ word: word, translation: '[Translation failed]', type: 'original' }] 
                    });
                }
            }
            
            // Store the translated data
            this.translatedWordsData = translatedWords;
            
            // Display translated words
            this.displayTranslatedWords(translatedWords);
            
        } catch (error) {
            console.error('Translation error:', error);
            listContainer.innerHTML = '<div class="text-red-500 text-center py-8">Translation failed. Please try again.</div>';
        }
    }
    
    displayTranslatedWords(translatedWords) {
        const listContainer = document.getElementById('unknownWordsList');
        if (!listContainer) return;
        
        const isBaseFormMode = this.baseFormEnabled;
        
        const html = translatedWords.map(({ originalWord, baseForm, translations }) => {
            const originalTranslation = translations.find(t => t.type === 'original');
            const baseFormTranslation = translations.find(t => t.type === 'base-form');
            
            // Get the saved base form from localStorage (same as hideTranslations)
            const savedBaseForm = this.loadBaseForm(originalWord);
            

            
            let translationText = '';
            
            // Check for custom translation first
            const customTranslation = this.loadCustomTranslation(originalWord);
            const displayTranslation = customTranslation || originalTranslation.translation;
            
            if (isBaseFormMode && savedBaseForm && savedBaseForm.trim() !== '' && savedBaseForm.toLowerCase() !== originalWord.toLowerCase()) {
                // Base Form ON mode: Show translations for both original and base form
                translationText = `${displayTranslation}`;
                if (baseFormTranslation && baseFormTranslation.translation) {
                    translationText += ` / ${baseFormTranslation.translation}`;
                } else {
                    // If base form translation is missing, try to translate it on the fly
                    console.log('Base form translation missing for:', savedBaseForm);
                    // Try to translate the base form on the fly
                    try {
                        const targetLanguage = document.getElementById('translationLanguageSelect')?.value || 'zh';
                        this.dictionaryService.getWordTranslation(savedBaseForm, targetLanguage).then(baseFormTrans => {
                            translationText += ` / ${baseFormTrans}`;
                            // Update the display
                            const translationDiv = document.querySelector(`[data-word="${originalWord}"] .translation-text`);
                            if (translationDiv) {
                                translationDiv.textContent = translationText;
                            }
                        }).catch(error => {
                            console.error('Failed to translate base form on the fly:', error);
                        });
                    } catch (error) {
                        console.error('Error translating base form on the fly:', error);
                    }
                }
            } else {
                // Base Form OFF mode or no base form set: Show only original word translation
                translationText = displayTranslation;
            }
            
            return `
                <div class="unknown-word-item" data-word="${originalWord}">
                    <div style="display: flex; flex-direction: column; width: 100%;">
                        <div class="word-info">
                            <span class="unknown-word-text" onclick="learningSystem.toggleBaseFormInput('${originalWord}')" style="cursor: pointer;">${originalWord}</span>
                            ${isBaseFormMode ? `
                                <span class="base-form-display ${savedBaseForm ? '' : 'hidden'}" onclick="event.stopPropagation(); learningSystem.toggleBaseFormInput('${originalWord}')" style="cursor: pointer;">     ${savedBaseForm || ''}</span>
                                <button class="edit-base-form-btn ${savedBaseForm ? '' : 'hidden'}" onclick="event.stopPropagation(); learningSystem.reEditBaseForm('${originalWord}')" title="Edit base form" style="padding: 4px; margin-left: 8px;"><img src="/images/Edit.svg" alt="Edit" style="width: 20px; height: 20px;" /></button>
                                <div class="base-form-input-container ${savedBaseForm ? 'hidden' : ''}">
                                    <input type="text" class="base-form-input" 
                                           placeholder="Base form" 
                                           value="${savedBaseForm}"
                                           data-word="${originalWord}" 
                                           onkeypress="learningSystem.handleBaseFormKeypress(event, '${originalWord}')"
                                           onblur="learningSystem.saveBaseForm('${originalWord}', this.value)"
                                           title="Enter the base form of this word to study the root form">
                                    <button class="tick-btn" onclick="learningSystem.completeBaseForm('${originalWord}')" title="Complete">
                                        ✓
                                    </button>
                                </div>
                            ` : ''}
                        </div>
                        <div class="translation-container" style="margin-top: 8px; display: flex; align-items: center; justify-content: space-between; gap: 6px;">
                            <div class="translation-text" 
                                 onclick="learningSystem.toggleTranslationEdit('${originalWord}')" 
                                 style="font-size: 11px; color: #666; flex: 1 1 auto; cursor: pointer; padding: 2px 4px; border-radius: 3px; transition: background-color 0.2s; user-select: none;"
                                 onmouseover="this.style.backgroundColor='#f0f0f0'"
                                 onmouseout="this.style.backgroundColor='transparent'"
                                 data-word="${originalWord}">${translationText}</div>
                            <div class="translation-actions" style="flex: 0 0 auto; display: flex; align-items: center; gap: 6px;">
                                <button class="edit-translation-btn" 
                                        onclick="learningSystem.onClickEditTranslation(event, '${originalWord}')" 
                                        title="Edit translation"
                                        style="padding: 1px 3px; background: none; border: none; cursor: pointer; opacity: 0.7;">
                                        <img src="/images/edit2.svg" alt="Edit" style="width: 12px; height: 12px;" />
                                </button>
                            </div>
                        </div>
                    </div>
                    <div class="unknown-word-actions">
                        <button class="speak-word-btn" onclick="learningSystem.speakUnknownWord('${originalWord}')" title="Speak word">
                            <img src="/images/ReadText.svg" alt="Speak" />
                        </button>
                        <button class="remove-word-btn" onclick="learningSystem.removeWordFromList('${originalWord}')" title="Remove from list">
                            <img src="/images/Remove.svg" alt="Remove" />
                        </button>
                    </div>
                </div>
            `;
        }).join('');
        
        listContainer.innerHTML = html;
        this.translationsVisible = true;
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
        
        if (this.translatedWordsData) {
            // Use cached translations
            this.displayTranslatedWords(this.translatedWordsData);
        } else {
            // Need to translate first
            this.translateUnknownWords();
        }
        this.updateTranslationStatus();
    }
    
    hideTranslations() {
        if (!this.translationsVisible) return; // Already hidden
        
        // Show words without translations, preserving base forms if enabled
        const listContainer = document.getElementById('unknownWordsList');
        if (!listContainer) return;
        
        const words = Array.from(this.unknownWords);
        if (words.length === 0) {
            listContainer.innerHTML = '<div class="text-gray-500 text-center py-8">No unknown words added yet</div>';
            this.translationsVisible = false;
            return;
        }
        
        // Display words without translations, but preserve base forms if enabled
        const wordElements = [];
        for (const word of words) {
            const cleanWord = typeof word === 'object' ? word.original || word.lemma || word : word;
            const savedBaseForm = this.loadBaseForm(cleanWord);
            
            const wordElement = `
                <div class="unknown-word-item" data-word="${cleanWord}">
                    <div class="word-info">
                        <span class="unknown-word-text" onclick="learningSystem.toggleBaseFormInput('${cleanWord}')" style="cursor: pointer;">${cleanWord}</span>
                        ${this.baseFormEnabled ? `
                            <span class="base-form-display ${savedBaseForm ? '' : 'hidden'}" onclick="event.stopPropagation(); learningSystem.toggleBaseFormInput('${cleanWord}')" style="cursor: pointer;">     ${savedBaseForm || ''}</span>

                            <button class="edit-base-form-btn ${savedBaseForm ? '' : 'hidden'}" onclick="event.stopPropagation(); learningSystem.reEditBaseForm('${cleanWord}')" title="Edit base form" style="padding: 4px; margin-left: 8px;"><img src="/images/Edit.svg" alt="Edit" style="width: 20px; height: 20px;" /></button>
                            <div class="base-form-input-container ${savedBaseForm ? 'hidden' : ''}">
                                <input type="text" class="base-form-input" 
                                       placeholder="Base form" 
                                       value="${savedBaseForm}"
                                       data-word="${cleanWord}" 
                                       onkeypress="learningSystem.handleBaseFormKeypress(event, '${cleanWord}')"
                                       onblur="learningSystem.saveBaseForm('${cleanWord}', this.value)"
                                       title="Enter the base form of this word to study the root form">
                                <button class="tick-btn" onclick="learningSystem.completeBaseForm('${cleanWord}')" title="Complete">
                                    ✓
                                </button>
                            </div>
                        ` : ''}
                    </div>
                    <div class="unknown-word-actions">
                        <button class="speak-word-btn" onclick="learningSystem.speakUnknownWord('${cleanWord}')" title="Speak word">
                            <img src="/images/ReadText.svg" alt="Speak" />
                        </button>
                        <button class="remove-word-btn" onclick="learningSystem.removeWordFromList('${cleanWord}')" title="Remove from list">
                            <img src="/images/Remove.svg" alt="Remove" />
                        </button>
                    </div>
                </div>
            `;
            
            wordElements.push(wordElement);
        }
        
        listContainer.innerHTML = wordElements.join('');
        this.translationsVisible = false;
        this.updateTranslationStatus();
    }
    
    updateTranslationStatus() {
        const statusElement = document.getElementById('translationStatus');
        if (statusElement) {
            statusElement.textContent = this.translationsVisible ? 'Hide' : 'Show';
        }
    }
    
    toggleTranslationEdit(word) {
        const translationText = document.querySelector(`[data-word="${word}"] .translation-text`);
        const editBtn = document.querySelector(`[data-word="${word}"] .edit-translation-btn`);
        if (!translationText || !editBtn) return;
        
        this.enterTranslationEditMode(word);
    }

    onClickEditTranslation(evt, word) {
        if (evt) { evt.preventDefault(); evt.stopPropagation(); }
        this.enterTranslationEditMode(word);
    }

    enterTranslationEditMode(word) {
        const translationText = document.querySelector(`[data-word="${word}"] .translation-text`);
        const editBtn = document.querySelector(`[data-word="${word}"] .edit-translation-btn`);
        if (!translationText || !editBtn) return;
 
        // Replace translation text with input field
        const currentValue = translationText.textContent;
        translationText.innerHTML = `
            <div style="display:flex; align-items:center; gap:6px;">
                <input type="text" value="${currentValue.replace(/\"/g, '&quot;')}" 
                       class="translation-edit-input" 
                       style="flex:1 1 auto; font-size: 11px; padding: 2px 4px;"
                       onkeypress="learningSystem.handleTranslationEditKeypress(event, '${word}')">
                <div class="translation-edit-actions" style="flex:0 0 auto; display:flex; align-items:center; gap:6px;">
                    <button type="button" class="icon-btn" onclick="learningSystem.saveTranslationEdit('${word}', event)" 
                            title="Save">
                             <img src="/images/tick.svg" alt="Save" style="width: 12px; height: 12px;" />
                     </button>
                </div>
            </div>
        `;
 
        // Disable click on translation text while editing to avoid toggling
        translationText.onclick = null;
        // Hide edit button while editing
        editBtn.style.display = 'none';
 
        // Focus the input field
        const input = translationText.querySelector('.translation-edit-input');
        if (input) {
            input.focus();
            input.setSelectionRange(input.value.length, input.value.length);
        }
    }
    
    saveTranslationEdit(word, evt) {
        if (evt) { evt.preventDefault(); evt.stopPropagation(); }
        const translationText = document.querySelector(`[data-word="${word}"] .translation-text`);
        const editBtn = document.querySelector(`[data-word="${word}"] .edit-translation-btn`);
        if (!translationText || !editBtn) return;
 
        const input = translationText.querySelector('.translation-edit-input');
        if (!input) return;
        
        const newValue = input.value.trim();
        
        if (newValue === '') {
            // Don't save empty translations
            this.cancelTranslationEdit(word);
            return;
        }
        
        // Restore display with updated text and show edit button again
        translationText.textContent = newValue;
        translationText.onclick = () => this.toggleTranslationEdit(word);
        editBtn.style.display = '';
        
        // Update the cache
        this.updateTranslationInCache(word, newValue);
        
        // Save to localStorage
        this.saveCustomTranslation(word, newValue);
    }
    
    cancelTranslationEdit(word, evt) {
        if (evt) { evt.preventDefault(); evt.stopPropagation(); }
        const translationText = document.querySelector(`[data-word="${word}"] .translation-text`);
        const editBtn = document.querySelector(`[data-word="${word}"] .edit-translation-btn`);
        if (!translationText || !editBtn) return;
 
        const input = translationText.querySelector('.translation-edit-input');
        const originalValue = input ? input.defaultValue : translationText.textContent;
        
        // Restore display with original text and show edit button again
        translationText.textContent = originalValue;
        translationText.onclick = () => this.toggleTranslationEdit(word);
        editBtn.style.display = '';
    }
    
    handleTranslationKeydown(event, word) {
        if (event.key === 'Enter') {
            event.preventDefault();
            this.saveTranslationEdit(word);
        } else if (event.key === 'Escape') {
            event.preventDefault();
            this.cancelTranslationEdit(word);
        }
    }
    
    updateTranslationInCache(word, newTranslation) {
        if (!this.translatedWordsData) return;
        
        // Find the word in cache and update its translation
        const wordData = this.translatedWordsData.find(item => item.originalWord === word);
        if (wordData) {
            const originalTranslation = wordData.translations.find(t => t.type === 'original');
            if (originalTranslation) {
                originalTranslation.translation = newTranslation;
            }
        }
    }
    
    getOriginalTranslation(word) {
        if (!this.translatedWordsData) return '';
        
        const wordData = this.translatedWordsData.find(item => item.originalWord === word);
        if (wordData) {
            const originalTranslation = wordData.translations.find(t => t.type === 'original');
            return originalTranslation ? originalTranslation.translation : '';
        }
        return '';
    }
    
    saveCustomTranslation(word, translation) {
        const customTranslations = JSON.parse(localStorage.getItem('vocabKillerCustomTranslations') || '{}');
        customTranslations[word] = translation;
        localStorage.setItem('vocabKillerCustomTranslations', JSON.stringify(customTranslations));
    }
    
    loadCustomTranslation(word) {
        const customTranslations = JSON.parse(localStorage.getItem('vocabKillerCustomTranslations') || '{}');
        return customTranslations[word] || null;
    }
    
    showLearningOptions() {
        const modal = document.getElementById('learningOptionsModal');
        if (modal) {
            modal.classList.remove('hidden');
        }
    }
    
    hideLearningOptions() {
        const modal = document.getElementById('learningOptionsModal');
        if (modal) {
            modal.classList.add('hidden');
        }
    }
    
    learnOriginalWords() {
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
        
        // Navigate to learn original words typing game
        this.hideLearningOptions();
        window.open('/learn-original-words-typing-game.html', '_blank');
    }
    
    learnBaseForms() {
        console.log('=== Base Form Detection Debug ===');
        console.log('Unknown words:', Array.from(this.unknownWords));
        
        // Check if unknown words exist
        if (this.unknownWords.size === 0) {
            console.log('No unknown words found - showing popup');
            this.showNoUnknownWordsPopup();
            return;
        }
        
        // Check if ANY base forms exist for the unknown words
        const baseForms = JSON.parse(localStorage.getItem('vocabKillerBaseForms') || '{}');
        console.log('Base forms from localStorage:', baseForms);
        
        const hasBaseForms = Array.from(this.unknownWords).some(word => {
            // Use the original word as key (same as loadBaseForm function)
            const hasBaseForm = baseForms[word] && baseForms[word] !== word;
            console.log(`Word: "${word}", Key: "${word}", Has base form: ${hasBaseForm}, Base form: "${baseForms[word]}"`);
            return hasBaseForm;
        });
        
        console.log('Final result - hasBaseForms:', hasBaseForms);
        
        if (hasBaseForms) {
            console.log('Base forms found - going directly to subpage');
            // Base forms exist - go directly to Learn Base Form subpage
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
            this.hideLearningOptions();
            window.open('/learn-base-form-typing-game.html', '_blank');
        } else {
            console.log('No base forms found - showing popup');
            // No base forms - show popup with options
            this.showNoBaseFormsPopup();
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
        window.open('/learn-base-form-typing-game.html', '_blank');
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
        this.hideLearningOptions();
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
      
      // Close learning options modal when clicking outside
      const learningModal = document.getElementById('learningOptionsModal');
      const learningContent = document.querySelector('.learning-options-content');
      
      if (learningModal && !learningModal.classList.contains('hidden') && 
          !learningContent.contains(e.target) && 
          !e.target.classList.contains('navigate-to-subpage-btn')) {
        this.hideLearningOptions();
      }
    });

    // Setup dropdown auto-hide
    this.setupDropdownAutoHide();
    
    // Clean up timers when page is unloaded
    window.addEventListener('beforeunload', () => {
        this.clearClickTimers();
    });
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
    examples: true    // Default expanded
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
    this.expandSection('examples');
  }

  // Enhanced navbar functionality methods
  
  initializePreferences() {
    // Load preferences from localStorage or use defaults
    this.currentFont = localStorage.getItem('vocabKillerFont') || '\'Adobe Garamond Pro\', serif';
    this.currentFontSize = localStorage.getItem('vocabKillerFontSize') || '14';
    this.translationLanguage = localStorage.getItem('vocabKillerTranslationLanguage') || 'zh';
    this.speechSpeed = parseFloat(localStorage.getItem('vocabKillerSpeechSpeed') || '1.0');
    const savedVoice = localStorage.getItem('vocabKillerSelectedVoice') || '';
    
    // Load sidebar width preference
    const savedSidebarWidth = localStorage.getItem('vocabKillerSidebarWidth') || '280';
    this.updateSidebarWidth(savedSidebarWidth);
    
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
    const sidebarWidthSlider = document.getElementById('sidebarWidthSlider');
    const sidebarWidthValue = document.getElementById('sidebarWidthValue');
    
    if (fontSelect) fontSelect.value = this.currentFont;
    if (fontSizeSelect) fontSizeSelect.value = this.currentFontSize;
    if (translationLanguageSelect) translationLanguageSelect.value = this.translationLanguage;
    
    // Update sidebar width controls
    const savedSidebarWidth = localStorage.getItem('vocabKillerSidebarWidth') || '280';
    if (sidebarWidthSlider) sidebarWidthSlider.value = savedSidebarWidth;
    if (sidebarWidthValue) sidebarWidthValue.textContent = savedSidebarWidth;
  }

  applyFontPreferences() {
    // Apply font and size to the text container
    const textContainer = document.getElementById('originalTextContainer');
    if (textContainer) {
      textContainer.style.fontFamily = this.currentFont;
      textContainer.style.fontSize = this.currentFontSize + 'px';
    }
    
    // Apply font and size to sentence practice list
    const sentencePracticeList = document.getElementById('sentencePracticeList');
    if (sentencePracticeList) {
      const sentenceTexts = sentencePracticeList.querySelectorAll('.sentence-practice-text');
      sentenceTexts.forEach(textElement => {
        textElement.style.fontFamily = this.currentFont;
        textElement.style.fontSize = this.currentFontSize + 'px';
      });
    }
    
    // Apply font and size to unknown words list
    const unknownWordsList = document.getElementById('unknownWordsList');
    if (unknownWordsList) {
      const unknownWordItems = unknownWordsList.querySelectorAll('.unknown-word-item');
      unknownWordItems.forEach(item => {
        item.style.fontFamily = this.currentFont;
        item.style.fontSize = this.currentFontSize + 'px';
      });
    }
    
    // Apply font and size to all UI elements
    const uiElements = document.querySelectorAll('body, .navbar, .sidebar, .main-content, .unknown-words-panel, .sentence-practice-panel');
    uiElements.forEach(element => {
      element.style.fontFamily = this.currentFont;
      element.style.fontSize = this.currentFontSize + 'px';
    });
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
  
  updateSidebarWidth(width) {
    // Update the CSS variable
    document.documentElement.style.setProperty('--sidebar-width', width + 'px');
    
    // Update the display value
    const widthValue = document.getElementById('sidebarWidthValue');
    if (widthValue) {
      widthValue.textContent = width;
    }
    
    // Save to localStorage
    localStorage.setItem('vocabKillerSidebarWidth', width);
  }
  
  resetColumnWidths() {
    // Reset to default width
    const defaultWidth = 280;
    this.updateSidebarWidth(defaultWidth);
    
    // Update the slider
    const slider = document.getElementById('sidebarWidthSlider');
    if (slider) {
      slider.value = defaultWidth;
    }
    
    // Update the display value
    const widthValue = document.getElementById('sidebarWidthValue');
    if (widthValue) {
      widthValue.textContent = defaultWidth;
    }
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
      // Read filtered segments or entire text
      if (this.filteredSegments && this.filteredSegments.length > 0) {
        // Use filtered segments (sentences/paragraphs containing selected words)
        textToRead = this.filteredSegments.join('\n\n');
      } else if (!this.originalText) {
        alert('No text to read');
        return;
      } else {
        // Fallback to original text
        textToRead = this.originalText;
      }
    }

    if (textToRead && this.selectedVoice && 'speechSynthesis' in window) {
      // Auto-disable Hover Pronounce while main reading is active
      if (this.hoverReadEnabled) {
        this.hoverReadEnabled = false;
        const btn = document.querySelector('.hover-read-switch');
        if (btn) {
          btn.classList.remove('active');
          btn.setAttribute('aria-pressed', 'false');
        }
        this.detachHoverListeners();
        if (typeof this.stopWhisperStream === 'function') this.stopWhisperStream();
      }

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
      icon.src = this.isPlaying ? '/images/pause.svg' : '/images/play.svg';
      icon.alt = this.isPlaying ? 'Pause' : 'Play';
    }
  }

  async translateText() {
    // Use filtered segments if available, otherwise fallback to original text
    const textToTranslate = (this.filteredSegments && this.filteredSegments.length > 0) 
      ? this.filteredSegments.join('\n\n') 
      : this.originalText;
    
    if (!textToTranslate) return;
    
    try {
      // Show loading state
      const textContainer = document.getElementById('originalTextContainer');
      const originalContent = textContainer.innerHTML;
      textContainer.innerHTML = '<p class="text-gray-500">Translating...</p>';
      
      // Translate the text
      const translatedText = await this.dictionaryService.translateText(
        textToTranslate, 
        'en', 
        this.translationLanguage
      );
      
      if (translatedText) {
        // Display bilingual content like homepage
        textContainer.innerHTML = `
          <div class="bilingual-translation">
            <div class="original-text">
              <h3>Original Text:</h3>
              <div class="text-content">${textToTranslate}</div>
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
    const w = document.getElementById('wordByWordSwitch');
    if (w) w.setAttribute('aria-pressed', String(this.wordByWordEnabled));
    this.applyTranslationDisplay();
  }

  toggleFullSentenceTranslation(event) {
    event.stopPropagation();
    this.fullSentenceEnabled = !this.fullSentenceEnabled;
    const f = document.getElementById('fullSentenceSwitch');
    if (f) f.setAttribute('aria-pressed', String(this.fullSentenceEnabled));
    this.applyTranslationDisplay();
  }

  applyTranslationDisplay() {
    // Full sentence: translate/show all text when on; hide when off
    if (this.fullSentenceEnabled) {
      if (this.translatedParagraphs.size > 0) {
        this.showCachedTranslation();
      } else {
        this.showTranslation();
      }
      this.showingTranslation = true;
    } else {
      // Hide full translation
      this.showOriginalText();
      this.showingTranslation = false;
    }

    // Word-by-word: show/hide inline below each original word when enabled
    this.updateWordByWordDisplay();
    // Toggle layout class for stacked rendering
    const container = document.getElementById('originalTextContainer');
    if (container) {
      container.classList.toggle('word-by-word-on', this.wordByWordEnabled);
    }
  }

  updateWordByWordDisplay() {
    const container = document.getElementById('originalTextContainer');
    if (!container) return;
    // Only apply to original view (not the full-sentence view), so if full-sentence is on, we add translations under words within the english-text columns
    const scopeEls = this.fullSentenceEnabled ? container.querySelectorAll('.english-text .word') : container.querySelectorAll('.word');
    if (!scopeEls || scopeEls.length === 0) return;
    scopeEls.forEach((wordEl) => {
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
        // Ensure stacked under the word even if CSS class not applied yet
        span.style.display = 'block';
        span.style.fontSize = '';
        span.style.lineHeight = '1';
        // Clear any residual inline color so CSS hover can control it
        span.style.color = '';
        span.style.marginTop = '2px';
        wordEl.appendChild(span);
        if (!trans) this.fetchAndFillWordTranslation(word, span);
      }
    });
  }

  getCachedWordTranslation(word) {
    // Use the dictionaryService cache if available; otherwise return empty and we can extend to fetch async later
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
    const container = document.getElementById('originalTextContainer');
    
    // Use filtered segments if available, otherwise fallback to original text
    let segments = [];
    if (this.filteredSegments && this.filteredSegments.length > 0) {
      segments = this.filteredSegments;
    } else {
      // Fallback to original text split by paragraphs
      segments = this.originalText.split('\n').filter(para => para.trim());
    }
    
    const html = segments.map((segment, index) => {
      // Process words in each segment
      const words = segment.split(/\s+/);
      const wordsHtml = words.map(word => {
        const cleanWord = this.cleanWord(word);
        const isUnknown = this.isWordUnknown(word);
        if (cleanWord && !this.cleanToDisplayWord.has(cleanWord)) {
          this.cleanToDisplayWord.set(cleanWord, word);
        }
        const escapedWord = word.replace(/'/g, "\\'");
        return `<span class="word ${isUnknown ? 'unknown-word' : ''} word-selectable" 
                         data-word="${cleanWord}" 
                         onclick="learningSystem.handleWordSingleClick('${escapedWord}', this)"
                         ondblclick="learningSystem.handleWordDoubleClick('${escapedWord}', this)">
                  ${word}
                </span>`;
      }).join(' ');
      
      // Get cached translation
      const translation = this.translatedParagraphs.get(index) || '';
      
      const segmentType = this.showParagraphs ? 'paragraph' : 'sentence';
      return `
        <div class="translation-segment">
          <div class="segment-header">
            <span class="segment-label">${segmentType.charAt(0).toUpperCase() + segmentType.slice(1)} ${index + 1}</span>
          </div>
          <div class="segment-content">
            <div class="english-text">${wordsHtml}</div>
            <div class="translated-text">${translation}</div>
          </div>
        </div>
      `;
    }).join('');
    
    container.innerHTML = html;
    // Re-apply word-by-word stacked translations if enabled
    if (this.wordByWordEnabled) {
      this.updateWordByWordDisplay();
      container.classList.add('word-by-word-on');
    } else {
      container.classList.remove('word-by-word-on');
    }
  }

  cancelTranslation() {
    this.translationProgress.isTranslating = false;
  }

  showOriginalText() {
    const container = document.getElementById('originalTextContainer');
    if (container && this.originalContent) {
      container.innerHTML = this.originalContent;
      if (this.wordByWordEnabled) {
        this.updateWordByWordDisplay();
        container.classList.add('word-by-word-on');
      } else {
        container.classList.remove('word-by-word-on');
      }
    }
  }

  async showTranslation() {
    // Use filtered segments if available, otherwise fallback to original text
    let segments = [];
    if (this.filteredSegments && this.filteredSegments.length > 0) {
      segments = this.filteredSegments;
    } else if (this.originalText) {
      // Fallback to original text split by paragraphs
      segments = this.originalText.split('\n').filter(para => para.trim());
    } else {
      return; // No text to translate
    }
    
    try {
      // Store original content if not already stored
      if (!this.originalContent) {
        const container = document.getElementById('originalTextContainer');
        this.originalContent = container.innerHTML;
      }
      
      this.translationProgress.total = segments.length;
      this.translationProgress.current = 0;
      this.translationProgress.isTranslating = true;
      
      // Show initial progress display
      this.displayTranslationProgress(segments);
      
      // Translate segments in parallel batches for better performance
      const batchSize = 3; // Process 3 segments at a time
      const nonEmptySegments = segments
        .map((segment, index) => ({ segment, index }))
        .filter(({ segment }) => segment.trim() !== '');
      
      for (let i = 0; i < nonEmptySegments.length; i += batchSize) {
        if (!this.translationProgress.isTranslating) {
          break; // Stop if translation was cancelled
        }
        
        const batch = nonEmptySegments.slice(i, i + batchSize);
        
        // Process batch in parallel
        const batchPromises = batch.map(async ({ segment, index }) => {
          try {
            // Check cache first
            const cacheKey = `${segment}_${this.translationLanguage}`;
            let translation;
            
            if (this.translationCache.has(cacheKey)) {
              translation = this.translationCache.get(cacheKey);
            } else {
              // Translate segment
              translation = await this.dictionaryService.translateText(
                segment, 
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
            console.error(`Translation error for segment ${index}:`, error);
            // Store error message instead of empty string
            this.translatedParagraphs.set(index, `[Translation error: ${segment.substring(0, 30)}...]`);
          }
        });
        
        // Wait for batch to complete
        await Promise.all(batchPromises);
        
        // Update progress
        this.translationProgress.current = Math.min(i + batchSize, nonEmptySegments.length);
        this.updateTranslationProgress(segments, this.translationProgress.current);
        
        // Small delay between batches to avoid overwhelming the server
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      this.translationProgress.isTranslating = false;
      
      // Final display update to show all completed translations
      this.displayFinalTranslations(segments);
      
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
          const isUnknown = this.isWordUnknown(word);
          if (cleanWord && !this.cleanToDisplayWord.has(cleanWord)) {
            this.cleanToDisplayWord.set(cleanWord, word);
          }
          return `<span class="word ${isUnknown ? 'unknown-word' : ''}" 
                           data-word="${cleanWord}" 
                           onclick="learningSystem.showDictionary(event, '${word}')">
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
                <img src="/images/Processing.svg" alt="Processing" class="w-4 h-4 animate-spin" />
                Translating...
              </div>
            </div>
          `;
        } else if (isWaitingForTranslation) {
          translationContent = `
            <div class="translation-progress">
              <div class="waiting-indicator">
                <img src="/images/waiting.svg" alt="Waiting" class="w-4 h-4" />
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
    // Re-apply stacked word-by-word under words if enabled
    if (this.wordByWordEnabled) {
      this.updateWordByWordDisplay();
      container.classList.add('word-by-word-on');
    } else {
      container.classList.remove('word-by-word-on');
    }
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
                <img src="/images/Processing.svg" alt="Processing" class="w-4 h-4 animate-spin" />
                Translating...
              </div>
            `;
          } else {
            // Future paragraphs are waiting
            translationDiv.innerHTML = `
              <div class="waiting-indicator">
                <img src="/images/waiting.svg" alt="Waiting" class="w-4 h-4" />
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
          const isUnknown = this.isWordUnknown(word);
          if (cleanWord && !this.cleanToDisplayWord.has(cleanWord)) {
            this.cleanToDisplayWord.set(cleanWord, word);
          }
          return `<span class="word ${isUnknown ? 'unknown-word' : ''}" 
                           data-word="${cleanWord}" 
                           onclick="learningSystem.showDictionary(event, '${word}')">
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
    // Re-apply stacked word-by-word under words if enabled
    if (this.wordByWordEnabled) {
      this.updateWordByWordDisplay();
      container.classList.add('word-by-word-on');
    } else {
      container.classList.remove('word-by-word-on');
    }
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
          const isUnknown = this.isWordUnknown(word);
          if (cleanWord && !this.cleanToDisplayWord.has(cleanWord)) {
            this.cleanToDisplayWord.set(cleanWord, word);
          }
          return `<span class="word ${isUnknown ? 'unknown-word' : ''}" 
                           data-word="${cleanWord}" 
                           onclick="learningSystem.showDictionary(event, '${word}')">
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
    // Re-apply stacked word-by-word under words if enabled
    if (this.wordByWordEnabled) {
      this.updateWordByWordDisplay();
      container.classList.add('word-by-word-on');
    } else {
      container.classList.remove('word-by-word-on');
    }
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
    
    // Close the current window/tab
    window.close();

    // Fallback: if window.close() doesn't work, try to go back
    if (!window.closed) {
      window.history.back();
    }
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
    
    // Filter for only the 5 specific voices
    const allowedVoices = [
      'Google US English',
      'Google UK English Female', 
      'Google UK English Male',
      'Samantha',
      'Aaron'
    ];
    
    const filteredVoices = this.availableVoices.filter(voice => {
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

    // Add fallback option if no voices found
    if (filteredVoices.length === 0) {
      const option = document.createElement('option');
      option.value = '';
      option.textContent = 'No allowed voices available';
      voiceSelect.appendChild(option);
    }
  }

  autoSelectPreferredVoice() {
    const voiceSelect = document.getElementById('voiceSelect');
    if (!voiceSelect) return;

    const voices = Array.from(voiceSelect.options);
    
    // First priority: Use inherited voice from homepage
    if (this.inheritedVoiceName) {
      const inheritedVoice = voices.find(option => 
        option.value === this.inheritedVoiceName
      );
      if (inheritedVoice) {
        voiceSelect.value = inheritedVoice.value;
        this.updateVoice(inheritedVoice.value);
        console.log('Selected inherited voice in Learn Original Text:', this.inheritedVoiceName);
        return;
      }
    }

    // Second priority: Try to auto-select Google UK English Female
    const preferredVoice = voices.find(option => 
      option.textContent.includes('Google UK English Female')
    );

    if (preferredVoice) {
      voiceSelect.value = preferredVoice.value;
      this.updateVoice(preferredVoice.value);
      console.log('Selected preferred voice in Learn Original Text:', preferredVoice.value);
    } else if (voiceSelect.options.length > 0) {
      // Select first available voice
      voiceSelect.value = voiceSelect.options[0].value;
      this.updateVoice(voiceSelect.options[0].value);
      console.log('Selected first available voice in Learn Original Text:', voiceSelect.options[0].value);
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

  handleTranslationEditKeypress(e, word) {
      if (!e) return;
      if (e.key === 'Enter') {
          e.preventDefault();
          e.stopPropagation();
          this.saveTranslationEdit(word, e);
      }
  }

  toggleHoverRead() {
      this.hoverReadEnabled = !this.hoverReadEnabled;
      const btn = document.querySelector('.hover-read-switch');
      if (btn) {
          btn.setAttribute('aria-pressed', String(this.hoverReadEnabled));
          if (this.hoverReadEnabled) btn.classList.add('active');
          else btn.classList.remove('active');
      }
      if (!this.hoverReadEnabled) {
          this.cancelHoverSpeech();
          this.detachHoverListeners();
      } else {
          this.attachHoverListeners();
          this.warmUpSpeechEngine();
      }
  }

  attachHoverListeners() {
      const container = document.getElementById('originalTextContainer');
      if (!container) return;
      // Pointer coordinates tracking (use both move and rawupdate when available)
      const coordUpdater = (e) => {
          this.hoverPointerPrev = this.hoverPointer;
          this.hoverPointer = { x: e.clientX, y: e.clientY };
          this.hoverPointerPrevTs = performance.now();
      };
      container.addEventListener('pointermove', this.onHoverMoveCoordBound = coordUpdater);
      // pointerrawupdate may fire at higher rate (if supported)
      container.addEventListener('pointerrawupdate', this.onHoverRawCoordBound = coordUpdater);
      container.addEventListener('pointerover', this.onHoverOverBound = (e) => this.onHoverOver(e));
      container.addEventListener('pointerleave', this.onHoverLeaveBound = () => this.onHoverLeave());
      // Start RAF loop for robust detection during fast movement
      this.startHoverDetectionLoop();
  }

  detachHoverListeners() {
      const container = document.getElementById('originalTextContainer');
      if (!container) return;
      if (this.onHoverMoveCoordBound) container.removeEventListener('pointermove', this.onHoverMoveCoordBound);
      if (this.onHoverRawCoordBound) container.removeEventListener('pointerrawupdate', this.onHoverRawCoordBound);
      if (this.onHoverOverBound) container.removeEventListener('pointerover', this.onHoverOverBound);
      if (this.onHoverLeaveBound) container.removeEventListener('pointerleave', this.onHoverLeaveBound);
      this.onHoverMoveCoordBound = this.onHoverRawCoordBound = this.onHoverOverBound = this.onHoverLeaveBound = null;
      if (this.hoverRafId) {
          cancelAnimationFrame(this.hoverRafId);
          this.hoverRafId = null;
      }
      this.hoverPointer = null;
      this.hoverPointerPrev = null;
  }

  onHoverOver(e) {
      if (!this.hoverReadEnabled) return;
      const container = document.getElementById('originalTextContainer');
      if (!container) return;
      const target = e.target?.closest?.('.word');
      if (!target || !container.contains(target)) return;
      const word = target.getAttribute('data-word') || (target.textContent || '').trim();
      if (!word) return;
      if (word === this.lastHoverWord) return; // same word, ignore
      this.pendingHoverWord = null;
      this.lastHoverWord = word;
      this.speakHoverWord(word);
  }

  onHoverLeave() {
      if (!this.hoverReadEnabled) return;
      this.lastHoverWord = null;
      this.pendingHoverWord = null;
      clearTimeout(this.hoverDwellTimer);
      this.hoverDwellTimer = null;
      this.hoverPointer = null;
      // Cancel any ongoing hover speech when leaving the area
      this.cancelHoverSpeech();
  }

  speakHoverWord(word, speedPxPerMs = 0) {
      if (!word) return;
      // Cancel any ongoing speech (manual or previous hover) for immediate responsiveness
      if (this.speechSynthesis) {
          this.speechSynthesis.cancel();
      }
      const utter = new SpeechSynthesisUtterance(word);
      if (this.selectedVoice) utter.voice = this.selectedVoice;
      const baseRate = parseFloat(document.getElementById('speedSlider')?.value || '1.0');
      // Map pointer speed to rate boost: e.g., 0 px/ms -> baseRate; 1 px/ms -> ~1.6x; cap at 2.0x
      const boost = Math.min(1.0, Math.max(0, speedPxPerMs * 0.6));
      utter.rate = Math.min(2.0, Math.max(0.5, baseRate + boost));
      this.speechUtterance = utter;
      this.hoverReadActive = true;
      this.speechSynthesis.speak(utter);
      utter.onend = () => {
          this.hoverReadActive = false;
      };
      utter.onerror = () => {
          this.hoverReadActive = false;
      };
  }

  cancelHoverSpeech() {
      if (this.speechSynthesis) {
          this.speechSynthesis.cancel();
      }
      this.hoverReadActive = false;
  }

  warmUpSpeechEngine() {
      // Attempt to reduce first-utterance latency; requires user gesture context to be effective
      try {
          if (!this.speechSynthesis) return;
          const u = new SpeechSynthesisUtterance(' ');
          if (this.selectedVoice) u.voice = this.selectedVoice;
          u.volume = 0; // silent warm-up
          u.rate = 1.0;
          this.speechSynthesis.speak(u);
          // Cancel shortly after to free engine
          setTimeout(() => {
              try { this.speechSynthesis.cancel(); } catch (_) {}
          }, 20);
      } catch (_) {
          // ignore
      }
  }

  startHoverDetectionLoop() {
      const container = document.getElementById('originalTextContainer');
      if (!container) return;
      const step = () => {
          if (!this.hoverReadEnabled) {
              this.hoverRafId = null;
              return;
          }
          if (this.hoverPointer) {
              const { x, y } = this.hoverPointer;
              const wordEl = this.findWordElementAtPoint(x, y, container);
              if (wordEl && container.contains(wordEl)) {
                  const word = wordEl.getAttribute('data-word') || (wordEl.textContent || '').trim();
                  if (word && word !== this.lastHoverWord) {
                      // Compute pointer velocity to adjust speaking rate
                      const now = performance.now();
                      let speedPxPerMs = 0;
                      if (this.hoverPointerPrev && this.hoverPointerPrevTs) {
                          const dx = x - this.hoverPointerPrev.x;
                          const dy = y - this.hoverPointerPrev.y;
                          const dist = Math.hypot(dx, dy);
                          const dt = Math.max(1, now - this.hoverPointerPrevTs);
                          speedPxPerMs = dist / dt;
                      }
                      this.lastHoverWord = word;
                      this.speakHoverWord(word, speedPxPerMs);
                  }
              } else {
                  // Pointer is not on a word; allow re-trigger on the same word next time
                  this.lastHoverWord = null;
              }
          }
          this.hoverRafId = requestAnimationFrame(step);
      };
      if (this.hoverRafId) cancelAnimationFrame(this.hoverRafId);
      this.hoverRafId = requestAnimationFrame(step);
  }

  findWordElementAtPoint(x, y, container) {
      // Try direct elementFromPoint
      let el = document.elementFromPoint(x, y);
      let wordEl = el && el.closest ? el.closest('.word') : null;
      if (wordEl && container.contains(wordEl)) return wordEl;
      // Try elementsFromPoint and find first .word
      if (document.elementsFromPoint) {
          const stack = document.elementsFromPoint(x, y);
          for (const e of stack) {
              if (e.classList && e.classList.contains('word') && container.contains(e)) return e;
              if (e.closest) {
                  const w = e.closest('.word');
                  if (w && container.contains(w)) return w;
              }
          }
      }
      // Sample nearby pixels to catch whitespace between words
      const offsets = [
          [2, 0], [-2, 0], [0, 2], [0, -2],
          [3, 0], [-3, 0], [0, 3], [0, -3]
      ];
      for (const [dx, dy] of offsets) {
          const nx = x + dx, ny = y + dy;
          const e = document.elementFromPoint(nx, ny);
          const w = e && e.closest ? e.closest('.word') : null;
          if (w && container.contains(w)) return w;
      }
      return null;
  }

  openContextBasedVocabularyPractice() {
      // Store current text and unknown words for context practice
      const contextPracticeData = {
          text: this.originalText,
          unknownWords: Array.from(this.unknownWords),
          filteredSegments: this.filteredSegments || [],
          showParagraphs: this.showParagraphs || false
      };
      
      // If we have filtered segments, use them as the main text
      if (this.filteredSegments && this.filteredSegments.length > 0) {
          contextPracticeData.text = this.filteredSegments.join('\n\n');
      }
      
      console.log('Context Practice: Storing data:', contextPracticeData);
      
      // Store in sessionStorage
      sessionStorage.setItem('contextPracticeData', JSON.stringify(contextPracticeData));
      
      // Open context practice subpage in a new tab
      window.open('/context-based-vocabulary-practice.html', '_blank');
  }

  // Collapse/Expand functionality for unknown words panel
  initializeUnknownWordsPanelCollapse() {
      // Load saved collapse state
      const savedState = sessionStorage.getItem('unknownWordsPanelCollapsed');
      if (savedState !== null) {
          this.unknownWordsPanelCollapsed = JSON.parse(savedState);
          this.updateUnknownWordsPanelCollapseState();
      }
  }

  toggleUnknownWordsPanel() {
      this.unknownWordsPanelCollapsed = !this.unknownWordsPanelCollapsed;
      this.updateUnknownWordsPanelCollapseState();
      
      // Save state to sessionStorage
      sessionStorage.setItem('unknownWordsPanelCollapsed', JSON.stringify(this.unknownWordsPanelCollapsed));
  }

  updateUnknownWordsPanelCollapseState() {
      const panel = document.querySelector('.unknown-words-panel');
      const collapseBtn = document.querySelector('.collapse-btn');
      const collapseIcon = document.getElementById('collapseIcon');
      
      if (panel && collapseBtn && collapseIcon) {
          if (this.unknownWordsPanelCollapsed) {
              panel.classList.add('collapsed');
              collapseBtn.classList.add('collapsed');
          } else {
              panel.classList.remove('collapsed');
              collapseBtn.classList.remove('collapsed');
          }
      }
  }

  // Collapse/Expand functionality for sentence practice panel
  initializeSentencePracticePanelCollapse() {
      // Load saved collapse state
      const savedState = sessionStorage.getItem('sentencePracticePanelCollapsed');
      if (savedState !== null) {
          this.sentencePracticePanelCollapsed = JSON.parse(savedState);
          this.updateSentencePracticePanelCollapseState();
      }
      
      // Load saved translation state
      const savedTranslationState = sessionStorage.getItem('sentencePracticeTranslationEnabled');
      if (savedTranslationState !== null) {
          this.sentencePracticeTranslationEnabled = JSON.parse(savedTranslationState);
          this.updateSentencePracticeTranslationState();
      }
  }

  toggleSentencePracticePanel() {
      this.sentencePracticePanelCollapsed = !this.sentencePracticePanelCollapsed;
      this.updateSentencePracticePanelCollapseState();
      
      // Save state to sessionStorage
      sessionStorage.setItem('sentencePracticePanelCollapsed', JSON.stringify(this.sentencePracticePanelCollapsed));
  }

  updateSentencePracticePanelCollapseState() {
      const panel = document.querySelector('.sentence-practice-panel');
      const collapseBtn = document.querySelector('.sentence-practice-panel .collapse-btn');
      const collapseIcon = document.getElementById('sentencePracticeCollapseIcon');
      
      if (panel && collapseBtn && collapseIcon) {
          if (this.sentencePracticePanelCollapsed) {
              panel.classList.add('collapsed');
              collapseBtn.classList.add('collapsed');
          } else {
              panel.classList.remove('collapsed');
              collapseBtn.classList.remove('collapsed');
          }
      }
  }

  toggleSentencePracticeTranslation() {
      this.sentencePracticeTranslationEnabled = !this.sentencePracticeTranslationEnabled;
      this.updateSentencePracticeTranslationState();
      
      if (this.sentencePracticeTranslationEnabled) {
          this.translateAllSentences();
      } else {
          this.updateSentencePracticeList(); // Re-render without translations
      }
  }

  updateSentencePracticeTranslationState() {
      const icon = document.getElementById('sentencePracticeTranslateIcon');
      
      if (icon) {
          if (this.sentencePracticeTranslationEnabled) {
              icon.style.filter = 'brightness(0) saturate(100%) invert(0%) sepia(0%) saturate(0%) hue-rotate(0deg) brightness(0%) contrast(100%)';
              icon.title = 'Hide translations';
          } else {
              icon.style.filter = 'none';
              icon.title = 'Show translations';
          }
      }
      
      // Save state to session storage
      sessionStorage.setItem('sentencePracticeTranslationEnabled', JSON.stringify(this.sentencePracticeTranslationEnabled));
  }

  async translateAllSentences() {
      if (!this.sentencePracticeTranslationEnabled) return;
      
      const sentencesToTranslate = this.completedSentences.filter(sentence => 
          !this.sentenceTranslations.has(sentence.text)
      );
      
      if (sentencesToTranslate.length === 0) {
          this.updateSentencePracticeList(); // Re-render with existing translations
          return;
      }
      
      // Show loading state
      this.updateSentencePracticeList();
      
      // Show loading indicator
      const listContainer = document.getElementById('sentencePracticeList');
      if (listContainer && sentencesToTranslate.length > 0) {
          const loadingHtml = `
              <div class="sentence-practice-loading">
                  <div class="loading-text">Translating sentences...</div>
              </div>
          `;
          listContainer.innerHTML = loadingHtml;
      }
      
      // Translate sentences in parallel (similar to unknown words subpage pattern)
      try {
          const newTranslatedSentences = [];
          
          for (const sentence of sentencesToTranslate) {
              try {
                  const translation = await this.translateSentence(sentence.text);
                  if (translation) {
                      this.sentenceTranslations.set(sentence.text, translation);
                      newTranslatedSentences.push({ text: sentence.text, translation: translation });
                  }
              } catch (error) {
                  console.error(`Translation error for sentence "${sentence.text}":`, error);
                  this.sentenceTranslations.set(sentence.text, '[Translation failed]');
              }
          }
          
          console.log(`Translated ${newTranslatedSentences.length} sentences`);
          
      } catch (error) {
          console.error('Background translation error:', error);
      }
      
      // Re-render with translations
      this.updateSentencePracticeList();
  }



  prePopulateSentenceTranslation(sentenceText) {
      // Try to find existing translation for this sentence in various caches
      const cacheKey = `${sentenceText}_${this.translationLanguage}`;
      
      // Check if already cached
      if (this.sentenceTranslations.has(sentenceText)) {
          console.log('Sentence translation already cached:', sentenceText);
          return;
      }
      
      // Check in translation cache
      if (this.translationCache.has(cacheKey)) {
          const translation = this.translationCache.get(cacheKey);
          this.sentenceTranslations.set(sentenceText, translation);
          console.log('Pre-populated sentence translation from cache:', sentenceText);
          return;
      }
      
      // Check in popup translation cache (dictionary service cache)
      if (this.dictionaryService && this.dictionaryService.popupTranslationCache && 
          this.dictionaryService.popupTranslationCache.has(cacheKey)) {
          const translation = this.dictionaryService.popupTranslationCache.get(cacheKey);
          this.sentenceTranslations.set(sentenceText, translation);
          console.log('Pre-populated sentence translation from popup cache:', sentenceText);
          return;
      }
      
      // Check in translated paragraphs (more sophisticated matching)
      const sentenceWords = sentenceText.toLowerCase().split(/\s+/).filter(word => word.length > 2);
      
      for (let [index, translation] of this.translatedParagraphs.entries()) {
          if (translation) {
              const translationLower = translation.toLowerCase();
              const matchingWords = sentenceWords.filter(word => translationLower.includes(word));
              
              if (matchingWords.length >= Math.max(2, sentenceWords.length * 0.7)) {
                  this.sentenceTranslations.set(sentenceText, translation);
                  console.log('Pre-populated sentence translation from paragraphs:', sentenceText);
                  return;
              }
          }
      }
      
      // If no existing translation found, try to translate it in the background
      // This follows the same pattern as unknown words subpage
      console.log('No existing translation found for sentence, translating in background:', sentenceText);
      this.translateSentenceInBackground(sentenceText);
  }

  async translateSentenceInBackground(sentenceText) {
      try {
          const translation = await this.translateSentence(sentenceText);
          if (translation) {
              this.sentenceTranslations.set(sentenceText, translation);
              console.log('Background translation completed for sentence:', sentenceText);
              // Update the display if translation is currently enabled
              if (this.sentencePracticeTranslationEnabled) {
                  this.updateSentencePracticeList();
              }
          }
      } catch (error) {
          console.error('Background translation error for sentence:', sentenceText, error);
      }
  }

  async translateSentence(sentenceText) {
      try {
          // First, check if we have cached translation from original text
          const cacheKey = `${sentenceText}_${this.translationLanguage}`;
          
          // Check in various caches
          if (this.translationCache.has(cacheKey)) {
              console.log('Found cached translation for sentence:', sentenceText);
              return this.translationCache.get(cacheKey);
          }
          
          if (this.dictionaryService && this.dictionaryService.popupTranslationCache && 
              this.dictionaryService.popupTranslationCache.has(cacheKey)) {
              console.log('Found cached translation in popup cache for sentence:', sentenceText);
              return this.dictionaryService.popupTranslationCache.get(cacheKey);
          }
          
          // Check if the sentence exists in translated paragraphs (from original text)
          // This is a more sophisticated matching - look for sentences that contain the same words
          const sentenceWords = sentenceText.toLowerCase().split(/\s+/).filter(word => word.length > 2);
          
          for (let [index, translation] of this.translatedParagraphs.entries()) {
              if (translation) {
                  // Check if this translation contains most of the words from our sentence
                  const translationLower = translation.toLowerCase();
                  const matchingWords = sentenceWords.filter(word => translationLower.includes(word));
                  
                  if (matchingWords.length >= Math.max(2, sentenceWords.length * 0.7)) {
                      console.log('Found matching translation in paragraphs for sentence:', sentenceText);
                      console.log('Matching words:', matchingWords);
                      return translation;
                  }
              }
          }
          
          // If no cached translation found, use the dictionary service translation method
          console.log('No cached translation found, calling translation API for sentence:', sentenceText);
          
          // Use the same pattern as unknown words subpage - use dictionary service
          const translation = await this.dictionaryService.translateText(sentenceText, 'en', this.translationLanguage);
          
          // Cache the result
          if (translation) {
              this.translationCache.set(cacheKey, translation);
              console.log('Cached new translation for sentence:', sentenceText);
          }
          
          return translation;
      } catch (error) {
          console.error('Translation error for sentence:', sentenceText, error);
          return `[Translation failed: ${sentenceText}]`;
      }
  }

  // Restore sentence practice data from sessionStorage
  restoreSentencePracticeData() {
      try {
          const savedData = sessionStorage.getItem('sentencePracticeData');
          if (savedData) {
              const practiceData = JSON.parse(savedData);
              console.log('🔄 Restoring sentence practice data from sessionStorage:', practiceData);
              
              // Restore completed sentences
              this.completedSentences = practiceData.map(item => ({
                  text: item.text,
                  translation: item.translation
              }));
              
              // Restore sentence translations
              this.sentenceTranslations.clear();
              practiceData.forEach(item => {
                  if (item.translation) {
                      this.sentenceTranslations.set(item.text, item.translation);
                  }
              });
              
              // Update the sentence practice list display
              this.updateSentencePracticeList();
              
              console.log('✅ Sentence practice data restored successfully');
          }
      } catch (error) {
          console.error('Error restoring sentence practice data:', error);
      }
  }

  // Navigate to sentence practice subpage
  startSentencePractice() {
      if (this.completedSentences.length === 0) {
          this.showMessage('No sentences selected for practice. Please select some sentences first.');
          return;
      }

      try {
          // Prepare sentence data for the practice subpage
          const practiceData = this.completedSentences.map(sentence => ({
              text: sentence.text,
              translation: this.sentenceTranslations.get(sentence.text) || null
          }));

          // Store sentences in sessionStorage
          sessionStorage.setItem('sentencePracticeData', JSON.stringify(practiceData));
          
          // Navigate to the sentence practice subpage
          window.location.href = '/learn-sentence-practice.html';
      } catch (error) {
          console.error('Error starting sentence practice:', error);
          this.showMessage('Error starting sentence practice. Please try again.');
      }
  }

  // Sentence Selection System
  initializeSentenceSelection() {
      // Add click outside listener
      document.addEventListener('click', (event) => {
          this.handleOutsideClick(event);
      });
  }

  handleWordSingleClick(word, element) {
      event.preventDefault();
      event.stopPropagation();
      
      console.log('Single click detected for word:', word);
      
      // Clear any existing timer for this element
      if (this.clickTimers.has(element)) {
          clearTimeout(this.clickTimers.get(element));
          console.log('Cleared existing timer for word:', word);
      }
      
      // Set timer to execute selection after delay
      const timer = setTimeout(() => {
          console.log('Executing word selection for:', word);
          this.executeWordSelection(word, element);
          this.clickTimers.delete(element);
      }, this.clickDelay);
      
      this.clickTimers.set(element, timer);
      console.log('Set timer for word:', word, 'Delay:', this.clickDelay, 'ms');
  }

  handleWordDoubleClick(word, element) {
      event.preventDefault();
      event.stopPropagation();
      
      console.log('Double click detected for word:', word);
      
      // Cancel the single-click timer
      if (this.clickTimers.has(element)) {
          clearTimeout(this.clickTimers.get(element));
          this.clickTimers.delete(element);
          console.log('Cancelled single-click timer for word:', word);
      }
      
      // Show dictionary popup
      console.log('Showing dictionary popup for word:', word);
      this.showDictionary(event, word);
  }

  executeWordSelection(word, element) {
      // Check if word is already selected in current sentence
      const existingIndex = this.currentSelection.words.findIndex(w => w.element === element);
      if (existingIndex !== -1) {
          return; // Word already selected
      }
      
      // Start selection if not active
      if (!this.currentSelection.isActive) {
          this.currentSelection.isActive = true;
          this.currentSelection.sentenceId = `sentence_${Date.now()}`;
      }
      
      // Add word to selection
      const wordNumber = this.currentSelection.words.length + 1;
      const wordData = {
          word: word,
          number: wordNumber,
          element: element
      };
      
      this.currentSelection.words.push(wordData);
      
      // Add visual number to word
      this.addNumberToWord(element, wordNumber);
      
      // Update word styling
      element.classList.add('word-selected');
      element.classList.add('word-selectable');
  }

  clearClickTimers() {
      // Clear all pending click timers
      this.clickTimers.forEach(timer => {
          clearTimeout(timer);
      });
      this.clickTimers.clear();
  }

  addNumberToWord(element, number) {
      // Remove existing number if any
      const existingNumber = element.querySelector('.word-number');
      if (existingNumber) {
          existingNumber.remove();
      }
      
      // Create number element
      const numberElement = document.createElement('span');
      numberElement.className = 'word-number';
      numberElement.textContent = number;
      
      // Add click handler to remove word when number is clicked
      numberElement.addEventListener('click', (event) => {
          event.preventDefault();
          event.stopPropagation();
          console.log('Number clicked, removing word:', element.textContent);
          this.removeWordFromSelection(element);
      });
      
      // Add to word element
      element.appendChild(numberElement);
  }

  handleOutsideClick(event) {
      // Check if click is on a word element or within word-related elements
      const clickedElement = event.target;
      
      // Check if the clicked element is a word
      let isWordClick = clickedElement.classList && clickedElement.classList.contains('word');
      
      // If not a direct word click, check if click is within a word element (for nested elements like word numbers)
      if (!isWordClick) {
          const wordParent = clickedElement.closest('.word');
          isWordClick = !!wordParent;
      }
      
      // Also check if click is on translation-related containers that should not complete sentences
      const isTranslationContainer = clickedElement.classList && (
          clickedElement.classList.contains('english-text') ||
          clickedElement.classList.contains('translated-text') ||
          clickedElement.classList.contains('translation-paragraph') ||
          clickedElement.classList.contains('segment-content') ||
          clickedElement.classList.contains('translation-segment')
      );
      
      // If click is not on a word and not on translation containers, complete the sentence
      if (!isWordClick && !isTranslationContainer && this.currentSelection.isActive && this.currentSelection.words.length > 0) {
          this.completeCurrentSentence();
      }
  }

  completeCurrentSentence() {
      if (this.currentSelection.words.length === 0) return;
      
      // Create sentence object
      const sentence = {
          id: this.currentSelection.sentenceId,
          words: [...this.currentSelection.words],
          completedAt: new Date(),
          text: this.currentSelection.words.map(w => w.word).join(' ')
      };
      
      // Add to completed sentences
      this.completedSentences.push(sentence);
      
      // Try to pre-populate translation cache for this sentence
      this.prePopulateSentenceTranslation(sentence.text);
      
      // Update visual state of words
      this.currentSelection.words.forEach(wordData => {
          const numberElement = wordData.element.querySelector('.word-number');
          if (numberElement) {
              numberElement.classList.add('word-number-completed');
          }
          wordData.element.classList.remove('word-selected');
          wordData.element.classList.add('word-completed');
      });
      
      // Update sentence practice list
      this.updateSentencePracticeList();
      
      // Reset current selection
      this.resetSelection();
  }

  resetSelection() {
      this.currentSelection = {
          isActive: false,
          words: [],
          sentenceId: null
      };
      
      // Clear any pending click timers when resetting selection
      this.clearClickTimers();
  }

  removeWordFromSelection(element) {
      console.log('removeWordFromSelection called for element:', element.textContent);
      
      // Find the word in current selection
      const wordIndex = this.currentSelection.words.findIndex(w => w.element === element);
      console.log('Word index in current selection:', wordIndex);
      
      if (wordIndex === -1) {
          console.log('Word not found in current selection, checking completed sentences...');
          // Check if word is in a completed sentence
          let sentenceIndex = -1;
          let wordInSentenceIndex = -1;
          
          for (let i = 0; i < this.completedSentences.length; i++) {
              const sentence = this.completedSentences[i];
              const wordIndexInSentence = sentence.words.findIndex(w => w.element === element);
              if (wordIndexInSentence !== -1) {
                  sentenceIndex = i;
                  wordInSentenceIndex = wordIndexInSentence;
                  break;
              }
          }
          
          if (sentenceIndex !== -1) {
              console.log('Word found in completed sentence, removing from sentence:', sentenceIndex);
              // Remove word from completed sentence
              this.completedSentences[sentenceIndex].words.splice(wordInSentenceIndex, 1);
              
              // If sentence is now empty, remove the entire sentence
              if (this.completedSentences[sentenceIndex].words.length === 0) {
                  this.completedSentences.splice(sentenceIndex, 1);
              } else {
                  // Update sentence text
                  this.completedSentences[sentenceIndex].text = this.completedSentences[sentenceIndex].words.map(w => w.word).join(' ');
              }
              
              // Remove visual styling
              element.classList.remove('word-selected');
              element.classList.remove('word-completed');
              
              // Remove number element
              const numberElement = element.querySelector('.word-number');
              if (numberElement) {
                  numberElement.remove();
              }
              
              // Update display
              this.updateSentencePracticeList();
              return;
          }
          
          console.log('Word not found in any selection or completed sentence');
          return;
      }
      
      console.log('Removing word from current selection');
      // Remove the word from selection
      this.currentSelection.words.splice(wordIndex, 1);
      
      // Remove visual styling
      element.classList.remove('word-selected');
      element.classList.remove('word-completed');
      
      // Remove number element
      const numberElement = element.querySelector('.word-number');
      if (numberElement) {
          numberElement.remove();
      }
      
      // Renumber remaining words
      this.renumberWords();
  }

  renumberWords() {
      this.currentSelection.words.forEach((wordData, index) => {
          wordData.number = index + 1;
          const numberElement = wordData.element.querySelector('.word-number');
          if (numberElement) {
              numberElement.textContent = wordData.number;
          }
      });
  }

  updateSentencePracticeList() {
      const listContainer = document.getElementById('sentencePracticeList');
      const countContainer = document.getElementById('sentencePracticeCount');
      
      if (!listContainer || !countContainer) return;
      
      // Update count
      countContainer.textContent = `${this.completedSentences.length} sentence${this.completedSentences.length !== 1 ? 's' : ''} selected`;
      
      // Update list
      const html = this.completedSentences.map((sentence, index) => {
          const translation = this.sentencePracticeTranslationEnabled ? this.sentenceTranslations.get(sentence.text) : null;
          const translationHtml = translation ? `<div class="sentence-practice-translation">${translation}</div>` : '';
          
          return `
              <div class="sentence-practice-item">
                  <div class="sentence-practice-content">
                      <div class="sentence-practice-text">${sentence.text}</div>
                      ${translationHtml}
                  </div>
                  <div class="sentence-practice-actions">
                      <button class="sentence-practice-edit" onclick="learningSystem.editSentence(${index})" title="Edit sentence">
                          ✎
                      </button>
                      <button class="sentence-practice-remove" onclick="learningSystem.removeSentence(${index})" title="Remove sentence">
                          ×
                      </button>
                  </div>
              </div>
          `;
      }).join('');
      
      listContainer.innerHTML = html;
      
      // Apply current font and font size to all sentence text elements
      const sentenceTexts = listContainer.querySelectorAll('.sentence-practice-text');
      sentenceTexts.forEach(textElement => {
        textElement.style.fontFamily = this.currentFont;
        textElement.style.fontSize = this.currentFontSize + 'px';
      });
  }

  removeSentence(index) {
      if (index >= 0 && index < this.completedSentences.length) {
          const sentence = this.completedSentences[index];
          
          // Remove visual numbers from words
          sentence.words.forEach(wordData => {
              const numberElement = wordData.element.querySelector('.word-number');
              if (numberElement) {
                  numberElement.remove();
              }
              wordData.element.classList.remove('word-completed');
          });
          
          // Remove from completed sentences
          this.completedSentences.splice(index, 1);
          
          // Update display
          this.updateSentencePracticeList();
      }
  }

  editSentence(index) {
      if (index >= 0 && index < this.completedSentences.length) {
          const sentence = this.completedSentences[index];
          const listContainer = document.getElementById('sentencePracticeList');
          const sentenceItems = listContainer.querySelectorAll('.sentence-practice-item');
          
          if (sentenceItems[index]) {
              const item = sentenceItems[index];
              const originalText = sentence.text;
              
              // Replace the item content with edit form
              item.innerHTML = `
                  <div class="sentence-practice-edit-form">
                      <input type="text" class="sentence-practice-edit-input" value="${originalText}" />
                      <div class="sentence-practice-edit-buttons">
                          <button class="sentence-practice-save" onclick="learningSystem.saveSentenceEdit(${index})">Save</button>
                          <button class="sentence-practice-cancel" onclick="learningSystem.cancelSentenceEdit(${index}, '${originalText}')">Cancel</button>
                      </div>
                  </div>
              `;
              
              // Focus on the input
              const input = item.querySelector('.sentence-practice-edit-input');
              input.focus();
              input.select();
          }
      }
  }

  saveSentenceEdit(index) {
      if (index >= 0 && index < this.completedSentences.length) {
          const listContainer = document.getElementById('sentencePracticeList');
          const sentenceItems = listContainer.querySelectorAll('.sentence-practice-item');
          
          if (sentenceItems[index]) {
              const input = sentenceItems[index].querySelector('.sentence-practice-edit-input');
              const newText = input.value.trim();
              
              if (newText) {
                  // Update the sentence text
                  this.completedSentences[index].text = newText;
                  
                  // Update display
                  this.updateSentencePracticeList();
              }
          }
      }
  }

  cancelSentenceEdit(index, originalText) {
      if (index >= 0 && index < this.completedSentences.length) {
          // Restore original text
          this.completedSentences[index].text = originalText;
          
          // Update display
          this.updateSentencePracticeList();
      }
  }
}

// Initialize subpage when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log('=== LEARN SENTENCES WITH UNIQUE WORDS JS LOADED v16 ===');
    console.log('🔄 SENTENCE PRACTICE DATA PERSISTENCE - RESTORE FROM SESSIONSTORAGE 🚨');
    console.log('📝 FONT & FONT SIZE PREFERENCES NOW AFFECT ALL UI ELEMENTS 🚨');
    console.log('🕐 TIMESTAMP: ' + new Date().toISOString());
    
    // Initialize the learning system
    window.learningSystem = new UnknownWordsLearningSystem();
    window.learningSystem.initialize();
    
    // Initialize dictionary service
    window.dictionaryService = new DictionaryService();
}); 