// Subpage Translation Manager for VocabKiller
// Provides cache-aware translation with homepage method fallback

class SubpageTranslationManager {
    constructor() {
        this.cache = this.loadHomepageCache();
        this.targetLanguage = this.getTargetLanguage();
        this.lingvaUrl = 'https://lingva.ml/api/v1';
        this.googleTranslateUrl = 'https://translate.googleapis.com/translate_a/single';
        
        console.log('SubpageTranslationManager initialized with cache:', this.cache ? 'loaded' : 'empty');
        console.log('Target language:', this.targetLanguage);
    }

    // Load translation cache from homepage
    loadHomepageCache() {
        try {
            const cacheData = sessionStorage.getItem('vocabKillerTranslationCache');
            if (cacheData) {
                const cache = JSON.parse(cacheData);
                console.log('Loaded translation cache with', Object.keys(cache.words || {}).length, 'words');
                return cache;
            }
        } catch (error) {
            console.warn('Error loading homepage translation cache:', error);
        }
        return { words: {}, language: 'zh', timestamp: 0, source: 'empty' };
    }

    // Get target language from localStorage (same as subpages)
    getTargetLanguage() {
        return localStorage.getItem('vocabKillerTranslationLanguage') || 'zh';
    }

    // Check if cached translation exists and is valid
    getCachedTranslation(word) {
        const normalizedWord = word.toLowerCase().trim();
        const cached = this.cache.words[normalizedWord];
        
        if (cached && cached.language === this.targetLanguage) {
            console.log(`Using cached translation for "${word}": ${cached.translation}`);
            return cached.translation;
        }
        
        return null;
    }

    // Update cache with new translation
    updateCache(word, translation) {
        const normalizedWord = word.toLowerCase().trim();
        this.cache.words[normalizedWord] = {
            translation: translation,
            language: this.targetLanguage,
            timestamp: Date.now()
        };
        
        // Save updated cache back to sessionStorage
        try {
            sessionStorage.setItem('vocabKillerTranslationCache', JSON.stringify(this.cache));
        } catch (error) {
            console.warn('Error saving updated translation cache:', error);
        }
    }

    // Main translation method - cache first, then API
    async translateWord(word) {
        // 1. Check cache first
        const cached = this.getCachedTranslation(word);
        if (cached) {
            return cached;
        }
        
        // 2. Translate using homepage method
        console.log(`Translating new word: "${word}"`);
        try {
            const translation = await this.translateWithHomepageMethod(word);
            
            // 3. Update cache
            this.updateCache(word, translation);
            
            return translation;
        } catch (error) {
            console.error(`Error translating word "${word}":`, error);
            return `[Translation failed: ${word}]`;
        }
    }

    // Translate using same method as homepage Original Text
    async translateWithHomepageMethod(text) {
        try {
            // Handle special language codes for the API
            let apiLangCode = this.targetLanguage;
            if (this.targetLanguage === 'zh-tw') {
                apiLangCode = 'zh_TW'; // Traditional Chinese
            } else if (this.targetLanguage === 'zh') {
                apiLangCode = 'zh'; // Simplified Chinese
            }
            
            // Using Lingva Translate - same as homepage
            const response = await fetch(
                `${this.lingvaUrl}/en/${apiLangCode}/${encodeURIComponent(text)}`
            );
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            const translation = data.translation || `[Translation unavailable: ${text}]`;
            console.log(`Lingva.ml translation success: "${text}" -> "${translation}"`);
            return translation;
        } catch (error) {
            console.error('Lingva translation error:', error);
            // Fallback to Google Translate direct API
            try {
                return await this.translateWithGoogleFallback(text);
            } catch (fallbackError) {
                console.error('Fallback translation error:', fallbackError);
                return `[Translation failed: ${text}]`;
            }
        }
    }

    // Fallback translation using Google Translate direct API
    async translateWithGoogleFallback(text) {
        try {
            console.log(`Trying Google Translate fallback for: "${text}"`);
            const response = await fetch(
                `${this.googleTranslateUrl}?client=gtx&sl=en&tl=${this.targetLanguage === 'zh-tw' ? 'zh-TW' : this.targetLanguage}&dt=t&q=${encodeURIComponent(text)}`
            );
            
            if (!response.ok) {
                throw new Error(`Fallback HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            const translation = data[0][0][0] || `[Fallback translation unavailable: ${text}]`;
            console.log(`Google Translate fallback success: "${text}" -> "${translation}"`);
            return translation;
        } catch (error) {
            console.error('Google Translate fallback error:', error);
            return `[Translation unavailable: ${text}]`;
        }
    }

    // Batch translation with cache awareness
    async translateWordList(words, progressCallback = null) {
        const results = {};
        const wordsToTranslate = [];
        
        console.log(`Processing ${words.length} words for translation`);
        
        // Separate cached vs new words
        for (const word of words) {
            const cached = this.getCachedTranslation(word);
            if (cached) {
                results[word] = cached;
            } else {
                wordsToTranslate.push(word);
            }
        }
        
        console.log(`Found ${Object.keys(results).length} cached translations, ${wordsToTranslate.length} words to translate`);
        
        // Translate only new words (sequential, like homepage)
        for (let i = 0; i < wordsToTranslate.length; i++) {
            const word = wordsToTranslate[i];
            
            if (progressCallback) {
                progressCallback(i, wordsToTranslate.length, word);
            }
            
            results[word] = await this.translateWithHomepageMethod(word);
            this.updateCache(word, results[word]);
            
            // Same delay as homepage Original Text
            if (i < wordsToTranslate.length - 1) {
                await new Promise(resolve => setTimeout(resolve, 100));
            }
        }
        
        console.log(`Translation batch completed: ${words.length} total words processed`);
        return results;
    }

    // Get cache statistics
    getCacheStats() {
        return {
            totalWords: Object.keys(this.cache.words).length,
            language: this.cache.language,
            timestamp: this.cache.timestamp,
            source: this.cache.source
        };
    }

    // Clear cache
    clearCache() {
        this.cache = { words: {}, language: this.targetLanguage, timestamp: 0, source: 'cleared' };
        sessionStorage.removeItem('vocabKillerTranslationCache');
        console.log('Translation cache cleared');
    }

    // Update target language
    updateTargetLanguage(newLanguage) {
        this.targetLanguage = newLanguage;
        console.log('Translation manager language updated to:', newLanguage);
    }
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SubpageTranslationManager;
}