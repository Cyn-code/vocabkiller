// VocabKiller v1.0.1 - Enhanced sitemap and simplified robots.txt
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { groupWords, getGroupingStats } from './utils/groupByDifficulty';
import basicWords from './data/basicWords.json';
import { generateStudyUnknownWordsHTML } from './studyUnknownWordsTemplate';
import UsageLimitModal from './components/UsageLimitModal';


// SVG Icon Components
const PlayIcon = ({ className = "w-4 h-4" }) => (
  <img src="/images/play.svg" alt="Play" className={className} />
);

const PauseIcon = ({ className = "w-4 h-4" }) => (
  <svg className={className} viewBox="0 0 1024 1024" fill="currentColor">
    <path d="M512 1024C229.226667 1024 0 794.773333 0 512S229.226667 0 512 0s512 229.226667 512 512-229.226667 512-512 512z m0-85.333333c235.648 0 426.666667-191.018667 426.666667-426.666667S747.648 85.333333 512 85.333333 85.333333 276.352 85.333333 512s191.018667 426.666667 426.666667 426.666667z m-64-213.333334h-85.333333V298.666667h85.333333v426.666666z m213.333333 0h-85.333333V298.666667h85.333333v426.666666z" />
  </svg>
);

const TranslateIcon = ({ className = "w-4 h-4" }) => (
  <svg className={className} viewBox="0 0 1024 1024" fill="currentColor">
    <path d="M512 64a448 448 0 1 1 0 896A448 448 0 0 1 512 64z m-41.6 489.6l-143.808 0.064c6.656 119.04 47.04 222.912 121.536 312.96l4.48 5.376c5.888 0.96 11.84 1.792 17.792 2.432V553.6z m216.32 0H553.6v320.832c3.968-0.448 7.872-0.96 11.776-1.536 75.52-91.648 115.904-197.632 121.344-319.232z m187.712 0h-104.448c-3.904 99.392-28.352 190.528-73.216 273.024a364.928 364.928 0 0 0 177.664-272.96z m-631.168 0.064H149.568a364.8 364.8 0 0 0 166.784 266.24c-43.904-80.64-68.288-169.472-73.088-266.24z m60.672-341.376l-5.248 3.776a364.544 364.544 0 0 0-149.12 254.336h94.144c5.12-92.608 25.152-178.752 60.224-258.112z m249.728-62.72L553.6 470.4h131.84c-7.808-112.448-40.512-212.864-97.984-301.888l-10.368-15.552a364.352 364.352 0 0 0-23.424-3.392z m-124.8 7.168l9.6-14.208C371.712 237.952 334.592 347.008 327.04 470.4H470.4V149.568c-14.08 1.6-27.968 3.968-41.536 7.168z m270.912 42.432l4.096 8.576c37.376 80.512 59.072 168.192 65.024 262.656h105.6a364.864 364.864 0 0 0-174.72-271.232z" />
  </svg>
);

const ReadTextIcon = ({ className = "w-4 h-4" }) => (
  <svg className={className} viewBox="0 0 1024 1024" fill="currentColor">
    <path d="M576.042667 161.834667a9.088 9.088 0 0 0-1.749334-5.888 16.384 16.384 0 0 0-7.168-5.12 17.792 17.792 0 0 0-17.493333 1.706666l-1.962667 1.621334-143.274666 136.746666c-32.597333 31.104-72.448 44.202667-107.221334 50.176-34.304 5.930667-69.888 5.845333-97.152 5.845334C122.069333 346.88 64.042667 406.528 64.042667 473.813333v76.373334c0 67.285333 58.026667 126.890667 136.021333 126.890666 27.221333 0 62.805333-0.085333 97.109333 5.845334 34.773333 5.973333 74.666667 19.072 107.221334 50.176l143.274666 136.746666 2.005334 1.664c4.821333 3.456 10.965333 4.224 17.450666 1.664a16.341333 16.341333 0 0 0 7.168-5.12 9.088 9.088 0 0 0 1.749334-5.888V161.834667zM942.549333 512c0-72.277333-32.426667-135.594667-81.493333-175.104l-10.026667-7.552a40.234667 40.234667 0 0 1-9.472-56.405333 40.96 40.96 0 0 1 56.832-9.429334C974.72 317.568 1024.042667 409.173333 1024.042667 512c0 102.826667-49.322667 194.474667-125.653334 248.490667l-3.541333 2.218666a40.96 40.96 0 0 1-50.730667-8.405333l-2.56-3.242667a40.234667 40.234667 0 0 1 9.472-56.405333c51.2-36.224 86.869333-97.28 91.136-168.32l0.426667-14.336z m-152.021333 0c0-26.965333-14.506667-52.693333-39.978667-69.76l-5.248-3.285333a40.277333 40.277333 0 0 1-14.208-55.424 40.96 40.96 0 0 1 55.808-14.08c49.834667 29.44 85.077333 81.322667 85.077334 142.549333l-0.426667 11.392c-4.010667 56.234667-37.930667 103.594667-84.650667 131.157333l-3.669333 1.92c-17.493333 8.064-38.357333 2.773333-49.834667-12.586666l-2.304-3.413334a40.277333 40.277333 0 0 1 14.208-55.466666c26.922667-15.872 43.093333-40.874667 45.056-67.626667l0.170667-5.376zM640.042667 862.165333l-0.256 6.229334c-4.906667 61.781333-82.261333 92.373333-131.498667 52.053333l-4.821333-4.266667-143.317334-136.789333c-34.816-33.28-88.192-37.632-138.666666-38.229333l-21.461334-0.085334c-106.965333 0-194.389333-80.213333-199.722666-181.077333L0.042667 550.186667v-76.373334c0-102.101333 84.053333-185.514667 189.696-190.634666l10.325333-0.256c52.736 0 112.341333-0.256 152.32-31.573334l7.765333-6.741333L503.509333 107.818667C553.856 59.733333 640 93.866667 640.042667 161.834667v700.330666z" />
  </svg>
);

const ProcessingIcon = ({ className = "w-4 h-4" }) => (
  <img src="/images/Processing.svg" alt="Processing" className={className} />
);

const WaitingIcon = ({ className = "w-4 h-4" }) => (
  <img src="/images/waiting.svg" alt="Waiting" className={className} />
);

// Additional icons for UI elements
const DocumentIcon = ({ className = "w-4 h-4" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z" />
  </svg>
);

const SearchIcon = ({ className = "w-4 h-4" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M9.5,3A6.5,6.5 0 0,1 16,9.5C16,11.11 15.41,12.59 14.44,13.73L14.71,14H15.5L20.5,19L19,20.5L14,15.5V14.71L13.73,14.44C12.59,15.41 11.11,16 9.5,16A6.5,6.5 0 0,1 3,9.5A6.5,6.5 0 0,1 9.5,3M9.5,5C7,5 5,7 5,9.5C5,12 7,14 9.5,14C12,14 14,12 14,9.5C14,7 12,5 9.5,5Z" />
  </svg>
);

const EditIcon = ({ className = "w-4 h-4" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M20.71,7.04C21.1,6.65 21.1,6 20.71,5.63L18.37,3.29C18,2.9 17.35,2.9 16.96,3.29L15.12,5.12L18.87,8.87M3,17.25V21H6.75L17.81,9.93L14.06,6.18L3,17.25Z" />
  </svg>
);

const CheckIcon = ({ className = "w-4 h-4" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M21,7L9,19L3.5,13.5L4.91,12.09L9,16.17L19.59,5.59L21,7Z" />
  </svg>
);

const BookIcon = ({ className = "w-4 h-4" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M19,2L14,6.5V17.5L19,13V2M6.5,5C4.55,5 2.45,5.4 1,6.5V21.16C1,21.41 1.25,21.66 1.5,21.66C1.6,21.66 1.65,21.59 1.75,21.59C3.1,20.94 5.05,20.68 6.5,20.68C8.45,20.68 10.55,21.1 12,22C13.35,21.15 15.8,20.68 17.5,20.68C19.15,20.68 20.85,20.92 22.25,21.81C22.35,21.86 22.4,21.91 22.5,21.91C22.75,21.91 23,21.66 23,21.41V6.5C22.4,6.05 21.75,5.75 21,5.5V7.5L21,13V19C20.38,18.78 19.88,18.68 19.5,18.68C18.53,18.68 17.5,18.92 16.5,19.5C15.55,18.92 14.45,18.68 13.5,18.68C12.53,18.68 11.47,18.92 10.5,19.5C9.5,18.92 8.45,18.68 7.5,18.68C6.8,18.68 5.9,18.78 5,19V13L5,7.5C5.4,7.15 5.9,6.85 6.5,6.85C7.6,6.85 8.65,7.14 9.5,7.65C10.35,7.14 11.4,6.85 12.5,6.85C13.6,6.85 14.65,7.14 15.5,7.65C16.35,7.14 17.4,6.85 18.5,6.85C19.1,6.85 19.6,7.15 20,7.5V5.5C19.25,5.75 18.6,6.05 18,6.5V2L13,6.5V17.5L18,13V7.5C17.85,7.5 17.75,7.5 17.5,7.5C16.1,7.5 14.5,7.92 13.5,8.5C12.5,7.92 10.9,7.5 9.5,7.5C8.1,7.5 6.5,7.92 5.5,8.5C4.5,7.92 2.9,7.5 1.5,7.5C1.25,7.5 1.15,7.5 1,7.5V6.5C2.45,5.4 4.55,5 6.5,5Z" />
  </svg>
);

const EyeIcon = ({ className = "w-4 h-4" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12,9A3,3 0 0,0 9,12A3,3 0 0,0 12,15A3,3 0 0,0 15,12A3,3 0 0,0 12,9M12,17A5,5 0 0,1 7,12A5,5 0 0,1 12,7A5,5 0 0,1 17,12A5,5 0 0,1 12,17M12,4.5C7,4.5 2.73,7.61 1,12C2.73,16.39 7,19.5 12,19.5C17,19.5 21.27,16.39 23,12C21.27,7.61 17,4.5 12,4.5Z" />
  </svg>
);

const FontIcon = ({ className = "w-4 h-4" }) => (
  <img src="/images/font.svg" alt="Font" className={className} />
);

const ExpandIcon = ({ className = "w-4 h-4" }) => (
  <img src="/images/expand.svg" alt="Expand" className={className} />
);

const SortIcon = ({ className = "w-4 h-4" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M3,13H5V11H3V13M3,17H5V15H3V17M7,13H21V11H7V13M7,17H21V15H7V17M3,7H5V5H3V7M7,7H21V5H7V7Z" />
  </svg>
);

export default function App() {
  const [inputText, setInputText] = useState('');
  const [uniqueWords, setUniqueWords] = useState([]);
  const [noteWords, setNoteWords] = useState([]);
  const [totalWords, setTotalWords] = useState(0);
  const [uniqueCount, setUniqueCount] = useState(0);
  const [isEditMode, setIsEditMode] = useState(false); // Default to read-only
  const [columnWidths, setColumnWidths] = useState([33.33, 33.33, 33.34]); // percentages - even distribution
  const [showParagraphs, setShowParagraphs] = useState(false); // false = sentences, true = paragraphs
  const [savedScrollPosition, setSavedScrollPosition] = useState(0);
  // Removed unused userChoseToEdit state
  
  // Search functionality
  const [searchText, setSearchText] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [currentMatchIndex, setCurrentMatchIndex] = useState(-1);
  const [availableVoices, setAvailableVoices] = useState([]);
  const [selectedVoice, setSelectedVoice] = useState(null);
  const [useAIVoice, setUseAIVoice] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false); // For individual word pronunciations
  const [isOriginalTextSpeaking, setIsOriginalTextSpeaking] = useState(false); // For Original Text speech only
  const [speechSpeed, setSpeechSpeed] = useState(1.0); // Default normal speed
  const [speechControlsExpanded, setSpeechControlsExpanded] = useState(false); // Collapsed by default, translation options now always visible
  const [isChunkedSpeaking, setIsChunkedSpeaking] = useState(false); // Track chunked speech
  const [readOptionsExpanded, setReadOptionsExpanded] = useState(false); // Read options dropdown
  const [speechPosition, setSpeechPosition] = useState({ chunkIndex: 0, textPosition: 0, wordIndex: 0 }); // Track speech position for resume
  const [speechWasPaused, setSpeechWasPaused] = useState(false);
  const [pausedChunks, setPausedChunks] = useState([]); // Store chunks for resume
  const [pausedOptions, setPausedOptions] = useState({}); // Store speech options for resume
  const [pausedText, setPausedText] = useState(''); // Store original text for non-chunked resume
  const [hasSelection, setHasSelection] = useState(false); // Track if user has selected text
  const [originalTextSpeechStartTime, setOriginalTextSpeechStartTime] = useState(0); // Track speech start time for word-level resume
  const [originalTextSpeechElapsedTime, setOriginalTextSpeechElapsedTime] = useState(0); // Track elapsed time for word-level resume
  
  // Study Notes speech states (separate from Original Text)
  const [isStudyNotesSpeaking, setIsStudyNotesSpeaking] = useState(false);
  const [studyNotesWasPaused, setStudyNotesWasPaused] = useState(false);
  const [pausedStudyNotesChunks, setPausedStudyNotesChunks] = useState([]);
  const [pausedStudyNotesOptions, setPausedStudyNotesOptions] = useState({});
  const [studyNotesSpeechPosition, setStudyNotesSpeechPosition] = useState({ chunkIndex: 0, segmentIndex: 0, wordIndex: 0 });
  const [currentStudyNotesSegment, setCurrentStudyNotesSegment] = useState('');
  const [speechStartTime, setSpeechStartTime] = useState(0);
  const [speechElapsedTime, setSpeechElapsedTime] = useState(0);
  
  // Translation states
  const [showOriginalTextTranslation, setShowOriginalTextTranslation] = useState(false);
  const [showUniqueWordsTranslation, setShowUniqueWordsTranslation] = useState(false);
  const [showStudyNotesTranslation, setShowStudyNotesTranslation] = useState(false);
  const [originalTextTranslations, setOriginalTextTranslations] = useState({});
  const [uniqueWordsTranslations, setUniqueWordsTranslations] = useState({});
  const [studyNotesTranslations, setStudyNotesTranslations] = useState({});
  const [isTranslatingOriginalText, setIsTranslatingOriginalText] = useState(false);
  const [isTranslatingUniqueWords, setIsTranslatingUniqueWords] = useState(false);
  const [isTranslatingStudyNotes, setIsTranslatingStudyNotes] = useState(false);
  const [targetLanguage, setTargetLanguage] = useState('zh'); // Default to Chinese

  const [translationProgress, setTranslationProgress] = useState({
    originalText: { current: 0, total: 0 },
    uniqueWords: { current: 0, total: 0 },
    studyNotes: { current: 0, total: 0 }
  });

  const [isProcessingText, setIsProcessingText] = useState(false); // Track text processing state
  const [processingProgress, setProcessingProgress] = useState({ current: 0, total: 0 }); // Track processing progress
  
  // Font customization states
  const [fontFamily, setFontFamily] = useState('\'Adobe Garamond Pro\', serif'); // Default font
  const [fontSize, setFontSize] = useState(14); // Default font size in px
  const [fontSettingsExpanded, setFontSettingsExpanded] = useState(false);
  const [translationLanguageExpanded, setTranslationLanguageExpanded] = useState(false);

  // Removed segments state
  const [removedSegments, setRemovedSegments] = useState([]);
  
  // Sort functionality for unique words
  const [uniqueWordsSortOrder, setUniqueWordsSortOrder] = useState('none'); // 'none', 'least', 'most'
  const [sortDropdownExpanded, setSortDropdownExpanded] = useState(false);
  
  // More dropdown state
  const [moreDropdownExpanded, setMoreDropdownExpanded] = useState(false);
  
  // Usage limit states
  const [showUsageLimitModal, setShowUsageLimitModal] = useState(false);
  const [isUsageLimited, setIsUsageLimited] = useState(false);


  
  // Refs
  const textAreaRef = useRef(null);
  const readOnlyRef = useRef(null);
  const searchInputRef = useRef(null);
  const readOptionsRef = useRef(null);
  const fontOptionsRef = useRef(null);
  const translationLanguageRef = useRef(null);
  const moreDropdownRef = useRef(null);
  const isPausingRef = useRef(false); // Track if we're currently pausing speech
  const currentChunkRef = useRef(0); // Track current chunk being played
  const isPausingStudyNotesRef = useRef(false); // Track if we're pausing Study Notes speech
  const currentStudyNotesChunkRef = useRef(0); // Track current Study Notes chunk


  // Restore homepage state when component mounts
  useEffect(() => {
    const restoreHomepageState = () => {
      try {
        const savedState = sessionStorage.getItem('homepageState');
        if (savedState) {
          const state = JSON.parse(savedState);
          
          // Restore all state variables
          if (state.originalText !== undefined) setInputText(state.originalText);
          if (state.fontFamily !== undefined) setFontFamily(state.fontFamily);
          if (state.fontSize !== undefined) setFontSize(state.fontSize);
          if (state.targetLanguage !== undefined) setTargetLanguage(state.targetLanguage);
          if (state.searchText !== undefined) setSearchText(state.searchText);
          if (state.searchResults !== undefined) setSearchResults(state.searchResults);
          if (state.currentMatchIndex !== undefined) setCurrentMatchIndex(state.currentMatchIndex);
          if (state.selectedVoice !== undefined) setSelectedVoice(state.selectedVoice);
          if (state.speechSpeed !== undefined) setSpeechSpeed(state.speechSpeed);
          if (state.isOriginalTextSpeaking !== undefined) setIsOriginalTextSpeaking(state.isOriginalTextSpeaking);
          if (state.isChunkedSpeaking !== undefined) setIsChunkedSpeaking(state.isChunkedSpeaking);
          if (state.speechWasPaused !== undefined) setSpeechWasPaused(state.speechWasPaused);
          if (state.pausedText !== undefined) setPausedText(state.pausedText);
          if (state.pausedChunks !== undefined) setPausedChunks(state.pausedChunks);
          if (state.pausedOptions !== undefined) setPausedOptions(state.pausedOptions);
          if (state.speechPosition !== undefined) setSpeechPosition(state.speechPosition);
          if (state.originalTextSpeechStartTime !== undefined) setOriginalTextSpeechStartTime(state.originalTextSpeechStartTime);
          if (state.originalTextSpeechElapsedTime !== undefined) setOriginalTextSpeechElapsedTime(state.originalTextSpeechElapsedTime);
          if (state.showOriginalTextTranslation !== undefined) setShowOriginalTextTranslation(state.showOriginalTextTranslation);
          if (state.originalTextTranslations !== undefined) setOriginalTextTranslations(state.originalTextTranslations);
          if (state.translationProgress !== undefined) setTranslationProgress(state.translationProgress);
          if (state.isTranslatingOriginalText !== undefined) setIsTranslatingOriginalText(state.isTranslatingOriginalText);
          if (state.uniqueWords !== undefined) setUniqueWords(state.uniqueWords);
          if (state.removedSegments !== undefined) setRemovedSegments(state.removedSegments);
          
          // Restore ref values
          if (state.isPausing !== undefined) isPausingRef.current = state.isPausing;
          if (state.currentChunk !== undefined) currentChunkRef.current = state.currentChunk;
          
          // Clear the saved state after restoration
          sessionStorage.removeItem('homepageState');
        }
      } catch (error) {
        console.error('Error restoring homepage state:', error);
      }
    };

    restoreHomepageState();
  }, []);

  // Calculate words
  useEffect(() => {
    if (!inputText.trim()) {
      setUniqueWords([]);
      setTotalWords(0);
      setUniqueCount(0);
      return;
    }

    // Split text into words
    const rawWords = inputText.match(/\b[\w'-]+\b/g) || [];
    
    // Clean words and count
    const cleanedWords = rawWords.map(word => 
      word.replace(/^\W+|\W+$/g, '').toLowerCase()
    ).filter(word => word.length > 0);

    // Count total words
    setTotalWords(cleanedWords.length);

    // Build word map
    const wordMap = new Map();
    cleanedWords.forEach(word => {
      wordMap.set(word, (wordMap.get(word) || 0) + 1);
    });

    // Convert to array and sort
    const wordArray = [...wordMap.entries()]
      .map(([word, count]) => ({ word, count }))
      .sort((a, b) => a.word.localeCompare(b.word));

    setUniqueWords(wordArray);
    setUniqueCount(wordArray.length);
  }, [inputText]);

  // Clear translations when input text changes (not when language changes)
  useEffect(() => {
    setOriginalTextTranslations({});
    setUniqueWordsTranslations({});
    setStudyNotesTranslations({});
    setShowOriginalTextTranslation(false);
    setShowUniqueWordsTranslation(false);
    setShowStudyNotesTranslation(false);
    // Reset sort order when new text is entered
    setUniqueWordsSortOrder('none');
  }, [inputText]);

  // Navigation function (memoized to prevent dependency cycles)
  const navigateToMatch = useCallback((index) => {
    if (searchResults.length === 0 || index < 0 || index >= searchResults.length) {
      return;
    }
    
    const matchPosition = searchResults[index];
    setCurrentMatchIndex(index);
    
    if (isEditMode && textAreaRef.current) {
      // EDIT MODE NAVIGATION - Only use background highlighting, no text selection
      const textarea = textAreaRef.current;
      
      // Focus textarea but don't select text (to avoid blue selection highlighting)
      textarea.focus();
      
      // Position cursor at the match location without selecting
      textarea.setSelectionRange(matchPosition, matchPosition);
      
      // More accurate scroll calculation
      const textBeforeMatch = inputText.substring(0, matchPosition);
      
      // Create a temporary div to measure exact scroll position
      const tempDiv = document.createElement('div');
      tempDiv.style.position = 'absolute';
      tempDiv.style.visibility = 'hidden';
      tempDiv.style.fontFamily = 'monospace';
      tempDiv.style.fontSize = '14px';
      tempDiv.style.lineHeight = '1.5';
      tempDiv.style.whiteSpace = 'pre-wrap';
      tempDiv.style.width = textarea.clientWidth + 'px';
      tempDiv.style.padding = '16px';
      tempDiv.textContent = textBeforeMatch;
      
      document.body.appendChild(tempDiv);
      const exactHeight = tempDiv.offsetHeight;
      document.body.removeChild(tempDiv);
      
      // Calculate target scroll position (center the match)
      const targetScrollTop = Math.max(0, exactHeight - textarea.clientHeight / 2);
      
      // Apply scroll
      textarea.scrollTop = targetScrollTop;
      
      // Sync background highlighting layer
      const backgroundLayer = textarea.parentElement.querySelector('div');
      if (backgroundLayer) {
        backgroundLayer.scrollTop = targetScrollTop;
      }
      
    } else if (!isEditMode && readOnlyRef.current) {
      // READ-ONLY MODE NAVIGATION - Handle both regular and translated text
      const readOnlyDiv = readOnlyRef.current;
      
      if (showOriginalTextTranslation) {
        // TRANSLATED TEXT NAVIGATION - Find the paragraph containing the match
        const paragraphs = getOriginalTextParagraphs();
        let targetParagraphIndex = -1;
        let cumulativeLength = 0;
        
        // Find which paragraph contains the match
        for (let i = 0; i < paragraphs.length; i++) {
          const paragraphLength = paragraphs[i].length;
          if (matchPosition >= cumulativeLength && matchPosition < cumulativeLength + paragraphLength) {
            targetParagraphIndex = i;
            break;
          }
          cumulativeLength += paragraphLength + 1; // +1 for the separator
        }
        
        if (targetParagraphIndex >= 0) {
          // Find the DOM element for this paragraph
          const paragraphElements = readOnlyDiv.querySelectorAll('.mb-4');
          const targetElement = paragraphElements[targetParagraphIndex];
          
          if (targetElement) {
            console.log(`🔍 Scrolling to paragraph ${targetParagraphIndex} for match at position ${matchPosition}`);
            
            // Calculate scroll position to center the paragraph
            const elementRect = targetElement.getBoundingClientRect();
            const containerRect = readOnlyDiv.getBoundingClientRect();
            const relativeTop = elementRect.top - containerRect.top + readOnlyDiv.scrollTop;
            const targetScrollTop = Math.max(0, relativeTop - readOnlyDiv.clientHeight / 2);
            
            readOnlyDiv.scrollTo({
              top: targetScrollTop,
              behavior: 'smooth'
            });
          }
        }
      } else {
        // REGULAR TEXT NAVIGATION - Use precise DOM-based scrolling
        const tempContainer = document.createElement('div');
        tempContainer.style.position = 'absolute';
        tempContainer.style.visibility = 'hidden';
        tempContainer.style.top = '-9999px';
        tempContainer.style.left = '-9999px';
        tempContainer.style.width = readOnlyDiv.clientWidth + 'px';
        tempContainer.style.height = 'auto';
        tempContainer.style.overflow = 'visible';
        
        const computedStyle = window.getComputedStyle(readOnlyDiv);
        tempContainer.style.fontFamily = computedStyle.fontFamily;
        tempContainer.style.fontSize = computedStyle.fontSize;
        tempContainer.style.lineHeight = computedStyle.lineHeight;
        tempContainer.style.whiteSpace = 'pre-wrap';
        tempContainer.style.padding = computedStyle.padding;
        tempContainer.style.boxSizing = 'border-box';
        
        // Split text into before, match, and after parts
        const beforeText = inputText.substring(0, matchPosition);
        const matchText = inputText.substring(matchPosition, matchPosition + searchText.length);
        const afterText = inputText.substring(matchPosition + searchText.length);
        
        // Create text nodes and a marker span
        const beforeNode = document.createTextNode(beforeText);
        const matchSpan = document.createElement('span');
        matchSpan.id = 'scroll-target-marker';
        matchSpan.textContent = matchText;
        matchSpan.style.backgroundColor = 'yellow';
        const afterNode = document.createTextNode(afterText);
        
        tempContainer.appendChild(beforeNode);
        tempContainer.appendChild(matchSpan);
        tempContainer.appendChild(afterNode);
        
        document.body.appendChild(tempContainer);
        
        // Get the exact position of the match span
        const markerElement = tempContainer.querySelector('#scroll-target-marker');
        const markerRect = markerElement.getBoundingClientRect();
        const containerRect = tempContainer.getBoundingClientRect();
        
        // Calculate relative position within the container
        const relativeTop = markerRect.top - containerRect.top;
        
        // Clean up
        document.body.removeChild(tempContainer);
        
        // Calculate target scroll position to center the match
        const targetScrollTop = Math.max(0, relativeTop - readOnlyDiv.clientHeight / 2);
        
        // Scroll to the calculated position
        readOnlyDiv.scrollTo({
          top: targetScrollTop,
          behavior: 'smooth'
        });
      }
    }
  }, [searchResults, isEditMode, inputText, searchText, showOriginalTextTranslation]);

  // Search functionality
  useEffect(() => {
    if (!searchText.trim() || !inputText.trim()) {
      setSearchResults([]);
      setCurrentMatchIndex(-1);
      return;
    }

    try {
      const escapedSearchText = searchText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      
      // Try word boundary search first, fall back to simple search
      const regexWithBoundary = new RegExp(`\\b${escapedSearchText}\\b`, 'gi');
      const regexSimple = new RegExp(`${escapedSearchText}`, 'gi');
      
      const resultsWithBoundary = [];
      const resultsSimple = [];
      
      // Word boundary search
      let match;
      while ((match = regexWithBoundary.exec(inputText)) !== null) {
        resultsWithBoundary.push(match.index);
      }
      
      // Simple search (fallback)
      regexSimple.lastIndex = 0;
      while ((match = regexSimple.exec(inputText)) !== null) {
        resultsSimple.push(match.index);
      }
      
      // Use word boundary results if available, otherwise fall back to simple search
      const results = resultsWithBoundary.length > 0 ? resultsWithBoundary : resultsSimple;
      
      setSearchResults(results);
      setCurrentMatchIndex(results.length > 0 ? 0 : -1);
    } catch (e) {
      setSearchResults([]);
      setCurrentMatchIndex(-1);
    }
  }, [inputText, searchText]);

  // Auto-navigate to first result when search results change (only in read-only mode)
  useEffect(() => {
    if (searchResults.length > 0 && currentMatchIndex === 0 && searchText.trim() && !isEditMode) {
      setTimeout(() => {
        navigateToMatch(0);
      }, 200);
    }
  }, [navigateToMatch, searchResults.length, currentMatchIndex, searchText, isEditMode]);







  // Edit at current position
  const editAtCurrentPosition = () => {
    if (!isEditMode) {
      // Save current scroll position from read-only view
      let currentScrollTop = 0;
      if (readOnlyRef.current) {
        currentScrollTop = readOnlyRef.current.scrollTop;
        setSavedScrollPosition(currentScrollTop);
      }
      
      setIsEditMode(true);
      
      // Maintain current view position
      setTimeout(() => {
        if (textAreaRef.current) {
          // First restore the scroll position to maintain view
          textAreaRef.current.scrollTop = currentScrollTop;
          // Focus the textarea
          textAreaRef.current.focus();
        }
      }, 100); // Delay to ensure mode switch completes
    }
  };

  // Restore scroll position when switching to read-only mode
  useEffect(() => {
    if (!isEditMode && readOnlyRef.current && savedScrollPosition > 0) {
      setTimeout(() => {
        if (readOnlyRef.current) {
          readOnlyRef.current.scrollTop = savedScrollPosition;
        }
      }, 0);
    }
  }, [isEditMode, savedScrollPosition]);

  // Handle keydown in read-only mode for quick edit
  const handleReadOnlyKeyDown = (e) => {
    if (e.key === 'e' || e.key === 'E') {
      if (!isEditMode) {
        e.preventDefault();
        editAtCurrentPosition();
      }
    }
  };

  // Search handlers
  const handleSearchChange = (e) => {
    setSearchText(e.target.value);
    setCurrentMatchIndex(-1);
  };

  const handleSearchNavigation = (direction) => {
    if (searchResults.length === 0) return;
    
    let newIndex;
    if (currentMatchIndex === -1) {
      newIndex = direction > 0 ? 0 : searchResults.length - 1;
    } else {
      newIndex = currentMatchIndex + direction;
      if (newIndex >= searchResults.length) newIndex = 0;
      if (newIndex < 0) newIndex = searchResults.length - 1;
    }
    
    navigateToMatch(newIndex);
  };

  const handleSearchKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSearchNavigation(1);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      handleSearchNavigation(-1);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      handleSearchNavigation(1);
    }
  };

  // Filter unique words by search term
  const filteredWords = searchText 
    ? uniqueWords.filter(w => w.word.toLowerCase().includes(searchText.toLowerCase()))
    : uniqueWords;

  // Apply sorting to filtered words
  const sortedFilteredWords = useMemo(() => {
    if (uniqueWordsSortOrder === 'none') return filteredWords;
    
    return [...filteredWords].sort((a, b) => {
      if (uniqueWordsSortOrder === 'least') {
        return a.count - b.count; // Ascending: 1 → 5 → 10
      } else if (uniqueWordsSortOrder === 'most') {
        return b.count - a.count; // Descending: 10 → 5 → 1
      }
      return 0;
    });
  }, [filteredWords, uniqueWordsSortOrder]);
  


  // Load available voices
  useEffect(() => {
    const loadVoices = () => {
      const voices = speechSynthesis.getVoices();
      // Filter for English voices and sort by quality/naturalness
      const englishVoices = voices.filter(voice => 
        voice.lang.startsWith('en-') || voice.lang === 'en'
      ).sort((a, b) => {
        // Prioritize voices with 'natural', 'premium', 'neural', or system voices
        const aScore = (a.name.toLowerCase().includes('natural') ? 100 : 0) +
                      (a.name.toLowerCase().includes('premium') ? 80 : 0) +
                      (a.name.toLowerCase().includes('neural') ? 70 : 0) +
                      (a.name.toLowerCase().includes('enhanced') ? 60 : 0) +
                      (a.localService ? 25 : 0) +
                      // Prefer Google voices
                      (a.name.toLowerCase().includes('google') ? 40 : 0);
        const bScore = (b.name.toLowerCase().includes('natural') ? 100 : 0) +
                      (b.name.toLowerCase().includes('premium') ? 80 : 0) +
                      (b.name.toLowerCase().includes('neural') ? 70 : 0) +
                      (b.name.toLowerCase().includes('enhanced') ? 60 : 0) +
                      (b.localService ? 25 : 0) +
                      (b.name.toLowerCase().includes('google') ? 40 : 0);
        return bScore - aScore;
      });
      
      setAvailableVoices(englishVoices);
      
      // Set default voice - prefer Google UK English Female
      if (englishVoices.length > 0 && !selectedVoice) {
        // Try to find exact Google UK English Female (works in Chrome/Google browsers)
        let preferredVoice = englishVoices.find(voice => 
          voice.name.toLowerCase().includes('google') && 
          voice.name.toLowerCase().includes('uk') && 
          voice.name.toLowerCase().includes('english') &&
          voice.name.toLowerCase().includes('female') &&
          voice.lang === 'en-GB'
        );
        
        // If not found, try other variations of Google UK Female
        if (!preferredVoice) {
          preferredVoice = englishVoices.find(voice => 
            voice.name.toLowerCase().includes('google') && 
            (voice.name.toLowerCase().includes('uk') || voice.lang === 'en-GB') &&
            voice.name.toLowerCase().includes('female')
          );
        }
        
        // If still not found, try any Google UK voice
        if (!preferredVoice) {
          preferredVoice = englishVoices.find(voice => 
            voice.name.toLowerCase().includes('google') && 
            (voice.name.toLowerCase().includes('uk') || voice.lang === 'en-GB')
          );
        }
        
        // Use preferred voice or fall back to first available
        setSelectedVoice(preferredVoice || englishVoices[0]);
        
        // Log the selected voice for debugging
        console.log('🎤 Voice selected:', preferredVoice ? `${preferredVoice.name} (${preferredVoice.lang})` : 'Default voice');
      }
    };

    // Load voices immediately
    loadVoices();
    
    // Also load when voices change (some browsers load voices asynchronously)
    speechSynthesis.addEventListener('voiceschanged', loadVoices);
    
    return () => {
      speechSynthesis.removeEventListener('voiceschanged', loadVoices);
    };
  }, [selectedVoice]);

  // Close read options dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (readOptionsRef.current && !readOptionsRef.current.contains(event.target)) {
        setReadOptionsExpanded(false);
      }
      if (fontOptionsRef.current && !fontOptionsRef.current.contains(event.target)) {
        setFontSettingsExpanded(false);
      }
      if (translationLanguageRef.current && !translationLanguageRef.current.contains(event.target)) {
        setTranslationLanguageExpanded(false);
      }
      if (moreDropdownRef.current && !moreDropdownRef.current.contains(event.target)) {
        setMoreDropdownExpanded(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Close read options when Original Text speech starts
  useEffect(() => {
    if (isOriginalTextSpeaking) {
      setReadOptionsExpanded(false);
    }
  }, [isOriginalTextSpeaking]);

  // Monitor text selection changes
  useEffect(() => {
    const handleSelectionChange = () => {
      const selection = window.getSelection();
      setHasSelection(selection && selection.toString().trim().length > 0);
    };

    document.addEventListener('selectionchange', handleSelectionChange);
    return () => {
      document.removeEventListener('selectionchange', handleSelectionChange);
    };
  }, []);

  // Save removedSegments to sessionStorage whenever it changes
  useEffect(() => {
    const homepageState = JSON.parse(sessionStorage.getItem('homepageState') || '{}');
    homepageState.removedSegments = removedSegments;
    sessionStorage.setItem('homepageState', JSON.stringify(homepageState));
  }, [removedSegments]);

  // Enhanced AI-Quality Speech using best browser voices
  const speakWithEnhancedAI = (text, options = {}) => {
    if (!('speechSynthesis' in window)) {
      console.warn('Speech synthesis not supported');
      return;
    }

    try {
      setIsSpeaking(true);
      speechSynthesis.cancel();
      
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = options.rate || speechSpeed;
      utterance.volume = options.volume || 0.8;
      utterance.pitch = options.pitch || 1;
      
      // Find Google UK English Female voice or best available Google voice
      const voices = speechSynthesis.getVoices();
      
      // Try to find Google UK English Female (Chrome/Google browsers)
      let premiumVoice = voices.find(voice => 
        voice.name.toLowerCase().includes('google') && 
        voice.name.toLowerCase().includes('uk') && 
        voice.name.toLowerCase().includes('english') &&
        voice.name.toLowerCase().includes('female') &&
        voice.lang === 'en-GB'
      );
      
      // If not found, try other Google UK variations
      if (!premiumVoice) {
        premiumVoice = voices.find(voice => 
          voice.name.toLowerCase().includes('google') && 
          (voice.name.toLowerCase().includes('uk') || voice.lang === 'en-GB')
        );
      }
      
      // Final fallback - any Google voice
      if (!premiumVoice) {
        premiumVoice = voices.find(voice => {
          const name = voice.name.toLowerCase();
          const lang = voice.lang.toLowerCase();
          
          return (lang.startsWith('en-') || lang === 'en') && name.includes('google');
        });
      }
      
      // Use premium voice or fallback to selected voice or best available
      const voiceToUse = premiumVoice || selectedVoice || voices.find(v => v.lang.startsWith('en'));
      
      if (voiceToUse) {
        utterance.voice = voiceToUse;
        utterance.lang = voiceToUse.lang;
      }
      
      utterance.onstart = () => {
        if (options.isOriginalText) {
          setIsOriginalTextSpeaking(true);
        } else {
          setIsSpeaking(true);
        }
      };
      utterance.onend = () => {
        if (options.isOriginalText) {
          setIsOriginalTextSpeaking(false);
          setSpeechWasPaused(false);
        } else {
          setIsSpeaking(false);
        }
      };
      utterance.onerror = () => {
        if (options.isOriginalText) {
          setIsOriginalTextSpeaking(false);
          setSpeechWasPaused(false);
        } else {
          setIsSpeaking(false);
        }
      };
      
      speechSynthesis.speak(utterance);
      
    } catch (error) {
      setIsSpeaking(false);
      console.error('Enhanced AI Speech error:', error);
      // Fallback to regular browser speech
      speakWithBrowser(text, options);
    }
  };

  // Removed unused speakWithEnhancedBrowser function

  // Browser Speech function (original)
  const speakWithBrowser = (text, options = {}) => {
    if ('speechSynthesis' in window) {
      // Cancel any ongoing speech
      speechSynthesis.cancel();
      
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = options.rate || speechSpeed; // Use global speed setting
      utterance.volume = options.volume || 0.8;
      utterance.lang = options.lang || 'en-US'; // American English
      utterance.pitch = options.pitch || 1;
      
      // Use selected voice if available
      if (selectedVoice) {
        utterance.voice = selectedVoice;
      }
      
      // Add event handlers to manage speaking state
      utterance.onstart = () => {
        if (options.isOriginalText) {
          setIsOriginalTextSpeaking(true);
          setSpeechWasPaused(false); // Clear paused state when speech actually starts
        } else {
          setIsSpeaking(true);
        }
      };
      utterance.onend = () => {
        if (options.isOriginalText) {
          setIsOriginalTextSpeaking(false);
          setSpeechWasPaused(false); // Clear paused state when speech completes
        } else {
          setIsSpeaking(false);
        }
      };
      utterance.onerror = (e) => {
        console.error('Speech error:', e);
        if (options.isOriginalText) {
          setIsOriginalTextSpeaking(false);
          // Don't automatically clear speechWasPaused on errors - user might have paused
        } else {
          setIsSpeaking(false);
        }
      };
      
      speechSynthesis.speak(utterance);
    } else {
      console.warn('Speech synthesis not supported in this browser');
    }
  };

  // Speech function for individual word pronunciations (Unique Words, Study Notes, etc.)
  const speakWord = (text, options = {}) => {
    if (useAIVoice) {
      speakWithEnhancedAI(text, { ...options, isOriginalText: false });
    } else {
      speakWithBrowser(text, { ...options, isOriginalText: false });
    }
  };

  // Speech function specifically for Original Text reading
  const speakOriginalText = (text, options = {}) => {
    if (useAIVoice) {
      speakWithEnhancedAI(text, { ...options, isOriginalText: true });
    } else {
      speakWithBrowser(text, { ...options, isOriginalText: true });
    }
  };

  // Function to chunk text for long speech with robust browser compatibility (max 300 chars per chunk)
  const chunkText = (text, maxChars = 300) => {
    const sentences = text.split(/(?<=[.!?])\s+/);
    const chunks = [];
    let currentChunk = '';
    
    for (const sentence of sentences) {
      if (sentence.length > maxChars) {
        // Split long sentence into smaller pieces
        let start = 0;
        while (start < sentence.length) {
          const part = sentence.slice(start, start + maxChars);
          if (currentChunk.length + part.length > maxChars && currentChunk) {
            chunks.push(currentChunk.trim());
            currentChunk = '';
          }
          currentChunk += (currentChunk ? ' ' : '') + part;
          if (currentChunk.length >= maxChars) {
            chunks.push(currentChunk.trim());
            currentChunk = '';
          }
          start += maxChars;
        }
      } else {
        if ((currentChunk + ' ' + sentence).trim().length > maxChars && currentChunk) {
          chunks.push(currentChunk.trim());
          currentChunk = sentence;
        } else {
          currentChunk += (currentChunk ? ' ' : '') + sentence;
        }
      }
    }
    if (currentChunk) {
      chunks.push(currentChunk.trim());
    }
    return chunks;
  };



    // Function to speak chunked text sequentially - simplified approach
  const speakChunkedText = (chunks, index = 0, options = {}) => {
    console.log('speakChunkedText called:', { 
      chunks: chunks.length, 
      index, 
      isOriginalText: options.isOriginalText
    });
    
    if (index >= chunks.length) {
      console.log('✅ Speech completed - all chunks done');
      
      if (options.isOriginalText) {
        setIsOriginalTextSpeaking(false);
      } else {
        setIsSpeaking(false);
      }
      setIsChunkedSpeaking(false);
      setSpeechPosition({ chunkIndex: 0, textPosition: 0, wordIndex: 0 });
      setSpeechWasPaused(false); // Clear paused state when speech completes
      setPausedChunks([]);
      setPausedOptions({});
      setPausedText(''); // Clear paused text when speech completes
      return;
    }

    // Store chunks and options for potential pause/resume
    setPausedChunks(chunks);
    setPausedOptions(options);
    
    // Update current position BEFORE starting to speak
    console.log('Setting speech position to chunk:', index);
    setSpeechPosition({ chunkIndex: index, textPosition: 0, wordIndex: 0 });
    
    // Store current chunk in ref for immediate access during pause
    currentChunkRef.current = index;

    if ('speechSynthesis' in window) {
      // Only cancel if this is the first chunk (index 0)
      if (index === 0) {
        speechSynthesis.cancel();
      }
      
      const utterance = new SpeechSynthesisUtterance(chunks[index]);
      utterance.rate = options.rate || speechSpeed;
      utterance.volume = options.volume || 0.8;
      utterance.lang = options.lang || 'en-US';
      utterance.pitch = options.pitch || 1;
      
      if (selectedVoice) {
        utterance.voice = selectedVoice;
      }
      
      utterance.onstart = () => {
        console.log('🎵 Speech started for chunk:', index, 'paused state was:', speechWasPaused);
        console.log('🎵 Chunk content preview:', chunks[index].substring(0, 100) + '...');
        currentChunkRef.current = index; // Update ref when chunk actually starts
        
        if (options.isOriginalText) {
          setIsOriginalTextSpeaking(true);
          
          // Record start time for word-level tracking
          setOriginalTextSpeechStartTime(Date.now());
          
          if (speechWasPaused) {
            console.log('✅ Clearing paused state - speech resumed successfully');
            setSpeechWasPaused(false); // Clear paused state when resuming
          }
        } else {
          setIsSpeaking(true);
        }
      };
      
      utterance.onend = () => {
        console.log('Chunk ended:', index, 'speechWasPaused:', speechWasPaused, 'isPausing:', isPausingRef.current);
        
        // Only check isPausingRef.current (active pausing), not speechWasPaused (past pause state)
        // speechWasPaused is cleared in onstart, so we shouldn't check it here for continuation
        if (isPausingRef.current) {
          console.log('Speech ended due to active pause, not continuing');
          return;
        }
        
        // Continue to next chunk
        console.log('Continuing to next chunk:', index + 1);
        setTimeout(() => {
          speakChunkedText(chunks, index + 1, options);
        }, 100); // Small pause between chunks
      };
      
      utterance.onerror = (e) => {
        console.error(`❌ Error in chunk ${index + 1}:`, e.error);
        
        // If error is "interrupted" and we're pausing, don't reset states - this is expected
        if (e.error === 'interrupted' && isPausingRef.current) {
          console.log('⏸️ Speech interrupted due to pause - maintaining paused state');
          console.log('⏸️ Paused at chunk:', currentChunkRef.current);
          if (options.isOriginalText) {
            setIsOriginalTextSpeaking(false);
          }
          isPausingRef.current = false; // Reset the pausing flag
          return; // Don't reset other states when pausing
        }
        
        // For other errors, reset everything
        console.log('💥 Genuine speech error, resetting states');
        if (options.isOriginalText) {
          setIsOriginalTextSpeaking(false);
        } else {
          setIsSpeaking(false);
        }
        setIsChunkedSpeaking(false);
        setSpeechPosition({ chunkIndex: index, textPosition: 0, wordIndex: 0 });
        setSpeechWasPaused(false);
        isPausingRef.current = false; // Reset pausing flag on genuine errors
      };
      
      speechSynthesis.speak(utterance);
    }
  };

  // Function to check if there's any highlighted text available
  const hasHighlightedText = () => {
    // Check for user-selected text
    if (hasSelection) {
      return true;
    }
    
    // Check for search-highlighted text
    return searchText.trim() && searchResults.length > 0;
  };

  // Function to get highlighted text for reading
  const getHighlightedTextForReading = () => {
    // First, try to get user-selected text
    const selection = window.getSelection();
    if (selection && selection.toString().trim()) {
      return selection.toString().trim();
    }
    
    // Fall back to search-highlighted text
    if (!searchText.trim() || searchResults.length === 0) {
      return null;
    }
    
    // Extract sentences containing highlighted words
    const sentences = inputText.split(/(?<=[.!?])\s+/);
    const highlightedSentences = sentences.filter(sentence => 
      new RegExp(`\\b${searchText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi').test(sentence)
    );
    
    return highlightedSentences.join(' ');
  };

  // Function to speak the entire original text - simplified approach
  const speakEntireText = () => {
    console.log('speakEntireText called');
    const textLength = inputText.trim().length;
    const wordCount = inputText.trim().split(/\s+/).length;
    
    if (!inputText.trim()) {
      alert('Please enter some text first');
      return;
    }

    console.log('Text to speak:', { textLength, wordCount });

    // Cancel any ongoing speech first
    if (isOriginalTextSpeaking || isChunkedSpeaking) {
      console.log('🛑 Canceling current speech to start new session');
      speechSynthesis.cancel();
    }

    // Clear previous speech session state
    setSpeechWasPaused(false);
    setPausedChunks([]);
    setPausedOptions({});
    setPausedText('');
    setSpeechPosition({ chunkIndex: 0, textPosition: 0, wordIndex: 0 });
    setOriginalTextSpeechStartTime(0);
    setOriginalTextSpeechElapsedTime(0);
    setIsOriginalTextSpeaking(false);
    setIsChunkedSpeaking(false);
    isPausingRef.current = false;
    currentChunkRef.current = 0;

    // Store text for pause/resume capability
    setPausedText(inputText);

    // Show processing indicator
    setIsProcessingText(true);
    setProcessingProgress({ current: 0, total: wordCount });
    
    // Estimate processing time based on text length
    const estimatedProcessingTime = Math.max(500, Math.min(3000, wordCount * 2)); // 2ms per word, min 500ms, max 3s
    console.log('Estimated processing time:', estimatedProcessingTime, 'ms for', wordCount, 'words');

    // Process text in chunks with progress updates
    setTimeout(() => {
      try {
        console.log('Processing entire text into chunks...');
        const allChunks = chunkText(inputText);
        const options = { rate: Math.max(0.5, speechSpeed - 0.1), isOriginalText: true };
        
        console.log('🚀 Starting speech with', allChunks.length, 'chunks for', wordCount, 'words');
        
        // Store chunks and options for pause/resume
        setPausedChunks(allChunks);
        setPausedOptions(options);
        setIsChunkedSpeaking(true);
        
        // Hide processing indicator
        setIsProcessingText(false);
        setProcessingProgress({ current: 0, total: 0 });
        
        // Start speaking from the beginning
        speakChunkedText(allChunks, 0, options);
      } catch (error) {
        console.error('Error processing text:', error);
        setIsProcessingText(false);
        setProcessingProgress({ current: 0, total: 0 });
        alert('Error processing text. Please try again.');
      }
    }, estimatedProcessingTime);
  };

  // Function to speak highlighted text only - simplified approach
  const speakHighlightedText = () => {
    const highlightedText = getHighlightedTextForReading();
    
    if (!highlightedText) {
      alert('No highlighted text found. Please select text or search for words first.');
      return;
    }

    // Cancel any ongoing speech first
    if (isOriginalTextSpeaking || isChunkedSpeaking) {
      console.log('🛑 Canceling current speech to start highlighted text reading');
      speechSynthesis.cancel();
    }

    // Clear previous speech session state
    setSpeechWasPaused(false);
    setPausedChunks([]);
    setPausedOptions({});
    setPausedText('');
    setSpeechPosition({ chunkIndex: 0, textPosition: 0, wordIndex: 0 });
    setOriginalTextSpeechStartTime(0);
    setOriginalTextSpeechElapsedTime(0);
    setIsOriginalTextSpeaking(false);
    setIsChunkedSpeaking(false);
    isPausingRef.current = false;
    currentChunkRef.current = 0;

    const textLength = highlightedText.length;
    const wordCount = highlightedText.split(/\s+/).length;

    // Store highlighted text for pause/resume capability
    setPausedText(highlightedText);

    console.log('Speaking highlighted text:', { textLength, wordCount });

    // Show processing indicator
    setIsProcessingText(true);
    setProcessingProgress({ current: 0, total: wordCount });
    
    // Estimate processing time based on text length
    const estimatedProcessingTime = Math.max(300, Math.min(2000, wordCount * 1.5)); // 1.5ms per word, min 300ms, max 2s
    console.log('Estimated processing time for highlighted text:', estimatedProcessingTime, 'ms for', wordCount, 'words');

    // Process text in chunks with progress updates
    setTimeout(() => {
      try {
        console.log('Processing entire highlighted text into chunks...');
        const allChunks = chunkText(highlightedText);
        const options = { rate: Math.max(0.5, speechSpeed - 0.1), isOriginalText: true };
        
        console.log('🚀 Starting highlighted text speech with', allChunks.length, 'chunks for', wordCount, 'words');
        
        // Store chunks and options for pause/resume
        setPausedChunks(allChunks);
        setPausedOptions(options);
        setIsChunkedSpeaking(true);
        
        // Hide processing indicator
        setIsProcessingText(false);
        setProcessingProgress({ current: 0, total: 0 });
        
        // Start speaking from the beginning
        speakChunkedText(allChunks, 0, options);
      } catch (error) {
        console.error('Error processing highlighted text:', error);
        setIsProcessingText(false);
        setProcessingProgress({ current: 0, total: 0 });
        alert('Error processing highlighted text. Please try again.');
      }
    }, estimatedProcessingTime);
  };

  // Function to resume speech from where it was stopped
  const resumeSpeech = () => {
    if (!speechWasPaused) {
      console.log('Not paused, starting fresh speech');
      speakEntireText();
      return;
    }

    console.log('▶️ RESUME FUNCTION: Resuming speech from position:', speechPosition);
    console.log('▶️ Paused chunks available:', pausedChunks.length);
    console.log('▶️ Paused text length:', pausedText.length);

    // Don't clear paused state here - let it be cleared when speech actually starts

    // Use paused chunks if available
    if (pausedChunks.length > 0 && pausedOptions) {
      const resumeIndex = Math.min(Math.max(0, speechPosition.chunkIndex), pausedChunks.length - 1);
      const wordIndex = speechPosition.wordIndex || 0;
      
      console.log('▶️ Will resume from chunk:', resumeIndex, 'word:', wordIndex, 'of', pausedChunks.length, 'chunks');
      
      // Create modified chunks starting from the word position
      let modifiedChunks = [...pausedChunks];
      if (wordIndex > 0 && resumeIndex < modifiedChunks.length) {
        const chunkWords = modifiedChunks[resumeIndex].split(/\s+/);
        if (wordIndex < chunkWords.length) {
          // Create a new chunk starting from the word index
          const resumeText = chunkWords.slice(wordIndex).join(' ');
          modifiedChunks[resumeIndex] = resumeText;
          console.log('▶️ Modified chunk to start from word', wordIndex, ':', resumeText.substring(0, 50) + '...');
        }
      }
      
      console.log('▶️ Chunk text preview:', modifiedChunks[resumeIndex].substring(0, 50) + '...');
      
      setIsChunkedSpeaking(true);
      
      // Small delay to ensure state updates and previous speech is fully cancelled
      setTimeout(() => {
        speakChunkedText(modifiedChunks, resumeIndex, pausedOptions);
      }, 100);
      return;
    }

    // If we have paused text, create chunks and resume
    if (pausedText.trim()) {
      console.log('Creating chunks from paused text');
      const chunks = chunkText(pausedText);
      const options = { rate: Math.max(0.5, speechSpeed - 0.1), isOriginalText: true };
      setPausedChunks(chunks);
      setPausedOptions(options);
      setIsChunkedSpeaking(true);
      speakChunkedText(chunks, Math.max(0, speechPosition.chunkIndex), options);
      return;
    }

    // Fallback to current inputText
    if (!inputText.trim()) {
      alert('Please enter some text first');
      setSpeechWasPaused(false);
      return;
    }

    console.log('Fallback to inputText');
    // Create new chunks and start from beginning
    const chunks = chunkText(inputText);
    const options = { rate: Math.max(0.5, speechSpeed - 0.1), isOriginalText: true };
    setPausedChunks(chunks);
    setPausedOptions(options);
    setPausedText(inputText);
    setIsChunkedSpeaking(true);
    setSpeechPosition({ chunkIndex: 0, textPosition: 0, wordIndex: 0 });
    speakChunkedText(chunks, 0, options);
  };



  // Study Notes Speech Functions
  const speakStudyNotesChunkedText = (chunks, index = 0, options = {}) => {
    console.log('📚 Study Notes speakChunkedText called:', { chunks: chunks.length, index });
    
    if (index >= chunks.length) {
      console.log('📚 Study Notes speech completed - all chunks done');
      setIsStudyNotesSpeaking(false);
      setStudyNotesWasPaused(false);
      setPausedStudyNotesChunks([]);
      setPausedStudyNotesOptions({});
      setStudyNotesSpeechPosition({ chunkIndex: 0, segmentIndex: 0, wordIndex: 0 });
      return;
    }

    // Store chunks and options for potential pause/resume
    console.log('📚 Storing chunks for pause/resume:', chunks.length, 'chunks');
    setPausedStudyNotesChunks(chunks);
    setPausedStudyNotesOptions(options);
    
    // Update current position BEFORE starting to speak
    console.log('📚 Setting Study Notes speech position to chunk:', index);
    setStudyNotesSpeechPosition({ chunkIndex: index, segmentIndex: options.segmentIndex || 0, wordIndex: 0 });
    
    // Store current chunk in ref for immediate access during pause
    currentStudyNotesChunkRef.current = index;

    if ('speechSynthesis' in window) {
      // Only cancel if this is the first chunk (index 0)
      if (index === 0) {
        speechSynthesis.cancel();
      }
      
      const utterance = new SpeechSynthesisUtterance(chunks[index]);
      utterance.rate = options.rate || speechSpeed;
      utterance.volume = options.volume || 0.8;
      utterance.lang = options.lang || 'en-US';
      utterance.pitch = options.pitch || 1;
      
      if (selectedVoice) {
        utterance.voice = selectedVoice;
      }
      
      utterance.onstart = () => {
        console.log('🎵 Study Notes speech started for chunk:', index);
        console.log('🎵 Study Notes chunk content preview:', chunks[index].substring(0, 100) + '...');
        currentStudyNotesChunkRef.current = index;
        
        // Record start time for word-level tracking
        setSpeechStartTime(Date.now());
        
        setIsStudyNotesSpeaking(true);
        
        // Always clear paused state when speech starts (whether fresh or resumed)
        if (studyNotesWasPaused) {
          console.log('✅ Clearing Study Notes paused state - speech resumed successfully');
        } else {
          console.log('🎵 Study Notes speech started fresh');
        }
        setStudyNotesWasPaused(false);
        isPausingStudyNotesRef.current = false; // Make sure pausing flag is clear
      };
      
      utterance.onend = () => {
        console.log('📚 Study Notes chunk ended:', index, 'studyNotesWasPaused:', studyNotesWasPaused, 'isPausing:', isPausingStudyNotesRef.current);
        
        // If we're currently pausing (not from a previous pause, but actively pausing), don't continue
        if (isPausingStudyNotesRef.current) {
          console.log('📚 Study Notes speech ended due to active pause, not continuing');
          return;
        }
        
        // Continue to next chunk if more chunks available
        if (index + 1 < chunks.length) {
          console.log('📚 Continuing to next Study Notes chunk:', index + 1);
          setTimeout(() => {
            speakStudyNotesChunkedText(chunks, index + 1, options);
          }, 100);
        } else {
          // Speech completed naturally - reset all states
          console.log('📚 Study Notes speech completed naturally - all chunks done');
          console.log('📚 Resetting all states to allow fresh playback');
          setIsStudyNotesSpeaking(false);
          setStudyNotesWasPaused(false);
          setPausedStudyNotesChunks([]);
          setPausedStudyNotesOptions({});
          setStudyNotesSpeechPosition({ chunkIndex: 0, segmentIndex: 0, wordIndex: 0 });
          setCurrentStudyNotesSegment('');
          setSpeechStartTime(0);
          setSpeechElapsedTime(0);
          isPausingStudyNotesRef.current = false;
          currentStudyNotesChunkRef.current = 0;
        }
      };
      
      utterance.onerror = (e) => {
        console.error(`❌ Study Notes error in chunk ${index + 1}:`, e.error);
        
        // If error is "interrupted" and we're pausing, don't reset states - this is expected
        if (e.error === 'interrupted' && isPausingStudyNotesRef.current) {
          console.log('⏸️ Study Notes speech interrupted due to pause - maintaining paused state');
          console.log('⏸️ Study Notes paused at chunk:', currentStudyNotesChunkRef.current);
          setIsStudyNotesSpeaking(false);
          isPausingStudyNotesRef.current = false;
          return;
        }
        
        // For other errors, reset everything
        console.log('💥 Genuine Study Notes speech error, resetting states');
        setIsStudyNotesSpeaking(false);
        setStudyNotesWasPaused(false);
        isPausingStudyNotesRef.current = false;
      };
      
      speechSynthesis.speak(utterance);
    }
  };

  const speakStudyNotesSegment = (segment, segmentIndex) => {
    console.log('📚 Speaking Study Notes segment:', segmentIndex);
    
    if (!segment.trim()) {
      alert('No text to speak');
      return;
    }

    // Only clear paused state if this is a different segment
    if (studyNotesSpeechPosition.segmentIndex !== segmentIndex) {
      console.log('📚 Starting new segment, clearing previous paused state');
      setStudyNotesWasPaused(false);
      setPausedStudyNotesChunks([]);
      setPausedStudyNotesOptions({});
    }
    
    setStudyNotesSpeechPosition({ chunkIndex: 0, segmentIndex: segmentIndex, wordIndex: 0 });
    isPausingStudyNotesRef.current = false;
    currentStudyNotesChunkRef.current = 0;
    setSpeechStartTime(0);
    setSpeechElapsedTime(0);

    // Store current segment for pause/resume
    setCurrentStudyNotesSegment(segment);

    // Always use chunking for consistent pause/resume functionality - smaller chunks for better resume precision
    const chunks = chunkText(segment, 1000); // Reduced from 4000 to 1000 for better pause/resume
    const options = { rate: Math.max(0.5, speechSpeed - 0.1), segmentIndex: segmentIndex };
    
    console.log('📚 Created Study Notes chunks:', chunks.length, 'options:', options);
    
    // Store chunks and options for pause/resume
    setPausedStudyNotesChunks(chunks);
    setPausedStudyNotesOptions(options);
    speakStudyNotesChunkedText(chunks, 0, options);
  };

  const resumeStudyNotesSpeech = () => {
    console.log('▶️ RESUME STUDY NOTES CALLED');
    console.log('▶️ studyNotesWasPaused:', studyNotesWasPaused);
    console.log('▶️ pausedStudyNotesChunks.length:', pausedStudyNotesChunks.length);
    console.log('▶️ pausedStudyNotesOptions:', pausedStudyNotesOptions);
    console.log('▶️ studyNotesSpeechPosition:', studyNotesSpeechPosition);
    
    if (!studyNotesWasPaused) {
      console.log('❌ Study Notes not paused, cannot resume');
      return;
    }

    // Use paused chunks if available
    if (pausedStudyNotesChunks.length > 0 && pausedStudyNotesOptions) {
      const resumeIndex = Math.min(Math.max(0, studyNotesSpeechPosition.chunkIndex), pausedStudyNotesChunks.length - 1);
      const wordIndex = studyNotesSpeechPosition.wordIndex || 0;
      
      console.log('✅ Study Notes will resume from chunk:', resumeIndex, 'word:', wordIndex, 'of', pausedStudyNotesChunks.length, 'chunks');
      
      // Create modified chunks starting from the word position
      let modifiedChunks = [...pausedStudyNotesChunks];
      if (wordIndex > 0 && resumeIndex < modifiedChunks.length) {
        const chunkWords = modifiedChunks[resumeIndex].split(/\s+/);
        if (wordIndex < chunkWords.length) {
          // Create a new chunk starting from the word index
          const resumeText = chunkWords.slice(wordIndex).join(' ');
          modifiedChunks[resumeIndex] = resumeText;
          console.log('✅ Modified chunk to start from word', wordIndex, ':', resumeText.substring(0, 50) + '...');
        }
      }
      
      console.log('✅ Study Notes chunk text preview:', modifiedChunks[resumeIndex].substring(0, 50) + '...');
      
      // Don't clear paused state here - let it be cleared when speech actually starts
      
      // Small delay to ensure state updates and previous speech is fully cancelled
      setTimeout(() => {
        console.log('🚀 Actually calling speakStudyNotesChunkedText for resume with modified chunks');
        speakStudyNotesChunkedText(modifiedChunks, resumeIndex, pausedStudyNotesOptions);
      }, 100);
      return;
    }

    console.log('❌ No paused Study Notes chunks available');
    console.log('❌ Chunks length:', pausedStudyNotesChunks.length);
    console.log('❌ Options:', pausedStudyNotesOptions);
    
    // If no chunks available but we have current segment, try to recreate from current segment
    if (currentStudyNotesSegment.trim()) {
      console.log('🔄 Trying to recreate chunks from current segment');
      const chunks = chunkText(currentStudyNotesSegment, 1000); // Use same chunk size as main function
      const options = { rate: Math.max(0.5, speechSpeed - 0.1), segmentIndex: studyNotesSpeechPosition.segmentIndex };
      
      setPausedStudyNotesChunks(chunks);
      setPausedStudyNotesOptions(options);
      // Don't clear paused state here - let it be cleared when speech actually starts
      
      setTimeout(() => {
        console.log('🚀 Fallback: calling speakStudyNotesChunkedText');
        speakStudyNotesChunkedText(chunks, Math.max(0, studyNotesSpeechPosition.chunkIndex), options);
      }, 100);
    }
  };

  // Translation functions using free Lingva Translate (Google Translate proxy)
  const translateText = async (text, targetLang = targetLanguage) => {
    try {
      // Handle special language codes for the API
      let apiLangCode = targetLang;
      if (targetLang === 'zh-tw') {
        apiLangCode = 'zh_TW'; // Traditional Chinese - fix the code format
      } else if (targetLang === 'zh') {
        apiLangCode = 'zh'; // Simplified Chinese
      }
      
      // Using Lingva Translate - completely free Google Translate proxy
      const response = await fetch(
        `https://lingva.ml/api/v1/en/${apiLangCode}/${encodeURIComponent(text)}`
      );
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      return data.translation || `[Translation unavailable: ${text}]`;
    } catch (error) {
      console.error('Translation error:', error);
      // Fallback to a different free service if Lingva fails
      try {
        return await translateWithFallback(text, targetLang);
      } catch (fallbackError) {
        console.error('Fallback translation error:', fallbackError);
        return `[Translation failed: ${text}]`;
      }
    }
  };

  // Fallback translation using a different free service
  const translateWithFallback = async (text, targetLang) => {
    try {
      // Using Google Translate directly as fallback
      const response = await fetch(
        `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=${targetLang === 'zh-tw' ? 'zh-TW' : targetLang}&dt=t&q=${encodeURIComponent(text)}`
      );
      
      if (!response.ok) {
        throw new Error(`Fallback HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      return data[0][0][0] || `[Fallback translation unavailable: ${text}]`;
    } catch (error) {
      console.error('Google Translate fallback error:', error);
      // Last resort fallback
      return `[Translation unavailable: ${text}]`;
    }
  };

    // Progressive translation for Original Text
  const translateOriginalText = async () => {
    if (!inputText.trim()) return;
    
    // Check if we already have translations for this text and language
    const cacheKey = `${inputText}_${targetLanguage}`;
    const existingTranslations = originalTextTranslations[cacheKey];
    
    if (existingTranslations && Object.keys(existingTranslations).length > 0) {
      // Use cached translations
      setShowOriginalTextTranslation(true);
      return;
    }
    setIsTranslatingOriginalText(true);
    setShowOriginalTextTranslation(true); // Show immediately for progressive updates
    
    try {
      // Use the same paragraph splitting logic as rendering
      const paragraphs = getOriginalTextParagraphs();
      const totalParagraphs = paragraphs.length;
      

      
      // Initialize progress
      setTranslationProgress(prev => ({
        ...prev,
        originalText: { current: 0, total: totalParagraphs }
      }));
      
      const translations = {};
      
      for (let i = 0; i < paragraphs.length; i++) {
        const paragraph = paragraphs[i]; // Already trimmed by getOriginalTextParagraphs
        // Update progress to show current paragraph being translated
        setTranslationProgress(prev => ({
          ...prev,
          originalText: { current: i, total: totalParagraphs }
        }));
        
        try {
          const translation = await translateText(paragraph);
          translations[i] = translation;
          
          // Update cache progressively so user sees results immediately
          setOriginalTextTranslations(prev => ({
            ...prev,
            [cacheKey]: { ...translations }
          }));
          
          // Update progress to show paragraph completed
          setTranslationProgress(prev => ({
            ...prev,
            originalText: { current: i + 1, total: totalParagraphs }
          }));
          
          // Small delay to avoid overwhelming the server and show progress
          await new Promise(resolve => setTimeout(resolve, 100));
        } catch (error) {
          console.error(`❌ Error translating paragraph ${i + 1}:`, error);
          // Store error message instead of skipping
          translations[i] = `[Translation error: ${paragraph.substring(0, 30)}...]`;
          
          // Update cache even with error
          setOriginalTextTranslations(prev => ({
            ...prev,
            [cacheKey]: { ...translations }
          }));
          
          // Update progress to show paragraph completed (with error)
          setTranslationProgress(prev => ({
            ...prev,
            originalText: { current: i + 1, total: totalParagraphs }
          }));
        }
      }
      

    } catch (error) {
      console.error('Error translating original text:', error);
    }
    
    setIsTranslatingOriginalText(false);
    setTranslationProgress(prev => ({
      ...prev,
      originalText: { current: 0, total: 0 }
    }));
  };

  // Progressive translation for Unique Words
  const translateUniqueWords = async () => {
    if (uniqueWords.length === 0) return;
    
    // Check if we already have translations for these words and language
    const cacheKey = `${uniqueWords.map(w => w.word).join('_')}_${targetLanguage}`;
    const existingTranslations = uniqueWordsTranslations[cacheKey];
    
    if (existingTranslations) {
      // Use cached translations
      console.log('Using cached unique words translations');
      setShowUniqueWordsTranslation(true);
      return;
    }
    
    setIsTranslatingUniqueWords(true);
    setShowUniqueWordsTranslation(true); // Show immediately for progressive updates
    
    try {
      const totalWords = uniqueWords.length;
      console.log('🌐 Starting progressive translation of', totalWords, 'unique words');
      
      // Initialize progress
      setTranslationProgress(prev => ({
        ...prev,
        uniqueWords: { current: 0, total: totalWords }
      }));
      
      const translations = {};
      
      // Process words sequentially (like Original Text and Study Notes)
      for (let i = 0; i < uniqueWords.length; i++) {
        const wordItem = uniqueWords[i];
        console.log(`🌐 Translating word ${i + 1}/${totalWords}: "${wordItem.word}"`);
        
        try {
          const translation = await translateText(wordItem.word);
          translations[wordItem.word] = translation;
          
          // Update cache progressively so user sees results immediately
          setUniqueWordsTranslations(prev => ({
            ...prev,
            [cacheKey]: { ...translations }
          }));
          
          // Update progress to show word completed
          setTranslationProgress(prev => ({
            ...prev,
            uniqueWords: { current: i + 1, total: totalWords }
          }));
          
          // Small delay to avoid overwhelming the server and show progress (same as Original Text)
          await new Promise(resolve => setTimeout(resolve, 100));
        } catch (error) {
          console.error(`❌ Error translating word "${wordItem.word}":`, error);
          // Store error message instead of skipping
          translations[wordItem.word] = `[Translation error: ${wordItem.word}]`;
          
          // Update cache even with error
          setUniqueWordsTranslations(prev => ({
            ...prev,
            [cacheKey]: { ...translations }
          }));
          
          // Update progress to show word completed (with error)
          setTranslationProgress(prev => ({
            ...prev,
            uniqueWords: { current: i + 1, total: totalWords }
          }));
        }
      }
      
      console.log('✅ Unique words translation completed');
    } catch (error) {
      console.error('Error translating unique words:', error);
    }
    
    setIsTranslatingUniqueWords(false);
    setTranslationProgress(prev => ({
      ...prev,
      uniqueWords: { current: 0, total: 0 }
    }));
  };

  // Progressive translation for Study Notes
  const translateStudyNotes = async () => {
    const segments = getTextSegments();
    if (segments.length === 0) return;
    
    // Check if we already have translations for these segments and language
    const cacheKey = `${segments.join('_')}_${targetLanguage}`;
    const existingTranslations = studyNotesTranslations[cacheKey];
    
    if (existingTranslations) {
      // Use cached translations
      console.log('Using cached study notes translations');
      setShowStudyNotesTranslation(true);
      return;
    }
    
    setIsTranslatingStudyNotes(true);
    setShowStudyNotesTranslation(true); // Show immediately for progressive updates
    
    try {
      const totalSegments = segments.length;
      console.log('🌐 Starting progressive translation of', totalSegments, 'study note segments');
      
      // Initialize progress
      setTranslationProgress(prev => ({
        ...prev,
        studyNotes: { current: 0, total: totalSegments }
      }));
      
      const translations = {};
      
      for (let i = 0; i < segments.length; i++) {
        const segment = segments[i];
        console.log(`🌐 Translating study note segment ${i + 1}/${totalSegments}`);
        
        const translation = await translateText(segment);
        translations[i] = translation;
        
        // Update cache progressively
        setStudyNotesTranslations(prev => ({
          ...prev,
          [cacheKey]: { ...translations }
        }));
        
        // Update progress
        setTranslationProgress(prev => ({
          ...prev,
          studyNotes: { current: i + 1, total: totalSegments }
        }));
        
        // Small delay to avoid overwhelming the server and show progress
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      console.log('✅ Study notes translation completed');
    } catch (error) {
      console.error('Error translating study notes:', error);
    }
    
    setIsTranslatingStudyNotes(false);
    setTranslationProgress(prev => ({
      ...prev,
      studyNotes: { current: 0, total: 0 }
    }));
  };

  // Export translation cache for subpages
  const exportTranslationCache = () => {
    const cache = {
      words: {},
      language: targetLanguage,
      timestamp: Date.now(),
      source: 'homepage'
    };

    // Extract word translations from uniqueWordsTranslations
    Object.values(uniqueWordsTranslations).forEach(translationSet => {
      Object.entries(translationSet).forEach(([word, translation]) => {
        if (word && translation && !translation.includes('[Translation')) {
          cache.words[word.toLowerCase().trim()] = {
            translation: translation,
            language: targetLanguage,
            timestamp: Date.now()
          };
        }
      });
    });

    // Extract word translations from originalTextTranslations (split sentences into words)
    Object.values(originalTextTranslations).forEach(translationSet => {
      Object.entries(translationSet).forEach(([index, translation]) => {
        if (translation && !translation.includes('[Translation')) {
          // Get corresponding original paragraph
          const paragraphs = getOriginalTextParagraphs();
          const originalParagraph = paragraphs[parseInt(index)];
          if (originalParagraph) {
            // For now, we'll store the full sentence translation
            // Individual word extraction would require more complex alignment
            const sentenceKey = `sentence_${originalParagraph.substring(0, 50).replace(/\s+/g, '_')}`;
            cache.words[sentenceKey] = {
              translation: translation,
              language: targetLanguage,
              timestamp: Date.now(),
              type: 'sentence'
            };
          }
        }
      });
    });

    // Extract word translations from studyNotesTranslations
    Object.values(studyNotesTranslations).forEach(translationSet => {
      Object.entries(translationSet).forEach(([index, translation]) => {
        if (translation && !translation.includes('[Translation')) {
          const segments = getTextSegments();
          const originalSegment = segments[parseInt(index)];
          if (originalSegment) {
            const sentenceKey = `segment_${originalSegment.substring(0, 50).replace(/\s+/g, '_')}`;
            cache.words[sentenceKey] = {
              translation: translation,
              language: targetLanguage,
              timestamp: Date.now(),
              type: 'segment'
            };
          }
        }
      });
    });

    console.log('Exporting translation cache with', Object.keys(cache.words).length, 'entries');
    sessionStorage.setItem('vocabKillerTranslationCache', JSON.stringify(cache));
    
    return cache;
  };

  const getOriginalTextParagraphs = () => {
    if (!inputText.trim()) return [];
    return inputText.split(/\n\s*\n|\n/).filter(para => para.trim());
  };

  const renderOriginalTextWithTranslations = () => {
    if (!inputText.trim()) return <span className="text-black">Click "Edit" to add your text content...</span>;
    
    if (!showOriginalTextTranslation) {
      return getHighlightedText();
    }
    
    const paragraphs = getOriginalTextParagraphs();
    const cacheKey = `${inputText}_${targetLanguage}`;
    const translations = originalTextTranslations[cacheKey] || {};
    const currentProgress = translationProgress.originalText;
    
        return paragraphs.map((paragraph, index) => {
      const hasTranslation = translations[index];
      // Simple logic: if we're translating and this paragraph doesn't have a translation yet
      const needsTranslation = isTranslatingOriginalText && !hasTranslation;
      const isCurrentlyTranslating = needsTranslation && index === currentProgress.current;
      const isWaitingForTranslation = needsTranslation && index > currentProgress.current;
      
      return (
        <div key={index} className="mb-4">
          <div className="leading-relaxed">
            {/* Render original paragraph with highlighting */}
            {searchText.trim() && searchResults.length > 0 ? 
              highlightSearchInText(paragraph, index) : 
              paragraph
            }
          </div>
          {/* Show translation if available */}
          {hasTranslation && (
            <div className="mt-2 p-2 bg-gray-50 border-l-4 border-gray-300 rounded-r-md">
              <div className="text-sm text-black font-medium">
                {translations[index]}
              </div>
            </div>
          )}
          {/* Show translation progress indicator for paragraph currently being translated */}
          {isCurrentlyTranslating && !hasTranslation && (
            <div className="mt-2 p-2 bg-gray-100 border-l-4 border-gray-400 rounded-r-md">
              <div className="text-xs text-black italic flex items-center gap-1">
                <ProcessingIcon className="w-3 h-3 animate-spin" />
                Translating...
              </div>
            </div>
          )}
          {/* Show placeholder for paragraphs that will be translated */}
          {isWaitingForTranslation && !hasTranslation && (
            <div className="mt-2 p-2 bg-gray-50 border-l-4 border-gray-200 rounded-r-md">
              <div className="text-xs text-black italic flex items-center gap-1">
                <WaitingIcon className="w-3 h-3" />
                Waiting for translation...
              </div>
            </div>
          )}
        </div>
      );
    });
  };

  const highlightSearchInText = (text, paragraphIndex = -1) => {
    if (!searchText.trim()) return text;
    
    try {
      const escapedSearchText = searchText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regexWithBoundary = new RegExp(`\\b${escapedSearchText}\\b`, 'gi');
      const regexSimple = new RegExp(`${escapedSearchText}`, 'gi');
      
      const parts = [];
      let lastIndex = 0;
      let match;
      let matchCount = 0;
      
      // Calculate text offset for this paragraph in the overall text
      let textOffset = 0;
      if (paragraphIndex >= 0) {
        const paragraphs = getOriginalTextParagraphs();
        for (let i = 0; i < paragraphIndex; i++) {
          textOffset += paragraphs[i].length + 1; // +1 for separator
        }
      }
      
      // Try word boundary search first
      while ((match = regexWithBoundary.exec(text)) !== null) {
        if (match.index > lastIndex) {
          parts.push(text.slice(lastIndex, match.index));
        }
        
        // Calculate global match position
        const globalMatchPosition = textOffset + match.index;
        
        // Check if this is the current active match
        const isCurrentMatch = searchResults.length > 0 && 
                              currentMatchIndex >= 0 && 
                              searchResults[currentMatchIndex] === globalMatchPosition;
        
        parts.push(
          <span 
            key={`match-${match.index}-${matchCount}`}
            className={`font-bold px-1 py-0.5 rounded ${
              isCurrentMatch 
                ? 'bg-black text-white border-2 border-gray-600' 
                : 'bg-black text-white'
            }`}
          >
            {match[0]}
          </span>
        );
        
        lastIndex = match.index + match[0].length;
        matchCount++;
      }
      
      // If no word boundary matches, try simple search
      if (matchCount === 0) {
        regexSimple.lastIndex = 0;
        while ((match = regexSimple.exec(text)) !== null) {
          if (match.index > lastIndex) {
            parts.push(text.slice(lastIndex, match.index));
          }
          
          // Calculate global match position
          const globalMatchPosition = textOffset + match.index;
          
          // Check if this is the current active match
          const isCurrentMatch = searchResults.length > 0 && 
                                currentMatchIndex >= 0 && 
                                searchResults[currentMatchIndex] === globalMatchPosition;
          
          parts.push(
            <span 
              key={`match-${match.index}-${matchCount}`}
              className={`font-bold px-1 py-0.5 rounded ${
                isCurrentMatch 
                  ? 'bg-black text-white border-2 border-gray-600' 
                  : 'bg-black text-white'
              }`}
            >
              {match[0]}
            </span>
          );
          
          lastIndex = match.index + match[0].length;
          matchCount++;
        }
      }
      
      if (lastIndex < text.length) {
        parts.push(text.slice(lastIndex));
      }
      
      return parts.length > 1 ? parts : text;
    } catch (e) {
      return text;
    }
  };

  // Handle word selection (multi-select) with speech
  const handleWordClick = (word) => {
    if (noteWords.includes(word)) {
      // Remove word if already selected
      setNoteWords(noteWords.filter(w => w !== word));
    } else {
      // Add word to selection
      setNoteWords([...noteWords, word]);
    }
    
    // Speak the word when clicked
    speakWord(word);
  };
  
  // Clear all selected words
  const clearSelectedWords = () => {
    setNoteWords([]);
  };
  
  // Get text segments based on paragraph/sentence mode
  const getTextSegments = () => {
    if (!inputText.trim() || noteWords.length === 0) return [];
    
    let segments;
    if (showParagraphs) {
      // Split by paragraphs (double line breaks or single line breaks)
      segments = inputText.split(/\n\s*\n|\n/).filter(para => para.trim());
    } else {
      // Split by sentences
      segments = inputText.split(/(?<=[.!?])\s+/).filter(sentence => sentence.trim());
    }
    
    // Filter segments that contain any of the selected words
    const filteredSegments = segments.filter(segment => 
      noteWords.some(word => 
        new RegExp(`\\b${word}\\b`, 'i').test(segment)
      )
    );
    
    // Filter out removed segments
    return filteredSegments.filter((_, index) => !removedSegments.includes(index));
  };
  
  // Highlight words in text segment
  const highlightWordsInSegment = (segment) => {
    if (noteWords.length === 0) return segment;
    
    try {
      // Escape special regex characters in each word
      const escapedWords = noteWords.map(word => 
        word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      );
      const wordsRegex = new RegExp(`\\b(${escapedWords.join('|')})\\b`, 'gi');
      
      return segment.split(wordsRegex).map((part, index) => {
        const isHighlighted = noteWords.some(word => 
          part.toLowerCase() === word.toLowerCase()
        );
        
        return isHighlighted ? (
          <span 
            key={index} 
            className="bg-black text-white font-semibold px-1 rounded cursor-pointer hover:bg-gray-800 transition-colors inline-flex items-center gap-1"
            onClick={() => speakWord(part)}
            title={`Click to speak "${part}"`}
          >
            {part}
            <ReadTextIcon className="w-3 h-3 opacity-70" />
          </span>
        ) : part;
      });
    } catch (e) {
      return segment;
    }
  };

  // Handle column resize
  const handleColumnResize = (columnIndex, newWidth) => {
    const newWidths = [...columnWidths];
    const oldWidth = newWidths[columnIndex];
    const difference = newWidth - oldWidth;
    
    // Adjust the next column
    if (columnIndex < 2) {
      newWidths[columnIndex] = Math.max(15, Math.min(70, newWidth));
      newWidths[columnIndex + 1] = Math.max(15, Math.min(70, columnWidths[columnIndex + 1] - difference));
    }
    
    setColumnWidths(newWidths);
  };

  // Highlight search results in read-only mode
  const getHighlightedText = () => {
    if (!searchText.trim() || searchResults.length === 0) {
      return inputText;
    }

    try {
      const parts = [];
      let lastIndex = 0;
      
      searchResults.forEach((startPos, index) => {
        const endPos = startPos + searchText.length;
        
        // Add text before match
        if (startPos > lastIndex) {
          const beforeText = inputText.slice(lastIndex, startPos);
          parts.push(beforeText);
        }
        
        // Add highlighted match
        const isActive = index === currentMatchIndex;
        const matchText = inputText.slice(startPos, endPos);
        
        parts.push(
          <span 
            key={`match-${index}-${startPos}`}
            className={`font-bold px-1 py-0.5 rounded ${
              isActive ? 'bg-black text-white border-2 border-gray-600' : 'bg-black text-white'
            }`}
            style={{
              backgroundColor: '#000000',
              color: '#ffffff',
              border: isActive ? '2px solid #4b5563' : 'none',
              fontWeight: 'bold'
            }}
          >
            {matchText}
          </span>
        );
        
        lastIndex = endPos;
      });
      
      // Add remaining text
      if (lastIndex < inputText.length) {
        const remainingText = inputText.slice(lastIndex);
        parts.push(remainingText);
      }
      
      return parts;
    } catch (error) {
      return inputText;
    }
  };

  // Highlight search results in edit mode with white background
  const getHighlightedTextForEditMode = () => {
    if (!searchText.trim() || searchResults.length === 0) {
      return inputText;
    }

    try {
      const parts = [];
      let lastIndex = 0;
      
      searchResults.forEach((startPos, index) => {
        const endPos = startPos + searchText.length;
        
        // Add text before match
        if (startPos > lastIndex) {
          const beforeText = inputText.slice(lastIndex, startPos);
          parts.push(beforeText);
        }
        
        // Add highlighted match
        const isActive = index === currentMatchIndex;
        const matchText = inputText.slice(startPos, endPos);
        
        parts.push(
          <span 
            key={`match-${index}-${startPos}`}
            className={`font-bold px-1 py-0.5 rounded ${
              isActive ? 'bg-yellow-300 text-black border-2 border-gray-600' : 'bg-yellow-300 text-black'
            }`}
            style={{
              backgroundColor: '#fde047',
              color: '#000000',
              border: isActive ? '2px solid #4b5563' : '1px solid #9ca3af',
              fontWeight: 'bold'
            }}
          >
            {matchText}
          </span>
        );
        
        lastIndex = endPos;
      });
      
      // Add remaining text
      if (lastIndex < inputText.length) {
        const remainingText = inputText.slice(lastIndex);
        parts.push(remainingText);
      }
      
      return parts;
    } catch (error) {
      return inputText;
    }
  };

    // Function to open Learn Unknown Words subpage in new tab
  const openLearnUnknownWordsSubpage = async () => {
    // Check usage limit before allowing access
    if (isUsageLimited) {
      setShowUsageLimitModal(true);
      return;
    }
    
    // Export translation cache for subpages
    exportTranslationCache();
    
    // Store comprehensive homepage state before entering subpage
    const homepageState = {
      originalText: inputText,
      unknownWords: [],
      removedSegments: removedSegments,
      fontFamily: fontFamily,
      fontSize: fontSize,
      targetLanguage: targetLanguage,
      searchText: searchText,
      searchResults: searchResults,
      currentMatchIndex: currentMatchIndex,
      selectedVoice: selectedVoice,
      speechSpeed: speechSpeed,
      isOriginalTextSpeaking: isOriginalTextSpeaking,
      isChunkedSpeaking: isChunkedSpeaking,
      speechWasPaused: speechWasPaused,
      pausedText: pausedText,
      pausedChunks: pausedChunks,
      pausedOptions: pausedOptions,
      speechPosition: speechPosition,
      originalTextSpeechStartTime: originalTextSpeechStartTime,
      originalTextSpeechElapsedTime: originalTextSpeechElapsedTime,
      isPausing: isPausingRef.current,
      currentChunk: currentChunkRef.current,
      showOriginalTextTranslation: showOriginalTextTranslation,
      originalTextTranslations: originalTextTranslations,
      translationProgress: translationProgress,
      isTranslatingOriginalText: isTranslatingOriginalText,
      uniqueWords: uniqueWords,
      basicWords: basicWords
    };
    
    sessionStorage.setItem('homepageState', JSON.stringify(homepageState));

    // Open new tab with standalone subpage
    const newTab = window.open('/learn-original-text-subpage.html', '_blank');
   };

  // Function to open Learn All Unique Words subpage in new tab
  const openLearnAllUniqueWords = async () => {
    // Check usage limit before allowing access
    if (isUsageLimited) {
      setShowUsageLimitModal(true);
      return;
    }
    
    // Export translation cache for subpages
    exportTranslationCache();
    
    // Validate that unique words exist
    if (!uniqueWords || uniqueWords.length === 0) {
      alert('No unique words found. Please enter some text first.');
      return;
    }
    
    // Extract just the words (not the count objects) for the typing game
    const wordsForTyping = uniqueWords.map(wordObj => wordObj.word);
    
    // Store comprehensive homepage state before entering subpage
    const homepageState = {
      originalText: inputText,
      uniqueWords: wordsForTyping, // Send array of words for typing game
      uniqueWordsWithCounts: uniqueWords, // Keep original data with counts
      removedSegments: removedSegments,
      fontFamily: fontFamily,
      fontSize: fontSize,
      targetLanguage: targetLanguage,
      selectedVoice: selectedVoice,
      speechSpeed: speechSpeed
    };
    
    sessionStorage.setItem('homepageState', JSON.stringify(homepageState));

    // Open new tab with standalone subpage
    const newTab = window.open('/learn-all-unique-words.html', '_blank');
  };

  // Function to remove a segment
  const removeSegment = (segmentIndex) => {
    setRemovedSegments(prev => [...prev, segmentIndex]);
  };


  const handleUsageLimitClose = () => {
    setShowUsageLimitModal(false);
  };

  const handleWatchAdFromLimit = () => {
    setShowUsageLimitModal(false);
    setIsUsageLimited(false);
  };

  // Function to open Learn Sentences with Unique Words subpage in new tab
  const openLearnSentencesWithUniqueWords = async () => {
    // Check usage limit before allowing access
    if (isUsageLimited) {
      setShowUsageLimitModal(true);
      return;
    }
    
    // Export translation cache for subpages
    exportTranslationCache();
    
    // Get filtered segments based on current mode and selected words (excluding removed segments)
    const filteredSegments = getTextSegments();
    
    // Store comprehensive homepage state before entering subpage
    const homepageState = {
      originalText: inputText,
      uniqueWords: uniqueWords,
      noteWords: noteWords, // Selected words for filtering
      showParagraphs: showParagraphs, // Current mode (sentences/paragraphs)
      filteredSegments: filteredSegments, // Pre-filtered segments to display (excluding removed)
      removedSegments: removedSegments, // Track removed segments
      fontFamily: fontFamily,
      fontSize: fontSize,
      targetLanguage: targetLanguage,
      selectedVoice: selectedVoice,
      speechSpeed: speechSpeed
    };
    
    sessionStorage.setItem('homepageState', JSON.stringify(homepageState));

    // Open new tab with standalone subpage
    const newTab = window.open('/learn-sentences-with-unique-words.html', '_blank');
  };

  // Sort function for unique words
  const sortUniqueWords = (order) => {
    setUniqueWordsSortOrder(order);
    setSortDropdownExpanded(false);
  };





  return (
    <div 
      className="min-h-screen bg-white" 
      style={{ 
        fontFamily: fontFamily, 
        fontSize: `${fontSize}px` 
      }}
    >
      <div className="w-full px-0 py-6 relative">
        {/* Header Layout - Single Row */}
        <div className="flex items-center justify-between mb-6 px-6">
          {/* Left: VocabKiller Title */}
          <div>
            <h1 className="text-3xl font-bold text-black">VocabKiller</h1>
        </div>
        
          {/* Center: Search Section */}
          <div className="flex justify-center flex-1 mx-8">
            <div className="flex flex-col items-center">
              {/* Search input with underline and controls on the same line */}
              <div className="relative flex items-center gap-2">
              <input
                ref={searchInputRef}
                type="text"
                value={searchText}
                onChange={handleSearchChange}
                onKeyDown={handleSearchKeyDown}
                  className="p-1 text-sm border-b border-gray-300 focus:border-black outline-none text-black bg-transparent min-w-[300px]"
                  placeholder="Search words..."
              />
                
                {/* Speak button near left arrow */}
              {searchText && (
                <button
                  type="button"
                  onClick={() => speakWord(searchText)}
                    className="text-black hover:text-black transition-colors text-xs"
                  title={`Speak "${searchText}"`}
                >
                    <ReadTextIcon className="w-3 h-3" />
                </button>
              )}
                
                {/* Navigation arrows on the same line */}
                <div className="flex gap-1">
              <button
                type="button"
                onClick={() => handleSearchNavigation(-1)}
                disabled={searchResults.length === 0}
                    className="text-black hover:text-black disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-lg"
                title="Previous match"
              >
                ←
              </button>
              <button
                type="button"
                onClick={() => handleSearchNavigation(1)}
                disabled={searchResults.length === 0}
                    className="text-black hover:text-black disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-lg"
                title="Next match"
              >
                →
              </button>
                </div>
              </div>
            </div>

            {/* Search Results Info */}
            {searchResults.length > 0 && (
              <div className="ml-3 text-center">
                <span className="text-xs text-black font-medium">
                  {currentMatchIndex >= 0 ? `${currentMatchIndex + 1} of ` : ''}{searchResults.length} match{searchResults.length !== 1 ? 'es' : ''} found
                </span>
              </div>
            )}
            
            {searchText && searchResults.length === 0 && inputText.trim() && (
              <div className="ml-3 text-center">
                <span className="text-xs text-black">
                  No matches found for "{searchText}"
                </span>
              </div>
            )}
          </div>
          
          {/* Right: Font Settings, Translation Language and Speech Controls */}
          <div className="flex items-center gap-3">
            {/* Font Settings */}
            <div className="flex flex-col items-center relative" ref={fontOptionsRef}>
              <button
                onClick={() => setFontSettingsExpanded(!fontSettingsExpanded)}
                className="text-black hover:text-black transition-colors"
                title={fontSettingsExpanded ? "Collapse font settings" : "Expand font settings"}
              >
                <FontIcon className="w-5 h-5" />
              </button>
              
              {fontSettingsExpanded && (
                <div className="absolute top-full left-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-20 p-3 min-w-[300px]"
                     style={{ fontFamily: fontFamily, fontSize: `${fontSize}px` }}>
                  {/* Font Family Selection */}
                  <div className="mb-3">
                    <label className="block text-xs font-medium text-black mb-1">
                      Font Family
                    </label>
                    <select
                      value={fontFamily}
                      onChange={(e) => setFontFamily(e.target.value)}
                      className="w-full p-2 text-xs border border-gray-300 rounded-md focus:ring-2 focus:ring-gray-400 focus:border-gray-400 text-black bg-white"
                    >
                      <option value="system-ui">System Default</option>
                      <option value="Arial, sans-serif">Arial</option>
                      <option value="Georgia, serif">Georgia</option>
                      <option value="'Times New Roman', serif">Times New Roman</option>
                      <option value="Helvetica, sans-serif">Helvetica</option>
                      <option value="Verdana, sans-serif">Verdana</option>
                      <option value="'Courier New', monospace">Courier New</option>
                      <option value="'Comic Sans MS', cursive">Comic Sans MS</option>
                      <option value="Impact, sans-serif">Impact</option>
                      <option value="'Lucida Console', monospace">Lucida Console</option>
                      <option value="Calibri, sans-serif">Calibri</option>
                      <option value="Cambria, serif">Cambria</option>
                      <option value="Candara, sans-serif">Candara</option>
                      <option value="Consolas, monospace">Consolas</option>
                      <option value="Constantia, serif">Constantia</option>
                      <option value="Corbel, sans-serif">Corbel</option>
                      <option value="'Franklin Gothic Medium', sans-serif">Franklin Gothic Medium</option>
                      <option value="Garamond, serif">Garamond</option>
                      <option value="'Gill Sans', sans-serif">Gill Sans</option>
                      <option value="'Lucida Sans', sans-serif">Lucida Sans</option>
                      <option value="'Palatino Linotype', serif">Palatino Linotype</option>
                      <option value="'Segoe UI', sans-serif">Segoe UI</option>
                      <option value="Tahoma, sans-serif">Tahoma</option>
                      <option value="'Trebuchet MS', sans-serif">Trebuchet MS</option>
                      <option value="'Book Antiqua', serif">Book Antiqua</option>
                      <option value="'Century Gothic', sans-serif">Century Gothic</option>
                      <option value="'Lucida Bright', serif">Lucida Bright</option>
                      <option value="'MS Sans Serif', sans-serif">MS Sans Serif</option>
                      <option value="'MS Serif', serif">MS Serif</option>
                      <option value="Optima, sans-serif">Optima</option>
                      <option value="'Palatino', serif">Palatino</option>
                      <option value="'Times', serif">Times</option>
                      <option value="'Avant Garde', sans-serif">Avant Garde</option>
                      <option value="'Bookman', serif">Bookman</option>
                      <option value="'Helvetica Neue', sans-serif">Helvetica Neue</option>
                      <option value="'New Century Schoolbook', serif">New Century Schoolbook</option>
                      <option value="'Zapf Chancery', cursive">Zapf Chancery</option>
                      <option value="'Brush Script MT', cursive">Brush Script MT</option>
                      <option value="'Copperplate', fantasy">Copperplate</option>
                      <option value="'Papyrus', fantasy">Papyrus</option>
                      <option value="'Rockwell', serif">Rockwell</option>
                      <option value="'Baskerville', serif">Baskerville</option>
                      <option value="'Futura', sans-serif">Futura</option>
                      <option value="'Didot', serif">Didot</option>
                      <option value="'American Typewriter', serif">American Typewriter</option>
                      <option value="'Andale Mono', monospace">Andale Mono</option>
                      <option value="'Monaco', monospace">Monaco</option>
                      <option value="'Menlo', monospace">Menlo</option>
                      <option value="'Source Code Pro', monospace">Source Code Pro</option>
                      <option value="'Fira Code', monospace">Fira Code</option>
                      <option value="'Roboto', sans-serif">Roboto</option>
                      <option value="'Open Sans', sans-serif">Open Sans</option>
                      <option value="'Adobe Garamond Pro', serif">Adobe Garamond Pro</option>
                      <option value="'Bradley Hand', cursive">Bradley Hand</option>
                      <option value="'Hanyi Senty Candy', fantasy">Hanyi Senty Candy</option>
                    </select>
        </div>

                  {/* Font Size Control */}
                  <div className="mb-3">
                    <label className="block text-xs font-medium text-black mb-1">
                      Font Size: {fontSize}px
                    </label>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-black">Small</span>
                      <input
                        type="range"
                        min="10"
                        max="24"
                        step="1"
                        value={fontSize}
                        onChange={(e) => setFontSize(parseInt(e.target.value))}
                        className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                        style={{
                          background: `linear-gradient(to right, #000000 0%, #000000 ${((fontSize - 10) / 14) * 100}%, #e5e7eb ${((fontSize - 10) / 14) * 100}%, #e5e7eb 100%)`
                        }}
                      />
                      <span className="text-xs text-black">Large</span>
                      <button
                        onClick={() => setFontSize(14)}
                        className="text-xs text-black hover:text-black underline"
                        title="Reset to default size"
                      >
                        Reset
                      </button>
                    </div>
                  </div>
                  
                  {/* Preview Text */}
                  <div className="p-2 border border-gray-200 rounded-md bg-gray-50">
                    <div 
                      className="text-black"
                      style={{ 
                        lineHeight: '1.5'
                      }}
                    >
                      Sample text: The quick brown fox jumps over the lazy dog.
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            {/* Translation Language */}
            <div className="flex items-center relative" ref={translationLanguageRef}>
              <button
                onClick={() => setTranslationLanguageExpanded(!translationLanguageExpanded)}
                className="text-xs border-b border-gray-300 focus:border-black outline-none px-2 py-1 min-w-[120px] text-black bg-transparent text-left flex items-center justify-between"
                style={{
                  fontFamily: fontFamily,
                  fontSize: `${fontSize}px`
                }}
              >
                <span>
                  {targetLanguage === 'zh' ? 'Chinese (S)' :
                   targetLanguage === 'zh-tw' ? 'Chinese (T)' :
                   targetLanguage === 'en' ? 'English' :
                   targetLanguage === 'es' ? 'Spanish' :
                   targetLanguage === 'fr' ? 'French' :
                   targetLanguage === 'de' ? 'German' :
                   targetLanguage === 'it' ? 'Italian' :
                   targetLanguage === 'ja' ? 'Japanese' :
                   targetLanguage === 'ko' ? 'Korean' :
                   targetLanguage === 'pt' ? 'Portuguese' :
                   targetLanguage === 'ru' ? 'Russian' :
                   targetLanguage === 'ar' ? 'Arabic' : 'Translate to'}
                </span>
                <ExpandIcon className="w-3 h-3 ml-2" />
              </button>
              
              {translationLanguageExpanded && (
                <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-10 min-w-[120px]"
                     style={{ fontFamily: fontFamily, fontSize: `${fontSize}px` }}>
                  <button
                    onClick={() => {
                      setTargetLanguage('');
                      setTranslationLanguageExpanded(false);
                    }}
                    className="w-full px-2 py-1 text-xs text-left text-black hover:bg-black hover:text-white transition-colors"
                  >
                    Translate to
                  </button>
                  <button
                    onClick={() => {
                      setTargetLanguage('zh');
                      setTranslationLanguageExpanded(false);
                    }}
                    className="w-full px-2 py-1 text-xs text-left text-black hover:bg-black hover:text-white transition-colors"
                  >
                    Chinese (S)
                  </button>
                  <button
                    onClick={() => {
                      setTargetLanguage('zh-tw');
                      setTranslationLanguageExpanded(false);
                    }}
                    className="w-full px-2 py-1 text-xs text-left text-black hover:bg-black hover:text-white transition-colors"
                  >
                    Chinese (T)
                  </button>
                  <button
                    onClick={() => {
                      setTargetLanguage('en');
                      setTranslationLanguageExpanded(false);
                    }}
                    className="w-full px-2 py-1 text-xs text-left text-black hover:bg-black hover:text-white transition-colors"
                  >
                    English
                  </button>
                  <button
                    onClick={() => {
                      setTargetLanguage('es');
                      setTranslationLanguageExpanded(false);
                    }}
                    className="w-full px-2 py-1 text-xs text-left text-black hover:bg-black hover:text-white transition-colors"
                  >
                    Spanish
                  </button>
                  <button
                    onClick={() => {
                      setTargetLanguage('fr');
                      setTranslationLanguageExpanded(false);
                    }}
                    className="w-full px-2 py-1 text-xs text-left text-black hover:bg-black hover:text-white transition-colors"
                  >
                    French
                  </button>
                  <button
                    onClick={() => {
                      setTargetLanguage('de');
                      setTranslationLanguageExpanded(false);
                    }}
                    className="w-full px-2 py-1 text-xs text-left text-black hover:bg-black hover:text-white transition-colors"
                  >
                    German
                  </button>
                  <button
                    onClick={() => {
                      setTargetLanguage('it');
                      setTranslationLanguageExpanded(false);
                    }}
                    className="w-full px-2 py-1 text-xs text-left text-black hover:bg-black hover:text-white transition-colors"
                  >
                    Italian
                  </button>
                  <button
                    onClick={() => {
                      setTargetLanguage('ja');
                      setTranslationLanguageExpanded(false);
                    }}
                    className="w-full px-2 py-1 text-xs text-left text-black hover:bg-black hover:text-white transition-colors"
                  >
                    Japanese
                  </button>
                  <button
                    onClick={() => {
                      setTargetLanguage('ko');
                      setTranslationLanguageExpanded(false);
                    }}
                    className="w-full px-2 py-1 text-xs text-left text-black hover:bg-black hover:text-white transition-colors"
                  >
                    Korean
                  </button>
                  <button
                    onClick={() => {
                      setTargetLanguage('pt');
                      setTranslationLanguageExpanded(false);
                    }}
                    className="w-full px-2 py-1 text-xs text-left text-black hover:bg-black hover:text-white transition-colors"
                  >
                    Portuguese
                  </button>
                  <button
                    onClick={() => {
                      setTargetLanguage('ru');
                      setTranslationLanguageExpanded(false);
                    }}
                    className="w-full px-2 py-1 text-xs text-left text-black hover:bg-black hover:text-white transition-colors"
                  >
                    Russian
                  </button>
                  <button
                    onClick={() => {
                      setTargetLanguage('ar');
                      setTranslationLanguageExpanded(false);
                    }}
                    className="w-full px-2 py-1 text-xs text-left text-black hover:bg-black hover:text-white transition-colors"
                  >
                    Arabic
                  </button>
                </div>
              )}
            </div>
            
            {/* Speech Controls */}
            <div className="flex flex-col items-center relative">
              <div className="flex items-center gap-2">
                <h3 className="font-medium text-black text-sm">Speech Controls</h3>
                <button
                  onClick={() => setSpeechControlsExpanded(!speechControlsExpanded)}
                  className="text-black hover:text-black transition-colors"
                  title={speechControlsExpanded ? "Collapse speech controls" : "Expand speech controls"}
                >
                  <ExpandIcon className="w-3 h-3" />
                </button>
            </div>
            
            {speechControlsExpanded && (
                <div className="absolute top-full left-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-20 p-3 min-w-[350px]"
                     style={{ fontFamily: fontFamily, fontSize: `${fontSize}px` }}>
                {/* Speech Speed Control */}
                  <div className="mb-3">
                    <label className="block text-xs font-medium text-black mb-1">
                    Speech Speed: {speechSpeed}x
                  </label>
                  <div className="flex items-center gap-3">
                      <span className="text-xs text-black">Slow</span>
                    <input
                      type="range"
                      min="0.5"
                      max="2"
                      step="0.1"
                      value={speechSpeed}
                      onChange={(e) => setSpeechSpeed(parseFloat(e.target.value))}
                      className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                      style={{
                          background: `linear-gradient(to right, #000000 0%, #000000 ${((speechSpeed - 0.5) / 1.5) * 100}%, #e5e7eb ${((speechSpeed - 0.5) / 1.5) * 100}%, #e5e7eb 100%)`
                      }}
                    />
                      <span className="text-xs text-black">Fast</span>
                    <button
                      onClick={() => setSpeechSpeed(1.0)}
                        className="text-xs text-black hover:text-black underline"
                      title="Reset to default normal speed"
                    >
                      Reset
                    </button>
                    <button
                      onClick={() => speakWord('vocabulary')}
                        className="text-xs bg-white hover:bg-black text-black hover:text-white px-2 py-1 rounded transition-colors border border-gray-300"
                      title="Test current speed with the word 'vocabulary'"
                      disabled={isSpeaking}
                    >
                        {isSpeaking ? <ReadTextIcon className="w-3 h-3" /> : 'Test'}
                    </button>
                  </div>
                </div>

                {/* Voice Selection */}
                  <div className="flex flex-col gap-1 mb-3">
                  <div className="flex flex-col gap-1">
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="voiceType"
                        checked={!useAIVoice}
                        onChange={() => setUseAIVoice(false)}
                          className="w-4 h-4 text-black accent-black"
                      />
                        <span className="text-xs font-medium text-black">Browser Voices</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="voiceType"
                        checked={useAIVoice}
                        onChange={() => setUseAIVoice(true)}
                          className="w-4 h-4 text-black accent-black"
                      />
                        <span className="text-xs font-medium text-black">Enhanced Voices</span>
                    </label>
                  </div>
                </div>

                {!useAIVoice && availableVoices.length > 0 && (
                  <div>
                      <label className="block text-xs font-medium text-black mb-2">
                      Browser Voice:
                    </label>
                    
                    {/* Google voice availability notice */}
                    {(() => {
                      const hasGoogleUKFemale = availableVoices.some(voice => 
                        voice.name.toLowerCase().includes('google') && 
                        voice.name.toLowerCase().includes('uk') && 
                        voice.name.toLowerCase().includes('english') &&
                        voice.name.toLowerCase().includes('female')
                      );
                      
                      if (hasGoogleUKFemale) {
                        return (
                          <div className="mb-2 p-2 bg-green-50 border border-green-200 rounded text-xs">
                            <strong>✅ Google UK English Female available!</strong> Automatically selected as default.
                          </div>
                        );
                      }
                      return null;
                    })()}
                    
                    <div className="flex gap-2">
                      <select
                        value={selectedVoice ? selectedVoice.name : ''}
                        onChange={(e) => {
                          const voice = availableVoices.find(v => v.name === e.target.value);
                          setSelectedVoice(voice);
                        }}
                          className="flex-1 p-2 text-xs border border-gray-300 rounded-md focus:ring-2 focus:ring-gray-400 focus:border-gray-400 text-black bg-white"
                      >
                        {availableVoices.map((voice) => (
                          <option key={voice.name} value={voice.name}>
                            {voice.name} ({voice.lang})
                            {voice.localService ? ' - System' : ' - Online'}
                            {voice.name.toLowerCase().includes('google') && voice.name.toLowerCase().includes('uk') && voice.name.toLowerCase().includes('female') ? ' - 🎯 PREFERRED' : ''}
                          </option>
                        ))}
                      </select>
                      <button
                        onClick={() => speakWord('Hello, this is a voice test')}
                          className="bg-white hover:bg-black text-black hover:text-white px-3 py-2 text-xs rounded-md transition-colors border border-gray-300"
                        title="Test selected voice"
                      >
                        Test Voice
                      </button>
                    </div>
                      <p className="text-xs text-black mt-1">
                      {selectedVoice && (
                        <>
                          Current: {selectedVoice.name} ({selectedVoice.lang})
                          {selectedVoice.localService ? ' - Works offline' : ' - Requires internet'}
                        </>
                      )}
                    </p>
                  </div>
                )}

                {useAIVoice && (
                  <div>
                      <label className="block text-xs font-medium text-black mb-2">
                      Enhanced AI Voices:
                    </label>
                    <div className="flex gap-2">
                        <div className="flex-1 p-2 text-xs border border-gray-300 rounded-md bg-gray-50 text-black">
                        Auto-selects highest quality voice (Natural/Neural/Premium)
                      </div>
                      <button
                        onClick={() => speakWord('Hello, this is an enhanced AI voice test')}
                          className="bg-white hover:bg-black text-black hover:text-white px-3 py-2 text-xs rounded-md transition-colors disabled:opacity-50 border border-gray-300"
                        title="Test enhanced AI voice"
                        disabled={isSpeaking}
                      >
                        {isSpeaking ? (
                          <>
                              <ProcessingIcon className="w-3 h-3 animate-spin" /> Testing...
                          </>
                        ) : (
                          'Test Voice'
                        )}
                      </button>
                    </div>
                      <p className="text-xs text-black mt-2">
                      Automatically finds and uses your browser's highest quality voices
                                     </p>
                   </div>
                 )}
               </div>
             )}
            </div>
            
            {/* More Button */}
            <div className="flex flex-col items-center relative" ref={moreDropdownRef}>
              <button
                onClick={() => setMoreDropdownExpanded(!moreDropdownExpanded)}
                className="text-black hover:bg-black hover:text-white transition-colors px-3 py-1 text-sm"
                title={moreDropdownExpanded ? "Close menu" : "More options"}
              >
                More
              </button>
              
              {moreDropdownExpanded && (
                <div className="absolute top-full right-0 mt-1 bg-white shadow-lg z-20 min-w-[120px]">
                  <button
                    onClick={() => {
                      window.open('/about', '_blank');
                      setMoreDropdownExpanded(false);
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-black hover:bg-black hover:text-white transition-colors"
                  >
                    About
                  </button>
                  <button
                    onClick={() => {
                      window.open('/privacy', '_blank');
                      setMoreDropdownExpanded(false);
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-black hover:bg-black hover:text-white transition-colors"
                  >
                    Privacy
                  </button>
                </div>
              )}
            </div>
           </div>
         </div>

        {/* Remove the old separate sections that are now integrated into the header */}
        <div className="flex gap-2 h-[calc(100vh-8rem)] overflow-x-auto min-w-full relative" style={{gap: '0.5rem', minWidth: '100%'}}>
          {/* Column 1: Input Text */}
          <div 
            className="bg-white rounded-lg shadow-md overflow-hidden flex flex-col relative ml-8"
            style={{width: `${columnWidths[0]}%`}}
          >
            {/* Left edge resize handle */}
            <div 
              className="absolute top-0 left-0 w-1 h-full bg-gray-300 hover:bg-black cursor-col-resize opacity-0 hover:opacity-100 transition-opacity z-10"
              onMouseDown={(e) => {
                e.preventDefault();
                const startX = e.clientX;
                const startWidth = columnWidths[0];
                
                const handleMouseMove = (e) => {
                  const deltaX = startX - e.clientX; // Reversed for left edge
                  const container = document.querySelector('.flex');
                  if (!container) return;
                  const containerWidth = container.offsetWidth;
                  const pixelDelta = deltaX;
                  
                  // For left edge, allow expansion beyond current boundaries
                  const newWidthPercent = startWidth + (pixelDelta / containerWidth) * 100;
                  const newWidths = [...columnWidths];
                  
                  // Allow the first column to expand beyond normal limits
                  newWidths[0] = Math.max(20, Math.min(80, newWidthPercent));
                  
                  // If we're expanding beyond normal container, adjust the layout
                  if (newWidths[0] > 60) {
                    // Expand the container and allow overflow
                    const totalExpandedWidth = newWidths[0] + columnWidths[1] + columnWidths[2];
                    if (totalExpandedWidth > 100) {
                      container.style.minWidth = `${totalExpandedWidth}%`;
                    }
                  } else {
                    // Normal behavior within container
                    const difference = newWidths[0] - columnWidths[0];
                    newWidths[1] = Math.max(10, columnWidths[1] - difference);
                    container.style.minWidth = '100%';
                  }
                  
                  setColumnWidths(newWidths);
                };
                
                const handleMouseUp = () => {
                  document.removeEventListener('mousemove', handleMouseMove);
                  document.removeEventListener('mouseup', handleMouseUp);
                  // Ensure proper cleanup of container styles
                  const container = document.querySelector('.flex');
                  if (container) {
                    const totalWidth = columnWidths[0] + columnWidths[1] + columnWidths[2];
                    if (totalWidth <= 100) {
                      container.style.minWidth = '100%';
                    }
                  }
                };
                
                document.addEventListener('mousemove', handleMouseMove);
                document.addEventListener('mouseup', handleMouseUp);
              }}
            />
            <div className="bg-white border-b border-gray-300 p-4">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold text-black">Original Text</h2>
                <div className="flex items-center gap-2">
                  <div className="relative" ref={readOptionsRef}>
                    <button
                      onClick={() => setReadOptionsExpanded(!readOptionsExpanded)}
                      className="text-black hover:text-black transition-colors flex items-center gap-1"
                      title="Choose reading options"
                                          disabled={!inputText.trim() || isProcessingText}
                  >
                      <ReadTextIcon className="w-3 h-3" />
                      <span className="text-xs">Read Text</span>
                      <ExpandIcon className="w-3 h-3" />
                    </button>
                    
                    {readOptionsExpanded && (
                      <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-10 min-w-[180px]"
                           style={{ fontFamily: fontFamily, fontSize: `${fontSize}px` }}>
                        <button
                          onClick={() => {
                            setReadOptionsExpanded(false);
                            speakEntireText();
                          }}
                          className="w-full px-3 py-2 text-xs text-left text-black hover:bg-black hover:text-white rounded-t-md transition-colors"
                          title="Read the entire original text"
                        >
                          Read WHOLE Text
                        </button>
                        <button
                          onClick={() => {
                            setReadOptionsExpanded(false);
                            speakHighlightedText();
                          }}
                          className="w-full px-3 py-2 text-xs text-left text-black hover:bg-black hover:text-white rounded-b-md transition-colors"
                          title="Read selected text or sentences containing highlighted search terms"
                          disabled={!hasHighlightedText() || isProcessingText}
                        >
                          Read Highlighted Text
                        </button>
                      </div>
                    )}
                  </div>
                  
                  {/* Play button - always visible */}
                  <button
                    onClick={() => {
                      if (speechWasPaused) {
                        resumeSpeech();
                      } else if (isOriginalTextSpeaking) {
                        // Pause current speech
                        const currentChunk = currentChunkRef.current;
                        const elapsedTime = Date.now() - originalTextSpeechStartTime;
                        
                        const currentChunkText = pausedChunks[currentChunk] || '';
                        const wordsInChunk = currentChunkText.split(/\s+/).length;
                        const speechRate = pausedOptions.rate || speechSpeed;
                        const averageWordsPerMinute = 180 * speechRate;
                        const estimatedWordsSpoken = Math.floor((elapsedTime / 1000 / 60) * averageWordsPerMinute);
                        const wordIndex = Math.min(estimatedWordsSpoken, wordsInChunk - 1);
                        
                        setOriginalTextSpeechElapsedTime(elapsedTime);
                        setSpeechPosition({ chunkIndex: currentChunk, textPosition: 0, wordIndex: wordIndex });
                        isPausingRef.current = true;
                        setSpeechWasPaused(true);
                        speechSynthesis.cancel();
                      } else {
                        speakEntireText();
                      }
                    }}
                    className="text-black hover:text-black transition-colors flex items-center gap-1"
                    title={
                      speechWasPaused
                        ? "Resume reading from where it was paused"
                        : isOriginalTextSpeaking
                        ? "Pause reading"
                        : "Play the whole text"
                    }
                    disabled={!inputText.trim() || isProcessingText}
                  >
                    {speechWasPaused ? (
                      <>
                        <PlayIcon className="w-3 h-3" />
                        <span className="text-xs">Resume</span>
                      </>
                    ) : isOriginalTextSpeaking ? (
                      <>
                        <PauseIcon className="w-3 h-3" />
                        <span className="text-xs">Pause</span>
                      </>
                    ) : (
                      <>
                        <PlayIcon className="w-3 h-3" />
                        <span className="text-xs">Play</span>
                      </>
                    )}
                  </button>
                  
                  {/* Translation button */}
                  <button
                    onClick={() => {
                      if (showOriginalTextTranslation) {
                        setShowOriginalTextTranslation(false);
                      } else {
                        translateOriginalText();
                      }
                    }}
                    className="text-black hover:text-black transition-colors flex items-center gap-1"
                    title={showOriginalTextTranslation ? "Hide translations" : `Translate to ${
                      targetLanguage === 'zh' ? 'Chinese (Simplified)' :
                      targetLanguage === 'zh-tw' ? 'Chinese (Traditional)' :
                      targetLanguage === 'en' ? 'English' :
                      targetLanguage === 'es' ? 'Spanish' :
                      targetLanguage === 'fr' ? 'French' :
                      targetLanguage === 'de' ? 'German' :
                      targetLanguage === 'it' ? 'Italian' :
                      targetLanguage === 'ja' ? 'Japanese' :
                      targetLanguage === 'ko' ? 'Korean' :
                      targetLanguage === 'pt' ? 'Portuguese' :
                      targetLanguage === 'ru' ? 'Russian' :
                      targetLanguage === 'ar' ? 'Arabic' : targetLanguage.toUpperCase()
                    }`}
                    disabled={!inputText.trim() || isProcessingText}
                  >
                    {isTranslatingOriginalText ? (
                      <ProcessingIcon className="w-3 h-3 animate-spin" />
                    ) : (
                      <TranslateIcon className="w-3 h-3" />
                    )}
                    {isTranslatingOriginalText ? (
                      <span className="text-xs">Translating...</span>
                    ) : showOriginalTextTranslation ? (
                      <span className="text-xs">Hide</span>
                    ) : null}
                  </button>

                </div>
              </div>
              
              <div className="mt-2">
                <span className="text-black">
                  Total Words: {totalWords}
                </span>
                {isProcessingText && (
                  <div className="text-xs text-black mt-1 font-medium">
                    <ProcessingIcon className="w-3 h-3 animate-spin inline mr-1" /> Processing text... Estimated time: {Math.max(0.5, Math.min(3, totalWords * 0.002)).toFixed(1)}s
                  </div>
                )}

                {isEditMode ? (
                  <div className="text-black mt-1">
                    <EditIcon className="w-3 h-3 inline mr-1" /> Edit mode
                  </div>
                ) : (
                  <div className="text-black mt-1">
                    <EyeIcon className="w-3 h-3 inline mr-1" /> Read mode
                  </div>
                )}
              </div>
            </div>
            
                        <div className="flex-1 p-4 overflow-auto relative">
              {isEditMode ? (
                <div className="w-full h-full relative">
                  {/* Background highlighting layer for edit mode */}
                  {searchText.trim() && searchResults.length > 0 && (
                    <div 
                      ref={(el) => { 
                        if (el && textAreaRef.current) {
                          // Sync scroll position immediately
                          el.scrollTop = textAreaRef.current.scrollTop;
                          el.scrollLeft = textAreaRef.current.scrollLeft;
                        }
                      }}
                      className="absolute inset-0 p-4 whitespace-pre-wrap leading-relaxed pointer-events-none z-10 overflow-auto"
                      style={{
                        lineHeight: '1.5',
                        color: 'rgba(0, 0, 0, 0.1)', // Very light text so highlights show through
                        background: 'transparent',
                        scrollbarWidth: 'none', // Hide scrollbars on Firefox
                        msOverflowStyle: 'none', // Hide scrollbars on IE
                        WebkitScrollbar: { display: 'none' } // Hide scrollbars on WebKit browsers
                      }}
                    >
                      {getHighlightedTextForEditMode()}
                    </div>
                  )}
                  <textarea
                    ref={textAreaRef}
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Escape') {
                        setIsEditMode(false);
                      }
                    }}

                    onScroll={(e) => {
                      // Sync scroll with background highlighting layer
                      const backgroundLayer = e.target.parentElement.querySelector('div');
                      if (backgroundLayer) {
                        backgroundLayer.scrollTop = e.target.scrollTop;
                        backgroundLayer.scrollLeft = e.target.scrollLeft;
                      }
                    }}
                    className="w-full h-full p-4 border border-gray-200 rounded-lg focus:ring-2 focus:ring-black focus:border-black outline-none transition-all duration-300 resize-none relative z-20"
                    style={{
                      lineHeight: '1.5',
                      background: searchText.trim() && searchResults.length > 0 ? 'rgba(255, 255, 255, 0.8)' : 'white'
                    }}
                    placeholder="Paste your text here..."
                  />
                </div>
              ) : (
                <div 
                  ref={readOnlyRef}
                  className="w-full h-full p-4 border border-gray-200 rounded-lg bg-white overflow-auto whitespace-pre-wrap leading-relaxed"
                  onKeyDown={handleReadOnlyKeyDown}
                  tabIndex={0}

                >
                  {renderOriginalTextWithTranslations()}
                </div>
              )}
            </div>

            {/* Edit Button Section */}
            <div className="border-t border-gray-200 p-4 bg-white">
              {!isEditMode && (
                <button
                  onClick={editAtCurrentPosition}
                  className="w-full px-3 py-2 text-sm bg-white text-black hover:bg-black hover:text-white rounded-md transition-colors font-medium border border-gray-300"
                  title="Edit text"
                >
                  <EditIcon className="w-3 h-3 inline mr-1" /> Edit
                </button>
              )}
              {isEditMode && (
                <button
                  onClick={() => {
                    setIsEditMode(false);
                  }}
                  className="w-full px-3 py-2 text-sm bg-white text-black hover:bg-black hover:text-white rounded-md transition-colors border border-gray-300"
                  title="Exit edit mode"
                >
                  <CheckIcon className="w-3 h-3 inline mr-1" /> Done Editing
                </button>
              )}
              <div className="mt-2">
                <button
                  onClick={openLearnUnknownWordsSubpage}
                  className="w-full px-3 py-2 text-sm bg-white text-black hover:bg-black hover:text-white rounded-md transition-colors border border-gray-300"
                  title="Open Learn Unknown Words"
                >
                  Learn Original Text
                </button>
              </div>
            </div>
            
            {/* Resize handle */}
            <div 
              className="absolute top-0 right-0 w-1 h-full bg-gray-300 hover:bg-black cursor-col-resize opacity-0 hover:opacity-100 transition-opacity"
              onMouseDown={(e) => {
                e.preventDefault();
                const startX = e.clientX;
                const startWidth = columnWidths[0];
                
                const handleMouseMove = (e) => {
                  const deltaX = e.clientX - startX;
                  const container = document.querySelector('.flex');
                  if (!container) return;
                  const containerWidth = container.offsetWidth;
                  const newWidth = startWidth + (deltaX / containerWidth) * 100;
                  handleColumnResize(0, newWidth);
                };
                
                const handleMouseUp = () => {
                  document.removeEventListener('mousemove', handleMouseMove);
                  document.removeEventListener('mouseup', handleMouseUp);
                };
                
                document.addEventListener('mousemove', handleMouseMove);
                document.addEventListener('mouseup', handleMouseUp);
              }}
            />
          </div>

          {/* Column 2: Unique Words */}
          <div 
            className="bg-white rounded-lg shadow-md overflow-hidden flex flex-col relative"
            style={{width: `${columnWidths[1]}%`}}
          >
            <div className="bg-white border-b border-gray-300 p-4">
              <div className="flex items-center justify-between mb-2">
                <h2 className="font-semibold text-black">Unique Words</h2>
                <div className="flex items-center gap-2">
                  {/* Translation button for Unique Words */}
                  <button
                    onClick={() => {
                      if (showUniqueWordsTranslation) {
                        setShowUniqueWordsTranslation(false);
                      } else {
                        translateUniqueWords();
                      }
                    }}
                    className="text-black hover:text-black transition-colors flex items-center gap-1"
                    title={showUniqueWordsTranslation ? "Hide word translations" : `Translate words to ${
                      targetLanguage === 'zh' ? 'Chinese (Simplified)' :
                      targetLanguage === 'zh-tw' ? 'Chinese (Traditional)' :
                      targetLanguage === 'en' ? 'English' :
                      targetLanguage === 'es' ? 'Spanish' :
                      targetLanguage === 'fr' ? 'French' :
                      targetLanguage === 'de' ? 'German' :
                      targetLanguage === 'it' ? 'Italian' :
                      targetLanguage === 'ja' ? 'Japanese' :
                      targetLanguage === 'ko' ? 'Korean' :
                      targetLanguage === 'pt' ? 'Portuguese' :
                      targetLanguage === 'ru' ? 'Russian' :
                      targetLanguage === 'ar' ? 'Arabic' : targetLanguage.toUpperCase()
                    }`}
                    disabled={uniqueWords.length === 0}
                  >
                    {isTranslatingUniqueWords ? <ProcessingIcon className="w-3 h-3 animate-spin" /> : <TranslateIcon className="w-3 h-3" />}
                    {isTranslatingUniqueWords ? (
                      <span className="text-xs">Translating...</span>
                    ) : showUniqueWordsTranslation ? (
                      <span className="text-xs">Hide</span>
                    ) : null}
                  </button>

                  {/* Sort dropdown for Unique Words - positioned next to translation button */}
                  <div className="relative">
                    <button
                      onClick={() => setSortDropdownExpanded(!sortDropdownExpanded)}
                      className="text-black hover:text-black transition-colors flex items-center gap-1"
                      title={`Sort words by frequency${
                        uniqueWordsSortOrder === 'least' ? ' (Least Frequent First)' :
                        uniqueWordsSortOrder === 'most' ? ' (Most Frequent First)' : ''
                      }`}
                      disabled={uniqueWords.length === 0}
                    >
                      <SortIcon className="w-3 h-3" />
                      <span className="text-xs">Sort</span>
                    </button>
                    
                    {sortDropdownExpanded && (
                      <div className="absolute top-full right-0 mt-1 bg-white border border-gray-300 rounded-md shadow-lg z-10 min-w-[180px]">
                        <button
                          onClick={() => sortUniqueWords('none')}
                          className={`w-full text-left px-3 py-2 text-xs bg-white hover:bg-black hover:text-white transition-colors ${
                            uniqueWordsSortOrder === 'none' ? 'bg-gray-100 text-black font-medium' : 'text-black'
                          }`}
                        >
                          Default Order
                        </button>
                        <button
                          onClick={() => sortUniqueWords('least')}
                          className={`w-full text-left px-3 py-2 text-xs bg-white hover:bg-black hover:text-white transition-colors ${
                            uniqueWordsSortOrder === 'least' ? 'bg-gray-100 text-black font-medium' : 'text-black'
                          }`}
                        >
                          Least Frequent First
                        </button>
                        <button
                          onClick={() => sortUniqueWords('most')}
                          className={`w-full text-left px-3 py-2 text-xs bg-white hover:bg-black hover:text-white transition-colors ${
                            uniqueWordsSortOrder === 'most' ? 'bg-gray-100 text-black font-medium' : 'text-black'
                          }`}
                        >
                          Most Frequent First
                        </button>
                      </div>
                    )}
                  </div>
                  
                  {noteWords.length > 0 && (
                    <button
                      onClick={clearSelectedWords}
                      className="text-xs bg-white text-black px-2 py-1 rounded hover:bg-black hover:text-white transition-colors border border-gray-300"
                      title="Clear all selections"
                    >
                      Clear ({noteWords.length})
                    </button>
                  )}
                </div>
              </div>
                            <div className="space-y-1">
                <div className="text-black">
                  Unique Words: {uniqueCount}
                </div>
                <div className="text-black">
                  Found: {sortedFilteredWords.length}
                </div>
                {noteWords.length > 0 && (
                  <div className="text-black font-medium">
                    Selected: {noteWords.length}
                  </div>
                )}
              </div>
            </div>
            <div className="flex-1 p-4 overflow-auto">
              {sortedFilteredWords.length > 0 ? (
                <div className="space-y-1">
                  {sortedFilteredWords.map((item, idx) => {
                    const isSelected = noteWords.includes(item.word);
                    
                    return (
                      <div 
                        key={idx}
                        onClick={() => handleWordClick(item.word)}
                        className={`p-2 rounded-md cursor-pointer transition-colors ${
                          isSelected
                            ? 'bg-gray-200 text-black ring-2 ring-gray-400'
                            : 'hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex justify-between items-center w-full">
                          <div className="flex-1 min-w-0">
                            <span className={`font-medium ${isSelected ? 'font-semibold' : ''}`}>
                              {item.word}
                            </span>
                            {showUniqueWordsTranslation && (() => {
                              const cacheKey = `${uniqueWords.map(w => w.word).join('_')}_${targetLanguage}`;
                              const translations = uniqueWordsTranslations[cacheKey] || {};
                              return translations[item.word] ? (
                                <div className="text-xs text-black mt-1 italic">
                                  {translations[item.word]}
                                </div>
                              ) : null;
                            })()}
                          </div>
                          <div className="flex items-center gap-2 ml-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation(); // Prevent word selection
                                speakWord(item.word);
                              }}
                              className="text-black hover:text-black transition-colors"
                              title={`Speak "${item.word}"`}
                            >
                              <ReadTextIcon className="w-3 h-3" />
                            </button>
                            {isSelected && (
                              <span className="text-black text-xs font-bold">✓</span>
                            )}
                            <span className={`text-xs px-2 py-1 rounded-full ${
                              isSelected 
                                ? 'bg-gray-300 text-black' 
                                : 'bg-gray-100 text-black'
                            }`}>
                              {item.count}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8 text-black text-sm">
                  {inputText.trim() ? 'No matching words' : 'Add text to see vocabulary'}
                </div>
              )}
            </div>
            
            {/* Resize handle */}
            <div 
              className="absolute top-0 right-0 w-1 h-full bg-gray-300 hover:bg-black cursor-col-resize opacity-0 hover:opacity-100 transition-opacity"
              onMouseDown={(e) => {
                e.preventDefault();
                const startX = e.clientX;
                const startWidth = columnWidths[1];
                
                const handleMouseMove = (e) => {
                  const deltaX = e.clientX - startX;
                  const container = document.querySelector('.flex');
                  if (!container) return;
                  const containerWidth = container.offsetWidth;
                  const newWidth = startWidth + (deltaX / containerWidth) * 100;
                  handleColumnResize(1, newWidth);
                };
                
                const handleMouseUp = () => {
                  document.removeEventListener('mousemove', handleMouseMove);
                  document.removeEventListener('mouseup', handleMouseUp);
                };
                
                document.addEventListener('mousemove', handleMouseMove);
                document.addEventListener('mouseup', handleMouseUp);
              }}
            />
          </div>

          {/* Column 3: Study Notes */}
          <div 
            className="bg-white rounded-lg shadow-md overflow-hidden flex flex-col relative mr-8"
            style={{width: `${columnWidths[2]}%`}}
          >
            <div className="bg-white border-b border-gray-300 p-4">
              <div className="flex items-center justify-between mb-2">
                <h2 className="font-semibold text-black">Sentences with Unique Words</h2>
                <div className="flex items-center gap-2">
                  {/* Translation button for Study Notes */}
                  {noteWords.length > 0 && (
                    <button
                      onClick={() => {
                        if (showStudyNotesTranslation) {
                          setShowStudyNotesTranslation(false);
                        } else {
                          translateStudyNotes();
                        }
                      }}
                      className="text-black hover:text-black transition-colors flex items-center gap-1"
                      title={showStudyNotesTranslation ? "Hide segment translations" : `Translate segments to ${
                        targetLanguage === 'zh' ? 'Chinese (Simplified)' :
                        targetLanguage === 'zh-tw' ? 'Chinese (Traditional)' :
                        targetLanguage === 'en' ? 'English' :
                        targetLanguage === 'es' ? 'Spanish' :
                        targetLanguage === 'fr' ? 'French' :
                        targetLanguage === 'de' ? 'German' :
                        targetLanguage === 'it' ? 'Italian' :
                        targetLanguage === 'ja' ? 'Japanese' :
                        targetLanguage === 'ko' ? 'Korean' :
                        targetLanguage === 'pt' ? 'Portuguese' :
                        targetLanguage === 'ru' ? 'Russian' :
                        targetLanguage === 'ar' ? 'Arabic' : targetLanguage.toUpperCase()
                      }`}
                      disabled={false}
                    >
                      {isTranslatingStudyNotes ? <ProcessingIcon className="w-3 h-3 animate-spin" /> : <TranslateIcon className="w-3 h-3" />}
                      {isTranslatingStudyNotes ? (
                        <span className="text-xs">Translating...</span>
                      ) : showStudyNotesTranslation ? (
                        <span className="text-xs">Hide</span>
                      ) : null}
                    </button>
                  )}
                  
                  {noteWords.length > 0 && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => setShowParagraphs(false)}
                        className={`text-xs px-3 py-1 rounded transition-colors border border-gray-300 ${
                          !showParagraphs 
                            ? 'bg-black text-white font-medium' 
                            : 'bg-white text-black hover:bg-black hover:text-white'
                        }`}
                      >
                        Sentences
                      </button>
                      <button
                        onClick={() => setShowParagraphs(true)}
                        className={`text-xs px-3 py-1 rounded transition-colors border border-gray-300 ${
                          showParagraphs 
                            ? 'bg-black text-white font-medium' 
                            : 'bg-white text-black hover:bg-black hover:text-white'
                        }`}
                      >
                        Paragraphs
                      </button>
                    </div>
                  )}
                </div>
              </div>
              {noteWords.length > 0 && (
                <div className="space-y-1">
                  <div className="text-black font-medium">
                    Studying: {noteWords.map((word, index) => (
                      <span key={word} className="inline-block">
                        "{word}"{index < noteWords.length - 1 ? ', ' : ''}
                      </span>
                    ))}
                  </div>
                  <div className="text-black">
                    Showing {showParagraphs ? 'paragraphs' : 'sentences'} containing selected words
                  </div>
                </div>
              )}
            </div>
            <div className="flex-1 p-4 overflow-auto">
              {noteWords.length > 0 ? (
                <div className="space-y-3">
                  {getTextSegments().length > 0 ? (
                    getTextSegments().map((segment, i) => (
                      <div key={i} className="border border-gray-300 rounded-lg p-3 hover:bg-gray-50 transition-colors">
                        <div className="flex justify-between items-start mb-2">
                          <span className="text-xs text-black font-medium">
                            {showParagraphs ? `Paragraph ${i + 1}` : `Sentence ${i + 1}`}
                          </span>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => removeSegment(i)}
                              className="text-black hover:text-red-600 transition-colors flex items-center gap-1"
                              title={`Remove ${showParagraphs ? 'paragraph' : 'sentence'}`}
                            >
                              <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M6,19c0,1.1,0.9,2,2,2h8c1.1,0,2-0.9,2-2V7H6V19z M19,4h-3.5l-1-1h-5l-1,1H5v2h14V4z"/>
                              </svg>
                              <span className="text-xs">Remove</span>
                            </button>
                            <button
                            onClick={() => {
                              console.log('📚 Study Notes button clicked for segment:', i);
                              console.log('📚 Current states:', {
                                isStudyNotesSpeaking,
                                studyNotesWasPaused,
                                currentSegmentIndex: studyNotesSpeechPosition.segmentIndex
                              });
                              
                              if (studyNotesWasPaused && studyNotesSpeechPosition.segmentIndex === i) {
                                // Resume this specific segment
                                console.log('▶️ RESUME: Study Notes segment', i);
                                resumeStudyNotesSpeech();
                              } else if (isStudyNotesSpeaking && studyNotesSpeechPosition.segmentIndex === i) {
                                // Pause this segment
                                const currentChunk = currentStudyNotesChunkRef.current;
                                const elapsedTime = Date.now() - speechStartTime;
                                
                                console.log('⏸️ PAUSE: Study Notes segment', i, 'at chunk:', currentChunk);
                                console.log('⏸️ Elapsed time:', elapsedTime, 'ms');
                                console.log('⏸️ Current paused chunks length:', pausedStudyNotesChunks.length);
                                console.log('⏸️ Current paused options:', pausedStudyNotesOptions);
                                
                                // Estimate word position based on elapsed time and speech rate
                                const currentChunkText = pausedStudyNotesChunks[currentChunk] || '';
                                const wordsInChunk = currentChunkText.split(/\s+/).length;
                                const speechRate = pausedStudyNotesOptions.rate || speechSpeed;
                                const averageWordsPerMinute = 180 * speechRate; // Average speaking rate adjusted by speed
                                const estimatedWordsSpoken = Math.floor((elapsedTime / 1000 / 60) * averageWordsPerMinute);
                                const wordIndex = Math.min(estimatedWordsSpoken, wordsInChunk - 1);
                                
                                console.log('⏸️ Estimated words spoken:', estimatedWordsSpoken, 'out of', wordsInChunk);
                                console.log('⏸️ Word index:', wordIndex);
                                
                                // Store elapsed time for potential resume calculation
                                setSpeechElapsedTime(elapsedTime);
                                
                                // Update position to current chunk and estimated word position
                                setStudyNotesSpeechPosition({ 
                                  chunkIndex: currentChunk, 
                                  segmentIndex: i, 
                                  wordIndex: wordIndex 
                                });
                                
                                // Set flags to indicate we're pausing intentionally
                                isPausingStudyNotesRef.current = true;
                                setStudyNotesWasPaused(true);
                                
                                // Cancel speech
                                speechSynthesis.cancel();
                                
                                console.log('⏸️ Study Notes paused at chunk:', currentChunk, 'word:', wordIndex);
                                console.log('⏸️ Paused state set, chunks available:', pausedStudyNotesChunks.length);
                              } else {
                                // Start speaking this segment (stop any other segment first)
                                if (isStudyNotesSpeaking) {
                                  speechSynthesis.cancel();
                                  setIsStudyNotesSpeaking(false);
                                }
                                
                                // Clear any previous paused state when starting fresh
                                console.log('🔊 START: Study Notes segment', i, '- clearing previous states');
                                setStudyNotesWasPaused(false);
                                setPausedStudyNotesChunks([]);
                                setPausedStudyNotesOptions({});
                                setStudyNotesSpeechPosition({ chunkIndex: 0, segmentIndex: i, wordIndex: 0 });
                                setCurrentStudyNotesSegment('');
                                setSpeechStartTime(0);
                                setSpeechElapsedTime(0);
                                isPausingStudyNotesRef.current = false;
                                currentStudyNotesChunkRef.current = 0;
                                
                                speakStudyNotesSegment(segment, i);
                              }
                            }}
                            className="text-black hover:text-black transition-colors flex items-center gap-1"
                            title={
                              studyNotesWasPaused && studyNotesSpeechPosition.segmentIndex === i
                                ? `Resume ${showParagraphs ? 'paragraph' : 'sentence'} from where it was paused`
                                : isStudyNotesSpeaking && studyNotesSpeechPosition.segmentIndex === i
                                ? `Pause ${showParagraphs ? 'paragraph' : 'sentence'} (can resume later)`
                                : `Play ${showParagraphs ? 'paragraph' : 'sentence'} (slightly slower)`
                            }
                          >
                            <span className="text-xs">
                              {studyNotesWasPaused && studyNotesSpeechPosition.segmentIndex === i
                                ? <PlayIcon className="w-3 h-3" />
                                : isStudyNotesSpeaking && studyNotesSpeechPosition.segmentIndex === i
                                ? <PauseIcon className="w-3 h-3" />
                                : <ReadTextIcon className="w-3 h-3" />
                              }
                            </span>
                            <span className="text-xs">
                              {studyNotesWasPaused && studyNotesSpeechPosition.segmentIndex === i
                                ? 'Resume'
                                : isStudyNotesSpeaking && studyNotesSpeechPosition.segmentIndex === i
                                ? 'Pause'
                                : 'Play'
                              }
                            </span>
                          </button>
                          </div>
                        </div>
                        <div 
                          className={`text-sm leading-relaxed ${showParagraphs ? 'whitespace-pre-wrap' : ''}`}
                        >
                          {highlightWordsInSegment(segment)}
                        </div>
                        {showStudyNotesTranslation && (() => {
                          const segments = getTextSegments();
                          const cacheKey = `${segments.join('_')}_${targetLanguage}`;
                          const translations = studyNotesTranslations[cacheKey] || {};
                          return translations[i] ? (
                            <div className="mt-2 p-2 bg-gray-50 border-l-4 border-gray-300 rounded-r-md">
                              <div className="text-sm text-black font-medium">
                                {translations[i]}
                              </div>
                            </div>
                          ) : null;
                        })()}
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-black">
                      <div className="mb-2"><SearchIcon className="w-6 h-6 mx-auto text-black" /></div>
                      <p className="text-sm">
                        No {showParagraphs ? 'paragraphs' : 'sentences'} found containing the selected word{noteWords.length > 1 ? 's' : ''}
                      </p>
                      <p className="text-xs text-black mt-1">
                        Try selecting different words or switching to {showParagraphs ? 'sentences' : 'paragraphs'} view
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-12 text-black">
                  <div className="mb-2"><BookIcon className="w-6 h-6 mx-auto text-black" /></div>
                  <p className="text-sm">Click words in the vocabulary list to study them in context</p>
                  <p className="text-xs text-black mt-2">
                    • Click multiple words to study them together<br/>
                    • Toggle between sentences and paragraphs view<br/>
                    • Search words and click "Edit Here" to make changes
                  </p>
                </div>
              )}
            </div>
            
            {/* Right edge resize handle */}
            <div 
              className="absolute top-0 right-0 w-1 h-full bg-gray-300 hover:bg-black cursor-col-resize opacity-0 hover:opacity-100 transition-opacity z-10"
              onMouseDown={(e) => {
                e.preventDefault();
                const startX = e.clientX;
                const startWidth = columnWidths[2];
                
                const handleMouseMove = (e) => {
                  const deltaX = e.clientX - startX;
                  const container = document.querySelector('.flex');
                  if (!container) return;
                  const containerWidth = container.offsetWidth;
                  const pixelDelta = deltaX;
                  
                  // For right edge, allow expansion beyond current boundaries
                  const newWidthPercent = startWidth + (pixelDelta / containerWidth) * 100;
                  const newWidths = [...columnWidths];
                  
                  // Allow the last column to expand beyond normal limits
                  newWidths[2] = Math.max(20, Math.min(80, newWidthPercent));
                  
                  // If we're expanding beyond normal container, adjust the layout
                  if (newWidths[2] > 60) {
                    // Expand the container and allow overflow
                    const totalExpandedWidth = columnWidths[0] + columnWidths[1] + newWidths[2];
                    if (totalExpandedWidth > 100) {
                      container.style.minWidth = `${totalExpandedWidth}%`;
                    }
                  } else {
                    // Normal behavior within container
                    const difference = newWidths[2] - columnWidths[2];
                    newWidths[1] = Math.max(10, columnWidths[1] - difference);
                    container.style.minWidth = '100%';
                  }
                  
                  setColumnWidths(newWidths);
                };
                
                const handleMouseUp = () => {
                  document.removeEventListener('mousemove', handleMouseMove);
                  document.removeEventListener('mouseup', handleMouseUp);
                  // Ensure proper cleanup of container styles
                  const container = document.querySelector('.flex');
                  if (container) {
                    const totalWidth = columnWidths[0] + columnWidths[1] + columnWidths[2];
                    if (totalWidth <= 100) {
                      container.style.minWidth = '100%';
                    }
                  }
                };
                
                document.addEventListener('mousemove', handleMouseMove);
                document.addEventListener('mouseup', handleMouseUp);
              }}
            />
          </div>
        </div>

        {/* Bottom actions aligned with columns */}
        <div className="flex mt-4 gap-4">
          <div style={{width: `${columnWidths[0]}%`}} />
          <div style={{width: `${columnWidths[1]}%`}} className="text-center">
            <button
              onClick={openLearnAllUniqueWords}
              className="px-3 py-2 text-sm bg-white text-black hover:bg-black hover:text-white rounded-md transition-colors border border-gray-300"
              title="Learn Unique Words"
              disabled={false}
            >
              Learn Unique Words
            </button>
          </div>
          <div style={{width: `${columnWidths[2]}%`}} className="text-center mr-8">
            <button
              onClick={openLearnSentencesWithUniqueWords}
              className="px-3 py-2 text-sm bg-white text-black hover:bg-black hover:text-white rounded-md transition-colors border border-gray-300"
              title="Learn Sentences with Unique Words"
              disabled={false}
            >
              Learn Sentences with Unique Words
            </button>
          </div>
        </div>
      </div>


      {/* Usage Limit Modal */}
      <UsageLimitModal
        isOpen={showUsageLimitModal}
        onWatchAd={handleWatchAdFromLimit}
        onClose={handleUsageLimitClose}
        timeUntilReset={300000} // 5 minutes
      />


    </div>
  );
} 