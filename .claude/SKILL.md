\---

name: lighthouse-score

description: 执行Lighthouse审计，提取页面performance性能分数，返回0-100数字，用于/goal自动化判断

user-invocable: true

allowed-tools: \[Bash, Read, Write]

argumentHint: 可选传入页面URL，不传默认 http://localhost:5173

\---

\## 执行步骤

1\. 获取传入URL参数，无参数则使用默认地址 http://localhost:5173

2\. 执行无头模式Lighthouse命令，输出JSON报告到项目根目录 lh-temp-report.json

bash指令：

lighthouse {{URL}} --output json --output-path lh-temp-report.json --chrome-flags="--headless=new" --quiet

3\. 读取 lh-temp-report.json，提取 `categories.performance.score \* 100`，转为整数分数

4\. 删除临时报告文件 lh-temp-report.json

5\. 仅输出纯数字分数，不附带任何文字，供/goal做数值对比



\## 异常兜底规则

\- 页面无法访问、命令执行失败、报告缺失：固定返回分数 0

