# Implementation Plan

- [x] 1. Criar função de validação direta de feeds

  - [x] 1.1 Criar `validateFeedDirect()` em `feed-discovery.ts`


    - Implementar função que usa rss-parser para validar feeds
    - Adicionar timeout de 10 segundos
    - Retornar FeedValidationResult com isValid e feedInfo
    - Extrair título, descrição, itemCount e lastItemDate
    - Detectar tipo de feed automaticamente (RSS/Atom/JSON)
    - _Requirements: 1.4, 2.2, 2.3, 7.1, 7.2, 7.3, 7.4, 8.1, 8.2, 8.3, 8.4, 8.5_


  - [x] 1.2 Criar função `extractFeedInfo()`

    - Extrair título do feed
    - Extrair descrição do feed
    - Contar número de items
    - Extrair data do último item
    - Retornar objeto FeedInfo

    - _Requirements: 8.1, 8.2, 8.3, 8.4_


  - [x] 1.3 Adicionar tratamento de erros


    - Capturar erros de timeout (ETIMEDOUT)
    - Capturar erros de URL não encontrada (ENOTFOUND)
    - Capturar erros de parse
    - Retornar mensagens de erro descritivas


    - Registrar logs detalhados de cada erro
    - _Requirements: 2.5, 4.2, 4.3, 4.4_

- [ ] 2. Refatorar função `discoverFeeds()`
  - [x] 2.1 Adicionar validação direta como primeiro passo

    - Chamar `validateFeedDirect()` logo após normalizar URL
    - Se válido, retornar feed imediatamente
    - Marcar discoveryMethod como "direct"
    - Pular descoberta HTML se feed direto for válido
    - _Requirements: 1.1, 1.5, 3.1, 3.5_




  - [ ] 2.2 Atualizar interface `DiscoveredFeed`
    - Adicionar campos opcionais: description, itemCount, lastItemDate
    - Adicionar campo discoveryMethod
    - Atualizar todos os retornos para incluir novos campos


    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

  - [ ] 2.3 Implementar estratégia de fallback em 3 níveis
    - Level 1: Validação direta (já implementado em 2.1)
    - Level 2: Descoberta via HTML (já existe)
    - Level 3: Caminhos comuns (já existe)



    - Documentar cada nível no código
    - _Requirements: 3.1, 3.2, 3.3_

  - [ ] 2.4 Ordenar resultados por método de descoberta
    - Priorizar feeds descobertos por validação direta


    - Depois feeds descobertos via HTML
    - Por último feeds de caminhos comuns
    - _Requirements: 3.4, 3.5_


- [ ] 3. Melhorar validação de feeds existente
  - [ ] 3.1 Substituir `validateFeed()` por `validateFeedDirect()`
    - Remover lógica de HEAD/GET com Content-Type
    - Usar rss-parser para todas as validações
    - Atualizar todas as chamadas de validateFeed

    - _Requirements: 1.4, 2.2, 2.3_

  - [ ] 3.2 Adicionar suporte a feeds com Content-Type incorreto
    - Tentar parse mesmo se Content-Type não for feed

    - Registrar warning quando Content-Type não corresponde
    - Aceitar feeds válidos independente do Content-Type
    - _Requirements: 1.3, 2.1, 2.4_

  - [ ] 3.3 Adicionar suporte a múltiplos encodings
    - Configurar rss-parser para aceitar UTF-8, ISO-8859-1
    - Testar com feeds em diferentes encodings

    - _Requirements: 5.1_

  - [ ] 3.4 Adicionar suporte a múltiplos formatos
    - Garantir suporte a RSS 1.0, RSS 2.0
    - Garantir suporte a Atom 1.0

    - Garantir suporte a JSON Feed 1.0
    - Testar com feeds de cada formato
    - _Requirements: 5.2, 5.3, 5.4_

- [x] 4. Implementar sistema de caching

  - [ ] 4.1 Criar cache de validação
    - Criar Map para armazenar resultados
    - Adicionar timestamp a cada entrada
    - Definir TTL de 5 minutos
    - _Requirements: 6.5_


  - [ ] 4.2 Implementar lógica de cache
    - Verificar cache antes de validar
    - Retornar resultado do cache se válido
    - Armazenar resultado após validação
    - _Requirements: 6.5_


  - [ ] 4.3 Implementar limpeza de cache
    - Remover entradas expiradas (> 5 minutos)
    - Limitar tamanho do cache a 100 entradas
    - Executar limpeza periodicamente

    - _Requirements: 6.5_

- [ ] 5. Adicionar logging detalhado
  - [ ] 5.1 Adicionar logs de validação
    - Registrar cada tentativa de validação
    - Incluir URL testada e método usado


    - Registrar tempo de resposta
    - _Requirements: 4.1, 4.3_

  - [x] 5.2 Adicionar logs de erro

    - Registrar motivo de falha (timeout, HTTP error, parse error)
    - Incluir stack trace quando apropriado
    - Usar níveis de log apropriados (error, warn, info)
    - _Requirements: 4.2, 4.3_



  - [ ] 5.3 Adicionar logs de descoberta
    - Registrar quantos feeds foram encontrados
    - Registrar método de descoberta de cada feed
    - Registrar tempo total de descoberta
    - _Requirements: 4.1, 4.3_

- [ ] 6. Otimizar performance
  - [ ] 6.1 Implementar validação paralela
    - Criar função `validateMultipleFeeds()`
    - Usar Promise.all para validar múltiplas URLs
    - Aplicar em descoberta de caminhos comuns
    - _Requirements: 6.4_

  - [ ] 6.2 Otimizar timeouts
    - Usar 10s para validação direta
    - Usar 10s para fetch de HTML
    - Usar 5s para validação de caminhos comuns
    - _Requirements: 2.5, 6.1, 6.2_

  - [ ] 6.3 Limitar tamanho de download
    - Configurar limite de 1MB para feeds
    - Abortar download se exceder limite
    - _Requirements: 6.3_

- [ ] 7. Melhorar mensagens de erro para usuário
  - [ ] 7.1 Criar mensagens descritivas
    - "Feed detectado com sucesso"
    - "Nenhum feed encontrado. Tente o link direto do feed"
    - "Timeout ao validar feed. Tente novamente"
    - "Formato de feed inválido"
    - _Requirements: 4.4_

  - [ ] 7.2 Adicionar sugestões de URLs alternativas
    - Sugerir /feed, /rss, /atom quando descoberta falha
    - Mostrar URLs testadas
    - _Requirements: 4.5_

- [ ] 8. Atualizar UI de descoberta de feeds
  - [ ] 8.1 Mostrar informações dos feeds descobertos
    - Exibir título do feed
    - Exibir descrição (se disponível)
    - Exibir número de items
    - Exibir data do último item
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

  - [ ] 8.2 Adicionar indicador de método de descoberta
    - Mostrar badge "Direto" para feeds validados diretamente
    - Mostrar badge "HTML" para feeds descobertos via HTML
    - Mostrar badge "Comum" para feeds de caminhos comuns
    - _Requirements: 3.5_

- [ ] 9. Adicionar testes
  - [ ]* 9.1 Criar testes unitários
    - Testar `validateFeedDirect()` com RSS válido
    - Testar `validateFeedDirect()` com Atom válido
    - Testar `validateFeedDirect()` com JSON Feed válido
    - Testar `validateFeedDirect()` com URL inválida
    - Testar `extractFeedInfo()`
    - Testar cache hit e miss
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

  - [ ]* 9.2 Criar testes de integração
    - Testar com https://myduckisdead.org/feed/
    - Testar com feeds WordPress
    - Testar com feeds Atom
    - Testar com feeds JSON
    - Testar estratégia de fallback
    - _Requirements: 3.1, 3.2, 3.3, 3.4_

  - [ ]* 9.3 Testar manualmente na UI
    - Testar com URLs diretas de feed
    - Testar com URLs de homepage
    - Testar com URLs inválidas
    - Testar com feeds lentos
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

- [ ] 10. Documentar mudanças
  - [ ] 10.1 Atualizar comentários no código
    - Documentar `validateFeedDirect()`
    - Documentar `extractFeedInfo()`
    - Documentar estratégia de fallback
    - Documentar sistema de cache
    - _Requirements: 4.1, 4.3_

  - [ ] 10.2 Atualizar README
    - Documentar como adicionar feeds diretos
    - Documentar formatos de feed suportados
    - Documentar troubleshooting de descoberta
    - _Requirements: 4.4, 4.5_
