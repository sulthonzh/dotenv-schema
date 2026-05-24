# dotenv-schema

> Type-safe .env schema definition tool that generates validation code and .env.example files

**Problem**: Existing .env validation tools only validate existing files. No tool helps developers **DEFINE schema upfront** with types, required/optional flags, defaults, and descriptions.

**Solution**: Schema-first approach. Define your desired .env structure, then validate and generate multiple outputs.

## Features

- 🔬 **Schema-first approach**: Define schema before validation
- 📝 **Generate outputs**: .env.example, TypeScript types, validation code, documentation
- 🔍 **Auto-detect types**: Infer types from existing .env files
- ✅ **Runtime validation**: Validate env vars against schema at runtime
- 🎯 **Interactive wizard**: Create schemas interactively
- 📊 **Team collaboration**: Share schemas via version control

## Installation

```bash
npm install -g dotenv-schema
```

Or use with npx:

```bash
npx dotenv-schema init --env=.env
```

## Quick Start

### 1. Initialize from existing .env file

```bash
dotenv-schema init --env=.env --output=schema.json
```

This creates a `schema.json` with inferred types:

```json
{
  "NODE_ENV": {
    "type": "string",
    "required": true,
    "description": "Environment variable NODE_ENV",
    "default": "development"
  },
  "PORT": {
    "type": "number",
    "required": true,
    "description": "Environment variable PORT",
    "default": "3000"
  }
}
```

### 2. Generate outputs

```bash
# Generate all outputs
dotenv-schema generate --env-example --types --validator --docs

# Generate specific outputs
dotenv-schema generate --env-example
dotenv-schema generate --types
dotenv-schema generate --validator
dotenv-schema generate --docs
```

### 3. Validate environment

```bash
dotenv-schema validate --env=.env --schema=schema.json
```

## Usage

### Commands

#### `init` - Create schema from .env file

```bash
dotenv-schema init --env=.env --output=schema.json
```

Options:
- `-e, --env <path>` - Path to .env file (default: `.env`)
- `-o, --output <path>` - Output schema path (default: `schema.json`)
- `-i, --interactive` - Interactive mode with type prompts

#### `validate` - Validate .env against schema

```bash
dotenv-schema validate --env=.env --schema=schema.json
```

Options:
- `-e, --env <path>` - Path to .env file (default: `.env`)
- `-s, --schema <path>` - Path to schema file (default: `schema.json`)

#### `generate` - Generate outputs from schema

```bash
dotenv-schema generate --env-example --types --validator --docs --output-dir=.
```

Options:
- `-s, --schema <path>` - Path to schema file (default: `schema.json`)
- `--env-example` - Generate .env.example file
- `--types` - Generate TypeScript types (src/env.types.ts)
- `--validator` - Generate validation code (src/env.validator.ts)
- `--docs` - Generate documentation (ENV_VARS.md)
- `-o, --output-dir <path>` - Output directory (default: `.`)

#### `add` - Add variable interactively

```bash
dotenv-schema add --schema=schema.json
```

Options:
- `-s, --schema <path>` - Path to schema file (default: `schema.json`)

#### `docs` - Show schema documentation

```bash
dotenv-schema docs --schema=schema.json
```

Options:
- `-s, --schema <path>` - Path to schema file (default: `schema.json`)

#### `check` - Validate schema structure

```bash
dotenv-schema check --schema=schema.json
```

Options:
- `-s, --schema <path>` - Path to schema file (default: `schema.json`)

## Schema Definition

```json
{
  "NODE_ENV": {
    "type": "enum",
    "values": ["development", "production", "test"],
    "required": true,
    "description": "Application environment"
  },
  "DATABASE_URL": {
    "type": "string",
    "required": true,
    "format": "uri",
    "description": "Database connection string"
  },
  "PORT": {
    "type": "number",
    "required": false,
    "default": 3000,
    "min": 1024,
    "max": 65535,
    "description": "Server port number"
  },
  "DEBUG": {
    "type": "boolean",
    "required": false,
    "default": false,
    "description": "Enable debug mode"
  }
}
```

### Supported Types

| Type | Description |
|------|-------------|
| `string` | Text value with optional format, pattern, min/max length |
| `number` | Numeric value with optional min/max |
| `boolean` | `true` or `false` |
| `enum` | One of predefined values |
| `json` | Valid JSON object or array |

### String Options

- `format`: `"uri"` or `"email"` - Built-in format validation
- `pattern`: Regular expression pattern
- `min`: Minimum length
- `max`: Maximum length

### Number Options

- `min`: Minimum value
- `max`: Maximum value

### Enum Options

- `values`: Array of allowed values

## Generated Outputs

### .env.example

```bash
# Application environment
# (required)
# Options: development, production, test
NODE_ENV=development

# Database connection string
# (required)
DATABASE_URL=

# Server port number
# (optional, default: 3000)
PORT=3000
```

### TypeScript Types

```typescript
export interface EnvSchema {
  NODE_ENV: 'development' | 'production' | 'test';
  DATABASE_URL: string;
  PORT?: number;
  DEBUG?: boolean;
}

export function isEnvSchema(obj: any): obj is EnvSchema {
  // Type guard implementation
}
```

### Validation Code

```typescript
import { EnvValidator } from "./validator";

const schema: EnvSchema = {
  // Schema definition
};

export const validator = new EnvValidator(schema);

export function validateEnv(env: Record<string, string>) {
  return validator.validate(env);
}
```

### Documentation

```markdown
# Environment Variables Documentation

| Variable | Type | Required | Default | Description |
|----------|------|----------|---------|-------------|
| `NODE_ENV` | enum(development, production, test) | ✅ | - | Application environment |
| `DATABASE_URL` | string | ✅ | - | Database connection string |
| `PORT` | number | ❌ | 3000 | Server port number |
```

## Use Cases

### 1. New Project

```bash
# Define schema interactively
dotenv-schema init --env=.env --interactive

# Generate .env.example for team
dotenv-schema generate --env-example

# Generate TypeScript types
dotenv-schema generate --types
```

### 2. Existing Project

```bash
# Infer schema from existing .env
dotenv-schema init --env=.env

# Validate current env
dotenv-schema validate --env=.env

# Generate documentation
dotenv-schema generate --docs
```

### 3. Runtime Validation

```typescript
import { validateEnv } from './env.validator';
import * as dotenv from 'dotenv';

dotenv.config();

const result = validateEnv(process.env);

if (!result.valid) {
  console.error('Invalid environment configuration:');
  result.errors.forEach(err => console.error(`  - ${err}`));
  process.exit(1);
}
```

## CI/CD Integration

```yaml
# .github/workflows/ci.yml
- name: Validate environment
  run: |
    npm install -g dotenv-schema
    dotenv-schema validate --env=.env.example --schema=schema.json
```

## Node.js Compatibility

Requires Node.js >= 18.0.0

## License

MIT License - see [LICENSE](LICENSE) file for details

## Contributing

Contributions welcome! Please read our contributing guidelines before submitting PRs.

## Author

[sulthonzh](https://github.com/sulthonzh)

---

Built with ❤️ for better .env management