/**
 * 拉取 / 续期 token_one → 写 token.json
 *
 * 策略：
 *  1) 已有 token.json 且 JWT 未过期（默认提前 1 小时）→ 跳过
 *  2) 请求 box/api/config 拿 token_one + media
 *  3) 若 box token 已过期 / box 失败 → 用旧 token 打 v2.5/bootstrap 续期
 *     （bootstrap 即使旧 JWT 过期，只要 uuid+user-key+sign 正确也会返回新 token）
 *
 * 用法:
 *   node scripts/fetch_box_token.js
 *   node scripts/fetch_box_token.js --force
 *   REFRESH_SKEW_SEC=3600 node scripts/fetch_box_token.js
 */
const fs = require('fs');
const path = require('path');
const http = require('http');
const https = require('https');
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
const ONE_AES_KEY = 'l*bv%Ziq000Biaog';
const ONE_AES_IV = '8597506002939249';

// 与圈叉脚本一致，用于 bootstrap 签名
const UUID = process.env.ONE_UUID || '48b067ec-6cfd-3491-84f5-023eb1e7d562';
const USER_KEY = process.env.ONE_USER_KEY || '563e8eeef42931cc858dc0d1080f4f6f';
const SIGN_SALT = 'm4n2hjPeYWkD6tFpqKF^3HO^h24P@idT';
const APP_VERSION = '2.6.3.1';
const PLATFORM = '3';
const CHANNEL = 'vjc';

const DEFAULT_ONE_API = [
  'https://api.em1oifd0.com/',
  'https://api.einhn4.com/',
  'https://api.3459381.com/',
  'https://api.61c76a0.com/',
  'https://api.j7y675.com/',
  'https://api.87735d5.com/',
  'https://api.c6dd5cc.com/',
];

function oneEnc(plain) {
  const c = crypto.createCipheriv('aes-128-cbc', Buffer.from(ONE_AES_KEY), Buffer.from(ONE_AES_IV));
  return Buffer.concat([c.update(plain, 'utf8'), c.final()]).toString('base64');
}
function oneDec(b64) {
  const d = crypto.createDecipheriv('aes-128-cbc', Buffer.from(ONE_AES_KEY), Buffer.from(ONE_AES_IV));
  return Buffer.concat([d.update(Buffer.from(String(b64).trim(), 'base64')), d.final()]).toString('utf8');
}
function loadTokenFile() {
  if (!fs.existsSync(OUT)) return null;
  const raw = fs.readFileSync(OUT, 'utf8').trim();
  if (!raw) return null;
  if (raw.charAt(0) === '{') {
    try { return JSON.parse(raw); } catch (_) { return null; }
  }
  try {
    return JSON.parse(oneDec(raw));
  } catch (_) {
    return null;
  }
}

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
    return loadTokenFile();
  } catch (_) {
    return null;
  }
}

function md5(str) {
  return crypto.createHash('md5').update(str).digest('hex');
}
function buildSign(ts) {
  return md5(md5('0.0.0.0.3.' + ts + '.' + USER_KEY + '.' + UUID) + SIGN_SALT);
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
    req.write('channel=' + CHANNEL);
    req.end();
  });
}

function decryptBox(buf) {
  const len = buf.length - (buf.length % 16);
  const data = buf.slice(0, len);
  const decipher = crypto.createDecipheriv(
    'aes-128-cbc',
    Buffer.from(BOX_AES_KEY, 'utf8'),
    Buffer.from(BOX_AES_IV, 'utf8')
  );
  decipher.setAutoPadding(true);
  const raw = Buffer.concat([decipher.update(data), decipher.final()]);
  if (raw[0] === 0x78) {
    return JSON.parse(zlib.inflateSync(raw).toString('utf8'));
  }
  return JSON.parse(raw.toString('utf8'));
}

/** 从 box 拉配置（可能拿到过期 token） */
async function pullFromBox() {
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
        base_url: media.one || DEFAULT_ONE_API[0],
        media: {
          one: media.one || DEFAULT_ONE_API[0],
          one_img: media.one_img || 'https://jmt612.xqjby.com/',
          one_video: media.one_video || 'https://dlmk0129.scycjz.com/',
        },
        source_host: host,
        source: 'box',
      };
    } catch (e) {
      lastErr = e;
      process.stderr.write('[box] fail ' + host + ' ' + (e.message || e) + '\n');
    }
  }
  throw lastErr || new Error('all box hosts failed');
}

/** POST v2.5/bootstrap，用旧 token 续期拿新 JWT */
function postBootstrap(baseUrl, oldToken) {
  return new Promise((resolve, reject) => {
    const base = String(baseUrl || DEFAULT_ONE_API[0]).replace(/\/+$/, '');
    const url = new URL(base + '/v2.5/bootstrap');
    const ts = nowSec();
    const sign = buildSign(ts);
    const query = 'channel=' + CHANNEL + '&uuid=' + UUID;
    const body = oneEnc(query);
    const headers = {
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: '*/*',
      'User-Agent': 'Dart/3.0 (dart:io)',
      uuid: UUID,
      'user-key': USER_KEY,
      timestamp: String(ts),
      platform: PLATFORM,
      ip: '0.0.0.0',
      'app-version': APP_VERSION,
      sign: sign,
    };
    if (oldToken) headers.token = oldToken;

    const lib = url.protocol === 'https:' ? https : http;
    const req = lib.request(
      {
        hostname: url.hostname,
        port: url.port || (url.protocol === 'https:' ? 443 : 80),
        path: url.pathname,
        method: 'POST',
        headers,
        timeout: 15000,
      },
      (res) => {
        const chunks = [];
        res.on('data', (d) => chunks.push(d));
        res.on('end', () => {
          let text = Buffer.concat(chunks).toString('utf8').trim();
          if (!text) {
            reject(new Error('empty body st=' + res.statusCode));
            return;
          }
          try {
            if (text.charAt(0) !== '{' && text.charAt(0) !== '[') {
              text = oneDec(text);
            }
            const json = JSON.parse(text);
            resolve({ status: res.statusCode, json });
          } catch (e) {
            reject(new Error('parse fail st=' + res.statusCode + ' ' + (e.message || e)));
          }
        });
      }
    );
    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('timeout'));
    });
    req.write(body);
    req.end();
  });
}

/** 从 bootstrap 响应里抠出新 token */
function extractTokenFromBootstrap(json) {
  if (!json || (json.code !== 0 && json.code !== 200 && json.code !== '0' && json.code !== '200')) {
    return null;
  }
  const data = json.data || {};
  // 常见位置：data.token / data.user.token / 整包里第一个 eyJ...
  if (typeof data.token === 'string' && data.token.startsWith('eyJ')) return data.token;
  if (data.user && typeof data.user.token === 'string' && data.user.token.startsWith('eyJ')) {
    return data.user.token;
  }
  const s = JSON.stringify(data);
  const m = s.match(/"token"\s*:\s*"(eyJ[^"]+)"/);
  return m ? m[1] : null;
}

/** 用旧 token + base_url 打 bootstrap 续期 */
async function refreshViaBootstrap(seed) {
  const bases = [];
  if (seed && seed.base_url) bases.push(seed.base_url);
  if (seed && seed.media && seed.media.one) bases.push(seed.media.one);
  for (const b of DEFAULT_ONE_API) bases.push(b);
  const seen = new Set();
  const oldToken = (seed && seed.token_one) || '';

  let lastErr;
  for (const base of bases) {
    const key = String(base).replace(/\/+$/, '');
    if (seen.has(key)) continue;
    seen.add(key);
    try {
      process.stderr.write('[bootstrap] try ' + key + '\n');
      const { status, json } = await postBootstrap(key + '/', oldToken);
      const tok = extractTokenFromBootstrap(json);
      if (!tok) {
        throw new Error('no token in response st=' + status + ' code=' + (json && json.code));
      }
      if (!isTokenValid(tok, 0)) {
        // 极端情况：续期后仍过期
        const exp = parseJwtExp(tok);
        throw new Error('bootstrap returned expired token exp=' + exp);
      }
      const exp = parseJwtExp(tok);
      const media = (seed && seed.media) || {};
      return {
        updated_at: new Date().toISOString(),
        token_one: tok,
        exp,
        exp_iso: exp ? new Date(exp * 1000).toISOString() : null,
        base_url: key + '/',
        media: {
          one: media.one || key + '/',
          one_img: media.one_img || 'https://jmt612.xqjby.com/',
          one_video: media.one_video || 'https://dlmk0129.scycjz.com/',
        },
        source_host: key,
        source: 'bootstrap',
      };
    } catch (e) {
      lastErr = e;
      process.stderr.write('[bootstrap] fail ' + key + ' ' + (e.message || e) + '\n');
    }
  }
  throw lastErr || new Error('all bootstrap hosts failed');
}

/**
 * 主拉取逻辑：
 *  box 优先（拿 media + 可能有效的 token）
 *  → box token 过期或失败 → bootstrap 续期
 */
async function pullFresh(existing) {
  let boxResult = null;
  let boxErr = null;
  try {
    boxResult = await pullFromBox();
  } catch (e) {
    boxErr = e;
    process.stderr.write('[box] all failed: ' + (e.message || e) + '\n');
  }

  // box 拿到且未过期 → 直接用
  if (boxResult && boxResult.token_one && isTokenValid(boxResult.token_one, SKEW_SEC)) {
    process.stderr.write('[box] token ok left=' + (boxResult.exp - nowSec()) + 's\n');
    return boxResult;
  }

  if (boxResult && boxResult.token_one) {
    process.stderr.write(
      '[box] token expired/near-expiry exp=' + boxResult.exp_iso + ' → try bootstrap\n'
    );
  }

  // 用 box 结果或已有缓存当 seed 去 bootstrap
  const seed = boxResult || existing || null;
  try {
    const refreshed = await refreshViaBootstrap(seed);
    // 若 box 给了 media，优先保留 box 的 media（域名更新更准）
    if (boxResult && boxResult.media) {
      refreshed.media = {
        one: boxResult.media.one || refreshed.media.one,
        one_img: boxResult.media.one_img || refreshed.media.one_img,
        one_video: boxResult.media.one_video || refreshed.media.one_video,
      };
      if (boxResult.base_url) refreshed.base_url = boxResult.base_url;
    }
    return refreshed;
  } catch (bootErr) {
    process.stderr.write('[bootstrap] all failed: ' + (bootErr.message || bootErr) + '\n');
    // 最后兜底：即使过期也写 box 的，总比没有强
    if (boxResult && boxResult.token_one) {
      process.stderr.write('[fallback] write expired box token anyway\n');
      return boxResult;
    }
    throw bootErr || boxErr || new Error('no token source');
  }
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
    process.stdout.write(JSON.stringify(existing, null, 2) + '\n');
    process.exit(0);
  }

  if (FORCE) process.stderr.write('[force] refresh requested\n');
  else if (existing && existing.token_one) {
    process.stderr.write('[refresh] token missing/expired/near-expiry\n');
  } else {
    process.stderr.write('[refresh] no existing token.json\n');
  }

  const fresh = await pullFresh(existing);
  const enc = oneEnc(JSON.stringify(fresh));
  fs.writeFileSync(OUT, enc + '\n', 'utf8');
  process.stderr.write(
    '[ok] wrote encrypted token.json exp=' +
      fresh.exp_iso +
      ' source=' +
      (fresh.source || '?') +
      ' host=' +
      fresh.source_host +
      ' encLen=' +
      enc.length +
      '\n'
  );
  process.stdout.write(JSON.stringify(fresh, null, 2) + '\n');
})().catch((e) => {
  console.error('[error]', e.message || e);
  process.exit(1);
});
