export type SchemaType = 'string' | 'number' | 'boolean' | 'enum' | 'json';

export interface SchemaField {
  type: SchemaType;
  required: boolean;
  description?: string;
  default?: any;
  format?: string;
  values?: string[];
  min?: number;
  max?: number;
  pattern?: string;
  // Environment-specific overrides
  environments?: {
    [key: string]: Partial<SchemaField>;
  };
}

export interface EnvSchema {
  [key: string]: SchemaField;
}

export interface EnvironmentSchema {
  [environment: string]: EnvSchema;
}

export interface ParseResult {
  schema: EnvSchema;
  errors: string[];
}

export interface SchemaConfig {
  environment?: string;
  fallback?: string;
  strictMode?: boolean;
}