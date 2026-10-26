# TODO: Funcionalidades Faltantes e Incompletas (Prioridade: ALTA)

Este documento descreve os recursos parcialmente desenvolvidos, dados simulados que precisam de implementação real e as funcionalidades essenciais pendentes no Anchor App.

---

## 1. Histórico Semanal Real na Aba Pet/Perfil
- **Localização**: `src/screens/PetTab.tsx` (linhas 20-33).
- **Severidade**: **ALTA**
- **Diagnóstico**:
  A visualização da semana ("This week") exibe dados puramente fictícios através de um ternário estático sobre índices numéricos:
  ```tsx
  <div className="week-strip">
    {WEEK_LABELS.map((label, i) => (
      <div key={i}>
        <div
          className="week-swatch"
          style={{ background: i < 5 ? 'var(--color-accent-2-400)' : i === 5 ? 'var(--color-accent-2-200)' : 'var(--color-neutral-200)' }}
        />
        <div className="week-label">{label}</div>
      </div>
    ))}
  </div>
  ```
  O usuário sempre vê os dias de segunda a sexta como preenchidos e sábado/domingo desbotados, independentemente de ter usado o aplicativo ou não.
- **Plano de Implementação**:
  1. Conectar o componente ao `state.history` (definido no documento de persistência).
  2. Determinar o status real dos últimos 7 dias da semana corrente (de Segunda a Domingo):
     - Dia concluído com sucesso: Verde escuro (`var(--color-accent-2-500)`).
     - Dia com tarefas parciais: Verde claro (`var(--color-accent-2-200)`).
     - Dia perdido: Cinza neutro (`var(--color-neutral-200)`).
     - Dia atual: Borda destacada ou anel de progresso.
  3. Permitir clicar em um dia anterior para visualizar o que foi realizado (resumo histórico).

---

## 2. Timers Baseados em Timestamp e Notificações Locais em Segundo Plano
- **Localização**: `src/state/store.tsx` (linhas 362-373), `src/flows/FocusFlow.tsx`, `src/flows/TornadoFlow.tsx`.
- **Severidade**: **ALTA**
- **Diagnóstico**:
  Os timers de 5 minutos (Focus) e 10 minutos (Tornado) operam decrementando um contador numérico a cada 1000ms via `setInterval`:
  - No celular, quando a tela é desligada ou o usuário muda de app, os navegadores e o WebView suspendem a execução do JavaScript para poupar bateria.
  - Ao reabrir o app após 10 minutos, o timer mal avançou 30 segundos!
  - O usuário não recebe nenhum aviso sonoro ou notificação push quando o tempo acaba com o celular bloqueado.
- **Plano de Implementação**:
  1. **Migrar para Timestamps**: Em vez de `seconds: 300`, armazenar no estado `targetTimestamp: number` (`Date.now() + 300 * 1000`). O cálculo dos segundos restantes na tela deve ser `Math.max(0, Math.ceil((targetTimestamp - Date.now()) / 1000))`. Dessa forma, o timer estará matematicamente exato ao retornar do background.
  2. **Notificações Nativas via Capacitor**:
     - Instalar `@capacitor/local-notifications`.
     - Ao iniciar o timer de 5 minutos, agendar uma notificação local precisa para `targetTimestamp`: *"Seus 5 minutos acabaram! Deseja continuar ou finalizar?"*.
     - Se o usuário concluir antes, cancelar a notificação agendada.
  3. **Controles de Pausa/Retomada**:
     - Adicionar botões "Pausar" e "Retomar" no `FocusFlow` e no `TornadoFlow` para interrupções do dia a dia (ligações, campainha, etc.).

---

## 3. Reformulação da Economia de Recompensas (Loja de Ouro)
- **Localização**: `src/screens/QuestsTab.tsx`, `src/state/store.tsx` (`REDEEM`).
- **Severidade**: **ALTA**
- **Diagnóstico**:
  1. **Bloqueio permanente**: Ao resgatar uma recompensa (ex: "Order takeout"), o ID é inserido em `claimedRewards` e o botão fica eternamente desabilitado como `Claimed`. O usuário nunca mais pode gastar seu ouro nessa recompensa.
  2. **Recompensa sem efeito prático**: A recompensa "Skip Tornado, no penalty" (30 de ouro) deduz o saldo, mas não possui qualquer integração com o reducer ou com o bloco de limpeza do dia.
- **Plano de Implementação**:
  1. Criar tipos de recompensas:
     - `one-time`: Desbloqueáveis únicos (ex: skins, cosméticos futuros).
     - `repeatable`: Recompensas consumíveis (ex: Pedir comida, Ver filme), que podem ser resgatadas múltiplas vezes ou possuem um cooldown de 24h.
     - `consumable-perk`: "Skip Tornado Pass", que incrementa um contador `state.inventory.tornadoSkips` e pode ser consumido automaticamente ou via botão no card do Tornado no dia de hoje.
  2. Adicionar funcionalidade para o usuário cadastrar suas próprias recompensas personalizadas (título, descrição, custo em ouro e ícone).

---

## 4. Configuração Real de Âncoras e Horários
- **Localização**: `src/screens/SettingsTab.tsx` (linhas 57-79).
- **Severidade**: **MÉDIA**
- **Diagnóstico**:
  A tela de configurações apresenta "Fixed anchors" com campos congelados:
  - Horário de trabalho travado como `9:00 AM – 5:00 PM` em um input `readOnly`.
  - Pilates travado às terças e quintas sem opção de alterar dias ou trocar de modalidade.
- **Plano de Implementação**:
  1. Transformar o horário de trabalho em campos editáveis (Início / Término / Duração em horas).
  2. Permitir escolher os dias da semana de cada atividade física (ex: Segunda/Quarta/Sexta para Academia, Terça/Quinta para Pilates ou corrida).
  3. Atualizar `sportForToday()` em `constants.ts` para ler as preferências dinâmicas configuradas no estado.

---

## 5. Ativação da Frequência de Check-in (`checkinFrequency`)
- **Localização**: `src/state/types.ts`, `src/screens/SettingsTab.tsx`.
- **Severidade**: **MÉDIA**
- **Diagnóstico**:
  Existe a opção de alternar entre "Once a day" e "A few times", salva em `state.checkinFrequency`, porém ela não altera absolutamente nada no comportamento do app.
- **Plano de Implementação**:
  1. Quando configurado como `'few'`: Disparar re-avaliações breves de energia após blocos longos (ex: após o bloco de trabalho ou após o esporte).
  2. Quando configurado como `'once'`: Manter o check-in único no topo da manhã e não requisitar novas entradas de energia durante o fluxo normal.

---

## 6. Personalização de Listas de Tarefas (Launchpad e Tornado)
- **Localização**: `src/flows/LaunchpadFlow.tsx`, `src/flows/TornadoFlow.tsx`, `src/state/constants.ts`.
- **Severidade**: **MÉDIA**
- **Diagnóstico**:
  - A rotina matinal ("Launchpad") possui 4 ou 5 tarefas fixas (`Water + meds`, `Make the bed`, etc.). O usuário não consegue adicionar suas próprias tarefas da manhã nem desmarcar tarefas que não se aplicam a ele.
  - O Tornado sorteia 3 tarefas aleatórias de uma lista estática. Se a tarefa sorteada for "Take out the trash" e o lixo já estiver vazio, o usuário não tem opção de re-sortear ou trocar de tarefa.
- **Plano de Implementação**:
  1. Permitir edição da lista de itens matinais do Launchpad nas configurações.
  2. Adicionar botão de "Re-sortear tarefa" no Tornado Cleaning antes de iniciar o timer.

---

## 7. Acessibilidade e Fechamento no `LogDialog`
- **Localização**: `src/flows/LogDialog.tsx`.
- **Severidade**: **MÉDIA**
- **Diagnóstico**:
  Ao abrir o diálogo de registro de bloco (`LogDialog`), não existe botão "X", botão "Cancelar" e clicar no backdrop cinza não fecha o diálogo. O usuário é forçado a preencher os dados mesmo que tenha clicado acidentalmente.
- **Plano de Implementação**:
  Adicionar botão de fechar (`flow-close`) e manipular o clique no backdrop para disparar `dispatch({ type: 'CLOSE_FLOW' })`.
