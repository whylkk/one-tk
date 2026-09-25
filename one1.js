/*
软件版本：
下载地址：
脚本作者：
更新时间：2026+
电报频道：https://t.me/GieGie777
问题反馈：
使用声明：⚠️此脚本仅供学习与交流，请在下载使用24小时内删除！请勿在中国大陆转载与贩卖！⚠️⚠️⚠️
*******************************
[rewrite_local]
# > One bootstrap VIP / 列表已购 / 详情已购 / 下载额度
^https?://[^/]+/v2\.5/bootstrap url script-response-body https://raw.githubusercontent.com/whylkk/one-tk/main/one1.js
^https?://[^/]+/v2\.5/vip/download url script-response-body https://raw.githubusercontent.com/whylkk/one-tk/main/one1.js
^https?://[^/]+/v2\.5/article/detail url script-response-body https://raw.githubusercontent.com/whylkk/one-tk/main/one1.js
^https?://[^/]+/v2\.5/article/(day|discovery|search|list) url script-response-body https://raw.githubusercontent.com/whylkk/one-tk/main/one1.js
^https?://[^/]+/v2\.5/series/(list|chapters) url script-response-body https://raw.githubusercontent.com/whylkk/one-tk/main/one1.js
^https://.*/v2\.5/ad/space url reject

[mitm]
hostname = api.*, *.einhn4.com, *.em1oifd0.com, *.xqjby.com, *.scycjz.com, 38.46.10.*, 202.95.22.*, 198.44.248.*, 122.10.20.249
*/

let body = $response.body;
if (!body) { $done({}); }

try {
  // VIP / 会员相关
  body = body.replace(/"vip_level"\s*:\s*\d+/g, '"vip_level":9');
  body = body.replace(/"vip_status"\s*:\s*\d+/g, '"vip_status":1');
  body = body.replace(/"permanent_vip"\s*:\s*\d+/g, '"permanent_vip":1');
  body = body.replace(/"vip_expiry"\s*:\s*"[^"]*"/g, '"vip_expiry":"2099-12-31"');
  body = body.replace(/"skip_ad"\s*:\s*\d+/g, '"skip_ad":1');
  body = body.replace(/"is_vip"\s*:\s*(false|0)/g, '"is_vip":true');
  body = body.replace(/"member"\s*:\s*(false|0)/g, '"member":true');
  body = body.replace(/"memberStatus"\s*:\s*\d+/g, '"memberStatus":1');

  // 已购 / 解锁
  body = body.replace(/"is_buy"\s*:\s*(false|0)/g, '"is_buy":1');
  body = body.replace(/"is_bought"\s*:\s*(false|0)/g, '"is_bought":1');
  body = body.replace(/"purchased"\s*:\s*(false|0)/g, '"purchased":1');
  body = body.replace(/"is_purchase"\s*:\s*(false|0)/g, '"is_purchase":1');
  body = body.replace(/"is_purchased"\s*:\s*(false|0)/g, '"is_purchased":1');
  body = body.replace(/"has_buy"\s*:\s*(false|0)/g, '"has_buy":1');
  body = body.replace(/"has_bought"\s*:\s*(false|0)/g, '"has_bought":1');
  body = body.replace(/"is_paid"\s*:\s*(false|0)/g, '"is_paid":1');
  body = body.replace(/"paid"\s*:\s*(false|0)/g, '"paid":1');
  body = body.replace(/"is_unlock"\s*:\s*(false|0)/g, '"is_unlock":1');
  body = body.replace(/"unlocked"\s*:\s*(false|0)/g, '"unlocked":1');
  body = body.replace(/"is_unlocked"\s*:\s*(false|0)/g, '"is_unlocked":1');
  body = body.replace(/"is_own"\s*:\s*(false|0)/g, '"is_own":1');
  body = body.replace(/"owned"\s*:\s*(false|0)/g, '"owned":1');
  body = body.replace(/"is_free"\s*:\s*(false|0)/g, '"is_free":1');
  body = body.replace(/"can_play"\s*:\s*(false|0)/g, '"can_play":1');
  body = body.replace(/"can_watch"\s*:\s*(false|0)/g, '"can_watch":1');
  body = body.replace(/"hasPaid"\s*:\s*\w+/g, '"hasPaid":true');

  // 锁定相关关掉
  body = body.replace(/"need_buy"\s*:\s*(true|1)/g, '"need_buy":0');
  body = body.replace(/"need_purchase"\s*:\s*(true|1)/g, '"need_purchase":0');
  body = body.replace(/"need_pay"\s*:\s*(true|1)/g, '"need_pay":0');
  body = body.replace(/"is_lock"\s*:\s*(true|1)/g, '"is_lock":0');
  body = body.replace(/"locked"\s*:\s*(true|1)/g, '"locked":0');
  body = body.replace(/"is_locked"\s*:\s*(true|1)/g, '"is_locked":0');
  body = body.replace(/"preview"\s*:\s*\w+/g, '"preview":false');

  // 下载额度
  body = body.replace(/"limit"\s*:\s*\d+/g, '"limit":9999');
  body = body.replace(/"use"\s*:\s*\d+/g, '"use":0');
  body = body.replace(/"last"\s*:\s*\d+/g, '"last":9999');
  body = body.replace(/"downLoadAll"\s*:\s*\w+/g, '"downLoadAll":true');

  // 通用状态
  body = body.replace(/"errorCode"\s*:\s*\d+/g, '"errorCode":0');
  body = body.replace(/"limitFree"\s*:\s*\w+/g, '"limitFree":true');
  body = body.replace(/"limitCount"\s*:\s*\d+/g, '"limitCount":0');
} catch (e) {}

$done({ body });
