// verify-txs.js
const fs = require('fs');
const path = require('path');
const { Connection, PublicKey } = require('@solana/web3.js');

async function main() {
  // 1. 读取导出的 JSON
  const dataPath = path.resolve(__dirname, './scai_donation_google_data.json');
  const records = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));


  const rpc = " url";
  // 2. 连接到 Solana 主网
  const connection = new Connection(rpc, 'confirmed');

  for (const { TxSignature, Sender } of records) {
    try {
      // 3. 根据签名查询交易
      const tx = await connection.getTransaction(TxSignature, { commitment: 'confirmed' });
      if (!tx) {
        console.error(`❌ ${TxSignature} not found on-chain`);
        continue;
      }

      // 4. 检查交易是否失败
      if (tx.meta && tx.meta.err) {
        console.error(`❌ ${TxSignature} — transaction FAILED, error:`, tx.meta.err);
        continue;
      }

      // 5. 主网交易的 fee payer 通常也是发送者
      const onChainSender = tx.transaction.message.accountKeys[0].toBase58();

      if (onChainSender === Sender) {
        console.log(`✅ ${TxSignature} — sender matches (${Sender})`);
      } else {
        console.warn(`⚠️ ${TxSignature} — sender mismatch! JSON: ${Sender}  ON-CHAIN: ${onChainSender}`);
      }
    } catch (err) {
      console.error(`🚨 Error fetching ${TxSignature}:`, err.message);
    }
  }
}

main().catch(console.error);