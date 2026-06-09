import * as fs from 'fs';
import * as path from 'path';
import { EnvSchema, SchemaField, SchemaType } from './schema';

export class EnvParser {
  /**
   * Parse existing .env file and extract variables
   */
  static parseEnvFile(filePath: string): Map<string, string> {
    const envVars = new Map<string, string>();
    
    if (!fs.existsSync(filePath)) {
      return envVars;
    }

    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');

    for (const line of lines) {
      let trimmed = line.trim();
      // Skip comments and empty lines
      if (!trimmed || trimmed.startsWith('#')) {
        continue;
      }

      // Handle "export KEY=VALUE" prefix (common in shell-style .env files)
      if (trimmed.startsWith('export ')) {
        trimmed = trimmed.substring(7).trim();
      }

      // Parse KEY=VALUE
      const eqIndex = trimmed.indexOf('=');
      if (eqIndex > 0) {
        const key = trimmed.substring(0, eqIndex).trim();
        let value = trimmed.substring(eqIndex + 1).trim();
        
        // Strip inline comments (only when value is unquoted)
        // e.g. KEY=value # comment → value
        // But KEY="value # not a comment" → value # not a comment
        if (!value.startsWith('"') && !value.startsWith("'")) {
          const commentIdx = value.indexOf(' #');
          if (commentIdx > 0) {
            value = value.substring(0, commentIdx).trimEnd();
          }
        }
        
        // Remove quotes if present
        if ((value.startsWith('"') && value.endsWith('"')) ||
            (value.startsWith("'") && value.endsWith("'"))) {
          value = value.substring(1, value.length - 1);
        }

        envVars.set(key, value);
      }
    }

    return envVars;
  }

  /**
   * Infer type from value string
   */
  static inferType(value: string): SchemaType {
    const lower = value.toLowerCase();
    // Common boolean representations in .env files
    if (['true', 'false', '1', '0', 'yes', 'no', 'on', 'off'].includes(lower) || 
        ['true', 'false', '1', '0', 'yes', 'no', 'on', 'off'].includes(value)) {
      return 'boolean';
    }
    if (!isNaN(Number(value)) && value.trim() !== '' && isFinite(Number(value))) {
      return 'number';
    }
    try {
      const parsed = JSON.parse(value);
      if (typeof parsed === 'object' && parsed !== null) {
        return 'json';
      }
    } catch {}
    return 'string';
  }

  /**
   * Detect common format patterns for smarter schema inference
   */
  static inferFormat(key: string, value: string): string | undefined {
    const upperKey = key.toUpperCase();
    // URL/URI detection
    if (/^https?:\/\//.test(value) || upperKey.includes('URL') || upperKey.endsWith('_URI')) {
      return 'uri';
    }
    // Email detection
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) || upperKey.includes('EMAIL') || upperKey.includes('MAIL')) {
      return 'email';
    }
    return undefined;
  }

  /**
   * Detect common enum patterns (e.g., NODE_ENV)
   */
  static inferEnumValues(key: string, value: string): string[] | undefined {
    const upperKey = key.toUpperCase();
    const enumMappings: Record<string, string[]> = {
      NODE_ENV: ['development', 'production', 'test', 'staging'],
      ENV: ['development', 'production', 'test', 'staging'],
      APP_ENV: ['development', 'production', 'test', 'staging'],
      LOG_LEVEL: ['debug', 'info', 'warn', 'error', 'fatal'],
    };
    if (enumMappings[upperKey]) {
      return enumMappings[upperKey];
    }
    return undefined;
  }

  /**
   * Create schema from existing .env file with inferred types
   */
  static inferSchema(filePath: string, options: { interactive?: boolean } = {}): EnvSchema {
    const envVars = this.parseEnvFile(filePath);
    const schema: EnvSchema = {};

    for (const [key, value] of envVars.entries()) {
      const enumValues = this.inferEnumValues(key, value);
      const format = this.inferFormat(key, value);
      const type = enumValues ? 'enum' : this.inferType(value);

      schema[key] = {
        type,
        required: true,
        description: `Environment variable ${key}`,
        default: value,
        ...(enumValues ? { values: enumValues } : {}),
        ...(format ? { format } : {}),
      };
    }

    return schema;
  }

  /**
   * Load schema from JSON file
   */
  static loadSchema(filePath: string): EnvSchema {
    if (!fs.existsSync(filePath)) {
      throw new Error(`Schema file not found: ${filePath}`);
    }

    const content = fs.readFileSync(filePath, 'utf-8');
    try {
      return JSON.parse(content) as EnvSchema;
    } catch (error) {
      throw new Error(`Invalid JSON in schema file: ${error}`);
    }
  }

  /**
   * Save schema to JSON file
   */
  static saveSchema(schema: EnvSchema, filePath: string): void {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    const content = JSON.stringify(schema, null, 2);
    fs.writeFileSync(filePath, content, 'utf-8');
  }

  /**
   * Validate schema structure
   */
  static validateSchema(schema: any): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (typeof schema !== 'object' || schema === null) {
      errors.push('Schema must be an object');
      return { valid: false, errors };
    }

    const validTypes: SchemaType[] = ['string', 'number', 'boolean', 'enum', 'json'];

    for (const [key, field] of Object.entries(schema)) {
      if (typeof field !== 'object' || field === null) {
        errors.push(`${key}: field must be an object`);
        continue;
      }

      const schemaField = field as SchemaField;

      if (!schemaField.type) {
        errors.push(`${key}: missing required 'type' property`);
      } else if (!validTypes.includes(schemaField.type)) {
        errors.push(`${key}: invalid type '${schemaField.type}'`);
      }

      if (schemaField.type === 'enum' && !schemaField.values) {
        errors.push(`${key}: enum type requires 'values' array`);
      }

      if (schemaField.required === undefined) {
        errors.push(`${key}: missing 'required' property`);
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Merge multiple .env files with conflict detection
   * Files are applied in order: later files override earlier ones
   * Returns merged vars and any conflicts found
   */
  static merge(
    filePaths: string[],
    options: { failOnConflict?: boolean } = {}
  ): {
    merged: Map<string, string>;
    conflicts: { key: string; files: { file: string; value: string }[] }[];
    sources: Record<string, string>;
  } {
    const merged = new Map<string, string>();
    const sources: Record<string, string> = {};
    const allValues: Record<string, { file: string; value: string }[]> = {};

    for (const filePath of filePaths) {
      if (!fs.existsSync(filePath)) {
        continue;
      }
      const vars = this.parseEnvFile(filePath);
      for (const [key, value] of vars.entries()) {
        if (!allValues[key]) {
          allValues[key] = [];
        }
        allValues[key].push({ file: path.basename(filePath), value });
        merged.set(key, value);
        sources[key] = path.basename(filePath);
      }
    }

    // Detect conflicts: same key with different values across files
    const conflicts: { key: string; files: { file: string; value: string }[] }[] = [];
    for (const [key, entries] of Object.entries(allValues)) {
      const uniqueValues = new Set(entries.map(e => e.value));
      if (uniqueValues.size > 1) {
        conflicts.push({ key, files: entries });
      }
    }

    if (options.failOnConflict && conflicts.length > 0) {
      const conflictKeys = conflicts.map(c => c.key).join(', ');
      throw new Error(`Merge conflicts detected: ${conflictKeys}`);
    }

    return { merged, conflicts, sources };
  }

  /**
   * Compare .env file against schema and return a diff report
   */
  static diff(envPath: string, schemaPath: string): {
    missing: string[];
    extra: string[];
    typeMismatches: { key: string; expected: string; actual: string }[];
    defaults: { key: string; default: string }[];
  } {
    const envVars = this.parseEnvFile(envPath);
    const schema = this.loadSchema(schemaPath);
    const envKeys = new Set(envVars.keys());
    const schemaKeys = new Set(Object.keys(schema));

    const missing: string[] = [];
    const extra: string[] = [];
    const typeMismatches: { key: string; expected: string; actual: string }[] = [];
    const defaults: { key: string; default: string }[] = [];

    // Find required vars missing from .env
    for (const [key, field] of Object.entries(schema)) {
      if (!envKeys.has(key)) {
        if (field.required) {
          missing.push(key);
        }
        if (field.default !== undefined) {
          defaults.push({ key, default: String(field.default) });
        }
      } else {
        // Check type match
        const actualType = this.inferType(envVars.get(key)!);
        if (actualType !== field.type && !(field.type === 'string' && actualType === 'string')) {
          typeMismatches.push({ key, expected: field.type, actual: actualType });
        }
      }
    }

    // Find vars in .env not in schema
    for (const key of envKeys) {
      if (!schemaKeys.has(key)) {
        extra.push(key);
      }
    }

    return { missing, extra, typeMismatches, defaults };
  }
}
