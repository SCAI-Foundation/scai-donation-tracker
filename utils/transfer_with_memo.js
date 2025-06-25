require('dotenv').config();
const fs = require('fs');
const {
  Connection,
  clusterApiUrl,
  PublicKey,
  Transaction,
  sendAndConfirmTransaction,
  TransactionInstruction,
  Keypair,
} = require('@solana/web3.js');
const {
  getOrCreateAssociatedTokenAccount,
  createTransferInstruction,
} = require('@solana/spl-token');
const { MEMO_PROGRAM_ID } = require('@solana/spl-memo');

// ========= 配置参数 =========
const RPC_URL = clusterApiUrl('devnet');
const TOKEN_MINT = 'A22hchYQ2Eiwe7k57ALGmDwN4oJYzn11oadKiuALaNZs'; // devnet USDC 示例
const RECEIVER = '7dEiDwc8xzTnpbwxBjTbiLYBQ6PsVMPEkvXXttMB4ERy';
const AMOUNT = 1 * 1e6; // 如果 decimals 是 6 位，则表示 1 个 token
const BSC_ADDRESS = '0x1234abcd5678ef901234567890abcdef12345678'; // 要附带的 BSC 地址
// ===========================

const connection = new Connection(RPC_URL, 'confirmed');

function loadWallet(path = '/Users/keienwang/.config/solana/id.json') {
  const secretKey = JSON.parse(fs.readFileSync(path));
  return Keypair.fromSecretKey(Uint8Array.from(secretKey));
}

(async () => {
  const sender = loadWallet();
  const mint = new PublicKey(TOKEN_MINT);
  const receiver = new PublicKey(RECEIVER);

  const fromTokenAccount = await getOrCreateAssociatedTokenAccount(
    connection,
    sender,
    mint,
    sender.publicKey
  );

  const toTokenAccount = await getOrCreateAssociatedTokenAccount(
    connection,
    sender,
    mint,
    receiver
  );

  const transferIx = createTransferInstruction(
    fromTokenAccount.address,
    toTokenAccount.address,
    sender.publicKey,
    AMOUNT
  );

  const memoIx = new TransactionInstruction({
    keys: [],
    programId: MEMO_PROGRAM_ID,
    data: Buffer.from(BSC_ADDRESS),
  });

  const tx = new Transaction().add(transferIx, memoIx);

  const sig = await sendAndConfirmTransaction(connection, tx, [sender]);
  console.log('✅ 交易成功，签名:', sig);
})();