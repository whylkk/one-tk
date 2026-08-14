# one-token

定时从 box 拉取 `token_one`，供圈叉脚本通过 raw URL 读取。

## 行为

- 读取已有 `token.json` 中 JWT 的 `exp`
- **未过期**（距过期仍大于 `REFRESH_SKEW_SEC`，默认 3600 秒）→ **不请求 box**，不改文件，不 commit
- **已过期 / 即将过期 / 无 token** → 请求 box，更新 `token.json` 并 push

## 本地试跑

```bash
node scripts/fetch_box_token.js          # 智能：不过期则跳过
node scripts/fetch_box_token.js --force   # 强制刷新
```

## 圈叉 raw 地址

```text
https://raw.githubusercontent.com/<用户名>/<仓库名>/main/token.json
```

## 手动触发

GitHub → Actions → refresh-one-token → Run workflow  
可勾选 force 强制刷新。
