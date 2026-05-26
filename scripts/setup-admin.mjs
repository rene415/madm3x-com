#!/usr/bin/env node
/**
 * MADM3X Admin Setup
 * Run once to generate your admin credentials for the .env file.
 *
 * Usage:
 *   node scripts/setup-admin.mjs
 *
 * Then paste the output into your .env file on the server.
 */

import { createInterface } from 'node:readline';
import { randomBytes }     from 'node:crypto';
import bcrypt              from 'bcryptjs';

const rl  = createInterface({ input: process.stdin, output: process.stdout });
const ask = (q) => new Promise(resolve => rl.question(q, resolve));

console.log('\n🔐  MADM3X Admin Credential Generator\n');

const email    = await ask('Admin email (default: rene@reneramirez.me): ') || 'rene@reneramirez.me';
const password = await ask('Admin password: ');

if (!password) {
  console.error('\nPassword cannot be empty.');
  process.exit(1);
}

rl.close();

console.log('\nHashing password…');
const hash      = await bcrypt.hash(password, 12);
const jwtSecret = randomBytes(32).toString('hex');

console.log('\n─────────────────────────────────────────────────────');
console.log('Add these lines to your .env file on the server:\n');
console.log(`ADMIN_EMAIL=${email}`);
console.log(`ADMIN_PASSWORD_HASH=${hash}`);
console.log(`JWT_SECRET=${jwtSecret}`);
console.log(`DATA_DIR=/app/data`);
console.log('─────────────────────────────────────────────────────\n');
