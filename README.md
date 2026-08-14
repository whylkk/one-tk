# one-tk

定时从 box 拉取 `token_one`，AES 加密后写入 `token.json`，供圈叉脚本通过 raw URL 读取。

## 行为

- 读取已有 `token.json`（AES 密文）→ 解密 → 看 JWT `exp`
- **未过期**（距过期 > 1 小时）→ **不请求 box**，不改文件，不 commit
- **已过期 / 即将过期 / 无 token** → 请求 box → AES 加密写入 → push

## 圈叉 raw 地址

```text
https://raw.githubusercontent.com/whylkk/one-tk/refs/heads/main/token.json
```

内容为 **AES-128-CBC Base64 密文**（不是明文 JSON）。

- Key: `l*bv%Ziq000Biaog`
- IV: `8597506002939249`

## 本地试跑

```bash
node scripts/fetch_box_token.js          # 智能：不过期则跳过
node scripts/fetch_box_token.js --force   # 强制刷新
```

## 手动触发

GitHub → Actions → refresh-one-token → Run workflow  
可勾选 force 强制刷新。

**Settings → Actions → General → Workflow permissions → Read and write**
