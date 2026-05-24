"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const node_assert_1 = __importDefault(require("node:assert"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const parser_1 = require("../src/parser");
const testDir = '/tmp/dotenv-schema-test';
(0, node_test_1.describe)('EnvParser', () => {
    (0, node_test_1.beforeEach)(() => {
        if (!fs.existsSync(testDir)) {
            fs.mkdirSync(testDir, { recursive: true });
        }
    });
    (0, node_test_1.afterEach)(() => {
        if (fs.existsSync(testDir)) {
            fs.rmSync(testDir, { recursive: true, force: true });
        }
    });
    (0, node_test_1.describe)('parseEnvFile', () => {
        (0, node_test_1.it)('should parse simple key=value pairs', () => {
            const content = 'KEY1=value1\nKEY2=value2\n';
            const filePath = path.join(testDir, '.env');
            fs.writeFileSync(filePath, content);
            const result = parser_1.EnvParser.parseEnvFile(filePath);
            node_assert_1.default.strictEqual(result.size, 2);
            node_assert_1.default.strictEqual(result.get('KEY1'), 'value1');
            node_assert_1.default.strictEqual(result.get('KEY2'), 'value2');
        });
        (0, node_test_1.it)('should skip comments', () => {
            const content = '# Comment\nKEY=value\n# Another comment\nKEY2=value2\n';
            const filePath = path.join(testDir, '.env');
            fs.writeFileSync(filePath, content);
            const result = parser_1.EnvParser.parseEnvFile(filePath);
            node_assert_1.default.strictEqual(result.size, 2);
            node_assert_1.default.strictEqual(result.get('KEY'), 'value');
            node_assert_1.default.strictEqual(result.get('KEY2'), 'value2');
        });
        (0, node_test_1.it)('should skip empty lines', () => {
            const content = 'KEY1=value1\n\nKEY2=value2\n\n';
            const filePath = path.join(testDir, '.env');
            fs.writeFileSync(filePath, content);
            const result = parser_1.EnvParser.parseEnvFile(filePath);
            node_assert_1.default.strictEqual(result.size, 2);
        });
        (0, node_test_1.it)('should remove quotes from values', () => {
            const content = 'KEY1="value1"\nKEY2=\'value2\'\n';
            const filePath = path.join(testDir, '.env');
            fs.writeFileSync(filePath, content);
            const result = parser_1.EnvParser.parseEnvFile(filePath);
            node_assert_1.default.strictEqual(result.get('KEY1'), 'value1');
            node_assert_1.default.strictEqual(result.get('KEY2'), 'value2');
        });
        (0, node_test_1.it)('should handle empty file', () => {
            const content = '';
            const filePath = path.join(testDir, '.env');
            fs.writeFileSync(filePath, content);
            const result = parser_1.EnvParser.parseEnvFile(filePath);
            node_assert_1.default.strictEqual(result.size, 0);
        });
        (0, node_test_1.it)('should handle non-existent file', () => {
            const result = parser_1.EnvParser.parseEnvFile(path.join(testDir, 'nonexistent.env'));
            node_assert_1.default.strictEqual(result.size, 0);
        });
    });
    (0, node_test_1.describe)('inferType', () => {
        (0, node_test_1.it)('should infer boolean type', () => {
            node_assert_1.default.strictEqual(parser_1.EnvParser.inferType('true'), 'boolean');
            node_assert_1.default.strictEqual(parser_1.EnvParser.inferType('false'), 'boolean');
            node_assert_1.default.strictEqual(parser_1.EnvParser.inferType('TRUE'), 'boolean');
            node_assert_1.default.strictEqual(parser_1.EnvParser.inferType('FALSE'), 'boolean');
        });
        (0, node_test_1.it)('should infer number type', () => {
            node_assert_1.default.strictEqual(parser_1.EnvParser.inferType('123'), 'number');
            node_assert_1.default.strictEqual(parser_1.EnvParser.inferType('45.67'), 'number');
            node_assert_1.default.strictEqual(parser_1.EnvParser.inferType('-10'), 'number');
        });
        (0, node_test_1.it)('should infer json type', () => {
            node_assert_1.default.strictEqual(parser_1.EnvParser.inferType('{"key":"value"}'), 'json');
            node_assert_1.default.strictEqual(parser_1.EnvParser.inferType('["a","b"]'), 'json');
        });
        (0, node_test_1.it)('should infer string type for non-JSON values', () => {
            node_assert_1.default.strictEqual(parser_1.EnvParser.inferType('hello'), 'string');
            node_assert_1.default.strictEqual(parser_1.EnvParser.inferType('http://example.com'), 'string');
        });
    });
    (0, node_test_1.describe)('inferSchema', () => {
        (0, node_test_1.it)('should create schema from .env file', () => {
            const content = 'NODE_ENV=production\nPORT=3000\nDEBUG=true\n';
            const filePath = path.join(testDir, '.env');
            fs.writeFileSync(filePath, content);
            const schema = parser_1.EnvParser.inferSchema(filePath);
            node_assert_1.default.strictEqual(schema.NODE_ENV.type, 'string');
            node_assert_1.default.strictEqual(schema.NODE_ENV.required, true);
            node_assert_1.default.strictEqual(schema.NODE_ENV.default, 'production');
            node_assert_1.default.strictEqual(schema.PORT.type, 'number');
            node_assert_1.default.strictEqual(schema.DEBUG.type, 'boolean');
        });
        (0, node_test_1.it)('should handle empty .env file', () => {
            const content = '';
            const filePath = path.join(testDir, '.env');
            fs.writeFileSync(filePath, content);
            const schema = parser_1.EnvParser.inferSchema(filePath);
            node_assert_1.default.strictEqual(Object.keys(schema).length, 0);
        });
    });
    (0, node_test_1.describe)('loadSchema', () => {
        (0, node_test_1.it)('should load valid schema from JSON file', () => {
            const schema = {
                KEY: { type: 'string', required: true, description: 'Test key' }
            };
            const filePath = path.join(testDir, 'schema.json');
            fs.writeFileSync(filePath, JSON.stringify(schema));
            const result = parser_1.EnvParser.loadSchema(filePath);
            node_assert_1.default.deepStrictEqual(result, schema);
        });
        (0, node_test_1.it)('should throw error for non-existent file', () => {
            node_assert_1.default.throws(() => {
                parser_1.EnvParser.loadSchema(path.join(testDir, 'nonexistent.json'));
            });
        });
        (0, node_test_1.it)('should throw error for invalid JSON', () => {
            const filePath = path.join(testDir, 'invalid.json');
            fs.writeFileSync(filePath, '{ invalid json }');
            node_assert_1.default.throws(() => {
                parser_1.EnvParser.loadSchema(filePath);
            });
        });
    });
    (0, node_test_1.describe)('saveSchema', () => {
        (0, node_test_1.it)('should save schema to JSON file', () => {
            const schema = {
                KEY: { type: 'string', required: true }
            };
            const filePath = path.join(testDir, 'schema.json');
            parser_1.EnvParser.saveSchema(schema, filePath);
            const content = fs.readFileSync(filePath, 'utf-8');
            const result = JSON.parse(content);
            node_assert_1.default.deepStrictEqual(result, schema);
        });
    });
    (0, node_test_1.describe)('validateSchema', () => {
        (0, node_test_1.it)('should validate correct schema', () => {
            const schema = {
                STRING_KEY: { type: 'string', required: true },
                NUMBER_KEY: { type: 'number', required: false },
                BOOL_KEY: { type: 'boolean', required: true },
                ENUM_KEY: { type: 'enum', required: true, values: ['a', 'b', 'c'] },
                JSON_KEY: { type: 'json', required: false }
            };
            const result = parser_1.EnvParser.validateSchema(schema);
            node_assert_1.default.strictEqual(result.valid, true);
            node_assert_1.default.strictEqual(result.errors.length, 0);
        });
        (0, node_test_1.it)('should detect missing type', () => {
            const schema = {
                KEY: { required: true }
            };
            const result = parser_1.EnvParser.validateSchema(schema);
            node_assert_1.default.strictEqual(result.valid, false);
            node_assert_1.default.ok(result.errors.some(e => e.includes('missing required \'type\'')));
        });
        (0, node_test_1.it)('should detect invalid type', () => {
            const schema = {
                KEY: { type: 'invalid', required: true }
            };
            const result = parser_1.EnvParser.validateSchema(schema);
            node_assert_1.default.strictEqual(result.valid, false);
            node_assert_1.default.ok(result.errors.some(e => e.includes('invalid type')));
        });
        (0, node_test_1.it)('should detect missing required flag', () => {
            const schema = {
                KEY: { type: 'string' }
            };
            const result = parser_1.EnvParser.validateSchema(schema);
            node_assert_1.default.strictEqual(result.valid, false);
            node_assert_1.default.ok(result.errors.some(e => e.includes('missing \'required\'')));
        });
        (0, node_test_1.it)('should detect enum without values', () => {
            const schema = {
                KEY: { type: 'enum', required: true }
            };
            const result = parser_1.EnvParser.validateSchema(schema);
            node_assert_1.default.strictEqual(result.valid, false);
            node_assert_1.default.ok(result.errors.some(e => e.includes('enum type requires')));
        });
        (0, node_test_1.it)('should detect non-object schema', () => {
            const schema = 'invalid';
            const result = parser_1.EnvParser.validateSchema(schema);
            node_assert_1.default.strictEqual(result.valid, false);
            node_assert_1.default.ok(result.errors.some(e => e.includes('must be an object')));
        });
    });
});
//# sourceMappingURL=parser.test.js.map