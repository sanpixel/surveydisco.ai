const fc = require('fast-check');
const { validateContent } = require('../validation/ticketValidation');

// Feature: project-ticketing-system, Property 1: Whitespace content rejection
// **Validates: Requirements 1.3**

describe('Property 1: Whitespace content rejection', () => {
  test('for any string composed entirely of whitespace, validation should reject it', () => {
    fc.assert(
      fc.property(
        fc.string().filter(s => s.trim() === ''),
        (whitespaceContent) => {
          const result = validateContent(whitespaceContent);
          
          expect(result.success).toBe(false);
          expect(result.error).toBeDefined();
          expect(result.error.message).toContain('whitespace');
        }
      ),
      { numRuns: 100 }
    );
  });
});
