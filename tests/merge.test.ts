import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import * as fs from 'fs';
import * as path from 'path';
import { EnvParser } from '../src/parser';

const testDir = '/tmp/dotenv-schema-merge-test';

describe('EnvParser.merge', () => {
  beforeEach(() => {
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }
  });

  afterEach(() => {
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  it('should merge two env files with no overlap', () => {
    const file1 = path.join(testDir, '.env');
    const file2 = path.join(testDir, '.env.local');
    fs.writeFileSync(file1, 'DB_HOST=localhost\nDB_PORT=5432\n');
    fs.writeFileSync(file2, 'API_KEY=secret123\nDEBUG=true\n');

    const result = EnvParser.merge([file1, file2]);

    assert.strictEqual(result.merged.size, 4);
    assert.strictEqual(result.merged.get('DB_HOST'), 'localhost');
    assert.strictEqual(result.merged.get('API_KEY'), 'secret123');
    assert.strictEqual(result.conflicts.length, 0);
  });

  it('should detect conflicts when same key has different values', () => {
    const file1 = path.join(testDir, '.env');
    const file2 = path.join(testDir, '.env.production');
    fs.writeFileSync(file1, 'DB_HOST=localhost\nPORT=3000\n');
    fs.writeFileSync(file2, 'DB_HOST=prod-db.example.com\nPORT=8080\n');

    const result = EnvParser.merge([file1, file2]);

    assert.strictEqual(result.conflicts.length, 2);
    assert.ok(result.conflicts.some(c => c.key === 'DB_HOST'));
    assert.ok(result.conflicts.some(c => c.key === 'PORT'));

    const dbHost = result.conflicts.find(c => c.key === 'DB_HOST')!;
    assert.strictEqual(dbHost.files.length, 2);
    assert.strictEqual(dbHost.files[0].value, 'localhost');
    assert.strictEqual(dbHost.files[1].value, 'prod-db.example.com');
  });

  it('should use last file value when keys overlap (override behavior)', () => {
    const file1 = path.join(testDir, '.env');
    const file2 = path.join(testDir, '.env.override');
    fs.writeFileSync(file1, 'KEY=from-first\n');
    fs.writeFileSync(file2, 'KEY=from-second\n');

    const result = EnvParser.merge([file1, file2]);

    assert.strictEqual(result.merged.get('KEY'), 'from-second');
    assert.strictEqual(result.sources['KEY'], '.env.override');
  });

  it('should not conflict when same key has same value', () => {
    const file1 = path.join(testDir, '.env');
    const file2 = path.join(testDir, '.env.local');
    fs.writeFileSync(file1, 'NODE_ENV=production\n');
    fs.writeFileSync(file2, 'NODE_ENV=production\n');

    const result = EnvParser.merge([file1, file2]);

    assert.strictEqual(result.conflicts.length, 0);
    assert.strictEqual(result.merged.get('NODE_ENV'), 'production');
  });

  it('should skip non-existent files gracefully', () => {
    const file1 = path.join(testDir, '.env');
    const file2 = path.join(testDir, '.env.nonexistent');
    fs.writeFileSync(file1, 'KEY=value\n');

    const result = EnvParser.merge([file1, file2]);

    assert.strictEqual(result.merged.size, 1);
    assert.strictEqual(result.merged.get('KEY'), 'value');
  });

  it('should throw on conflict when failOnConflict is true', () => {
    const file1 = path.join(testDir, '.env');
    const file2 = path.join(testDir, '.env.prod');
    fs.writeFileSync(file1, 'KEY=alpha\n');
    fs.writeFileSync(file2, 'KEY=beta\n');

    assert.throws(() => {
      EnvParser.merge([file1, file2], { failOnConflict: true });
    }, /Merge conflicts detected/);
  });

  it('should merge three files correctly', () => {
    const file1 = path.join(testDir, '.env');
    const file2 = path.join(testDir, '.env.staging');
    const file3 = path.join(testDir, '.env.local');
    fs.writeFileSync(file1, 'A=1\nB=2\n');
    fs.writeFileSync(file2, 'B=3\nC=4\n');
    fs.writeFileSync(file3, 'C=5\nD=6\n');

    const result = EnvParser.merge([file1, file2, file3]);

    assert.strictEqual(result.merged.size, 4);
    assert.strictEqual(result.merged.get('A'), '1');
    assert.strictEqual(result.merged.get('B'), '3');  // overridden by file2
    assert.strictEqual(result.merged.get('C'), '5');  // overridden by file3
    assert.strictEqual(result.merged.get('D'), '6');
    assert.strictEqual(result.conflicts.length, 2);   // B and C
  });
});
