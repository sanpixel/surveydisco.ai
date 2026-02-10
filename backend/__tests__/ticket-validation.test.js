const { validateContent, ValidationError } = require('../validation/ticketValidation');

describe('Ticket Validation Unit Tests', () => {
  test('empty string rejection', () => {
    const result = validateContent('');
    expect(result.success).toBe(false);
    expect(result.error).toBeInstanceOf(ValidationError);
  });

  test('single space rejection', () => {
    const result = validateContent(' ');
    expect(result.success).toBe(false);
    expect(result.error).toBeInstanceOf(ValidationError);
  });

  test('mixed whitespace (tabs, newlines) rejection', () => {
    const result = validateContent('\t\n  \r\n');
    expect(result.success).toBe(false);
    expect(result.error).toBeInstanceOf(ValidationError);
  });

  test('content length validation - exactly 1000 characters', () => {
    const content = 'a'.repeat(1000);
    const result = validateContent(content);
    expect(result.success).toBe(true);
  });

  test('content length validation - 1001 characters', () => {
    const content = 'a'.repeat(1001);
    const result = validateContent(content);
    expect(result.success).toBe(false);
    expect(result.error.message).toContain('maximum length');
  });

  test('valid content with leading/trailing spaces', () => {
    const result = validateContent('  valid content  ');
    expect(result.success).toBe(true);
  });

  test('null content rejection', () => {
    const result = validateContent(null);
    expect(result.success).toBe(false);
  });

  test('undefined content rejection', () => {
    const result = validateContent(undefined);
    expect(result.success).toBe(false);
  });
});
