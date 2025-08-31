import React from 'react';

const UsageLimitModal = ({ 
  isOpen, 
  onWatchAd, 
  onClose,
  timeUntilReset = 300000 // 5 minutes default
}) => {
  const formatTime = (ms) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
        <div className="text-center">
          <h2 className="text-xl font-bold text-black mb-3">
            Usage Limit Reached
          </h2>
          <p className="text-black mb-4">
            You've reached your free usage limit. To continue learning immediately, 
            please watch a short advertisement.
          </p>
          
          <div className="bg-white border border-gray-300 p-4 mb-4">
            <p className="text-sm text-black">
              <strong>Alternative:</strong> Wait {formatTime(timeUntilReset)} for your free time to reset, 
              or watch an ad to continue now.
            </p>
          </div>

          <div className="flex flex-col gap-3">
            <button
              onClick={onWatchAd}
              className="w-full bg-white hover:bg-black hover:text-white text-black font-medium py-3 px-4 border border-gray-300 transition-colors"
            >
              Watch Ad & Continue
            </button>
            
            <button
              onClick={onClose}
              className="w-full bg-white hover:bg-black hover:text-white text-black font-medium py-2 px-4 border border-gray-300 transition-colors"
            >
              I'll Wait
            </button>
          </div>

          <div className="mt-4 p-3 bg-white border border-gray-300">
            <p className="text-xs text-black">
              <strong>Pro Tip:</strong> Watching ads helps us keep VocabKiller completely free 
              and supports continuous improvements to your learning experience!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UsageLimitModal;