// Script para transferir 7% do supply para a wallet de fomento
// 7% = 3.626.000.000 tokens (para criadores de conteudo, parceiros, etc)

import 'dotenv/config';
import {
  Connection,
  Keypair,
  PublicKey,
  clusterApiUrl,
} from '@solana/web3.js';
import {
  getOrCreateAssociatedTokenAccount,
  transfer,
  getAccount,
} from '@solana/spl-token';
import fs from 'fs';

const DECIMALS = 6;
const FOMENTO_PERCENTAGE = 7n;
const TOTAL_SUPPLY = 51_800_000_000n;
const FOMENTO_SUPPLY = (TOTAL_SUPPLY * FOMENTO_PERCENTAGE) / 100n; // 3.626.000.000
const RAW_FOMENTO = FOMENTO_SUPPLY * (10n ** BigInt(DECIMALS));

async function main() {
  console.log('=== PELELECA ($PP) - Transferir Supply de Fomento (7%) ===\n');

  if (!fs.existsSync('deployment-info.json')) {
    console.error('ERRO: deployment-info.json nao encontrado.');
    process.exit(1);
  }
  const deployInfo = JSON.parse(fs.readFileSync('deployment-info.json', 'utf-8'));

  const rpcUrl = process.env.SOLANA_RPC_URL || clusterApiUrl('devnet');
  const connection = new Connection(rpcUrl, 'confirmed');

  const keypairPath = process.env.SOLANA_KEYPAIR_PATH;
  const keypairData = JSON.parse(fs.readFileSync(keypairPath, 'utf-8'));
  const deployer = Keypair.fromSecretKey(Uint8Array.from(keypairData));

  const mintAddress = new PublicKey(deployInfo.mintAddress);

  // Wallet de fomento
  const fomentoWalletAddress = process.env.FOMENTO_WALLET_ADDRESS;
  if (!fomentoWalletAddress) {
    console.error('ERRO: Defina FOMENTO_WALLET_ADDRESS no .env');
    process.exit(1);
  }
  const fomentoWallet = new PublicKey(fomentoWalletAddress);

  console.log(`Mint: ${mintAddress.toBase58()}`);
  console.log(`Wallet de fomento: ${fomentoWallet.toBase58()}`);
  console.log(`Tokens a transferir: ${FOMENTO_SUPPLY.toLocaleString()} PP (7%)\n`);

  // Criar ATA da wallet de fomento
  console.log('Criando/obtendo Token Account da wallet de fomento...');
  const fomentoTokenAccount = await getOrCreateAssociatedTokenAccount(
    connection,
    deployer,
    mintAddress,
    fomentoWallet,
  );

  // Transferir
  if (fomentoWallet.toBase58() !== deployer.publicKey.toBase58()) {
    const deployerTokenAccount = new PublicKey(deployInfo.deployerTokenAccount);

    console.log('Transferindo tokens...');
    const tx = await transfer(
      connection,
      deployer,
      deployerTokenAccount,
      fomentoTokenAccount.address,
      deployer,
      RAW_FOMENTO,
    );
    console.log(`TX: ${tx}`);
  } else {
    console.log('Wallet de fomento e a mesma do deployer.');
    console.log('Os 7% serao separados na mesma wallet.');
  }

  // Verificar saldo
  const accountInfo = await getAccount(connection, fomentoTokenAccount.address);
  const balance = BigInt(accountInfo.amount) / (10n ** BigInt(DECIMALS));
  console.log(`\nSaldo da wallet de fomento: ${balance.toLocaleString()} PP`);

  // Atualizar deployment info
  deployInfo.fomentoWallet = fomentoWallet.toBase58();
  deployInfo.fomentoTokenAccount = fomentoTokenAccount.address.toBase58();
  deployInfo.fomentoSupply = FOMENTO_SUPPLY.toString();
  deployInfo.fomentoTransferredAt = new Date().toISOString();
  fs.writeFileSync('deployment-info.json', JSON.stringify(deployInfo, null, 2));

  console.log('\n=== Supply de fomento separado com sucesso! ===');
  console.log(`${FOMENTO_SUPPLY.toLocaleString()} PP (7%) para criadores e parceiros`);
  console.log('\nProximo passo: npm run create-pool');
}

main().catch((err) => {
  console.error('ERRO:', err);
  process.exit(1);
});
