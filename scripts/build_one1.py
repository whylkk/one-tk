#!/usr/bin/env python3
"""Build multi-client one1.js (QX / Surge / Egern) from last full QX build."""
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'one1.js'
BASE_URL = 'https://raw.githubusercontent.com/whylkk/one-tk/8a5fb17edef7ad952cb9d1c7ae952c4bc41a4f38/one1.js'

HEADER = '''/**
 * One1 · 兼容 Quantumult X / Surge / Egern
 *
 * 续期：缓存有效 → bootstrap → GitHub → FALLBACK
 * QX:    https://raw.githubusercontent.com/whylkk/one-tk/main/one1.conf
 * Surge: https://raw.githubusercontent.com/whylkk/one-tk/main/one1.sgmodule
 * Egern: https://raw.githubusercontent.com/whylkk/one-tk/main/one1.module
 */

'''

HELPER = r'''
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
    marker = "function step(s, d) { log('──', s, d != null ? '│ ' + d : ''); }\n"
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

    if 'function httpRequest' not in text:
        raise SystemExit('httpRequest missing after patch')
    if text.count('$task.fetch') > 2:
        raise SystemExit('too many $task.fetch left: %d' % text.count('$task.fetch'))

    OUT.write_text(text, encoding='utf-8')
    print('wrote', OUT, 'bytes', OUT.stat().st_size)

if __name__ == '__main__':
    main()
