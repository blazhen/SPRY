// Mint a signed access token for the Hub link. Usage: node server/issue-token.mjs [--hours 8] [--env <file>]
// Reads SPRY_IFRAME_SECRET and SPRY_CRM_LOCATION_ID from the process environment (the .env file is loaded first,
// real environment wins). Prints ONLY the token to stdout. The secret is never printed.
import crypto from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadEnv } from './load-env.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const opt = (name) => { const i = args.indexOf('--' + name); return i >= 0 ? args[i + 1] : undefined; };

loadEnv(opt('env') ?? path.resolve(here, '..', '..', '.env'));
const fail = (m) => { console.error(m); process.exit(1); };

const hours = opt('hours') === undefined ? 8 : Number(opt('hours'));
if (!Number.isFinite(hours) || hours <= 0 || hours > 720) fail('--hours must be a number above 0 and at most 720');
const secret = process.env.SPRY_IFRAME_SECRET;
const loc = process.env.SPRY_CRM_LOCATION_ID;
if (!secret) fail('SPRY_IFRAME_SECRET is not set');
if (!loc) fail('SPRY_CRM_LOCATION_ID is not set');

const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
const h = b64({ alg: 'HS256', typ: 'JWT' });
const p = b64({ loc, exp: Math.floor(Date.now() / 1000) + Math.round(hours * 3600) });
const sig = crypto.createHmac('sha256', secret).update(h + '.' + p).digest('base64url');
process.stdout.write(h + '.' + p + '.' + sig + '\n');
