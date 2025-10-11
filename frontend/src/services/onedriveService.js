/**
 * OneDrive service for handling folder operations
 */

export const openOneDriveFolder = async (project) => {
  try {
    console.log('Opening OneDrive folder for project:', project.jobNumber);
    
    const response = await fetch('/api/onedrive/folder-url', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jobNumber: project.jobNumber,
        clientName: project.client,
        geoAddress: project.geoAddress,
        projectId: project.id
      })
    });
    
    if (response.ok) {
      const data = await response.json();
      
      if (data.requiresAuth) {
        // User needs to authenticate - redirect to OAuth
        console.log('OneDrive authentication required, redirecting to OAuth');
        window.open(data.authUrl, '_blank');
        return { success: true, requiresAuth: true };
      } else {
        // Got folder URL directly
        console.log('Successfully got OneDrive folder URL, opening in new tab');
        window.open(data.folderUrl, '_blank');
        return { success: true, folderUrl: data.folderUrl };
      }
    } else {
      const error = await response.json();
      throw new Error(error.error || 'Failed to get folder URL');
    }
  } catch (error) {
    console.error('Failed to open OneDrive folder:', error);
    
    // Show user-friendly error messages based on error type
    let userMessage = 'Unable to open OneDrive folder';
    
    if (error.message.includes('credentials') || error.message.includes('unavailable')) {
      userMessage = 'OneDrive service is currently unavailable. Please try again later.';
    } else if (error.message.includes('authentication')) {
      userMessage = 'OneDrive authentication failed. Please contact support.';
    } else if (error.message.includes('permissions')) {
      userMessage = 'Insufficient permissions to access OneDrive. Please contact support.';
    } else if (error.message.includes('network') || error.name === 'TypeError') {
      userMessage = 'Network error - please check your internet connection and try again.';
    } else if (error.message.includes('busy') || error.message.includes('throttled')) {
      userMessage = 'OneDrive service is busy. Please wait a moment and try again.';
    }
    
    alert(userMessage);
    return { success: false, error: error.message };
  }
};

export default {
  openOneDriveFolder
};