#!/usr/bin/env node
/**
 * CI 健康检查 —— 《尸潮笔记》GitHub Actions / push 连通性
 *
 * 复现 2026-10-09 「No jobs were run」排查链路，一条命令跑完：
 *   1. workflow 文件里是否有非法的 `if: ... secrets....` 写法
 *   2. 最近 N 次 deploy workflow 的结论分布（靠 api.github.com，直连可达）
 *   3. job 是否真的被创建（total_count === 0 就是「No jobs were run」）
 *   4. Secret 是否配置（看「提示：缺少 Secret」步骤是否被执行）
 *   5. github.com / api.github.com / ssh.github.com 连通性
 *
 * 只用 node 内置模块，无需 npm install。
 *   node tools/ci_health_check.mjs
 *   node tools/ci_health_check.mjs --repo bobomymz/Plot-Game --runs 15
 */

import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const WF = join(ROOT, '.github/workflows/deploy-cloudflare.yml');

function arg(name, dflt) {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : dflt;
}
const REPO = arg('repo', 'bobomymz/Plot-Game');
const RUN_LIMIT = Number(arg('runs', '15'));

const results = [];
function ok(msg) { results.push(['PASS', msg]); console.log(`  PASS  ${msg}`); }
function bad(msg) { results.push(['FAIL', msg]); console.log(`  FAIL  ${msg}`); }
function warn(msg) { results.push(['WARN', msg]); console.log(`  WARN  ${msg}`); }
function info(msg) { console.log(`        ${msg}`); }
function head(t) { console.log(`\n=== ${t} ===`); }

async function getJSON(url) {
  const res = await fetch(url, {
    headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'shichao-ci-health' },
    signal: AbortSignal.timeout(25000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

// ── 1. 静态检查：secrets 不能出现在 if: 里 ──────────────────────────
head('1. workflow 静态检查');
if (!existsSync(WF)) {
  bad(`workflow 文件不存在：${WF}`);
} else {
  const src = readFileSync(WF, 'utf8');
  const lines = src.split(/\r?\n/);
  const offenders = [];
  lines.forEach((line, i) => {
    // 只看 if: 行（允许前面的空白与 "- name" 无关）
    const m = line.match(/^\s*if\s*:/);
    if (!m) return;
    if (/secrets\./.test(line)) offenders.push({ n: i + 1, line: line.trim() });
  });
  if (offenders.length) {
    bad(`发现 ${offenders.length} 处非法用法：if 条件里直接引用 secrets（GitHub 会拒绝创建 job）`);
    offenders.forEach((o) => info(`L${o.n}  ${o.line}`));
    info('修法：把 secret 提到 job 级 env，再在 if 里判断 env.XXX');
  } else {
    ok('if: 条件里没有直接引用 secrets');
  }
  const hasJobEnv = /^\s{4}env\s*:/m.test(src) && /secrets\.CLOUDFLARE_API_TOKEN/.test(src);
  info(hasJobEnv ? '已使用 job 级 env 承接 secret' : '注意：未检测到 job 级 env 写法');
}

// ── 2~4. 查 Actions 运行 ────────────────────────────────────────────
head('2. Actions 运行结论（api.github.com）');
let runs = [];
try {
  const d = await getJSON(
    `https://api.github.com/repos/${REPO}/actions/runs?per_page=${RUN_LIMIT}`
  );
  runs = d.workflow_runs.filter((r) => /deploy-cloudflare|Deploy to Cloudflare/i.test(r.name));
  if (!runs.length) {
    warn('最近没有 deploy workflow 的运行记录');
  } else {
    const tally = {};
    runs.forEach((r) => { tally[r.conclusion || r.status] = (tally[r.conclusion || r.status] || 0) + 1; });
    info(`最近 ${runs.length} 次：${Object.entries(tally).map(([k, v]) => `${k}=${v}`).join('  ')}`);
    runs.slice(0, 5).forEach((r) =>
      info(`${r.created_at}  ${r.head_sha.slice(0, 7)}  ${r.status}/${r.conclusion}`)
    );
    const latest = runs[0];
    if (latest.conclusion === 'success') ok(`最新一次运行成功（${latest.head_sha.slice(0, 7)}）`);
    else if (latest.conclusion === 'failure') bad(`最新一次运行失败（${latest.head_sha.slice(0, 7)}）`);
    else warn(`最新一次尚未结束：${latest.status}`);
  }
} catch (e) {
  warn(`无法获取运行列表：${e.message}（api.github.com 不可达？）`);
}

// ── 3+4. 最新 run 的 job / 步骤 ─────────────────────────────────────
if (runs.length) {
  const latest = runs[0];
  head(`3. 最新 run 的 job 详情（run ${latest.id}）`);
  try {
    const jd = await getJSON(
      `https://api.github.com/repos/${REPO}/actions/runs/${latest.id}/jobs`
    );
    if (jd.total_count === 0) {
      bad('total_count = 0 —— job 根本没被创建，即「No jobs were run」（通常是 workflow 语法/if 非法）');
    } else {
      ok(`job 已创建：${jd.total_count} 个`);
      const steps = jd.jobs[0]?.steps || [];
      steps.forEach((s) => info(`${String(s.number).padStart(2)} ${s.name} -> ${s.conclusion}`));
      head('4. Secret 配置探测');
      const skipStep = steps.find((s) => /缺少 Secret|跳过部署/.test(s.name));
      const pubStep = steps.find((s) => /Publish to Cloudflare|wrangler/i.test(s.name));
      if (skipStep && skipStep.conclusion === 'success') {
        warn('「提示：缺少 Secret」被执行 → CLOUDFLARE_API_TOKEN 尚未配置，部署步骤会被跳过');
        info('配置入口：https://github.com/' + REPO + '/settings/secrets/actions');
      } else if (pubStep && pubStep.conclusion === 'success') {
        ok('上传步骤已执行 → Secret 已配置且部署成功');
      } else if (pubStep && pubStep.conclusion === 'failure') {
        bad('上传步骤失败 —— 检查 Secret 值 / Cloudflare 侧权限');
      } else {
        info('未能从步骤名判定 Secret 状态');
      }
    }
  } catch (e) {
    warn(`无法获取 job 详情：${e.message}`);
  }
}

// ── 5. 连通性 ──────────────────────────────────────────────────────
head('5. 网络连通性');
async function probe(label, url, useProxy) {
  // 用 node 原生 fetch：Windows 下 curl 的 -o NUL/输出捕获不稳，且自带代理处理
  // 注意：不显式设 agent 时 node 不读 curl 的 http.proxy，故「经代理」一档用 curl 兜底
  if (useProxy) {
    try {
      const { stdout } = await execFileAsync(
        'curl',
        ['-sS', '--max-time', '12', '-o', process.platform === 'win32' ? 'NUL' : '/dev/null',
         '-w', '%{http_code}', url],
        { timeout: 20000 }
      );
      const code = (stdout || '').trim();
      return code === '200' ? `${label}: 200 OK` : `${label}: HTTP ${code || '(空)'}`;
    } catch (e) {
      const m = String(e.stderr || e.message || '').split('\n')[0].replace(/^curl:\s*/, '').slice(0, 80);
      return `${label}: FAILED ${m}`;
    }
  }
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(12000) });
    return `${label}: HTTP ${res.status}`;
  } catch (e) {
    return `${label}: FAILED ${String(e.cause?.code || e.message).slice(0, 80)}`;
  }
}

const probes = await Promise.all([
  probe('github.com (经代理)', 'https://github.com', true),
  probe('github.com (直连)', 'https://github.com', false),
  probe('api.github.com', 'https://api.github.com', true),
]);
probes.forEach(info);
if (probes[2].includes('200')) ok('api.github.com 可达（API 查询不受影响）');
else bad('api.github.com 不可达 —— Actions 状态无法查询');
if (probes[0].includes('200') || probes[1].includes('200')) {
  ok('github.com 至少一条路可用，git push 正常');
} else {
  bad('github.com 两条路都不通 → git push 会卡死；绕过方案：git push git@ssh.github.com:<repo>.git（走 443）');
}

// ── 汇总 ────────────────────────────────────────────────────────────
const fail = results.filter((r) => r[0] === 'FAIL').length;
const warnN = results.filter((r) => r[0] === 'WARN').length;
console.log(`\n${'='.repeat(50)}`);
console.log(`汇总：${results.length - fail - warnN} PASS / ${warnN} WARN / ${fail} FAIL`);
process.exit(fail ? 1 : 0);
