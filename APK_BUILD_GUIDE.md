# Guia Completo: Como Gerar o APK da TV Box (Android TV)

Este pacote contém o projeto completo **Tá On Mídia** com suporte nativo ao **Capacitor** para Android TV / TV Box.

## Opção 1: Gerar o APK Automaticamente pelo GitHub (Sem precisar instalar Android Studio)

Esta é a forma mais prática, pois o próprio GitHub faz a compilação para você:

1. Crie um repositório privado ou público no **GitHub**.
2. Envie todos os arquivos deste projeto compactado para a branch `main` do seu repositório.
3. No seu repositório no GitHub, clique na aba **Actions**.
4. Você verá o workflow **"Build Android APK"** rodando automaticamente.
5. Quando o processo terminar (leva cerca de 2 a 3 minutos), clique na execução do workflow, role até a seção **Artifacts** e faça o download do arquivo **`app-debug.apk`**.

---

## Opção 2: Compilar Localmente usando o Android Studio

Se você tiver o **Android Studio** instalado no seu computador:

1. Extraia o projeto em uma pasta.
2. Abra o terminal na raiz do projeto e instale as dependências e gere o build:
   ```bash
   npm install
   npm run build
   npx cap sync android
   ```
3. Abra a pasta nativa no Android Studio:
   ```bash
   npx cap open android
   ```
4. Com o projeto aberto no Android Studio, aguarde o Gradle sincronizar.
5. No menu superior, vá em **Build > Build Bundle(s) / APK(s) > Build APK(s)**.
6. O APK gerado estará em `android/app/build/outputs/apk/debug/app-debug.apk`.

---

## Recursos configurados neste APK para TV Box:
- **Rota do Player (`/player`)**: Abre direto na tela de reprodução sem barras de navegação.
- **Modo Imersivo Total**: Oculta automaticamente a barra de status e os botões do Android.
- **Tela Sempre Ligada (WakeLock)**: Impede que a TV Box entre em modo de descanso/suspensão.
- **Início Automático no Boot (`RECEIVE_BOOT_COMPLETED`)**: O aplicativo inicia sozinho assim que a TV Box é ligada na tomada.
- **Leanback Launcher**: Compatível com o menu principal de launchers de Android TV e TV Boxes convencionais.
