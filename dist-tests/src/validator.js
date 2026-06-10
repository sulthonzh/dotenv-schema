"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EnvValidator = void 0;
class EnvValidator {
    schema;
    constructor(schema) {
        this.schema = schema;
    }
    /**
     * Validate environment variables against schema
     */
    validate(env) {
        const errors = [];
        const warnings = [];
        // Check required fields
        for (const [key, field] of Object.entries(this.schema)) {
            if (field.required && !(key in env)) {
                errors.push(`Missing required environment variable: ${key}`);
                continue;
            }
            if (key in env) {
                this.validateField(key, env[key], field, errors, warnings);
            }
        }
        // Check for unknown env vars
        for (const key of Object.keys(env)) {
            if (!(key in this.schema)) {
                warnings.push(`Unknown environment variable: ${key}`);
            }
        }
        return {
            valid: errors.length === 0,
            errors,
            warnings
        };
    }
    /**
     * Validate single field
     */
    validateField(key, value, field, errors, warnings) {
        switch (field.type) {
            case 'string':
                this.validateString(key, value, field, errors, warnings);
                break;
            case 'number':
                this.validateNumber(key, value, field, errors, warnings);
                break;
            case 'boolean':
                this.validateBoolean(key, value, field, errors);
                break;
            case 'enum':
                this.validateEnum(key, value, field, errors);
                break;
            case 'json':
                this.validateJson(key, value, field, errors);
                break;
        }
    }
    validateString(key, value, field, errors, warnings) {
        if (field.pattern && !new RegExp(field.pattern).test(value)) {
            errors.push(`${key}: value does not match pattern ${field.pattern}`);
        }
        if (field.min && value.length < field.min) {
            errors.push(`${key}: value too short (minimum ${field.min} characters)`);
        }
        if (field.max && value.length > field.max) {
            errors.push(`${key}: value too long (maximum ${field.max} characters)`);
        }
        if (field.format) {
            if (field.format === 'uri' && !this.isValidUri(value)) {
                errors.push(`${key}: invalid URI format`);
            }
            else if (field.format === 'email' && !this.isValidEmail(value)) {
                errors.push(`${key}: invalid email format`);
            }
        }
    }
    validateNumber(key, value, field, errors, warnings) {
        const num = Number(value);
        if (isNaN(num)) {
            errors.push(`${key}: value is not a valid number`);
            return;
        }
        if (field.min !== undefined && num < field.min) {
            errors.push(`${key}: value is less than minimum ${field.min}`);
        }
        if (field.max !== undefined && num > field.max) {
            errors.push(`${key}: value is greater than maximum ${field.max}`);
        }
    }
    validateBoolean(key, value, field, errors) {
        const lower = value.toLowerCase();
        // Common boolean representations in .env files
        const validBooleans = ['true', 'false', '1', '0', 'yes', 'no', 'on', 'off'];
        if (!validBooleans.includes(lower) && !validBooleans.includes(value)) {
            errors.push(`${key}: value must be one of: true, false, 1, 0, yes, no, on, off`);
        }
    }
    validateEnum(key, value, field, errors) {
        if (!field.values || field.values.length === 0) {
            errors.push(`${key}: enum field has no defined values`);
            return;
        }
        if (!field.values.includes(value)) {
            errors.push(`${key}: value must be one of [${field.values.join(', ')}]`);
        }
    }
    validateJson(key, value, field, errors) {
        if (!value || typeof value !== 'string') {
            errors.push(`${key}: JSON value cannot be empty`);
            return;
        }
        try {
            // Try to parse JSON
            JSON.parse(value);
        }
        catch (error) {
            errors.push(`${key}: value is not valid JSON`);
        }
    }
    isValidUri(value) {
        try {
            // Basic URL format check
            if (!value || typeof value !== 'string') {
                return false;
            }
            // Try to create URL object - this is the most reliable way
            const url = new URL(value);
            // Check if protocol is valid but be more permissive
            if (!url.protocol || !['http:', 'https:', 'ftp:', 'ftps:', 'ws:', 'wss:', 'file:'].includes(url.protocol)) {
                return false;
            }
            // Check if hostname is present for network protocols (but allow file: for local files)
            if (['http:', 'https:', 'ftp:', 'ftps:', 'ws:', 'wss:'].includes(url.protocol)) {
                if (!url.hostname || url.hostname.length === 0) {
                    return false;
                }
            }
            // Basic check for malicious protocols
            if (url.protocol === 'javascript:' || url.protocol === 'data:' || url.protocol === 'vbscript:') {
                return false;
            }
            return true;
        }
        catch {
            return false;
        }
    }
    isValidEmail(value) {
        if (!value || typeof value !== 'string') {
            return false;
        }
        // More comprehensive email validation
        const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
        if (!emailRegex.test(value)) {
            return false;
        }
        // Check for maximum length (RFC 5321 limit)
        if (value.length > 254) {
            return false;
        }
        // Check local part length (max 64 chars)
        const [localPart] = value.split('@');
        if (localPart.length > 64) {
            return false;
        }
        return true;
    }
    /**
     * Get defaults for optional fields
     */
    getDefaults() {
        const defaults = {};
        for (const [key, field] of Object.entries(this.schema)) {
            if (!field.required && field.default !== undefined) {
                defaults[key] = String(field.default);
            }
        }
        return defaults;
    }
}
exports.EnvValidator = EnvValidator;
