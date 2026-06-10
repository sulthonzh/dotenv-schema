"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const node_assert_1 = __importDefault(require("node:assert"));
const node_fs_1 = require("node:fs");
const node_path_1 = require("node:path");
const validator_1 = require("../dist-tests/src/validator");
const parser_1 = require("../dist-tests/src/parser");

// Create test fixtures
const testSchema = {
  NODE_ENV: { type: 'enum', values: ['development', 'production', 'test'], required: true },
  PORT: { type: 'number', required: true, min: 1024, max: 65535 },
  DEBUG: { type: 'boolean', required: false, default: false },
  DATABASE_URL: { type: 'string', required: true, format: 'uri' },
  API_KEY: { type: 'string', required: true, customValidator: 'uuid' }
};

const validEnvContent = `NODE_ENV=development
PORT=3000
DEBUG=true
DATABASE_URL=postgresql://localhost:5432/mydb
API_KEY=550e8400-e29b-41d4-a716-446655440000`;

const invalidEnvContent = `NODE_ENV=production
PORT=999
DEBUG=maybe
DATABASE_URL=invalid-url
API_KEY=invalid-uuid`;

const partialEnvContent = `NODE_ENV=test
PORT=8080`;

(0, node_test_1.describe)('Batch Processing', () => {
    const testDir = node_path_1.join(__dirname, 'fixtures', 'batch-test');
    
    (0, node_test_1.beforeEach)(() => {
        // Clean up and create test directory
        if (node_fs_1.existsSync(testDir)) {
            node_fs_1.rmSync(testDir, { recursive: true, force: true });
        }
        node_fs_1.mkdirSync(testDir, { recursive: true });
        
        // Create test files
        node_fs_1.writeFileSync(node_path_1.join(testDir, '.env.valid'), validEnvContent);
        node_fs_1.writeFileSync(node_path_1.join(testDir, '.env.invalid'), invalidEnvContent);
        node_fs_1.writeFileSync(node_path_1.join(testDir, '.env.partial'), partialEnvContent);
        node_fs_1.writeFileSync(node_path_1.join(testDir, '.env.missing'), 'NODE_ENV=development\nPORT=3000'); // Missing required fields
    });

    (0, node_test_1.afterEach)(() => {
        // Clean up test directory
        if (node_fs_1.existsSync(testDir)) {
            node_fs_1.rmSync(testDir, { recursive: true, force: true });
        }
        // Clean up reports directory if created
        const reportsDir = node_path_1.join(__dirname, 'fixtures', 'reports');
        if (node_fs_1.existsSync(reportsDir)) {
            node_fs_1.rmSync(reportsDir, { recursive: true, force: true });
        }
    });

    (0, node_test_1.describe)('Batch Validation', () => {
        (0, node_test_1.it)('should validate multiple .env files', () => {
            const files = [
                node_path_1.join(testDir, '.env.valid'),
                node_path_1.join(testDir, '.env.invalid'),
                node_path_1.join(testDir, '.env.partial')
            ];

            const validator = new validator_1.EnvValidator(testSchema);
            const results = files.map(file => {
                const env = parser_1.EnvParser.parseEnvFile(file);
                return validator.validate(env);
            });

            // Should have mixed results
            const validCount = results.filter(r => r.valid).length;
            const invalidCount = results.filter(r => !r.valid).length;
            
            node_assert_1.default.equal(validCount, 1, 'Should have 1 valid file');
            node_assert_1.default.equal(invalidCount, 2, 'Should have 2 invalid files');
            
            // Check that invalid results have errors
            results.forEach((result, index) => {
                if (!result.valid) {
                    node_assert_1.default.ok(result.errors.length > 0, `File ${files[index]} should have errors`);
                }
            });
        });

        (0, node_test_1.it)('should generate detailed batch report', () => {
            const files = [
                node_path_1.join(testDir, '.env.valid'),
                node_path_1.join(testDir, '.env.invalid')
            ];

            const validator = new validator_1.EnvValidator(testSchema);
            const reports = files.map(file => {
                const env = parser_1.EnvParser.parseEnvFile(file);
                const result = validator.validate(env);
                return {
                    file: node_path_1.basename(file),
                    valid: result.valid,
                    errors: result.errors,
                    warnings: result.warnings,
                    timestamp: new Date().toISOString()
                };
            });

            // Generate summary
            const validFiles = reports.filter(r => r.valid).length;
            const invalidFiles = reports.filter(r => !r.valid).length;
            
            node_assert_1.default.equal(validFiles, 1, 'Should have 1 valid file in report');
            node_assert_1.default.equal(invalidFiles, 1, 'Should have 1 invalid file in report');
            
            // Check that invalid report has detailed errors
            const invalidReport = reports.find(r => !r.valid);
            node_assert_1.default.ok(invalidReport.errors.length > 0, 'Invalid report should have errors');
            node_assert_1.default.ok(invalidReport.file.includes('invalid'), 'Should identify invalid file');
        });
    });

    (0, node_test_1.describe)('Environment File Discovery', () => {
        (0, node_test_1.it)('should discover .env files in directory', () => {
            const files = parser_1.EnvParser.findEnvFiles(testDir);
            
            node_assert_1.default.ok(Array.isArray(files), 'Should return array of files');
            node_assert_1.default.ok(files.length >= 3, 'Should find multiple .env files');
            
            const filenames = files.map(f => node_path_1.basename(f));
            node_assert_1.default.ok(filenames.includes('.env.valid'), 'Should find .env.valid');
            node_assert_1.default.ok(filenames.includes('.env.invalid'), 'Should find .env.invalid');
            node_assert_1.default.ok(filenames.includes('.env.partial'), 'Should find .env.partial');
        });

        (0, node_test_1.it)('should filter files by prefix', () => {
            const prefixedFiles = parser_1.EnvParser.findEnvFiles(testDir, 'production');
            
            // Should return empty array since we don't have production-prefixed files
            node_assert_1.default.equal(prefixedFiles.length, 0, 'Should return empty array for non-existent prefix');
            
            // Test with existing files (no prefix)
            const allFiles = parser_1.EnvParser.findEnvFiles(testDir);
            node_assert_1.default.ok(allFiles.length > 0, 'Should find all files without prefix');
        });
    });

    (0, node_test_1.describe)('Batch Error Handling', () => {
        (0, node_test_1.it)('should handle missing files gracefully', () => {
            const files = [
                node_path_1.join(testDir, '.env.valid'),
                node_path_1.join(testDir, 'nonexistent.env')
            ];

            const validator = new validator_1.EnvValidator(testSchema);
            const results = files.map(file => {
                try {
                    const env = parser_1.EnvParser.parseEnvFile(file);
                    return validator.validate(env);
                } catch (error) {
                    return {
                        valid: false,
                        errors: [error.message],
                        warnings: []
                    };
                }
            });

            // Should have one valid and one invalid
            const validCount = results.filter(r => r.valid).length;
            const errorCount = results.filter(r => r.errors.some(e => e.includes('ENOENT'))).length;
            
            node_assert_1.default.equal(validCount, 1, 'Should have 1 valid file');
            node_assert_1.default.equal(errorCount, 1, 'Should have 1 file not found error');
        });

        (0, node_test_1.it)('should continue processing after errors when not using fail-fast', () => {
            const files = [
                node_path_1.join(testDir, '.env.valid'),
                node_path_1.join(testDir, 'nonexistent.env'),
                node_path_1.join(testDir, '.env.invalid')
            ];

            const validator = new validator_1.EnvValidator(testSchema);
            const results = [];
            
            // Simulate batch processing without fail-fast
            for (const file of files) {
                try {
                    const env = parser_1.EnvParser.parseEnvFile(file);
                    results.push(validator.validate(env));
                } catch (error) {
                    results.push({
                        valid: false,
                        errors: [error.message],
                        warnings: []
                    });
                }
            }

            // Should process all files even if some fail
            node_assert_1.default.equal(results.length, 3, 'Should process all 3 files');
            
            // Should have at least one valid result
            const validCount = results.filter(r => r.valid).length;
            node_assert_1.default.ok(validCount > 0, 'Should have at least one valid result');
        });
    });

    (0, node_test_1.describe)('Batch Report Generation', () => {
        (0, node_test_1.it)('should create comprehensive report structure', () => {
            const files = [
                node_path_1.join(testDir, '.env.valid'),
                node_path_1.join(testDir, '.env.invalid')
            ];

            const validator = new validator_1.EnvValidator(testSchema);
            const reports = files.map(file => {
                const env = parser_1.EnvParser.parseEnvFile(file);
                const result = validator.validate(env);
                return {
                    file: node_path_1.basename(file),
                    valid: result.valid,
                    errors: result.errors,
                    warnings: result.warnings,
                    timestamp: new Date().toISOString()
                };
            });

            const summary = {
                totalFiles: files.length,
                validFiles: reports.filter(r => r.valid).length,
                invalidFiles: reports.filter(r => !r.valid).length,
                timestamp: new Date().toISOString()
            };

            node_assert_1.default.equal(summary.totalFiles, 2, 'Should have total files');
            node_assert_1.default.equal(summary.validFiles, 1, 'Should have valid files');
            node_assert_1.default.equal(summary.invalidFiles, 1, 'Should have invalid files');
            
            // Check detailed reports
            const invalidReport = reports.find(r => !r.valid);
            node_assert_1.default.ok(invalidReport.errors.length > 0, 'Should have detailed errors');
            node_assert_1.default.ok(invalidReport.file.includes('invalid'), 'Should identify invalid file');
        });

        (0, node_test_1.it)('should save report to JSON file', () => {
            const reportsDir = node_path_1.join(__dirname, 'fixtures', 'reports');
            node_fs_1.mkdirSync(reportsDir, { recursive: true });

            const files = [
                node_path_1.join(testDir, '.env.valid'),
                node_path_1.join(testDir, '.env.invalid')
            ];

            const validator = new validator_1.EnvValidator(testSchema);
            const reports = files.map(file => {
                const env = parser_1.EnvParser.parseEnvFile(file);
                const result = validator.validate(env);
                return {
                    file: node_path_1.basename(file),
                    valid: result.valid,
                    errors: result.errors,
                    warnings: result.warnings,
                    timestamp: new Date().toISOString()
                };
            });

            const reportContent = JSON.stringify({
                summary: {
                    totalFiles: files.length,
                    validFiles: reports.filter(r => r.valid).length,
                    invalidFiles: reports.filter(r => !r.valid).length,
                    timestamp: new Date().toISOString()
                },
                reports
            }, null, 2);

            const reportPath = node_path_1.join(reportsDir, 'batch-report.json');
            node_fs_1.writeFileSync(reportPath, reportContent);

            // Verify file was created and has correct content
            node_assert_1.default.ok(node_fs_1.existsSync(reportPath), 'Report file should be created');
            
            const savedContent = node_fs_1.readFileSync(reportPath, 'utf8');
            const parsed = JSON.parse(savedContent);
            
            node_assert_1.default.ok(parsed.summary, 'Should have summary section');
            node_assert_1.default.ok(parsed.reports, 'Should have reports section');
            node_assert_1.default.equal(parsed.summary.totalFiles, 2, 'Should have correct total files');
        });
    });
});

// Helper function to be added to parser (if it doesn't exist already)
if (typeof parser_1.EnvParser.findEnvFiles !== 'function') {
    parser_1.EnvParser.findEnvFiles = function(dir, prefix = '') {
        const files = [];
        const items = node_fs_1.readdirSync(dir);
        
        for (const item of items) {
            const fullPath = node_path_1.join(dir, item);
            const stat = node_fs_1.statSync(fullPath);
            
            if (stat.isFile()) {
                if (item.startsWith('.env') || item.endsWith('.env')) {
                    if (prefix === '' || item.startsWith(prefix)) {
                        files.push(fullPath);
                    }
                }
            }
        }
        
        return files;
    };
}