/**
 * 拉取 box token_one → 写 token.json
 * 若已有 token.json 且 JWT 未过期（默认提前 1 小时才刷新），则跳过
 *
 * 用法:
 *   node scripts/fetch_box_token.js
 *   node scripts/fetch_box_token.js --force
 *   REFRESH_SKEW_SEC=3600 node scripts/fetch_box_token.js
 */
const fs = require('fs');
const path = require('path');
const http = require('http');
const crypto = require('crypto');
const zlib = require('zlib');

const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'token.json');
const FORCE = process.argv.includes('--force');
const SKEW_SEC = Number(process.env.REFRESH_SKEW_SEC || 3600); // 提前 1 小时视为将过期

const BOX_HOSTS = [
  '38.46.10.2',
  '38.46.10.3',
  '38.46.10.4',
  '38.46.10.5',
  '38.46.10.6',
  '202.95.22.200',
  '202.95.22.201',
  '202.95.22.202',
  '198.44.248.101',
  '198.44.248.102',
  '122.10.20.249',
];
const BOX_AES_KEY = 'dnf45as45fs1ace1';
const BOX_AES_IV = 'dn5as4fs1ac5f4e1';

function nowSec() {
  return Math.floor(Date.now() / 1000);
}

function parseJwtExp(token) {
  if (!token || typeof token !== 'string') return 0;
  try {
    const part = token.split('.')[1];
    if (!part) return 0;
    let s = part.replace(/-/g, '+').replace(/_/g, '/');
    while (s.length % 4) s += '=';
    const payload = JSON.parse(Buffer.from(s, 'base64').toString('utf8'));
    return Number(payload.exp || 0) || 0;
  } catch (_) {
    return 0;
  }
}

function isTokenValid(token, skewSec) {
  const exp = parseJwtExp(token);
  if (!exp) return false;
  return exp - nowSec() > skewSec;
}

function readExisting() {
  try {
    if (!fs.existsSync(OUT)) return null;
    return JSON.parse(fs.readFileSync(OUT, 'utf8'));
  } catch (_) {
    return null;
  }
}

function fetchConfig(host) {
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        hostname: host,
        port: 9672,
        path: '/box/api/config',
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Accept: '*/*',
          'User-Agent': 'Dart/3.0 (dart:io)',
        },
        timeout: 10000,
      },
      (res) => {
        const chunks = [];
        res.on('data', (d) => chunks.push(d));
        res.on('end', () => {
          if (res.statusCode !== 200) {
            reject(new Error('HTTP ' + res.statusCode));
            return;
          }
          resolve(Buffer.concat(chunks));
        });
      }
    );
    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('timeout'));
    });
    req.write('channel=vjc');
    req.end();
  });
}

function decryptBox(buf) {
  const decipher = crypto.createDecipheriv(
    'aes-128-cbc',
    Buffer.from(BOX_AES_KEY, 'utf8'),
    Buffer.from(BOX_AES_IV, 'utf8')
  );
  const raw = Buffer.concat([decipher.update(buf), decipher.final()]);
  return JSON.parse(zlib.inflateSync(raw).toString('utf8'));
}

async function pullFresh() {
  let lastErr;
  for (const host of BOX_HOSTS) {
    try {
      process.stderr.write('[box] try ' + host + '\n');
      const buf = await fetchConfig(host);
      const json = decryptBox(buf);
      if (json.code !== 0 && json.code !== 200) {
        throw new Error('code=' + json.code);
      }
      const tokenItem = (json.data.token || []).find((t) => t && t.name === 'token_one');
      if (!tokenItem || !tokenItem.token) throw new Error('no token_one');
      const media = {};
      for (const a of json.data.api || []) {
        if (!a || !a.name || !a.host) continue;
        media[a.name] = a.host.endsWith('/') ? a.host : a.host + '/';
      }
      const exp = parseJwtExp(tokenItem.token);
      return {
        updated_at: new Date().toISOString(),
        token_one: tokenItem.token,
        exp,
        exp_iso: exp ? new Date(exp * 1000).toISOString() : null,
        base_url: media.one || 'https://api.einhn4.com/',
        media: {
          one: media.one || 'https://api.einhn4.com/',
          one_img: media.one_img || 'https://jmt612.xqjby.com/',
          one_video: media.one_video || 'https://dlmk0129.scycjz.com/',
        },
        source_host: host,
      };
    } catch (e) {
      lastErr = e;
      process.stderr.write('[box] fail ' + host + ' ' + (e.message || e) + '\n');
    }
  }
  throw lastErr || new Error('all box hosts failed');
}

(async () => {
  const existing = readExisting();
  if (!FORCE && existing && existing.token_one && isTokenValid(existing.token_one, SKEW_SEC)) {
    const exp = parseJwtExp(existing.token_one);
    process.stderr.write(
      '[skip] token still valid, exp=' +
        exp +
        ' (' +
        new Date(exp * 1000).toISOString() +
        '), skew=' +
        SKEW_SEC +
        's\n'
    );
    // 保持文件不变，退出 0，Actions 不会产生无意义 commit
    process.stdout.write(JSON.stringify(existing, null, 2) + '\n');
    process.exit(0);
  }

  if (FORCE) process.stderr.write('[force] refresh requested\n');
  else if (existing && existing.token_one) {
    process.stderr.write('[refresh] token missing/expired/near-expiry\n');
  } else {
    process.stderr.write('[refresh] no existing token.json\n');
  }

  const fresh = await pullFresh();
  fs.writeFileSync(OUT, JSON.stringify(fresh, null, 2) + '\n', 'utf8');
  process.stderr.write(
    '[ok] wrote token.json exp=' + fresh.exp_iso + ' host=' + fresh.source_host + '\n'
  );
  process.stdout.write(JSON.stringify(fresh, null, 2) + '\n');
})().catch((e) => {
  console.error('[error]', e.message || e);
  process.exit(1);
});
