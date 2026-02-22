

## Atualizar o Manual do Bolsista

O manual atual descreve o fluxo antigo de envio de relatorios (upload de PDF), mas o sistema evoluiu significativamente. Segue o plano de atualizacao completo.

---

### Mudancas necessarias no arquivo `src/pages/ScholarManual.tsx`

#### 1. Secao "5. Enviar Relatorio Mensal" -- REESCREVER COMPLETAMENTE

O manual atual descreve upload de PDF. O sistema agora usa um **formulario digital estruturado** com:
- Campos: atividades realizadas, entregas, dificuldades, proximos passos, horas dedicadas
- Salvamento automatico de rascunho a cada 15 segundos
- Botao "Salvar Rascunho" manual
- Submissao com aceite eletronico (dialog de confirmacao)
- Geracao automatica de PDF auditavel com hash SHA-256
- Status: Rascunho, Submetido, Aprovado, Devolvido

Novo conteudo:
- Acessar "Meus Pagamentos" no menu lateral
- Rolar ate a secao "Relatorio Mensal" do mes corrente
- Preencher todos os campos do formulario digital
- O sistema salva automaticamente a cada 15 segundos (indicador "Salvo" aparece no topo)
- Quando finalizar, clicar em "Submeter Relatorio"
- Confirmar a submissao no dialogo de aceite eletronico
- Apos a submissao, um PDF auditavel sera gerado automaticamente
- Dica: voce pode salvar rascunhos e voltar para editar antes de submeter

#### 2. Nova secao "6. Parecer de Inteligencia Artificial" -- ADICIONAR

Apos a decisao do gestor (aprovacao ou devolucao), o bolsista pode ver o parecer tecnico gerado por IA com:
- Quatro metricas de avaliacao (0-5): Aderencia ao Plano, Evidencia e Verificabilidade, Progresso vs Historico, Qualidade Tecnica
- Resumo e recomendacoes
- O parecer e visivel na secao do relatorio mensal e tambem no historico de relatorios

Passos:
- Apos o gestor avaliar o relatorio, o parecer IA aparece automaticamente abaixo do formulario
- Tambem pode ser acessado em "Meus Relatorios" clicando no icone de parecer IA

#### 3. Nova secao "7. Plano de Trabalho" -- ADICIONAR

O sistema agora disponibiliza o Plano de Trabalho do bolsista:
- Acessar "Documentos" no menu lateral
- Na aba "Plano de Trabalho", visualizar ou baixar o documento
- O plano de trabalho contem os objetivos e cronograma da bolsa
- Ele e usado pela IA como referencia ao avaliar os relatorios mensais

#### 4. Nova secao "8. Mensagens" -- ADICIONAR

O bolsista agora possui uma caixa de mensagens:
- Acessar "Mensagens" no menu lateral
- Visualizar mensagens recebidas do gestor
- O badge vermelho no menu lateral indica mensagens nao lidas

#### 5. Renumerar secoes existentes

Com as novas secoes, a numeracao ficara:
1. Primeiro Acesso e Cadastro (sem mudancas)
2. Alterar Foto de Perfil (sem mudancas)
3. Atualizar Dados Pessoais (sem mudancas)
4. Cadastrar/Atualizar Dados Bancarios (sem mudancas)
5. Enviar Relatorio Mensal (REESCRITO -- formulario digital)
6. Parecer de Inteligencia Artificial (NOVO)
7. Plano de Trabalho (NOVO)
8. Acompanhar Pagamentos (atualizado -- era secao 6)
9. Termo de Outorga (sem mudancas -- era secao 7)
10. Documentos Institucionais (sem mudancas -- era secao 8)
11. Mensagens (NOVO)
12. Notificacoes (sem mudancas -- era secao 9)
13. Duvidas Frequentes (atualizado com novas perguntas -- era secao 10)

#### 6. Atualizar "Duvidas Frequentes"

Adicionar novas perguntas:
- "O que e o parecer de IA?" -- Explicar que e uma avaliacao automatica do relatorio com base no plano de trabalho.
- "Posso editar o relatorio apos submeter?" -- Nao, mas se o gestor devolver, a edicao sera reaberta.
- Atualizar a pergunta sobre formato de relatorios: agora e formulario digital (nao mais upload de PDF).

#### 7. Adicionar novos icones

Importar icones adicionais: `Bot` (para IA), `ClipboardList` (para Plano de Trabalho), `MessageSquare` (para Mensagens).

---

### Resumo tecnico

- **Arquivo editado**: `src/pages/ScholarManual.tsx`
- **Tipo de mudanca**: Apenas conteudo textual e novas secoes usando os componentes existentes (`ManualSection`, `StepList`, `Tip`)
- **Sem mudancas estruturais**: Os componentes auxiliares ja existentes sao reutilizados
- **Sem dependencias novas**: Apenas icones adicionais do `lucide-react`

