# 《尸潮笔记》Cloudflare Pages 部署报告

日期：2026-10-01
执行：WorkBuddy

## 结论

已成功部署到 Cloudflare Pages。

- **正式域名：https://liveamongzombies.cc/**（含 `www.liveamongzombies.cc`）
- Pages 默认域名：https://shichao-biji.pages.dev

725 个文件全部上传并逐一校验通过（HTTP 200，Pages 默认域名与自定义域名各验一遍）。

## 部署信息

| 项 | 值 |
|---|---|
| 正式域名 | https://liveamongzombies.cc |
| Pages 默认域名 | https://shichao-biji.pages.dev |
| 本次部署地址 | https://d63157d3.shichao-biji.pages.dev |
| Pages 项目名 | `shichao-biji` |
| 项目 ID | `581c0bd8-86a2-4eac-abf4-205b635802e1` |
| Account ID | `554ccd0d483ebf003c7fc38082f2f19a` |
| 生产分支 | `main` |
| 部署来源 | GitHub `bobomymz/Plot-Game` @ `67ee0b6`（2026-10-01 21:00） |
| 上传文件数 | 725（3 顶层 + 28 story/*.js + 694 图片） |
| 上传体积 | 约 84 MB |
| 部署耗时 | 上传 24.7 秒，总计约 63 秒 |

## 自定义域名

**https://liveamongzombies.cc/** 已绑定并验证通过（2026-10-01 21:48）。

| 域名 | 状态 | DNS |
|---|---|---|
| `liveamongzombies.cc` | active（证书已签发，CA=Google） | CNAME → `shichao-biji.pages.dev`，已代理 🟠 |
| `www.liveamongzombies.cc` | active（证书已签发） | CNAME → `shichao-biji.pages.dev`，已代理 🟠 |

- Zone `liveamongzombies.cc`（id `9e7bf29206b617515a9cfea94950da46`）此前**没有任何 DNS 记录**，两条 CNAME 是本次新建的
- Pages 未自动创建 DNS 记录（加了自定义域名后 zone 仍是空的），手动补的
- `http://` 自动 301 → `https://`（Pages 层）
- Zone SSL 模式 = `full`，`automatic_https_rewrites` = on，`always_use_https` = off（不影响，Pages 自己会跳）
- **自定义域名下 725 个文件全量校验：全部 HTTP 200，0 异常**

> 目前 `www` 与裸域各自独立返回同一份内容，没有互跳。若要做 SEO 归一，可加一条
> Redirect Rule 把 `www.liveamongzombies.cc/*` 301 到 `liveamongzombies.cc/*`。

## 发布内容

按 `tools/build-dist.mjs` 的两层白名单产出，与 Netlify 完全一致：

- 顶层：`index.html` / `style.css` / `engine.js`
- `story/`：仅 `.js`
- `images/`：仅 `.webp/.png/.jpg/.jpeg/.gif/.svg`

设计文档（`*.md`）、`tools/`、`docs/`、`openspec/`、`.claude/` 均未上线。

## 验证结果

1. **首页**：HTTP 200，4818 字节（与本地 `index.html` 一致）
2. **index.html 引用的 28 个脚本/样式**：全部 HTTP 200
3. **全量 725 个文件**：全部 HTTP 200

> 注：校验时 2 个图片首次出现 `SSL: UNEXPECTED_EOF`（代理网络抖动），单独重试后均返回 200，非文件缺失。

## 维护方式

一键重新部署：

```bash
bash tools/deploy-cloudflare.sh
```

脚本已放在 `tools/deploy-cloudflare.sh`，优先用本地已装的 wrangler，找不到再回落 `npx wrangler@4`。
凭证仍从 `../apikey.txt` 读取，不落盘、不写入仓库。

> **验证边界（重要）**：脚本的每一步都单独验证过——
> `build-dist.mjs` 产出 725 文件 ✓、`wrangler pages deploy` 上传 725/725 ✓、脚本语法 `bash -n` 通过 ✓。
> 但**未在 WorkBuddy 会话内端到端跑通一次**：WorkBuddy 环境的批量删除保护会拦截
> `build-dist.mjs` 开头的 `rmSync(dist)`（一次删 726 个文件 > 50 个阈值）和 `npx` 的临时安装清理。
> 在你自己终端里跑不受此限制。若要我代跑，需先在 WorkBuddy 里授权。

## 已知坑

wrangler 依赖的 `workerd` / `esbuild` 在 Windows 上可能装不上平台二进制，报错形如
`The package "@esbuild/win32-x64" could not be found`。修复见脚本头部注释。

另外 `wrangler pages project create` 对新账户会返回 `code: 8000000` 未知错误，
改用 REST API `POST /accounts/{id}/pages/projects` 可正常创建。

## 自动部署（GitHub Actions）

已提交 `.github/workflows/deploy-cloudflare.yml`（commit `1a29071`，已 push）：

- 触发：push 到 `main`，或 Actions 页面手动触发
- 步骤：checkout → setup-node 22 → `node tools/build-dist.mjs` → `cloudflare/wrangler-action@v3` 上传 dist
- 并发控制：同分支连续推送只保留最新一次

**运行结果**：`Build dist/` ✅ 通过，`Publish to Cloudflare Pages` ❌ 失败——仓库里还没有 Secret。
在配好 Secret 之前，每次 push（AutoPushGame 每小时一次）都会跑一次失败，等于每小时一封失败邮件
（已发生 3 次：`1a29071` / `d4ae198` / `f930405`）。

> 已改为**未配置 Secret 时只构建、不上传、且不判失败**（`if: env.CF_API_TOKEN != ''`），
> 止住失败邮件；配好 Secret 后上传步骤会自动生效，无需再改。
>
> ⚠ **2026-10-09 修正**：最初的修法写成了 `if: secrets.CLOUDFLARE_API_TOKEN != ''`，
> **这是无效的**——GitHub 硬规则「secrets 上下文不能直接出现在 `if:` 中」，
> 导致整个 job 都不创建，报 `.github/workflows/deploy-cloudflare.yml: No jobs were run`。
> 已改为把 secret 先提到 job 级 `env`，再在 `if` 里判断 `env`。详见下节。

**待办：需要你在 GitHub 上加两个 Secret。** 二选一：

- **方案 A（改 PAT 权限，之后我能自动写入）**
  打开 https://github.com/settings/personal-access-tokens → 选当前这个 token →
  Repository permissions 里把 **Secrets** 设为 **Read and write** → 保存。
  改完告诉我，我一条命令写进去。
- **方案 B（手动加，1 分钟）**
  打开 https://github.com/bobomymz/Plot-Game/settings/secrets/actions → New repository secret，加：
  - `CLOUDFLARE_API_TOKEN` = apikey.txt 第 4 行的值
  - `CLOUDFLARE_ACCOUNT_ID` = apikey.txt 第 2 行的值

加完后重新触发一次 workflow 即可验证（Actions → Deploy to Cloudflare Pages → Run workflow）。

## ⚠ 附带发现：GitHub Pages 也在部署

仓库启用了 GitHub Pages，源码 = `main` 分支**根目录**，站点 https://bobomymz.github.io/Plot-Game/

已实测这些文件在该站点上**公开可访问**（HTTP 200）：

- `人物档案.md`、`核心设定.md`、`CLAUDE.md`
- `tools/build-dist.mjs`

原因是 Pages 直接发布根目录，没有白名单——与 Cloudflare 侧「只发 index/style/engine/story/images」的策略正相反。

> 注：仓库本身是 public，这些文件在 github.com 上本来也可见，所以不是新增泄露；
> 但 Pages 站点是更便于浏览的门面。若不想公开，建议把 Pages 源改成 `dist/`（需 Actions 产物，
> 且 `build_type` 要从 legacy 切到 workflow），或直接关掉 Pages。

## 待拍板

1. **GitHub Secret**：见上面方案 A / B（workflow 已就位，只差凭证）。
2. **www 是否 301 到裸域**：目前两个域名各自独立返回内容，未做归一。
3. **GitHub Pages**：是否关掉，或改成只发布 `dist/`。
4. **图片体积**：`images/建平/挹芬楼-1F休息区-没人-*.png` 三张各 5.6～6.2 MB，是 dist 里最大的文件，可转 webp 压缩。
5. **git push 的代理问题**：见最后一节，需要你决定是修代理还是把 remote 永久切 SSH。

---

## 2026-10-09 排查记录：`No jobs were run` 根因与修复

### 现象

Actions 邮件：`[bobomymz/Plot-Game] Run failed: .github/workflows/deploy-cloudflare.yml - main (c82796f)`
邮件正文只有一句 **「No jobs were run」**，没有失败步骤、没有日志。

### 根因（已 100% 确认）

`.github/workflows/deploy-cloudflare.yml` 里用了：

```yaml
- name: 提示：缺少 Secret
  if: ${{ secrets.CLOUDFLARE_API_TOKEN == '' }}      # ❌ 非法
- name: Publish to Cloudflare Pages
  if: ${{ secrets.CLOUDFLARE_API_TOKEN != '' }}      # ❌ 非法
```

GitHub 官方文档原文（Using secrets in GitHub Actions）：

> **"Secrets cannot be directly referenced in `if:` conditionals."**

一旦 `if:` 里直接引用 `secrets`，**整个 job 不会被创建**，workflow 判失败但不产生任何 job，
所以页面只显示 "No jobs were run"。

**三项独立证据：**

1. `GET /actions/runs/37321327950/jobs` → `total_count: 0`（job 一个都没建）
2. 该 workflow 自创建起 **15 次运行、0 次成功**（最早 run `2026-10-02T01:00`，即文件首次提交那一刻）
3. 同上，这 15 次全部发生在 **10-03 改密码之前之后都有**，分布连续

### 与「改 GitHub 密码」无关

- 失败从 `2026-10-02 09:00`（workflow 首次提交 `1a29071`）就开始，早于改密码
- 期间 AutoPushGame 的 push **一直成功**（本地 `push-log.txt` 全绿，10-05 22:00 还正常推上去）
- 失败发生在 GitHub 服务端解析 workflow 阶段，**引擎都不看凭据**，密码跟它没有因果关系

> 唯一与密码沾边的是：改密码后**本机 git push 开始卡死**（见下节），
> 但那是网络/代理问题，且推送依然成功，不会产生这条邮件。

### 修复（已提交 `0850f64` 并推送）

```yaml
jobs:
  deploy:
    runs-on: ubuntu-latest
    permissions:
      contents: read
    env:                                        # ✅ 先提到 job 级 env
      CF_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
      CF_ACCOUNT_ID: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
    steps:
      ...
      - name: 提示：缺少 Secret
        if: ${{ env.CF_API_TOKEN == '' }}       # ✅ if 里只判断 env
      - name: Publish to Cloudflare Pages
        if: ${{ env.CF_API_TOKEN != '' }}
        with:
          apiToken: ${{ env.CF_API_TOKEN }}
          accountId: ${{ env.CF_ACCOUNT_ID }}
```

### 修复验证（10-09 21:06 实测）

| | 修复前 | 修复后 |
|---|---|---|
| run 结论 | `failure` | **`success`** |
| job 数 | **0** | **1** |
| 步骤 | 无 | Setup→Checkout→Node→Build 全过 |

`Build dist/` 步骤 ✅ 通过。但 **`提示：缺少 Secret` 被执行了**，说明
`CLOUDFLARE_API_TOKEN` 仍未配置，`Publish` 步骤被 skip —— 即**构建链路已恢复，云端上传仍未启用**。
这一步就是「待拍板 #1」。

> 副作用提醒：修复前每次 push 都失败，屏蔽邮件是靠坏掉的 `if` 意外达成的；
> 现在 job 能正常跑了，如果 Secret 一直不配，**每次 push 会跑一次全绿但不部署的 workflow**
> —— 不再发失败邮件，但也确实没在部署。要真正上线还是得配 Secret。

### 顺带修好的：git push 卡死

改密码后发现 `git push` 挂起，实测：

| 目标 | 结果 |
|---|---|
| `https://github.com`（经代理 `127.0.0.1:7892`） | **502** `CONNECT tunnel failed` ❌ |
| `https://github.com`（`--noproxy` 直连） | 连接超时 ❌ |
| `https://api.github.com` | **200** ✅ |
| `git@ssh.github.com:443` | **推送成功** ✅ |

即 **HTTPS 走代理挂了，SSH 443 可用**。本次推送改用：

```bash
git -c core.sshCommand="ssh -p 443 -o StrictHostKeyChecking=no" \
    push git@ssh.github.com:bobomymz/Plot-Game.git main
```

⚠ `origin` 的 URL **未改动**（仍是 https）。AutoPushGame 走的是 https，所以
**在代理修好之前，它的 push 会继续失败或挂起**。需要你拍板：修代理，还是把 remote 永久改成 SSH。

### 检查脚本

`tools/ci_health_check.mjs` —— 一条命令复查 workflow 状态、secrets 是否生效、push 连通性。

