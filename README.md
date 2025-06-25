
# 🧾 SCAI SPL Token 转账记录导出脚本

该脚本用于**抓取指定 SPL Token Account 在 Solana 链上过去 96 小时（默认）内的入账转账记录**，并导出为 CSV 文件，便于进行捐赠者统计、排行榜生成等后续处理。

---

## 📦 功能说明

- 连接 Solana 主网（可自定义 RPC）
- 查询指定 Token Account 的最近 1000 条交易记录
- 过滤出指定时间范围内的转账记录（默认 96 小时）
- 解析 `transfer` 和 `transferChecked` 指令
- 提取 memo、发送者、公钥、金额等信息
- 结果导出为 `splt_transfers.csv` 文件

---

## 🚀 快速开始

### 1. 安装依赖

```bash
npm install @solana/web3.js csv-writer
```

### 2. 修改配置项
打开脚本文件，编辑以下内容：

```bash
// 设置 RPC 节点
const connection = new Connection('https://api.mainnet-beta.solana.com', 'confirmed');

// 设置目标 Token Account 地址（接收转账的账户）
const TARGET_TOKEN_ACCOUNT = '你的目标 Token Account 地址';
```

如需修改抓取时间范围（单位为小时）：
```bash
// 当前是抓取过去 96 小时内的交易记录
const fromTime = now - 96 * 3600;
```

### 3. 运行脚本
```bash
node index.js
```