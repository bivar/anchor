# TODO: Qualidade de Código, Tipagem e Testes (Prioridade: MÉDIA)

Este documento trata de bugs pontuais no código TypeScript/React, refinamento de algoritmos, ausência de testes e configuração de engenharia do repositório.

---

## 1. Correção de Typos e Inconsistências de Código
- **Localização**: `src/screens/Setup.tsx` (linha 51).
- **Severidade**: **BAIXA**
- **Diagnóstico**:
  Há um ternário redundante no label do nome do animal:
  ```tsx
  <label>What's {species === 'dog' ? 'their' : 'their'} name?</label>
  ```
  O operador ternário retorna a mesma string `'their'` para ambos os lados da condição.
- **Plano de Correção**:
  Substituir simplesmente por:
  ```tsx
  <label>What's their name?</label>
  ```
  ou diferenciar adequadamente caso haja distinção intencional.

---

## 2. Algoritmo de Embaralhamento Enviesado em Tarefas do Tornado
- **Localização**: `src/state/constants.ts` (linha 236).
- **Severidade**: **MÉDIA**
- **Diagnóstico**:
  O sorteio das tarefas de limpeza rápida utiliza:
  ```typescript
  export function pickTornadoTasks(pet: PetConfig): string[] {
    const pool = tornadoTasksFor(pet);
    return [...pool].sort(() => Math.random() - 0.5).slice(0, 3);
  }
  ```
  O método `sort(() => Math.random() - 0.5)` é um anti-pattern estatístico bem documentado que gera distribuições não-uniformes (itens no início do array têm menor probabilidade de deslocamento para certas posições).
- **Plano de Correção**:
  Implementar o algoritmo clássico e uniforme de **Fisher-Yates (Knuth) Shuffle**:
  ```typescript
  export function shuffle<T>(array: readonly T[]): T[] {
    const copy = [...array];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }

  export function pickTornadoTasks(pet: PetConfig): string[] {
    return shuffle(tornadoTasksFor(pet)).slice(0, 3);
  }
  ```

---

## 3. Eliminação de Casts `as any` e Validação de Ícones
- **Localização**: `src/screens/TodayTab.tsx`, `src/screens/QuestsTab.tsx`.
- **Severidade**: **MÉDIA**
- **Diagnóstico**:
  Para contornar tipagem de ícones, os componentes utilizam coerção forçada:
  ```tsx
  <Icon name={activeBlock.iconName as any} size={18} />
  <Icon name={item.iconName as any} size={16} />
  <Icon name={r.iconName as any} size={18} />
  ```
  Se um novo bloco ou recompensa for criado com um nome de ícone inválido ou digitado incorretamente, o TypeScript não acusará erro em tempo de compilação, resultando em renderização de SVG vazio em tempo de execução.
- **Plano de Correção**:
  1. Tipar estritamente `BlockMeta.iconName` e `Reward.iconName` como `IconName` (importado de `Icon.tsx`).
  2. Remover todos os `as any` no JSX, garantindo verificação estrita em tempo de compilação via `tsc`.

---

## 4. Implementação de Testes Automatizados com Vitest
- **Localização**: Raiz do projeto / `package.json`.
- **Severidade**: **ALTA**
- **Diagnóstico**:
  Atualmente, o projeto possui **0 (zero) testes unitários**. Toda a lógica central de negócio:
  - Cálculo de XP e níveis (`award`).
  - Lógica de rollover de dia e streak (`loadState` / `freshDayState`).
  - Geração de ordem de blocos baseada em nível de energia e presença de pet (`orderFor`).
  - Reducer de transição de fluxos (`FocusFlow`, `LaunchpadFlow`, `TornadoFlow`).
  está desprovida de testes automatizados, permitindo que alterações acidentais causem regressões invisíveis.
- **Plano de Correção**:
  1. Instalar dependências de teste:
     ```bash
     npm install -D vitest @testing-library/react @testing-library/jest-dom jsdom
     ```
  2. Configurar `vite.config.ts` para habilitar o runner de testes:
     ```typescript
     /// <reference types="vitest" />
     import { defineConfig } from 'vite';
     import react from '@vitejs/plugin-react';

     export default defineConfig({
       plugins: [react()],
       test: {
         globals: true,
         environment: 'jsdom',
       },
     });
     ```
  3. Criar suítes de testes prioritárias em `src/__tests__/`:
     - `award.test.ts`: Validar ganho de nível exponencial, distribuição de ouro e limites.
     - `orderFor.test.ts`: Validar posicionamento correto de blocos de pet (AM/PM) e blocos de baixa/alta energia.
     - `streak.test.ts`: Validar incremento em dias consecutivos e zeramento em dias pulados.

---

## 5. Inicialização do Repositório Git e Governança de Branches
- **Localização**: Raiz do projeto.
- **Severidade**: **ALTA**
- **Diagnóstico**:
  O diretório local `/home/rebecaandradebivar/Documentos/PESSOAL/CODES/anchor-app` não possui repositório Git inicializado (`.git`).
  - Impossibilidade de rastreamento de histórico, reversão de falhas ou execução de revisões de código baseadas em diff.
  - Risco de perda acidental de código sem snapshot de controle de versão.
- **Plano de Correção**:
  1. Validar que o `.gitignore` já cobre adequadamente arquivos de build, keystore e dependências.
  2. Executar inicialização formal do repositório:
     ```bash
     git init
     git add .
     git commit -m "feat: initial commit of Anchor App codebase"
     git branch -M main
     ```
  3. Adicionar linter e formatador (`eslint` e `prettier`) com scripts no `package.json`:
     ```bash
     npm run lint
     npm test
     ```
