const FRIENDS_ROLEPLAY_SESSION_KEY = 'friendsRoleplaySession';
const MAX_ROLEPLAY_CONTEXT_LINES = 5;

function getEpisodeStateKey(episodeId) {
    return `friendsEpisodeState:${episodeId}`;
}

function escapeHtml(value) {
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

function lineToPlainText(line) {
    if (!line) {
        return '';
    }
    if (line.type === 'dialogue') {
        return `${line.speakerLabel}: ${normalizeApostrophes(line.text)}`;
    }
    return normalizeApostrophes(line.text);
}

function renderLine(line) {
    if (line.type === 'dialogue') {
        return `
            <p class="friends-episode-line">
                <span class="friends-episode-line__speaker">${escapeHtml(line.speakerLabel)}:</span>
                ${escapeHtml(normalizeApostrophes(line.text))}
            </p>
        `;
    }

    if (line.type === 'scene') {
        return `<p class="friends-episode-line friends-episode-line--scene">${escapeHtml(normalizeApostrophes(line.text))}</p>`;
    }

    return `<p class="friends-episode-line friends-episode-line--action">${escapeHtml(normalizeApostrophes(line.text))}</p>`;
}

function parseQueryEpisodeId() {
    const params = new URLSearchParams(window.location.search);
    return params.get('episode');
}

class FriendsEpisodeReader {
    constructor() {
        this.episodeId = parseQueryEpisodeId();
        this.episode = null;
        this.selectedCharacters = new Set();
        this.filteredDialogueIndexes = [];
        this.elements = {
            episodeCode: document.getElementById('episodeCode'),
            episodeTitle: document.getElementById('episodeTitle'),
            episodeSummary: document.getElementById('episodeSummary'),
            characterButtons: document.getElementById('characterButtons'),
            selectionSummary: document.getElementById('selectionSummary'),
            scriptMeta: document.getElementById('scriptMeta'),
            scriptContent: document.getElementById('scriptContent'),
            roleplayBtn: document.getElementById('roleplayBtn')
        };
    }

    async initialize() {
        if (!this.episodeId) {
            this.fail('Episode id missing from URL.');
            return;
        }

        try {
            const response = await fetch(`/data/friends/episodes/${encodeURIComponent(this.episodeId)}.json`);
            if (!response.ok) {
                throw new Error(`Failed to load episode (${response.status})`);
            }

            this.episode = await response.json();
            this.restoreSelection();
            this.renderShell();
            this.renderCharacters();
            this.renderScript();
            this.attachEvents();
        } catch (error) {
            console.error('Episode reader error:', error);
            this.fail('Unable to load the selected Friends episode.');
        }
    }

    restoreSelection() {
        try {
            const rawState = sessionStorage.getItem(getEpisodeStateKey(this.episodeId));
            if (!rawState) {
                return;
            }

            const parsed = JSON.parse(rawState);
            if (Array.isArray(parsed.selectedCharacters)) {
                parsed.selectedCharacters.forEach((speakerId) => this.selectedCharacters.add(speakerId));
            }
        } catch (error) {
            console.warn('Episode selection restore failed:', error);
        }
    }

    persistSelection() {
        sessionStorage.setItem(
            getEpisodeStateKey(this.episodeId),
            JSON.stringify({ selectedCharacters: Array.from(this.selectedCharacters) })
        );
    }

    renderShell() {
        const totalLines = Array.isArray(this.episode.lines) ? this.episode.lines.length : 0;
        const speakerCount = Array.isArray(this.episode.characters) ? this.episode.characters.length : 0;

        this.elements.episodeCode.textContent = this.episode.episodeCode;
        this.elements.episodeTitle.textContent = this.episode.title;
        this.elements.episodeSummary.textContent = `${speakerCount} selectable speakers • ${totalLines} normalized script lines`;
    }

    renderCharacters() {
        const characters = Array.isArray(this.episode.characters) ? this.episode.characters : [];
        if (characters.length === 0) {
            this.elements.characterButtons.innerHTML = '<p class="friends-episode-loading">No dialogue speakers found for this episode.</p>';
            return;
        }

        this.elements.characterButtons.innerHTML = characters
            .map((character) => `
                <button
                    type="button"
                    class="friends-episode-character-btn ${this.selectedCharacters.has(character.id) ? 'is-active' : ''}"
                    data-speaker-id="${character.id}"
                >
                    ${escapeHtml(character.label)}
                </button>
            `)
            .join('');
    }

    computeVisibleLines() {
        const lines = Array.isArray(this.episode.lines) ? this.episode.lines : [];

        if (this.selectedCharacters.size === 0) {
            this.filteredDialogueIndexes = [];
            return lines;
        }

        const visible = [];
        this.filteredDialogueIndexes = [];

        lines.forEach((line, index) => {
            if (
                line.type === 'dialogue' &&
                Array.isArray(line.speakerIds) &&
                line.speakerIds.length > 0 &&
                line.speakerIds.every((speakerId) => this.selectedCharacters.has(speakerId))
            ) {
                visible.push(line);
                this.filteredDialogueIndexes.push(index);
            }
        });

        return visible;
    }

    renderScript() {
        const visibleLines = this.computeVisibleLines();

        if (this.selectedCharacters.size === 0) {
            this.elements.selectionSummary.textContent = 'Showing full episode script';
            this.elements.scriptMeta.textContent = `${this.episode.lines.length} total lines`;
        } else {
            const selectedLabels = this.episode.characters
                .filter((character) => this.selectedCharacters.has(character.id))
                .map((character) => character.label);

            this.elements.selectionSummary.textContent = `Showing dialogue for ${selectedLabels.join(', ')}`;
            this.elements.scriptMeta.textContent = `${visibleLines.length} matching dialogue lines`;
        }

        if (visibleLines.length === 0) {
            this.elements.scriptContent.innerHTML = '<p class="friends-episode-empty">No dialogue lines match the current character selection.</p>';
        } else {
            this.elements.scriptContent.innerHTML = visibleLines.map(renderLine).join('');
        }

        this.updateRoleplayButton();
    }

    updateRoleplayButton() {
        const matchingCount = this.filteredDialogueIndexes.length;
        const button = this.elements.roleplayBtn;
        const hasSelection = this.selectedCharacters.size > 0;

        button.disabled = !hasSelection || matchingCount === 0;
        button.textContent = hasSelection
            ? `Role-play Typing Mode (${matchingCount} lines)`
            : 'Role-play Typing Mode';
    }

    buildRoleplaySession() {
        const prompts = this.filteredDialogueIndexes.map((lineIndex) => {
            const targetLine = this.episode.lines[lineIndex];
            const contextBefore = this.collectContextLines(lineIndex, 'before');
            const contextAfter = this.collectContextLines(lineIndex, 'after');
            return {
                episodeId: this.episode.id,
                episodeCode: this.episode.episodeCode,
                episodeTitle: this.episode.title,
                lineIndex,
                speakerLabel: targetLine.speakerLabel,
                speakerIds: targetLine.speakerIds,
                targetText: normalizeApostrophes(targetLine.text),
                sceneText: normalizeApostrophes(this.findNearestScene(lineIndex)),
                contextBefore,
                contextAfter
            };
        });

        return {
            episodeId: this.episode.id,
            episodeCode: this.episode.episodeCode,
            episodeTitle: this.episode.title,
            selectedCharacters: Array.from(this.selectedCharacters),
            selectedCharacterLabels: this.episode.characters
                .filter((character) => this.selectedCharacters.has(character.id))
                .map((character) => character.label),
            prompts
        };
    }

    findNearestScene(startIndex) {
        for (let index = startIndex; index >= 0; index -= 1) {
            const line = this.episode.lines[index];
            if (line && line.type === 'scene') {
                return normalizeApostrophes(line.text);
            }
        }

        return '';
    }

    collectContextLines(lineIndex, direction, limit = MAX_ROLEPLAY_CONTEXT_LINES) {
        const lines = Array.isArray(this.episode.lines) ? this.episode.lines : [];
        const contextLines = [];

        if (direction === 'before') {
            for (let index = lineIndex - 1; index >= 0 && contextLines.length < limit; index -= 1) {
                const line = lines[index];
                if (!line || line.type === 'scene') {
                    continue;
                }
                contextLines.push(line);
            }

            return contextLines.reverse();
        }

        for (let index = lineIndex + 1; index < lines.length && contextLines.length < limit; index += 1) {
            const line = lines[index];
            if (!line || line.type === 'scene') {
                continue;
            }
            contextLines.push(line);
        }

        return contextLines;
    }

    attachEvents() {
        this.elements.characterButtons.addEventListener('click', (event) => {
            const button = event.target.closest('[data-speaker-id]');
            if (!button) {
                return;
            }

            const speakerId = button.getAttribute('data-speaker-id');
            if (!speakerId) {
                return;
            }

            if (this.selectedCharacters.has(speakerId)) {
                this.selectedCharacters.delete(speakerId);
            } else {
                this.selectedCharacters.add(speakerId);
            }

            this.persistSelection();
            this.renderCharacters();
            this.renderScript();
        });

        this.elements.roleplayBtn.addEventListener('click', () => {
            if (this.elements.roleplayBtn.disabled) {
                return;
            }

            const session = this.buildRoleplaySession();
            sessionStorage.setItem(FRIENDS_ROLEPLAY_SESSION_KEY, JSON.stringify(session));
            window.location.href = '/friends-roleplay-typing.html';
        });
    }

    fail(message) {
        this.elements.episodeCode.textContent = 'Unavailable';
        this.elements.episodeTitle.textContent = 'Friends Episode Reader';
        this.elements.episodeSummary.textContent = message;
        this.elements.characterButtons.innerHTML = '';
        this.elements.scriptMeta.textContent = '';
        this.elements.scriptContent.innerHTML = `<p class="friends-episode-empty">${escapeHtml(message)}</p>`;
        this.elements.roleplayBtn.disabled = true;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const reader = new FriendsEpisodeReader();
    reader.initialize();
});
