// Universal Session Timer for all VocabKiller pages
// This script runs on all pages (homepage and subpages) to maintain consistent timing

class UniversalActivityTracker {
  constructor() {
    this.adPromptInterval = 15 * 60 * 1000; // 15 minutes for production
    
    // TEMPORARY: Clear stuck session for immediate fix
    const saved = localStorage.getItem('vocabkiller_session_state');
    if (saved) {
      const state = JSON.parse(saved);
      const totalElapsed = Date.now() - (state.sessionStartTime || Date.now());
      if (totalElapsed > 60 * 60 * 1000) { // If > 1 hour, clear it
        console.log('🧹 [Universal] Clearing stuck session older than 1 hour');
        localStorage.removeItem('vocabkiller_session_state');
      }
    }
    
    // Load existing state FIRST before setting any defaults
    this.loadState();
    
    // Start tracking
    this.startTracking();
    
    // Create floating timer
    this.createFloatingTimer();
    
    // Save state periodically and update timer
    this.saveInterval = setInterval(() => {
      this.saveState();
      this.updateFloatingTimer();
    }, 1000);
    
    // Check for ad prompt periodically
    this.checkInterval = setInterval(() => {
      this.checkForAdPrompt();
    }, 10000); // Check every 10 seconds
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
          console.log('🔧 [Universal] Detected stuck timer state - forcing reset');
          this.adWatched = false; // Reset to allow ad modal to show again
          this.sessionStartTime = Date.now(); // Reset timer
          this.saveState();
        }
        
        console.log('📊 [Universal] Loaded session state:', {
          adWatched: this.adWatched,
          sessionAge: this.formatTime(Date.now() - this.sessionStartTime),
          page: window.location.pathname
        });
      } else {
        // Initialize new state only if no saved state exists
        this.adWatched = false;
        this.sessionStartTime = Date.now();
        console.log('🆕 [Universal] Initialized new session state on', window.location.pathname);
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
        lastSaved: Date.now(),
        lastPage: window.location.pathname
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
    console.log('🎯 [Universal] Ad prompt triggered! Session time:', this.formatTime(totalElapsedTime));
    // DON'T set adWatched = true here - only set it when ad is actually completed
    this.saveState();
    
    // Show ad modal directly on current page
    const currentPage = window.location.pathname;
    if (currentPage !== '/') {
      // On subpages, show universal ad modal
      this.showUniversalAdModal();
    } else {
      // On homepage, trigger React ad modal
      this.showAdModal();
    }
  }

  showAdModal() {
    // This will be handled by the React app on homepage
    const totalElapsedTime = Date.now() - this.sessionStartTime;
    window.dispatchEvent(new CustomEvent('vocabkiller-show-ad', {
      detail: {
        sessionTime: totalElapsedTime,
        formattedSessionTime: this.formatTime(totalElapsedTime)
      }
    }));
  }

  showUniversalAdModal() {
    // Create and show ad modal directly on subpages
    this.createAdModal();
  }

  createAdModal() {
    // Remove any existing modal
    const existingModal = document.getElementById('vocabkiller-ad-modal');
    if (existingModal) {
      existingModal.remove();
    }

    // Create modal overlay
    const modalOverlay = document.createElement('div');
    modalOverlay.id = 'vocabkiller-ad-modal';
    modalOverlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.8);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 10000;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    `;

    // Create modal content
    const modalContent = document.createElement('div');
    modalContent.style.cssText = `
      background: white;
      border-radius: 12px;
      padding: 24px;
      max-width: 500px;
      width: 90%;
      max-height: 80vh;
      overflow-y: auto;
      position: relative;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
    `;

    this.adWatching = false;
    this.adCompleted = false;
    this.countdown = 30;
    this.skipCountdown = 5;
    
    // Modal HTML content
    this.updateModalContent(modalContent);

    modalOverlay.appendChild(modalContent);
    document.body.appendChild(modalOverlay);

    // Setup ad event handlers
    this.setupAdHandlers();
    
    // Store references
    this.modalContent = modalContent;
    this.modalOverlay = modalOverlay;
  }

  updateModalContent(modalContent) {
    if (!this.adWatching && !this.adCompleted) {
      // Initial state - show ad prompt (matching homepage)
      modalContent.innerHTML = `
        <div style="text-align: center;">
          <h2 style="margin: 0 0 16px 0; color: #000; font-size: 20px; font-weight: bold;">
            Keep Learning with VocabKiller!
          </h2>
          <p style="margin: 0 0 16px 0; color: #000; font-size: 16px;">
            You've been learning for <strong>${this.formatTime(Date.now() - this.sessionStartTime)}</strong>! 
            To continue using VocabKiller for free, please watch a short ad.
          </p>
          <div style="background: #fff; padding: 12px; margin-bottom: 16px; border: 1px solid #d1d5db;">
            <p style="font-size: 14px; color: #000; margin: 0;">
              <strong>Why ads?</strong> They help us keep VocabKiller free and continuously improve your learning experience!
            </p>
          </div>
          
          <div style="display: flex; flex-direction: column; gap: 12px;">
            <button
              id="vocabkiller-watch-ad-btn"
              style="
                width: 100%;
                background: #fff;
                color: #000;
                font-weight: 500;
                padding: 12px 16px;
                border: 1px solid #d1d5db;
                transition: all 0.3s;
                cursor: pointer;
                font-size: 16px;
              "
              onmouseover="this.style.background='#000'; this.style.color='#fff';"
              onmouseout="this.style.background='#fff'; this.style.color='#000';"
            >
              Watch Ad (30 seconds)
            </button>
            
            <button
              id="vocabkiller-decline-btn"
              style="
                width: 100%;
                background: #fff;
                color: #000;
                font-weight: 500;
                padding: 8px 16px;
                border: 1px solid #d1d5db;
                transition: all 0.3s;
                cursor: pointer;
                font-size: 14px;
              "
              onmouseover="this.style.background='#000'; this.style.color='#fff';"
              onmouseout="this.style.background='#fff'; this.style.color='#000';"
            >
              Maybe Later
            </button>
          </div>
          
          <p style="font-size: 12px; color: #000; text-align: center; margin: 16px 0 0 0;">
            Ads help us provide VocabKiller for free to learners worldwide
          </p>
        </div>
      `;
    } else if (this.adWatching && !this.adCompleted) {
      // Watching ad state (matching homepage)
      modalContent.innerHTML = `
        <div style="text-align: center;">
          <h3 style="margin: 0 0 16px 0; color: #000; font-size: 18px; font-weight: bold;">Advertisement</h3>
          
          <div style="background: #fff; height: 192px; display: flex; align-items: center; justify-content: center; margin-bottom: 16px; border: 1px solid #d1d5db;">
            <div style="text-align: center;">
              <p style="color: #000; font-weight: 500; margin: 0 0 8px 0;">Sample Advertisement</p>
              <p style="font-size: 14px; color: #000; margin: 0 0 16px 0;">Learn English with Premium Courses</p>
              <div style="margin-top: 16px;">
                <div style="font-size: 32px; font-weight: bold; color: #000;">${this.countdown}s</div>
                <div style="width: 200px; background: #e5e7eb; height: 8px; margin: 8px auto; border-radius: 4px; overflow: hidden;">
                  <div 
                    id="vocabkiller-progress-bar"
                    style="
                      background: #000; 
                      height: 100%; 
                      width: ${((30 - this.countdown) / 30) * 100}%; 
                      transition: width 1s ease;
                      border-radius: 4px;
                    "
                  ></div>
                </div>
              </div>
            </div>
          </div>

          ${this.skipCountdown <= 0 ? `
            <button
              id="vocabkiller-skip-btn"
              style="
                background: #fff;
                color: #000;
                padding: 8px 16px;
                border: 1px solid #d1d5db;
                font-size: 14px;
                transition: all 0.3s;
                cursor: pointer;
              "
              onmouseover="this.style.background='#000'; this.style.color='#fff';"
              onmouseout="this.style.background='#fff'; this.style.color='#000';"
            >
              Skip Ad
            </button>
          ` : `
            <p style="font-size: 14px; color: #000; margin: 0;">
              Skip available in ${this.skipCountdown}s
            </p>
          `}
        </div>
      `;
    } else if (this.adCompleted) {
      // Ad completed state (matching homepage)
      modalContent.innerHTML = `
        <div style="text-align: center;">
          <h3 style="margin: 0 0 8px 0; color: #000; font-size: 18px; font-weight: bold;">Thank You!</h3>
          <p style="color: #000; margin-bottom: 16px; font-size: 16px;">
            You can now continue learning with VocabKiller for another 15 minutes!
          </p>
          <button
            id="vocabkiller-continue-btn"
            style="
              background: #fff;
              color: #000;
              font-weight: 500;
              padding: 12px 24px;
              border: 1px solid #d1d5db;
              border-radius: 8px;
              font-size: 16px;
              font-weight: 600;
              cursor: pointer;
              transition: all 0.3s;
            "
            onmouseover="this.style.background='#000'; this.style.color='#fff';"
            onmouseout="this.style.background='#fff'; this.style.color='#000';"
          >
            Continue Learning
          </button>
        </div>
      `;
    }
  }

  setupAdHandlers() {
    // Setup event handlers based on current state
    if (!this.adWatching && !this.adCompleted) {
      // Initial state handlers
      const watchBtn = document.getElementById('vocabkiller-watch-ad-btn');
      const declineBtn = document.getElementById('vocabkiller-decline-btn');
      
      if (watchBtn) {
        watchBtn.addEventListener('click', () => this.handleWatchAd());
      }
      
      if (declineBtn) {
        declineBtn.addEventListener('click', () => this.handleDeclineAd());
      }
    } else if (this.adWatching && !this.adCompleted) {
      // Ad watching state handlers
      const skipBtn = document.getElementById('vocabkiller-skip-btn');
      if (skipBtn && this.skipCountdown <= 0) {
        skipBtn.addEventListener('click', () => this.handleSkipAd());
      }
      
      // Start countdown timer
      this.startAdCountdown();
    } else if (this.adCompleted) {
      // Ad completed state handlers
      const continueBtn = document.getElementById('vocabkiller-continue-btn');
      if (continueBtn) {
        continueBtn.addEventListener('click', () => this.handleAdComplete());
      }
    }
  }

  handleWatchAd() {
    this.adWatching = true;
    this.countdown = 30;
    this.skipCountdown = 5;
    this.updateModalContent(this.modalContent);
    this.setupAdHandlers();
  }

  handleDeclineAd() {
    // Redirect to homepage with usage limit
    window.location.href = '/?usageLimited=true';
  }

  handleSkipAd() {
    if (this.skipCountdown <= 0) {
      this.adCompleted = true;
      this.updateModalContent(this.modalContent);
      this.setupAdHandlers();
    }
  }

  handleAdComplete() {
    // Remove modal
    const modal = document.getElementById('vocabkiller-ad-modal');
    if (modal) {
      modal.remove();
    }
    
    // Reset timer and continue on same page
    this.resetAdTimer();
  }

  startAdCountdown() {
    this.adTimer = setInterval(() => {
      this.countdown--;
      if (this.skipCountdown > 0) {
        this.skipCountdown--;
      }
      
      // Update the display
      this.updateModalContent(this.modalContent);
      this.setupAdHandlers();
      
      if (this.countdown <= 0) {
        this.adCompleted = true;
        clearInterval(this.adTimer);
        this.updateModalContent(this.modalContent);
        this.setupAdHandlers();
      }
    }, 1000);
  }

  handleAdWatched() {
    console.log('🎉 [Universal] Ad watched successfully on', window.location.pathname);
    
    // Remove modal
    const modal = document.getElementById('vocabkiller-ad-modal');
    if (modal) {
      modal.remove();
    }
    
    // Reset timer and continue on same page
    this.resetAdTimer();
  }

  resetAdTimer() {
    console.log('🔄 [Universal] Ad timer reset');
    this.adWatched = true; // Mark as watched after completing ad
    this.sessionStartTime = Date.now();
    this.saveState();
  }

  markAdAsWatched() {
    console.log('✅ [Universal] Ad marked as watched');
    this.adWatched = true;
    this.saveState();
  }

  formatTime(milliseconds) {
    const minutes = Math.floor(milliseconds / 60000);
    const seconds = Math.floor((milliseconds % 60000) / 1000);
    return `${minutes}m ${seconds}s`;
  }

  startTracking() {
    // No activity tracking needed for session-based timer
  }

  stopTracking() {
    if (this.saveInterval) {
      clearInterval(this.saveInterval);
    }
    
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
    }
    
    this.saveState();
  }

  getStats() {
    // Calculate total elapsed session time
    const totalElapsedTime = Date.now() - this.sessionStartTime;
    
    return {
      sessionTime: totalElapsedTime,
      formattedSessionTime: this.formatTime(totalElapsedTime),
      adWatched: this.adWatched,
      timeUntilAd: Math.max(0, this.adPromptInterval - totalElapsedTime),
      formattedTimeUntilAd: this.formatTime(Math.max(0, this.adPromptInterval - totalElapsedTime))
    };
  }

  createFloatingTimer() {
    // Load saved position
    let position = { x: 16, y: window.innerHeight - 120 };
    try {
      const saved = localStorage.getItem('vocabkiller_timer_position');
      if (saved) {
        position = JSON.parse(saved);
      }
    } catch (error) {
      console.log('Error loading timer position:', error);
    }

    // Create timer element
    const timer = document.createElement('div');
    timer.id = 'vocabkiller-floating-timer';
    timer.style.cssText = `
      position: fixed;
      left: ${position.x}px;
      top: ${position.y}px;
      z-index: 1000;
      cursor: grab;
      user-select: none;
      transition: opacity 0.3s ease;
      opacity: 0.75;
      font-family: monospace;
    `;

    timer.innerHTML = `
      <div style="
        background: white;
        color: black;
        border: 1px solid #d1d5db;
        border-radius: 8px;
        padding: 8px;
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        font-size: 12px;
      ">
        <div>Until ad: <span id="vocabkiller-until-ad" style="font-weight: bold;">15m 0s</span></div>
      </div>
    `;

    // Add drag functionality
    this.setupTimerDrag(timer, position);

    document.body.appendChild(timer);
    this.floatingTimer = timer;

    // Initial update
    this.updateFloatingTimer();
  }

  setupTimerDrag(timer, initialPosition) {
    let isDragging = false;
    let dragOffset = { x: 0, y: 0 };
    let currentPosition = { ...initialPosition };

    const handleStart = (e) => {
      isDragging = true;
      const clientX = e.clientX || (e.touches && e.touches[0].clientX);
      const clientY = e.clientY || (e.touches && e.touches[0].clientY);
      const rect = timer.getBoundingClientRect();
      
      dragOffset = {
        x: clientX - rect.left,
        y: clientY - rect.top
      };
      
      timer.style.cursor = 'grabbing';
      timer.style.opacity = '0.9';
      e.preventDefault();
    };

    const handleMove = (e) => {
      if (!isDragging) return;

      const clientX = e.clientX || (e.touches && e.touches[0].clientX);
      const clientY = e.clientY || (e.touches && e.touches[0].clientY);

      if (clientX && clientY) {
        const newX = Math.max(0, Math.min(window.innerWidth - 160, clientX - dragOffset.x));
        const newY = Math.max(0, Math.min(window.innerHeight - 100, clientY - dragOffset.y));
        
        currentPosition = { x: newX, y: newY };
        timer.style.left = newX + 'px';
        timer.style.top = newY + 'px';
      }
    };

    const handleEnd = () => {
      if (isDragging) {
        isDragging = false;
        timer.style.cursor = 'grab';
        timer.style.opacity = '0.75';
        
        // Save position
        localStorage.setItem('vocabkiller_timer_position', JSON.stringify(currentPosition));
      }
    };

    // Mouse events
    timer.addEventListener('mousedown', handleStart);
    document.addEventListener('mousemove', handleMove);
    document.addEventListener('mouseup', handleEnd);

    // Touch events
    timer.addEventListener('touchstart', handleStart, { passive: false });
    document.addEventListener('touchmove', handleMove, { passive: false });
    document.addEventListener('touchend', handleEnd);

    // Hover effects
    timer.addEventListener('mouseenter', () => {
      if (!isDragging) timer.style.opacity = '1';
    });
    timer.addEventListener('mouseleave', () => {
      if (!isDragging) timer.style.opacity = '0.75';
    });
  }

  updateFloatingTimer() {
    if (!this.floatingTimer) return;

    const stats = this.getStats();
    const untilAdElement = document.getElementById('vocabkiller-until-ad');

    if (untilAdElement) untilAdElement.textContent = stats.formattedTimeUntilAd;
  }
}

// Initialize tracker when page loads
let universalTracker;

document.addEventListener('DOMContentLoaded', function() {
  universalTracker = new UniversalActivityTracker();
  
  // Production mode - no debug panel
});

// Clean up when page unloads
window.addEventListener('beforeunload', function() {
  if (universalTracker) {
    universalTracker.stopTracking();
  }
});

