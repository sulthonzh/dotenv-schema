import { describe, it } from 'node:test';
import assert from 'node:assert';
import { Generator } from '../src/generator';
import { EnvSchema } from '../src/schema';

describe('Generator', () => {
  const schema: EnvSchema = {
    NODE_ENV: {
      type: 'enum',
      required: true,
      values: ['development', 'production', 'test'],
      description: 'Application environment'
    },
    DATABASE_URL: {
      type: 'string',
      required: true,
      format: 'uri',
      description: 'Database connection string'
    },
    PORT: {
      type: 'number',
      required: false,
      default: 3000,
      description: 'Server port number'
    },
    DEBUG: {
      type: 'boolean',
      required: false,
      default: false,
      description: 'Enable debug mode'
    },
    CONFIG: {
      type: 'json',
      required: false,
      default: '{}',
      description: 'Application configuration'
    }
  };

  describe('generateEnvExample', () => {
    it('should generate .env.example content', () => {
      const result = Generator.generateEnvExample(schema);

      assert.ok(result.includes('NODE_ENV='));
      assert.ok(result.includes('DATABASE_URL='));
      assert.ok(result.includes('PORT=3000'));
      assert.ok(result.includes('DEBUG=false'));
      assert.ok(result.includes('CONFIG={}'));
      assert.ok(result.includes('Application environment'));
      assert.ok(result.includes('Database connection string'));
    });

    it('should include required markers', () => {
      const result = Generator.generateEnvExample(schema);

      assert.ok(result.includes('(required)'));
      assert.ok(result.includes('(optional, default:'));
    });

    it('should include enum options', () => {
      const result = Generator.generateEnvExample(schema);

      assert.ok(result.includes('Options: development, production, test'));
    });
  });

  describe('generateTypes', () => {
    it('should generate TypeScript types', () => {
      const result = Generator.generateTypes(schema);

      assert.ok(result.includes('export interface EnvSchema'));
      assert.ok(result.includes('NODE_ENV: \'development\' | \'production\' | \'test\';'));
      assert.ok(result.includes('DATABASE_URL: string;'));
      assert.ok(result.includes('PORT?: number | undefined;'));
      assert.ok(result.includes('DEBUG?: boolean | undefined;'));
      assert.ok(result.includes('CONFIG?: any | undefined;'));
    });

    it('should generate type guard function', () => {
      const result = Generator.generateTypes(schema);

      assert.ok(result.includes('export function isEnvSchema'));
      assert.ok(result.includes('obj is EnvSchema'));
    });
  });

  describe('generateValidator', () => {
    it('should generate validation code', () => {
      const result = Generator.generateValidator(schema);

      assert.ok(result.includes('import { EnvValidator }'));
      assert.ok(result.includes('const schema: EnvSchema = {'));
      assert.ok(result.includes('export const validator = new EnvValidator(schema)'));
      assert.ok(result.includes('export function validateEnv'));
    });

    it('should include all schema fields', () => {
      const result = Generator.generateValidator(schema);

      assert.ok(result.includes('NODE_ENV'));
      assert.ok(result.includes('DATABASE_URL'));
      assert.ok(result.includes('PORT'));
      assert.ok(result.includes('DEBUG'));
      assert.ok(result.includes('CONFIG'));
    });
  });

  describe('generateDocs', () => {
    it('should generate markdown documentation', () => {
      const result = Generator.generateDocs(schema);

      assert.ok(result.includes('# Environment Variables Documentation'));
      assert.ok(result.includes('| Variable | Type | Required |'));
      assert.ok(result.includes('| `NODE_ENV` | enum(development, production, test)'));
      assert.ok(result.includes('| `DATABASE_URL` | string | ✅ |'));
      assert.ok(result.includes('| `PORT` | number | ❌ |'));
      assert.ok(result.includes('| `DEBUG` | boolean | ❌ |'));
      assert.ok(result.includes('| `CONFIG` | json | ❌ |'));
    });

    it('should include descriptions and defaults', () => {
      const result = Generator.generateDocs(schema);

      assert.ok(result.includes('Application environment'));
      assert.ok(result.includes('Database connection string'));
      assert.ok(result.includes('Server port number'));
      assert.ok(result.includes('| `3000` |'));
      assert.ok(result.includes('| `false` |'));
    });
  });

  describe('getDisplayType', () => {
    it('should format enum types correctly', () => {
      const enumSchema: EnvSchema = {
        STATUS: {
          type: 'enum',
          required: true,
          values: ['active', 'inactive', 'pending']
        }
      };

      const result = Generator.generateDocs(enumSchema);
      assert.ok(result.includes('| `STATUS` | enum(active, inactive, pending)'));
    });
  });
});