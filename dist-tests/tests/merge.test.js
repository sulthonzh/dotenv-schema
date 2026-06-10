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
const testDir = '/tmp/dotenv-schema-merge-test';
(0, node_test_1.describe)('EnvParser.merge', () => {
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
    (0, node_test_1.it)('should merge two env files with no overlap', () => {
        const file1 = path.join(testDir, '.env');
        const file2 = path.join(testDir, '.env.local');
        fs.writeFileSync(file1, 'DB_HOST=localhost\nDB_PORT=5432\n');
        fs.writeFileSync(file2, 'API_KEY=secret123\nDEBUG=true\n');
        const result = parser_1.EnvParser.merge([file1, file2]);
        node_assert_1.default.strictEqual(result.merged.size, 4);
        node_assert_1.default.strictEqual(result.merged.get('DB_HOST'), 'localhost');
        node_assert_1.default.strictEqual(result.merged.get('API_KEY'), 'secret123');
        node_assert_1.default.strictEqual(result.conflicts.length, 0);
    });
    (0, node_test_1.it)('should detect conflicts when same key has different values', () => {
        const file1 = path.join(testDir, '.env');
        const file2 = path.join(testDir, '.env.production');
        fs.writeFileSync(file1, 'DB_HOST=localhost\nPORT=3000\n');
        fs.writeFileSync(file2, 'DB_HOST=prod-db.example.com\nPORT=8080\n');
        const result = parser_1.EnvParser.merge([file1, file2]);
        node_assert_1.default.strictEqual(result.conflicts.length, 2);
        node_assert_1.default.ok(result.conflicts.some(c => c.key === 'DB_HOST'));
        node_assert_1.default.ok(result.conflicts.some(c => c.key === 'PORT'));
        const dbHost = result.conflicts.find(c => c.key === 'DB_HOST');
        node_assert_1.default.strictEqual(dbHost.files.length, 2);
        node_assert_1.default.strictEqual(dbHost.files[0].value, 'localhost');
        node_assert_1.default.strictEqual(dbHost.files[1].value, 'prod-db.example.com');
    });
    (0, node_test_1.it)('should use last file value when keys overlap (override behavior)', () => {
        const file1 = path.join(testDir, '.env');
        const file2 = path.join(testDir, '.env.override');
        fs.writeFileSync(file1, 'KEY=from-first\n');
        fs.writeFileSync(file2, 'KEY=from-second\n');
        const result = parser_1.EnvParser.merge([file1, file2]);
        node_assert_1.default.strictEqual(result.merged.get('KEY'), 'from-second');
        node_assert_1.default.strictEqual(result.sources['KEY'], '.env.override');
    });
    (0, node_test_1.it)('should not conflict when same key has same value', () => {
        const file1 = path.join(testDir, '.env');
        const file2 = path.join(testDir, '.env.local');
        fs.writeFileSync(file1, 'NODE_ENV=production\n');
        fs.writeFileSync(file2, 'NODE_ENV=production\n');
        const result = parser_1.EnvParser.merge([file1, file2]);
        node_assert_1.default.strictEqual(result.conflicts.length, 0);
        node_assert_1.default.strictEqual(result.merged.get('NODE_ENV'), 'production');
    });
    (0, node_test_1.it)('should skip non-existent files gracefully', () => {
        const file1 = path.join(testDir, '.env');
        const file2 = path.join(testDir, '.env.nonexistent');
        fs.writeFileSync(file1, 'KEY=value\n');
        const result = parser_1.EnvParser.merge([file1, file2]);
        node_assert_1.default.strictEqual(result.merged.size, 1);
        node_assert_1.default.strictEqual(result.merged.get('KEY'), 'value');
    });
    (0, node_test_1.it)('should throw on conflict when failOnConflict is true', () => {
        const file1 = path.join(testDir, '.env');
        const file2 = path.join(testDir, '.env.prod');
        fs.writeFileSync(file1, 'KEY=alpha\n');
        fs.writeFileSync(file2, 'KEY=beta\n');
        node_assert_1.default.throws(() => {
            parser_1.EnvParser.merge([file1, file2], { failOnConflict: true });
        }, /Merge conflicts detected/);
    });
    (0, node_test_1.it)('should merge three files correctly', () => {
        const file1 = path.join(testDir, '.env');
        const file2 = path.join(testDir, '.env.staging');
        const file3 = path.join(testDir, '.env.local');
        fs.writeFileSync(file1, 'A=1\nB=2\n');
        fs.writeFileSync(file2, 'B=3\nC=4\n');
        fs.writeFileSync(file3, 'C=5\nD=6\n');
        const result = parser_1.EnvParser.merge([file1, file2, file3]);
        node_assert_1.default.strictEqual(result.merged.size, 4);
        node_assert_1.default.strictEqual(result.merged.get('A'), '1');
        node_assert_1.default.strictEqual(result.merged.get('B'), '3'); // overridden by file2
        node_assert_1.default.strictEqual(result.merged.get('C'), '5'); // overridden by file3
        node_assert_1.default.strictEqual(result.merged.get('D'), '6');
        node_assert_1.default.strictEqual(result.conflicts.length, 2); // B and C
    });
});
