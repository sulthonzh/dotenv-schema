import { EnvSchema, SchemaField, SchemaType } from './schema';

export class EnvValidator {
  private schema: EnvSchema;

  constructor(schema: EnvSchema) {
    this.schema = schema;
  }

  /**
   * Validate environment variables against schema
   */
  validate(env: Record<string, string>): { valid: boolean; errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check required fields
    for (const [key, field] of Object.entries(this.schema)) {
      if (field.required && !(key in env)) {
        errors.push(`Missing required environment variable: ${key}`);
        continue;
      }

      if (key in env) {
        this.validateField(key, env[key], field, errors, warnings);
      }
    }

    // Check for unknown env vars
    for (const key of Object.keys(env)) {
      if (!(key in this.schema)) {
        warnings.push(`Unknown environment variable: ${key}`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Validate single field
   */
  private validateField(
    key: string,
    value: string,
    field: SchemaField,
    errors: string[],
    warnings: string[]
  ): void {
    switch (field.type) {
      case 'string':
        this.validateString(key, value, field, errors, warnings);
        break;
      case 'number':
        this.validateNumber(key, value, field, errors, warnings);
        break;
      case 'boolean':
        this.validateBoolean(key, value, field, errors);
        break;
      case 'enum':
        this.validateEnum(key, value, field, errors);
        break;
      case 'json':
        this.validateJson(key, value, field, errors);
        break;
    }
  }

  private static readonly MAX_PATTERN_LENGTH = 500;
  private static readonly TRUTHY_VALUES = new Set(['true', '1', 'yes', 'on']);
  private static readonly FALSY_VALUES = new Set(['false', '0', 'no', 'off']);

  private validateString(
    key: string,
    value: string,
    field: SchemaField,
    errors: string[],
    warnings: string[]
  ): void {
    if (field.pattern) {
      if (field.pattern.length > EnvValidator.MAX_PATTERN_LENGTH) {
        errors.push(`${key}: pattern too long (max ${EnvValidator.MAX_PATTERN_LENGTH} chars)`);
      } else {
        try {
          const regex = new RegExp(field.pattern);
          if (!regex.test(value)) {
            errors.push(`${key}: value does not match pattern ${field.pattern}`);
          }
        } catch {
          errors.push(`${key}: invalid regex pattern ${field.pattern}`);
        }
      }
    }
    if (field.min && value.length < field.min) {
      errors.push(`${key}: value too short (minimum ${field.min} characters)`);
    }
    if (field.max && value.length > field.max) {
      errors.push(`${key}: value too long (maximum ${field.max} characters)`);
    }
    if (field.format) {
      if (field.format === 'uri' && !this.isValidUri(value)) {
        errors.push(`${key}: invalid URI format`);
      } else if (field.format === 'email' && !this.isValidEmail(value)) {
        errors.push(`${key}: invalid email format`);
      }
    }
  }

  private validateNumber(
    key: string,
    value: string,
    field: SchemaField,
    errors: string[],
    warnings: string[]
  ): void {
    const num = Number(value);
    if (isNaN(num)) {
      errors.push(`${key}: value is not a valid number`);
      return;
    }

    if (field.min !== undefined && num < field.min) {
      errors.push(`${key}: value is less than minimum ${field.min}`);
    }
    if (field.max !== undefined && num > field.max) {
      errors.push(`${key}: value is greater than maximum ${field.max}`);
    }
  }

  private validateBoolean(key: string, value: string, field: SchemaField, errors: string[]): void {
    const lower = value.toLowerCase();
    if (!EnvValidator.TRUTHY_VALUES.has(lower) && !EnvValidator.FALSY_VALUES.has(lower)) {
      errors.push(`${key}: value must be one of: true, false, 1, 0, yes, no, on, off`);
    }
  }

  private validateEnum(key: string, value: string, field: SchemaField, errors: string[]): void {
    if (!field.values || !field.values.includes(value)) {
      errors.push(`${key}: value must be one of [${field.values?.join(', ')}]`);
    }
  }

  private validateJson(key: string, value: string, field: SchemaField, errors: string[]): void {
    try {
      JSON.parse(value);
    } catch (error) {
      errors.push(`${key}: value is not valid JSON`);
    }
  }

  private isValidUri(value: string): boolean {
    try {
      new URL(value);
      return true;
    } catch {
      return false;
    }
  }

  private isValidEmail(value: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(value);
  }

  /**
   * Get defaults for optional fields
   */
  getDefaults(): Record<string, string> {
    const defaults: Record<string, string> = {};

    for (const [key, field] of Object.entries(this.schema)) {
      if (!field.required && field.default !== undefined) {
        defaults[key] = String(field.default);
      }
    }

    return defaults;
  }
}