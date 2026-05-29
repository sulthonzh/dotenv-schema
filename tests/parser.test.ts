import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import * as fs from 'fs';
import * as path from 'path';
import { EnvParser } from '../src/parser';
import { SchemaType } from '../src/schema';

const testDir = '/tmp/dotenv-schema-test';

describe('EnvParser', () => {
  beforeEach(() => {
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }
  });

  afterEach(() => {
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe('parseEnvFile', () => {
    it('should parse simple key=value pairs', () => {
      const content = 'KEY1=value1\nKEY2=value2\n';
      const filePath = path.join(testDir, '.env');
      fs.writeFileSync(filePath, content);

      const result = EnvParser.parseEnvFile(filePath);
      assert.strictEqual(result.size, 2);
      assert.strictEqual(result.get('KEY1'), 'value1');
      assert.strictEqual(result.get('KEY2'), 'value2');
    });

    it('should skip comments', () => {
      const content = '# Comment\nKEY=value\n# Another comment\nKEY2=value2\n';
      const filePath = path.join(testDir, '.env');
      fs.writeFileSync(filePath, content);

      const result = EnvParser.parseEnvFile(filePath);
      assert.strictEqual(result.size, 2);
      assert.strictEqual(result.get('KEY'), 'value');
      assert.strictEqual(result.get('KEY2'), 'value2');
    });

    it('should skip empty lines', () => {
      const content = 'KEY1=value1\n\nKEY2=value2\n\n';
      const filePath = path.join(testDir, '.env');
      fs.writeFileSync(filePath, content);

      const result = EnvParser.parseEnvFile(filePath);
      assert.strictEqual(result.size, 2);
    });

    it('should remove quotes from values', () => {
      const content = 'KEY1="value1"\nKEY2=\'value2\'\n';
      const filePath = path.join(testDir, '.env');
      fs.writeFileSync(filePath, content);

      const result = EnvParser.parseEnvFile(filePath);
      assert.strictEqual(result.get('KEY1'), 'value1');
      assert.strictEqual(result.get('KEY2'), 'value2');
    });

    it('should handle empty file', () => {
      const content = '';
      const filePath = path.join(testDir, '.env');
      fs.writeFileSync(filePath, content);

      const result = EnvParser.parseEnvFile(filePath);
      assert.strictEqual(result.size, 0);
    });

    it('should handle non-existent file', () => {
      const result = EnvParser.parseEnvFile(path.join(testDir, 'nonexistent.env'));
      assert.strictEqual(result.size, 0);
    });
  });

  describe('inferType', () => {
    it('should infer boolean type', () => {
      assert.strictEqual(EnvParser.inferType('true'), 'boolean');
      assert.strictEqual(EnvParser.inferType('false'), 'boolean');
      assert.strictEqual(EnvParser.inferType('TRUE'), 'boolean');
      assert.strictEqual(EnvParser.inferType('FALSE'), 'boolean');
    });

    it('should infer number type', () => {
      assert.strictEqual(EnvParser.inferType('123'), 'number');
      assert.strictEqual(EnvParser.inferType('45.67'), 'number');
      assert.strictEqual(EnvParser.inferType('-10'), 'number');
    });

    it('should infer json type', () => {
      assert.strictEqual(EnvParser.inferType('{"key":"value"}'), 'json');
      assert.strictEqual(EnvParser.inferType('["a","b"]'), 'json');
    });

    it('should infer string type for non-JSON values', () => {
      assert.strictEqual(EnvParser.inferType('hello'), 'string');
      assert.strictEqual(EnvParser.inferType('http://example.com'), 'string');
    });
  });

  describe('inferSchema', () => {
    it('should create schema from .env file', () => {
      const content = 'MY_VAR=production\nPORT=3000\nDEBUG=true\n';
      const filePath = path.join(testDir, '.env');
      fs.writeFileSync(filePath, content);

      const schema = EnvParser.inferSchema(filePath);
      assert.strictEqual(schema.MY_VAR.type, 'string');
      assert.strictEqual(schema.MY_VAR.required, true);
      assert.strictEqual(schema.MY_VAR.default, 'production');
      assert.strictEqual(schema.PORT.type, 'number');
      assert.strictEqual(schema.DEBUG.type, 'boolean');
    });

    it('should handle empty .env file', () => {
      const content = '';
      const filePath = path.join(testDir, '.env');
      fs.writeFileSync(filePath, content);

      const schema = EnvParser.inferSchema(filePath);
      assert.strictEqual(Object.keys(schema).length, 0);
    });
  });

  describe('loadSchema', () => {
    it('should load valid schema from JSON file', () => {
      const schema = {
        KEY: { type: 'string', required: true, description: 'Test key' }
      };
      const filePath = path.join(testDir, 'schema.json');
      fs.writeFileSync(filePath, JSON.stringify(schema));

      const result = EnvParser.loadSchema(filePath);
      assert.deepStrictEqual(result, schema);
    });

    it('should throw error for non-existent file', () => {
      assert.throws(() => {
        EnvParser.loadSchema(path.join(testDir, 'nonexistent.json'));
      });
    });

    it('should throw error for invalid JSON', () => {
      const filePath = path.join(testDir, 'invalid.json');
      fs.writeFileSync(filePath, '{ invalid json }');

      assert.throws(() => {
        EnvParser.loadSchema(filePath);
      });
    });
  });

  describe('saveSchema', () => {
    it('should save schema to JSON file', () => {
      const schema: any = {
        KEY: { type: 'string', required: true }
      };
      const filePath = path.join(testDir, 'schema.json');

      EnvParser.saveSchema(schema, filePath);

      const content = fs.readFileSync(filePath, 'utf-8');
      const result = JSON.parse(content);
      assert.deepStrictEqual(result, schema);
    });
  });

  describe('validateSchema', () => {
    it('should validate correct schema', () => {
      const schema = {
        STRING_KEY: { type: 'string', required: true },
        NUMBER_KEY: { type: 'number', required: false },
        BOOL_KEY: { type: 'boolean', required: true },
        ENUM_KEY: { type: 'enum', required: true, values: ['a', 'b', 'c'] },
        JSON_KEY: { type: 'json', required: false }
      };

      const result = EnvParser.validateSchema(schema);
      assert.strictEqual(result.valid, true);
      assert.strictEqual(result.errors.length, 0);
    });

    it('should detect missing type', () => {
      const schema = {
        KEY: { required: true }
      };

      const result = EnvParser.validateSchema(schema);
      assert.strictEqual(result.valid, false);
      assert.ok(result.errors.some(e => e.includes('missing required \'type\'')));
    });

    it('should detect invalid type', () => {
      const schema = {
        KEY: { type: 'invalid', required: true }
      };

      const result = EnvParser.validateSchema(schema);
      assert.strictEqual(result.valid, false);
      assert.ok(result.errors.some(e => e.includes('invalid type')));
    });

    it('should detect missing required flag', () => {
      const schema = {
        KEY: { type: 'string' }
      };

      const result = EnvParser.validateSchema(schema);
      assert.strictEqual(result.valid, false);
      assert.ok(result.errors.some(e => e.includes('missing \'required\'')));
    });

    it('should detect enum without values', () => {
      const schema = {
        KEY: { type: 'enum', required: true }
      };

      const result = EnvParser.validateSchema(schema);
      assert.strictEqual(result.valid, false);
      assert.ok(result.errors.some(e => e.includes('enum type requires')));
    });

    it('should detect non-object schema', () => {
      const schema = 'invalid';

      const result = EnvParser.validateSchema(schema);
      assert.strictEqual(result.valid, false);
      assert.ok(result.errors.some(e => e.includes('must be an object')));
    });
  });
});