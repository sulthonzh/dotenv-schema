#!/usr/bin/env node

import { Command } from 'commander';
import * as fs from 'fs';
import * as path from 'path';
import chalk from 'chalk';
import { EnvParser, EnvValidator, Generator, SchemaWizard } from './index';

// Read version from package.json so it stays in sync across releases
const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf-8'));

const program = new Command();

program
  .name('dotenv-schema')
  .description('Type-safe .env schema definition tool')
  .version(pkg.version);

program
  .command('init')
  .description('Initialize schema from existing .env file')
  .option('-e, --env <path>', 'Path to .env file', '.env')
  .option('-o, --output <path>', 'Output schema path', 'schema.json')
  .option('-i, --interactive', 'Interactive mode')
  .option('-j, --json', 'Output as JSON')
  .action(async (options) => {
    try {
      if (!options.json) {
        console.log(chalk.blue(`Reading ${options.env}...`));
      }

      let schema: any;

      if (options.interactive) {
        schema = await SchemaWizard.interactiveCreate(options.env);
      } else {
        schema = EnvParser.inferSchema(options.env);
      }

      EnvParser.saveSchema(schema, options.output);

      if (options.json) {
        console.log(JSON.stringify({ ok: true, schema, output: options.output }, null, 2));
      } else {
        console.log(chalk.green(`✓ Schema saved to ${options.output}`));
      }
    } catch (error) {
      if (options.json) {
        console.log(JSON.stringify({ ok: false, error: String(error) }));
      } else {
        console.error(chalk.red(`Error: ${error}`));
      }
      process.exit(1);
    }
  });

program
  .command('validate')
  .description('Validate .env file against schema')
  .option('-e, --env <path>', 'Path to .env file', '.env')
  .option('-s, --schema <path>', 'Path to schema file', 'schema.json')
  .option('-j, --json', 'Output as JSON')
  .action((options) => {
    try {
      if (!fs.existsSync(options.schema)) {
        const msg = `Schema file not found: ${options.schema}`;
        if (options.json) {
          console.log(JSON.stringify({ ok: false, error: msg }));
        } else {
          console.error(chalk.red(msg));
        }
        process.exit(1);
      }

      const schema = EnvParser.loadSchema(options.schema);
      const envVars = EnvParser.parseEnvFile(options.env);
      const envObj = Object.fromEntries(envVars);

      const validator = new EnvValidator(schema);
      const result = validator.validate(envObj);

      if (options.json) {
        console.log(JSON.stringify({
          ok: result.valid,
          errors: result.errors,
          warnings: result.warnings
        }, null, 2));
      } else if (result.valid) {
        console.log(chalk.green('✓ Environment variables are valid'));
        if (result.warnings.length > 0) {
          console.log(chalk.yellow('\nWarnings:'));
          result.warnings.forEach(w => console.log(chalk.yellow(`  • ${w}`)));
        }
      } else {
        console.log(chalk.red('✗ Validation failed'));
        console.log(chalk.red('\nErrors:'));
        result.errors.forEach(e => console.log(chalk.red(`  • ${e}`)));
        if (result.warnings.length > 0) {
          console.log(chalk.yellow('\nWarnings:'));
          result.warnings.forEach(w => console.log(chalk.yellow(`  • ${w}`)));
        }
      }

      if (!result.valid) {
        process.exit(1);
      }
    } catch (error) {
      if (options.json) {
        console.log(JSON.stringify({ ok: false, error: String(error) }));
      } else {
        console.error(chalk.red(`Error: ${error}`));
      }
      process.exit(1);
    }
  });

program
  .command('generate')
  .description('Generate outputs from schema')
  .option('-s, --schema <path>', 'Path to schema file', 'schema.json')
  .option('--env-example', 'Generate .env.example')
  .option('--types', 'Generate TypeScript types')
  .option('--validator', 'Generate validation code')
  .option('--docs', 'Generate documentation')
  .option('--all', 'Generate all outputs')
  .option('-o, --output-dir <path>', 'Output directory', '.')
  .action((options) => {
    try {
      if (!fs.existsSync(options.schema)) {
        console.error(chalk.red(`Schema file not found: ${options.schema}`));
        process.exit(1);
      }

      const schema = EnvParser.loadSchema(options.schema);
      const validation = EnvParser.validateSchema(schema);

      if (!validation.valid) {
        console.error(chalk.red('Invalid schema:'));
        validation.errors.forEach(e => console.error(chalk.red(`  • ${e}`)));
        process.exit(1);
      }

      if (options.all || options.envExample) {
        const content = Generator.generateEnvExample(schema);
        const outputPath = path.join(options.outputDir, '.env.example');
        Generator.writeToFile(content, outputPath);
        console.log(chalk.green(`✓ Generated .env.example`));
      }

      if (options.all || options.types) {
        const content = Generator.generateTypes(schema);
        const outputPath = path.join(options.outputDir, 'src', 'env.types.ts');
        Generator.writeToFile(content, outputPath);
        console.log(chalk.green(`✓ Generated src/env.types.ts`));
      }

      if (options.all || options.validator) {
        const content = Generator.generateValidator(schema);
        const outputPath = path.join(options.outputDir, 'src', 'env.validator.ts');
        Generator.writeToFile(content, outputPath);
        console.log(chalk.green(`✓ Generated src/env.validator.ts`));
      }

      if (options.all || options.docs) {
        const content = Generator.generateDocs(schema);
        const outputPath = path.join(options.outputDir, 'ENV_VARS.md');
        Generator.writeToFile(content, outputPath);
        console.log(chalk.green(`✓ Generated ENV_VARS.md`));
      }

      if (!options.all && !options.envExample && !options.types && !options.validator && !options.docs) {
        console.log(chalk.yellow('No outputs specified. Use --all, --env-example, --types, --validator, or --docs'));
      }
    } catch (error) {
      console.error(chalk.red(`Error: ${error}`));
      process.exit(1);
    }
  });

program
  .command('add')
  .description('Add new variable to schema (interactive)')
  .option('-s, --schema <path>', 'Path to schema file', 'schema.json')
  .action(async (options) => {
    try {
      let schema: any;

      if (fs.existsSync(options.schema)) {
        schema = EnvParser.loadSchema(options.schema);
      } else {
        schema = {};
        console.log(chalk.yellow(`Schema not found, creating new schema`));
      }

      schema = await SchemaWizard.addVariable(schema);
      EnvParser.saveSchema(schema, options.schema);
      console.log(chalk.green(`✓ Schema updated`));
    } catch (error) {
      console.error(chalk.red(`Error: ${error}`));
      process.exit(1);
    }
  });

program
  .command('docs')
  .description('Show schema documentation')
  .option('-s, --schema <path>', 'Path to schema file', 'schema.json')
  .action((options) => {
    try {
      if (!fs.existsSync(options.schema)) {
        console.error(chalk.red(`Schema file not found: ${options.schema}`));
        process.exit(1);
      }

      const schema = EnvParser.loadSchema(options.schema);
      const docs = Generator.generateDocs(schema);
      console.log(docs);
    } catch (error) {
      console.error(chalk.red(`Error: ${error}`));
      process.exit(1);
    }
  });

program
  .command('check')
  .description('Validate schema structure')
  .option('-s, --schema <path>', 'Path to schema file', 'schema.json')
  .action((options) => {
    try {
      if (!fs.existsSync(options.schema)) {
        console.error(chalk.red(`Schema file not found: ${options.schema}`));
        process.exit(1);
      }

      const schema = EnvParser.loadSchema(options.schema);
      const validation = EnvParser.validateSchema(schema);

      if (validation.valid) {
        console.log(chalk.green('✓ Schema is valid'));
      } else {
        console.log(chalk.red('✗ Schema has errors:'));
        validation.errors.forEach(e => console.log(chalk.red(`  • ${e}`)));
        process.exit(1);
      }
    } catch (error) {
      console.error(chalk.red(`Error: ${error}`));
      process.exit(1);
    }
  });

program
  .command('diff')
  .description('Compare .env file against schema to find drift')
  .option('-e, --env <path>', 'Path to .env file', '.env')
  .option('-s, --schema <path>', 'Path to schema file', 'schema.json')
  .option('-j, --json', 'Output as JSON')
  .action((options) => {
    try {
      if (!fs.existsSync(options.schema)) {
        const msg = `Schema file not found: ${options.schema}`;
        if (options.json) {
          console.log(JSON.stringify({ ok: false, error: msg }));
        } else {
          console.error(chalk.red(msg));
        }
        process.exit(1);
      }

      const report = EnvParser.diff(options.env, options.schema);

      if (options.json) {
        console.log(JSON.stringify(report, null, 2));
        if (report.missing.length > 0) process.exit(1);
        return;
      }

      const hasDrift = report.missing.length > 0 || report.extra.length > 0 || report.typeMismatches.length > 0;

      if (!hasDrift) {
        console.log(chalk.green('✓ No drift detected between .env and schema'));
        return;
      }

      if (report.missing.length > 0) {
        console.log(chalk.red(`\nMissing required variables (in schema but not in .env):`));
        report.missing.forEach(k => console.log(chalk.red(`  • ${k}`)));
      }

      if (report.extra.length > 0) {
        console.log(chalk.yellow(`\nExtra variables (in .env but not in schema):`));
        report.extra.forEach(k => console.log(chalk.yellow(`  • ${k}`)));
      }

      if (report.typeMismatches.length > 0) {
        console.log(chalk.red(`\nType mismatches:`));
        report.typeMismatches.forEach(m =>
          console.log(chalk.red(`  • ${m.key}: expected ${m.expected}, inferred ${m.actual}`))
        );
      }

      if (report.defaults.length > 0) {
        console.log(chalk.blue(`\nOptional vars with defaults (not in .env):`));
        report.defaults.forEach(d =>
          console.log(chalk.blue(`  • ${d.key} = ${d.default}`))
        );
      }

      process.exit(1);
    } catch (error) {
      if (options.json) {
        console.log(JSON.stringify({ ok: false, error: String(error) }));
      } else {
        console.error(chalk.red(`Error: ${error}`));
      }
      process.exit(1);
    }
  });

program.parse();