// Learn Unknown Words_2 Subpage JavaScript

class UnknownWordsLearningSystem2 {
    constructor() {
        // Data from previous subpage
        this.unknownWords = [];
        this.originalText = '';
        this.fontFamily = 'Arial';
        this.fontSize = 18;
        this.targetLanguage = 'zh';
        this.selectedVoice = null;
        this.speechSpeed = 1.0;
        
        // Initialize the system
        this.initialize();
    }
    
    initialize() {
        this.loadData();
        this.setupEventListeners();
        this.displayLoadedData();
    }
    
    loadData() {
        // Load data from sessionStorage
        const savedData = sessionStorage.getItem('learnUnknownWords2Data');
        if (savedData) {
            try {
                const data = JSON.parse(savedData);
                this.unknownWords = data.unknownWords || [];
                this.originalText = data.originalText || '';
                this.fontFamily = data.fontFamily || 'Arial';
                this.fontSize = data.fontSize || 18;
                this.targetLanguage = data.targetLanguage || 'zh';
                this.selectedVoice = data.selectedVoice || null;
                this.speechSpeed = data.speechSpeed || 1.0;
                
                console.log('Data loaded successfully:', {
                    unknownWordsCount: this.unknownWords.length,
                    originalTextLength: this.originalText.length,
                    fontFamily: this.fontFamily,
                    fontSize: this.fontSize,
                    targetLanguage: this.targetLanguage
                });
            } catch (error) {
                console.error('Error loading data:', error);
                this.showError('Failed to load data from previous page');
            }
        } else {
            console.warn('No data found from previous subpage');
            this.showError('No data available from previous page');
        }
    }
    
    displayLoadedData() {
        const contentArea = document.getElementById('contentArea');
        if (!contentArea) return;
        
        if (this.unknownWords.length === 0) {
            contentArea.innerHTML = `
                <div class="placeholder-content">
                    <h2>Learn Unknown Words_2</h2>
                    <p>No unknown words data available.</p>
                    <p>Please go back to the previous page and add some unknown words first.</p>
                </div>
            `;
            return;
        }
        
        // Display the loaded data
        contentArea.innerHTML = `
            <div class="loaded-data-display">
                <h2>Data Loaded Successfully</h2>
                <div class="data-summary">
                    <p><strong>Unknown Words:</strong> ${this.unknownWords.length} words</p>
                    <p><strong>Original Text:</strong> ${this.originalText.length} characters</p>
                    <p><strong>Font:</strong> ${this.fontFamily} ${this.fontSize}px</p>
                    <p><strong>Translation Language:</strong> ${this.getLanguageName(this.targetLanguage)}</p>
                </div>
                
                <div class="unknown-words-preview">
                    <h3>Unknown Words List:</h3>
                    <ul>
                        ${this.unknownWords.map(word => `<li>${word}</li>`).join('')}
                    </ul>
                </div>
                
                <div class="original-text-preview">
                    <h3>Original Text Preview:</h3>
                    <div class="text-preview">
                        ${this.originalText.substring(0, 200)}${this.originalText.length > 200 ? '...' : ''}
                    </div>
                </div>
                
                <div class="ready-message">
                    <p><strong>Ready for Implementation:</strong></p>
                    <p>This subpage is ready for your content implementation. All data from the previous page has been loaded and is available for use.</p>
                </div>
            </div>
        `;
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
        return languageNames[languageCode] || languageCode.toUpperCase();
    }
    
    showError(message) {
        const contentArea = document.getElementById('contentArea');
        if (contentArea) {
            contentArea.innerHTML = `
                <div class="error-message">
                    <h2>Error</h2>
                    <p>${message}</p>
                    <button onclick="learningSystem2.closeSubpage()" class="error-btn">
                        Go Back
                    </button>
                </div>
            `;
        }
    }
    
    setupEventListeners() {
        // Add any event listeners here
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeSubpage();
            }
        });
    }
    
    closeSubpage() {
        // Close the current window/tab
        window.close();
        
        // Fallback: if window.close() doesn't work, try to go back
        if (!window.closed) {
            window.history.back();
        }
    }
}

// Initialize the system when the page loads
let learningSystem2;

document.addEventListener('DOMContentLoaded', () => {
    learningSystem2 = new UnknownWordsLearningSystem2();
}); 