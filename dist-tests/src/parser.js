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
Object.defineProperty(exports, "__esModule", { value: true });
exports.EnvParser = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
class EnvParser {
    /**
     * Parse existing .env file and extract variables
     */
    static parseEnvFile(filePath) {
        const envVars = new Map();
        // Security: Validate file path to prevent directory traversal
        if (!this.isValidFilePath(filePath)) {
            throw new Error(`Invalid file path: ${filePath}`);
        }
        if (!fs.existsSync(filePath)) {
            return envVars;
        }
        const content = fs.readFileSync(filePath, 'utf-8');
        const lines = content.split('\n');
        for (const line of lines) {
            let trimmed = line.trim();
            // Skip comments and empty lines
            if (!trimmed || trimmed.startsWith('#')) {
                continue;
            }
            // Handle "export KEY=VALUE" prefix (common in shell-style .env files)
            if (trimmed.startsWith('export ')) {
                trimmed = trimmed.substring(7).trim();
            }
            // Parse KEY=VALUE
            const eqIndex = trimmed.indexOf('=');
            if (eqIndex > 0) {
                const key = trimmed.substring(0, eqIndex).trim();
                let value = trimmed.substring(eqIndex + 1).trim();
                // Strip inline comments (only when value is unquoted)
                // e.g. KEY=value # comment → value
                // But KEY="value # not a comment" → value # not a comment
                if (!value.startsWith('"') && !value.startsWith("'")) {
                    const commentIdx = value.indexOf(' #');
                    if (commentIdx > 0) {
                        value = value.substring(0, commentIdx).trimEnd();
                    }
                }
                // Remove quotes if present
                if ((value.startsWith('"') && value.endsWith('"')) ||
                    (value.startsWith("'") && value.endsWith("'"))) {
                    value = value.substring(1, value.length - 1);
                }
                envVars.set(key, value);
            }
        }
        return envVars;
    }
    /**
     * Infer type from value string
     */
    static inferType(value) {
        const lower = value.toLowerCase();
        // Common boolean representations in .env files
        if (['true', 'false', '1', '0', 'yes', 'no', 'on', 'off'].includes(lower) ||
            ['true', 'false', '1', '0', 'yes', 'no', 'on', 'off'].includes(value)) {
            return 'boolean';
        }
        if (!isNaN(Number(value)) && value.trim() !== '') {
            return 'number';
        }
        try {
            const parsed = JSON.parse(value);
            if (typeof parsed === 'object' && parsed !== null) {
                return 'json';
            }
        }
        catch { }
        return 'string';
    }
    /**
     * Detect common format patterns for smarter schema inference
     */
    static inferFormat(key, value) {
        const upperKey = key.toUpperCase();
        // URL/URI detection
        if (/^https?:\/\//.test(value) || upperKey.includes('URL') || upperKey.endsWith('_URI')) {
            return 'uri';
        }
        // Email detection
        if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) || upperKey.includes('EMAIL') || upperKey.includes('MAIL')) {
            return 'email';
        }
        return undefined;
    }
    /**
     * Detect common enum patterns (e.g., NODE_ENV)
     */
    static inferEnumValues(key, value) {
        const upperKey = key.toUpperCase();
        const enumMappings = {
            NODE_ENV: ['development', 'production', 'test', 'staging'],
            ENV: ['development', 'production', 'test', 'staging'],
            APP_ENV: ['development', 'production', 'test', 'staging'],
            LOG_LEVEL: ['debug', 'info', 'warn', 'error', 'fatal'],
        };
        if (enumMappings[upperKey]) {
            return enumMappings[upperKey];
        }
        return undefined;
    }
    /**
     * Create schema from existing .env file with inferred types
     */
    static inferSchema(filePath, options = {}) {
        const envVars = this.parseEnvFile(filePath);
        const schema = {};
        for (const [key, value] of envVars.entries()) {
            const enumValues = this.inferEnumValues(key, value);
            const format = this.inferFormat(key, value);
            const type = enumValues ? 'enum' : this.inferType(value);
            schema[key] = {
                type,
                required: true,
                description: `Environment variable ${key}`,
                default: value,
                ...(enumValues ? { values: enumValues } : {}),
                ...(format ? { format } : {}),
            };
        }
        return schema;
    }
    /**
     * Load schema from JSON file
     */
    static loadSchema(filePath) {
        // Security: Validate file path to prevent directory traversal
        if (!this.isValidFilePath(filePath)) {
            throw new Error(`Invalid schema file path: ${filePath}`);
        }
        if (!fs.existsSync(filePath)) {
            throw new Error(`Schema file not found: ${filePath}`);
        }
        const content = fs.readFileSync(filePath, 'utf-8');
        try {
            return JSON.parse(content);
        }
        catch (error) {
            throw new Error(`Invalid JSON in schema file: ${error}`);
        }
    }
    /**
     * Save schema to JSON file
     */
    static saveSchema(schema, filePath) {
        // Security: Validate file path to prevent directory traversal
        if (!this.isValidFilePath(filePath)) {
            throw new Error(`Invalid output file path: ${filePath}`);
        }
        const dir = path.dirname(filePath);
        if (dir && !fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        const content = JSON.stringify(schema, null, 2);
        fs.writeFileSync(filePath, content, 'utf-8');
    }
    /**
     * Validate schema structure
     */
    static validateSchema(schema) {
        const errors = [];
        if (typeof schema !== 'object' || schema === null) {
            errors.push('Schema must be an object');
            return { valid: false, errors };
        }
        const validTypes = ['string', 'number', 'boolean', 'enum', 'json'];
        for (const [key, field] of Object.entries(schema)) {
            if (typeof field !== 'object' || field === null) {
                errors.push(`${key}: field must be an object`);
                continue;
            }
            const schemaField = field;
            if (!schemaField.type) {
                errors.push(`${key}: missing required 'type' property`);
            }
            else if (!validTypes.includes(schemaField.type)) {
                errors.push(`${key}: invalid type '${schemaField.type}'`);
            }
            if (schemaField.type === 'enum' && !schemaField.values) {
                errors.push(`${key}: enum type requires 'values' array`);
            }
            if (schemaField.required === undefined) {
                errors.push(`${key}: missing 'required' property`);
            }
        }
        return {
            valid: errors.length === 0,
            errors
        };
    }
    /**
     * Merge multiple .env files with conflict detection
     * Files are applied in order: later files override earlier ones
     * Returns merged vars and any conflicts found
     */
    static merge(filePaths, options = {}) {
        const merged = new Map();
        const sources = {};
        const allValues = {};
        // Security: Validate all file paths before processing
        for (const filePath of filePaths) {
            if (!this.isValidFilePath(filePath)) {
                throw new Error(`Invalid file path in merge: ${filePath}`);
            }
        }
        for (const filePath of filePaths) {
            if (!fs.existsSync(filePath)) {
                continue;
            }
            const vars = this.parseEnvFile(filePath);
            for (const [key, value] of vars.entries()) {
                if (!allValues[key]) {
                    allValues[key] = [];
                }
                allValues[key].push({ file: path.basename(filePath), value });
                merged.set(key, value);
                sources[key] = path.basename(filePath);
            }
        }
        // Detect conflicts: same key with different values across files
        const conflicts = [];
        for (const [key, entries] of Object.entries(allValues)) {
            const uniqueValues = new Set(entries.map(e => e.value));
            if (uniqueValues.size > 1) {
                conflicts.push({ key, files: entries });
            }
        }
        if (options.failOnConflict && conflicts.length > 0) {
            const conflictKeys = conflicts.map(c => c.key).join(', ');
            throw new Error(`Merge conflicts detected: ${conflictKeys}`);
        }
        return { merged, conflicts, sources };
    }
    /**
     * Compare .env file against schema and return a diff report
     */
    static diff(envPath, schemaPath) {
        const envVars = this.parseEnvFile(envPath);
        const schema = this.loadSchema(schemaPath);
        const envKeys = new Set(envVars.keys());
        const schemaKeys = new Set(Object.keys(schema));
        const missing = [];
        const extra = [];
        const typeMismatches = [];
        const defaults = [];
        // Find required vars missing from .env
        for (const [key, field] of Object.entries(schema)) {
            if (!envKeys.has(key)) {
                if (field.required) {
                    missing.push(key);
                }
                if (field.default !== undefined) {
                    defaults.push({ key, default: String(field.default) });
                }
            }
            else {
                // Check type match
                const actualType = this.inferType(envVars.get(key));
                if (actualType !== field.type && !(field.type === 'string' && actualType === 'string')) {
                    typeMismatches.push({ key, expected: field.type, actual: actualType });
                }
            }
        }
        // Find vars in .env not in schema
        for (const key of envKeys) {
            if (!schemaKeys.has(key)) {
                extra.push(key);
            }
        }
        return { missing, extra, typeMismatches, defaults };
    }
    /**
     * Validate file path to prevent directory traversal attacks
     */
    static isValidFilePath(filePath) {
        try {
            // Normalize the path
            const normalized = path.normalize(filePath);
            // Check for directory traversal attempts
            if (normalized.includes('..') || normalized.includes('~')) {
                return false;
            }
            // Resolve to absolute path and compare
            const resolved = path.resolve(normalized);
            const cwd = process.cwd();
            // Ensure path is within current working directory or allowed locations
            return resolved.startsWith(cwd) || resolved.startsWith('/tmp') || resolved.startsWith('/var');
        }
        catch {
            return false;
        }
    }
}
exports.EnvParser = EnvParser;
