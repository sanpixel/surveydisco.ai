import React, { useState } from 'react';
import './TextInput.css';

const TextInput = ({ onSubmit }) => {
  const [text, setText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!text.trim() || isProcessing) return;

    setIsProcessing(true);
    await onSubmit(text);
    setText('');
    setIsProcessing(false);
  };

  const handleKeyDown = (e) => {
    if (e.ctrlKey && e.key === 'Enter') {
      handleSubmit(e);
    }
  };

  return (
    <div className="text-input-container">
      <form onSubmit={handleSubmit} className="text-input-form">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Copy and Paste an email or just type as much as little project information here and I'll take care of the rest ... (Ctrl+Enter to process)"
          className="text-input"
          rows={6}
          disabled={isProcessing}
        />
        <div className="text-input-actions">
          <button 
            type="submit" 
            disabled={!text.trim() || isProcessing}
            className="process-btn"
          >
            {isProcessing ? 'Processing...' : 'Add Project'}
          </button>
          <button 
            type="button" 
            onClick={() => setText('')}
            disabled={!text || isProcessing}
            className="clear-btn"
          >
            Clear
          </button>
        </div>
      </form>
    </div>
  );
};

export default TextInput;
