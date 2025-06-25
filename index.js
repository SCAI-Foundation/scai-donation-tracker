const { Connection, PublicKey } = require('@solana/web3.js');
const fs = require('fs');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;

// ✅ 连接 Solana 主网
const connection = new Connection(
  'url',
  'confirmed'
);

// ✅ 设置目标 Token Account 地址
const TARGET_TOKEN_ACCOUNT = 'C5oLn4eK4qT1c25N2tFtmbsFxEPiFtc5RWWKUQkRdgdJ';
const publicKey = new PublicKey(TARGET_TOKEN_ACCOUNT);

// ✅ 获取 48 小时前时间戳
const now = Math.floor(Date.now() / 1000);
const fromTime = now - 96 * 3600;

// ✅ 初始化 CSV 写入器
const csvWriter = createCsvWriter({
  path: 'splt_transfers.csv',
  header: [
    { id: 'time', title: 'Time' },
    { id: 'sender', title: 'Sender' },
    { id: 'amount', title: 'Amount' },
    { id: 'source', title: 'Source' },
    { id: 'destination', title: 'Destination' },
    { id: 'memo', title: 'Memo' },
    { id: 'signature', title: 'Tx Signature' },
  ],
});

(async () => {
  const signatures = await connection.getSignaturesForAddress(publicKey, {
    limit: 1000,
  });

  const recentSigs = signatures.filter(
    (sig) => sig.blockTime && sig.blockTime >= fromTime
  );

  console.log(`📦 找到 ${recentSigs.length} 条最近 48 小时内的交易，正在解析并导出到 CSV...`);

  const records = [];

  for (const sigInfo of recentSigs) {
    const tx = await connection.getParsedTransaction(sigInfo.signature, {
      maxSupportedTransactionVersion: 0,
    });
    console.log(`正在处理交易: ${sigInfo.signature}`);

    if (!tx) continue;


    console.log(`正在处理交易2: ${sigInfo.signature}`);
    const blockTimeReadable = new Date(sigInfo.blockTime * 1000).toLocaleString();
    const signer = tx.transaction.message.accountKeys.find((key) => key.signer)?.pubkey?.toBase58();

    let foundTransfer = false;
    let memo = '';
    let amount = null;
    let source = null;
    let destination = null;

    for (const ix of tx.transaction.message.instructions) {
        // console.log(`正在处理交易3: ${sigInfo.signature}`);
        if (
            ix.program === 'spl-token' &&
            ix.parsed?.type === 'transfer' &&
            ix.parsed.info?.destination === TARGET_TOKEN_ACCOUNT
          ) {
            foundTransfer = true;
            // console.log('🟡 transferChecked info:', ix.parsed.info);
            amount = Number(ix.parsed.info.amount) / 1e6;
            source = ix.parsed.info.source;
            destination = ix.parsed.info.destination;
          }
          
          if (
            ix.program === 'spl-token' &&
            ix.parsed?.type === 'transferChecked' &&
            ix.parsed.info?.destination === TARGET_TOKEN_ACCOUNT
          ) {
            foundTransfer = true;
            // console.log('🟡 transferChecked info:', ix.parsed.info);
            amount = Number(ix.parsed.info.tokenAmount.amount) / 1e6;
            source = ix.parsed.info.source;
            destination = ix.parsed.info.destination;
          }

      if (ix.program === 'spl-memo') {
        memo = typeof ix.parsed === 'string'
          ? ix.parsed
          : JSON.stringify(ix.parsed ?? '');
      }
    }


    if (foundTransfer) {
       
      records.push({
        time: blockTimeReadable,
        sender: signer,
        amount,
        source,
        destination,
        memo,
        signature: sigInfo.signature,
      });
    }else{
        console.log(`正在处理交易4: ${sigInfo.signature}`);
    }
  }

  await csvWriter.writeRecords(records);
  console.log(`✅ 已成功导出 ${records.length} 条记录到 splt_transfers.csv`);
})();