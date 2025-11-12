# Requirements Document

## Introduction

O sistema atual de descoberta de feeds do TheFeeder não está detectando todos os tipos de feeds RSS/Atom, mesmo quando o usuário fornece o link direto do feed. Por exemplo, o feed https://myduckisdead.org/feed/ não é detectado corretamente. Este documento define os requisitos para melhorar a detecção e validação de feeds, garantindo que o sistema reconheça todos os formatos válidos de feeds RSS, Atom e JSON.

## Glossary

- **Feed Discovery System**: O sistema de descoberta automática de feeds do TheFeeder
- **Direct Feed URL**: URL que aponta diretamente para um arquivo de feed (RSS/Atom/JSON)
- **Feed Validation**: Processo de verificar se uma URL contém um feed válido
- **Content-Type Header**: Header HTTP que indica o tipo de conteúdo retornado
- **Feed Parser**: Biblioteca que interpreta e valida a estrutura de feeds
- **Fallback Strategy**: Estratégia alternativa quando o método principal falha

## Requirements

### Requirement 1

**User Story:** Como usuário, quero adicionar feeds fornecendo o link direto do feed, para que eu possa assinar qualquer feed válido sem depender de descoberta automática

#### Acceptance Criteria

1. WHEN THE Feed Discovery System recebe uma URL direta de feed, THE Feed Discovery System SHALL tentar validar a URL como feed antes de buscar por feeds na página HTML
2. WHEN THE Feed Discovery System valida uma URL, THE Feed Discovery System SHALL aceitar feeds com Content-Type `application/rss+xml`, `application/atom+xml`, `application/xml`, `text/xml`, ou `application/json`
3. WHEN THE Feed Discovery System valida uma URL, THE Feed Discovery System SHALL aceitar feeds mesmo se o Content-Type for `text/html` mas o conteúdo for XML/RSS válido
4. THE Feed Discovery System SHALL usar o rss-parser para validar a estrutura do feed ao invés de apenas verificar o Content-Type
5. WHEN uma URL direta de feed é válida, THE Feed Discovery System SHALL retornar apenas esse feed sem buscar por outros feeds na página

### Requirement 2

**User Story:** Como usuário, quero que o sistema detecte feeds mesmo quando os servidores não retornam Content-Type correto, para que eu possa assinar feeds de sites mal configurados

#### Acceptance Criteria

1. WHEN o Content-Type header não indica um feed, THE Feed Discovery System SHALL tentar fazer parse do conteúdo como feed
2. THE Feed Discovery System SHALL usar o rss-parser library para validar se o conteúdo é um feed válido
3. WHEN o parse do feed é bem-sucedido, THE Feed Discovery System SHALL considerar a URL como feed válido independente do Content-Type
4. THE Feed Discovery System SHALL registrar warnings quando o Content-Type não corresponde ao conteúdo real
5. THE Feed Discovery System SHALL ter timeout de 10 segundos para validação de feeds

### Requirement 3

**User Story:** Como usuário, quero que o sistema tente múltiplas estratégias para detectar feeds, para maximizar a chance de encontrar feeds válidos

#### Acceptance Criteria

1. THE Feed Discovery System SHALL implementar estratégia de fallback em 3 níveis: validação direta, descoberta HTML, e caminhos comuns
2. WHEN a validação direta falha, THE Feed Discovery System SHALL buscar por links de feed no HTML da página
3. WHEN a descoberta HTML não encontra feeds, THE Feed Discovery System SHALL tentar caminhos comuns de feed
4. THE Feed Discovery System SHALL retornar todos os feeds válidos encontrados, não apenas o primeiro
5. THE Feed Discovery System SHALL ordenar os resultados priorizando feeds descobertos por validação direta

### Requirement 4

**User Story:** Como desenvolvedor, quero que o sistema de validação de feeds seja robusto e forneça feedback claro, para facilitar debugging e manutenção

#### Acceptance Criteria

1. THE Feed Discovery System SHALL registrar logs detalhados de cada tentativa de validação
2. WHEN uma validação falha, THE Feed Discovery System SHALL registrar o motivo da falha (timeout, erro HTTP, parse error, etc)
3. THE Feed Discovery System SHALL incluir a URL testada e o método usado em cada log
4. THE Feed Discovery System SHALL retornar mensagens de erro descritivas para o usuário quando nenhum feed é encontrado
5. THE Feed Discovery System SHALL incluir sugestões de URLs alternativas quando a descoberta falha

### Requirement 5

**User Story:** Como usuário, quero que o sistema suporte feeds com diferentes encodings e formatos, para poder assinar feeds internacionais e de diferentes plataformas

#### Acceptance Criteria

1. THE Feed Discovery System SHALL suportar feeds com encoding UTF-8, ISO-8859-1, e outros encodings comuns
2. THE Feed Discovery System SHALL suportar RSS 1.0, RSS 2.0, Atom 1.0, e JSON Feed 1.0
3. THE Feed Discovery System SHALL suportar feeds com ou sem declaração XML
4. THE Feed Discovery System SHALL suportar feeds com namespaces customizados
5. THE Feed Discovery System SHALL normalizar URLs de feeds removendo parâmetros desnecessários

### Requirement 6

**User Story:** Como usuário, quero que o sistema valide feeds de forma eficiente, para que a descoberta seja rápida mesmo testando múltiplas URLs

#### Acceptance Criteria

1. THE Feed Discovery System SHALL usar método HEAD antes de GET quando possível para economizar bandwidth
2. WHEN o método HEAD não retorna informação suficiente, THE Feed Discovery System SHALL fazer fallback para GET
3. THE Feed Discovery System SHALL limitar o download de conteúdo a 1MB para validação
4. THE Feed Discovery System SHALL fazer validações em paralelo quando testar múltiplas URLs
5. THE Feed Discovery System SHALL cachear resultados de validação por 5 minutos para evitar requisições duplicadas

### Requirement 7

**User Story:** Como usuário, quero que o sistema detecte automaticamente o tipo de feed, para que eu não precise especificar se é RSS, Atom ou JSON

#### Acceptance Criteria

1. THE Feed Discovery System SHALL detectar automaticamente o tipo de feed baseado no conteúdo
2. WHEN o feed contém tag `<rss`, THE Feed Discovery System SHALL identificar como RSS
3. WHEN o feed contém tag `<feed` com namespace Atom, THE Feed Discovery System SHALL identificar como Atom
4. WHEN o feed é JSON válido com propriedade `version`, THE Feed Discovery System SHALL identificar como JSON Feed
5. THE Feed Discovery System SHALL retornar o tipo detectado junto com a URL do feed

### Requirement 8

**User Story:** Como usuário, quero que o sistema forneça informações sobre os feeds descobertos, para que eu possa escolher qual feed adicionar quando múltiplos são encontrados

#### Acceptance Criteria

1. THE Feed Discovery System SHALL extrair o título do feed quando disponível
2. THE Feed Discovery System SHALL extrair a descrição do feed quando disponível
3. THE Feed Discovery System SHALL contar o número de items no feed
4. THE Feed Discovery System SHALL incluir a data do último item quando disponível
5. THE Feed Discovery System SHALL retornar essas informações junto com a URL do feed
