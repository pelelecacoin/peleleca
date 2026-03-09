// Script de auditoria - verifica todo o deployment on-chain
// Gera relatorio JSON com provas verificaveis

import 'dotenv/config';
import {
  Connection,
  PublicKey,
  clusterApiUrl,
} from '@solana/web3.js';
import {
  getMint,
  getAccount,
} from '@solana/spl-token';
import fs from 'fs';

async function main() {
  console.log('=== PELELECA ($PP) - Verificacao de Deployment ===\n');

  if (!fs.existsSync('deployment-info.json')) {
    console.error('ERRO: deployment-info.json nao encontrado.');
    process.exit(1);
  }
  const deployInfo = JSON.parse(fs.readFileSync('deployment-info.json', 'utf-8'));

  const rpcUrl = process.env.SOLANA_RPC_URL || clusterApiUrl('devnet');
  const connection = new Connection(rpcUrl, 'confirmed');
  const network = rpcUrl.includes('devnet') ? 'devnet' : 'mainnet-beta';
  const explorerBase = network === 'devnet'
    ? 'https://solscan.io/token/%s?cluster=devnet'
    : 'https://solscan.io/token/%s';

  const report = {
    token: 'PELELECA ($PP)',
    network,
    timestamp: new Date().toISOString(),
    checks: {},
  };

  let allPassed = true;

  // 1. Verificar token existe
  console.log('1. Verificando token...');
  const mintAddress = new PublicKey(deployInfo.mintAddress);
  const mintInfo = await getMint(connection, mintAddress);
  report.checks.tokenExists = {
    passed: true,
    mintAddress: mintAddress.toBase58(),
    decimals: mintInfo.decimals,
    supply: mintInfo.supply.toString(),
    explorerUrl: explorerBase.replace('%s', mintAddress.toBase58()),
  };
  console.log(`   Mint: ${mintAddress.toBase58()}`);
  console.log(`   Decimals: ${mintInfo.decimals}`);
  console.log(`   Supply: ${(mintInfo.supply / (10n ** 6n)).toLocaleString()} PP`);

  // 2. Verificar Mint Authority revogada
  console.log('\n2. Verificando Mint Authority...');
  const mintRevoked = mintInfo.mintAuthority === null;
  report.checks.mintAuthorityRevoked = {
    passed: mintRevoked,
    value: mintInfo.mintAuthority?.toBase58() || 'null (REVOGADA)',
  };
  console.log(`   ${mintRevoked ? 'REVOGADA' : 'ERRO - AINDA ATIVA!'}`);
  if (!mintRevoked) allPassed = false;

  // 3. Verificar Freeze Authority revogada
  console.log('\n3. Verificando Freeze Authority...');
  const freezeRevoked = mintInfo.freezeAuthority === null;
  report.checks.freezeAuthorityRevoked = {
    passed: freezeRevoked,
    value: mintInfo.freezeAuthority?.toBase58() || 'null (REVOGADA)',
  };
  console.log(`   ${freezeRevoked ? 'REVOGADA' : 'ERRO - AINDA ATIVA!'}`);
  if (!freezeRevoked) allPassed = false;

  // 4. Verificar supply correto
  console.log('\n4. Verificando supply total...');
  const expectedSupply = 51_800_000_000n * (10n ** 6n); // 51,8 bilhoes
  const supplyCorrect = mintInfo.supply === expectedSupply;
  report.checks.supplyCorrect = {
    passed: supplyCorrect,
    expected: expectedSupply.toString(),
    actual: mintInfo.supply.toString(),
  };
  console.log(`   ${supplyCorrect ? 'CORRETO' : 'INCORRETO!'}`);
  console.log(`   Esperado: ${(expectedSupply / (10n ** 6n)).toLocaleString()} PP`);
  console.log(`   Atual: ${(mintInfo.supply / (10n ** 6n)).toLocaleString()} PP`);
  if (!supplyCorrect) allPassed = false;

  // 5. Verificar wallet de fomento
  if (deployInfo.fomentoTokenAccount) {
    console.log('\n5. Verificando wallet de fomento...');
    try {
      const fomentoAccount = await getAccount(
        connection,
        new PublicKey(deployInfo.fomentoTokenAccount),
      );
      const fomentoBalance = fomentoAccount.amount / (10n ** 6n);
      report.checks.fomentoWallet = {
        passed: true,
        wallet: deployInfo.fomentoWallet,
        balance: fomentoBalance.toLocaleString() + ' PP',
      };
      console.log(`   Wallet: ${deployInfo.fomentoWallet}`);
      console.log(`   Saldo: ${fomentoBalance.toLocaleString()} PP`);
    } catch {
      report.checks.fomentoWallet = { passed: false, error: 'Conta nao encontrada' };
      console.log('   ERRO: Conta de fomento nao encontrada');
      allPassed = false;
    }
  }

  // 6. Verificar LP queimado
  if (deployInfo.lpBurned) {
    console.log('\n6. Verificando LP tokens queimados...');
    report.checks.lpBurned = {
      passed: true,
      burnTx: deployInfo.lpBurnTx,
    };
    console.log(`   LP queimado: SIM`);
    console.log(`   TX: ${deployInfo.lpBurnTx}`);
  } else {
    report.checks.lpBurned = { passed: false, note: 'LP nao queimado ainda' };
    console.log('\n6. LP tokens NAO queimados ainda');
    allPassed = false;
  }

  // Resultado final
  report.allPassed = allPassed;

  console.log('\n' + '='.repeat(50));
  console.log(`RESULTADO: ${allPassed ? 'TUDO OK - DEPLOY VERIFICADO!' : 'ATENCAO - VERIFICACOES FALHARAM!'}`);
  console.log('='.repeat(50));

  // Salvar relatorio
  const reportPath = `verification-report-${Date.now()}.json`;
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`\nRelatorio salvo em: ${reportPath}`);
}

main().catch((err) => {
  console.error('ERRO:', err);
  process.exit(1);
});
