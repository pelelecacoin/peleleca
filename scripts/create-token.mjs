// Script para criar o token SPL PELELECA ($PP) na Solana
// Supply: 51.800.000.000 (51,8 bilhoes) com 6 decimais
// Inclui metadata via Metaplex (nome, simbolo, logo)

import 'dotenv/config';
import {
  Connection,
  Keypair,
  clusterApiUrl,
  Transaction,
  TransactionInstruction,
  PublicKey,
  SystemProgram,
} from '@solana/web3.js';
import {
  createMint,
  getOrCreateAssociatedTokenAccount,
  mintTo,
} from '@solana/spl-token';
import fs from 'fs';

const DECIMALS = 6;
const TOTAL_SUPPLY = 51_800_000_000n; // 51,8 bilhoes
const RAW_SUPPLY = TOTAL_SUPPLY * (10n ** BigInt(DECIMALS));

// Metadata do token
const TOKEN_NAME = 'PELELECA';
const TOKEN_SYMBOL = 'PP';
const METADATA_URI = process.env.METADATA_URI || '';

// Metaplex Token Metadata Program
const TOKEN_METADATA_PROGRAM_ID = new PublicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s');

// Derivar PDA do metadata account
function findMetadataPda(mint) {
  return PublicKey.findProgramAddressSync(
    [
      Buffer.from('metadata'),
      TOKEN_METADATA_PROGRAM_ID.toBuffer(),
      mint.toBuffer(),
    ],
    TOKEN_METADATA_PROGRAM_ID,
  )[0];
}

// Serializar string para o formato Metaplex (4 bytes length + utf8 bytes)
function serializeString(str) {
  const buf = Buffer.from(str, 'utf-8');
  const len = Buffer.alloc(4);
  len.writeUInt32LE(buf.length);
  return Buffer.concat([len, buf]);
}

// Construir instrucao CreateMetadataAccountV3
function createMetadataInstruction(metadata, mint, mintAuthority, payer, updateAuthority, data) {
  // Discriminator para CreateMetadataAccountV3 = 33
  const discriminator = Buffer.from([33]);

  // Serializar DataV2
  const nameBytes = serializeString(data.name);
  const symbolBytes = serializeString(data.symbol);
  const uriBytes = serializeString(data.uri);
  const sellerFeeBasisPoints = Buffer.alloc(2);
  sellerFeeBasisPoints.writeUInt16LE(data.sellerFeeBasisPoints);

  // creators: None (0)
  const creatorsOption = Buffer.from([0]);
  // collection: None (0)
  const collectionOption = Buffer.from([0]);
  // uses: None (0)
  const usesOption = Buffer.from([0]);

  // isMutable: true (1)
  const isMutable = Buffer.from([1]);
  // collectionDetails: None (0)
  const collectionDetails = Buffer.from([0]);

  const instructionData = Buffer.concat([
    discriminator,
    nameBytes,
    symbolBytes,
    uriBytes,
    sellerFeeBasisPoints,
    creatorsOption,
    collectionOption,
    usesOption,
    isMutable,
    collectionDetails,
  ]);

  const keys = [
    { pubkey: metadata, isSigner: false, isWritable: true },
    { pubkey: mint, isSigner: false, isWritable: false },
    { pubkey: mintAuthority, isSigner: true, isWritable: false },
    { pubkey: payer, isSigner: true, isWritable: true },
    { pubkey: updateAuthority, isSigner: false, isWritable: false },
    { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
  ];

  return new TransactionInstruction({
    keys,
    programId: TOKEN_METADATA_PROGRAM_ID,
    data: instructionData,
  });
}

async function main() {
  console.log('=== PELELECA ($PP) - Criacao do Token ===\n');

  // Conexao com a rede
  const rpcUrl = process.env.SOLANA_RPC_URL || clusterApiUrl('devnet');
  const connection = new Connection(rpcUrl, 'confirmed');
  console.log(`Rede: ${rpcUrl}`);

  // Carregar keypair do deployer
  const keypairPath = process.env.SOLANA_KEYPAIR_PATH;
  if (!keypairPath) {
    console.error('ERRO: Defina SOLANA_KEYPAIR_PATH no .env');
    process.exit(1);
  }

  const keypairData = JSON.parse(fs.readFileSync(keypairPath, 'utf-8'));
  const deployer = Keypair.fromSecretKey(Uint8Array.from(keypairData));
  console.log(`Deployer: ${deployer.publicKey.toBase58()}`);

  // Verificar saldo
  const balance = await connection.getBalance(deployer.publicKey);
  console.log(`Saldo: ${balance / 1e9} SOL\n`);

  if (balance < 0.005 * 1e9) {
    console.error('ERRO: Saldo insuficiente. Precisa de pelo menos 0.005 SOL.');
    process.exit(1);
  }

  // 1. Criar o Mint (token)
  console.log('1. Criando Mint Account...');
  const mint = await createMint(
    connection,
    deployer,
    deployer.publicKey, // mint authority
    deployer.publicKey, // freeze authority
    DECIMALS,
  );
  console.log(`   Mint criado: ${mint.toBase58()}`);

  // 2. Adicionar metadata via Metaplex
  console.log('2. Adicionando metadata (nome, simbolo, logo)...');
  const metadataPda = findMetadataPda(mint);

  const metadataIx = createMetadataInstruction(
    metadataPda,
    mint,
    deployer.publicKey,
    deployer.publicKey,
    deployer.publicKey,
    {
      name: TOKEN_NAME,
      symbol: TOKEN_SYMBOL,
      uri: METADATA_URI,
      sellerFeeBasisPoints: 0,
    },
  );

  const tx = new Transaction().add(metadataIx);
  tx.feePayer = deployer.publicKey;
  tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
  tx.sign(deployer);

  const metadataTxSig = await connection.sendRawTransaction(tx.serialize());
  await connection.confirmTransaction(metadataTxSig, 'confirmed');
  console.log(`   Metadata TX: ${metadataTxSig}`);
  console.log(`   Nome: ${TOKEN_NAME} (${TOKEN_SYMBOL})`);
  console.log(`   URI: ${METADATA_URI || '(vazio - atualizar depois)'}`);

  // 3. Criar Associated Token Account do deployer
  console.log('3. Criando Token Account do deployer...');
  const tokenAccount = await getOrCreateAssociatedTokenAccount(
    connection,
    deployer,
    mint,
    deployer.publicKey,
  );
  console.log(`   Token Account: ${tokenAccount.address.toBase58()}`);

  // 4. Mintar o supply total
  console.log(`4. Mintando ${TOTAL_SUPPLY.toLocaleString()} tokens...`);
  const mintTx = await mintTo(
    connection,
    deployer,
    mint,
    tokenAccount.address,
    deployer,
    RAW_SUPPLY,
  );
  console.log(`   Mint TX: ${mintTx}`);

  // Salvar informacoes do deploy
  const deploymentInfo = {
    tokenName: TOKEN_NAME,
    ticker: TOKEN_SYMBOL,
    decimals: DECIMALS,
    totalSupply: TOTAL_SUPPLY.toString(),
    mintAddress: mint.toBase58(),
    deployerTokenAccount: tokenAccount.address.toBase58(),
    deployer: deployer.publicKey.toBase58(),
    metadataUri: METADATA_URI,
    metadataPda: metadataPda.toBase58(),
    mintTxSignature: mintTx,
    metadataTxSignature: metadataTxSig,
    network: rpcUrl.includes('devnet') ? 'devnet' : 'mainnet-beta',
    createdAt: new Date().toISOString(),
  };

  fs.writeFileSync(
    'deployment-info.json',
    JSON.stringify(deploymentInfo, null, 2),
  );

  console.log('\n=== Token criado com sucesso! ===');
  console.log(`Mint Address: ${mint.toBase58()}`);
  console.log(`Nome: ${TOKEN_NAME} (${TOKEN_SYMBOL})`);
  console.log(`Supply: ${TOTAL_SUPPLY.toLocaleString()} PP`);
  console.log('Informacoes salvas em deployment-info.json');
  console.log('\nProximo passo: verificar no Solscan e depois npm run revoke-authorities');
}

main().catch((err) => {
  console.error('ERRO:', err);
  process.exit(1);
});
