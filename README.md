# Campos Core

Sistema de gestão interno: fábrica de gelo, revenda (entradas, saídas, cobrança, gerencial), reposição de PDVs, veículos e agendamentos.

**Stack:** React 19 + Vite + Tailwind CSS v4, com Supabase (Postgres, Auth e RLS) como backend.

## Rodando localmente

```bash
npm install
cp .env.example .env   # e preencha os valores
npm run dev            # http://localhost:3000 (e no IP da rede, para o celular)
```

Variáveis de ambiente (`.env`, que não é versionado):

| Variável | Onde encontrar |
|---|---|
| `VITE_SUPABASE_URL` | Supabase → Project Settings → API |
| `VITE_SUPABASE_ANON_KEY` | Supabase → Project Settings → API (chave `anon`, **nunca** a `service_role`) |
| `VITE_GROQ_API_KEY` | Painel da Groq. ⚠️ Toda variável `VITE_*` vai parar no JavaScript público; veja "Pendências". |

## Scripts

| Comando | O que faz |
|---|---|
| `npm run dev` | Servidor de desenvolvimento |
| `npm run build` | Build de produção em `dist/` |
| `npm run lint` | ESLint |
| `npm test` | Testes (Vitest) |
| `npm run test:watch` | Testes em modo watch |

> `npm test` passa por `scripts/test.mjs`, que corrige a letra do drive no Windows. Se o terminal estiver em `c:\` minúsculo, o Vitest falha com `Cannot read properties of undefined (reading 'config')`.

## Banco de dados (migrations)

As mudanças de banco ficam em `migrations/`, numeradas. **Rode-as em ordem** no SQL Editor do Supabase. Elas não são aplicadas automaticamente.

- Antes de publicar código que depende de uma migration nova, rode a migration. Exemplo: a tela de saídas usa `fn_salvar_saida`, criada na 046.
- Prefira scripts idempotentes (`CREATE OR REPLACE`, `IF NOT EXISTS`, `DROP ... IF EXISTS`).
- Toda tabela nova precisa de RLS com `auth.uid() = user_id`. Tabelas filhas (itens, transações) também devem conferir se o pai pertence ao usuário (veja a 046).
- Indexe as chaves estrangeiras e as colunas filtradas com frequência (veja a 047).

`supabase_schema.sql` é o schema **original** e está desatualizado; leia o cabeçalho dele. As migrations 001–007 não estão no repositório.

### Regras que ficam no banco

- **Totais da saída/entrada** (`total_qty`, `total_compra`, `total_venda`): calculados por trigger a partir dos itens (036).
- **`status_pagamento`** (pendente/parcial/pago): calculado por trigger a partir de total + frete e das transações (045). O app só espelha esse cálculo.
- **Salvar saída/entrada:** `fn_salvar_saida` / `fn_salvar_entrada` gravam o cabeçalho e os itens numa única transação (046).

## Backup

O workflow [.github/workflows/backup.yml](.github/workflows/backup.yml) roda **todo domingo às 03:00 (Brasília)**. Ele exporta o banco com `pg_dump`, criptografa o arquivo e o guarda por 90 dias na aba **Actions** do GitHub. Funciona no plano gratuito do Supabase. Se falhar, o GitHub manda e-mail.

O backup contém:

| Arquivo | Conteúdo |
|---|---|
| `public.dump` | Todas as tabelas do app, com dados, funções, triggers e políticas RLS, no formato do `pg_restore` |
| `public.sql` | O mesmo conteúdo em SQL legível |
| `auth_users.sql` | Usuários do login (`auth.users`, `auth.identities`) |

Arquivos do Supabase **Storage** (imagens, logos) **não** entram no backup.

### Configuração (uma vez)

1. No Supabase, abra **Connect** (botão no topo do projeto) e copie a connection string **Session pooler**, que usa a porta 5432. Troque `[YOUR-PASSWORD]` pela senha do banco. Se não souber a senha, redefina em Project Settings → Database. Use o pooler porque a conexão direta só funciona por IPv6, e o GitHub não tem IPv6.
2. No GitHub, abra **Settings → Secrets and variables → Actions → New repository secret** e crie:
   - `SUPABASE_DB_URL`: a connection string do passo 1.
   - `BACKUP_PASSWORD`: uma senha forte para criptografar o backup. **Guarde essa senha fora do GitHub**, porque sem ela o backup não abre.
3. Em **Actions → Backup semanal → Run workflow**, rode uma vez para testar.

### Baixar e abrir

Baixe o artifact em **Actions → (execução) → Artifacts**. Depois, no Git Bash, que já tem o `gpg`:

```bash
unzip backup-AAAA-MM-DD.zip
gpg --decrypt --output backup.tar.gz backup-AAAA-MM-DD.tar.gz.gpg   # pede a BACKUP_PASSWORD
tar -xzf backup.tar.gz
```

### Restaurar

Restaure num projeto Supabase **novo e vazio**, usando a connection string dele. O exemplo usa Docker, porque assim não é preciso instalar o Postgres:

```bash
cd backup-AAAA-MM-DD
# 1. usuários primeiro (as tabelas referenciam auth.users)
docker run --rm -v "$PWD:/b" postgres:17 psql "<CONNECTION_STRING>" -f /b/auth_users.sql
# 2. tabelas e dados
docker run --rm -v "$PWD:/b" postgres:17 pg_restore --no-owner --no-privileges -d "<CONNECTION_STRING>" /b/public.dump
```

## Estrutura

```
src/
  App.jsx              rotas (cada tela é carregada sob demanda com React.lazy)
  components/          Layout, Modal, ConfirmDelete, Spinner
  contexts/            Auth e abas inferiores (mobile)
  lib/
    supabaseClient.js  cliente Supabase
    db.js              dbOp (mutação com aviso de erro) e fetchAll (paginação > 1000 linhas)
    date.js            datas no fuso de Brasília (todaySP, daysAgoSP, addDaysISO, localISO)
    format.js          fmtMoney, fmtDate
    money.js           cálculos em centavos e status de pagamento
    __tests__/         testes unitários
  pages/
    Dashboard, Gelo, Reposicao, Veiculos, Agendamentos, Login
    Revenda.jsx        tela "Movimentações" (entradas, saídas, cadastros)
    Revenda/           MovCard, ProdutoCard, CobrancaModal, constants, Abas/Gerencial
migrations/            SQL, em ordem
```

## Convenções

- **Datas:** use `todaySP()` de `lib/date.js`. Nunca use `new Date().toISOString()` para obter "hoje", porque ele usa UTC e depois das 21h já é o dia seguinte. Também não guarde "hoje" numa constante de módulo, porque ela fica velha com o app aberto de um dia para o outro.
- **Dinheiro:** compare valores em centavos (`lib/money.js`) e exiba com `fmtMoney`.
- **Gravações:** use `dbOp` e só feche o modal se `ok` for verdadeiro. Gravações em várias etapas devem virar uma função no banco.
- **Consultas que podem passar de 1000 linhas:** use `fetchAll`, com `.order("id")` como desempate.

## Pendências conhecidas

- **Chave da Groq exposta:** a Reposição chama a API da Groq direto do navegador. A chamada deve passar a uma Supabase Edge Function, com a chave guardada como secret.
- **`Revenda.jsx` ainda é grande** (cerca de 3.200 linhas). O próximo passo é extrair os modais (saída, entrada, pagamento, PDV/fornecedor) e hooks de dados, um de cada vez, testando cada etapa.
- **Agendamentos:** o horário é gravado como "hora local tratada como UTC". Isso é consistente em todo o app, mas mudar a convenção exige migrar os dados.
