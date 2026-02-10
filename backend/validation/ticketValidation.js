/**
 * Validation error class
 */
class ValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ValidationError';
  }
}

/**
 * Validate ticket content
 * Rejects empty or whitespace-only strings
 * @param {string} content - Ticket content to validate
 * @returns {Object} Result object with success boolean and error if applicable
 */
function validateContent(content) {
  if (!content || typeof content !== 'string') {
    return {
      success: false,
      error: new ValidationError('Ticket content cannot be empty or contain only whitespace')
    };
  }

  if (content.trim().length === 0) {
    return {
      success: false,
      error: new ValidationError('Ticket content cannot be empty or contain only whitespace')
    };
  }

  if (content.length > 1000) {
    return {
      success: false,
      error: new ValidationError('Ticket content exceeds maximum length of 1000 characters')
    };
  }

  return { success: true };
}

module.exports = {
  validateContent,
  ValidationError
};
