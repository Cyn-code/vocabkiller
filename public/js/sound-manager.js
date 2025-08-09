class SoundManager {
    constructor() {
        this.sounds = {};
        this.enabled = false; // Default disabled
        this.currentType = 1;
        this.volume = 50;
        this.isLoaded = false;
        this.loadSounds();
        this.loadSettings();
    }

    async loadSounds() {
        try {
            const soundFiles = [
                { key: 1, file: '/sounds/TypingSound01.mp3' },
                { key: 2, file: '/sounds/TypingSound02.mp3' },
                { key: 3, file: '/sounds/TypingSound03.mp3' },
                { key: 4, file: '/sounds/TypingSound04.mp3' },
                { key: 5, file: '/sounds/TypingSound05.mp3' },
                { key: 6, file: '/sounds/TypingSound06.mp3' },
                { key: 7, file: '/sounds/TypingSound07.mp3' }
            ];

            for (const sound of soundFiles) {
                const audio = new Audio(sound.file);
                audio.preload = 'auto';
                this.sounds[sound.key] = audio;
            }

            this.isLoaded = true;
            console.log('SoundManager: All sounds loaded successfully');
        } catch (error) {
            console.warn('SoundManager: Error loading sounds', error);
            this.isLoaded = false;
        }
    }

    playTypingSound() {
        try {
            if (!this.enabled || !this.isLoaded) {
                return;
            }

            const sound = this.sounds[this.currentType];
            if (sound) {
                // Clone the audio to allow overlapping sounds
                const audioClone = sound.cloneNode();
                audioClone.volume = this.volume / 100;
                audioClone.play().catch(error => {
                    console.warn('SoundManager: Error playing sound', error);
                });
            }
        } catch (error) {
            console.warn('SoundManager: Error in playTypingSound', error);
        }
    }

    setEnabled(enabled) {
        this.enabled = enabled;
        this.saveSettings();
    }

    setSoundType(type) {
        if (type >= 1 && type <= 7) {
            this.currentType = type;
            this.saveSettings();
        }
    }

    setVolume(volume) {
        if (volume >= 0 && volume <= 100) {
            this.volume = volume;
            this.saveSettings();
        }
    }

    loadSettings() {
        try {
            const enabled = localStorage.getItem('typingSoundEnabled');
            const type = localStorage.getItem('typingSoundType');
            const volume = localStorage.getItem('typingSoundVolume');

            if (enabled !== null) {
                this.enabled = enabled === 'true';
            }
            if (type !== null) {
                this.currentType = parseInt(type);
            }
            if (volume !== null) {
                this.volume = parseInt(volume);
            }
        } catch (error) {
            console.warn('SoundManager: Error loading settings', error);
        }
    }

    saveSettings() {
        try {
            localStorage.setItem('typingSoundEnabled', this.enabled.toString());
            localStorage.setItem('typingSoundType', this.currentType.toString());
            localStorage.setItem('typingSoundVolume', this.volume.toString());
        } catch (error) {
            console.warn('SoundManager: Error saving settings', error);
        }
    }

    getSettings() {
        return {
            enabled: this.enabled,
            currentType: this.currentType,
            volume: this.volume,
            isLoaded: this.isLoaded
        };
    }
} 