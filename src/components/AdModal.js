import React, { useState, useEffect } from 'react';

const AdModal = ({ 
  isOpen, 
  onClose, 
  onAdWatched, 
  onDecline, 
  activeTime,
  canSkip = false 
}) => {
  const [adWatching, setAdWatching] = useState(false);
  const [adCompleted, setAdCompleted] = useState(false);
  const [countdown, setCountdown] = useState(30); // 30 second ad simulation
  const [skipCountdown, setSkipCountdown] = useState(5); // Can skip after 5 seconds

  useEffect(() => {
    if (adWatching && countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(countdown - 1);
        if (skipCountdown > 0) {
          setSkipCountdown(skipCountdown - 1);
        }
      }, 1000);
      return () => clearTimeout(timer);
    } else if (adWatching && countdown === 0) {
      setAdCompleted(true);
    }
  }, [adWatching, countdown, skipCountdown]);

  const handleWatchAd = () => {
    setAdWatching(true);
    setCountdown(30);
    setSkipCountdown(5);
  };

  const handleSkipAd = () => {
    if (skipCountdown <= 0 || canSkip) {
      setAdCompleted(true);
    }
  };

  const handleAdComplete = () => {
    onAdWatched();
    setAdWatching(false);
    setAdCompleted(false);
    setCountdown(30);
    setSkipCountdown(5);
  };

  const formatTime = (ms) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}m ${seconds}s`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
        {!adWatching && !adCompleted && (
          <>
            <div className="text-center mb-6">
              <h2 className="text-xl font-bold text-black mb-2">
                Keep Learning with VocabKiller!
              </h2>
              <p className="text-black mb-4">
                You've been actively learning for <strong>{formatTime(activeTime)}</strong>! 
                To continue using VocabKiller for free, please watch a short ad.
              </p>
              <div className="bg-white p-3 mb-4">
                <p className="text-sm text-black">
                  <strong>Why ads?</strong> They help us keep VocabKiller free and continuously improve your learning experience!
                </p>
              </div>
            </div>
            
            <div className="flex flex-col gap-3">
              <button
                onClick={handleWatchAd}
                className="w-full bg-white hover:bg-black hover:text-white text-black font-medium py-3 px-4 border border-gray-300 transition-colors"
              >
                Watch Ad (30 seconds)
              </button>
              
              <button
                onClick={onDecline}
                className="w-full bg-white hover:bg-black hover:text-white text-black font-medium py-2 px-4 border border-gray-300 transition-colors text-sm"
              >
                Maybe Later
              </button>
            </div>
            
            <p className="text-xs text-black text-center mt-4">
              Ads help us provide VocabKiller for free to learners worldwide
            </p>
          </>
        )}

        {adWatching && !adCompleted && (
          <div className="text-center">
            <h3 className="text-lg font-bold text-black mb-4">Advertisement</h3>
            
            {/* Simulated Ad Content */}
            <div className="bg-white h-48 flex items-center justify-center mb-4 border border-gray-300">
              <div className="text-center">
                <p className="text-black font-medium">Sample Advertisement</p>
                <p className="text-sm text-black">Learn English with Premium Courses</p>
                <div className="mt-4">
                  <div className="text-2xl font-bold text-black">{countdown}s</div>
                  <div className="w-full bg-gray-200 h-2 mt-2">
                    <div 
                      className="bg-black h-2 transition-all duration-1000"
                      style={{ width: `${((30 - countdown) / 30) * 100}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>

            {skipCountdown <= 0 && (
              <button
                onClick={handleSkipAd}
                className="bg-white hover:bg-black hover:text-white text-black px-4 py-2 border border-gray-300 text-sm transition-colors"
              >
                Skip Ad
              </button>
            )}
            
            {skipCountdown > 0 && (
              <p className="text-sm text-black">
                Skip available in {skipCountdown}s
              </p>
            )}
          </div>
        )}

        {adCompleted && (
          <div className="text-center">
            <h3 className="text-lg font-bold text-black mb-2">Thank You!</h3>
            <p className="text-black mb-4">
              You can now continue learning with VocabKiller for another 15 minutes!
            </p>
            <button
              onClick={handleAdComplete}
              className="bg-white hover:bg-black hover:text-white text-black font-medium py-3 px-6 border border-gray-300 transition-colors"
            >
              Continue Learning
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdModal;