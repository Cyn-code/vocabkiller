import React, { useState, useEffect, useRef } from 'react';

const FloatingTimer = ({ stats }) => {
  const [position, setPosition] = useState({ x: 16, y: window.innerHeight - 120 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const timerRef = useRef(null);

  // Load saved position from localStorage
  useEffect(() => {
    const savedPosition = localStorage.getItem('vocabkiller_timer_position');
    if (savedPosition) {
      try {
        const pos = JSON.parse(savedPosition);
        setPosition(pos);
      } catch (error) {
        console.log('Error loading timer position:', error);
      }
    }
  }, []);

  // Save position to localStorage
  const savePosition = (newPosition) => {
    localStorage.setItem('vocabkiller_timer_position', JSON.stringify(newPosition));
  };

  // Handle mouse drag start
  const handleMouseDown = (e) => {
    setIsDragging(true);
    const rect = timerRef.current.getBoundingClientRect();
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    });
    e.preventDefault();
  };

  // Handle touch drag start
  const handleTouchStart = (e) => {
    setIsDragging(true);
    const rect = timerRef.current.getBoundingClientRect();
    const touch = e.touches[0];
    setDragOffset({
      x: touch.clientX - rect.left,
      y: touch.clientY - rect.top
    });
    e.preventDefault();
  };

  // Handle drag move
  useEffect(() => {
    const handleMove = (e) => {
      if (!isDragging) return;

      const clientX = e.clientX || (e.touches && e.touches[0].clientX);
      const clientY = e.clientY || (e.touches && e.touches[0].clientY);

      if (clientX && clientY) {
        const newX = Math.max(0, Math.min(window.innerWidth - 160, clientX - dragOffset.x));
        const newY = Math.max(0, Math.min(window.innerHeight - 100, clientY - dragOffset.y));
        
        const newPosition = { x: newX, y: newY };
        setPosition(newPosition);
      }
    };

    const handleEnd = () => {
      if (isDragging) {
        setIsDragging(false);
        savePosition(position);
      }
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMove);
      document.addEventListener('mouseup', handleEnd);
      document.addEventListener('touchmove', handleMove, { passive: false });
      document.addEventListener('touchend', handleEnd);
    }

    return () => {
      document.removeEventListener('mousemove', handleMove);
      document.removeEventListener('mouseup', handleEnd);
      document.removeEventListener('touchmove', handleMove);
      document.removeEventListener('touchend', handleEnd);
    };
  }, [isDragging, dragOffset, position]);

  // Don't show timer if no stats yet
  if (!stats || (stats.sessionTime === undefined && stats.activeTime === undefined)) {
    return null;
  }

  return (
    <div
      ref={timerRef}
      className={`fixed z-30 select-none transition-opacity duration-300 ${
        isDragging ? 'opacity-90' : 'opacity-75 hover:opacity-100'
      }`}
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        cursor: isDragging ? 'grabbing' : 'grab'
      }}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
    >
      <div className="bg-white text-black border border-gray-300 rounded-lg p-2 shadow-lg font-mono text-xs">
        <div>Until ad: <span className="font-semibold">{stats.formattedTimeUntilAd || '15m 0s'}</span></div>
      </div>
    </div>
  );
};

export default FloatingTimer;