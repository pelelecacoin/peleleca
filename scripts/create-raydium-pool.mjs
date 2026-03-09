// Script para criar pool de liquidez SOL/PP na Raydium
// 93% do supply vai para o pool

import 'dotenv/config';
import {
  Connection,
  Keypair,
  PublicKey,
  clusterApiUrl,
} from '@solana/web3.js';
import {
  getAccount,
} from '@solana/spl-token';
import { Raydium } from '@raydium-io/raydium-sdk-v2';
import BN from 'bn.js';
import fs from 'fs';

const DECIMALS = 6;
const TOTAL_SUPPLY = 51_800_000_000n;
const POOL_SUPPLY = (TOTAL_SUPPLY * 93n) / 100n; // 48.174.000.000
const RAW_POOL_SUPPLY = POOL_SUPPLY * (10n ** BigInt(DECIMALS));

// SOL nativo (wrapped SOL mint)
const WSOL_MINT = new PublicKey('So11111111111111111111111111111111111111112');

async function main() {
  console.log('=== PELELECA ($PP) - Criar Pool de Liquidez na Raydium ===\n');

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

  // Verificar saldo SOL
  const solBalance = await connection.getBalance(deployer.publicKey);
  const solForLiquidity = solBalance - 0.1 * 1e9; // reservar 0.1 SOL para taxas
  console.log(`Saldo SOL: ${solBalance / 1e9}`);
  console.log(`SOL para liquidez: ${solForLiquidity / 1e9}`);
  console.log(`PP para liquidez: ${POOL_SUPPLY.toLocaleString()}\n`);

  if (solForLiquidity <= 0) {
    console.error('ERRO: SOL insuficiente para criar pool.');
    console.error('Deposite SOL na wallet do deployer e tente novamente.');
    process.exit(1);
  }

  // Inicializar Raydium SDK
  console.log('Inicializando Raydium SDK...');
  const raydium = await Raydium.load({
    connection,
    owner: deployer,
    cluster: rpcUrl.includes('devnet') ? 'devnet' : 'mainnet',
  });

  // Verificar saldo de tokens PP
  const deployerTokenAccount = new PublicKey(deployInfo.deployerTokenAccount);
  const tokenAccountInfo = await getAccount(connection, deployerTokenAccount);
  const ppBalance = BigInt(tokenAccountInfo.amount);
  console.log(`Saldo PP na wallet: ${(ppBalance / (10n ** 9n)).toLocaleString()}`);

  if (ppBalance < RAW_POOL_SUPPLY) {
    console.error('ERRO: Saldo de PP insuficiente para o pool.');
    console.error(`Necessario: ${POOL_SUPPLY.toLocaleString()} PP`);
    console.error(`Disponivel: ${(ppBalance / (10n ** 9n)).toLocaleString()} PP`);
    process.exit(1);
  }

  // Criar AMM Pool na Raydium
  // Nota: A API do Raydium SDK v2 pode variar. Consultar docs atualizados.
  console.log('Criando pool AMM na Raydium...');
  console.log('Par: SOL/PP');
  console.log(`SOL: ${solForLiquidity / 1e9}`);
  console.log(`PP: ${POOL_SUPPLY.toLocaleString()}\n`);

  try {
    // Criar pool CPMM (Concentrated Pool Market Maker) ou AMM Standard
    const { execute, extInfo } = await raydium.liquidity.createPoolV4({
      programId: raydium.ammV4Program, // AMM v4
      marketId: undefined, // sera criado automaticamente se necessario
      baseMintInfo: {
        mint: mintAddress,
        decimals: DECIMALS,
      },
      quoteMintInfo: {
        mint: WSOL_MINT,
        decimals: 9,
      },
      baseAmount: new BN(RAW_POOL_SUPPLY.toString()),
      quoteAmount: new BN(Math.floor(solForLiquidity).toString()),
      startTime: new BN(0), // imediato
    });

    console.log('Executando transacao de criacao do pool...');
    const { txIds } = await execute();
    console.log(`Pool criado! TX(s): ${txIds.join(', ')}`);

    // Salvar info do pool
    deployInfo.raydiumPoolId = extInfo.address.poolId?.toBase58() || 'verificar-no-explorer';
    deployInfo.lpMint = extInfo.address.lpMint?.toBase58() || 'verificar-no-explorer';
    deployInfo.solInPool = solForLiquidity / 1e9;
    deployInfo.ppInPool = POOL_SUPPLY.toString();
    deployInfo.poolCreatedAt = new Date().toISOString();
    deployInfo.poolTxSignatures = txIds;

    fs.writeFileSync('deployment-info.json', JSON.stringify(deployInfo, null, 2));

    console.log('\n=== Pool de liquidez criado com sucesso! ===');
    console.log(`Pool ID: ${deployInfo.raydiumPoolId}`);
    console.log(`LP Mint: ${deployInfo.lpMint}`);
    console.log('\nProximo passo: npm run burn-lp');
  } catch (err) {
    console.error('\nERRO ao criar pool na Raydium:', err.message);
    console.log('\n--- ALTERNATIVA MANUAL ---');
    console.log('Se o SDK falhar, crie o pool manualmente:');
    console.log('1. Acesse https://raydium.io/liquidity/create-pool/');
    console.log('2. Conecte a wallet do deployer');
    console.log(`3. Token A: ${mintAddress.toBase58()} (PP)`);
    console.log('4. Token B: SOL');
    console.log(`5. Quantidade PP: ${POOL_SUPPLY.toLocaleString()}`);
    console.log(`6. Quantidade SOL: ${solForLiquidity / 1e9}`);
    console.log('7. Confirme a transacao');
    console.log('8. Anote o Pool ID e LP Mint e atualize deployment-info.json');
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('ERRO:', err);
  process.exit(1);
});
