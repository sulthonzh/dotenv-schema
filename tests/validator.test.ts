import { describe, it } from 'node:test';
import assert from 'node:assert';
import { EnvValidator } from '../src/validator';
import { EnvSchema } from '../src/schema';

describe('EnvValidator', () => {
  const schema: EnvSchema = {
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

  describe('validate', () => {
    it('should validate all required fields present', () => {
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

      const validator = new EnvValidator(schema);
      const result = validator.validate(env);

      assert.strictEqual(result.valid, true);
      assert.strictEqual(result.errors.length, 0);
    });

    it('should detect missing required field', () => {
      const env = {
        REQUIRED_NUMBER: '42',
        REQUIRED_BOOLEAN: 'true'
      };

      const validator = new EnvValidator(schema);
      const result = validator.validate(env);

      assert.strictEqual(result.valid, false);
      assert.ok(result.errors.some(e => e.includes('Missing required')));
      assert.ok(result.errors.some(e => e.includes('REQUIRED_STRING')));
    });

    it('should detect invalid number', () => {
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

      const validator = new EnvValidator(schema);
      const result = validator.validate(env);

      assert.strictEqual(result.valid, false);
      assert.ok(result.errors.some(e => e.includes('not a valid number')));
    });

    it('should detect invalid boolean', () => {
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

      const validator = new EnvValidator(schema);
      const result = validator.validate(env);

      assert.strictEqual(result.valid, false);
      assert.ok(result.errors.some(e => e.includes('must be one of: true, false, 1, 0, yes, no, on, off')));
    });

    it('should detect invalid enum value', () => {
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

      const validator = new EnvValidator(schema);
      const result = validator.validate(env);

      assert.strictEqual(result.valid, false);
      assert.ok(result.errors.some(e => e.includes('must be one of')));
    });

    it('should detect invalid JSON', () => {
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

      const validator = new EnvValidator(schema);
      const result = validator.validate(env);

      assert.strictEqual(result.valid, false);
      assert.ok(result.errors.some(e => e.includes('not valid JSON')));
    });

    it('should detect pattern mismatch', () => {
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

      const validator = new EnvValidator(schema);
      const result = validator.validate(env);

      assert.strictEqual(result.valid, false);
      assert.ok(result.errors.some(e => e.includes('does not match pattern')));
    });

    it('should detect string length violations', () => {
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

      const validator = new EnvValidator(schema);
      const result = validator.validate(env);

      assert.strictEqual(result.valid, false);
      assert.ok(result.errors.some(e => e.includes('too short')));
      assert.ok(result.errors.some(e => e.includes('too long')));
    });

    it('should detect number range violations', () => {
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

      const validator = new EnvValidator(schema);
      const result = validator.validate(env);

      assert.strictEqual(result.valid, false);
      assert.ok(result.errors.some(e => e.includes('less than minimum')));
      assert.ok(result.errors.some(e => e.includes('greater than maximum')));
    });

    it('should detect invalid URI format', () => {
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

      const validator = new EnvValidator(schema);
      const result = validator.validate(env);

      assert.strictEqual(result.valid, false);
      assert.ok(result.errors.some(e => e.includes('invalid URI format')));
    });

    it('should detect invalid email format', () => {
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

      const validator = new EnvValidator(schema);
      const result = validator.validate(env);

      assert.strictEqual(result.valid, false);
      assert.ok(result.errors.some(e => e.includes('invalid email format')));
    });

    it('should warn about unknown variables', () => {
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

      const validator = new EnvValidator(schema);
      const result = validator.validate(env);

      assert.strictEqual(result.valid, true);
      assert.strictEqual(result.warnings.length, 1);
      assert.ok(result.warnings[0].includes('UNKNOWN_VAR'));
    });

    it('should allow missing optional fields', () => {
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

      const validator = new EnvValidator(schema);
      const result = validator.validate(env);

      assert.strictEqual(result.valid, true);
      assert.strictEqual(result.errors.length, 0);
    });

    it('should accept various boolean representations', () => {
      const env = {
        REQUIRED_STRING: 'value',
        REQUIRED_NUMBER: '42',
        REQUIRED_BOOLEAN: 'yes',  // Should be accepted
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

      const validator = new EnvValidator(schema);
      const result = validator.validate(env);

      assert.strictEqual(result.valid, true);
      assert.strictEqual(result.errors.length, 0);
    });

    it('should reject invalid boolean values', () => {
      const env = {
        REQUIRED_STRING: 'value',
        REQUIRED_NUMBER: '42',
        REQUIRED_BOOLEAN: 'maybe',  // Should be rejected
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

      const validator = new EnvValidator(schema);
      const result = validator.validate(env);

      assert.strictEqual(result.valid, false);
      assert.ok(result.errors.some(e => e.includes('must be one of: true, false, 1, 0, yes, no, on, off')));
    });
  });

  describe('getDefaults', () => {
    it('should return defaults for optional fields', () => {
      const schemaWithDefaults: EnvSchema = {
        REQUIRED: { type: 'string', required: true },
        OPTIONAL_WITH_DEFAULT: { type: 'string', required: false, default: 'default-value' },
        OPTIONAL_NUMBER: { type: 'number', required: false, default: 42 }
      };

      const validator = new EnvValidator(schemaWithDefaults);
      const defaults = validator.getDefaults();

      assert.strictEqual(defaults.OPTIONAL_WITH_DEFAULT, 'default-value');
      assert.strictEqual(defaults.OPTIONAL_NUMBER, '42');
      assert.strictEqual(defaults.REQUIRED, undefined);
    });
  });
});