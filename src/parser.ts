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
      const trimmed = line.trim();
      // Skip comments and empty lines
      if (!trimmed || trimmed.startsWith('#')) {
        continue;
      }

      // Parse KEY=VALUE
      const eqIndex = trimmed.indexOf('=');
      if (eqIndex > 0) {
        const key = trimmed.substring(0, eqIndex).trim();
        let value = trimmed.substring(eqIndex + 1).trim();
        
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
    if (value.toLowerCase() === 'true' || value.toLowerCase() === 'false') {
      return 'boolean';
    }
    if (!isNaN(Number(value))) {
      return 'number';
    }
    try {
      JSON.parse(value);
      return 'json';
    } catch {
      return 'string';
    }
  }

  /**
   * Create schema from existing .env file with inferred types
   */
  static inferSchema(filePath: string, options: { interactive?: boolean } = {}): EnvSchema {
    const envVars = this.parseEnvFile(filePath);
    const schema: EnvSchema = {};

    for (const [key, value] of envVars.entries()) {
      schema[key] = {
        type: this.inferType(value),
        required: true,
        description: `Environment variable ${key}`,
        default: value
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
}