// utils/distribute_existing_token_in_one_tx_per_recipient.js
const fs = require('fs');
const path = require('path');
const {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  sendAndConfirmTransaction,
} = require('@solana/web3.js');
const {
  getMint,
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
  createTransferInstruction,
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
} = require('@solana/spl-token');

(async () => {
  // —— 配置区 ——
  const RPC_ENDPOINT = 'url';
  const PAYER_KEYPAIR_PATH = '/Users/wangenkai/.config/solana/id.json';
  const MINT_ADDRESS = '7KTfgLY1DCMfLTbGroQUCLXxo4rTHzVcr2ECg4hW1bmH';
  const JSON_PATH = path.resolve(__dirname, 'scai_donation_google_data.json');
  // ————————

  // 1) 建立连接 & 读取 payer
  const connection = new Connection(RPC_ENDPOINT, 'confirmed');
  const payer = Keypair.fromSecretKey(
    Uint8Array.from(JSON.parse(fs.readFileSync(PAYER_KEYPAIR_PATH, 'utf-8')))
  );

  // 2) 读取 mint decimals
  const mintPubkey = new PublicKey(MINT_ADDRESS);
  const mintInfo = await getMint(connection, mintPubkey);
  const DECIMALS = mintInfo.decimals;
  console.log(`Token decimals = ${DECIMALS}`);
  const scale = BigInt(10) ** BigInt(DECIMALS);

  // 3) 读取 JSON 数据
const records = JSON.parse(fs.readFileSync(JSON_PATH, 'utf-8'));

// 3.1 先统计总 amount
let totalAmount = BigInt(0);
for (const rec of records) {
  const raw = parseFloat(rec.Amount);
  if (isNaN(raw)) {
    console.warn(`⚠️ 跳过无效 Amount: ${rec.Amount}`);
    continue;
  }
  const amount = BigInt(Math.round(raw * Number(scale)));

  // console.log(`💰 数量（最小单位）= ${amount}`);
  totalAmount += amount;
}

console.log(`💰 总数量（最小单位）= ${totalAmount}`);
console.log(`💰 总数量（带小数）= ${Number(totalAmount) / Number(scale)}`);

// 4) 再发放
for (const rec of records) {
  const raw = parseFloat(rec.Amount);
  if (isNaN(raw)) {
    console.warn(`⚠️ 跳过无效 Amount: ${rec.Amount}`);
    continue;
  }
  const amount = BigInt(Math.round(raw * Number(scale)));
  const recipient = new PublicKey(rec.Sender);

  const recipientAta = await getAssociatedTokenAddress(
    mintPubkey,
    recipient,
    false,
    TOKEN_PROGRAM_ID,
    ASSOCIATED_TOKEN_PROGRAM_ID
  );

  const ataInfo = await connection.getAccountInfo(recipientAta);

  const tx = new Transaction();

  if (!ataInfo) {
    tx.add(
      createAssociatedTokenAccountInstruction(
        payer.publicKey,
        recipientAta,
        recipient,
        mintPubkey,
        TOKEN_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID
      )
    );
  }

  tx.add(
    createTransferInstruction(
      await getAssociatedTokenAddress(mintPubkey, payer.publicKey),
      recipientAta,
      payer.publicKey,
      amount,
      [],
      TOKEN_PROGRAM_ID
    )
  );

  const sig = await sendAndConfirmTransaction(connection, tx, [payer], {
    commitment: 'finalized',
  });
  console.log(`✅ ${rec.Amount} → ${rec.Sender} @ ${sig}`);
  await sleep(2000);
}

  console.log('🚀 All done.');
})();

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}