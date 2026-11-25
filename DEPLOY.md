# Como colocar o Tá On Mídia no ar

Este pacote contém o sistema **Tá On Mídia** completo (painel administrativo React + servidor Express + build `dist/` pronto para produção).

## Requisitos do servidor
- **Node.js 22+** (para executar `node server.ts` nativamente) ou Docker/VPS/Render/Railway/Coolify.
- **Não** envie apenas a pasta `dist/` para hospedagens estáticas (como Netlify Drop/S3), pois o painel depende do servidor Node.js (`/api/*`) para login, upload de mídias, playlists, dispositivos TV Box e integração com APIs.

## Passo a passo para publicar

1. **Extrair os arquivos** no servidor ou enviar para o repositório Git conectado à sua hospedagem.
2. **Configurar as variáveis de ambiente** (copie `.env.example` para `.env` ou configure no painel da hospedagem):
   - `NODE_ENV=production`
   - `PORT=3000` (ou a porta exigida pelo provedor)
   - `SESSION_SECRET` (chave aleatória forte com 32+ caracteres)
   - `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` (opcional — caso use Supabase, execute o script `supabase_schema.sql` no SQL Editor do Supabase)
3. **Instalar dependências**:
   ```bash
   npm install
   ```
4. **Gerar o build do painel** (a pasta `dist/` já vai pré-compilada neste ZIP, mas recomenda-se rodar no deploy):
   ```bash
   npm run build
   ```
5. **Iniciar em produção**:
   ```bash
   NODE_ENV=production npm start
   ```

## Persistência de dados local
- Quando executado sem Supabase, o sistema grava os dados e mídias enviadas na pasta `data/` (criada automaticamente no primeiro acesso). Em hospedagens com disco efêmero, monte um volume persistente em `/data` ou conecte o Supabase.
