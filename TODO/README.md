# Anchor App — Plano de Correções, Segurança e Implementação (TODO)

> **Atualização (2026-10-24):** o app virou um **web app instalável (PWA)** e a casca Capacitor/Android/iOS foi removida. Os documentos 01–05 descrevem a versão nativa antiga e ficam como histórico; o estado atual de cada item está em [06-PRODUCTION-READINESS.md](./06-PRODUCTION-READINESS.md) e as instruções de uso no [README](../README.md).

Este diretório reúne o diagnóstico completo e o plano de ação técnico decorrente da auditoria realizada no código-fonte do **Anchor App** (Vite + React + TypeScript + Capacitor).

O projeto é concebido como um aplicativo móvel voltado para gestão de rotina baseada em níveis de energia e foco ("5-Minute Rule"), porém apresentava vulnerabilidades de segurança, falhas severas na persistência e integridade do estado, lacunas funcionais (telas com dados estáticos simulados) e inadequação para uso nativo em smartphones.

---

## Estrutura do Diretório TODO

Os itens a serem corrigidos e implementados foram categorizados por domínio técnico:

| Arquivo | Prioridade | Escopo Principal |
| :--- | :---: | :--- |
| [**01-SECURITY.md**](./01-SECURITY.md) | **Crítica** | Remoção de credenciais em texto puro, Content Security Policy, R8/ProGuard e hardening Android/iOS. |
| [**02-PERSISTENCE-AND-STATE.md**](./02-PERSISTENCE-AND-STATE.md) | **Crítica** | Falhas no rollover de meia-noite, corrupção de streak, migração de dados e substituição do LocalStorage por storage nativo resiliente. |
| [**03-MISSING-FEATURES.md**](./03-MISSING-FEATURES.md) | **Alta** | Histórico real da semana, notificações locais nativas, ciclo de vida de timers em background, reabastecimento de recompensas e âncoras flexíveis. |
| [**04-MOBILE-UX-AND-PERFORMANCE.md**](./04-MOBILE-UX-AND-PERFORMANCE.md) | **Alta** | Remoção do encapsulamento fixo de desktop (390px), suporte a `safe-area-inset` (notches), feedback háptico e acessibilidade. |
| [**05-CODE-QUALITY-AND-TESTING.md**](./05-CODE-QUALITY-AND-TESTING.md) | **Média** | Correção de bugs pontuais no código React, supressão de `any`, suíte de testes unitários com Vitest e setup de Git/CI. |
| [**06-PRODUCTION-READINESS.md**](./06-PRODUCTION-READINESS.md) | **Crítica** | Auditoria de 2026-10-23 e o status de cada item após a conversão para PWA. |

---

## Status Atual (Concluído)

✅ **Todas as tarefas desta pasta TODO foram implementadas e integradas com sucesso!**
O app agora conta com armazenamento resiliente via `@capacitor/preferences`, sistema de streaks justo, rotinas dinâmicas, notificações locais agendadas para background timers e responsividade nativa para smartphones.

1. **Risco de Vazamento de Credenciais (Crítico)**:
   - O arquivo `android/keystore/KEYSTORE_PASSWORD.txt` expõe a senha da chave de assinatura em texto simples. Qualquer backup ou acoplamento público comprometerá a assinatura do aplicativo.
2. **Perda de Dados do Usuário (Crítico)**:
   - Se o usuário ficar mais de um dia sem abrir o app, ou se mantiver o app aberto durante a virada da meia-noite, a lógica de streak e de rollover de tarefas quebra. Além disso, o `localStorage` do WebView pode ser expurgado pelo iOS/Android sem aviso prévio.
3. **Inoperância de Timers em Segundo Plano (Alto)**:
   - Os timers de Foco (5 min) e Tornado (10 min) utilizam `setInterval` no front-end. Ao apagar a tela do celular ou alternar de aplicativo, o timer para de contar e não emite notificação ou alarme nativo.
4. **Layout Não Nativo no Celular (Alto)**:
   - O CSS define o app com tamanho fixo (`390px`, `min-height: 844px`) e margens cinzas simulando uma moldura de desktop (`padding: 40px 16px`), além de ignorar as barras de status e gestos do Android e iOS.
