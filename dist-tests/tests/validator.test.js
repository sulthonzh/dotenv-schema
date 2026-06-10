"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const node_assert_1 = __importDefault(require("node:assert"));
const validator_1 = require("../src/validator");
(0, node_test_1.describe)('EnvValidator', () => {
    const schema = {
        REQUIRED_STRING: { type: 'string', required: true },
        OPTIONAL_STRING: { type: 'string', required: false, default: 'default' },
        REQUIRED_NUMBER: { type: 'number', required: true },
        REQUIRED_BOOLEAN: { type: 'boolean', required: true },
        REQUIRED_ENUM: { type: 'enum', required: true, values: ['a', 'b', 'c'] },
        OPTIONAL_ENUM: { type: 'enum', required: false, values: ['x', 'y', 'z'] },
        REQUIRED_JSON: { type: 'json', required: true },
        STRING_WITH_PATTERN: { type: 'string', required: true, pattern: '^[a-z]+$' },
        STRING_WITH_MIN: { type: 'string', required: true, min: 3 },
        STRING_WITH_MAX: { type: 'string', required: true, max: 10 },
        NUMBER_WITH_MIN: { type: 'number', required: true, min: 0 },
        NUMBER_WITH_MAX: { type: 'number', required: true, max: 100 },
        URI_FORMAT: { type: 'string', required: true, format: 'uri' },
        EMAIL_FORMAT: { type: 'string', required: true, format: 'email' }
    };
    (0, node_test_1.describe)('validate', () => {
        (0, node_test_1.it)('should validate all required fields present', () => {
            const env = {
                REQUIRED_STRING: 'value',
                REQUIRED_NUMBER: '42',
                REQUIRED_BOOLEAN: 'true',
                REQUIRED_ENUM: 'a',
                REQUIRED_JSON: '{"key":"value"}',
                STRING_WITH_PATTERN: 'abc',
                STRING_WITH_MIN: 'abc',
                STRING_WITH_MAX: 'short',
                NUMBER_WITH_MIN: '50',
                NUMBER_WITH_MAX: '50',
                URI_FORMAT: 'https://example.com',
                EMAIL_FORMAT: 'test@example.com'
            };
            const validator = new validator_1.EnvValidator(schema);
            const result = validator.validate(env);
            node_assert_1.default.strictEqual(result.valid, true);
            node_assert_1.default.strictEqual(result.errors.length, 0);
        });
        (0, node_test_1.it)('should detect missing required field', () => {
            const env = {
                REQUIRED_NUMBER: '42',
                REQUIRED_BOOLEAN: 'true'
            };
            const validator = new validator_1.EnvValidator(schema);
            const result = validator.validate(env);
            node_assert_1.default.strictEqual(result.valid, false);
            node_assert_1.default.ok(result.errors.some(e => e.includes('Missing required')));
            node_assert_1.default.ok(result.errors.some(e => e.includes('REQUIRED_STRING')));
        });
        (0, node_test_1.it)('should detect invalid number', () => {
            const env = {
                REQUIRED_STRING: 'value',
                REQUIRED_NUMBER: 'not-a-number',
                REQUIRED_BOOLEAN: 'true',
                REQUIRED_ENUM: 'a',
                REQUIRED_JSON: '{}',
                STRING_WITH_PATTERN: 'abc',
                STRING_WITH_MIN: 'abc',
                STRING_WITH_MAX: 'short',
                NUMBER_WITH_MIN: '50',
                NUMBER_WITH_MAX: '50',
                URI_FORMAT: 'https://example.com',
                EMAIL_FORMAT: 'test@example.com'
            };
            const validator = new validator_1.EnvValidator(schema);
            const result = validator.validate(env);
            node_assert_1.default.strictEqual(result.valid, false);
            node_assert_1.default.ok(result.errors.some(e => e.includes('not a valid number')));
        });
        (0, node_test_1.it)('should detect invalid boolean', () => {
            const env = {
                REQUIRED_STRING: 'value',
                REQUIRED_NUMBER: '42',
                REQUIRED_BOOLEAN: 'maybe',
                REQUIRED_ENUM: 'a',
                REQUIRED_JSON: '{}',
                STRING_WITH_PATTERN: 'abc',
                STRING_WITH_MIN: 'abc',
                STRING_WITH_MAX: 'short',
                NUMBER_WITH_MIN: '50',
                NUMBER_WITH_MAX: '50',
                URI_FORMAT: 'https://example.com',
                EMAIL_FORMAT: 'test@example.com'
            };
            const validator = new validator_1.EnvValidator(schema);
            const result = validator.validate(env);
            node_assert_1.default.strictEqual(result.valid, false);
            node_assert_1.default.ok(result.errors.some(e => e.includes('must be one of: true, false, 1, 0, yes, no, on, off')));
        });
        (0, node_test_1.it)('should detect invalid enum value', () => {
            const env = {
                REQUIRED_STRING: 'value',
                REQUIRED_NUMBER: '42',
                REQUIRED_BOOLEAN: 'true',
                REQUIRED_ENUM: 'invalid',
                REQUIRED_JSON: '{}',
                STRING_WITH_PATTERN: 'abc',
                STRING_WITH_MIN: 'abc',
                STRING_WITH_MAX: 'short',
                NUMBER_WITH_MIN: '50',
                NUMBER_WITH_MAX: '50',
                URI_FORMAT: 'https://example.com',
                EMAIL_FORMAT: 'test@example.com'
            };
            const validator = new validator_1.EnvValidator(schema);
            const result = validator.validate(env);
            node_assert_1.default.strictEqual(result.valid, false);
            node_assert_1.default.ok(result.errors.some(e => e.includes('must be one of')));
        });
        (0, node_test_1.it)('should detect invalid JSON', () => {
            const env = {
                REQUIRED_STRING: 'value',
                REQUIRED_NUMBER: '42',
                REQUIRED_BOOLEAN: 'true',
                REQUIRED_ENUM: 'a',
                REQUIRED_JSON: 'not-json',
                STRING_WITH_PATTERN: 'abc',
                STRING_WITH_MIN: 'abc',
                STRING_WITH_MAX: 'short',
                NUMBER_WITH_MIN: '50',
                NUMBER_WITH_MAX: '50',
                URI_FORMAT: 'https://example.com',
                EMAIL_FORMAT: 'test@example.com'
            };
            const validator = new validator_1.EnvValidator(schema);
            const result = validator.validate(env);
            node_assert_1.default.strictEqual(result.valid, false);
            node_assert_1.default.ok(result.errors.some(e => e.includes('not valid JSON')));
        });
        (0, node_test_1.it)('should detect pattern mismatch', () => {
            const env = {
                REQUIRED_STRING: 'value',
                REQUIRED_NUMBER: '42',
                REQUIRED_BOOLEAN: 'true',
                REQUIRED_ENUM: 'a',
                REQUIRED_JSON: '{}',
                STRING_WITH_PATTERN: 'ABC123',
                STRING_WITH_MIN: 'abc',
                STRING_WITH_MAX: 'short',
                NUMBER_WITH_MIN: '50',
                NUMBER_WITH_MAX: '50',
                URI_FORMAT: 'https://example.com',
                EMAIL_FORMAT: 'test@example.com'
            };
            const validator = new validator_1.EnvValidator(schema);
            const result = validator.validate(env);
            node_assert_1.default.strictEqual(result.valid, false);
            node_assert_1.default.ok(result.errors.some(e => e.includes('does not match pattern')));
        });
        (0, node_test_1.it)('should detect string length violations', () => {
            const env = {
                REQUIRED_STRING: 'value',
                REQUIRED_NUMBER: '42',
                REQUIRED_BOOLEAN: 'true',
                REQUIRED_ENUM: 'a',
                REQUIRED_JSON: '{}',
                STRING_WITH_PATTERN: 'abc',
                STRING_WITH_MIN: 'ab',
                STRING_WITH_MAX: 'this is way too long',
                NUMBER_WITH_MIN: '50',
                NUMBER_WITH_MAX: '50',
                URI_FORMAT: 'https://example.com',
                EMAIL_FORMAT: 'test@example.com'
            };
            const validator = new validator_1.EnvValidator(schema);
            const result = validator.validate(env);
            node_assert_1.default.strictEqual(result.valid, false);
            node_assert_1.default.ok(result.errors.some(e => e.includes('too short')));
            node_assert_1.default.ok(result.errors.some(e => e.includes('too long')));
        });
        (0, node_test_1.it)('should detect number range violations', () => {
            const env = {
                REQUIRED_STRING: 'value',
                REQUIRED_NUMBER: '42',
                REQUIRED_BOOLEAN: 'true',
                REQUIRED_ENUM: 'a',
                REQUIRED_JSON: '{}',
                STRING_WITH_PATTERN: 'abc',
                STRING_WITH_MIN: 'abc',
                STRING_WITH_MAX: 'short',
                NUMBER_WITH_MIN: '-1',
                NUMBER_WITH_MAX: '150',
                URI_FORMAT: 'https://example.com',
                EMAIL_FORMAT: 'test@example.com'
            };
            const validator = new validator_1.EnvValidator(schema);
            const result = validator.validate(env);
            node_assert_1.default.strictEqual(result.valid, false);
            node_assert_1.default.ok(result.errors.some(e => e.includes('less than minimum')));
            node_assert_1.default.ok(result.errors.some(e => e.includes('greater than maximum')));
        });
        (0, node_test_1.it)('should detect invalid URI format', () => {
            const env = {
                REQUIRED_STRING: 'value',
                REQUIRED_NUMBER: '42',
                REQUIRED_BOOLEAN: 'true',
                REQUIRED_ENUM: 'a',
                REQUIRED_JSON: '{}',
                STRING_WITH_PATTERN: 'abc',
                STRING_WITH_MIN: 'abc',
                STRING_WITH_MAX: 'short',
                NUMBER_WITH_MIN: '50',
                NUMBER_WITH_MAX: '50',
                URI_FORMAT: 'not-a-uri',
                EMAIL_FORMAT: 'test@example.com'
            };
            const validator = new validator_1.EnvValidator(schema);
            const result = validator.validate(env);
            node_assert_1.default.strictEqual(result.valid, false);
            node_assert_1.default.ok(result.errors.some(e => e.includes('invalid URI format')));
        });
        (0, node_test_1.it)('should detect invalid email format', () => {
            const env = {
                REQUIRED_STRING: 'value',
                REQUIRED_NUMBER: '42',
                REQUIRED_BOOLEAN: 'true',
                REQUIRED_ENUM: 'a',
                REQUIRED_JSON: '{}',
                STRING_WITH_PATTERN: 'abc',
                STRING_WITH_MIN: 'abc',
                STRING_WITH_MAX: 'short',
                NUMBER_WITH_MIN: '50',
                NUMBER_WITH_MAX: '50',
                URI_FORMAT: 'https://example.com',
                EMAIL_FORMAT: 'not-an-email'
            };
            const validator = new validator_1.EnvValidator(schema);
            const result = validator.validate(env);
            node_assert_1.default.strictEqual(result.valid, false);
            node_assert_1.default.ok(result.errors.some(e => e.includes('invalid email format')));
        });
        (0, node_test_1.it)('should warn about unknown variables', () => {
            const env = {
                REQUIRED_STRING: 'value',
                REQUIRED_NUMBER: '42',
                REQUIRED_BOOLEAN: 'true',
                REQUIRED_ENUM: 'a',
                REQUIRED_JSON: '{}',
                STRING_WITH_PATTERN: 'abc',
                STRING_WITH_MIN: 'abc',
                STRING_WITH_MAX: 'short',
                NUMBER_WITH_MIN: '50',
                NUMBER_WITH_MAX: '50',
                URI_FORMAT: 'https://example.com',
                EMAIL_FORMAT: 'test@example.com',
                UNKNOWN_VAR: 'value'
            };
            const validator = new validator_1.EnvValidator(schema);
            const result = validator.validate(env);
            node_assert_1.default.strictEqual(result.valid, true);
            node_assert_1.default.strictEqual(result.warnings.length, 1);
            node_assert_1.default.ok(result.warnings[0].includes('UNKNOWN_VAR'));
        });
        (0, node_test_1.it)('should allow missing optional fields', () => {
            const env = {
                REQUIRED_STRING: 'value',
                REQUIRED_NUMBER: '42',
                REQUIRED_BOOLEAN: 'true',
                REQUIRED_ENUM: 'a',
                REQUIRED_JSON: '{}',
                STRING_WITH_PATTERN: 'abc',
                STRING_WITH_MIN: 'abc',
                STRING_WITH_MAX: 'short',
                NUMBER_WITH_MIN: '50',
                NUMBER_WITH_MAX: '50',
                URI_FORMAT: 'https://example.com',
                EMAIL_FORMAT: 'test@example.com'
            };
            const validator = new validator_1.EnvValidator(schema);
            const result = validator.validate(env);
            node_assert_1.default.strictEqual(result.valid, true);
            node_assert_1.default.strictEqual(result.errors.length, 0);
        });
        (0, node_test_1.it)('should accept various boolean representations', () => {
            const env = {
                REQUIRED_STRING: 'value',
                REQUIRED_NUMBER: '42',
                REQUIRED_BOOLEAN: 'yes', // Should be accepted
                REQUIRED_ENUM: 'a',
                REQUIRED_JSON: '{}',
                STRING_WITH_PATTERN: 'abc',
                STRING_WITH_MIN: 'abc',
                STRING_WITH_MAX: 'short',
                NUMBER_WITH_MIN: '50',
                NUMBER_WITH_MAX: '50',
                URI_FORMAT: 'https://example.com',
                EMAIL_FORMAT: 'test@example.com'
            };
            const validator = new validator_1.EnvValidator(schema);
            const result = validator.validate(env);
            node_assert_1.default.strictEqual(result.valid, true);
            node_assert_1.default.strictEqual(result.errors.length, 0);
        });
        (0, node_test_1.it)('should reject invalid boolean values', () => {
            const env = {
                REQUIRED_STRING: 'value',
                REQUIRED_NUMBER: '42',
                REQUIRED_BOOLEAN: 'maybe', // Should be rejected
                REQUIRED_ENUM: 'a',
                REQUIRED_JSON: '{}',
                STRING_WITH_PATTERN: 'abc',
                STRING_WITH_MIN: 'abc',
                STRING_WITH_MAX: 'short',
                NUMBER_WITH_MIN: '50',
                NUMBER_WITH_MAX: '50',
                URI_FORMAT: 'https://example.com',
                EMAIL_FORMAT: 'test@example.com'
            };
            const validator = new validator_1.EnvValidator(schema);
            const result = validator.validate(env);
            node_assert_1.default.strictEqual(result.valid, false);
            node_assert_1.default.ok(result.errors.some(e => e.includes('must be one of: true, false, 1, 0, yes, no, on, off')));
        });
    });
    (0, node_test_1.describe)('getDefaults', () => {
        (0, node_test_1.it)('should return defaults for optional fields', () => {
            const schemaWithDefaults = {
                REQUIRED: { type: 'string', required: true },
                OPTIONAL_WITH_DEFAULT: { type: 'string', required: false, default: 'default-value' },
                OPTIONAL_NUMBER: { type: 'number', required: false, default: 42 }
            };
            const validator = new validator_1.EnvValidator(schemaWithDefaults);
            const defaults = validator.getDefaults();
            node_assert_1.default.strictEqual(defaults.OPTIONAL_WITH_DEFAULT, 'default-value');
            node_assert_1.default.strictEqual(defaults.OPTIONAL_NUMBER, '42');
            node_assert_1.default.strictEqual(defaults.REQUIRED, undefined);
        });
    });
});
