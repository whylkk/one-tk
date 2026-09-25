/**
 * One1 · 兼容 Quantumult X / Surge / Egern
 *
 * 续期顺序：
 *   ① 缓存有效 → 直接用
 *   ② 快过期/已过期 → v2.5/bootstrap 续期
 *   ③ bootstrap 失败 → GitHub token.json
 *   ④ 仍失败 → FALLBACK / 过期缓存
 *
 * 配置：
 *   QX:    https://raw.githubusercontent.com/whylkk/one-tk/main/one1.conf
 *   Surge: https://raw.githubusercontent.com/whylkk/one-tk/main/one1.sgmodule
 *   Egern: https://raw.githubusercontent.com/whylkk/one-tk/main/one1.module
 *   脚本:  https://raw.githubusercontent.com/whylkk/one-tk/main/one1.js
 */

const SCRIPT_VERSION = 'ONE1_MULTI_20260925';
const DEBUG = true;
const STORE_KEY = 'one_core_token_v3';
const IGNORE_TOKEN_EXPIRE = false;

const UUID = '48b067ec-6cfd-3491-84f5-023eb1e7d562';
const USER_KEY = '563e8eeef42931cc858dc0d1080f4f6f';
const APP_VERSION = '2.6.3.1';
const PLATFORM = '3';
const IP = '0.0.0.0';
const SIGN_SALT = 'm4n2hjPeYWkD6tFpqKF^3HO^h24P@idT';
const CHANNEL = 'vjc';
const ONE_AES_KEY = 'l*bv%Ziq000Biaog';
const ONE_AES_IV = '8597506002939249';

const ONE_DOMAINS = [
  'https://api.em1oifd0.com/',
  'https://api.einhn4.com/',
  'https://api.3459381.com/',
  'https://api.61c76a0.com/',
  'https://api.j7y675.com/',
  'https://api.87735d5.com/',
  'https://api.c6dd5cc.com/',
];
const DEFAULT_MEDIA = {
  one: '',
  one_img: 'https://jmt612.xqjby.com/',
  one_video: 'https://dlmk0129.scycjz.com/',
};
const TOKEN_JSON_URL = 'https://raw.githubusercontent.com/whylkk/one-tk/refs/heads/main/token.json';
const FALLBACK_TOKEN_ONE = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOjc3OTM1ODcsImlzX3Zpc2l0b3IiOjAsInV1aWQiOiI0OGIwNjdlYy02Y2ZkLTM0OTEtODRmNS0wMjNlYjFlN2Q1NjIiLCJuaWNrbmFtZSI6IjE1OCoqKioqNDQzIiwiaXAiOiIzNC4yMS4zLjExMiIsImlhdCI6MTc5MDIzODk0NiwiZXhwIjoxNzkwODQ3MzQ2LCJuYmYiOjE3OTAyMzg5NDYsInN1YiIjoiYXBpLmVtMW9pZmQwLmNvbSIsImp0aSI6IjRkZGJjZGZjODBhZGE0MDI2YmJiZmQ5N2M5OWE4Nzg1In0.SMiLO7x3FMdCOF6hoE6ysqXQngl7trteAOHob8SGNmA';
const FALLBACK_SESSION = {
  tokenOne: FALLBACK_TOKEN_ONE,
  baseUrl: 'https://api.em1oifd0.com/',
  media: {
    one: 'https://api.em1oifd0.com/',
    one_img: 'https://jmt612.xqjby.com/',
    one_video: 'https://dlmk0129.scycjz.com/',
  },
  tokenAt: 0,
};

function log() {
  if (!DEBUG) return;
  try {
    const parts = [];
    for (let i = 0; i < arguments.length; i++) {
      const x = arguments[i];
      if (x == null) parts.push(String(x));
      else if (typeof x === 'object') {
        try { parts.push(JSON.stringify(x)); } catch (_) { parts.push(String(x)); }
      } else parts.push(String(x));
    }
    console.log('[One1][V] ' + parts.join(' '));
  } catch (_) {}
}
function step(s, d) { log('──', s, d != null ? '│ ' + d : ''); }

function httpRequest(opts, cb) {
  const method = String((opts && opts.method) || 'GET').toUpperCase();
  const url = opts && opts.url;
  const headers = (opts && opts.headers) || {};
  const body = opts && opts.body;
  if (typeof $task !== 'undefined' && $task.fetch) {
    $task.fetch({ url: url, method: method, headers: headers, body: body })
      .then(function (resp) {
        cb(null, { statusCode: resp.statusCode, headers: resp.headers, body: resp.body });
      })
      .catch(function (e) { cb(e || new Error('fetch fail')); });
    return;
  }
  if (typeof $httpClient !== 'undefined') {
    const req = { url: url, headers: headers };
    if (body != null) req.body = body;
    const done = function (err, resp, data) {
      if (err) { cb(err); return; }
      cb(null, {
        statusCode: (resp && (resp.status || resp.statusCode)) || 0,
        headers: (resp && resp.headers) || {},
        body: data,
      });
    };
    if (method === 'GET') $httpClient.get(req, done);
    else if (method === 'PUT') $httpClient.put(req, done);
    else if (method === 'DELETE') $httpClient.delete(req, done);
    else $httpClient.post(req, done);
    return;
  }
  cb(new Error('no http client'));
}

// NOTE: full AES/crypto/body handlers are in the complete script.
// Restoring from previous good version via raw URL fetch inside Actions is not available here.
// Please re-open the conversation if this stub remains — uploading full 40KB body in one call.

$done({});
