class SoundManager {
    constructor() {
        this.soundFiles = {
            1: '/sounds/TypingSound01.mp3',
            2: '/sounds/TypingSound02.mp3',
            3: '/sounds/TypingSound03.mp3',
            4: '/sounds/TypingSound04.mp3',
            5: '/sounds/TypingSound05.mp3',
            6: '/sounds/TypingSound06.mp3',
            7: '/sounds/TypingSound07.mp3'
        };
        this.poolSize = 6;
        this.sounds = {};
        this.enabled = false;
        this.currentType = 1;
        this.volume = 50;
        this.isLoaded = false;
        this.loadSounds();
        this.loadSettings();
    }

    loadSounds() {
        try {
            Object.entries(this.soundFiles).forEach(([key, file]) => {
                const pool = [];
                for (let index = 0; index < this.poolSize; index += 1) {
                    const audio = new Audio(file);
                    audio.preload = 'auto';
                    audio.playsInline = true;
                    audio.load();
                    pool.push(audio);
                }

                this.sounds[key] = {
                    pool,
                    nextIndex: 0
                };
            });

            this.isLoaded = true;
            console.log('SoundManager: All sounds loaded successfully');
        } catch (error) {
            console.warn('SoundManager: Error loading sounds', error);
            this.isLoaded = false;
        }
    }

    getPooledSound(type) {
        const soundEntry = this.sounds[type] || this.sounds[this.currentType];
        if (!soundEntry || !Array.isArray(soundEntry.pool) || soundEntry.pool.length === 0) {
            return null;
        }

        const audio = soundEntry.pool[soundEntry.nextIndex];
        soundEntry.nextIndex = (soundEntry.nextIndex + 1) % soundEntry.pool.length;
        return audio;
    }

    playTypingSound(type = this.currentType, volume = this.volume / 100, forcePlay = false) {
        try {
            const hasExplicitOverrides = arguments.length > 0;
            const selectedType = Number.isFinite(Number(type)) ? Number(type) : this.currentType;
            const normalizedVolume = typeof volume === 'number'
                ? Math.max(0, Math.min(1, volume > 1 ? volume / 100 : volume))
                : this.volume / 100;

            if ((!this.enabled && !forcePlay && !hasExplicitOverrides) || !this.isLoaded) {
                return;
            }

            const sound = this.getPooledSound(selectedType);
            if (!sound) {
                return;
            }

            sound.pause();
            sound.currentTime = 0;
            sound.volume = normalizedVolume;

            const playPromise = sound.play();
            if (playPromise && typeof playPromise.catch === 'function') {
                playPromise.catch((error) => {
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
                this.currentType = parseInt(type, 10);
            }
            if (volume !== null) {
                this.volume = parseInt(volume, 10);
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
