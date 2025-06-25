const { Connection, clusterApiUrl, PublicKey } = require('@solana/web3.js');

const connection = new Connection('url', 'confirmed');
const txSignature = 'priv'; // 替换为实际的交易签名

(async () => {
  const tx = await connection.getParsedTransaction(txSignature, {
    maxSupportedTransactionVersion: 0,
  });

  if (!tx) {
    console.log('❌ 交易未找到');
    return;
  }

  // 1. 获取发起人地址
  const signer = tx.transaction.message.accountKeys.find((key) => key.signer)?.pubkey?.toBase58();
  console.log('🧾 发起人地址:', signer);

  // 2. 解析指令
  for (const ix of tx.transaction.message.instructions) {
    // 2.1 解析 Token Program 的 Transfer
    if (ix.program === 'spl-token' && ix.parsed?.type === 'transfer') {
      const info = ix.parsed.info;
      const amount = info.amount;
      const source = info.source;
      const destination = info.destination;
      console.log('💸 转账数量:', Number(amount) / 1e6);
      console.log('📤 来源:', source);
      console.log('📥 接收者:', destination);
    }

    // 2.2 解析 Memo 内容
    if (ix.program === 'spl-memo') {
      console.log('📝 Memo (BSC 地址):', ix.parsed);
    }
  }
})();