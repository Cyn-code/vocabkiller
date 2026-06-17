const FRIENDS_ROLEPLAY_SESSION_KEY = 'friendsRoleplaySession';
const MAX_ROLEPLAY_CONTEXT_LINES = 5;
const FRIENDS_ROLEPLAY_DISPLAY_SIZE_KEY = 'friendsRoleplayDisplaySizePercent';
const FRIENDS_ROLEPLAY_DISPLAY_BASE_WIDTH = 800;
const FRIENDS_ROLEPLAY_DISPLAY_BASE_HEIGHT = 280;

function escapeRoleplayHtml(value) {
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function normalizeApostrophes(value) {
    return String(value ?? '').replace(/[\u2018\u2019\u02bc\u02bb\uff07]/g, "'");
}

function isApostrophe(value) {
    return normalizeApostrophes(value) === "'";
}

function renderContextText(line) {
    if (!line) {
        return '';
    }

    if (line.type === 'dialogue') {
        return `<span class="roleplay-line__speaker">${escapeRoleplayHtml(line.speakerLabel)}:</span> ${escapeRoleplayHtml(normalizeApostrophes(line.text))}`;
    }

    return escapeRoleplayHtml(normalizeApostrophes(line.text));
}

function splitTokenPunctuation(token) {
    const splitPunctuation = (value) => {
        const leadingMatch = value.match(/^([“"([{<\-–—.,!?;:…]+)(.*)$/);
        const prefixPunctuation = leadingMatch ? leadingMatch[1] : '';
        const withoutPrefix = leadingMatch ? leadingMatch[2] : value;
        const trailingMatch = withoutPrefix.match(/^(.*?)([”")\]}>.,!?;:…\-–—]+)$/);
        return {
            prefixPunctuation,
            baseWord: trailingMatch ? trailingMatch[1] : withoutPrefix,
            suffixPunctuation: trailingMatch ? trailingMatch[2] : ''
        };
    };

    const outerParts = splitPunctuation(token);
    const unquotedBaseWord = outerParts.baseWord;
    const pairedSingleQuote = unquotedBaseWord.length > 2 &&
        isApostrophe(unquotedBaseWord[0]) &&
        isApostrophe(unquotedBaseWord[unquotedBaseWord.length - 1]);
    const innerParts = splitPunctuation(
        pairedSingleQuote ? unquotedBaseWord.slice(1, -1) : unquotedBaseWord
    );
    const baseWord = innerParts.baseWord;
    const pairedPrefix = pairedSingleQuote ? "'" : '';
    const pairedSuffix = pairedSingleQuote ? "'" : '';

    if (!baseWord) {
        return {
            prefixPunctuation: '',
            baseWord: token,
            suffixPunctuation: ''
        };
    }

    return {
        prefixPunctuation: `${outerParts.prefixPunctuation}${pairedPrefix}${innerParts.prefixPunctuation}`,
        baseWord,
        suffixPunctuation: `${innerParts.suffixPunctuation}${pairedSuffix}${outerParts.suffixPunctuation}`
    };
}

function isPurePunctuationToken(token) {
    return /^[\p{P}\p{S}]+$/u.test(token);
}

function sanitizePracticeText(text) {
    if (!text) {
        return '';
    }

    return normalizeApostrophes(text)
        .replace(/\s*(\([^)]*\)|\[[^\]]*\])\s*/g, ' ')
        .replace(/(\p{L})[-–—]+(?=\s|$)/gu, '$1')
        .replace(/\s+([.,!?;:…])/g, '$1')
        .replace(/\s{2,}/g, ' ')
        .trim();
}

function truncateRoleplayText(text, maxLength = 96) {
    const normalized = String(text ?? '').replace(/\s+/g, ' ').trim();
    if (normalized.length <= maxLength) {
        return normalized;
    }

    return `${normalized.slice(0, maxLength - 1).trimEnd()}…`;
}

function collectPromptContextLines(lines, lineIndex, direction, limit = MAX_ROLEPLAY_CONTEXT_LINES) {
    const sourceLines = Array.isArray(lines) ? lines : [];
    const contextLines = [];

    if (direction === 'before') {
        for (let index = lineIndex - 1; index >= 0 && contextLines.length < limit; index -= 1) {
            const line = sourceLines[index];
            if (!line || line.type === 'scene') {
                continue;
            }
            contextLines.push(line);
        }

        return contextLines.reverse();
    }

    for (let index = lineIndex + 1; index < sourceLines.length && contextLines.length < limit; index += 1) {
        const line = sourceLines[index];
        if (!line || line.type === 'scene') {
            continue;
        }
        contextLines.push(line);
    }

    return contextLines;
}

function findNearestSceneText(lines, startIndex) {
    const sourceLines = Array.isArray(lines) ? lines : [];
    for (let index = startIndex; index >= 0; index -= 1) {
        const line = sourceLines[index];
        if (line && line.type === 'scene') {
            return line.text;
        }
    }

    return '';
}

class FriendsRoleplayPractice {
    constructor() {
        this.session = null;
        this.prompts = [];
        this.currentSentenceIndex = 0;
        this.activeWordIndex = 0;
        this.currentCharIndex = 0;
        this.keyboardActiveWordIndex = 0;
        this.keyboardCharIndex = 0;
        this.awaitingEnterToAdvance = false;
        this.emptyKeyboardSlot = '\u0000';
        this.keyboardTypedWords = [];
        this.pencilTypedWords = [];
        this.pencilDraft = '';
        this.pencilChunkDraft = '';
        this.pencilChunkAcceptTimer = null;
        this.pencilChunkHistory = [];
        this.pencilAcceptedChunks = [];
        this.typedWords = [];
        this.isGameActive = false;
        this.wordByWordEnabled = false;
        this.fullSentenceEnabled = false;
        this.enableTypingSound = true;
        this.soundType = 1;
        this.soundVolume = 50;
        this.autoPronounceBefore = true;
        this.autoPronounceAfter = true;
        this.dictationRevealMode = 'off';
        this.contextLinesAbove = 1;
        this.contextLinesBelow = 1;
        this.translationLanguage = 'zh';
        this.speechSpeed = 1.0;
        this.currentFont = 'system-ui';
        this.uiFontSize = 16;
        this.sentenceFontSize = 24;
        this.typingFontSize = 24;
        this.displaySizePercent = 100;
        this.selectedVoice = null;
        this.availableVoices = [];
        this.isPronouncing = false;
        this.inputCompletionTimer = null;
        this.lastTypingInputValue = '';
        this.answerInputMode = localStorage.getItem('vocabKillerAnswerInputMode') === 'pencil'
            ? 'pencil'
            : 'keyboard';
        this.inputModeAttentionTimer = null;
        this.pencilInputController = null;
        this.soundManager = typeof SoundManager !== 'undefined' ? new SoundManager() : null;
        this.translationService = typeof UnifiedTranslationService !== 'undefined'
            ? (window.unifiedTranslationService || new UnifiedTranslationService())
            : null;
        this.wordTranslationCache = new Map();
        this.sentenceTranslationCache = new Map();
    }

    async initialize() {
        this.loadSession();
        await this.enrichPromptContext();
        this.loadSettings();
        this.initializeSpeechSynthesis();
        this.setupEventListeners();
        this.updateHeaderMeta();
        this.updateUI();
        this.startGame();
    }

    loadSession() {
        try {
            const rawSession = sessionStorage.getItem(FRIENDS_ROLEPLAY_SESSION_KEY);
            if (!rawSession) {
                this.showMessage('No role-play session found. Go back to the episode page and launch role-play mode again.');
                return;
            }

            this.session = JSON.parse(rawSession);
            this.prompts = Array.isArray(this.session.prompts)
                ? this.session.prompts
                    .map((prompt) => ({
                        ...prompt,
                        targetText: sanitizePracticeText(prompt.targetText),
                        contextBefore: Array.isArray(prompt.contextBefore)
                            ? prompt.contextBefore
                            : (prompt.previousLine ? [prompt.previousLine] : []),
                        contextAfter: Array.isArray(prompt.contextAfter)
                            ? prompt.contextAfter
                            : (prompt.nextLine ? [prompt.nextLine] : [])
                    }))
                    .filter((prompt) => prompt.targetText)
                : [];
        } catch (error) {
            console.error('Failed to load role-play session:', error);
            this.showMessage('Unable to load the role-play session.');
        }
    }

    async enrichPromptContext() {
        if (!this.session || !this.session.episodeId || !Array.isArray(this.prompts) || this.prompts.length === 0) {
            return;
        }

        try {
            const response = await fetch(`/data/friends/episodes/${encodeURIComponent(this.session.episodeId)}.json`);
            if (!response.ok) {
                throw new Error(`Failed to load episode context (${response.status})`);
            }

            const episode = await response.json();
            const lines = Array.isArray(episode.lines) ? episode.lines : [];

            this.prompts = this.prompts.map((prompt) => {
                if (!Number.isInteger(prompt.lineIndex)) {
                    return prompt;
                }

                return {
                    ...prompt,
                    sceneText: normalizeApostrophes(prompt.sceneText || findNearestSceneText(lines, prompt.lineIndex)),
                    contextBefore: collectPromptContextLines(lines, prompt.lineIndex, 'before'),
                    contextAfter: collectPromptContextLines(lines, prompt.lineIndex, 'after')
                };
            });
        } catch (error) {
            console.warn('Role-play context enrichment failed:', error);
        }
    }

    loadSettings() {
        const savedFont = localStorage.getItem('selectedFont');
        this.currentFont = !savedFont || savedFont === 'system-ui'
            ? 'Georgia, serif'
            : savedFont;
        this.uiFontSize = parseInt(localStorage.getItem('uiFontSize'), 10) || 16;
        this.sentenceFontSize = parseInt(localStorage.getItem('sentenceFontSize'), 10) || 24;
        this.typingFontSize = parseInt(localStorage.getItem('typingFontSize'), 10) || 24;
        this.displaySizePercent = this.normalizeDisplaySizePercent(
            localStorage.getItem(FRIENDS_ROLEPLAY_DISPLAY_SIZE_KEY)
        );
        this.translationLanguage = localStorage.getItem('translationLanguage') || 'zh';
        this.wordByWordEnabled = localStorage.getItem('wordByWordEnabled') === 'true';
        this.fullSentenceEnabled = localStorage.getItem('fullSentenceEnabled') === 'true';
        this.enableTypingSound = localStorage.getItem('enableTypingSound') !== 'false';
        this.soundType = parseInt(localStorage.getItem('soundType'), 10) || 1;
        this.soundVolume = parseInt(localStorage.getItem('soundVolume'), 10) || 50;
        this.autoPronounceBefore = localStorage.getItem('autoPronounceBefore') !== 'false';
        this.autoPronounceAfter = localStorage.getItem('autoPronounceAfter') !== 'false';
        const savedRevealMode = localStorage.getItem('dictationRevealMode');
        if (savedRevealMode === 'line' || savedRevealMode === 'word' || savedRevealMode === 'off') {
            this.dictationRevealMode = savedRevealMode;
        } else {
            this.dictationRevealMode = localStorage.getItem('dictationMode') === 'true' ? 'line' : 'off';
        }
        const savedContextLinesAbove = parseInt(localStorage.getItem('friendsRoleplayContextLinesAbove'), 10);
        const savedContextLinesBelow = parseInt(localStorage.getItem('friendsRoleplayContextLinesBelow'), 10);
        this.contextLinesAbove = Number.isInteger(savedContextLinesAbove)
            ? Math.max(0, Math.min(MAX_ROLEPLAY_CONTEXT_LINES, savedContextLinesAbove))
            : 1;
        this.contextLinesBelow = Number.isInteger(savedContextLinesBelow)
            ? Math.max(0, Math.min(MAX_ROLEPLAY_CONTEXT_LINES, savedContextLinesBelow))
            : 1;
        this.speechSpeed = parseFloat(localStorage.getItem('vocabKillerSpeechSpeed')) || 1.0;
    }

    normalizeDisplaySizePercent(value) {
        const parsed = parseInt(value, 10);
        if (!Number.isFinite(parsed)) return 100;
        const roundedToPreset = Math.round(parsed / 10) * 10;
        return Math.max(10, Math.min(100, roundedToPreset));
    }

    getDisplayScale() {
        return this.displaySizePercent / 100;
    }

    getScaledTypingFontSize() {
        return Math.max(1, Math.round(this.typingFontSize * this.getDisplayScale()));
    }

    applyDisplaySize() {
        const scale = this.getDisplayScale();
        const sentenceDisplayArea = document.getElementById('sentenceDisplayArea');
        const sentenceText = document.getElementById('currentSentence');
        const displaySizeButton = document.getElementById('displaySizeBtn');
        const displaySizeMenu = document.getElementById('displaySizeMenu');

        if (sentenceDisplayArea) {
            sentenceDisplayArea.style.setProperty(
                '--friends-roleplay-display-width',
                `${Math.round(FRIENDS_ROLEPLAY_DISPLAY_BASE_WIDTH * scale)}px`
            );
            sentenceDisplayArea.style.minHeight =
                `${Math.round(FRIENDS_ROLEPLAY_DISPLAY_BASE_HEIGHT * scale)}px`;
        }

        if (sentenceText) {
            sentenceText.style.fontSize = `${this.getScaledTypingFontSize()}px`;
        }

        if (displaySizeButton) {
            displaySizeButton.textContent = `Display ${this.displaySizePercent}%`;
        }

        displaySizeMenu?.querySelectorAll('[data-display-size]').forEach((option) => {
            const isActive = parseInt(option.getAttribute('data-display-size'), 10) === this.displaySizePercent;
            option.classList.toggle('active', isActive);
            option.setAttribute('aria-checked', String(isActive));
        });
    }

    updateDisplaySizePercent(value) {
        this.displaySizePercent = this.normalizeDisplaySizePercent(value);
        localStorage.setItem(FRIENDS_ROLEPLAY_DISPLAY_SIZE_KEY, String(this.displaySizePercent));
        this.applyDisplaySize();
        this.hideDisplaySizeMenu();
    }

    toggleDisplaySizeMenu() {
        const menu = document.getElementById('displaySizeMenu');
        const button = document.getElementById('displaySizeBtn');
        if (!menu || !button) return;

        const isOpen = !menu.classList.contains('show');
        menu.classList.toggle('show', isOpen);
        button.setAttribute('aria-expanded', String(isOpen));
    }

    hideDisplaySizeMenu() {
        const menu = document.getElementById('displaySizeMenu');
        const button = document.getElementById('displaySizeBtn');
        menu?.classList.remove('show');
        button?.setAttribute('aria-expanded', 'false');
    }

    initializeSpeechSynthesis() {
        if (!('speechSynthesis' in window)) {
            return;
        }

        const loadVoices = () => {
            this.availableVoices = speechSynthesis.getVoices();
            this.populateVoiceSelect();
        };

        if (speechSynthesis.getVoices().length > 0) {
            loadVoices();
        }

        speechSynthesis.onvoiceschanged = loadVoices;
    }

    setupEventListeners() {
        const sentenceDisplayArea = document.getElementById('sentenceDisplayArea');
        if (sentenceDisplayArea) {
            sentenceDisplayArea.addEventListener('keydown', (event) => this.handleKeyDown(event));
            sentenceDisplayArea.addEventListener('click', (event) => this.handleSentenceDisplayClick(event));
        }

        const typingInput = document.getElementById('typingInput');
        const keyboardCaptureInput = document.getElementById('keyboardCaptureInput');
        const typingInputArea = document.querySelector('.typing-input-area');
        const keyboardModeButton = document.getElementById('keyboardInputModeBtn');
        const pencilModeButton = document.getElementById('pencilInputModeBtn');
        const pencilBackspaceButton = document.getElementById('pencilBackspaceBtn');
        const pencilClearButton = document.getElementById('pencilClearBtn');
        const displaySizeButton = document.getElementById('displaySizeBtn');
        const displaySizeMenu = document.getElementById('displaySizeMenu');
        if (typingInput) {
            this.pencilInputController = window.PencilInputController?.attach(typingInput, {
                isEnabled: () => this.answerInputMode === 'pencil',
                onChange: (value) => this.handleTypingInput(value, 'pencil'),
                onAttention: () => this.pulseActiveInputMode(),
                editModeButton: document.getElementById('pencilEditModeBtn'),
                undoButton: document.getElementById('pencilUndoBtn'),
                statusElement: document.getElementById('inputModeStatus'),
                lockAppendCaretToEnd: true,
                onModeChange: (isEditMode) => this.handlePencilEditModeChange(isEditMode),
                getStatusText: (isEditMode) => this.getPencilStatusText(isEditMode),
                canUndo: (isEditMode, nativeHistoryLength) => isEditMode
                    ? nativeHistoryLength > 0
                    : this.pencilChunkHistory.length > 0,
                onUndo: (isEditMode) => !isEditMode && this.undoPencilChunk()
            });
            this.setupPencilScratchDelete(typingInput);
        }

        if (keyboardCaptureInput) {
            keyboardCaptureInput.addEventListener('beforeinput', (event) => this.handleKeyboardBeforeInput(event));
            keyboardCaptureInput.addEventListener('input', () => {
                if (keyboardCaptureInput.value) {
                    this.insertKeyboardText(keyboardCaptureInput.value);
                    keyboardCaptureInput.value = '';
                }
            });
        }

        if (typingInputArea) {
            typingInputArea.addEventListener('click', (event) => {
                if (event.target.closest('button, textarea')) return;
                if (this.answerInputMode === 'pencil') {
                    this.focusPencilInput();
                } else {
                    this.pulseActiveInputMode();
                }
            });
        }
        keyboardModeButton?.addEventListener('click', () => this.setAnswerInputMode('keyboard'));
        pencilModeButton?.addEventListener('click', () => this.setAnswerInputMode('pencil'));
        displaySizeButton?.addEventListener('click', (event) => {
            event.stopPropagation();
            this.toggleDisplaySizeMenu();
        });
        displaySizeMenu?.addEventListener('click', (event) => {
            const option = event.target instanceof Element
                ? event.target.closest('[data-display-size]')
                : null;
            if (!option) return;

            event.stopPropagation();
            this.updateDisplaySizePercent(option.getAttribute('data-display-size'));
        });
        pencilBackspaceButton?.addEventListener('pointerdown', (event) => {
            event.preventDefault();
            this.handlePencilBackspace();
        });
        pencilBackspaceButton?.addEventListener('click', (event) => event.preventDefault());
        pencilClearButton?.addEventListener('click', () => this.handlePencilClear());

        const enableTypingSoundCheckbox = document.getElementById('enableTypingSound');
        const soundTypeSelect = document.getElementById('soundType');
        const soundVolumeSlider = document.getElementById('soundVolume');
        const closePopupBtn = document.getElementById('closePopupBtn');
        const playAgainBtn = document.getElementById('playAgainBtn');

        if (enableTypingSoundCheckbox) {
            enableTypingSoundCheckbox.addEventListener('change', (event) => {
                this.enableTypingSound = event.target.checked;
                localStorage.setItem('enableTypingSound', this.enableTypingSound);
            });
        }

        if (soundTypeSelect) {
            soundTypeSelect.addEventListener('change', (event) => {
                this.soundType = parseInt(event.target.value, 10);
                localStorage.setItem('soundType', this.soundType);
            });
        }

        if (soundVolumeSlider) {
            soundVolumeSlider.addEventListener('input', (event) => {
                this.soundVolume = parseInt(event.target.value, 10);
                localStorage.setItem('soundVolume', this.soundVolume);
                const volumeLabel = document.getElementById('volumeLabel');
                if (volumeLabel) {
                    volumeLabel.textContent = `${this.soundVolume}%`;
                }
                event.target.style.setProperty('--value', `${this.soundVolume}%`);
            });
        }

        if (closePopupBtn) {
            closePopupBtn.addEventListener('click', () => this.hideCompletionPopup());
        }

        if (playAgainBtn) {
            playAgainBtn.addEventListener('click', () => this.restartPractice());
        }

        document.addEventListener('click', (event) => {
            if (!event.target.closest('.translation-mode-dropdown')) {
                this.hideTranslationModeDropdown();
            }
            if (!event.target.closest('.progress-jump-container')) {
                this.hideLineJumpMenu();
            }
            if (!event.target.closest('.context-container')) {
                this.hideContextMenu();
            }
            if (!event.target.closest('.sound-container')) {
                this.hideSoundDropdown();
            }
            if (!event.target.closest('.autopronounce-container')) {
                this.hideAutoPronounceDropdown();
            }
            if (!event.target.closest('.dictation-container')) {
                this.hideDictationMenu();
            }
            if (!event.target.closest('.preference-dropdown')) {
                this.hidePreferenceDropdown();
            }
            if (!event.target.closest('.roleplay-display-size-control')) {
                this.hideDisplaySizeMenu();
            }
        });

        document.addEventListener('keydown', (event) => {
            if (event.key === 'Enter') {
                const popup = document.getElementById('completionPopup');
                if (popup && popup.classList.contains('show')) {
                    this.restartPractice();
                    return;
                }
            }

            if (this.answerInputMode === 'pencil' && this.shouldBlockPencilKeyboard(event)) {
                event.preventDefault();
                this.pulseActiveInputMode();
                return;
            }

            if (this.shouldCaptureGlobalTyping(event)) {
                this.focusSentenceArea();
                this.handleKeyDown(event);
            }
        });
    }

    shouldCaptureGlobalTyping(event) {
        if (this.answerInputMode !== 'keyboard' ||
            !this.isGameActive ||
            this.currentSentenceIndex >= this.prompts.length) {
            return false;
        }

        if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey) {
            return false;
        }

        const target = event.target;
        if (target instanceof Element) {
            if (target.closest('#sentenceDisplayArea')) {
                return false;
            }

            if (target.closest('input, textarea, select, option, [contenteditable=""], [contenteditable="true"], [contenteditable="plaintext-only"]')) {
                return false;
            }
        }

        return event.key === 'Backspace' || event.key.length === 1;
    }

    isAnswerEditingKey(event) {
        return event.key.length === 1 ||
            ['Backspace', 'Delete', 'Enter', 'Tab', 'ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key);
    }

    shouldBlockPencilKeyboard(event) {
        if (event.defaultPrevented || event.isComposing || !this.isAnswerEditingKey(event)) {
            return false;
        }

        const target = event.target;
        if (!(target instanceof Element)) return true;
        if ((event.metaKey || event.ctrlKey || event.altKey) && !target.closest('#typingInput')) {
            return false;
        }
        if (target.closest('#typingInput')) return false;
        if (target.closest('button, a, select, option')) return false;
        if (target.closest('input:not(#typingInput), textarea:not(#typingInput), [contenteditable=""], [contenteditable="true"], [contenteditable="plaintext-only"]')) {
            return false;
        }

        return true;
    }

    updateHeaderMeta() {
        const episodeMeta = document.getElementById('roleplayEpisodeMeta');
        const selectionMeta = document.getElementById('roleplaySelectionMeta');

        if (!episodeMeta || !selectionMeta || !this.session) {
            return;
        }

        episodeMeta.textContent = `${this.session.episodeCode} • ${this.session.episodeTitle}`;
        selectionMeta.textContent = `Selected characters: ${this.session.selectedCharacterLabels.join(', ')}`;
    }

    startGame() {
        if (!Array.isArray(this.prompts) || this.prompts.length === 0) {
            this.showMessage('No filtered dialogue lines were provided for role-play typing.');
            return;
        }

        this.isGameActive = true;
        this.currentSentenceIndex = 0;
        this.activeWordIndex = 0;
        this.currentCharIndex = 0;
        this.keyboardActiveWordIndex = 0;
        this.keyboardCharIndex = 0;
        this.awaitingEnterToAdvance = false;
        this.resetAnswerDrafts();
        this.clearTypingInput();
        const firstPrompt = this.prompts[0];
        if (firstPrompt) {
            const words = this.parseSentenceIntoWords(firstPrompt.targetText);
            const firstWordIndex = this.findNextIncompleteWord(words, 0);
            if (firstWordIndex !== -1) {
                this.setActiveWord(firstWordIndex, words);
            }
        }

        this.updateProgress();
        this.updateNavigationButtons();
        this.displayCurrentSentence();
        this.applyAnswerInputMode(true);

        if (this.autoPronounceBefore) {
            setTimeout(() => this.speakCurrentSentence(), 250);
        }
    }

    getCurrentDisplayIndex() {
        if (this.prompts.length === 0) {
            return 0;
        }

        return Math.min(this.currentSentenceIndex + 1, this.prompts.length);
    }

    renderLineJumpMenu() {
        const menu = document.getElementById('lineJumpMenu');
        if (!menu) {
            return;
        }

        if (!Array.isArray(this.prompts) || this.prompts.length === 0) {
            menu.innerHTML = '<div class="line-jump-empty">No lines available.</div>';
            return;
        }

        menu.innerHTML = this.prompts
            .map((prompt, index) => `
                <button
                    type="button"
                    class="line-jump-option ${index === this.currentSentenceIndex ? 'is-active' : ''}"
                    onclick="roleplayPractice.jumpToSentence(${index}, event)"
                >
                    <span class="line-jump-option__index">${index + 1}</span>
                    <span class="line-jump-option__content">
                        <span class="line-jump-option__speaker">${escapeRoleplayHtml(prompt.speakerLabel)}</span>
                        <span class="line-jump-option__text">${escapeRoleplayHtml(truncateRoleplayText(prompt.targetText))}</span>
                    </span>
                </button>
            `)
            .join('');
    }

    toggleLineJumpMenu() {
        const button = document.getElementById('progressText');
        const menu = document.getElementById('lineJumpMenu');
        if (!button || !menu) {
            return;
        }

        const shouldShow = !menu.classList.contains('show');
        menu.classList.toggle('show', shouldShow);
        button.classList.toggle('is-open', shouldShow);
        button.setAttribute('aria-expanded', String(shouldShow));

        if (shouldShow) {
            this.renderLineJumpMenu();
            const activeOption = menu.querySelector('.line-jump-option.is-active');
            if (activeOption) {
                activeOption.scrollIntoView({ block: 'nearest' });
            }
        }
    }

    hideLineJumpMenu() {
        const button = document.getElementById('progressText');
        const menu = document.getElementById('lineJumpMenu');
        if (button) {
            button.classList.remove('is-open');
            button.setAttribute('aria-expanded', 'false');
        }
        if (menu) {
            menu.classList.remove('show');
        }
    }

    goToSentence(index) {
        if (index < 0 || index >= this.prompts.length) {
            return;
        }

        this.currentSentenceIndex = index;
        this.activeWordIndex = 0;
        this.currentCharIndex = 0;
        this.awaitingEnterToAdvance = false;
        this.resetAnswerDrafts();
        this.clearTypingInput();
        this.updateProgress();
        this.updateNavigationButtons();

        const prompt = this.prompts[this.currentSentenceIndex];
        const words = this.parseSentenceIntoWords(prompt.targetText);
        const firstWordIndex = this.findNextIncompleteWord(words, 0);
        if (firstWordIndex !== -1) {
            this.setActiveWord(firstWordIndex, words);
        }
        this.displayCurrentSentence();
        this.applyAnswerInputMode(true);

        if (this.autoPronounceBefore) {
            setTimeout(() => this.speakCurrentSentence(), 250);
        }
    }

    jumpToSentence(index, event) {
        if (event) {
            event.stopPropagation();
        }

        this.hideLineJumpMenu();

        if (index === this.currentSentenceIndex) {
            this.focusSentenceArea();
            return;
        }

        this.goToSentence(index);
    }

    parseSentenceIntoWords(sentence) {
        const words = [];
        const regex = /(\S+)/g;
        let match;
        let pendingLeadingPunctuation = '';

        while ((match = regex.exec(sentence)) !== null) {
            const token = match[0];

            if (isPurePunctuationToken(token)) {
                if (words.length > 0) {
                    words[words.length - 1].punctuation = `${words[words.length - 1].punctuation || ''}${token}`;
                } else {
                    pendingLeadingPunctuation += token;
                }
                continue;
            }

            const parts = splitTokenPunctuation(token);
            const wordInfo = {
                text: token,
                baseText: parts.baseWord,
                characters: [],
                prefixPunctuation: `${pendingLeadingPunctuation}${parts.prefixPunctuation}`,
                punctuation: parts.suffixPunctuation
            };

            pendingLeadingPunctuation = '';

            if (parts.baseWord) {
                for (let index = 0; index < parts.baseWord.length; index += 1) {
                    const char = parts.baseWord[index];
                    wordInfo.characters.push({
                        char,
                        isFixedApostrophe: isApostrophe(char)
                    });
                }

                wordInfo.text = parts.baseWord;
            }

            words.push(wordInfo);
        }

        return words;
    }

    getWordInput(wordIndex) {
        return this.typedWords[wordIndex] || '';
    }

    setWordInput(wordIndex, value) {
        this.typedWords[wordIndex] = value;
    }

    getWordInputChars(wordIndex) {
        return this.getWordInput(wordIndex).split('').map((character) =>
            character === this.emptyKeyboardSlot ? '' : character
        );
    }

    resetAnswerDrafts() {
        const prompt = this.prompts[this.currentSentenceIndex];
        const words = prompt ? this.parseSentenceIntoWords(prompt.targetText) : [];
        this.keyboardTypedWords = words.map((word) => this.createKeyboardWordDraft(word));
        this.pencilTypedWords = [];
        this.pencilDraft = '';
        this.pencilChunkDraft = '';
        this.pencilChunkHistory = [];
        this.pencilAcceptedChunks = [];
        if (this.pencilChunkAcceptTimer) {
            clearTimeout(this.pencilChunkAcceptTimer);
            this.pencilChunkAcceptTimer = null;
        }
        this.typedWords = this.answerInputMode === 'keyboard'
            ? this.keyboardTypedWords
            : this.pencilTypedWords;
        this.activeWordIndex = 0;
        this.currentCharIndex = words[0] ? this.getFirstTypeableCharIndex(words[0]) : 0;
        this.keyboardActiveWordIndex = 0;
        this.keyboardCharIndex = this.currentCharIndex;
    }

    createKeyboardWordDraft(word) {
        if (!word.characters.some((character) => character.isFixedApostrophe)) return '';
        return word.characters
            .map((character) => character.isFixedApostrophe ? character.char : this.emptyKeyboardSlot)
            .join('');
    }

    getTypeableCharIndexes(word) {
        if (!word || !Array.isArray(word.characters)) return [];
        return word.characters
            .map((character, index) => character.isFixedApostrophe ? -1 : index)
            .filter((index) => index >= 0);
    }

    getFirstTypeableCharIndex(word) {
        return this.getTypeableCharIndexes(word)[0] ?? 0;
    }

    getLastTypeableCharIndex(word) {
        const indexes = this.getTypeableCharIndexes(word);
        return indexes[indexes.length - 1] ?? 0;
    }

    getNearestTypeableCharIndex(word, index, preferForward = true) {
        const indexes = this.getTypeableCharIndexes(word);
        if (indexes.length === 0) return 0;
        if (indexes.includes(index)) return index;

        const nextIndex = indexes.find((candidate) => candidate > index);
        const previousIndex = [...indexes].reverse().find((candidate) => candidate < index);
        return preferForward
            ? (nextIndex ?? previousIndex ?? indexes[0])
            : (previousIndex ?? nextIndex ?? indexes[0]);
    }

    getAdjacentTypeableCharIndex(word, index, direction) {
        const indexes = this.getTypeableCharIndexes(word);
        if (direction < 0) {
            return [...indexes].reverse().find((candidate) => candidate < index) ?? null;
        }
        return indexes.find((candidate) => candidate > index) ?? null;
    }

    alignPencilTokenToWord(word, token) {
        const normalizedToken = normalizeApostrophes(token);
        const alignedCharacters = [];
        let tokenIndex = 0;

        word.characters.forEach((character) => {
            if (character.isFixedApostrophe) {
                alignedCharacters.push(character.char);
                if (isApostrophe(normalizedToken[tokenIndex])) tokenIndex += 1;
                return;
            }

            alignedCharacters.push(normalizedToken[tokenIndex] || this.emptyKeyboardSlot);
            tokenIndex += normalizedToken[tokenIndex] ? 1 : 0;
        });

        if (tokenIndex < normalizedToken.length) {
            alignedCharacters.push(normalizedToken.slice(tokenIndex));
        }
        return alignedCharacters.join('');
    }

    normalizeComparisonText(value) {
        return normalizeApostrophes(String(value ?? '')).toLowerCase();
    }

    areCharactersEquivalent(actual, expected) {
        return this.normalizeComparisonText(actual) === this.normalizeComparisonText(expected);
    }

    isWordTextCorrect(word, typedText) {
        const baseWord = word.baseText || word.text;
        return Boolean(typedText)
            && !typedText.includes(this.emptyKeyboardSlot)
            && typedText.length === word.characters.length
            && this.normalizeComparisonText(typedText) === this.normalizeComparisonText(baseWord);
    }

    getSuggestedCaretIndex(word, typedText, resetCompleted = false) {
        if (!word) {
            return 0;
        }

        const typedChars = typedText.split('');
        const isFullyCorrect = typedChars.length === word.characters.length
            && word.characters.every((charInfo, index) => {
                const typedChar = typedChars[index];
                return typedChar && this.areCharactersEquivalent(typedChar, charInfo.char);
            });

        if (resetCompleted && isFullyCorrect) {
            return this.getFirstTypeableCharIndex(word);
        }

        for (let index = 0; index < word.characters.length; index += 1) {
            if (word.characters[index].isFixedApostrophe) continue;
            const typedChar = typedChars[index];
            if (!typedChar || typedChar.toLowerCase() !== word.characters[index].char.toLowerCase()) {
                return index;
            }
        }

        return this.getLastTypeableCharIndex(word);
    }

    setActiveWord(wordIndex, words, options = {}) {
        const word = Array.isArray(words) ? words[wordIndex] : null;
        if (!word) {
            return;
        }

        const typedText = this.getWordInput(wordIndex);
        this.activeWordIndex = wordIndex;
        this.currentCharIndex = typeof options.charIndex === 'number'
            ? this.getNearestTypeableCharIndex(word, options.charIndex, options.preferForward !== false)
            : this.getSuggestedCaretIndex(word, typedText, options.resetCompleted === true);
    }

    findNextIncompleteWord(words, startIndex = 0) {
        for (let index = startIndex; index < words.length; index += 1) {
            const word = words[index];
            const typedText = this.getWordInput(index);
            const isCorrect = this.isWordTextCorrect(word, typedText);
            if (!isCorrect) {
                return index;
            }
        }

        return -1;
    }

    renderFixedApostrophe(character, charIndex) {
        return `<span class="char fixed-apostrophe" data-fixed-char-position="${charIndex}">${escapeRoleplayHtml(character.char)}</span>`;
    }

    renderCurrentWord(word, wordIndex) {
        const baseWord = word.baseText || word.text;
        const typedChars = this.getWordInputChars(wordIndex);
        let html = `<button type="button" class="word current" data-word="${escapeRoleplayHtml(baseWord)}" data-word-index="${wordIndex}" onclick="roleplayPractice.handleWordIndexClick(${wordIndex}, event)"><span class="word-main">`;

        if (word.prefixPunctuation) {
            html += `<span class="punctuation punctuation--leading">${escapeRoleplayHtml(word.prefixPunctuation)}</span>`;
        }

        html += '<span class="word-text">';

        word.characters.forEach((charInfo, charIndex) => {
            if (charInfo.isFixedApostrophe) {
                html += this.renderFixedApostrophe(charInfo, charIndex);
                return;
            }
            const typedChar = typedChars[charIndex];
            if (typedChar) {
                const isCorrect = this.areCharactersEquivalent(typedChar, charInfo.char);
                const cursorClass = this.answerInputMode === 'keyboard' && charIndex === this.currentCharIndex
                    ? 'cursor-position'
                    : '';
                html += `<span class="char ${isCorrect ? 'correct' : 'incorrect'} ${cursorClass}" data-word-index="${wordIndex}" data-char-index="${charIndex}">${escapeRoleplayHtml(typedChar)}</span>`;
            } else if (this.answerInputMode === 'keyboard' && charIndex === this.currentCharIndex) {
                html += `<span class="char underscore cursor-position" data-word-index="${wordIndex}" data-char-index="${charIndex}">_</span>`;
            } else {
                html += `<span class="char underscore" data-word-index="${wordIndex}" data-char-index="${charIndex}">_</span>`;
            }
        });

        if (word.punctuation) {
            html += `<span class="punctuation">${escapeRoleplayHtml(word.punctuation)}</span>`;
        }

        html += '</span></span></button>';
        return html;
    }

    renderBlankWord(word, wordIndex) {
        const baseWord = word.baseText || word.text;
        let html = `<button type="button" class="word blank" data-word="${escapeRoleplayHtml(baseWord)}" data-word-index="${wordIndex}" onclick="roleplayPractice.handleWordIndexClick(${wordIndex}, event)"><span class="word-main">`;

        if (word.prefixPunctuation) {
            html += `<span class="punctuation punctuation--leading">${escapeRoleplayHtml(word.prefixPunctuation)}</span>`;
        }

        html += '<span class="word-text">';

        word.characters.forEach((charInfo, charIndex) => {
            if (charInfo.isFixedApostrophe) {
                html += this.renderFixedApostrophe(charInfo, charIndex);
                return;
            }
            const cursorClass = this.answerInputMode === 'keyboard' &&
                wordIndex === this.activeWordIndex &&
                charIndex === this.currentCharIndex
                ? 'cursor-position'
                : '';
            html += `<span class="char underscore ${cursorClass}" data-word-index="${wordIndex}" data-char-index="${charIndex}">_</span>`;
        });

        if (word.punctuation) {
            html += `<span class="punctuation">${escapeRoleplayHtml(word.punctuation)}</span>`;
        }

        html += '</span></span></button>';
        return html;
    }

    renderRevealedWord(word, wordIndex) {
        const baseWord = word.baseText || word.text;
        const typedChars = this.getWordInputChars(wordIndex);
        const typedWord = typedChars.join('');
        const isCurrentWord = wordIndex === this.activeWordIndex;
        const isCompletedCorrectly = this.isWordTextCorrect(word, typedWord);
        const buttonClasses = ['word', 'revealed', 'dictation-hint'];
        if (isCurrentWord) {
            buttonClasses.push('current');
        }

        let html = `<button type="button" class="${buttonClasses.join(' ')}" data-word="${escapeRoleplayHtml(baseWord)}" data-word-index="${wordIndex}" onclick="roleplayPractice.handleWordIndexClick(${wordIndex}, event)"><span class="word-main">`;

        if (word.prefixPunctuation) {
            const leadingPunctuationClass = isCompletedCorrectly
                ? 'punctuation punctuation--leading dictation-punctuation dictation-punctuation--typed'
                : 'punctuation punctuation--leading dictation-punctuation';
            html += `<span class="${leadingPunctuationClass}">${escapeRoleplayHtml(word.prefixPunctuation)}</span>`;
        }

        html += '<span class="word-text">';

        word.characters.forEach((charInfo, charIndex) => {
            if (charInfo.isFixedApostrophe) {
                html += this.renderFixedApostrophe(charInfo, charIndex);
                return;
            }
            const typedChar = typedChars[charIndex];
            const hasTypedChar = Boolean(typedChar);
            const cursorClass = this.answerInputMode === 'keyboard' &&
                isCurrentWord &&
                charIndex === this.currentCharIndex
                ? 'cursor-position'
                : '';

            if (hasTypedChar) {
                const isCorrect = this.areCharactersEquivalent(typedChar, charInfo.char);
                html += `<span class="char dictation-char ${isCorrect ? 'correct' : 'incorrect'} ${cursorClass}" data-word-index="${wordIndex}" data-char-index="${charIndex}">${escapeRoleplayHtml(typedChar)}</span>`;
            } else {
                html += `<span class="char dictation-char hint ${cursorClass}" data-word-index="${wordIndex}" data-char-index="${charIndex}">${escapeRoleplayHtml(charInfo.char)}</span>`;
            }
        });

        if (word.punctuation) {
            const punctuationClass = isCompletedCorrectly
                ? 'punctuation dictation-punctuation dictation-punctuation--typed'
                : 'punctuation dictation-punctuation';
            html += `<span class="${punctuationClass}">${escapeRoleplayHtml(word.punctuation)}</span>`;
        }

        html += '</span></span></button>';
        return html;
    }

    renderPartialWord(word, typedWord, wordIndex) {
        const baseWord = word.baseText || word.text;
        const typedChars = this.getWordInputChars(wordIndex);
        let html = `<button type="button" class="word partial" data-word="${escapeRoleplayHtml(baseWord)}" data-word-index="${wordIndex}" onclick="roleplayPractice.handleWordIndexClick(${wordIndex}, event)"><span class="word-main">`;

        if (word.prefixPunctuation) {
            html += `<span class="punctuation punctuation--leading">${escapeRoleplayHtml(word.prefixPunctuation)}</span>`;
        }

        html += '<span class="word-text">';

        word.characters.forEach((charInfo, charIndex) => {
            if (charInfo.isFixedApostrophe) {
                html += this.renderFixedApostrophe(charInfo, charIndex);
                return;
            }
            const typedChar = typedChars[charIndex];
            const cursorClass = this.answerInputMode === 'keyboard' &&
                wordIndex === this.activeWordIndex &&
                charIndex === this.currentCharIndex
                ? 'cursor-position'
                : '';
            if (typedChar) {
                const isCorrect = this.areCharactersEquivalent(typedChar, charInfo.char);
                html += `<span class="char ${isCorrect ? 'correct' : 'incorrect'} ${cursorClass}" data-word-index="${wordIndex}" data-char-index="${charIndex}">${escapeRoleplayHtml(typedChar)}</span>`;
            } else {
                html += `<span class="char underscore ${cursorClass}" data-word-index="${wordIndex}" data-char-index="${charIndex}">_</span>`;
            }
        });

        if (word.punctuation) {
            html += `<span class="punctuation">${escapeRoleplayHtml(word.punctuation)}</span>`;
        }

        html += '</span></span></button>';
        return html;
    }

    renderCompletedWord(word, typedWord, wordIndex) {
        const baseWord = word.baseText || word.text;
        const isCorrect = this.isWordTextCorrect(word, typedWord);

        let html = `
            <button type="button" class="word ${isCorrect ? 'correct' : 'incorrect'} completed-word" data-word-index="${wordIndex}" data-word="${escapeRoleplayHtml(baseWord)}" onclick="roleplayPractice.handleWordIndexClick(${wordIndex}, event)"><span class="word-main">`;

        if (word.prefixPunctuation) {
            html += `<span class="punctuation punctuation--leading">${escapeRoleplayHtml(word.prefixPunctuation)}</span>`;
        }

        html += '<span class="word-text">';
        word.characters.forEach((charInfo, charIndex) => {
            if (charInfo.isFixedApostrophe) {
                html += this.renderFixedApostrophe(charInfo, charIndex);
                return;
            }
            const typedChar = this.getWordInputChars(wordIndex)[charIndex] || '';
            const cursorClass = this.answerInputMode === 'keyboard' &&
                wordIndex === this.activeWordIndex &&
                charIndex === this.currentCharIndex
                ? 'cursor-position'
                : '';
            const charClass = typedChar && this.areCharactersEquivalent(typedChar, charInfo.char)
                ? 'correct'
                : 'incorrect';
            html += `<span class="char ${charClass} ${cursorClass}" data-word-index="${wordIndex}" data-char-index="${charIndex}">${escapeRoleplayHtml(typedChar || '_')}</span>`;
        });

        if (word.punctuation) {
            html += `<span class="punctuation">${escapeRoleplayHtml(word.punctuation)}</span>`;
        }

        html += '</span></span></button>';
        return html;
    }

    renderTargetLine(words, prompt) {
        const sentenceAwaitingAdvance = this.awaitingEnterToAdvance && this.isCurrentSentenceCorrect();
        let html = `
            <div class="roleplay-target-line">
                <div class="roleplay-target-line__main">
                    <span class="roleplay-line__speaker">${escapeRoleplayHtml(prompt.speakerLabel)}:</span>
                    <div class="roleplay-target-line__words">
        `;

        words.forEach((word, wordIndex) => {
            const typedWord = this.getWordInput(wordIndex);
            const showFullLine = this.dictationRevealMode === 'line';
            const showCurrentWord = this.dictationRevealMode === 'word' && wordIndex === this.activeWordIndex;

            if (sentenceAwaitingAdvance) {
                html += this.renderCompletedWord(word, typedWord || (word.baseText || word.text), wordIndex);
            } else if (showFullLine || showCurrentWord) {
                html += this.renderRevealedWord(word, wordIndex);
            } else if (wordIndex === this.activeWordIndex) {
                html += this.renderCurrentWord(word, wordIndex);
            } else if (typedWord && !typedWord.includes(this.emptyKeyboardSlot) && typedWord.length >= word.characters.length) {
                html += this.renderCompletedWord(word, typedWord, wordIndex);
            } else if (typedWord) {
                html += this.renderPartialWord(word, typedWord, wordIndex);
            } else {
                html += this.renderBlankWord(word, wordIndex);
            }
        });

        html += `
                    </div>
                </div>
                <div class="roleplay-target-translation" id="currentTargetTranslation"></div>
            </div>
        `;
        return html;
    }

    getVisibleContextBefore(prompt) {
        const contextBefore = Array.isArray(prompt.contextBefore) ? prompt.contextBefore : [];
        if (this.contextLinesAbove <= 0) {
            return [];
        }

        return contextBefore.slice(-this.contextLinesAbove);
    }

    getVisibleContextAfter(prompt) {
        const contextAfter = Array.isArray(prompt.contextAfter) ? prompt.contextAfter : [];
        if (this.contextLinesBelow <= 0) {
            return [];
        }

        return contextAfter.slice(0, this.contextLinesBelow);
    }

    displayCurrentSentence() {
        if (this.currentSentenceIndex >= this.prompts.length) {
            this.showCompletionPopup();
            return;
        }

        const prompt = this.prompts[this.currentSentenceIndex];
        const words = this.parseSentenceIntoWords(prompt.targetText);
        if (!words[this.activeWordIndex]) {
            const firstWordIndex = this.findNextIncompleteWord(words, 0);
            this.activeWordIndex = firstWordIndex === -1 ? 0 : firstWordIndex;
            this.currentCharIndex = words[this.activeWordIndex]
                ? this.getSuggestedCaretIndex(words[this.activeWordIndex], this.getWordInput(this.activeWordIndex))
                : 0;
        }
        const sentenceNumber = document.getElementById('currentSentenceNumber');
        const sentenceText = document.getElementById('currentSentence');

        if (sentenceNumber) {
            const revealLabel = this.dictationRevealMode === 'line'
                ? ' • Line visible'
                : (this.dictationRevealMode === 'word' ? ' • Word visible' : '');
            sentenceNumber.textContent = `Character: ${prompt.speakerLabel}${revealLabel}`;
            sentenceNumber.style.fontSize = `${this.sentenceFontSize}px`;
        }

        if (sentenceText) {
            sentenceText.style.fontSize = `${this.getScaledTypingFontSize()}px`;

            const sceneHtml = prompt.sceneText
                ? `<div class="roleplay-scene">${escapeRoleplayHtml(prompt.sceneText)}</div>`
                : '';

            const previousHtml = this.getVisibleContextBefore(prompt)
                .map((line) => `<div class="roleplay-context-line">${renderContextText(line)}</div>`)
                .join('');

            const nextHtml = this.getVisibleContextAfter(prompt)
                .map((line) => `<div class="roleplay-context-line">${renderContextText(line)}</div>`)
                .join('');

            sentenceText.innerHTML = `
                <div class="roleplay-prompt">
                    ${sceneHtml}
                    ${previousHtml}
                    ${this.renderTargetLine(words, prompt)}
                    ${nextHtml}
                </div>
            `;
        }

        this.applyDisplaySize();
        this.applyTranslationDisplay();
    }

    handleCharacterInput(typedChar) {
        const words = this.parseSentenceIntoWords(this.prompts[this.currentSentenceIndex].targetText);
        const currentWord = words[this.activeWordIndex];
        if (!currentWord) return;

        this.currentCharIndex = this.getNearestTypeableCharIndex(currentWord, this.currentCharIndex);
        if (isApostrophe(typedChar) &&
            currentWord.characters[this.currentCharIndex - 1]?.isFixedApostrophe) {
            return;
        }

        const currentChars = this.getWordInputChars(this.activeWordIndex);
        while (currentChars.length <= this.currentCharIndex) {
            currentChars.push('');
        }
        currentChars[this.currentCharIndex] = typedChar;
        this.setWordInput(this.activeWordIndex, currentChars
            .map((character) => character || this.emptyKeyboardSlot)
            .join(''));

        this.displayCurrentSentence();
        this.playTypingSoundDeferred();

        if (currentWord && this.isCurrentWordCorrect()) {
            this.completeCurrentWord();
        } else {
            const nextIndex = this.getAdjacentTypeableCharIndex(currentWord, this.currentCharIndex, 1);
            if (nextIndex !== null) this.currentCharIndex = nextIndex;
            this.displayCurrentSentence();
        }
    }

    playTypingSoundDeferred() {
        if (!this.enableTypingSound || !this.soundManager) {
            return;
        }

        const soundType = this.soundType;
        const soundVolume = this.soundVolume / 100;

        window.setTimeout(() => {
            if (!this.enableTypingSound || !this.soundManager) {
                return;
            }

            this.soundManager.playTypingSound(soundType, soundVolume);
        }, 0);
    }

    handleBackspace() {
        const words = this.parseSentenceIntoWords(this.prompts[this.currentSentenceIndex].targetText);
        const currentWord = words[this.activeWordIndex];
        const currentChars = this.getWordInputChars(this.activeWordIndex);
        const selectedIndex = this.getNearestTypeableCharIndex(currentWord, this.currentCharIndex);
        const targetIndex = currentChars[selectedIndex]
            ? selectedIndex
            : this.getAdjacentTypeableCharIndex(currentWord, selectedIndex, -1);
        if (targetIndex !== null) {
            currentChars[targetIndex] = '';
            this.setWordInput(this.activeWordIndex, currentChars
                .map((character) => character || this.emptyKeyboardSlot)
                .join(''));
            this.currentCharIndex = targetIndex;
            this.displayCurrentSentence();
        } else if (this.activeWordIndex > 0) {
            this.activeWordIndex -= 1;
            this.currentCharIndex = this.getLastTypeableCharIndex(words[this.activeWordIndex]);
            const previousChars = this.getWordInputChars(this.activeWordIndex);
            previousChars[this.currentCharIndex] = '';
            this.setWordInput(this.activeWordIndex, previousChars
                .map((character) => character || this.emptyKeyboardSlot)
                .join(''));
            this.displayCurrentSentence();
        }
    }

    handleDelete() {
        const words = this.parseSentenceIntoWords(this.prompts[this.currentSentenceIndex].targetText);
        const currentWord = words[this.activeWordIndex];
        this.currentCharIndex = this.getNearestTypeableCharIndex(currentWord, this.currentCharIndex);
        const currentChars = this.getWordInputChars(this.activeWordIndex);
        currentChars[this.currentCharIndex] = '';
        this.setWordInput(this.activeWordIndex, currentChars
            .map((character) => character || this.emptyKeyboardSlot)
            .join(''));
        this.displayCurrentSentence();
    }

    moveKeyboardSelection(direction) {
        const words = this.parseSentenceIntoWords(this.prompts[this.currentSentenceIndex].targetText);
        const adjacentIndex = this.getAdjacentTypeableCharIndex(
            words[this.activeWordIndex],
            this.currentCharIndex,
            direction
        );
        if (adjacentIndex !== null) {
            this.currentCharIndex = adjacentIndex;
        } else if (direction < 0 && this.activeWordIndex > 0) {
            this.activeWordIndex -= 1;
            this.currentCharIndex = this.getLastTypeableCharIndex(words[this.activeWordIndex]);
        } else if (direction > 0 && this.activeWordIndex < words.length - 1) {
            this.activeWordIndex += 1;
            this.currentCharIndex = this.getFirstTypeableCharIndex(words[this.activeWordIndex]);
        }
        this.displayCurrentSentence();
        this.focusSentenceArea();
    }

    insertKeyboardText(text) {
        if (this.answerInputMode !== 'keyboard') return;
        for (const character of String(text || '')) {
            this.handleCharacterInput(character);
        }
    }

    handleKeyboardBeforeInput(event) {
        if (this.answerInputMode !== 'keyboard') {
            event.preventDefault();
            this.pulseActiveInputMode();
            return;
        }
        if (event.inputType === 'deleteContentBackward') {
            event.preventDefault();
            this.handleBackspace();
        } else if (event.inputType === 'deleteContentForward') {
            event.preventDefault();
            this.handleDelete();
        } else if (event.inputType === 'insertLineBreak') {
            event.preventDefault();
            this.skipSentence();
        } else if (event.inputType.startsWith('insert') && event.data) {
            event.preventDefault();
            this.insertKeyboardText(event.data);
        }
        event.currentTarget.value = '';
    }

    isCurrentWordCorrect() {
        const words = this.parseSentenceIntoWords(this.prompts[this.currentSentenceIndex].targetText);
        const currentWord = words[this.activeWordIndex];
        const typedText = this.getWordInput(this.activeWordIndex);
        return currentWord ? this.isWordTextCorrect(currentWord, typedText) : false;
    }

    completeCurrentWord() {
        const words = this.parseSentenceIntoWords(this.prompts[this.currentSentenceIndex].targetText);
        if (this.isCurrentSentenceCorrect()) {
            this.completeCurrentSentence();
            return;
        }

        const nextWordIndex = this.findNextIncompleteWord(words, this.activeWordIndex + 1);
        const fallbackWordIndex = nextWordIndex === -1 ? this.findNextIncompleteWord(words, 0) : nextWordIndex;
        if (fallbackWordIndex !== -1) {
            this.setActiveWord(fallbackWordIndex, words);
            this.displayCurrentSentence();
            this.focusSentenceArea();
        }
    }

    isCurrentSentenceCorrect() {
        const words = this.parseSentenceIntoWords(this.prompts[this.currentSentenceIndex].targetText);
        return words.every((word, index) => {
            const typedText = this.getWordInput(index);
            return this.isWordTextCorrect(word, typedText);
        });
    }

    handleKeyDown(event) {
        if (this.answerInputMode !== 'keyboard' ||
            !this.isGameActive ||
            this.currentSentenceIndex >= this.prompts.length) {
            return;
        }

        if (this.awaitingEnterToAdvance) {
            if (event.key === 'Enter') {
                event.preventDefault();
                this.moveToNextSentence();
                return;
            }

            if (event.key === 'Tab') {
                event.preventDefault();
                this.skipSentence();
                return;
            }

            if (event.key === 'Backspace') {
                event.preventDefault();
                this.awaitingEnterToAdvance = false;
                this.displayCurrentSentence();
                this.handleBackspace();
                return;
            }

            if (event.key.length === 1) {
                event.preventDefault();
                return;
            }
        }

        const words = this.parseSentenceIntoWords(this.prompts[this.currentSentenceIndex].targetText);
        const currentWord = words[this.activeWordIndex];
        if (!currentWord) {
            return;
        }

        if (event.key === 'Backspace') {
            event.preventDefault();
            this.handleBackspace();
            return;
        }

        if (event.key === 'Delete') {
            event.preventDefault();
            this.handleDelete();
            return;
        }

        if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
            event.preventDefault();
            this.moveKeyboardSelection(event.key === 'ArrowLeft' ? -1 : 1);
            return;
        }

        if (event.key === 'Home' || event.key === 'End') {
            event.preventDefault();
            this.activeWordIndex = event.key === 'Home' ? 0 : words.length - 1;
            this.currentCharIndex = event.key === 'Home'
                ? this.getFirstTypeableCharIndex(words[this.activeWordIndex])
                : this.getLastTypeableCharIndex(words[this.activeWordIndex]);
            this.displayCurrentSentence();
            return;
        }

        if (event.key === 'Enter' || event.key === 'Tab') {
            event.preventDefault();
            this.skipSentence();
            return;
        }

        if (event.key === ' ') {
            event.preventDefault();
            if (this.currentCharIndex >= currentWord.characters.length && this.isCurrentWordCorrect()) {
                this.completeCurrentWord();
            }
            return;
        }

        if (event.key.length === 1) {
            event.preventDefault();
            const expectedChar = currentWord.characters[this.currentCharIndex];
            if (expectedChar) {
                this.handleCharacterInput(event.key);
            }
        }
    }

    completeCurrentSentence() {
        if (!this.isCurrentSentenceCorrect()) {
            this.showTemporaryMessage('Please complete the line correctly before moving on.', 'error');
            return;
        }

        this.awaitingEnterToAdvance = true;
        this.displayCurrentSentence();
        this.focusSentenceArea();

        if (this.autoPronounceAfter) {
            this.speakCurrentSentence();
        }
    }

    moveToPreviousSentence() {
        if (this.currentSentenceIndex <= 0) {
            return;
        }

        this.goToSentence(this.currentSentenceIndex - 1);
    }

    moveToNextSentence() {
        const nextIndex = this.currentSentenceIndex + 1;
        if (nextIndex >= this.prompts.length) {
            this.pencilInputController?.reset(this.getPencilInputValue());
            this.currentSentenceIndex = this.prompts.length;
            this.updateProgress();
            this.updateNavigationButtons();
            this.showCompletionPopup();
            return;
        }

        this.goToSentence(nextIndex);
    }

    skipSentence() {
        this.moveToNextSentence();
    }

    updateProgress() {
        const progressFill = document.getElementById('progressFill');
        const progressText = document.getElementById('progressText');
        if (!progressFill || !progressText) {
            return;
        }

        const progress = this.prompts.length > 0
            ? (this.getCurrentDisplayIndex() / this.prompts.length) * 100
            : 0;

        progressFill.style.width = `${progress}%`;
        progressText.textContent = `${this.getCurrentDisplayIndex()}/${this.prompts.length} lines`;
        this.renderLineJumpMenu();
    }

    focusSentenceArea() {
        if (this.answerInputMode === 'pencil') {
            this.focusPencilInput();
            return;
        }

        const keyboardCaptureInput = document.getElementById('keyboardCaptureInput');
        if (keyboardCaptureInput && !keyboardCaptureInput.disabled) {
            keyboardCaptureInput.focus({ preventScroll: true });
        }
    }

    isPencilEditMode() {
        return Boolean(this.pencilInputController?.isEditMode?.());
    }

    getPencilInputValue() {
        return this.isPencilEditMode() ? this.pencilDraft : this.pencilChunkDraft;
    }

    getPencilStatusText(isEditMode = this.isPencilEditMode()) {
        return isEditMode
            ? 'Edit mode - tap existing text to change it'
            : 'Append mode - write the next word(s); accepted text moves to the display';
    }


    setAnswerInputMode(mode) {
        if (mode !== 'keyboard' && mode !== 'pencil') return;

        if (this.answerInputMode === 'keyboard') {
            this.keyboardActiveWordIndex = this.activeWordIndex;
            this.keyboardCharIndex = this.currentCharIndex;
        }
        this.answerInputMode = mode;
        this.typedWords = mode === 'keyboard' ? this.keyboardTypedWords : this.pencilTypedWords;
        if (mode === 'keyboard') {
            this.activeWordIndex = this.keyboardActiveWordIndex;
            this.currentCharIndex = this.keyboardCharIndex;
            const words = this.prompts[this.currentSentenceIndex]
                ? this.parseSentenceIntoWords(this.prompts[this.currentSentenceIndex].targetText)
                : [];
            if (words[this.activeWordIndex]) {
                this.currentCharIndex = this.getNearestTypeableCharIndex(
                    words[this.activeWordIndex],
                    this.currentCharIndex
                );
            }
        } else if (this.prompts[this.currentSentenceIndex]) {
            const words = this.parseSentenceIntoWords(this.prompts[this.currentSentenceIndex].targetText);
            const firstIncompleteWord = this.findNextIncompleteWord(words, 0);
            this.activeWordIndex = firstIncompleteWord === -1 ? Math.max(0, words.length - 1) : firstIncompleteWord;
            const activeWord = words[this.activeWordIndex];
            this.currentCharIndex = activeWord
                ? Math.min(
                    this.getSuggestedCaretIndex(activeWord, this.getWordInput(this.activeWordIndex)),
                    Math.max(0, activeWord.characters.length - 1)
                )
                : 0;
        }
        localStorage.setItem('vocabKillerAnswerInputMode', mode);
        this.applyAnswerInputMode(mode === 'keyboard');
        this.displayCurrentSentence();
    }

    applyAnswerInputMode(shouldFocus = false) {
        const sentenceDisplayArea = document.getElementById('sentenceDisplayArea');
        const typingInputArea = document.querySelector('.typing-input-area');
        const typingInput = document.getElementById('typingInput');
        const keyboardModeButton = document.getElementById('keyboardInputModeBtn');
        const pencilModeButton = document.getElementById('pencilInputModeBtn');
        const status = document.getElementById('inputModeStatus');
        const pencilBackspaceButton = document.getElementById('pencilBackspaceBtn');
        const pencilClearButton = document.getElementById('pencilClearBtn');
        const isKeyboardMode = this.answerInputMode === 'keyboard';

        sentenceDisplayArea?.classList.toggle('input-mode-active', isKeyboardMode);
        typingInputArea?.classList.toggle('input-mode-active', !isKeyboardMode);
        document.body.classList.toggle('keyboard-answer-mode', isKeyboardMode);
        document.body.classList.toggle('pencil-answer-mode', !isKeyboardMode);

        if (keyboardModeButton) {
            keyboardModeButton.classList.toggle('active', isKeyboardMode);
            keyboardModeButton.setAttribute('aria-pressed', String(isKeyboardMode));
        }
        if (pencilModeButton) {
            pencilModeButton.classList.toggle('active', !isKeyboardMode);
            pencilModeButton.setAttribute('aria-pressed', String(!isKeyboardMode));
        }
        if (typingInput) {
            if (isKeyboardMode && document.activeElement === typingInput) typingInput.blur();
            typingInput.setAttribute('inputmode', 'none');
            typingInput.disabled = isKeyboardMode;
            typingInput.value = isKeyboardMode ? '' : this.getPencilInputValue();
            typingInput.placeholder = this.isPencilEditMode()
                ? 'Edit full answer with Apple Pencil...'
                : 'Write next word or words...';
            this.lastTypingInputValue = typingInput.value;
        }
        this.pencilInputController?.setEditMode(false);
        this.pencilInputController?.sync(isKeyboardMode ? '' : this.getPencilInputValue());
        const keyboardCaptureInput = document.getElementById('keyboardCaptureInput');
        if (keyboardCaptureInput) {
            if (!isKeyboardMode && document.activeElement === keyboardCaptureInput) keyboardCaptureInput.blur();
            keyboardCaptureInput.disabled = !isKeyboardMode;
            keyboardCaptureInput.value = '';
        }
        if (pencilBackspaceButton) pencilBackspaceButton.disabled = isKeyboardMode;
        if (pencilClearButton) pencilClearButton.disabled = isKeyboardMode;
        if (status) status.textContent = isKeyboardMode
            ? 'Keyboard active - type anywhere'
            : this.getPencilStatusText(false);
        this.updatePencilSurfaceModeClasses(false);
        this.pencilInputController?.refresh();

        if (shouldFocus) this.focusSentenceArea();
    }

    pulseActiveInputMode() {
        const status = document.getElementById('inputModeStatus');
        const activeArea = this.answerInputMode === 'keyboard'
            ? document.getElementById('sentenceDisplayArea')
            : document.querySelector('.typing-input-area');

        clearTimeout(this.inputModeAttentionTimer);
        [status, activeArea].forEach((element) => {
            if (!element) return;
            element.classList.remove('mode-attention');
            void element.offsetWidth;
            element.classList.add('mode-attention');
        });
        this.inputModeAttentionTimer = setTimeout(() => {
            status?.classList.remove('mode-attention');
            activeArea?.classList.remove('mode-attention');
        }, 650);
    }

    focusPencilInput() {
        const typingInput = document.getElementById('typingInput');
        if (!typingInput || typingInput.disabled) return;

        typingInput.setAttribute('inputmode', 'none');
        typingInput.focus({ preventScroll: true });
    }

    setupPencilScratchDelete(typingInput) {
        if (!window.PencilScratchDeleteFallback || !typingInput) return;

        window.PencilScratchDeleteFallback.attach(typingInput, {
            isEnabled: () => this.answerInputMode === 'pencil',
            onBeforeChange: () => this.pencilInputController?.recordExternalSnapshot('scratch-delete'),
            onChange: (value, state) => {
                if (this.pencilInputController) {
                    this.pencilInputController.commitExternalChange(value, state);
                } else {
                    this.handleTypingInput(value, 'pencil');
                }
            }
        });
    }

    handlePencilBackspace() {
        if (this.answerInputMode !== 'pencil') return;
        if (this.isPencilEditMode()) {
            this.pencilInputController?.applyBackspace();
            return;
        }

        if (this.pencilChunkDraft) {
            this.pencilInputController?.applyBackspace();
            return;
        }

        this.undoPencilChunk();
    }

    handlePencilClear() {
        if (this.answerInputMode !== 'pencil') return;
        if (this.isPencilEditMode()) {
            this.pencilInputController?.clear();
            return;
        }
        this.clearPencilAppendAttempt();
    }

    clearTypingInput() {
        this.resetAnswerDrafts();
        const typingInput = document.getElementById('typingInput');
        if (typingInput) {
            typingInput.value = '';
        }
        this.lastTypingInputValue = '';
        this.pencilInputController?.reset('');
        if (this.inputCompletionTimer) {
            clearTimeout(this.inputCompletionTimer);
            this.inputCompletionTimer = null;
        }
        this.applyAnswerInputMode(false);
    }

    handleTypingInput(value, source = 'pencil') {
        if (source !== this.answerInputMode) {
            this.pulseActiveInputMode();
            const typingInput = document.getElementById('typingInput');
            if (typingInput) typingInput.value = this.getPencilInputValue();
            return;
        }

        if (!this.isGameActive || this.currentSentenceIndex >= this.prompts.length) {
            return;
        }

        if (this.inputCompletionTimer) {
            clearTimeout(this.inputCompletionTimer);
            this.inputCompletionTimer = null;
        }

        if (this.isPencilEditMode()) {
            this.applyPencilFullTextValue(value);
            return;
        }

        this.handlePencilChunkInput(value);
    }

    updatePencilSurfaceModeClasses(isEditMode = this.isPencilEditMode()) {
        document.body.classList.toggle('pencil-append-mode', this.answerInputMode === 'pencil' && !isEditMode);
        document.body.classList.toggle('pencil-edit-mode', this.answerInputMode === 'pencil' && isEditMode);
        const typingInput = document.getElementById('typingInput');
        if (typingInput) {
            typingInput.placeholder = isEditMode
                ? 'Edit full answer with Apple Pencil...'
                : 'Write next word or words...';
        }
    }

    handlePencilEditModeChange(isEditMode) {
        if (this.answerInputMode !== 'pencil') return;
        const typingInput = document.getElementById('typingInput');
        this.updatePencilSurfaceModeClasses(isEditMode);

        if (isEditMode) {
            this.acceptPencilChunk();
            this.pencilDraft = this.serializePencilWordSlots();
            this.pencilChunkDraft = '';
            this.pencilInputController?.sync(this.pencilDraft, {
                selectionStart: this.pencilDraft.length,
                selectionEnd: this.pencilDraft.length
            });
            if (typingInput) typingInput.value = this.pencilDraft;
        } else {
            const fullValue = typingInput ? typingInput.value : this.pencilDraft;
            this.applyPencilFullTextValue(fullValue, { playSound: false });
            this.pencilChunkDraft = '';
            this.lastTypingInputValue = '';
            this.pencilInputController?.sync('', { selectionStart: 0, selectionEnd: 0, scrollTop: 0 });
            if (typingInput) typingInput.value = '';
        }
        this.pencilInputController?.refresh();
    }

    serializePencilWordSlots() {
        const words = this.prompts[this.currentSentenceIndex]
            ? this.parseSentenceIntoWords(this.prompts[this.currentSentenceIndex].targetText)
            : [];
        return words
            .map((word, index) => {
                const typedChars = this.getWordInputChars(index);
                return word.characters
                    .map((charInfo, charIndex) => charInfo.isFixedApostrophe
                        ? charInfo.char
                        : (typedChars[charIndex] || ''))
                    .join('');
            })
            .filter(Boolean)
            .join(' ');
    }

    cleanPencilToken(token) {
        return normalizeApostrophes(String(token ?? ''))
            .trim()
            .replace(/^[.,!?;:]+|[.,!?;:]+$/g, '');
    }

    getPencilChunkTokens(value) {
        return String(value ?? '')
            .trim()
            .split(/\s+/)
            .map((token) => this.cleanPencilToken(token))
            .filter(Boolean);
    }

    isPencilSlotAttempted(index) {
        return Boolean(this.pencilTypedWords[index]);
    }

    findNextPencilAppendSlot(words, startIndex = 0) {
        for (let index = startIndex; index < words.length; index += 1) {
            if (!this.isPencilSlotAttempted(index)) return index;
        }
        return -1;
    }

    createPencilHistorySnapshot() {
        return {
            pencilTypedWords: [...this.pencilTypedWords],
            pencilDraft: this.pencilDraft,
            pencilChunkDraft: this.pencilChunkDraft,
            pencilAcceptedChunks: this.pencilAcceptedChunks.map((chunk) => ({ ...chunk })),
            activeWordIndex: this.activeWordIndex,
            currentCharIndex: this.currentCharIndex,
            awaitingEnterToAdvance: this.awaitingEnterToAdvance,
            lastTypingInputValue: this.lastTypingInputValue
        };
    }

    restorePencilHistorySnapshot(snapshot) {
        if (!snapshot) return false;
        this.pencilTypedWords = [...snapshot.pencilTypedWords];
        this.pencilDraft = snapshot.pencilDraft || '';
        this.pencilChunkDraft = snapshot.pencilChunkDraft || '';
        this.pencilAcceptedChunks = Array.isArray(snapshot.pencilAcceptedChunks)
            ? snapshot.pencilAcceptedChunks.map((chunk) => ({ ...chunk }))
            : [];
        this.typedWords = this.pencilTypedWords;
        this.activeWordIndex = snapshot.activeWordIndex || 0;
        this.currentCharIndex = snapshot.currentCharIndex || 0;
        this.awaitingEnterToAdvance = Boolean(snapshot.awaitingEnterToAdvance);
        this.lastTypingInputValue = snapshot.lastTypingInputValue || '';
        const typingInput = document.getElementById('typingInput');
        if (typingInput) typingInput.value = this.getPencilInputValue();
        this.pencilInputController?.sync(this.getPencilInputValue());
        this.displayCurrentSentence();
        this.pencilInputController?.refresh();
        return true;
    }

    schedulePencilChunkAccept() {
        if (this.pencilChunkAcceptTimer) {
            clearTimeout(this.pencilChunkAcceptTimer);
        }
        this.pencilChunkAcceptTimer = setTimeout(() => {
            this.pencilChunkAcceptTimer = null;
            this.acceptPencilChunk();
        }, 650);
    }

    handlePencilChunkInput(value) {
        this.pencilChunkDraft = value;
        this.awaitingEnterToAdvance = false;
        if (value !== this.lastTypingInputValue) {
            this.playTypingSoundDeferred();
        }
        this.lastTypingInputValue = value;

        if (this.pencilChunkDraft.trim()) {
            this.schedulePencilChunkAccept();
        } else if (this.pencilChunkAcceptTimer) {
            clearTimeout(this.pencilChunkAcceptTimer);
            this.pencilChunkAcceptTimer = null;
        }
    }

    acceptPencilChunk() {
        if (this.pencilChunkAcceptTimer) {
            clearTimeout(this.pencilChunkAcceptTimer);
            this.pencilChunkAcceptTimer = null;
        }
        const tokens = this.getPencilChunkTokens(this.pencilChunkDraft);
        if (tokens.length === 0 || !this.prompts[this.currentSentenceIndex]) {
            return false;
        }

        const words = this.parseSentenceIntoWords(this.prompts[this.currentSentenceIndex].targetText);
        const snapshot = this.createPencilHistorySnapshot();
        this.typedWords = this.pencilTypedWords;
        const filledIndexes = [];
        let searchIndex = 0;

        tokens.forEach((token) => {
            const slotIndex = this.findNextPencilAppendSlot(words, searchIndex);
            if (slotIndex === -1) return;
            this.setWordInput(slotIndex, this.alignPencilTokenToWord(words[slotIndex], token));
            filledIndexes.push(slotIndex);
            searchIndex = slotIndex + 1;
        });

        if (filledIndexes.length === 0) return false;

        this.pencilTypedWords = this.typedWords;
        this.pencilAcceptedChunks.push({
            text: this.pencilChunkDraft,
            wordIndexes: filledIndexes
        });
        this.pencilChunkHistory.push(snapshot);
        if (this.pencilChunkHistory.length > 50) this.pencilChunkHistory.shift();

        this.pencilChunkDraft = '';
        this.lastTypingInputValue = '';
        const typingInput = document.getElementById('typingInput');
        if (typingInput) typingInput.value = '';
        this.pencilInputController?.sync('', { selectionStart: 0, selectionEnd: 0, scrollTop: 0 });

        this.updateActivePencilWordAfterAppend(words);
        this.displayCurrentSentence();
        this.pencilInputController?.refresh();
        this.maybeScheduleSentenceCompletion();
        return true;
    }

    updateActivePencilWordAfterAppend(words) {
        const firstIncorrect = this.findNextIncompleteWord(words, 0);
        this.activeWordIndex = firstIncorrect === -1 ? Math.max(0, words.length - 1) : firstIncorrect;
        const activeWord = words[this.activeWordIndex];
        this.currentCharIndex = activeWord
            ? this.getSuggestedCaretIndex(activeWord, this.getWordInput(this.activeWordIndex))
            : 0;
    }

    maybeScheduleSentenceCompletion() {
        if (this.isCurrentSentenceCorrect()) {
            this.inputCompletionTimer = setTimeout(() => {
                if (this.isCurrentSentenceCorrect()) {
                    this.completeCurrentSentence();
                }
            }, 700);
        }
    }

    undoPencilChunk() {
        if (this.pencilChunkHistory.length === 0) return false;
        const snapshot = this.pencilChunkHistory.pop();
        return this.restorePencilHistorySnapshot(snapshot);
    }

    clearPencilAppendAttempt() {
        if (this.pencilChunkAcceptTimer) {
            clearTimeout(this.pencilChunkAcceptTimer);
            this.pencilChunkAcceptTimer = null;
        }
        this.pencilTypedWords = [];
        this.pencilDraft = '';
        this.pencilChunkDraft = '';
        this.pencilChunkHistory = [];
        this.pencilAcceptedChunks = [];
        this.typedWords = this.pencilTypedWords;
        this.activeWordIndex = 0;
        this.currentCharIndex = 0;
        this.awaitingEnterToAdvance = false;
        this.lastTypingInputValue = '';
        const typingInput = document.getElementById('typingInput');
        if (typingInput) typingInput.value = '';
        this.pencilInputController?.sync('', { selectionStart: 0, selectionEnd: 0, scrollTop: 0 });
        this.displayCurrentSentence();
        this.pencilInputController?.refresh();
    }

    applyPencilFullTextValue(value, options = {}) {
        const words = this.parseSentenceIntoWords(this.prompts[this.currentSentenceIndex].targetText);
        const tokens = String(value ?? '').trimStart().split(/\s+/).filter(Boolean);
        this.pencilDraft = value;
        this.pencilTypedWords = [];
        this.typedWords = this.pencilTypedWords;

        words.forEach((word, index) => {
            const token = tokens[index] || '';
            if (token) {
                this.setWordInput(index, this.alignPencilTokenToWord(word, this.cleanPencilToken(token)));
            }
        });
        this.pencilTypedWords = this.typedWords;
        this.updateActivePencilWordAfterAppend(words);
        this.awaitingEnterToAdvance = false;
        this.displayCurrentSentence();

        if (options.playSound !== false && value !== this.lastTypingInputValue) {
            this.playTypingSoundDeferred();
        }
        this.lastTypingInputValue = value;
        this.maybeScheduleSentenceCompletion();
    }


    handleSentenceDisplayClick(event) {
        const target = event.target instanceof Element ? event.target : null;
        if (!target) {
            return;
        }

        const wordElement = target.closest('.roleplay-target-line .word[data-word-index]');
        if (wordElement && wordElement.hasAttribute('data-word-index')) {
            this.handleWordClick(wordElement, event);
            return;
        }

        if (target.closest('button, a, input, textarea, select, option')) {
            return;
        }

        this.speakCurrentSentence();
        this.focusSentenceArea();
    }

    handleWordIndexClick(wordIndex, event) {
        if (event) {
            event.stopPropagation();
        }

        const words = this.parseSentenceIntoWords(this.prompts[this.currentSentenceIndex].targetText);
        const clickedWord = words[wordIndex];
        if (!clickedWord) {
            return;
        }

        this.speakWordAtIndex(wordIndex);

        if (this.answerInputMode === 'pencil') {
            if (this.dictationRevealMode === 'word') {
                this.activeWordIndex = wordIndex;
                this.currentCharIndex = this.getSuggestedCaretIndex(clickedWord, this.getWordInput(wordIndex));
                this.displayCurrentSentence();
            }
            this.focusPencilInput();
            return;
        }

        const clickedChar = event && event.target && event.target.closest('[data-char-index]');
        const clickedFixedApostrophe = event && event.target &&
            event.target.closest('.fixed-apostrophe[data-fixed-char-position]');
        const rawCharIndex = clickedChar ? parseInt(clickedChar.getAttribute('data-char-index'), 10) : NaN;
        const fixedCharPosition = clickedFixedApostrophe
            ? parseInt(clickedFixedApostrophe.getAttribute('data-fixed-char-position'), 10)
            : NaN;
        const typedText = this.getWordInput(wordIndex);
        const resetCompleted = this.isWordTextCorrect(clickedWord, typedText);

        this.awaitingEnterToAdvance = false;
        this.setActiveWord(wordIndex, words, {
            charIndex: Number.isNaN(rawCharIndex)
                ? (Number.isNaN(fixedCharPosition) ? undefined : fixedCharPosition)
                : rawCharIndex,
            preferForward: true,
            resetCompleted
        });
        this.displayCurrentSentence();
        this.focusSentenceArea();
    }

    handleWordClick(wordElement, event) {
        const wordIndex = parseInt(wordElement.getAttribute('data-word-index'), 10);
        if (Number.isNaN(wordIndex)) {
            return;
        }

        this.handleWordIndexClick(wordIndex, event);
    }

    speakWordAtIndex(wordIndex, onEnd) {
        const prompt = this.prompts[this.currentSentenceIndex];
        if (!prompt) {
            if (typeof onEnd === 'function') {
                onEnd();
            }
            return;
        }

        const words = this.parseSentenceIntoWords(prompt.targetText);
        const word = words[wordIndex];
        const text = word ? (word.baseText || word.text || '') : '';
        this.speakText(text, onEnd);
    }

    speakCurrentSentence(onEnd) {
        const prompt = this.prompts[this.currentSentenceIndex];
        this.speakText(prompt ? prompt.targetText : '', onEnd);
    }

    speakText(text, onEnd) {
        if (!text || !('speechSynthesis' in window)) {
            if (typeof onEnd === 'function') {
                onEnd();
            }
            return;
        }

        if (speechSynthesis.speaking) {
            speechSynthesis.cancel();
        }

        this.isPronouncing = true;
        const utterance = new SpeechSynthesisUtterance(text);
        if (this.selectedVoice) {
            utterance.voice = this.selectedVoice;
        }
        utterance.rate = this.speechSpeed || 1.0;
        utterance.lang = this.selectedVoice ? this.selectedVoice.lang : 'en-US';
        utterance.onend = () => {
            this.isPronouncing = false;
            if (typeof onEnd === 'function') {
                onEnd();
            }
        };
        utterance.onerror = () => {
            this.isPronouncing = false;
            if (typeof onEnd === 'function') {
                onEnd();
            }
        };

        speechSynthesis.speak(utterance);
    }

    showCompletionPopup() {
        const popup = document.getElementById('completionPopup');
        const message = document.getElementById('completionMessage');
        if (popup && message) {
            message.textContent = `You've completed all ${this.prompts.length} selected dialogue lines.`;
            popup.classList.add('show');
        }
    }

    hideCompletionPopup() {
        const popup = document.getElementById('completionPopup');
        if (popup) {
            popup.classList.remove('show');
        }
    }

    restartPractice() {
        this.hideCompletionPopup();
        this.startGame();
    }

    toggleSoundDropdown() {
        const dropdown = document.getElementById('soundDropdown');
        if (dropdown) {
            dropdown.classList.toggle('show');
        }
    }

    hideSoundDropdown() {
        const dropdown = document.getElementById('soundDropdown');
        if (dropdown) {
            dropdown.classList.remove('show');
        }
    }

    toggleAutoPronounceDropdown() {
        const dropdown = document.getElementById('autoPronounceDropdown');
        if (dropdown) {
            dropdown.classList.toggle('show');
        }
    }

    hideAutoPronounceDropdown() {
        const dropdown = document.getElementById('autoPronounceDropdown');
        if (dropdown) {
            dropdown.classList.remove('show');
        }
    }

    toggleDictationMenu() {
        const menu = document.getElementById('dictationMenu');
        if (!menu) {
            return;
        }

        if (this.dictationRevealMode !== 'off') {
            this.dictationRevealMode = 'off';
            localStorage.setItem('dictationRevealMode', this.dictationRevealMode);
            localStorage.setItem('dictationMode', 'false');
            this.updateDictationModeDisplay();
            this.displayCurrentSentence();
            this.hideDictationMenu();
            this.focusSentenceArea();
            return;
        }

        menu.classList.toggle('show');
    }

    hideDictationMenu() {
        const menu = document.getElementById('dictationMenu');
        if (menu) {
            menu.classList.remove('show');
        }
    }

    togglePreferenceDropdown() {
        const dropdown = document.getElementById('preferenceDropdown');
        if (dropdown) {
            dropdown.classList.toggle('show');
        }
    }

    hidePreferenceDropdown() {
        const dropdown = document.getElementById('preferenceDropdown');
        if (dropdown) {
            dropdown.classList.remove('show');
        }
    }

    toggleTranslationModeDropdown() {
        const menu = document.getElementById('translationModeMenu');
        if (menu) {
            menu.classList.toggle('show');
        }
    }

    hideTranslationModeDropdown() {
        const menu = document.getElementById('translationModeMenu');
        if (menu) {
            menu.classList.remove('show');
        }
    }

    toggleContextMenu() {
        const menu = document.getElementById('contextMenu');
        if (menu) {
            menu.classList.toggle('show');
        }
    }

    hideContextMenu() {
        const menu = document.getElementById('contextMenu');
        if (menu) {
            menu.classList.remove('show');
        }
    }

    updateContextLineCount(position, value) {
        const lineCount = Math.max(0, Math.min(MAX_ROLEPLAY_CONTEXT_LINES, parseInt(value, 10) || 0));

        if (position === 'above') {
            this.contextLinesAbove = lineCount;
            localStorage.setItem('friendsRoleplayContextLinesAbove', String(this.contextLinesAbove));
        } else {
            this.contextLinesBelow = lineCount;
            localStorage.setItem('friendsRoleplayContextLinesBelow', String(this.contextLinesBelow));
        }

        this.displayCurrentSentence();
        this.focusSentenceArea();
    }

    toggleWordByWordTranslation(event) {
        event.stopPropagation();
        this.wordByWordEnabled = !this.wordByWordEnabled;
        localStorage.setItem('wordByWordEnabled', this.wordByWordEnabled);
        const toggle = document.getElementById('wordByWordSwitch');
        if (toggle) {
            toggle.setAttribute('aria-pressed', String(this.wordByWordEnabled));
        }
        this.applyTranslationDisplay();
    }

    toggleFullSentenceTranslation(event) {
        event.stopPropagation();
        this.fullSentenceEnabled = !this.fullSentenceEnabled;
        localStorage.setItem('fullSentenceEnabled', this.fullSentenceEnabled);
        const toggle = document.getElementById('fullSentenceSwitch');
        if (toggle) {
            toggle.setAttribute('aria-pressed', String(this.fullSentenceEnabled));
        }
        this.applyTranslationDisplay();
    }

    async applyTranslationDisplay() {
        if (this.fullSentenceEnabled) {
            await this.showSentenceTranslation();
        } else {
            this.hideSentenceTranslation();
        }

        this.updateWordByWordDisplay();
    }

    async showSentenceTranslation() {
        const prompt = this.prompts[this.currentSentenceIndex];
        const translationElement = document.getElementById('currentTargetTranslation');
        if (!prompt || !translationElement) {
            return;
        }

        const translation = await this.getSentenceTranslation(prompt.targetText);
        translationElement.textContent = translation || '';
        translationElement.style.display = translation ? 'block' : 'none';
    }

    hideSentenceTranslation() {
        const translationElement = document.getElementById('currentTargetTranslation');
        if (translationElement) {
            translationElement.textContent = '';
            translationElement.style.display = 'none';
        }
    }

    updateWordByWordDisplay() {
        const wordElements = document.querySelectorAll('.roleplay-target-line .word[data-word]');
        wordElements.forEach((wordElement) => {
            const existing = wordElement.querySelector(':scope > .inline-translation');
            if (existing) {
                existing.remove();
            }

            if (!this.wordByWordEnabled) {
                return;
            }

            const word = wordElement.getAttribute('data-word');
            if (!word) {
                return;
            }

            const placeholder = document.createElement('span');
            placeholder.className = 'inline-translation';
            placeholder.textContent = this.wordTranslationCache.get(this.wordCacheKey(word)) || '…';
            wordElement.appendChild(placeholder);

            if (placeholder.textContent === '…') {
                this.fillWordTranslation(word, placeholder);
            }
        });
    }

    wordCacheKey(word) {
        return `${word.toLowerCase()}_${this.translationLanguage}`;
    }

    sentenceCacheKey(sentence) {
        return `${sentence}_${this.translationLanguage}`;
    }

    async fillWordTranslation(word, element) {
        const translation = await this.getWordTranslation(word);
        element.textContent = translation || '';
    }

    async getWordTranslation(word) {
        const cacheKey = this.wordCacheKey(word);
        if (this.wordTranslationCache.has(cacheKey)) {
            return this.wordTranslationCache.get(cacheKey);
        }

        if (!this.translationService) {
            return '';
        }

        try {
            const result = await this.translationService.translateVocabulary(word, this.translationLanguage);
            const translation = result && result.translation ? result.translation : '';
            this.wordTranslationCache.set(cacheKey, translation);
            return translation;
        } catch (error) {
            console.error('Word translation error:', error);
            return '';
        }
    }

    async getSentenceTranslation(sentence) {
        const cacheKey = this.sentenceCacheKey(sentence);
        if (this.sentenceTranslationCache.has(cacheKey)) {
            return this.sentenceTranslationCache.get(cacheKey);
        }

        if (!this.translationService) {
            return '';
        }

        try {
            const result = await this.translationService.translateSentence(sentence, this.translationLanguage);
            const translation = result && result.translation ? result.translation : '';
            this.sentenceTranslationCache.set(cacheKey, translation);
            return translation;
        } catch (error) {
            console.error('Sentence translation error:', error);
            return '';
        }
    }

    updateFont(fontFamily) {
        this.currentFont = fontFamily;
        document.body.style.fontFamily = fontFamily;
        localStorage.setItem('selectedFont', fontFamily);
    }

    updateUIFontSize(size) {
        this.uiFontSize = parseInt(size, 10);
        document.body.style.fontSize = `${size}px`;
        localStorage.setItem('uiFontSize', size);
    }

    updateSentenceFontSize(size) {
        this.sentenceFontSize = parseInt(size, 10);
        localStorage.setItem('sentenceFontSize', this.sentenceFontSize);
        this.displayCurrentSentence();
    }

    updateTypingAreaFontSize(size) {
        this.typingFontSize = parseInt(size, 10);
        localStorage.setItem('typingFontSize', this.typingFontSize);
        this.displayCurrentSentence();
    }

    updateTranslationLanguage(language) {
        this.translationLanguage = language;
        localStorage.setItem('translationLanguage', language);
    }

    applyTranslationSettings() {
        this.wordTranslationCache.clear();
        this.sentenceTranslationCache.clear();
        this.applyTranslationDisplay();
        this.showTranslationLanguageMessage(this.getLanguageDisplayName(this.translationLanguage));
        this.hidePreferenceDropdown();
    }

    getLanguageDisplayName(languageCode) {
        const names = {
            zh: 'Chinese (S)',
            'zh-tw': 'Chinese (T)',
            en: 'English',
            es: 'Spanish',
            fr: 'French',
            de: 'German',
            it: 'Italian',
            ja: 'Japanese',
            ko: 'Korean',
            pt: 'Portuguese',
            ru: 'Russian',
            ar: 'Arabic'
        };

        return names[languageCode] || languageCode;
    }

    populateVoiceSelect() {
        const voiceSelect = document.getElementById('voiceSelect');
        if (!voiceSelect) {
            return;
        }

        voiceSelect.innerHTML = '';

        const englishVoices = this.availableVoices
            .filter((voice) => voice.lang && voice.lang.toLowerCase().startsWith('en'))
            .sort((left, right) => left.name.localeCompare(right.name));

        englishVoices.forEach((voice) => {
            const option = document.createElement('option');
            option.value = voice.name;
            option.textContent = `${voice.name} (${voice.lang})`;
            voiceSelect.appendChild(option);
        });

        const savedVoice = localStorage.getItem('vocabKillerVoice');
        const hasManualVoice = localStorage.getItem('vocabKillerVoiceManual') === 'true';
        if (hasManualVoice && savedVoice && englishVoices.some((voice) => voice.name === savedVoice)) {
            voiceSelect.value = savedVoice;
            this.updateVoice(savedVoice);
            return;
        }

        const preferredVoice = englishVoices.find((voice) => {
            const voiceName = voice.name.toLowerCase();
            return voiceName.includes('google') && voiceName.includes('uk') && voiceName.includes('female');
        });
        const safariFallback = this.isSafariBrowser()
            ? englishVoices.find((voice) => voice.name === 'Samantha')
            : null;
        const defaultVoice = preferredVoice || safariFallback || englishVoices.find((voice) => voice.lang.toLowerCase() === 'en-gb') || englishVoices[0];

        if (defaultVoice) {
            voiceSelect.value = defaultVoice.name;
            this.updateVoice(defaultVoice.name);
        }
    }

    isSafariBrowser() {
        const userAgent = navigator.userAgent || '';
        return /Safari/i.test(userAgent) && !/Chrome|Chromium|CriOS|Edg|Android/i.test(userAgent);
    }

    updateVoice(voiceName, isManual = false) {
        if (isManual) {
            localStorage.setItem('vocabKillerVoiceManual', 'true');
        }
        localStorage.setItem('vocabKillerVoice', voiceName);
        this.selectedVoice = this.availableVoices.find((voice) => voice.name === voiceName) || null;
        const currentVoice = document.getElementById('currentVoice');
        if (currentVoice) {
            currentVoice.textContent = this.selectedVoice ? `Current: ${this.selectedVoice.name}` : 'Current: Default';
        }
    }

    updateSpeed(speed) {
        this.speechSpeed = parseFloat(speed);
        localStorage.setItem('vocabKillerSpeechSpeed', this.speechSpeed);

        const speedValue = document.getElementById('speedValue');
        if (speedValue) {
            speedValue.textContent = `${speed}x`;
        }

        const speedSlider = document.getElementById('speedSlider');
        if (speedSlider) {
            const min = parseFloat(speedSlider.min);
            const max = parseFloat(speedSlider.max);
            const percentage = ((parseFloat(speed) - min) / (max - min)) * 100;
            speedSlider.style.setProperty('--value', `${percentage}%`);
        }
    }

    resetSpeed() {
        this.updateSpeed('1.0');
        const speedSlider = document.getElementById('speedSlider');
        if (speedSlider) {
            speedSlider.value = '1.0';
        }
    }

    testVoice() {
        if (this.selectedVoice && 'speechSynthesis' in window) {
            const utterance = new SpeechSynthesisUtterance('Friends role play voice test.');
            utterance.voice = this.selectedVoice;
            utterance.rate = this.speechSpeed || 1.0;
            speechSynthesis.speak(utterance);
        }
    }

    toggleSwitch(type) {
        if (type === 'before') {
            this.autoPronounceBefore = !this.autoPronounceBefore;
            localStorage.setItem('autoPronounceBefore', this.autoPronounceBefore);
        } else if (type === 'after') {
            this.autoPronounceAfter = !this.autoPronounceAfter;
            localStorage.setItem('autoPronounceAfter', this.autoPronounceAfter);
        }

        this.updateSwitchDisplay(type);
    }

    previewSound() {
        if (this.soundManager) {
            this.soundManager.playTypingSound(this.soundType, this.soundVolume / 100);
        }
    }

    resetSoundSettings() {
        this.enableTypingSound = true;
        this.soundType = 1;
        this.soundVolume = 50;
        localStorage.setItem('enableTypingSound', this.enableTypingSound);
        localStorage.setItem('soundType', this.soundType);
        localStorage.setItem('soundVolume', this.soundVolume);
        this.updateSoundSettingsDisplay();
    }

    setDictationRevealMode(mode, event) {
        if (event) {
            event.stopPropagation();
        }

        this.dictationRevealMode = mode;
        localStorage.setItem('dictationRevealMode', this.dictationRevealMode);
        localStorage.setItem('dictationMode', String(this.dictationRevealMode !== 'off'));
        this.updateDictationModeDisplay();
        this.displayCurrentSentence();
        this.hideDictationMenu();
        this.focusSentenceArea();
    }

    updateSwitchDisplay(type) {
        const switchElement = document.getElementById(`switch${type.charAt(0).toUpperCase() + type.slice(1)}`);
        if (!switchElement) {
            return;
        }

        const isOn = type === 'before' ? this.autoPronounceBefore : this.autoPronounceAfter;
        switchElement.classList.toggle('on', isOn);
        switchElement.setAttribute('aria-checked', String(isOn));
    }

    updateDictationModeDisplay() {
        const button = document.querySelector('.dictation-btn');
        const lineOption = document.getElementById('dictationLineOption');
        const wordOption = document.getElementById('dictationWordOption');
        if (button) {
            button.classList.toggle('active', this.dictationRevealMode !== 'off');
        }
        if (lineOption) {
            lineOption.classList.toggle('active', this.dictationRevealMode === 'line');
        }
        if (wordOption) {
            wordOption.classList.toggle('active', this.dictationRevealMode === 'word');
        }
    }

    updateSoundSettingsDisplay() {
        const enableTypingSoundCheckbox = document.getElementById('enableTypingSound');
        const soundTypeSelect = document.getElementById('soundType');
        const soundVolumeSlider = document.getElementById('soundVolume');
        const volumeLabel = document.getElementById('volumeLabel');

        if (enableTypingSoundCheckbox) {
            enableTypingSoundCheckbox.checked = this.enableTypingSound;
        }
        if (soundTypeSelect) {
            soundTypeSelect.value = String(this.soundType);
        }
        if (soundVolumeSlider) {
            soundVolumeSlider.value = String(this.soundVolume);
            soundVolumeSlider.style.setProperty('--value', `${this.soundVolume}%`);
        }
        if (volumeLabel) {
            volumeLabel.textContent = `${this.soundVolume}%`;
        }
    }

    updateUI() {
        this.updateFont(this.currentFont);
        this.updateUIFontSize(this.uiFontSize);
        this.updateSoundSettingsDisplay();
        this.updateSwitchDisplay('before');
        this.updateSwitchDisplay('after');
        this.updateDictationModeDisplay();
        this.updateNavigationButtons();
        this.updateSpeed(this.speechSpeed.toString());
        this.applyDisplaySize();

        const fontSelect = document.getElementById('fontSelect');
        const uiFontSizeSelect = document.getElementById('uiFontSizeSelect');
        const sentenceFontSizeSelect = document.getElementById('sentenceFontSizeSelect');
        const typingFontSizeSelect = document.getElementById('typingFontSizeSelect');
        const contextAboveSelect = document.getElementById('contextAboveSelect');
        const contextBelowSelect = document.getElementById('contextBelowSelect');
        const translationLanguageSelect = document.getElementById('translationLanguageSelect');
        const wordByWordSwitch = document.getElementById('wordByWordSwitch');
        const fullSentenceSwitch = document.getElementById('fullSentenceSwitch');

        if (fontSelect) fontSelect.value = this.currentFont;
        if (uiFontSizeSelect) uiFontSizeSelect.value = String(this.uiFontSize);
        if (sentenceFontSizeSelect) sentenceFontSizeSelect.value = String(this.sentenceFontSize);
        if (typingFontSizeSelect) typingFontSizeSelect.value = String(this.typingFontSize);
        if (contextAboveSelect) contextAboveSelect.value = String(this.contextLinesAbove);
        if (contextBelowSelect) contextBelowSelect.value = String(this.contextLinesBelow);
        if (translationLanguageSelect) translationLanguageSelect.value = this.translationLanguage;
        if (wordByWordSwitch) wordByWordSwitch.setAttribute('aria-pressed', String(this.wordByWordEnabled));
        if (fullSentenceSwitch) fullSentenceSwitch.setAttribute('aria-pressed', String(this.fullSentenceEnabled));
    }

    updateNavigationButtons() {
        const previousButton = document.getElementById('previousLineBtn');
        const nextButton = document.getElementById('nextLineBtn');

        if (previousButton) {
            previousButton.disabled = this.currentSentenceIndex <= 0;
        }

        if (nextButton) {
            nextButton.disabled = this.currentSentenceIndex >= this.prompts.length - 1;
        }
    }

    showMessage(message) {
        alert(message);
    }

    showTemporaryMessage(message, type = 'info') {
        const messageDiv = document.createElement('div');
        messageDiv.textContent = message;
        messageDiv.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: ${type === 'error' ? '#b91c1c' : '#111111'};
            color: white;
            padding: 10px 18px;
            border-radius: 4px;
            z-index: 1200;
            font-size: 14px;
        `;
        document.body.appendChild(messageDiv);

        setTimeout(() => {
            if (messageDiv.parentNode) {
                messageDiv.parentNode.removeChild(messageDiv);
            }
        }, 2500);
    }

    showTranslationLanguageMessage(languageName) {
        this.showTemporaryMessage(`Translation language set to: ${languageName}`);
    }

    closeSubpage() {
        if (this.session && this.session.episodeId) {
            window.location.href = `/friends-episode.html?episode=${encodeURIComponent(this.session.episodeId)}`;
            return;
        }

        window.location.href = '/friends-scripts.html';
    }
}

let roleplayPractice;
document.addEventListener('DOMContentLoaded', () => {
    if (typeof UnifiedTranslationService !== 'undefined' && !window.unifiedTranslationService) {
        window.unifiedTranslationService = new UnifiedTranslationService();
    }

    roleplayPractice = new FriendsRoleplayPractice();
    roleplayPractice.initialize();
});
