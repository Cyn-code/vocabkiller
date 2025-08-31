// Session Timer for 15-minute ad prompt system - Cross-page tracking
class ActivityTracker {
  constructor(onAdPromptTrigger) {
    // TEMPORARY: Clear stuck session for immediate fix
    const saved = localStorage.getItem('vocabkiller_session_state');
    if (saved) {
      const state = JSON.parse(saved);
      const totalElapsed = Date.now() - (state.sessionStartTime || Date.now());
      if (totalElapsed > 60 * 60 * 1000) { // If > 1 hour, clear it
        console.log('🧹 Clearing stuck session older than 1 hour');
        localStorage.removeItem('vocabkiller_session_state');
      }
    }
    
    // Load existing state from localStorage or initialize
    this.loadState();
    
    this.adPromptInterval = 15 * 60 * 1000; // 15 minutes for production
    this.onAdPromptTrigger = onAdPromptTrigger;
    
    // Bind methods
    this.startTracking = this.startTracking.bind(this);
    this.stopTracking = this.stopTracking.bind(this);
    
    // Start tracking immediately
    this.startTracking();
    
    // Save state periodically
    this.saveInterval = setInterval(() => {
      this.saveState();
    }, 5000); // Save every 5 seconds
  }

  loadState() {
    try {
      const saved = localStorage.getItem('vocabkiller_session_state');
      if (saved) {
        const state = JSON.parse(saved);
        this.adWatched = state.adWatched || false;
        this.sessionStartTime = state.sessionStartTime || Date.now();
        
        // Check for stuck state: if adWatched is true but session time > 15 minutes
        const totalElapsedTime = Date.now() - this.sessionStartTime;
        if (this.adWatched && totalElapsedTime >= this.adPromptInterval) {
          console.log('🔧 Detected stuck timer state - forcing reset');
          this.adWatched = false; // Reset to allow ad modal to show again
          this.sessionStartTime = Date.now(); // Reset timer
          this.saveState();
        }
        
        console.log('📊 Loaded session state:', {
          adWatched: this.adWatched,
          sessionAge: this.formatTime(Date.now() - this.sessionStartTime)
        });
      } else {
        // Initialize new state
        this.adWatched = false;
        this.sessionStartTime = Date.now();
        console.log('🆕 Initialized new session state');
      }
    } catch (error) {
      console.error('Error loading session state:', error);
      // Fallback to default values
      this.adWatched = false;
      this.sessionStartTime = Date.now();
    }
  }

  saveState() {
    try {
      const state = {
        adWatched: this.adWatched,
        sessionStartTime: this.sessionStartTime,
        lastSaved: Date.now()
      };
      localStorage.setItem('vocabkiller_session_state', JSON.stringify(state));
    } catch (error) {
      console.error('Error saving session state:', error);
    }
  }

  checkForAdPrompt() {
    const totalElapsedTime = Date.now() - this.sessionStartTime;
    if (totalElapsedTime >= this.adPromptInterval && !this.adWatched) {
      this.triggerAdPrompt();
    }
  }

  triggerAdPrompt() {
    const totalElapsedTime = Date.now() - this.sessionStartTime;
    console.log('🎯 Ad prompt triggered! Session time:', this.formatTime(totalElapsedTime));
    // DON'T set adWatched = true here - only set it when ad is actually completed
    if (this.onAdPromptTrigger) {
      this.onAdPromptTrigger({
        sessionTime: totalElapsedTime,
        formattedSessionTime: this.formatTime(totalElapsedTime)
      });
    }
  }

  resetAdTimer() {
    console.log('🔄 Ad timer reset');
    this.adWatched = true; // Mark as watched after completing ad
    this.sessionStartTime = Date.now();
    this.saveState(); // Save the reset state
  }

  markAdAsWatched() {
    console.log('✅ Ad marked as watched');
    this.adWatched = true;
    this.saveState();
  }

  formatTime(milliseconds) {
    const minutes = Math.floor(milliseconds / 60000);
    const seconds = Math.floor((milliseconds % 60000) / 1000);
    return `${minutes}m ${seconds}s`;
  }

  startTracking() {
    // Check for ad prompt every 10 seconds
    this.checkInterval = setInterval(() => {
      this.checkForAdPrompt();
    }, 10000);
  }

  stopTracking() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
    }
    
    if (this.saveInterval) {
      clearInterval(this.saveInterval);
    }
    
    // Save final state before stopping
    this.saveState();
  }

  getStats() {
    // Calculate total elapsed session time
    const totalElapsedTime = Date.now() - this.sessionStartTime;
    
    const stats = {
      sessionTime: totalElapsedTime,
      formattedSessionTime: this.formatTime(totalElapsedTime),
      adWatched: this.adWatched,
      timeUntilAd: Math.max(0, this.adPromptInterval - totalElapsedTime),
      formattedTimeUntilAd: this.formatTime(Math.max(0, this.adPromptInterval - totalElapsedTime))
    };
    
    return stats;
  }
}

export default ActivityTracker;