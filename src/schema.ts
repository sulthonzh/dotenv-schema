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
}

export interface EnvSchema {
  [key: string]: SchemaField;
}

export interface ParseResult {
  schema: EnvSchema;
  errors: string[];
}