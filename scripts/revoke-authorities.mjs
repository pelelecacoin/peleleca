// Script para revogar Mint Authority e Freeze Authority do token PELELECA
// Apos execucao, NINGUEM pode criar novos tokens ou congelar wallets

import 'dotenv/config';
import {
  Connection,
  Keypair,
  PublicKey,
  clusterApiUrl,
} from '@solana/web3.js';
import {
  setAuthority,
  AuthorityType,
  getMint,
} from '@solana/spl-token';
import fs from 'fs';

async function main() {
  console.log('=== PELELECA ($PP) - Revogar Authorities ===\n');

  // Carregar deployment info
  if (!fs.existsSync('deployment-info.json')) {
    console.error('ERRO: deployment-info.json nao encontrado. Execute create-token primeiro.');
    process.exit(1);
  }
  const deployInfo = JSON.parse(fs.readFileSync('deployment-info.json', 'utf-8'));

  const rpcUrl = process.env.SOLANA_RPC_URL || clusterApiUrl('devnet');
  const connection = new Connection(rpcUrl, 'confirmed');

  const keypairPath = process.env.SOLANA_KEYPAIR_PATH;
  const keypairData = JSON.parse(fs.readFileSync(keypairPath, 'utf-8'));
  const deployer = Keypair.fromSecretKey(Uint8Array.from(keypairData));

  const mintAddress = new PublicKey(deployInfo.mintAddress);

  // Verificar estado atual
  console.log('Verificando estado atual do mint...');
  let mintInfo = await getMint(connection, mintAddress);
  console.log(`Mint Authority atual: ${mintInfo.mintAuthority?.toBase58() || 'null'}`);
  console.log(`Freeze Authority atual: ${mintInfo.freezeAuthority?.toBase58() || 'null'}\n`);

  // Revogar Mint Authority
  if (mintInfo.mintAuthority) {
    console.log('Revogando Mint Authority...');
    const tx1 = await setAuthority(
      connection,
      deployer,
      mintAddress,
      deployer,
      AuthorityType.MintTokens,
      null, // setar para null = revogar
    );
    console.log(`TX Mint Authority revogada: ${tx1}`);
  } else {
    console.log('Mint Authority ja esta revogada.');
  }

  // Revogar Freeze Authority
  if (mintInfo.freezeAuthority) {
    console.log('Revogando Freeze Authority...');
    const tx2 = await setAuthority(
      connection,
      deployer,
      mintAddress,
      deployer,
      AuthorityType.FreezeAccount,
      null,
    );
    console.log(`TX Freeze Authority revogada: ${tx2}`);
  } else {
    console.log('Freeze Authority ja esta revogada.');
  }

  // Verificar que ambas foram revogadas
  console.log('\nVerificando revogacao...');
  mintInfo = await getMint(connection, mintAddress);

  const mintRevoked = mintInfo.mintAuthority === null;
  const freezeRevoked = mintInfo.freezeAuthority === null;

  console.log(`Mint Authority: ${mintRevoked ? 'REVOGADA' : 'ERRO - ainda ativa!'}`);
  console.log(`Freeze Authority: ${freezeRevoked ? 'REVOGADA' : 'ERRO - ainda ativa!'}`);

  if (!mintRevoked || !freezeRevoked) {
    console.error('\nERRO: Falha ao revogar authorities!');
    process.exit(1);
  }

  // Atualizar deployment info
  deployInfo.mintAuthorityRevoked = true;
  deployInfo.freezeAuthorityRevoked = true;
  deployInfo.revokedAt = new Date().toISOString();
  fs.writeFileSync('deployment-info.json', JSON.stringify(deployInfo, null, 2));

  console.log('\n=== Authorities revogadas com sucesso! ===');
  console.log('Supply agora e FIXO para sempre. Ninguem pode congelar wallets.');
  console.log('\nProximo passo: npm run transfer-airdrop');
}

main().catch((err) => {
  console.error('ERRO:', err);
  process.exit(1);
});
