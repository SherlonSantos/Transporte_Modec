# Sistema Online de Gestão de Agendamento e Transporte — MODEC / MRO

Aplicação web moderna, responsiva e dinâmica desenvolvida em **Next.js (App Router), TypeScript, Tailwind CSS e Recharts**, criada a partir da migração e evolução do painel operacional SAP VT11.

---

## 🚀 Como Executar Localmente

1. Abra o terminal na pasta do projeto:
   ```bash
   npm run dev
   ```
2. Acesse no navegador:
   ```
   http://localhost:3000
   ```

---

## 🌐 Publicação na Vercel (Passo a Passo)

### Opção 1: Via GitHub (Recomendado para CI/CD automático)
1. Crie um repositório no seu GitHub (ex: `modec-transporte-painel`).
2. Suba os arquivos da pasta `Transporte MODEC` para o repositório.
3. Acesse [vercel.com](https://vercel.com) e clique em **"Add New..." > "Project"**.
4. Selecione o repositório importado.
5. Em **Framework Preset**, a Vercel detectará automaticamente **Next.js**.
6. Clique em **Deploy**. Em menos de 2 minutos a aplicação estará no ar com link público HTTPS!

### Opção 2: Via Vercel CLI (Deploy direto do terminal)
```bash
npx vercel
```
Siga as instruções rápidas na tela para vincular à sua conta Vercel.

---

## ⚡ Conexão com Banco de Dados & Real-Time (Supabase)

A aplicação funciona **de forma 100% autônoma e imediata** com a base histórica pré-carregada (1.756 DTs).

Caso queira ativar a sincronização **Real-Time multiusuário via WebSockets**:
1. Crie um projeto gratuito em [supabase.com](https://supabase.com).
2. Adicione as variáveis no painel da Vercel (**Settings > Environment Variables**):
   * `NEXT_PUBLIC_SUPABASE_URL`
   * `NEXT_PUBLIC_SUPABASE_ANON_KEY`

---

## 📊 Módulos da Aplicação

* **Painel Gerencial**: 8 KPIs em tempo real, funil operacional, gráficos de status, faixas de aging, embarcações, itinerários, fluxo diário de 30 dias e tabela de prioridades com modal detalhado.
* **SLA & Desempenho**: Semáforo contratual consolidado, medição individual por etapa com barras de progresso, ranking de embarcações, algoritmo de detecção de gargalos e matriz de risco.
* **Kanban por Etapas**: 8 colunas de estágios do SAP VT11, cartões com cores de risco por aging, paginação sob demanda e linha do tempo de marcos ao clicar.
* **Programação / Agendamento**: Calendário diário horizontal (Hoje, D+1 ... D+30), KPIs de carga imediata, curva de volume programado e backlog de pendências de data.
* **Configurações**: De-para customizável de código SAP para nome da embarcação (persistido no navegador e sincronizável), limites gerenciais de aging e SLA contratual configurável.
* **Upload Dinâmico de Excel**: Arraste e solte novas extrações `.xlsx`, `.xls` e `.xlsm` do SAP para atualização instantânea de todos os cálculos.
