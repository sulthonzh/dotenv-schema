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
class EnvParser {
    /**
     * Parse existing .env file and extract variables
     */
    static parseEnvFile(filePath) {
        const envVars = new Map();
        if (!fs.existsSync(filePath)) {
            return envVars;
        }
        const content = fs.readFileSync(filePath, 'utf-8');
        const lines = content.split('\n');
        for (const line of lines) {
            const trimmed = line.trim();
            // Skip comments and empty lines
            if (!trimmed || trimmed.startsWith('#')) {
                continue;
            }
            // Parse KEY=VALUE
            const eqIndex = trimmed.indexOf('=');
            if (eqIndex > 0) {
                const key = trimmed.substring(0, eqIndex).trim();
                let value = trimmed.substring(eqIndex + 1).trim();
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
        if (value.toLowerCase() === 'true' || value.toLowerCase() === 'false') {
            return 'boolean';
        }
        if (!isNaN(Number(value))) {
            return 'number';
        }
        try {
            JSON.parse(value);
            return 'json';
        }
        catch {
            return 'string';
        }
    }
    /**
     * Create schema from existing .env file with inferred types
     */
    static inferSchema(filePath, options = {}) {
        const envVars = this.parseEnvFile(filePath);
        const schema = {};
        for (const [key, value] of envVars.entries()) {
            schema[key] = {
                type: this.inferType(value),
                required: true,
                description: `Environment variable ${key}`,
                default: value
            };
        }
        return schema;
    }
    /**
     * Load schema from JSON file
     */
    static loadSchema(filePath) {
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
}
exports.EnvParser = EnvParser;
