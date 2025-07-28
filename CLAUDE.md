# VocabKiller - Vocabulary Learning Tool

> **Important Note:**  
> **Do NOT change, modify, or refactor any of the website's existing interface, UI, or functional code unless I explicitly request and approve it.**  
> **All edits, enhancements, or feature additions must be confirmed by me before implementation.**  
> **This includes, but is not limited to, changes in layout, styles, interactions, or business logic of VocabKiller.**

## Overview

VocabKiller is a React-based web application designed to help English learners analyze texts, identify unique words, and study vocabulary in context. The application provides an interactive three-column layout for text analysis, word extraction, and contextual study notes.

## Project Structure

```
VocabKiller/
├── public/                 # Static assets and index.html
│   ├── index.html         # Main HTML template with mobile optimizations
│   ├── manifest.json      # PWA manifest
│   └── *.svg             # UI icons (play, pause, translate, etc.)
├── src/                   # Source code
│   ├── App.js            # Main application component (2000+ lines)
│   ├── index.js          # React root component initialization
│   ├── index.css         # Global styles with Tailwind and mobile optimizations
│   ├── data/
│   │   └── basicWords.json # Dolch sight words list (220 common words)
│   └── utils/
│       └── groupByDifficulty.js # Word categorization utilities
├── package.json          # Dependencies and scripts
├── tailwind.config.js    # Tailwind CSS configuration
├── postcss.config.js     # PostCSS configuration
└── README.md             # Comprehensive project documentation
```

## Core Technologies

- **React 18.2.0** - Frontend framework with hooks
- **Tailwind CSS 3.1.6** - Utility-first CSS framework
- **Create React App 5.0.1** - Build tooling and development server
- **Web Speech API** - Text-to-speech functionality
- **Google Translate API** - Translation services

## Main Components and Features

### 1. Text Processing (`App.js:178-210`)
- **Word Extraction**: Uses regex patterns to extract and clean words from input text
- **Frequency Counting**: Counts occurrences of each unique word
- **Real-time Processing**: Updates analysis as user types or pastes content
- **Progress Tracking**: Shows processing status for large texts

### 2. Word Categorization (`utils/groupByDifficulty.js`)
- **Simple Words**: Categorizes words using Dolch sight words list (220 basic English words)
- **Challenging Words**: Identifies advanced vocabulary not in the basic words list
- **Statistics**: Provides percentage breakdown of simple vs challenging words
- **Functions**:
  - `groupWords(uniqueWords)` - Categorizes words into simple/challenging groups
  - `getGroupingStats(groups)` - Calculates word distribution statistics

### 3. Search and Navigation (`App.js:363-506`)
- **Text Search**: Real-time search within the original text
- **Match Highlighting**: Highlights search results with yellow background
- **Navigation Controls**: Previous/next buttons and keyboard shortcuts (Enter)
- **Match Counter**: Shows current match position (e.g., "3 of 15")
- **Auto-scroll**: Automatically scrolls to and centers search results

### 4. Interactive Study System (`App.js:81-150`)
- **Click-to-Study**: Click any word in the unique words list to see it in context
- **Sentence Extraction**: Finds all sentences containing the selected word
- **Word Highlighting**: Selected words are highlighted in yellow within sentences
- **Context Learning**: Learn vocabulary through real sentence examples

### 5. Speech Synthesis (`App.js:507-580, 620-800`)
- **Multi-voice Support**: Detects and lists available English voices
- **Speed Control**: Adjustable speech rate (0.5x to 2.0x)
- **Chunked Speech**: Handles long texts by breaking into manageable chunks
- **Pause/Resume**: Can pause and resume speech at word level
- **Separate Controls**: Independent speech controls for different text areas
- **AI Voice Option**: Enhanced speech synthesis with improved pronunciation

### 6. Translation Features (`App.js:125-141`)
- **Multi-language Support**: Translation to various languages (default: Chinese)
- **Section-specific Translation**: Independent translation for each column
- **Progress Tracking**: Shows translation progress for large texts
- **Toggle Display**: Show/hide translations while preserving originals
- **Supported Languages**: Chinese (zh), Spanish (es), French (fr), German (de), etc.

### 7. UI Customization (`App.js:146-150`)
- **Font Controls**: Customizable font family and size
- **Column Resizing**: Adjustable column widths in three-panel layout
- **Display Modes**: Toggle between sentence and paragraph view
- **Edit/Read Modes**: Switch between text editing and read-only viewing
- **Mobile Optimization**: Responsive design with touch-friendly controls

## State Management

The application uses React hooks for state management:

### Core Text States
- `inputText` - Main text input
- `uniqueWords` - Extracted unique words with frequency counts
- `noteWords` - Words selected for study notes
- `totalWords` - Total word count in text
- `uniqueCount` - Number of unique words

### Search States
- `searchText` - Current search query
- `searchResults` - Array of search match positions
- `currentMatchIndex` - Currently highlighted match

### Speech States
- `isSpeaking` - Individual word pronunciation status
- `isOriginalTextSpeaking` - Original text speech status
- `isStudyNotesSpeaking` - Study notes speech status
- `speechSpeed` - Speech rate setting
- `availableVoices` - List of available TTS voices

### Translation States
- `showOriginalTextTranslation` - Translation visibility for main text
- `showUniqueWordsTranslation` - Translation visibility for word list
- `showStudyNotesTranslation` - Translation visibility for study notes
- `targetLanguage` - Selected translation language

### UI States
- `isEditMode` - Text editing vs read-only mode
- `columnWidths` - Three-column layout proportions
- `fontFamily` - Selected font family
- `fontSize` - Text size setting

## Key Functions

### Text Processing
- **Word extraction and cleaning** (`App.js:178-210`)
- **Frequency counting and sorting**
- **Progress tracking for large texts**

### Search Functionality
- **`handleSearchChange()`** - Updates search results in real-time
- **`navigateToMatch()`** - Jumps to specific search result
- **`handleSearchKeyDown()`** - Keyboard navigation support

### Speech Synthesis
- **`speakWithEnhancedAI()`** - Enhanced TTS with better pronunciation
- **`handleChunkedSpeech()`** - Manages long text speech in chunks
- **Voice loading and selection logic**

### Translation Services
- **Async translation functions for each text section**
- **Progress tracking for translation batches**
- **Language detection and target language selection**

## Mobile Optimization

The application includes extensive mobile and tablet optimizations:

### CSS Optimizations (`index.css`)
- Touch target sizing (minimum 44px)
- Disabled zoom on input focus
- Smooth scrolling for touch devices
- iPad-specific positioning fixes
- Overscroll behavior management

### HTML Optimizations (`public/index.html`)
- Viewport meta tags for mobile devices
- Apple mobile web app configurations
- PWA manifest integration
- Telephone number detection disabled

## Development Commands

```bash
# Install dependencies
npm install

# Start development server
npm start

# Build for production
npm run build

# Run tests
npm test

# Eject from Create React App (one-way operation)
npm run eject
```

## API Dependencies

### External Services
- **Google Translate API** - For text translation features
- **Web Speech API** - For text-to-speech functionality (browser native)

### Data Files
- **`basicWords.json`** - Contains 220 Dolch sight words for word difficulty classification

## Browser Support

- **Modern browsers** with Web Speech API support
- **Mobile browsers** with touch optimization
- **PWA capabilities** for mobile installation

## Performance Considerations

- **Chunked processing** for large texts to prevent UI blocking
- **Memoized functions** to prevent unnecessary re-renders
- **Efficient search algorithms** with real-time highlighting
- **Lazy loading** of speech voices and translation services

## Educational Use Cases

### For Language Learners
- Vocabulary expansion through authentic text analysis
- Context-based word learning with sentence examples
- Pronunciation practice with TTS
- Difficulty assessment with word categorization

### For Teachers
- Text complexity analysis for reading materials
- Custom vocabulary list generation
- Student progress tracking through word frequency analysis
- Multi-language support for diverse classrooms

## Future Enhancement Opportunities

- Word difficulty ratings beyond basic/challenging
- Spaced repetition system integration
- Export functionality for word lists and progress
- Offline mode with service worker
- Advanced analytics and learning progress tracking
- Integration with external dictionary APIs
- Multi-user support with progress saving