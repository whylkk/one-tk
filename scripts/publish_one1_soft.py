#!/usr/bin/env python3
from pathlib import Path
import urllib.request

BASE_URL = (
    "https://cdn.jsdelivr.net/gh/whylkk/one-tk@"
    "0679e78c8fe53a3a76e88824d3f5d8cae320b4f8/one1.js"
)
SCRIPT_URL = "https://raw.githubusercontent.com/whylkk/one-tk/main/one1.js"

def main():
    base = urllib.request.urlopen(BASE_URL, timeout=30).read().decode("utf-8")
    i = base.find("const SCRIPT_VERSION")
    if i < 0:
        raise SystemExit("bad base script")
    body = base[i:]
    body = body.replace(
        "const SCRIPT_VERSION = 'ONE1_MULTI_20260925';",
        "const SCRIPT_VERSION = 'ONE1_20260925';",
    )
    Path("one1.js").write_text(body, encoding="utf-8")
    print("wrote one1.js", len(body))

    conf = "\n".join([
        "#!name=One1",
        "#!desc=One App · 列表已购 / 详情真链 / VIP / 去广告",
        "#!author=whylkk",
        "#!homepage=https://t.me/GieGie777",
        "#!category=会员",
        "",
        "[rewrite_local]",
        "# > One bootstrap / vip / detail / list / series",
        "^https?:\\/\\/[^\\/]+\\/v2\\.5\\/(bootstrap|vip\\/download|article\\/detail|article\\/(day|discovery|search|list)|series\\/(list|chapters)) url script-response-body " + SCRIPT_URL,
        "# > One 去广告",
        "^https?:\\/\\/.*\\/v2\\.5\\/ad\\/space url reject",
        "",
        "[mitm]",
        "hostname = api.*, *.einhn4.com, *.em1oifd0.com, *.xqjby.com, *.scycjz.com, 38.46.10.*, 202.95.22.*, 198.44.248.*, 122.10.20.249",
        "",
    ])
    Path("one1.conf").write_text(conf, encoding="utf-8")
    print("wrote one1.conf")
    print(conf)

if __name__ == "__main__":
    main()
