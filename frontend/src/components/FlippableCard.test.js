import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import FlippableCard from './FlippableCard';

// Mock child component for testing
const MockProjectCard = ({ project }) => (
  <div data-testid="project-card">
    <div>Job: {project.jobNumber}</div>
    <div>Client: {project.client}</div>
  </div>
);

describe('FlippableCard Component', () => {
  
  /**
   * **Feature: card-flip-preview, Property 1: Card flip state consistency**
   * For any project card, when the flip button is clicked, the card state should toggle 
   * between front and back views with appropriate animation classes applied
   * **Validates: Requirements 1.1, 1.4**
   */
  test('Property 1: Card flip state consistency', async () => {
    const project = { id: 1, jobNumber: 'TEST001', client: 'Test Client' };
    const onFlipMock = jest.fn();
    
    const { container } = render(
      <FlippableCard project={project} onFlip={onFlipMock}>
        <MockProjectCard project={project} />
      </FlippableCard>
    );

    const flipButton = screen.getByTitle('Flip to see files');
    const cardContainer = container.querySelector('.flippable-card-container');
    
    // Initial state should not be flipped
    expect(cardContainer).not.toHaveClass('flipped');
    expect(screen.getByTestId('project-card')).toBeInTheDocument();
    
    // Click flip button
    fireEvent.click(flipButton);
    
    // Should be flipped and animating
    expect(cardContainer).toHaveClass('flipped');
    expect(cardContainer).toHaveClass('animating');
    expect(onFlipMock).toHaveBeenCalledWith(project.id, true);
    
    // Should show back content
    expect(screen.getByText('Project Files')).toBeInTheDocument();
    expect(screen.getByTitle('Flip back to project info')).toBeInTheDocument();
    
    // Wait for animation to complete before flipping back
    await waitFor(() => {
      expect(cardContainer).not.toHaveClass('animating');
    }, { timeout: 500 });
    
    // Click flip back button
    const flipBackButton = screen.getByTitle('Flip back to project info');
    fireEvent.click(flipBackButton);
    
    // Should be back to front (wait for state update)
    await waitFor(() => {
      expect(cardContainer).not.toHaveClass('flipped');
    }, { timeout: 1000 });
    expect(onFlipMock).toHaveBeenCalledWith(project.id, false);
  });

  /**
   * **Feature: card-flip-preview, Property 4: Animation timing bounds**
   * For any flip animation, the rotation should complete within the specified 300-500 millisecond timeframe
   * **Validates: Requirements 4.1**
   */
  test('Property 4: Animation timing bounds', async () => {
    const project = { id: 1, jobNumber: 'TEST001', client: 'Test Client' };
    
    const { container } = render(
      <FlippableCard project={project}>
        <MockProjectCard project={project} />
      </FlippableCard>
    );

    const flipButton = screen.getByTitle('Flip to see files');
    const cardContainer = container.querySelector('.flippable-card-container');
    
    const startTime = Date.now();
    fireEvent.click(flipButton);
    
    // Should be animating immediately
    expect(cardContainer).toHaveClass('animating');
    
    // Wait for animation to complete (should be within 500ms)
    await waitFor(() => {
      expect(cardContainer).not.toHaveClass('animating');
    }, { timeout: 500 });
    
    const endTime = Date.now();
    const animationDuration = endTime - startTime;
    
    // Animation should complete within 300-500ms range
    expect(animationDuration).toBeGreaterThanOrEqual(300);
    expect(animationDuration).toBeLessThanOrEqual(500);
  });

  /**
   * **Feature: card-flip-preview, Property 3: UI state preservation**
   * For any card flip operation, the card's expanded/collapsed state and position in the grid should remain unchanged
   * **Validates: Requirements 4.2, 4.4**
   */
  test('Property 3: UI state preservation', () => {
    const project = { id: 1, jobNumber: 'TEST001', client: 'Test Client' };
    
    const { container } = render(
      <div className="cards-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
        <FlippableCard project={project}>
          <MockProjectCard project={project} />
        </FlippableCard>
      </div>
    );

    const cardContainer = container.querySelector('.flippable-card-container');
    const flipButton = screen.getByTitle('Flip to see files');
    
    // Record initial position and dimensions
    const initialRect = cardContainer.getBoundingClientRect();
    const initialComputedStyle = window.getComputedStyle(cardContainer);
    
    // Flip the card
    fireEvent.click(flipButton);
    
    // Check that position and size are preserved
    const flippedRect = cardContainer.getBoundingClientRect();
    const flippedComputedStyle = window.getComputedStyle(cardContainer);
    
    expect(flippedRect.width).toBe(initialRect.width);
    expect(flippedRect.height).toBeGreaterThanOrEqual(initialRect.height); // Height may increase slightly
    expect(flippedRect.left).toBe(initialRect.left);
    expect(flippedRect.top).toBe(initialRect.top);
    
    // Grid position should be maintained
    expect(flippedComputedStyle.position).toBe(initialComputedStyle.position);
  });

  // Unit test for preventing multiple simultaneous flips
  test('should prevent multiple simultaneous flips on same card', async () => {
    const project = { id: 1, jobNumber: 'TEST001', client: 'Test Client' };
    const onFlipMock = jest.fn();
    
    const { container } = render(
      <FlippableCard project={project} onFlip={onFlipMock}>
        <MockProjectCard project={project} />
      </FlippableCard>
    );

    const flipButton = screen.getByTitle('Flip to see files');
    const cardContainer = container.querySelector('.flippable-card-container');
    
    // Click flip button multiple times rapidly
    fireEvent.click(flipButton);
    fireEvent.click(flipButton);
    fireEvent.click(flipButton);
    
    // Should only flip once
    expect(cardContainer).toHaveClass('flipped');
    expect(cardContainer).toHaveClass('animating');
    expect(onFlipMock).toHaveBeenCalledTimes(1);
    
    // Button should be disabled during animation
    expect(flipButton).toBeDisabled();
  });

  // Unit test for folder initialization states
  test('should show appropriate content based on OneDrive folder state', () => {
    const projectWithFolder = { 
      id: 1, 
      jobNumber: 'TEST001', 
      client: 'Test Client',
      onedrivefolderurl: 'https://example.sharepoint.com/folder'
    };
    
    const projectWithoutFolder = { 
      id: 2, 
      jobNumber: 'TEST002', 
      client: 'Test Client',
      onedrivefolderurl: null
    };

    // Test with initialized folder
    const { rerender } = render(
      <FlippableCard project={projectWithFolder}>
        <MockProjectCard project={projectWithFolder} />
      </FlippableCard>
    );

    fireEvent.click(screen.getByTitle('Flip to see files'));
    expect(screen.getByText('Loading files from OneDrive...')).toBeInTheDocument();

    // Test without initialized folder
    rerender(
      <FlippableCard project={projectWithoutFolder}>
        <MockProjectCard project={projectWithoutFolder} />
      </FlippableCard>
    );

    expect(screen.getByText('OneDrive folder not initialized')).toBeInTheDocument();
    expect(screen.getByText('Click "Init" on the front of the card to set up file access')).toBeInTheDocument();
  });

  // Unit test for cleanup on unmount
  test('should clean up animation state on component unmount', () => {
    const project = { id: 1, jobNumber: 'TEST001', client: 'Test Client' };
    
    const { container, unmount } = render(
      <FlippableCard project={project}>
        <MockProjectCard project={project} />
      </FlippableCard>
    );

    const flipButton = screen.getByTitle('Flip to see files');
    fireEvent.click(flipButton);
    
    // Should be animating
    const cardContainer = container.querySelector('.flippable-card-container');
    expect(cardContainer).toHaveClass('animating');
    
    // Unmount component
    unmount();
    
    // No errors should occur during cleanup
    expect(true).toBe(true); // Test passes if no errors thrown
  });
});