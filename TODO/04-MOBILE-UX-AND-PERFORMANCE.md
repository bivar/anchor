# TODO: Experiência Mobile, Layout e Performance (Prioridade: ALTA)

Este documento trata da adaptação do aplicativo para funcionar com qualidade nativa em dispositivos móveis Android e iOS, eliminando padrões herdados de simulação de desktop.

---

## 1. Quebra de Layout em Smartphones (Moldura de Desktop no CSS)
- **Localização**: `src/styles/app.css` (linhas 3-24).
- **Severidade**: **ALTA**
- **Diagnóstico**:
  O CSS define o container principal com dimensões fixas voltadas para visualização em navegadores desktop:
  ```css
  .page {
    min-height: 100vh;
    width: 100%;
    background: var(--color-neutral-300);
    display: flex;
    align-items: flex-start;
    justify-content: center;
    padding: 40px 16px;
  }

  .shell {
    width: 390px;
    max-width: 100%;
    min-height: 844px;
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-lg);
    position: relative;
    overflow: hidden;
  }
  ```
  **Efeito no celular**: Ao rodar o APK ou abrir no iPhone, o app é renderizado dentro de um "cartão flutuante" de 390px, cercado por bordas cinzas grossas (`padding: 40px 16px`), com cantos arredondados dentro da própria tela do aparelho em vez de preencher 100% da viewport física.
- **Plano de Correção**:
  1. Tornar a casca responsiva usando Media Queries ou classes contextuais:
     - Em telas móveis (`@media (max-width: 600px)` ou quando empacotado no Capacitor):
       - `.page`: `padding: 0; min-height: 100dvh; width: 100%;`
       - `.shell`: `width: 100%; max-width: 100%; min-height: 100dvh; border-radius: 0; box-shadow: none;`
     - Manter o efeito de moldura centralizada apenas em telas grandes (Desktop preview).

---

## 2. Suporte a Safe Area Insets (Notches, Ilha Dinâmica e Barra de Gestos)
- **Localização**: `index.html` (linha 5), `src/styles/app.css` (`.app-header` e `.bottom-nav`).
- **Severidade**: **ALTA**
- **Diagnóstico**:
  1. `index.html` não inclui `viewport-fit=cover`:
     ```html
     <meta name="viewport" content="width=device-width, initial-scale=1" />
     ```
  2. O `.app-header` e a `.bottom-nav` não utilizam as variáveis CSS `env(safe-area-inset-top)` e `env(safe-area-inset-bottom)`.
  **Efeito**: O cabeçalho fica cortado atrás da câmera frontal (notch/câmera perfurada) e a barra de navegação inferior fica sobreposta pela barra de navegação por gestos do sistema operacional no Android e iOS.
- **Plano de Correção**:
  1. Atualizar a viewport em `index.html`:
     ```html
     <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover, user-scalable=no" />
     ```
  2. Adicionar os insets no CSS:
     ```css
     .app-header {
       padding-top: calc(var(--space-3) + env(safe-area-inset-top, 0px));
     }
     .bottom-nav {
       padding-bottom: calc(10px + env(safe-area-inset-bottom, 0px));
     }
     .flow-overlay {
       padding-top: calc(28px + env(safe-area-inset-top, 0px));
       padding-bottom: calc(24px + env(safe-area-inset-bottom, 0px));
     }
     ```

---

## 3. Integração com Plugins Nativos (@capacitor/status-bar e @capacitor/splash-screen)
- **Localização**: `package.json`, `capacitor.config.ts`.
- **Severidade**: **MÉDIA**
- **Diagnóstico**:
  O app não possui controle da barra de status do sistema. A cor de fundo definida no `capacitor.config.ts` (`#f5ead8`) nem sempre se estende com contraste correto aos ícones da barra de status (ícones brancos sobre fundo claro podem ficar invisíveis).
- **Plano de Correção**:
  1. Instalar `@capacitor/status-bar` e `@capacitor/splash-screen`.
  2. Configurar a cor e o estilo escuro dos ícones da barra de status:
     ```typescript
     import { StatusBar, Style } from '@capacitor/status-bar';
     await StatusBar.setStyle({ style: Style.Dark });
     await StatusBar.setBackgroundColor({ color: '#f5ead8' });
     ```

---

## 4. Feedback Háptico (Vibração Tátil ao Concluir Blocos)
- **Localização**: `src/state/store.tsx` (ações `FINISH_FOCUS`, `LIFTOFF`, `FINISH_TORNADO`, `SET_LOG_ENERGY`).
- **Severidade**: **MÉDIA**
- **Diagnóstico**:
  Em aplicativos móveis de produtividade e formação de hábitos com elementos de gamificação, a resposta física (haptic feedback) fortalece a recompensa neurológica da conclusão da tarefa. O app atualmente só exibe um toast na tela.
- **Plano de Correção**:
  1. Instalar `@capacitor/haptics`.
  2. Disparar vibrações nativas discretas em momentos chave:
     - `Haptics.impact({ style: ImpactStyle.Medium })` ao marcar bloco.
     - `Haptics.notification({ type: NotificationType.Success })` ao acionar "Liftoff", ao subir de nível ou ao concluir o Tornado.

---

## 5. Empacotamento Local de Fontes (Eliminar Dependência de CDN)
- **Localização**: `src/styles/organic.css` (linha 5).
- **Severidade**: **MÉDIA**
- **Diagnóstico**:
  As fontes do app são baixadas via Google Fonts:
  ```css
  @import url('https://fonts.googleapis.com/css2?family=Caprasimo:wght@400&family=Figtree:wght@400;600;700&display=swap');
  ```
  Se o usuário abrir o aplicativo sem conexão à internet (ex: modo avião, metrô, áreas rurais), as fontes padrão do sistema (como Roboto ou San Francisco) serão exibidas com layout shift e perda da identidade visual "Organic".
- **Plano de Correção**:
  1. Baixar os arquivos `.woff2` de `Caprasimo` e `Figtree`.
  2. Hospedar em `src/assets/fonts/` e declarar com `@font-face` local.
  3. Garantir autonomia 100% offline da renderização tipográfica.
