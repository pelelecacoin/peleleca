# PELELECA ($PP)

A memecoin da indignação nacional. Cada token representa R$1 do rombo de R$51,8 bilhões do caso Banco Master.

## Token

| | |
|---|---|
| **Blockchain** | Solana (Mainnet) |
| **Supply** | 51.800.000.000 (51,8 bilhões) |
| **Decimais** | 6 |
| **Contrato** | `B5J72mRdZLh3THqUWRQa4M3CdXxkLDueaZp56a3wzwNt` |
| **Solscan** | [Ver no Solscan](https://solscan.io/token/B5J72mRdZLh3THqUWRQa4M3CdXxkLDueaZp56a3wzwNt) |

## Tokenomics

- **93%** — Pool de liquidez (LP queimado = liquidez permanente)
- **7%** — Fomento (criadores de conteúdo, parceiros, comunidade)
- **0%** — Insiders, team, VCs

## Segurança On-Chain

- Mint Authority: **Revogada** (ninguém pode criar mais tokens)
- Freeze Authority: **Revogada** (ninguém pode congelar contas)
- LP Tokens: **Queimados** (liquidez irremovível)

Tudo verificável no [Solscan](https://solscan.io/token/B5J72mRdZLh3THqUWRQa4M3CdXxkLDueaZp56a3wzwNt).

## Estrutura do Projeto

```
PELELECA/
├── site/               # Landing page + whitepaper
│   ├── index.html      # Site principal com whitepaper integrado
│   ├── public/         # Assets (logo, metadata)
│   └── src/            # Estilos (Tailwind CSS)
├── scripts/            # Scripts de deploy on-chain
│   ├── create-token.mjs
│   ├── transfer-fomento.mjs
│   ├── create-raydium-pool.mjs
│   ├── burn-lp-tokens.mjs
│   ├── revoke-authorities.mjs
│   └── verify-deployment.mjs
└── Docs/               # Whitepaper PDF (versão legada)
```

## Rodando o Site Localmente

```bash
cd site
npm install
npm run dev
```

Acesse `http://localhost:5173`

## Build para Produção

```bash
cd site
npm run build
```

Os arquivos ficam em `site/dist/`.

## Scripts On-Chain

```bash
cd scripts
npm install
cp .env.example .env
# Preencha as variáveis no .env
```

| Script | Comando | Descrição |
|--------|---------|-----------|
| Criar token | `npm run create-token` | Cria o token na Solana |
| Transferir fomento | `npm run transfer-fomento` | Envia 7% para wallet de fomento |
| Criar pool | `npm run create-pool` | Cria pool no Raydium |
| Queimar LP | `npm run burn-lp` | Queima LP tokens |
| Revogar autoridades | `npm run revoke-authorities` | Revoga mint e freeze |
| Verificar | `npm run verify` | Auditoria completa |

## Disclaimer

PELELECA ($PP) é uma memecoin criada como sátira e protesto comunitário. Não constitui aconselhamento financeiro. Faça sua própria pesquisa (DYOR) antes de qualquer decisão.

## Links

- [Site](https://peleleca.com)
- [Solscan](https://solscan.io/token/B5J72mRdZLh3THqUWRQa4M3CdXxkLDueaZp56a3wzwNt)
