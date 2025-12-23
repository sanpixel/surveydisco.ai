import React, { useState, useEffect } from 'react';
import './FlippableCard.css';
import FilePreviewSide from './FilePreviewSide';
import fileCacheService from '../services/fileCacheService';

const FlippableCard = ({ children, project, onFlip, onFileSelect }) => {
  const [isFlipped, setIsFlipped] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  const handleFlip = () => {
    if (isAnimating) return; // Prevent multiple simultaneous flips on same card
    
    const cardId = `card-${project?.jobNumber || Math.random()}`;
    console.log('🔄 [FlippableCard] Flip initiated for job:', project.jobNumber);
    
    setIsAnimating(true);
    const newFlippedState = !isFlipped;
    setIsFlipped(newFlippedState);
    
    // Invalidate cache when flipping to refresh file data
    if (newFlippedState && project?.jobNumber) {
      console.log('🔄 [FlippableCard] Card flipped, invalidating cache for job:', project.jobNumber);
      fileCacheService.invalidateProjectCache(project.jobNumber);
    }
    
    // Call parent callback if provided
    if (onFlip) {
      console.log('📞 [FlippableCard] Calling onFlip callback for job:', project.jobNumber, 'flipped:', newFlippedState);
      onFlip(project.jobNumber, newFlippedState);
    }
    
    // Reset animation state after animation completes (400ms)
    // Store timeout reference for cleanup
    if (!window.cardFlipTimeouts) {
      window.cardFlipTimeouts = {};
    }
    
    window.cardFlipTimeouts[cardId] = setTimeout(() => {
      setIsAnimating(false);
      delete window.cardFlipTimeouts[cardId];
    }, 400);
  };

  // Clean up animation state on component unmount
  useEffect(() => {
    return () => {
      setIsAnimating(false);
      setIsFlipped(false);
    };
  }, []);

  // Prevent multiple simultaneous flips and ensure independent animations
  useEffect(() => {
    // Add unique identifier to prevent interference between cards
    const cardId = `card-${project?.jobNumber || Math.random()}`;
    
    return () => {
      // Cleanup any pending timeouts for this specific card
      const timeouts = window.cardFlipTimeouts || {};
      if (timeouts[cardId]) {
        clearTimeout(timeouts[cardId]);
        delete timeouts[cardId];
      }
    };
  }, [project?.jobNumber]);

  return (
    <div className={`flippable-card-container ${isFlipped ? 'flipped' : ''} ${isAnimating ? 'animating' : ''}`}>
      <div className="flippable-card">
        <div className="card-front">
          {typeof children === 'function' ? children({ onFlip: handleFlip }) : children}
        </div>
        <div className="card-back">
          <FilePreviewSide 
            project={project} 
            onFileSelect={onFileSelect}
            isVisible={isFlipped}
            onHeaderClick={handleFlip}
          />
        </div>
      </div>
    </div>
  );
};

export default FlippableCard;