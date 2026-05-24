"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const node_assert_1 = __importDefault(require("node:assert"));
const generator_1 = require("../src/generator");
(0, node_test_1.describe)('Generator', () => {
    const schema = {
        NODE_ENV: {
            type: 'enum',
            required: true,
            values: ['development', 'production', 'test'],
            description: 'Application environment'
        },
        DATABASE_URL: {
            type: 'string',
            required: true,
            format: 'uri',
            description: 'Database connection string'
        },
        PORT: {
            type: 'number',
            required: false,
            default: 3000,
            description: 'Server port number'
        },
        DEBUG: {
            type: 'boolean',
            required: false,
            default: false,
            description: 'Enable debug mode'
        },
        CONFIG: {
            type: 'json',
            required: false,
            default: '{}',
            description: 'Application configuration'
        }
    };
    (0, node_test_1.describe)('generateEnvExample', () => {
        (0, node_test_1.it)('should generate .env.example content', () => {
            const result = generator_1.Generator.generateEnvExample(schema);
            node_assert_1.default.ok(result.includes('NODE_ENV='));
            node_assert_1.default.ok(result.includes('DATABASE_URL='));
            node_assert_1.default.ok(result.includes('PORT=3000'));
            node_assert_1.default.ok(result.includes('DEBUG=false'));
            node_assert_1.default.ok(result.includes('CONFIG={}'));
            node_assert_1.default.ok(result.includes('Application environment'));
            node_assert_1.default.ok(result.includes('Database connection string'));
        });
        (0, node_test_1.it)('should include required markers', () => {
            const result = generator_1.Generator.generateEnvExample(schema);
            node_assert_1.default.ok(result.includes('(required)'));
            node_assert_1.default.ok(result.includes('(optional, default:'));
        });
        (0, node_test_1.it)('should include enum options', () => {
            const result = generator_1.Generator.generateEnvExample(schema);
            node_assert_1.default.ok(result.includes('Options: development, production, test'));
        });
    });
    (0, node_test_1.describe)('generateTypes', () => {
        (0, node_test_1.it)('should generate TypeScript types', () => {
            const result = generator_1.Generator.generateTypes(schema);
            node_assert_1.default.ok(result.includes('export interface EnvSchema'));
            node_assert_1.default.ok(result.includes('NODE_ENV: \'development\' | \'production\' | \'test\';'));
            node_assert_1.default.ok(result.includes('DATABASE_URL: string;'));
            node_assert_1.default.ok(result.includes('PORT?: number;'));
            node_assert_1.default.ok(result.includes('DEBUG?: boolean;'));
            node_assert_1.default.ok(result.includes('CONFIG?: any;'));
        });
        (0, node_test_1.it)('should generate type guard function', () => {
            const result = generator_1.Generator.generateTypes(schema);
            node_assert_1.default.ok(result.includes('export function isEnvSchema'));
            node_assert_1.default.ok(result.includes('obj is EnvSchema'));
        });
    });
    (0, node_test_1.describe)('generateValidator', () => {
        (0, node_test_1.it)('should generate validation code', () => {
            const result = generator_1.Generator.generateValidator(schema);
            node_assert_1.default.ok(result.includes('import { EnvValidator }'));
            node_assert_1.default.ok(result.includes('const schema: EnvSchema = {'));
            node_assert_1.default.ok(result.includes('export const validator = new EnvValidator(schema)'));
            node_assert_1.default.ok(result.includes('export function validateEnv'));
        });
        (0, node_test_1.it)('should include all schema fields', () => {
            const result = generator_1.Generator.generateValidator(schema);
            node_assert_1.default.ok(result.includes('NODE_ENV'));
            node_assert_1.default.ok(result.includes('DATABASE_URL'));
            node_assert_1.default.ok(result.includes('PORT'));
            node_assert_1.default.ok(result.includes('DEBUG'));
            node_assert_1.default.ok(result.includes('CONFIG'));
        });
    });
    (0, node_test_1.describe)('generateDocs', () => {
        (0, node_test_1.it)('should generate markdown documentation', () => {
            const result = generator_1.Generator.generateDocs(schema);
            node_assert_1.default.ok(result.includes('# Environment Variables Documentation'));
            node_assert_1.default.ok(result.includes('| Variable | Type | Required |'));
            node_assert_1.default.ok(result.includes('| NODE_ENV | enum'));
            node_assert_1.default.ok(result.includes('| DATABASE_URL | string | ✅ |'));
            node_assert_1.default.ok(result.includes('| PORT | number | ❌ |'));
            node_assert_1.default.ok(result.includes('| DEBUG | boolean | ❌ |'));
            node_assert_1.default.ok(result.includes('| CONFIG | json | ❌ |'));
        });
        (0, node_test_1.it)('should include descriptions and defaults', () => {
            const result = generator_1.Generator.generateDocs(schema);
            node_assert_1.default.ok(result.includes('Application environment'));
            node_assert_1.default.ok(result.includes('Database connection string'));
            node_assert_1.default.ok(result.includes('Server port number'));
            node_assert_1.default.ok(result.includes('| 3000 |'));
            node_assert_1.default.ok(result.includes('| false |'));
        });
    });
    (0, node_test_1.describe)('getDisplayType', () => {
        (0, node_test_1.it)('should format enum types correctly', () => {
            const enumSchema = {
                STATUS: {
                    type: 'enum',
                    required: true,
                    values: ['active', 'inactive', 'pending']
                }
            };
            const result = generator_1.Generator.generateDocs(enumSchema);
            node_assert_1.default.ok(result.includes('enum(active, inactive, pending)'));
        });
    });
});
//# sourceMappingURL=generator.test.js.map