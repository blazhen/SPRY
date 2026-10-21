// Temporary, read-only check of what the SPRY integration token can see.
// Run from the SPRY folder: node scripts/token-check.mjs <api-base-url>
// Reads the token from .env, never prints it, makes GET requests only.
// Prints names and counts only. Delete this file after use.
import fs from 'node:fs';

const base = (process.argv[2] || '').replace(/\/$/, '');
const LOC = process.argv[3] || '';
if (!base || !LOC) {
  console.log('Usage: node scripts/token-check.mjs <api-base-url> <location-id>');
  process.exit(1);
}
const env = {};
for (const line of fs.readFileSync('.env', 'utf8').split(/\r?\n/)) {
  const m = line.match(/^\s*(?:export\s+)?([A-Za-z0-9_]+)\s*=\s*(.*?)\s*$/);
  if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '');
}

console.log('variable names in .env:', Object.keys(env).join(', ') || 'none');
const tokenKey = Object.keys(env).find((k) => /token|pit|api.?key|private/i.test(k) && env[k]);
if (!tokenKey) {
  console.log('No token-like variable found.');
  process.exit(1);
}
const locKey = Object.keys(env).find((k) => /location/i.test(k) && env[k]);
console.log('token variable:', tokenKey, '| location variable:', locKey || 'none (using the id given on the command line)');
if (locKey && env[locKey] !== LOC) {
  console.log('STOP: the location in .env is not the one given on the command line. Nothing was called.');
  process.exit(1);
}

const headers = {
  Authorization: 'Bearer ' + env[tokenKey],
  Version: '2021-07-28',
  Accept: 'application/json',
};

async function get(label, path, describe) {
  try {
    const res = await fetch(base + path, { headers });
    const text = await res.text();
    let json = null;
    try { json = JSON.parse(text); } catch { /* not JSON */ }
    if (!res.ok) {
      const why = json && (json.message || json.error) ? String(json.message || json.error) : '';
      console.log(`${label}: HTTP ${res.status} ${why}`.slice(0, 220));
      return;
    }
    console.log(`${label}: OK ${describe ? describe(json) : ''}`);
  } catch (e) {
    console.log(`${label}: error ${e.message}`);
  }
}

const names = (arr, f = (x) => x.name) => `${arr.length}: ` + arr.map(f).join('; ');

await get('location', `/locations/${LOC}`, (j) => (j.location || j).name);
await get('custom fields', `/locations/${LOC}/customFields`, (j) => names(j.customFields || []));
await get('custom values', `/locations/${LOC}/customValues`, (j) => names(j.customValues || []));
await get('tags', `/locations/${LOC}/tags`, (j) => names(j.tags || []));
await get('pipelines', `/opportunities/pipelines?locationId=${LOC}`, (j) =>
  names(j.pipelines || [], (p) => `${p.name} (${(p.stages || []).length} stages)`));
await get('workflows (list)', `/workflows/?locationId=${LOC}`, (j) =>
  names(j.workflows || [], (w) => `${w.name} [${w.status}]`));
await get('templates', `/locations/${LOC}/templates?deleted=false&skip=0&limit=100`, (j) =>
  `${(j.templates || j.data || []).length} found`);
await get('email templates', `/emails/builder?locationId=${LOC}&limit=100`, (j) =>
  `${(j.builders || j.data || []).length} found`);
