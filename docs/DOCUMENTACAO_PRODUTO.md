# Documentação de produto — PX Data Reembolsos

Documento orientado a **negócio e uso do sistema**, descrevendo propósito, personas, fluxos e funcionalidades. Para arquitetura, API e ambiente, veja a [documentação técnica](./DOCUMENTACAO_TECNICA.md).

---

## 1. Visão geral

**Nome interno do projeto:** `pxdata-reembolsos`  

**Propósito:** digitalizar o pedido de reembolso de despesas corporativas, com **login seguro**, **formulário estruturado**, **comprovante por despesa** e **painel para o financeiro** acompanhar métricas e registrar decisões (aprovação, reprovação, contestação), com **comunicação opcional por e-mail** ao colaborador.

**Stack em alto nível:** aplicação web (React + Vite), API própria (Node/Express), banco SQLite (Prisma), arquivos de comprovante armazenados no servidor.

---

## 2. Público-alvo

| Persona | Descrição | O que faz no sistema |
|--------|-----------|----------------------|
| **Colaborador** | Usuário autenticado com Google | Envia solicitações de reembolso, anexa comprovantes, consulta **apenas o próprio** histórico. |
| **Financeiro / Admin** | E-mails configurados como administradores | Lista todas as solicitações, abre detalhes, altera status, usa modelos de e-mail, acessa **Dashboard** e **Dados da empresa**. |

---

## 3. Acesso e segurança

- **Autenticação:** login com **Google OAuth** (conta corporativa permitida nas configurações do projeto).
- **Sessão:** mantida no servidor; o front consome rotas `/api/...` com credenciais (cookies).
- **Administração:** apenas usuários cujo e-mail consta em `ADMIN_EMAILS` (variável de ambiente no servidor) têm acesso ao painel administrativo e às rotas `/api/admin/...`.
- **Isolamento de dados:** colaboradores veem somente reembolsos vinculados ao próprio login; o admin vê o conjunto completo.

---

## 4. Jornada do colaborador

### 4.1 Entrada e login

1. Acessa a URL da aplicação (ex.: `http://localhost:5173` em desenvolvimento).
2. Faz login com Google.
3. Se as variáveis de OAuth não estiverem configuradas, o sistema exibe orientação de configuração em vez do botão de login.

### 4.2 Nova solicitação (formulário principal)

Após o login, o usuário preenche:

- **Dados do solicitante:** nome, endereço, documento (CPF/CNPJ), e-mail (com apoio de dados da empresa quando configurados).
- **Uma ou mais despesas** na mesma solicitação, cada uma com:
  - **Descrição** (com sugestões, ex.: ferramentas de IA).
  - **Linha de despesa** (ex.: Alimentação, Viagem, Software/Assinatura).
  - **Conta contábil** — preenchida automaticamente conforme a linha de despesa, podendo ser ajustada.
  - **Valor (R$)**.
  - **Comprovante obrigatório** por despesa (PDF ou imagem).

**Regras de negócio relevantes:**

- É obrigatório **um arquivo por despesa**; a ordem dos arquivos no envio corresponde à ordem das despesas no formulário.
- Para **PDF**, o sistema pode sugerir preenchimento de valor a partir do texto do documento (quando aplicável); imagens exigem valor manual.
- O **total do reembolso** é a soma das despesas e é exibido de forma destacada.

### 4.3 Envio

- Ao enviar com sucesso, a solicitação é criada com status inicial **Enviado** (pendente de análise).
- O usuário pode ser direcionado ao **histórico** da própria conta.

### 4.4 Histórico

- Lista solicitações do usuário: identificador, valores, quantidade de despesas, **status** e data.
- Parâmetro de URL `?view=list` pode ser usado para abrir diretamente a visão de lista.
- O colaborador **não** altera o status pelo painel principal; isso é papel do financeiro (ou fluxos futuros).

---

## 5. Estados da solicitação (status)

| Status (sistema) | Significado para o produto |
|------------------|----------------------------|
| **Enviado** (`enviado`) | Pendente de análise pelo financeiro. No dashboard admin aparece como “Pendente”. |
| **Aprovado** (`aprovado`) | Solicitação aceita; segue o fluxo de pagamento/reembolso da empresa (fora deste sistema). |
| **Rejeitado** (`rejeitado`) | Solicitação não aprovada. |

**Observação:** o status é da **solicitação inteira** (reembolso), não por linha de despesa individual na base de dados. Na interface admin, ações por item orientam decisão e comunicação, mas a atualização de status aplica-se ao reembolso como um todo.

---

## 6. Jornada do financeiro (administração)

### 6.1 Acesso

- Menu **Administração** (ícone de configurações) no cabeçalho — visível apenas para admins.
- Rotas principais: `/admin`, `/admin?tab=dashboard`, `/admin/empresa`.

### 6.2 Aba **Despesas**

- Lista todas as solicitações.
- Ao abrir um item, modal com: dados do solicitante, status, total, endereço, **itens** com comprovante (nome do arquivo + download), ações de decisão e notificação.

**Ações por item (fluxo atual):**

| Ação | Efeito imediato | E-mail |
|------|-----------------|--------|
| **Aprovar** | Status → **Aprovado** | Opcional: botão **Notificar por e-mail** ao lado das ações (modelo conforme status atual). |
| **Reprovar** | Status → **Rejeitado** | Idem. |
| **Contestar** | Status → **Enviado** (volta a pendente / contestação) | Idem. |

- **Toast** confirma a alteração de status **sem** abrir o modal de e-mail automaticamente.
- O **modal de e-mail** mantém assunto, corpo editável, copiar e abrir cliente de e-mail (`mailto`); é **independente** da gravação do status.

### 6.3 Aba **Dashboard**

- **Cards:** total de solicitações, valor total solicitado, pendentes, aprovados.
- **Atividade recente:** últimas solicitações com solicitante, valor, status (rótulos amigáveis), data; clique abre detalhes.
- **Status:** distribuição pendente / aprovado / rejeitado com barras.
- **Gráfico:** evolução de valores por mês (com base nas solicitações carregadas).

### 6.4 Aba **Dados da empresa**

- Cadastro usado para **pré-preencher** ou exibir informações institucionais no formulário do colaborador (nome, endereço, CNPJ, e-mail da empresa).
- Editável apenas por admin.

---

## 7. Comprovantes e consistência

- Cada despesa deve ter **comprovante associado** no envio.
- No armazenamento, o vínculo preferencial é por **`expenseId`** (despesa).
- Registros antigos sem vínculo podem ser **associados na leitura** pelo admin para exibição coerente (heurística no servidor); o ideal operacional é que novos envios sempre gravem o vínculo corretamente.

---

## 8. Laboratório de extração (`/lab/extracao`)

- Área **interna** para testes de leitura de documento (texto / PDF / OCR conforme implementação).
- Não faz parte do fluxo obrigatório do colaborador; serve a **validação técnica** e melhoria das heurísticas de valor.

---

## 9. Glossário rápido

| Termo | Definição |
|-------|-----------|
| **Solicitação / Reembolso** | Um pedido com N despesas e N comprovantes. |
| **Despesa** | Linha do formulário: descrição, linha contábil, conta, valor, anexo. |
| **Comprovante** | Arquivo (PDF ou imagem) obrigatório por despesa no envio. |
| **Admin** | Usuário financeiro com permissões elevadas. |
| **Pendente** | Rótulo de UX para status **Enviado** na visão consolidada. |

---

## 10. Limitações e considerações de produto

- **E-mail:** não há envio automático pelo servidor; o produto oferece **modelos** e atalho para o cliente de e-mail do gestor.
- **Status único por solicitação:** decisões “por item” na UI não criam status diferentes por despesa no modelo de dados atual.
- **Ambiente:** URLs, OAuth e lista de admins dependem de **configuração** (`.env`); comportamento em produção deve ser revisado (HTTPS, domínios autorizados no Google, etc.).

---

## 11. Roadmap sugerido (não implementado)

Ideias frequentes para evolução de produto (referência apenas):

- Status por despesa ou workflow com etapas.
- Notificações por e-mail transacionais no backend.
- Integração com ERP / folha.
- Políticas de limite e alçadas.
- Auditoria formal de quem alterou status e quando.

---

*Documento gerado com base na versão atual do repositório. Atualize este arquivo quando houver mudanças relevantes de fluxo ou de regra de negócio.*
