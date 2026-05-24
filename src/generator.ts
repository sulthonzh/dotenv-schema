import * as fs from 'fs';
import { EnvSchema, SchemaField } from './schema';

export class Generator {
  /**
   * Generate .env.example file
   */
  static generateEnvExample(schema: EnvSchema): string {
    const lines: string[] = [];
    lines.push('# Environment variables example');
    lines.push('# Copy this file to .env and fill in the values');
    lines.push('');

    for (const [key, field] of Object.entries(schema)) {
      // Add description as comment
      if (field.description) {
        lines.push(`# ${field.description}`);
      }

      // Add required marker
      const required = field.required ? ' (required)' : ` (optional, default: ${field.default ?? ''})`;
      lines.push(`# ${required}`);

      // Add type hint
      if (field.type === 'enum' && field.values) {
        lines.push(`# Options: ${field.values.join(', ')}`);
      }

      // Generate value
      let value = '';
      if (field.default !== undefined) {
        value = String(field.default);
      } else if (field.type === 'boolean') {
        value = 'false';
      } else if (field.type === 'number') {
        value = '0';
      } else if (field.type === 'json') {
        value = '{}';
      }

      lines.push(`${key}=${value}`);
      lines.push('');
    }

    return lines.join('\n');
  }

  /**
   * Generate TypeScript types
   */
  static generateTypes(schema: EnvSchema): string {
    const lines: string[] = [];
    lines.push('// Auto-generated TypeScript types for environment variables');
    lines.push('// DO NOT EDIT - regenerate with dotenv-schema generate --types');
    lines.push('');
    lines.push('export interface EnvSchema {');

    for (const [key, field] of Object.entries(schema)) {
      let typeStr = this.getTypeScriptType(field);

      if (!field.required) {
        typeStr += ' | undefined';
      }

      const optional = field.required ? '' : '?';
      lines.push(`  ${key}${optional}: ${typeStr};`);
    }

    lines.push('}');
    lines.push('');

    // Generate type guard function
    lines.push('export function isEnvSchema(obj: any): obj is EnvSchema {');
    lines.push('  if (typeof obj !== "object" || obj === null) {');
    lines.push('    return false;');
    lines.push('  }');
    lines.push('');

    for (const [key, field] of Object.entries(schema)) {
      lines.push(`  if (!${this.getTypeCheck(key, field)}) {`);
      lines.push('    return false;');
      lines.push('  }');
    }

    lines.push('  return true;');
    lines.push('}');

    return lines.join('\n');
  }

  private static getTypeScriptType(field: SchemaField): string {
    switch (field.type) {
      case 'string':
        return 'string';
      case 'number':
        return 'number';
      case 'boolean':
        return 'boolean';
      case 'json':
        return 'any';
      case 'enum':
        return field.values ? field.values.map(v => `'${v}'`).join(' | ') : 'string';
      default:
        return 'any';
    }
  }

  private static getTypeCheck(key: string, field: SchemaField): string {
    const access = `obj['${key}']`;

    if (!field.required) {
      return `(${access} === undefined || ${this.getValueCheck(access, field)})`;
    }

    return this.getValueCheck(access, field);
  }

  private static getValueCheck(access: string, field: SchemaField): string {
    switch (field.type) {
      case 'string':
        return `typeof ${access} === "string"`;
      case 'number':
        return `typeof ${access} === "number" && !isNaN(${access})`;
      case 'boolean':
        return `typeof ${access} === "boolean"`;
      case 'json':
        return `typeof ${access} === "object" || typeof ${access} === "string"`;
      case 'enum':
        return `[${field.values?.map(v => `'${v}'`).join(', ')}].includes(${access})`;
      default:
        return 'true';
    }
  }

  /**
   * Generate validation code
   */
  static generateValidator(schema: EnvSchema): string {
    const lines: string[] = [];
    lines.push('// Auto-generated validation code for environment variables');
    lines.push('// DO NOT EDIT - regenerate with dotenv-schema generate --validator');
    lines.push('');
    lines.push('import { EnvValidator } from "./validator";');
    lines.push('');
    lines.push('const schema: EnvSchema = {');

    for (const [key, field] of Object.entries(schema)) {
      const fieldStr = JSON.stringify(field, null, 6).trim();
      lines.push(`  "${key}": ${fieldStr},`);
    }

    lines.push('};');
    lines.push('');
    lines.push('export const validator = new EnvValidator(schema);');
    lines.push('');
    lines.push('export function validateEnv(env: Record<string, string>) {');
    lines.push('  return validator.validate(env);');
    lines.push('}');

    return lines.join('\n');
  }

  /**
   * Generate documentation
   */
  static generateDocs(schema: EnvSchema): string {
    const lines: string[] = [];
    lines.push('# Environment Variables Documentation');
    lines.push('');
    lines.push('| Variable | Type | Required | Default | Description |');
    lines.push('|----------|------|----------|---------|-------------|');

    for (const [key, field] of Object.entries(schema)) {
      const type = this.getDisplayType(field);
      const required = field.required ? '✅' : '❌';
      const defaultVal = field.default !== undefined ? String(field.default) : '-';
      const description = field.description || '-';

      lines.push(`| \`${key}\` | ${type} | ${required} | \`${defaultVal}\` | ${description} |`);
    }

    return lines.join('\n');
  }

  private static getDisplayType(field: SchemaField): string {
    if (field.type === 'enum' && field.values) {
      return `enum(${field.values.join(', ')})`;
    }
    return field.type;
  }

  /**
   * Write generated content to file
   */
  static writeToFile(content: string, filePath: string): void {
    const dir = filePath.substring(0, filePath.lastIndexOf('/'));
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(filePath, content, 'utf-8');
  }
}