/**
 * One1 Egern native (lite)
 * module: https://raw.githubusercontent.com/whylkk/one-tk/main/one1-egern.yaml
 * Handles plain JSON: bootstrap VIP, list purchased, vip/download
 * Encrypted body is left unchanged (log: skip encrypted body)
 */
const VERSION = 'ONE1_EGERN_LITE_20260925';

function log() {
  try {
    var a = [];
    for (var i = 0; i < arguments.length; i++) a.push(String(arguments[i]));
    console.log('[One1E] ' + a.join(' '));
  } catch (e) {}
}

function getPath(url) {
  var m = String(url || '').match(/\/v2\.5\/[a-zA-Z0-9_\/.]+/);
  return m ? m[0] : '';
}

function isPlainJson(t) {
  t = String(t || '').trim();
  return t.charAt(0) === '{' || t.charAt(0) === '[';
}

function markPurchased(node) {
  if (node == null) return node;
  if (Array.isArray(node)) {
    for (var i = 0; i < node.length; i++) node[i] = markPurchased(node[i]);
    return node;
  }
  if (typeof node !== 'object') return node;
  var buyKeys = ['is_buy','is_bought','buy','bought','purchased','is_purchase','is_purchased','has_buy','has_bought','is_paid','paid','is_unlock','unlocked','is_unlocked','unlock','is_own','owned','is_free','free','can_play','can_watch'];
  for (var bi = 0; bi < buyKeys.length; bi++) {
    var k = buyKeys[bi];
    if (k in node) {
      if (typeof node[k] === 'boolean') node[k] = true;
      else node[k] = 1;
    }
  }
  var offKeys = ['need_buy','need_purchase','need_pay','is_lock','locked','is_locked','lock'];
  for (var oi = 0; oi < offKeys.length; oi++) {
    var k2 = offKeys[oi];
    if (k2 in node) {
      if (typeof node[k2] === 'boolean') node[k2] = false;
      else node[k2] = 0;
    }
  }
  var nest = ['data','list','info','articles','chapters','items','rows','records','result'];
  for (var ni = 0; ni < nest.length; ni++) {
    if (node[nest[ni]] != null) node[nest[ni]] = markPurchased(node[nest[ni]]);
  }
  return node;
}

function modifyBootstrap(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  if (obj.data && obj.data.user) {
    obj.data.user.vip_level = 9;
    obj.data.user.vip_expiry = '2099-12-31';
    obj.data.user.permanent_vip = 1;
    obj.data.user.vip_status = 1;
  }
  if (obj.data) {
    if (!obj.data.vip) obj.data.vip = {};
    obj.data.vip.skip_ad = 1;
  }
  return obj;
}

function modifyVipDownload(obj) {
  if (!obj || typeof obj !== 'object' || !obj.data || obj.code === 412 || obj.code === 401) {
    return { code: 200, message: 'ok', data: { limit: 9999, use: 0, last: 9999, articles: [], downloaded_collection: 0 } };
  }
  obj.code = 200;
  obj.message = 'ok';
  obj.data.limit = 9999;
  obj.data.use = 0;
  obj.data.last = 9999;
  return obj;
}

function isListPath(path) {
  return /\/article\/(day|discovery|search|list)\b/.test(path) ||
    /\/series\/(list|chapters)\b/.test(path);
}

export default async function (ctx) {
  try {
    var url = (ctx.request && ctx.request.url) || '';
    var path = getPath(url);
    log('VER', VERSION, 'path', path);
    var text = '';
    try { text = await ctx.response.text(); } catch (e) {}
    text = String(text || '').trim();
    if (!text) return;
    if (!isPlainJson(text)) {
      log('skip encrypted body');
      return;
    }
    var json = JSON.parse(text);
    if (path.indexOf('/bootstrap') >= 0) {
      return { body: JSON.stringify(modifyBootstrap(json)) };
    }
    if (path.indexOf('/vip/download') >= 0) {
      return { body: JSON.stringify(modifyVipDownload(json)) };
    }
    if (isListPath(path) || path.indexOf('/article/detail') >= 0) {
      return { body: JSON.stringify(markPurchased(json)) };
    }
  } catch (e) {
    log('FATAL', e && e.message ? e.message : e);
  }
}
