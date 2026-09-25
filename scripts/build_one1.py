#!/usr/bin/env python3
"""Build multi-client one1.js (QX / Surge / Egern) from last full QX build."""
import re
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'one1.js'
BASE_URL = 'https://raw.githubusercontent.com/whylkk/one-tk/8a5fb17edef7ad952cb9d1c7ae952c4bc41a4f38/one1.js'

HEADER = '''/**
 * One1 multi-client: Quantumult X / Surge / Egern
 * session: cache -> bootstrap -> github -> fallback
 * QX:    https://raw.githubusercontent.com/whylkk/one-tk/main/one1.conf
 * Surge: https://raw.githubusercontent.com/whylkk/one-tk/main/one1.sgmodule
 * Egern: https://raw.githubusercontent.com/whylkk/one-tk/main/one1.module
 */

'''

HELPER = r'''
function httpRequest(opts, cb) {
  var method = String((opts && opts.method) || 'GET').toUpperCase();
  var url = opts && opts.url;
  var headers = (opts && opts.headers) || {};
  var body = opts && opts.body;
  if (typeof $task !== 'undefined' && $task.fetch) {
    $task.fetch({ url: url, method: method, headers: headers, body: body })
      .then(function (resp) {
        cb(null, { statusCode: resp.statusCode, headers: resp.headers, body: resp.body });
      })
      .catch(function (e) { cb(e || new Error('fetch fail')); });
    return;
  }
  if (typeof $httpClient !== 'undefined') {
    var req = { url: url, headers: headers };
    if (body != null) req.body = body;
    var done = function (err, resp, data) {
      if (err) { cb(err); return; }
      cb(null, {
        statusCode: (resp && (resp.status || resp.statusCode)) || 0,
        headers: (resp && resp.headers) || {},
        body: data
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

'''

def main():
    text = urllib.request.urlopen(BASE_URL, timeout=30).read().decode('utf-8')
    i = text.find('const SCRIPT_VERSION')
    if i < 0:
        raise SystemExit('bad base script')
    text = HEADER + text[i:]
    text = text.replace(
        "const SCRIPT_VERSION = 'ONE1_BOOTSTRAP_FIRST_20260925';",
        "const SCRIPT_VERSION = 'ONE1_MULTI_20260925';",
    )

    # ASCII-only step logger (avoid special unicode that some engines choke on)
    text = text.replace(
        "function step(s, d) { log('──', s, d != null ? '│ ' + d : ''); }",
        "function step(s, d) { log('--', s, d != null ? ('| ' + d) : ''); }",
    )
    text = text.replace("short(s,n){s=String(s||'');return s.length>(n||100)?s.slice(0,n)+'…':s;}",
                        "short(s,n){s=String(s||'');return s.length>(n||100)?s.slice(0,n)+'...':s;}")

    marker = "function step(s, d) { log('--', s, d != null ? ('| ' + d) : ''); }\n"
    if 'function httpRequest' not in text:
        if marker not in text:
            raise SystemExit('step() marker not found')
        text = text.replace(marker, marker + HELPER, 1)

    text = text.replace(
        "if(typeof $task==='undefined'||!$task.fetch){cb(null,'no $task.fetch');return;}",
        "if(typeof $task==='undefined'&&typeof $httpClient==='undefined'){cb(null,'no http');return;}",
    )
    text = text.replace(
        "if(typeof $task==='undefined'||!$task.fetch){cb(null);return;}",
        "if(typeof $task==='undefined'&&typeof $httpClient==='undefined'){cb(null);return;}",
    )

    text = text.replace(
        "  $task.fetch({url:url,method:'POST',headers:headers,body:body}).then(function(resp){\n    try{\n      let text=resp&&resp.body!=null?String(resp.body).trim():'';\n      step('bootstrap.raw','st='+(resp.statusCode||'')+' len='+text.length);\n",
        "  httpRequest({url:url,method:'POST',headers:headers,body:body},function(err,resp){\n    if(err){cb(null,String(err));return;}\n    try{\n      let text=resp&&resp.body!=null?String(resp.body).trim():'';\n      step('bootstrap.raw','st='+(resp.statusCode||'')+' len='+text.length);\n",
        1,
    )
    text = text.replace(
        "      cb(saved,null);\n    }catch(e){cb(null,e.message||e);}\n  }).catch(function(e){cb(null,String(e));});\n}",
        "      cb(saved,null);\n    }catch(e){cb(null,e.message||e);}\n  });\n}",
        1,
    )
    text = text.replace(
        "  $task.fetch({url:url,method:'GET',headers:{'Accept':'*/*','User-Agent':'Quantumult%20X'}}).then(function(resp){\n    try{",
        "  httpRequest({url:url,method:'GET',headers:{'Accept':'*/*','User-Agent':'One1'}},function(err,resp){\n    if(err){step('github.fail',String(err));cb(null);return;}\n    try{",
        1,
    )
    text = text.replace(
        "      cb(saved);\n    }catch(e){step('github.err',e.message||e);cb(null);}\n  }).catch(function(e){step('github.fail',String(e));cb(null);});\n}",
        "      cb(saved);\n    }catch(e){step('github.err',e.message||e);cb(null);}\n  });\n}",
        1,
    )
    text = text.replace(
        "  $task.fetch({url:url,method:'POST',headers:headers,body:body}).then(resp=>{\n    try{",
        "  httpRequest({url:url,method:'POST',headers:headers,body:body},function(err,resp){\n    if(err){cb(null,String(err));return;}\n    try{",
        1,
    )
    text = text.replace(
        "      cb(json.data!==undefined?json.data:json,null);\n    }catch(e){cb(null,e.message||e);}\n  }).catch(e=>cb(null,String(e)));\n}",
        "      cb(json.data!==undefined?json.data:json,null);\n    }catch(e){cb(null,e.message||e);}\n  });\n}",
        1,
    )

    # Remove remaining arrow functions (Egern/older JSC safer)
    text = text.replace(
        "return Object.keys(obj).sort().map(k=>k+'='+(obj[k]==null?'':obj[k])).join('&');",
        "return Object.keys(obj).sort().map(function(k){return k+'='+(obj[k]==null?'':obj[k]);}).join('&');",
    )
    text = text.replace(
        "String(q||'').split('&').forEach(pair=>{",
        "String(q||'').split('&').forEach(function(pair){",
    )

    # for...of -> classic for (markPurchased)
    text = re.sub(
        r"for\s*\(\s*const\s+k\s+of\s+buyKeys\s*\)",
        "for (var bi=0;bi<buyKeys.length;bi++){ var k=buyKeys[bi];",
        text,
    )
    # close extra block carefully - the original for body already has braces
    # Actually original is: for(const k of buyKeys){ ... } so replacing header only is OK if we add }
    # Wait - we added an extra `{` after bi loop, so the original `{` after for becomes double.
    # Simpler approach: replace pattern fully differently

    # Revert botched for-of if any and do cleaner replacements
    text = text.replace(
        "for (var bi=0;bi<buyKeys.length;bi++){ var k=buyKeys[bi];{",
        "for (var bi=0;bi<buyKeys.length;bi++){ var k=buyKeys[bi];",
    )

    # Safer for-of replacements on known arrays
    for arr, varn in (
        ('buyKeys', 'bi'),
        ('statusKeys', 'si'),
        ('offKeys', 'oi'),
    ):
        text = text.replace(
            "for(const k of %s){" % arr,
            "for(var %s=0;%s<%s.length;%s++){var k=%s[%s];" % (varn, varn, arr, varn, arr, varn),
        )
        text = text.replace(
            "for (const k of %s){" % arr,
            "for(var %s=0;%s<%s.length;%s++){var k=%s[%s];" % (varn, varn, arr, varn, arr, varn),
        )

    text = text.replace(
        "for(const k of ['price','coin','coins','pay_coin','pay_price','amount']){",
        "var _pk=['price','coin','coins','pay_coin','pay_price','amount'];for(var pi=0;pi<_pk.length;pi++){var k=_pk[pi];",
    )
    text = text.replace(
        "for(const k of ['data','list','info','articles','chapters','items','rows','records','result']){",
        "var _nk=['data','list','info','articles','chapters','items','rows','records','result'];for(var ni=0;ni<_nk.length;ni++){var k=_nk[ni];",
    )

    # Entry: hard try/catch so Egern logs something useful
    old_entry = """(function(){\n  const isReq=typeof $request!=='undefined'&&typeof $response==='undefined';\n  if(isReq){$done({});return;}\n  handleResponse();\n})();"""
    new_entry = """(function(){\n  try {\n    var isReq = typeof $request !== 'undefined' && typeof $response === 'undefined';\n    if (isReq) { $done({}); return; }\n    handleResponse();
  } catch (e) {
    try { console.log('[One1][FATAL] ' + (e && e.message ? e.message : e)); } catch (_) {}
    try { $done({}); } catch (_) {}
  }
})();"""
    if old_entry in text:
        text = text.replace(old_entry, new_entry)
    else:
        # fallback loose match
        text = re.sub(
            r"\(function\(\)\{\s*const isReq=typeof \$request!=='undefined'&&typeof \$response==='undefined';\s*if\(isReq\)\{\$done\(\{\}\);return;\}\s*handleResponse\(\);\s*\}\)\(\);",
            new_entry,
            text,
            count=1,
        )

    if 'function httpRequest' not in text:
        raise SystemExit('httpRequest missing after patch')
    if text.count('$task.fetch') > 2:
        raise SystemExit('too many $task.fetch left: %d' % text.count('$task.fetch'))
    if '=>' in text:
        # last-chance strip simple arrows
        print('warning: arrow still present', text.count('=>'))

    OUT.write_text(text, encoding='utf-8', newline='\n')
    print('wrote', OUT, 'bytes', OUT.stat().st_size)

if __name__ == '__main__':
    main()
