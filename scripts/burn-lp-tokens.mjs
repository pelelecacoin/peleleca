// Script para queimar LP tokens - torna a liquidez PERMANENTE e irremovivel
// Apos execucao, e impossivel fazer rug pull

import 'dotenv/config';
import {
  Connection,
  Keypair,
  PublicKey,
  clusterApiUrl,
} from '@solana/web3.js';
import {
  getOrCreateAssociatedTokenAccount,
  getAccount,
  burn,
} from '@solana/spl-token';
import fs from 'fs';

async function main() {
  console.log('=== PELELECA ($PP) - Queimar LP Tokens ===\n');
  console.log('ATENCAO: Essa operacao e IRREVERSIVEL!');
  console.log('Apos a queima, a liquidez do pool sera PERMANENTE.\n');

  if (!fs.existsSync('deployment-info.json')) {
    console.error('ERRO: deployment-info.json nao encontrado.');
    process.exit(1);
  }
  const deployInfo = JSON.parse(fs.readFileSync('deployment-info.json', 'utf-8'));

  if (!deployInfo.lpMint) {
    console.error('ERRO: LP Mint nao encontrado no deployment-info.json.');
    console.error('Execute create-raydium-pool primeiro.');
    process.exit(1);
  }

  const rpcUrl = process.env.SOLANA_RPC_URL || clusterApiUrl('devnet');
  const connection = new Connection(rpcUrl, 'confirmed');

  const keypairPath = process.env.SOLANA_KEYPAIR_PATH;
  const keypairData = JSON.parse(fs.readFileSync(keypairPath, 'utf-8'));
  const deployer = Keypair.fromSecretKey(Uint8Array.from(keypairData));

  const lpMint = new PublicKey(deployInfo.lpMint);

  // Obter ATA de LP do deployer
  console.log('Buscando LP tokens...');
  const lpTokenAccount = await getOrCreateAssociatedTokenAccount(
    connection,
    deployer,
    lpMint,
    deployer.publicKey,
  );

  const lpAccountInfo = await getAccount(connection, lpTokenAccount.address);
  const lpBalance = lpAccountInfo.amount;

  if (lpBalance === 0n) {
    console.log('Nenhum LP token encontrado. Ja foram queimados?');
    process.exit(0);
  }

  console.log(`LP tokens encontrados: ${lpBalance.toString()}`);
  console.log('Queimando LP tokens...\n');

  // Queimar todos os LP tokens
  const tx = await burn(
    connection,
    deployer,
    lpTokenAccount.address,
    lpMint,
    deployer,
    lpBalance,
  );

  console.log(`TX de queima: ${tx}`);

  // Verificar que saldo e zero
  const updatedAccountInfo = await getAccount(connection, lpTokenAccount.address);
  const newBalance = updatedAccountInfo.amount;

  if (newBalance === 0n) {
    console.log('\nLP tokens queimados com sucesso!');
  } else {
    console.error(`\nERRO: Ainda restam ${newBalance.toString()} LP tokens!`);
    process.exit(1);
  }

  // Atualizar deployment info
  deployInfo.lpBurned = true;
  deployInfo.lpBurnTx = tx;
  deployInfo.lpBurnedAt = new Date().toISOString();
  fs.writeFileSync('deployment-info.json', JSON.stringify(deployInfo, null, 2));

  console.log('\n=== LP Tokens queimados! Liquidez e PERMANENTE! ===');
  console.log('Impossivel remover liquidez. Rug pull e impossivel.');
  console.log('\nProximo passo: npm run verify');
}

main().catch((err) => {
  console.error('ERRO:', err);
  process.exit(1);
});
