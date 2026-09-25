#!/usr/bin/env python3
from pathlib import Path
import urllib.request

BASE_URL = (
    "https://cdn.jsdelivr.net/gh/whylkk/one-tk@"
    "0679e78c8fe53a3a76e88824d3f5d8cae320b4f8/one1.js"
)

HEADER = r'''/******************************

脚本功能：One App · 列表已购 / 详情真链 / VIP / 去广告
下载地址：App Store · One
脚本作者：whylkk
更新时间：2026+
电报频道：https://t.me/GieGie777
问题反馈：
使用声明：⚠️此脚本仅供学习与交流，请在下载使用24小时内删除！请勿在中国大陆转载与贩卖！⚠️⚠️⚠️

*******************************

[rewrite_local]
# > One · bootstrap VIP
^https?://[^/]+/v2\.5/bootstrap url script-response-body https://raw.githubusercontent.com/whylkk/one-tk/main/one1.js
# > One · vip download
^https?://[^/]+/v2\.5/vip/download url script-response-body https://raw.githubusercontent.com/whylkk/one-tk/main/one1.js
# > One · article detail 真链
^https?://[^/]+/v2\.5/article/detail url script-response-body https://raw.githubusercontent.com/whylkk/one-tk/main/one1.js
# > One · 列表已购
^https?://[^/]+/v2\.5/article/(day|discovery|search|list) url script-response-body https://raw.githubusercontent.com/whylkk/one-tk/main/one1.js
# > One · 系列已购
^https?://[^/]+/v2\.5/series/(list|chapters) url script-response-body https://raw.githubusercontent.com/whylkk/one-tk/main/one1.js
# > One · 去广告
^https://.*/v2\.5/ad/space url reject

[mitm]
hostname = api.*, *.einhn4.com, *.em1oifd0.com, *.xqjby.com, *.scycjz.com, 38.46.10.*, 202.95.22.*, 198.44.248.*, 122.10.20.249

*******************************
*/

'''

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
    out = HEADER + body
    Path("one1.js").write_text(out, encoding="utf-8")
    print("wrote one1.js", len(out))

if __name__ == "__main__":
    main()
