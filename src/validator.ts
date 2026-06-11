import { EnvSchema, SchemaField, SchemaType } from './schema';

export class EnvValidator {
  private schema: EnvSchema;
  
  // Pre-compiled regex patterns for better performance
  private static readonly BOOLEAN_PATTERNS = [
    'true', 'false', '1', '0', 'yes', 'no', 'on', 'off',
    'TRUE', 'FALSE', 'YES', 'NO', 'ON', 'OFF'
  ];
  
  private static readonly EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  private static readonly URI_PROTOCOLS = ['http:', 'https:', 'ftp:', 'ftps:', 'ws:', 'wss:', 'file:'];
  private static readonly MALICIOUS_PROTOCOLS = ['javascript:', 'data:', 'vbscript:'];

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

  private validateString(
    key: string,
    value: string,
    field: SchemaField,
    errors: string[],
    warnings: string[]
  ): void {
    if (field.pattern && !new RegExp(field.pattern).test(value)) {
      errors.push(`${key}: value does not match pattern ${field.pattern}`);
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
    // Use pre-compiled patterns for O(1) lookup instead of array.includes() O(n)
    const normalizedValue = value.toLowerCase();
    const isValid = EnvValidator.BOOLEAN_PATTERNS.includes(normalizedValue) || 
                   EnvValidator.BOOLEAN_PATTERNS.includes(value);
    
    if (!isValid) {
      errors.push(`${key}: value must be one of: ${EnvValidator.BOOLEAN_PATTERNS.join(', ')}`);
    }
  }

  private validateEnum(key: string, value: string, field: SchemaField, errors: string[]): void {
    if (!field.values || field.values.length === 0) {
      errors.push(`${key}: enum field has no defined values`);
      return;
    }
    
    if (!field.values.includes(value)) {
      errors.push(`${key}: value must be one of [${field.values.join(', ')}]`);
    }
  }

  private validateJson(key: string, value: string, field: SchemaField, errors: string[]): void {
    if (!value || typeof value !== 'string') {
      errors.push(`${key}: JSON value cannot be empty`);
      return;
    }
    
    try {
      // Try to parse JSON
      JSON.parse(value);
    } catch (error) {
      errors.push(`${key}: value is not valid JSON`);
    }
  }

  private isValidUri(value: string): boolean {
    try {
      // Basic URL format check
      if (!value || typeof value !== 'string') {
        return false;
      }
      
      // Try to create URL object - this is the most reliable way
      const url = new URL(value);
      
      // Check if protocol is valid using pre-compiled array for better performance
      if (!url.protocol || !EnvValidator.URI_PROTOCOLS.includes(url.protocol)) {
        return false;
      }
      
      // Check if hostname is present for network protocols (but allow file: for local files)
      if (['http:', 'https:', 'ftp:', 'ftps:', 'ws:', 'wss:'].includes(url.protocol)) {
        if (!url.hostname || url.hostname.length === 0) {
          return false;
        }
      }
      
      // Check for malicious protocols using pre-compiled array
      if (EnvValidator.MALICIOUS_PROTOCOLS.includes(url.protocol)) {
        return false;
      }
      
      return true;
    } catch {
      return false;
    }
  }

  private isValidEmail(value: string): boolean {
    if (!value || typeof value !== 'string') {
      return false;
    }
    
    // Use pre-compiled regex for better performance
    if (!EnvValidator.EMAIL_REGEX.test(value)) {
      return false;
    }
    
    // Check for maximum length (RFC 5321 limit)
    if (value.length > 254) {
      return false;
    }
    
    // Check local part length (max 64 chars)
    const [localPart] = value.split('@');
    if (localPart.length > 64) {
      return false;
    }
    
    return true;
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