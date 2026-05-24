import * as fs from 'fs';
import { EnvSchema, SchemaField, SchemaType } from './schema';
import { EnvParser } from './parser';

const Prompt = require('enquirer');

export class SchemaWizard {
  /**
   * Interactive wizard to create schema from existing .env
   */
  static async interactiveCreate(envPath: string): Promise<EnvSchema> {
    const envVars = EnvParser.parseEnvFile(envPath);
    const schema: EnvSchema = {};

    console.log(`Found ${envVars.size} environment variables in ${envPath}\n`);

    for (const [key, value] of envVars.entries()) {
      console.log(`\nConfiguring: ${key} = ${value}`);

      const field = await this.promptForField(key, value);
      schema[key] = field;
    }

    return schema;
  }

  /**
   * Prompt for field configuration
   */
  private static async promptForField(key: string, currentValue: string): Promise<SchemaField> {
    const type = await this.promptType(key, currentValue);
    const required = await this.promptRequired(key);
    const description = await this.promptDescription(key);

    let values: string[] | undefined;
    if (type === 'enum') {
      values = await this.promptEnumValues(key, currentValue);
    }

    return {
      type,
      required,
      description,
      values,
      default: !required ? currentValue : undefined
    };
  }

  private static async promptType(key: string, currentValue: string): Promise<SchemaType> {
    const inferred = EnvParser.inferType(currentValue);
    const prompt = new Prompt.Select({
      name: 'type',
      message: `Type for ${key}`,
      choices: ['string', 'number', 'boolean', 'enum', 'json'],
      initial: inferred
    });

    const result = await prompt.run();
    return result as SchemaType;
  }

  private static async promptRequired(key: string): Promise<boolean> {
    const prompt = new Prompt.Confirm({
      name: 'required',
      message: `Is ${key} required?`,
      initial: true
    });

    return await prompt.run();
  }

  private static async promptDescription(key: string): Promise<string | undefined> {
    const prompt = new Prompt.Input({
      name: 'description',
      message: `Description for ${key}`,
      initial: ''
    });

    const result = await prompt.run();
    return result || undefined;
  }

  private static async promptEnumValues(key: string, currentValue: string): Promise<string[]> {
    const prompt = new Prompt.Input({
      name: 'values',
      message: `Comma-separated enum values for ${key}`,
      initial: currentValue
    });

    const result = await prompt.run();
    return result.split(',').map((v: string) => v.trim());
  }

  /**
   * Interactive wizard to add new variable to schema
   */
  static async addVariable(schema: EnvSchema): Promise<EnvSchema> {
    const prompt = new Prompt.Input({
      name: 'key',
      message: 'Variable name:',
      required: true
    });

    const key = await prompt.run();

    if (schema[key]) {
      console.log(`Variable ${key} already exists in schema`);
      return schema;
    }

    const field = await this.promptForField(key, '');
    schema[key] = field;

    return schema;
  }
}