"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const node_assert_1 = __importDefault(require("node:assert"));
const validator_1 = require("../dist-tests/src/validator");

(0, node_test_1.describe)('Date Validation', () => {
    (0, node_test_1.describe)('validateDate', () => {
        const schema = {
            ISO_DATE: { type: 'date', dateFormat: 'ISO_8601', required: true },
            RFC_DATE: { type: 'date', dateFormat: 'RFC_2822', required: true },
            TIMESTAMP: { type: 'date', dateFormat: 'UNIX_TIMESTAMP', required: true },
            YYYY_MM_DD: { type: 'date', dateFormat: 'YYYY-MM-DD', required: true },
            MM_DD_YYYY: { type: 'date', dateFormat: 'MM/DD/YYYY', required: true },
            DD_MM_YYYY: { type: 'date', dateFormat: 'DD-MM-YYYY', required: true },
        };

        const validator = new validator_1.EnvValidator(schema);

        (0, node_test_1.it)('should validate ISO 8601 dates', () => {
            const result = validator.validate({
                ISO_DATE: '2023-12-25T10:30:00Z',
                RFC_DATE: 'Mon, 25 Dec 2023 10:30:00 GMT',
                TIMESTAMP: '1703568600',
                YYYY_MM_DD: '2023-12-25',
                MM_DD_YYYY: '12/25/2023',
                DD_MM_YYYY: '25-12-2023'
            });

            node_assert_1.default.ok(result.valid, 'Should validate all date formats');
            node_assert_1.default.equal(result.errors.length, 0, 'Should have no errors');
        });

        (0, node_test_1.it)('should detect invalid ISO 8601 dates', () => {
            const result = validator.validate({
                ISO_DATE: 'invalid-date',
                YYYY_MM_DD: '2023-13-01', // Invalid month
                MM_DD_YYYY: '13/32/2023', // Invalid day and month
                DD_MM_YYYY: '32-13-2023'  // Invalid day and month
            });

            node_assert_1.default.ok(!result.valid, 'Should detect invalid dates');
            node_assert_1.default.ok(result.errors.length > 0, 'Should have errors');
            
            // Check that error messages contain suggestions
            const isoDateError = result.errors.find(e => e.includes('ISO_DATE'));
            node_assert_1.default.ok(isoDateError, 'Should have ISO_DATE error');
            node_assert_1.default.ok(isoDateError.includes('Suggestions:'), 'Should include suggestions');
        });

        (0, node_test_1.it)('should detect invalid UNIX timestamp', () => {
            const result = validator.validate({
                TIMESTAMP: 'not-a-number'
            });

            node_assert_1.default.ok(!result.valid, 'Should detect invalid timestamp');
            const timestampError = result.errors.find(e => e.includes('TIMESTAMP'));
            node_assert_1.default.ok(timestampError, 'Should have TIMESTAMP error');
        });
    });

    (0, node_test_1.describe)('getDateSuggestions', () => {
        const validator = new validator_1.EnvValidator({});

        (0, node_test_1.it)('should provide ISO 8601 suggestions', () => {
            const suggestions = validator.getDateSuggestions('ISO_8601');
            node_assert_1.default.ok(suggestions.length > 0, 'Should provide suggestions');
            node_assert_1.default.ok(suggestions.some(s => s.includes('2023-12-25T10:30:00Z')), 'Should include example');
        });

        (0, node_test_1.it)('should provide RFC 2822 suggestions', () => {
            const suggestions = validator.getDateSuggestions('RFC_2822');
            node_assert_1.default.ok(suggestions.length > 0, 'Should provide suggestions');
            node_assert_1.default.ok(suggestions.some(s => s.includes('Mon, 25 Dec 2023')), 'Should include example');
        });

        (0, node_test_1.it)('should provide UNIX timestamp suggestions', () => {
            const suggestions = validator.getDateSuggestions('UNIX_TIMESTAMP');
            node_assert_1.default.ok(suggestions.length > 0, 'Should provide suggestions');
            node_assert_1.default.ok(suggestions.some(s => s.includes('1703568600')), 'Should include example');
        });
    });
});

(0, node_test_1.describe)('Custom Validation', () => {
    (0, node_test_1.describe)('validateCustom', () => {
        const schema = {
            ALPHA_ONLY: { type: 'string', customValidator: 'alpha', required: true },
            ALPHANUMERIC: { type: 'string', customValidator: 'alphanumeric', required: true },
            UUID: { type: 'string', customValidator: 'uuid', required: true },
            HEX: { type: 'string', customValidator: 'hex', required: true }
        };

        const validator = new validator_1.EnvValidator(schema);

        (0, node_test_1.it)('should validate alpha characters', () => {
            const result = validator.validate({
                ALPHA_ONLY: 'hello'
            });
            node_assert_1.default.ok(result.valid, 'Should validate alpha characters');

            const invalidResult = validator.validate({
                ALPHA_ONLY: 'hello123'
            });
            node_assert_1.default.ok(!invalidResult.valid, 'Should reject non-alpha characters');
        });

        (0, node_test_1.it)('should validate alphanumeric characters', () => {
            const result = validator.validate({
                ALPHANUMERIC: 'hello123'
            });
            node_assert_1.default.ok(result.valid, 'Should validate alphanumeric characters');

            const invalidResult = validator.validate({
                ALPHANUMERIC: 'hello-world'
            });
            node_assert_1.default.ok(!invalidResult.valid, 'Should reject non-alphanumeric characters');
        });

        (0, node_test_1.it)('should validate UUID', () => {
            const validUuid = '550e8400-e29b-41d4-a716-446655440000';
            const result = validator.validate({
                UUID: validUuid
            });
            node_assert_1.default.ok(result.valid, 'Should validate valid UUID');

            const invalidResult = validator.validate({
                UUID: 'invalid-uuid'
            });
            node_assert_1.default.ok(!invalidResult.valid, 'Should reject invalid UUID');
        });

        (0, node_test_1.it)('should validate hex', () => {
            const result = validator.validate({
                HEX: '1a2b3c'
            });
            node_assert_1.default.ok(result.valid, 'Should validate hex characters');

            const invalidResult = validator.validate({
                HEX: '1g2h3i'
            });
            node_assert_1.default.ok(!invalidResult.valid, 'Should reject non-hex characters');
        });

        (0, node_test_1.it)('should handle unknown custom validator', () => {
            const schemaWithUnknown = {
                TEST_FIELD: { type: 'string', customValidator: 'unknown_validator', required: true }
            };
            const validator = new validator_1.EnvValidator(schemaWithUnknown);
            
            const result = validator.validate({
                TEST_FIELD: 'some_value'
            });
            
            node_assert_1.default.ok(!result.valid, 'Should reject unknown validator');
            const error = result.errors.find(e => e.includes('unknown custom validator'));
            node_assert_1.default.ok(error, 'Should include error about unknown validator');
        });
    });
});

(0, node_test_1.describe)('Error Messages with Suggestions', () => {
    const validator = new validator_1.EnvValidator({
        EMAIL_FIELD: { type: 'string', format: 'email', required: true },
        BOOLEAN_FIELD: { type: 'boolean', required: true },
        PATTERN_FIELD: { type: 'string', pattern: '^[a-z]+$', required: true }
    });

    (0, node_test_1.it)('should provide email suggestions', () => {
        const result = validator.validate({
            EMAIL_FIELD: 'invalid-email'
        });
        
        const emailError = result.errors.find(e => e.includes('EMAIL_FIELD'));
        node_assert_1.default.ok(emailError, 'Should have email error');
        node_assert_1.default.ok(emailError.includes('Valid examples:'), 'Should include examples');
        node_assert_1.default.ok(emailError.includes('user@example.com'), 'Should include valid example');
    });

    (0, node_test_1.it)('should provide boolean suggestions', () => {
        const result = validator.validate({
            BOOLEAN_FIELD: 'maybe'
        });
        
        const booleanError = result.errors.find(e => e.includes('BOOLEAN_FIELD'));
        node_assert_1.default.ok(booleanError, 'Should have boolean error');
        node_assert_1.default.ok(booleanError.includes('Suggestions:'), 'Should include suggestions');
        node_assert_1.default.ok(booleanError.includes('Try: true'), 'Should include try suggestions');
    });

    (0, node_test_1.it)('should provide pattern suggestions', () => {
        const result = validator.validate({
            PATTERN_FIELD: 'ABC123'
        });
        
        const patternError = result.errors.find(e => e.includes('PATTERN_FIELD'));
        node_assert_1.default.ok(patternError, 'Should have pattern error');
        node_assert_1.default.ok(patternError.includes('Suggestions:'), 'Should include suggestions');
    });
});

(0, node_test_1.describe)('Performance Optimization - Regex Caching', () => {
    (0, node_test_1.it)('should cache regex patterns', () => {
        const schema = {
            TEST_PATTERN_1: { type: 'string', pattern: '^[a-z]+$', required: true },
            TEST_PATTERN_2: { type: 'string', pattern: '^[0-9]+$', required: true },
            TEST_PATTERN_1_AGAIN: { type: 'string', pattern: '^[a-z]+$', required: true }
        };
        
        const validator = new validator_1.EnvValidator(schema);
        
        // Access compiled patterns through reflection (this is for testing purposes)
        const compiledPatterns = validator['compiledPatterns'];
        node_assert_1.default.ok(compiledPatterns.has('^[a-z]+$'), 'Should cache first pattern');
        node_assert_1.default.ok(compiledPatterns.has('^[0-9]+$'), 'Should cache second pattern');
        node_assert_1.default.equal(compiledPatterns.size, 2, 'Should cache unique patterns only');
        
        // Test that same pattern is reused
        validator.validate({
            TEST_PATTERN_1: 'hello',
            TEST_PATTERN_2: '123',
            TEST_PATTERN_1_AGAIN: 'world'
        });
        
        // Size should still be 2 (pattern reused)
        node_assert_1.default.equal(compiledPatterns.size, 2, 'Should reuse cached patterns');
    });
});