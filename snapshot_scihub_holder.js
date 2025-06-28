const { Connection, PublicKey } = require('@solana/web3.js');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;
const { TOKEN_PROGRAM_ID } = require('@solana/spl-token');
const fs = require('fs');

const connection = new Connection(
  'url',
  'confirmed'
);

const TOKEN_MINT = new PublicKey('GxdTh6udNstGmLLk9ztBb6bkrms7oLbrJp5yzUaVpump');
const TARGET_DATE = '2025-06-21';
const CSV_PATH = 'snapshot_token_balances.csv';

// CSV writer
const csvWriter = createCsvWriter({
  path: CSV_PATH,
  header: [
    { id: 'account', title: 'Token Account' },
    { id: 'balance', title: 'Balance' },
    { id: 'signature', title: 'Last Tx Signature' },
    { id: 'time', title: 'Last Tx Time' },
  ],
  append: fs.existsSync(CSV_PATH),
});

// 获取目标日期的 UTC 时间戳（当天 23:59:59）
function getTargetTimestamp(dateStr) {
  return Math.floor(new Date(`${dateStr}T23:59:59Z`).getTime() / 1000);
}

// 加载已处理过的账户地址
function loadHandledAccounts(path) {
  const set = new Set();
  if (!fs.existsSync(path)) return set;
  const lines = fs.readFileSync(path, 'utf-8').split('\n');
  for (const line of lines.slice(1)) {
    const account = line.split(',')[0]?.trim();
    if (account) set.add(account);
  }
  return set;
}

(async () => {
  const targetTimestamp = getTargetTimestamp(TARGET_DATE);
  const handledAccounts = loadHandledAccounts(CSV_PATH);

  console.log(`📥 加载所有属于 Token Mint ${TOKEN_MINT.toBase58()} 的账户...`);
  const allAccountsRaw = await connection.getProgramAccounts(TOKEN_PROGRAM_ID, {
    filters: [
      { dataSize: 165 },
      {
        memcmp: {
          offset: 0,
          bytes: TOKEN_MINT.toBase58(),
        },
      },
    ],
  });
  const allAccounts = allAccountsRaw.map(acc => acc.pubkey);
  console.log(`✅ 共找到 ${allAccounts.length} 个 Token Accounts`);

  for (let i = 0; i < allAccounts.length; i++) {
    const accountPubKey = allAccounts[i];
    const accountStr = accountPubKey.toBase58();

    if (handledAccounts.has(accountStr)) {
      console.log(`⏭️ 已处理过 ${accountStr}，跳过`);
      continue;
    }

    console.log(`\n🔍 正在处理第 ${i + 1}/${allAccounts.length} 个账户：${accountStr}`);
    let balanceNum = 0;
    let record = {
      account: accountStr,
      balance: '0',
      signature: '',
      time: '',
    };

    try {
      const signatures = await connection.getSignaturesForAddress(accountPubKey, { limit: 1000 });
      const filtered = signatures
        .filter(sig => sig.blockTime && sig.blockTime <= targetTimestamp)
        .sort((a, b) => b.blockTime - a.blockTime);

      if (filtered.length === 0) {
        console.log('⚠️ 无历史交易记录，写入默认余额 0');
      } else {
        const lastSig = filtered[0];
        console.log(`📄 最后一笔交易：${lastSig.signature} 时间：${new Date(lastSig.blockTime * 1000).toLocaleString()}`);

        const parsedTx = await connection.getParsedTransaction(lastSig.signature, {
          maxSupportedTransactionVersion: 0,
        });

        if (parsedTx?.meta?.postTokenBalances) {
          const accountKeys = parsedTx.transaction.message.accountKeys;
          const postBalance = parsedTx.meta.postTokenBalances.find((entry) => {
            const pubkey = accountKeys[entry.accountIndex].pubkey.toBase58();
            return pubkey === accountStr;
          });

          if (postBalance) {
            const rawAmount = postBalance.uiTokenAmount.uiAmount;
            balanceNum = parseFloat(rawAmount);
            if (rawAmount && !isNaN(balanceNum)) {
              record.balance = postBalance.uiTokenAmount.uiAmountString;
              record.signature = lastSig.signature;
              record.time = new Date(lastSig.blockTime * 1000).toISOString();
              console.log(`✅ 快照余额为：${balanceNum}`);
            } else {
              console.log(`🚫 非法余额：${rawAmount}`);
            }
          } else {
            console.log('⚠️ 未找到该账户在交易中的 postTokenBalance');
          }
        } else {
          console.log('❌ 该交易无 postTokenBalances，跳过写入');
        }
      }
    } catch (err) {
      console.log(`❌ 处理失败：${err.message}`);
    }

    await csvWriter.writeRecords([record]);
    handledAccounts.add(accountStr);
  }

  console.log(`\n✅ 所有处理完成，结果写入 ${CSV_PATH}`);
})();