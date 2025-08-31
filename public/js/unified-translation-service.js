// Unified Translation Service for VocabKiller
// Implements the new translation strategy across all pages

class UnifiedTranslationService {
    constructor() {
        // Use the same working API endpoints as homepage
        this.lingvaUrl = 'https://lingva.ml/api/v1';
        this.googleTranslateUrl = 'https://translate.googleapis.com/translate_a/single';
        
        // Cache for translations
        this.vocabularyCache = new Map();
        this.sentenceCache = new Map();
        this.maxCacheSize = 200;
        
        // Initialize common word translations
        this.initializeCommonWords();
    }

    // Initialize common word translations for offline use
    initializeCommonWords() {
        const commonWords = {
            'hello': '你好',
            'world': '世界',
            'good': '好的',
            'bad': '坏的',
            'big': '大的',
            'small': '小的',
            'fast': '快的',
            'slow': '慢的',
            'new': '新的',
            'old': '旧的',
            'yes': '是的',
            'no': '不',
            'please': '请',
            'thank': '谢谢',
            'sorry': '对不起',
            'help': '帮助',
            'time': '时间',
            'day': '天',
            'night': '夜晚',
            'morning': '早上',
            'afternoon': '下午',
            'evening': '晚上'
        };

        Object.entries(commonWords).forEach(([word, translation]) => {
            this.vocabularyCache.set(`${word}_zh`, {
                translation: translation,
                source: 'offline-cache'
            });
        });
    }

    // Main translation method - same as working homepage
    async translateText(text, targetLang = 'zh') {
        try {
            // Handle special language codes for the API
            let apiLangCode = targetLang;
            if (targetLang === 'zh-tw') {
                apiLangCode = 'zh_TW'; // Traditional Chinese
            } else if (targetLang === 'zh') {
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
            return data.translation || `[Translation unavailable: ${text}]`;
        } catch (error) {
            console.error('Lingva translation error:', error);
            // Fallback to Google Translate direct API
            try {
                return await this.translateWithGoogleFallback(text, targetLang);
            } catch (fallbackError) {
                console.error('Fallback translation error:', fallbackError);
                return `[Translation failed: ${text}]`;
            }
        }
    }

    // Fallback translation using Google Translate direct API
    async translateWithGoogleFallback(text, targetLang) {
        try {
            const response = await fetch(
                `${this.googleTranslateUrl}?client=gtx&sl=en&tl=${targetLang === 'zh-tw' ? 'zh-TW' : targetLang}&dt=t&q=${encodeURIComponent(text)}`
            );
            
            if (!response.ok) {
                throw new Error(`Fallback HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            return data[0][0][0] || `[Fallback translation unavailable: ${text}]`;
        } catch (error) {
            console.error('Google Translate fallback error:', error);
            return `[Translation unavailable: ${text}]`;
        }
    }

    // Manage cache size
    manageCacheSize(cache) {
        if (cache.size > this.maxCacheSize) {
            const entriesToRemove = Math.floor(this.maxCacheSize * 0.2);
            const keys = Array.from(cache.keys()).slice(0, entriesToRemove);
            keys.forEach(key => cache.delete(key));
        }
    }

    // VOCABULARY TRANSLATION: Use same method as working homepage
    async translateVocabulary(word, targetLang = 'zh') {
        const cacheKey = `${word}_${targetLang}`;
        
        // Check cache first
        if (this.vocabularyCache.has(cacheKey)) {
            return this.vocabularyCache.get(cacheKey);
        }

        console.log(`Translating vocabulary: ${word} (${targetLang})`);

        try {
            // Use the same working translation method as homepage
            const translation = await this.translateText(word, targetLang);
            
            // Create result object
            const result = {
                translation: translation,
                source: 'lingva'
            };

            // Cache the result
            this.vocabularyCache.set(cacheKey, result);
            this.manageCacheSize(this.vocabularyCache);

            return result;

        } catch (error) {
            console.error(`Vocabulary translation error for ${word}:`, error);
            return {
                translation: `[Translation failed: ${word}]`,
                source: 'error'
            };
        }
    }

    // SENTENCE TRANSLATION: Use same method as working homepage
    async translateSentence(sentence, targetLang = 'zh') {
        const cacheKey = `${sentence}_${targetLang}`;
        
        // Check cache first
        if (this.sentenceCache.has(cacheKey)) {
            return this.sentenceCache.get(cacheKey);
        }

        console.log(`Translating sentence: ${sentence.substring(0, 50)}... (${targetLang})`);

        try {
            // Use the same working translation method as homepage
            const translation = await this.translateText(sentence, targetLang);
            
            const result = {
                translation: translation,
                source: 'lingva'
            };

            // Cache the result
            this.sentenceCache.set(cacheKey, result);
            this.manageCacheSize(this.sentenceCache);

            return result;

        } catch (error) {
            console.error(`Sentence translation error:`, error);
            return {
                translation: `[Translation failed: ${sentence.substring(0, 50)}...]`,
                source: 'error'
            };
        }
    }



    // Clear all caches
    clearCaches() {
        this.vocabularyCache.clear();
        this.sentenceCache.clear();
        this.initializeCommonWords(); // Re-initialize common words
        console.log('All translation caches cleared');
    }

    // Get cache statistics
    getCacheStats() {
        return {
            vocabularyCache: this.vocabularyCache.size,
            sentenceCache: this.sentenceCache.size,
            totalCacheSize: this.vocabularyCache.size + this.sentenceCache.size
        };
    }
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = UnifiedTranslationService;
}


