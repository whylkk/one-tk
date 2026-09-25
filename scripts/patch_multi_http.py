#!/usr/bin/env python3
from pathlib import Path
import re
import urllib.request

HTTP = r'''
// ---- multi-client HTTP (QX $task / Surge&Egern $httpClient) ----
function httpRequest(opts, cb) {
  opts = opts || {};
  var method = (opts.method || 'GET').toUpperCase();
  var url = opts.url;
  var headers = opts.headers || {};
  var body = opts.body;
  if (typeof $task !== 'undefined' && $task.fetch) {
    $task.fetch({ url: url, method: method, headers: headers, body: body }).then(function (resp) {
      cb(null, {
        status: resp.statusCode || resp.status || 0,
        body: resp.body != null ? String(resp.body) : '',
        headers: resp.headers || {},
      });
    }, function (err) {
      cb(err || 'fetch fail', null);
    });
    return;
  }
  if (typeof $httpClient !== 'undefined') {
    var req = { url: url, headers: headers };
    if (body != null) req.body = body;
    var fn = method === 'POST' ? $httpClient.post : $httpClient.get;
    fn.call($httpClient, req, function (err, resp, data) {
      if (err) { cb(err, null); return; }
      cb(null, {
        status: (resp && (resp.status || resp.statusCode)) || 0,
        body: data != null ? String(data) : '',
        headers: (resp && resp.headers) || {},
      });
    });
    return;
  }
  cb('no http client', null);
}

'''

def replace_fetch(t, old_prefix, http_opts_js, err_line):
    idx = t.find(old_prefix)
    if idx < 0:
        print('skip missing', old_prefix[:50])
        return t
    end = t.find('}).catch(', idx)
    if end < 0:
        raise SystemExit('no catch for ' + old_prefix[:40])
    m = re.match(r'\}\)\.catch\([^;]+;\s*', t[end:])
    if not m:
        raise SystemExit('bad catch for ' + old_prefix[:40])
    end_full = end + len(m.group(0))
    inner = t[idx + len(old_prefix):end]
    inner2 = inner.replace('resp.statusCode', '(resp.status||resp.statusCode)')
    inner2 = re.sub(
        r'resp&&resp\.body!=null\?String\(resp\.body\)',
        'resp.body!=null?String(resp.body)',
        inner2,
    )
    replacement = (
        'httpRequest(' + http_opts_js + ', function(err, resp){\n'
        + '    ' + err_line + '\n'
        + inner2
        + '\n  });'
    )
    return t[:idx] + replacement + t[end_full:]

def main():
    t = Path('one1.js').read_text(encoding='utf-8')
    if "SCRIPT_VERSION = 'ONE1_MULTI_20260925c'" in t and 'function httpRequest' in t:
        print('already patched')
        return

    if 'function postOne' not in t or 'function ensureSession' not in t:
        t = urllib.request.urlopen(
            'https://cdn.jsdelivr.net/gh/whylkk/one-tk@9f394f7233f313cb3c87aac14784137005af7c11/one1.js',
            timeout=30,
        ).read().decode('utf-8')

    i = t.find('function log()')
    if i < 0:
        raise SystemExit('no log()')
    if 'function httpRequest' not in t:
        t = t[:i] + HTTP + t[i:]

    for oldv in ["BOOTSTRAP_FIRST_20260925", "ONE1_20260925", "ONE1_MULTI_20260925"]:
        t = t.replace(
            "const SCRIPT_VERSION = '%s';" % oldv,
            "const SCRIPT_VERSION = 'ONE1_MULTI_20260925c';",
        )

    t = t.replace(
        "if(typeof $task==='undefined'||!$task.fetch){cb(null,'no $task.fetch');return;}\n  ",
        "",
    )
    t = t.replace(
        "if(typeof $task==='undefined'||!$task.fetch){cb(null);return;}\n  ",
        "",
    )

    t = replace_fetch(
        t,
        "$task.fetch({url:url,method:'POST',headers:headers,body:body}).then(function(resp){",
        "{url:url,method:'POST',headers:headers,body:body}",
        "if(err||!resp){cb(null,String(err||'no resp'));return;}",
    )
    t = replace_fetch(
        t,
        "$task.fetch({url:url,method:'POST',headers:headers,body:body}).then(resp=>{",
        "{url:url,method:'POST',headers:headers,body:body}",
        "if(err||!resp){cb(null,String(err||'no resp'));return;}",
    )
    t = replace_fetch(
        t,
        "$task.fetch({url:url,method:'GET',headers:{'Accept':'*/*','User-Agent':'Quantumult%20X'}}).then(function(resp){",
        "{url:url,method:'GET',headers:{'Accept':'*/*','User-Agent':'One1/1.0'}}",
        "if(err||!resp){step('github.fail',String(err));cb(null);return;}",
    )

    t = t.replace(
        "if(tokenExpiringSoon(obj.token_one)){\n        step('github.expired','exp='+parseJwtExp(obj.token_one));\n        cb(null);\n        return;\n      }",
        "if(tokenExpiringSoon(obj.token_one)){\n        step('github.expired','exp='+parseJwtExp(obj.token_one));\n        if(!IGNORE_TOKEN_EXPIRE){cb(null);return;}\n        step('github.expired','use anyway (IGNORE_TOKEN_EXPIRE)');\n      }",
    )

    for need in ['httpRequest', 'postOne', 'ensureSession', 'fetchTokenFromGithub', 'handleResponse']:
        if need not in t:
            raise SystemExit('missing ' + need)

    Path('one1.js').write_text(t, encoding='utf-8')
    print('wrote one1.js', len(t), 'task.fetch', t.count('$task.fetch'))

if __name__ == '__main__':
    main()
