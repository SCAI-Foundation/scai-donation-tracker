// check-token-circulation.js
const { Connection, PublicKey } = require('@solana/web3.js');
const { getMint } = require('@solana/spl-token');

function formatAmount(rawBigInt, decimals) {
  const s = rawBigInt.toString();
  if (decimals === 0) return s;
  const pad = decimals - Math.max(0, s.length - decimals);
  const intPart = s.length > decimals ? s.slice(0, s.length - decimals) : '0';
  const fracPart = (pad > 0 ? '0'.repeat(pad) : '') + s.slice(Math.max(0, s.length - decimals));
  return `${intPart}.${fracPart}`.replace(/\.?0+$/, '');
}

(async () => {
  // 固定配置
  const RPC_URL = 'https://api.mainnet-beta.solana.com'; 
  const MINT_ADDRESS = '7KTfgLY1DCMfLTbGroQUCLXxo4rTHzVcr2ECg4hW1bmH';
  const OWNER_ADDRESS = '7urVGPCw43dpZgWJUvp2SuXZuAm3tt5iDGxNBK6tC1fx';

  const connection = new Connection(RPC_URL, 'confirmed');
  const mintPk = new PublicKey(MINT_ADDRESS);
  const ownerPk = new PublicKey(OWNER_ADDRESS);

  // 1) 获取 mint 信息
  const mintInfo = await getMint(connection, mintPk);
  const decimals = mintInfo.decimals;
  const totalSupply = BigInt(mintInfo.supply.toString());

  // 2) 获取 owner 的所有 token account
  const resp = await connection.getParsedTokenAccountsByOwner(ownerPk, { mint: mintPk });
  let locked = BigInt(0);
  for (const { account } of resp.value) {
    const amt = BigInt(account.data.parsed.info.tokenAmount.amount);
    locked += amt;
  }

  // 3) 流通量
  const circulating = totalSupply - locked;

  // 4) 输出
  console.log('--- SPL Token Snapshot ---');
  console.log('Mint:', mintPk.toBase58());
  console.log('Owner:', ownerPk.toBase58());
  console.log(`Decimals: ${decimals}`);
  console.log(`锁仓数量 (at owner): ${formatAmount(locked, decimals)} (${locked} raw)`);
  console.log(`流通数量 (total - owner): ${formatAmount(circulating, decimals)} (${circulating} raw)`);
  console.log(`代币总量 (total supply): ${formatAmount(totalSupply, decimals)} (${totalSupply} raw)`);
})().catch((e) => {
  console.error('Error:', e.message);
});