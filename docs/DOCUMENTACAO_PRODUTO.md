# Documentação de produto — PX Data Reembolsos

Documento orientado a **negócio e uso do sistema**: propósito, personas, fluxos e funcionalidades.

**Relacionado:** [Documentação técnica](./DOCUMENTACAO_TECNICA.md) · [Deploy Vercel](./DEPLOY_VERCEL.md) · [Deploy API](./DEPLOY_API.md)

---

## 1. Visão geral

| Item | Descrição |
|------|-----------|
| **Nome do projeto** | `pxdata-reembolsos` |
| **URL de produção (front)** | https://pxdata-reembolsos.vercel.app |
| **Propósito** | Digitalizar pedidos de reembolso de despesas corporativas com login seguro, comprovante por despesa, extração automática de dados e painel financeiro para análise e decisão. |

O colaborador envia solicitações com Google OAuth; o financeiro acompanha, aprova ou rejeita no painel admin, com opção de notificar por e-mail via modelos editáveis.

---

## 2. Público-alvo

| Persona | Descrição | O que faz no sistema |
|--------|-----------|----------------------|
| **Colaborador** | Usuário autenticado com Google | Envia reembolsos, anexa comprovantes, consulta **apenas o próprio** histórico. |
| **Financeiro / Admin** | E-mails listados em `ADMIN_EMAILS` (Railway) | Acessa `/admin`: lista solicitações, detalhes, dashboard, dados da empresa, exportação de planilha e decisões de status. |

### Administradores configurados

O acesso admin é definido **no servidor** (variável `ADMIN_EMAILS` no Railway), não no banco de dados.

**Lista de referência no repositório** (`.env.example`):

- `financeiro@pxdata.ai`
- `mayco@pxdata.ai`
- `bpofinanceiro@glip.com.br`

> **Importante:** em produção, confira no Railway se `ADMIN_EMAILS` inclui todos os e-mails desejados, separados por vírgula, **sem espaços extras**. O e-mail `bpofinanceiro@glip.com.br` está no exemplo do projeto; se ainda não aparecer no painel admin para essa conta, adicione-o na variável do Railway e redeploy a API.

---

## 3. Acesso e segurança

- **Autenticação:** Google OAuth (conta Google do colaborador).
- **Sessão:** cookie HTTP-only no servidor (`reembolso.sid`), 7 dias.
- **Mobile:** login via redirect do Google (sem popup); API acessada pelo mesmo domínio da Vercel (proxy), para sessão funcionar no iPhone/Android.
- **Isolamento:** cada colaborador vê só seus reembolsos; admin vê todos.

---

## 4. Jornada do colaborador

### 4.1 Login

1. Acessa https://pxdata-reembolsos.vercel.app
2. Clica em **Continuar com o Google**
3. No celular, é redirecionado ao Google e volta automaticamente ao app
4. Após login, vê o formulário de solicitação

### 4.2 Nova solicitação

**Dados do solicitante**

- Nome, e-mail (pré-preenchido do Google), CPF/CNPJ, endereço (opcional)
- Dados da empresa (PX) exibidos em bloco somente leitura

**Comprovantes (upload em massa)**

- Cada arquivo (PDF, JPG ou PNG, até 15 MB) vira **uma despesa**
- O sistema tenta extrair automaticamente: descrição, linha de despesa, conta contábil, valor, CNPJ do fornecedor

**Campos por despesa**

| Campo | Obrigatório | Descrição |
|-------|-------------|-----------|
| Descrição | Sim | Ex.: ferramenta de IA (com sugestões) |
| Linha de despesa | Sim | Catálogo contábil (ex.: licenciamento de software) |
| Conta contábil | Auto | Preenchida conforme a linha |
| Valor (R$) | Sim | Valor do reembolso |
| IOF | Não | Campo opcional para imposto |
| CNPJ do fornecedor | Sim* | Ou confirmação de ausência na revisão final |
| **Observação** | Não | Texto livre para informações adicionais sobre a despesa |
| Comprovante | Sim | Um arquivo por despesa |

### 4.3 Revisão final e envio

Antes de enviar, o colaborador **obrigatoriamente**:

1. Revisa todos os itens em modal dedicado
2. Confirma CPF/CNPJ e dados extraídos
3. Marca o checkbox de revisão final
4. Confirma o envio

Status inicial da solicitação: **Enviado** (pendente).

### 4.4 Histórico

- Acesso pelo botão **Histórico** ou `?view=list`
- Lista: ID (`REIMB-0001`), valor total, quantidade de despesas, status e data

---

## 5. Status da solicitação

| Status | Significado |
|--------|-------------|
| **Enviado** | Aguardando análise do financeiro |
| **Aprovado** | Aceito; pagamento segue fora do sistema |
| **Rejeitado** | Não aprovado |

O status é da **solicitação inteira**, não por linha individual.

---

## 6. Jornada do financeiro (admin)

### 6.1 Acesso

- Ícone de engrenagem no cabeçalho (visível só para admins)
- Rotas: `/admin`, `/admin?tab=dashboard`, `/admin/empresa`

### 6.2 Aba Despesas

- Lista todas as solicitações
- Detalhe: solicitante, status, total, despesas com **observação** (quando preenchida), comprovantes para download
- **Baixar planilha PX** (Excel no layout Nota Débito)
- Ações: **Aprovar**, **Reprovar**, **Contestar** (volta para Enviado)
- **Notificar por e-mail:** modelos editáveis + `mailto` (envio manual pelo gestor)

### 6.3 Aba Dashboard

- Cards: total de solicitações, valor solicitado, pendentes, aprovados
- Atividade recente e gráfico de volume por mês
- Distribuição por status

### 6.4 Aba Dados da empresa

- Nome, endereço, CNPJ e e-mail da PX
- Usados no formulário do colaborador e na exportação de planilha

---

## 7. Comprovantes e extração

- Formato: PDF, JPG, PNG (máx. 15 MB)
- Extração automática via OCR/PDF no servidor após upload
- Cada comprovante fica vinculado à despesa correspondente
- Falha na extração: colaborador preenche manualmente

---

## 8. Glossário

| Termo | Definição |
|-------|-----------|
| **Solicitação / Reembolso** | Pedido com N despesas e N comprovantes |
| **Despesa** | Linha do formulário com valores, classificação e anexo |
| **Observação** | Campo opcional de texto livre por despesa |
| **Comprovante** | Arquivo obrigatório por despesa |
| **Admin** | Usuário com e-mail em `ADMIN_EMAILS` |
| **Pendente** | Rótulo de UX para status Enviado |

---

## 9. Limitações atuais

- E-mail transacional não é enviado pelo servidor (apenas modelos + `mailto`)
- Status único por solicitação (não por despesa)
- CNPJ/IOF validados no front na revisão; persistência focada nos campos contábeis principais
- Configuração de admins e OAuth depende de variáveis de ambiente

---

## 10. Evoluções sugeridas (não implementadas)

- Notificações automáticas por e-mail
- Integração ERP / folha de pagamento
- Status por despesa ou workflow com alçadas
- Armazenamento de anexos em nuvem (S3)

---

*Última atualização: julho/2026 — inclui campo observação, login mobile e deploy Vercel + Railway.*
