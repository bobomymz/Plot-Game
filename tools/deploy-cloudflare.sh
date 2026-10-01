#!/usr/bin/env bash
# 一键部署《尸潮笔记》到 Cloudflare Pages（生产环境）
#
# 用法：bash tools/deploy-cloudflare.sh
#
# 流程：build-dist.mjs 产出 dist/ → wrangler 上传 → https://shichao-biji.pages.dev
#
# 凭证来源：../apikey.txt（与项目同级，不在仓库内，不会被 git 跟踪）
#   第 2 行   = Cloudflare Account ID
#   第 4 行   = Cloudflare API Token
# 可用环境变量覆盖：CF_KEYFILE（凭证文件路径）、CF_PROJECT（Pages 项目名）
#
# ⚠ 已知坑（2026-10-01 首次部署踩到）：
#   wrangler 依赖的 workerd / esbuild 在 Windows 上可能装不上对应的平台二进制，
#   报错形如 `The package "@esbuild/win32-x64" could not be found`。
#   修复（在装 wrangler 的 node_modules 同级目录执行）：
#     npm i @cloudflare/workerd-windows-64
#     npm i @esbuild/win32-x64@$(node -p "require('esbuild/package.json').version") --no-save
#
# ⚠ 安全：本脚本只从 apikey.txt 读凭证到环境变量，不落盘、不回显、不写入仓库。

set -euo pipefail
cd "$(dirname "$0")/.."

KEYFILE="${CF_KEYFILE:-../apikey.txt}"
PROJECT="${CF_PROJECT:-shichao-biji}"

if [ ! -f "$KEYFILE" ]; then
  echo "✗ 找不到凭证文件：$KEYFILE" >&2
  exit 1
fi

CF_ACCOUNT=$(sed -n '2p' "$KEYFILE" | tr -d '\r\n ')
CF_TOKEN=$(sed -n '4p' "$KEYFILE" | tr -d '\r\n ')

if [ -z "$CF_TOKEN" ] || [ -z "$CF_ACCOUNT" ]; then
  echo "✗ 凭证读取失败（apikey.txt 第 2 / 4 行为空）" >&2
  exit 1
fi

echo "[1/3] 构建 dist/ ..."
node tools/build-dist.mjs

echo "[2/3] 上传到 Cloudflare Pages（项目 $PROJECT）..."
export CLOUDFLARE_API_TOKEN="$CF_TOKEN"
export CLOUDFLARE_ACCOUNT_ID="$CF_ACCOUNT"
export CI=true

# 优先用本地已装的 wrangler（快、离线可用）；否则回落到 npx 临时下载。
if [ -x "node_modules/.bin/wrangler" ]; then
  WRANGLER="node_modules/.bin/wrangler"
elif command -v wrangler >/dev/null 2>&1; then
  WRANGLER="wrangler"
else
  WRANGLER="npx --yes wrangler@4"
fi

$WRANGLER pages deploy dist \
  --project-name="$PROJECT" \
  --branch=main \
  --commit-dirty=true

echo "[3/3] ✓ 部署完成 → https://$PROJECT.pages.dev"
