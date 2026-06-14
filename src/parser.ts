import * as fs from 'fs';
import * as path from 'path';
import { EnvSchema, SchemaField, SchemaType, EnvironmentSchema, SchemaConfig } from './schema';

export class EnvParser {
  /**
   * Parse existing .env file and extract variables
   * Enhanced with input validation and security checks
   */
  static parseEnvFile(filePath: string): Map<string, string> {
    const envVars = new Map<string, string>();
    
    // Security: Validate file path to prevent directory traversal
    if (!this.isValidFilePath(filePath)) {
      throw new Error(`Invalid file path: ${filePath}`);
    }
    
    if (!fs.existsSync(filePath)) {
      return envVars;
    }

    // Check file size to prevent memory exhaustion
    const stats = fs.statSync(filePath);
    if (stats.size > 10 * 1024 * 1024) { // 10MB limit
      throw new Error(`File size too large: ${filePath} exceeds 10MB limit`);
    }

    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
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
        
        // Validate key name - must be valid environment variable name
        if (!this.isValidKeyName(key)) {
          throw new Error(`Invalid environment variable name on line ${i + 1}: ${key}`);
        }
        
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
        
        // Check for potential command injection in values
        if (this.containsPotentiallyDangerousContent(value)) {
          throw new Error(`Potentially dangerous content in environment variable ${key} on line ${i + 1}`);
        }

        // Limit value size to prevent memory issues
        if (value.length > 1024 * 1024) { // 1MB limit per value
          throw new Error(`Value too large for variable ${key}: exceeds 1MB limit`);
        }

        envVars.set(key, value);
      }
    }

    return envVars;
  }
  
  /**
   * Validate environment variable key name
   */
  private static isValidKeyName(key: string): boolean {
    if (typeof key !== 'string' || key.length === 0 || key.length > 100) {
      return false;
    }
    
    // Environment variable names must start with letter or underscore,
    // followed by letters, numbers, or underscores
    const validKeyRegex = /^[A-Za-z_][A-Za-z0-9_]*$/;
    return validKeyRegex.test(key);
  }
  
  /**
   * Check for potentially dangerous content in environment variable values
   */
  private static containsPotentiallyDangerousContent(value: string): boolean {
    // Check for potentially dangerous shell command patterns
    const dangerousPatterns = [
      /\b(rm|mv|cp|chmod|chown|userdel|groupdel|deluser|delgroup)\s+\S/i,
      /\b(exec|eval|system|shell_exec|popen)\(/i,
      /\$\(.*\)/, // Command substitution: $(cmd)
      /`[^`]*`/,   // Backtick command substitution
      /\b(sudo|su|passwd|mkpasswd)\s+\S/i,
      /javascript:/i,
      /vbscript:/i,
      /data:text\/html/i
    ];
    
    return dangerousPatterns.some(pattern => pattern.test(value));
  }

  /**
   * Infer type from value string
   */
  static inferType(value: string): SchemaType {
    const lower = value.toLowerCase();
    // Common boolean representations in .env files
    // Note: '1' and '0' are intentionally excluded from boolean inference
    // because they are numbers first (e.g., PORT=0, MAX_RETRIES=1)
    if (['true', 'false', 'yes', 'no', 'on', 'off'].includes(lower) || 
        ['true', 'false', 'yes', 'no', 'on', 'off'].includes(value)) {
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
    // Security: Validate file path to prevent directory traversal
    if (!this.isValidFilePath(filePath)) {
      throw new Error(`Invalid schema file path: ${filePath}`);
    }
    
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
    // Security: Validate file path to prevent directory traversal
    if (!this.isValidFilePath(filePath)) {
      throw new Error(`Invalid output file path: ${filePath}`);
    }
    
    const dir = path.dirname(filePath);
    if (dir && !fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    const content = JSON.stringify(schema, null, 2);
    fs.writeFileSync(filePath, content, 'utf-8');
  }

  /**
   * Validate schema structure with comprehensive checks
   */
  static validateSchema(schema: any): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check if schema is an object
    if (typeof schema !== 'object' || schema === null) {
      errors.push('Schema must be an object');
      return { valid: false, errors };
    }

    const validTypes: SchemaType[] = ['string', 'number', 'boolean', 'enum', 'json'];
    const enumValuesMaxLength = 100; // Maximum allowed enum values
    const descriptionMaxLength = 500; // Maximum description length

    for (const [key, field] of Object.entries(schema)) {
      // Validate field name
      if (!this.isValidKeyName(key)) {
        errors.push(`${key}: invalid field name (must start with letter/underscore, contain only letters, numbers, underscores, max 100 chars)`);
      }

      if (typeof field !== 'object' || field === null) {
        errors.push(`${key}: field must be an object`);
        continue;
      }

      const schemaField = field as SchemaField;

      // Check for required properties
      if (!schemaField.hasOwnProperty('type')) {
        errors.push(`${key}: missing required 'type' property`);
      } else if (!validTypes.includes(schemaField.type)) {
        errors.push(`${key}: invalid type '${schemaField.type}'. Must be one of: ${validTypes.join(', ')}`);
      }

      // Validate required flag
      if (schemaField.required === undefined) {
        errors.push(`${key}: missing 'required' property (must be true or false)`);
      } else if (typeof schemaField.required !== 'boolean') {
        errors.push(`${key}: 'required' must be a boolean value`);
      }

      // Validate description if present
      if (schemaField.description !== undefined) {
        if (typeof schemaField.description !== 'string') {
          errors.push(`${key}: description must be a string`);
        } else if (schemaField.description.length > descriptionMaxLength) {
          errors.push(`${key}: description exceeds maximum length of ${descriptionMaxLength} characters`);
        }
      }

      // Validate default value if present
      if (schemaField.default !== undefined) {
        if (schemaField.default === null) {
          errors.push(`${key}: default value cannot be null`);
        } else {
          try {
            // Validate default value against field type
            this.validateDefaultForType(key, schemaField.default, schemaField.type);
          } catch (error) {
            errors.push(`${key}: invalid default value - ${String(error)}`);
          }
        }
      }

      // Validate environment-specific overrides
      if (schemaField.environments !== undefined) {
        if (typeof schemaField.environments !== 'object' || schemaField.environments === null) {
          errors.push(`${key}: environments must be an object`);
        } else {
          const validEnvironments = ['development', 'production', 'test', 'staging'];
          for (const [env, override] of Object.entries(schemaField.environments)) {
            if (!validEnvironments.includes(env)) {
              errors.push(`${key}: invalid environment '${env}'. Must be one of: ${validEnvironments.join(', ')}`);
            } else if (typeof override !== 'object' || override === null) {
              errors.push(`${key}: environment override for '${env}' must be an object`);
            }
          }
        }
      }

      // Validate type-specific properties
      this.validateTypeSpecificFields(key, schemaField, errors);
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
  
  /**
   * Validate default value against field type
   */
  private static validateDefaultForType(key: string, defaultValue: any, type: SchemaType): void {
    switch (type) {
      case 'string':
        if (typeof defaultValue !== 'string') {
          throw new Error(`default value must be a string`);
        }
        break;
      case 'number':
        if (typeof defaultValue !== 'number' || isNaN(defaultValue)) {
          throw new Error(`default value must be a valid number`);
        }
        break;
      case 'boolean':
        if (typeof defaultValue !== 'boolean') {
          throw new Error(`default value must be a boolean`);
        }
        break;
      case 'enum':
        if (typeof defaultValue !== 'string') {
          throw new Error(`default value must be a string for enum type`);
        }
        break;
      case 'json':
        if (typeof defaultValue === 'string') {
          // String defaults must be parseable as JSON
          try {
            JSON.parse(defaultValue);
          } catch {
            throw new Error(`default value must be valid JSON`);
          }
        } else if (typeof defaultValue !== 'object' || defaultValue === null) {
          throw new Error(`default value must be a JSON string or object`);
        }
        break;
    }
  }
  
  /**
   * Validate type-specific field properties
   */
  private static validateTypeSpecificFields(key: string, field: SchemaField, errors: string[]): void {
    switch (field.type) {
      case 'string':
        if (field.pattern !== undefined) {
          try {
            new RegExp(field.pattern);
          } catch {
            errors.push(`${key}: invalid regular expression pattern`);
          }
        }
        if (field.min !== undefined && (typeof field.min !== 'number' || field.min < 0)) {
          errors.push(`${key}: min must be a positive number`);
        }
        if (field.max !== undefined && (typeof field.max !== 'number' || field.max < 0)) {
          errors.push(`${key}: max must be a positive number`);
        }
        if (field.min !== undefined && field.max !== undefined && field.min > field.max) {
          errors.push(`${key}: min value cannot be greater than max value`);
        }
        break;
      
      case 'number':
        if (field.min !== undefined && (typeof field.min !== 'number' || isNaN(field.min))) {
          errors.push(`${key}: min must be a valid number`);
        }
        if (field.max !== undefined && (typeof field.max !== 'number' || isNaN(field.max))) {
          errors.push(`${key}: max must be a valid number`);
        }
        if (field.min !== undefined && field.max !== undefined && field.min > field.max) {
          errors.push(`${key}: min value cannot be greater than max value`);
        }
        break;
      
      case 'enum':
        if (!Array.isArray(field.values) || field.values.length === 0) {
          errors.push(`${key}: enum type requires non-empty 'values' array`);
        } else {
          if (field.values.length > 100) {
            errors.push(`${key}: enum values array exceeds maximum length of 100`);
          }
          
          // Check for duplicate values
          const uniqueValues = new Set(field.values);
          if (uniqueValues.size !== field.values.length) {
            errors.push(`${key}: enum values must be unique`);
          }
          
          // Validate each value
          for (let i = 0; i < field.values.length; i++) {
            const value = field.values[i];
            if (typeof value !== 'string') {
              errors.push(`${key}: enum value at index ${i} must be a string`);
            } else if (value.length === 0 || value.length > 100) {
              errors.push(`${key}: enum value at index ${i} must be 1-100 characters long`);
            }
          }
        }
        break;
    }
  }

  /**
   * Merge multiple .env files with conflict detection
   * Files are applied in order: later files override earlier ones
   * Returns merged vars and any conflicts found
   */
  static merge(
    filePaths: string[],
    options: { failOnConflict?: boolean; verbose?: boolean } = {}
  ): {
    merged: Map<string, string>;
    conflicts: { key: string; files: { file: string; value: string }[] }[];
    sources: Record<string, string>;
    summary: {
      totalFiles: number;
      totalVariables: number;
      conflictsCount: number;
      overriddenKeys: string[];
    };
  } {
    const merged = new Map<string, string>();
    const sources: Record<string, string> = {};
    const allValues: Record<string, { file: string; value: string }[]> = {};
    const overriddenKeys = new Set<string>();

    // Security: Validate all file paths before processing
    for (const filePath of filePaths) {
      if (!this.isValidFilePath(filePath)) {
        throw new Error(`Invalid file path in merge: ${filePath}`);
      }
    }

    // Check if files exist
    const existingFiles = filePaths.filter(fs.existsSync);
    if (existingFiles.length === 0) {
      throw new Error('No valid .env files found to merge');
    }
    
    if (options.verbose) {
      console.log(`Found ${existingFiles.length} valid files out of ${filePaths.length} specified`);
    }

    for (const filePath of filePaths) {
      if (!fs.existsSync(filePath)) {
        if (options.verbose) {
          console.warn(`Skipping non-existent file: ${filePath}`);
        }
        continue;
      }
      
      try {
        const vars = this.parseEnvFile(filePath);
        const fileName = path.basename(filePath);
        
        for (const [key, value] of vars.entries()) {
          // Check if this key already exists (override detection)
          if (merged.has(key)) {
            overriddenKeys.add(key);
          }
          
          if (!allValues[key]) {
            allValues[key] = [];
          }
          allValues[key].push({ file: fileName, value });
          merged.set(key, value);
          sources[key] = fileName;
        }
        
        if (options.verbose) {
          console.log(`Processed ${vars.size} variables from ${fileName}`);
        }
      } catch (error) {
        throw new Error(`Failed to parse ${filePath}: ${String(error)}`);
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
      const conflictDetails = conflicts.map(c => {
        const values = c.files.map(f => `${f.file}: ${f.value}`).join(', ');
        return `${c.key} (${values})`;
      }).join('; ');
      
      throw new Error(`Merge conflicts detected:\n  ${conflictDetails}`);
    }

    return { 
      merged, 
      conflicts, 
      sources,
      summary: {
        totalFiles: existingFiles.length,
        totalVariables: merged.size,
        conflictsCount: conflicts.length,
        overriddenKeys: Array.from(overriddenKeys)
      }
    };
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
        if (actualType !== field.type && !(field.type === 'boolean' && actualType === 'number' && ['1', '0'].includes(envVars.get(key)!))) {
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

  /**
   * Resolve environment-specific schema with fallback support
   */
  static resolveEnvironmentSchema(
    schema: EnvSchema | EnvironmentSchema,
    config: SchemaConfig = {}
  ): EnvSchema {
    const { environment = process.env.NODE_ENV || 'development', fallback, strictMode = false } = config;
    const validEnvironments = ['development', 'production', 'test', 'staging'];
    
    // Detect whether this is an EnvironmentSchema (environment-keyed) or flat EnvSchema.
    // An EnvironmentSchema has ONLY environment names as top-level keys, and each value
    // is itself an EnvSchema (object of SchemaFields). A flat EnvSchema has variable
    // names as keys with SchemaField values that have a 'type' property.
    const isEnvSchema = this.isEnvironmentSchema(schema);
    
    if (!isEnvSchema) {
      return schema as EnvSchema;
    }
    
    const environmentSchema = schema as EnvironmentSchema;
    const resolvedSchema: EnvSchema = {};
    
    // Apply base schema for the target environment
    const baseSchema = environmentSchema[environment] || {};
    
    // Apply environment-specific overrides
    for (const [key, field] of Object.entries(baseSchema)) {
      const resolvedField: SchemaField = { ...field };
      
      // Apply environment-specific overrides if they exist
      if (field.environments && field.environments[environment]) {
        const override = field.environments[environment];
        Object.assign(resolvedField, override);
        
        // Handle environment-specific defaults
        if (override.default !== undefined) {
          resolvedField.default = override.default;
        }
        
        // Handle environment-specific required flag
        if (override.required !== undefined) {
          resolvedField.required = override.required;
        }
      }
      
      resolvedSchema[key] = resolvedField;
    }
    
    // Apply fallback if specified
    if (fallback && validEnvironments.includes(fallback)) {
      const fallbackSchema = environmentSchema[fallback];
      if (fallbackSchema) {
        for (const [key, field] of Object.entries(fallbackSchema)) {
          if (!resolvedSchema[key] && !strictMode) {
            // In non-strict mode, include fallback variables that don't exist in current environment
            resolvedSchema[key] = field as SchemaField;
          }
        }
      }
    }
    
    return resolvedSchema;
  }

  /**
   * Detect whether a schema object is an EnvironmentSchema (keyed by environment names)
   * or a flat EnvSchema (keyed by variable names with SchemaField values).
   */
  private static isEnvironmentSchema(schema: any): boolean {
    if (typeof schema !== 'object' || schema === null) {
      return false;
    }
    const keys = Object.keys(schema);
    if (keys.length === 0) {
      return false;
    }
    const validEnvironments = ['development', 'production', 'test', 'staging'];
    // Must have at least one key that's an environment name, AND every key must be
    // an environment name, AND every value must be an EnvSchema (object of SchemaFields)
    return keys.every(key => {
      if (!validEnvironments.includes(key)) return false;
      const value = schema[key];
      if (typeof value !== 'object' || value === null) return false;
      // Each value should be an EnvSchema — object with SchemaField values (which have 'type')
      const innerKeys = Object.keys(value);
      return innerKeys.every(innerKey => {
        const innerVal = value[innerKey];
        return typeof innerVal === 'object' && innerVal !== null && 'type' in innerVal;
      });
    });
  }

  /**
   * Validate file path to prevent malicious patterns
   * Focuses on blocking executable/script files and null bytes
   * without blocking legitimate relative paths like ../config/.env
   */
  private static isValidFilePath(filePath: string): boolean {
    try {
      if (typeof filePath !== 'string' || !filePath.trim()) {
        return false;
      }

      // Block null bytes (path injection)
      if (filePath.includes('\0')) {
        return false;
      }

      const normalized = path.normalize(filePath);

      // Check for potentially dangerous file extensions
      const dangerousExtensions = ['.sh', '.bat', '.cmd', '.ps1', '.exe', '.scr', '.com'];
      const ext = path.extname(normalized).toLowerCase();
      if (dangerousExtensions.includes(ext)) {
        return false;
      }

      // Reject symlinks pointing outside expected areas
      const resolved = path.resolve(normalized);
      try {
        const stats = fs.lstatSync(resolved, { throwIfNoEntry: false });
        if (stats && stats.isSymbolicLink()) {
          // Resolve the symlink target and check if it's reasonable
          const realPath = fs.realpathSync(resolved);
          // Block if symlink targets a script/executable location
          const targetExt = path.extname(realPath).toLowerCase();
          if (dangerousExtensions.includes(targetExt)) {
            return false;
          }
        }
      } catch {
        // File may not exist yet (for output paths) — that's fine
      }

      return true;
    } catch {
      return false;
    }
  }
}
