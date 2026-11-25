# Player Android 24/7 — VoltBuilder

Pacote Vanilla JS + HTML5 + CSS3 para compilar gratuitamente no VoltBuilder. Arquivos principais: `voltbuilder.json`, `config.xml`, `www/index.html`, `www/styles.css` e `www/app.js`.

## Configuração

Ao iniciar, o player mostra um código de pareamento de 6 dígitos. Para abrir o menu técnico, toque cinco vezes no canto superior esquerdo. Informe URL e anon key do Supabase e, opcionalmente, a URL de uma playlist M3U. Também é possível ativar o modo demonstrativo.

O player consulta `playlist` e `custom_extensions` no Supabase REST, aplica dayparting (`start_time`, `end_time`, `days_of_week`) e atualiza CSS/JS/widgets ativos. O código também tenta uma assinatura Realtime e mantém polling de segurança a cada 120 segundos.

## Contrato de dados esperado

`playlist`: `active`, `position`, `type`, `title`, `description`, `image`, `link`, `duration`, `start_time`, `end_time`, `days_of_week`, `provider`, `html`, `css`, `js`.

`custom_extensions`: `active`, `target` (`player_css`, `player_js` ou `custom_widget_html`), `code`/`content`, `html`, `css`, `js`, `name`, `duration`.

## Compilação

Envie a pasta inteira ao VoltBuilder e gere o APK Android. Os plugins `cordova-plugin-insomnia` e `cordova-plugin-autostart` estão declarados no `config.xml`.

## Limitação de sessão M3U

O player encerra a sessão M3U após 60 segundos e informa a fila local. Limitação real por IP, fila global e rate limit não podem ser garantidos no APK: devem ser aplicados em uma Edge Function/API do servidor antes de entregar o link M3U. Nunca coloque service-role key no APK; use somente anon key e RLS.
