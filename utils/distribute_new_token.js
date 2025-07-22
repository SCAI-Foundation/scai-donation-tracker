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
  const RPC_ENDPOINT = 'rpc';
  const PAYER_KEYPAIR_PATH = 'keypair.json';
  const MINT_ADDRESS = '5mRMA7s7VQRnEEnf2NfPpvSTmvZ4vdkZuNamGg7RUovc';
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

  // 4) 对每条记录，打包创建 ATA + 转账 指令到一个 Transaction
  for (const rec of records) {
    const raw = parseFloat(rec.Amount);
    if (isNaN(raw)) {
      console.warn(`⚠️ 跳过无效 Amount: ${rec.Amount}`);
      continue;
    }
    const amount = BigInt(Math.round(raw * Number(scale)));
    const recipient = new PublicKey(rec.Sender);

    // 派生 ATA 地址（不发交易）
    const recipientAta = await getAssociatedTokenAddress(
      mintPubkey,
      recipient,
      false,                // allowOwnerOffCurve
      TOKEN_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID
    );

    // 检查 ATA 是否已存在
    const ataInfo = await connection.getAccountInfo(recipientAta);

    // 新建 Transaction，以 payer 为手续费支付者
    const tx = new Transaction();

    // 如果 ATA 不存在，则先创建它
    if (!ataInfo) {
      tx.add(
        createAssociatedTokenAccountInstruction(
          payer.publicKey,         // payer
          recipientAta,            // ata to create
          recipient,               // owner of the ata
          mintPubkey,              // mint
          TOKEN_PROGRAM_ID,
          ASSOCIATED_TOKEN_PROGRAM_ID
        )
      );
    }

    // 添加转账指令
    tx.add(
      createTransferInstruction(
        /* source      */ await getAssociatedTokenAddress(mintPubkey, payer.publicKey),
        /* destination */ recipientAta,
        /* owner       */ payer.publicKey,
        /* amount      */ amount,
        /* signers     */ [],
        TOKEN_PROGRAM_ID
      )
    );

    // 发送并确认
    const sig = await sendAndConfirmTransaction(connection, tx, [payer], {
      commitment: 'confirmed',
    });
    console.log(`✅ ${rec.Amount} → ${rec.Sender} @ ${sig}`);
  }

  console.log('🚀 All done.');
})();