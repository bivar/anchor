# TODO: Persistência de Dados e Gerenciamento de Estado (Prioridade: CRÍTICA)

Este documento detalha os problemas de persistência, cálculo de streaks e integridade de estado no Anchor App, fornecendo a especificação técnica para as correções.

---

## 1. Falha Crítica no Rollover de Dia (Virada da Meia-Noite)
- **Localização**: `src/state/store.tsx` (`loadState` e `freshDayState`).
- **Severidade**: **CRÍTICA**
- **Diagnóstico**:
  A função `loadState()` que verifica se o dia mudou (`merged.today !== todayKey()`) só é chamada **uma única vez**: durante a inicialização do reducer (`useReducer(reducer, undefined, loadState)`).
  - Se o usuário mantiver o aplicativo aberto ou minimizado no celular de um dia para o outro, `loadState()` **nunca mais é executado**.
  - O aplicativo continuará exibindo as tarefas concluídas de ontem, a data de ontem, e nunca apresentará a tela de check-in de energia para o novo dia.
- **Plano de Correção**:
  1. Adicionar uma ação no reducer: `CHECK_DAY_ROLLOVER`.
  2. Implementar um listener de ciclo de vida (`visibilitychange` no navegador e `App.addListener('appStateChange')` do Capacitor) e um timer que verifica periodicamente se `todayKey()` mudou em relação a `state.today`.
  3. Ao detectar mudança de data com o app em execução ou em retorno do background, despachar `CHECK_DAY_ROLLOVER` para atualizar as tarefas mantendo os dados persistidos intactos.

---

## 2. Cálculo Falho de Streak (Dias Perdidos e Pulos Permitidos)
- **Localização**: `src/state/store.tsx` (linhas 51-60).
- **Severidade**: **ALTA**
- **Diagnóstico**:
  O código atual avalia o streak da seguinte forma:
  ```typescript
  if (merged.today !== todayKey()) {
    const list = merged.order;
    const doneCount = list.filter((id) => merged.blockStatus[id] === 'done').length;
    let streak = merged.streak;
    if (list.length > 0) {
      if (doneCount === list.length) streak += 1;
      else if (doneCount === 0) streak = 0;
    }
    return { ...merged, ...freshDayState(hasPet), streak, activeFlow: null, toast: null };
  }
  ```
  Existem três falhas graves nessa lógica:
  1. **Premiação indevida por dias ausentes**: Se o usuário completou tudo na segunda-feira e só abrir o aplicativo na sexta-feira (4 dias depois), `merged.today !== todayKey()` executa e vê `doneCount === list.length` da segunda-feira, **incrementando** o streak do usuário mesmo com 3 dias de ausência total!
  2. **Quebra injusta de streak em blocos pulados**: O aplicativo informa explicitamente ao usuário: *"Not today — skip, no penalty"* e *"Low energy today — it's fine to skip Tornado Cleaning. Your streak won't break"*. Porém, ao marcar um bloco como `'skipped'`, `doneCount` não será igual a `list.length`. Consequentemente, o streak **não avança**!
  3. **Dias parcialmente concluídos**: Se o usuário fez 5 de 6 tarefas, o código não entra em `doneCount === list.length` nem em `doneCount === 0`, mantendo o streak congelado no mesmo valor em vez de aplicar a regra desejada de forma transparente.
- **Plano de Correção**:
  1. Calcular a diferença real em dias entre `merged.today` e `todayKey()` (usando timestamps UTC ou biblioteca de data). Se a diferença for maior que 1 dia (ou seja, houve dias vazios intercalados), o streak deve ser zerado imediatamente (a menos que haja item de proteção de streak ativo).
  2. Considerar um dia como "concluído com sucesso" se todos os blocos do dia estiverem com status `'done'` OU `'skipped'` (respeitando a promessa de que pular sem penalidade conta como cumprimento do dia).
  3. Criar uma política explícita de "mínimo de âncoras obrigatórias": blocos essenciais (ex: `work`, `sport`, `petAM`) devem estar `'done'`, enquanto blocos secundários (ex: `tornado`, `bridge`, `focus`) podem ser `'skipped'`.

---

## 3. Fragilidade do `window.localStorage` em WebViews Mobile
- **Localização**: `src/state/store.tsx` (linha 16 e linhas 354-360).
- **Severidade**: **ALTA**
- **Diagnóstico**:
  O app utiliza exclusivamente `localStorage.setItem` e `localStorage.getItem`.
  - No iOS (WebKit / WKWebView), o sistema operacional pode purgar dados do `localStorage` de WebViews quando o dispositivo está com pouco espaço em disco ou quando o app fica inativo por longos períodos.
  - No Android, limpezas de cache e atualizações do WebView podem apagar o banco IndexedDB/WebStorage.
  - O usuário perde permanentemente seu nível, histórico, configurações do pet e streaks acumulados.
- **Plano de Correção**:
  1. Instalar o plugin oficial `@capacitor/preferences` (antigo Storage do Capacitor) ou utilizar SQLite local via `@capacitor-community/sqlite`.
  2. Criar uma camada de abstração de armazenamento assíncrona (`storage.ts`) que prioriza o storage nativo do dispositivo quando em ambiente Capacitor, com fallback para `localStorage` em modo Web.
  3. Implementar mecanismo de exportação/importação manual de dados (Backup JSON) na aba de Configurações para que o usuário possa salvar e restaurar seus dados.

---

## 4. Ausência de Histórico de Dias Anteriores (Descarte de Dados no Rollover)
- **Localização**: `src/state/store.tsx` (`freshDayState`).
- **Severidade**: **MÉDIA**
- **Diagnóstico**:
  Ao mudar de dia, `freshDayState` substitui `blockStatus: {}`, `blockXp: {}` e `energy: null`. Os dados do dia anterior são completamente sobrescritos e perdidos para sempre!
  - Não há registro de quantos dias o usuário completou nas últimas semanas.
  - Como consequência direta, o componente de histórico semanal na aba Pet (`PetTab.tsx`) usa dias e cores falsas hardcoded (`i < 5 ? ... : ...`).
- **Plano de Correção**:
  1. Criar uma coleção no estado: `history: Record<string, DaySummary>`, onde a chave é `YYYY-MM-DD` e o valor contém:
     - `energy`: Nível de energia reportado.
     - `completedBlocks`: Quantidade e IDs dos blocos feitos/pulados.
     - `xpEarned`: Total de XP ganho no dia.
     - `focusSeconds`: Tempo total focado.
  2. No momento do rollover diário, arquivar o resumo do dia anterior em `state.history` antes de resetar os blocos do novo dia.
  3. Limitar o histórico mantido no armazenamento a 60 ou 90 dias para não inflar desnecessariamente o espaço utilizado.

---

## 5. Falta de Versionamento de Schema e Resiliência contra Corrupção
- **Localização**: `src/state/store.tsx` (`loadState`).
- **Severidade**: **MÉDIA**
- **Diagnóstico**:
  Caso ocorra uma exceção no `JSON.parse` ou se um campo for modificado em um novo release, o bloco `catch` executa:
  ```typescript
  } catch {
    return initialState();
  }
  ```
  Isso apaga completamente todo o progresso do usuário sem qualquer aviso ou tentativa de recuperação de campos válidos.
- **Plano de Correção**:
  1. Incluir `schemaVersion: number` no `AppState`.
  2. Implementar função de migração: `migrateState(rawJson: unknown): AppState`.
  3. Manter uma cópia de backup do último estado válido (`STORAGE_KEY_BACKUP`) antes de tentar sobrescrever o storage principal.
