# Changelog - Melhorias de UX Implementadas

## Versão 2025.1.1 - 01/2025

### 🎨 Melhorias Visuais

#### Paginação Nova
- Botões Previous/Next redesenhados com hover effects e animações
- Números de página maiores (40x40px) com bordas e sombras
- Reticências (...) para páginas omitidas
- Design responsivo que se adapta a mobile
- Indicadores de primeira e última página
- Animações suaves em todas as interações

#### Tempo Relativo
- Adicionado sistema de tempo relativo em português
- Mostra "há 2 horas", "há 3 dias" ao invés de data absoluta
- Tooltip com data completa ao passar o mouse
- Atualização automática a cada minuto

#### Feed Status Indicators
- Badges coloridos ao lado do nome do feed
- Verde (success) - Feed funcionando normalmente
- Vermelho (error) - Erro ao atualizar feed
- Amarelo (warning) - Sem atualizações recentes
- Cinza (pending) - Aguardando atualização
- Tooltips informativos em cada badge

### 🔍 Funcionalidades Novas

#### Sistema de Busca
- Campo de busca no formulário de filtros
- Busca em título, resumo e autor dos artigos
- Contador de resultados com destaque
- Busca preservada na paginação
- Mensagens contextuais para resultados

#### Ordenação Customizável
- Opção "Mais recentes" (padrão)
- Opção "Mais antigos"
- Opção "Título (A-Z)"
- Opção "Por feed"
- Preferência mantida na paginação

#### Marcação de Artigos Lidos
- Sistema de rastreamento com localStorage
- Marcação automática ao clicar em um artigo
- Ícone ✓ verde para artigos lidos
- Opacidade reduzida para artigos lidos
- Persistência local (até 10.000 artigos)

### 🖼️ Melhorias de Imagens

#### Tratamento Inteligente
- Placeholder para imagens quebradas
- Estados loading/loaded/error
- Emoji de placeholder quando imagem não carrega
- Transições suaves entre estados
- Lazy loading nativo do navegador

### ♿ Acessibilidade

#### Melhorias WCAG
- Skip link para conteúdo principal
- ARIA roles apropriados (banner, main, contentinfo)
- Contraste WCAG AA em todos os elementos
- Focus indicators visíveis (outline 3px)
- Linguagem pt-BR definida no HTML
- Atributos aria-label em botões e links
- Support para navegação por teclado

### 💬 Empty States

#### Mensagens Contextuais
- Mensagens diferentes para cada situação
- Feed filtrado vs todos os feeds
- Sugestões de ação apropriadas
- Botões de ação úteis
- Links para resolver problemas

### 📦 Arquivos Novos

- `app/web/static/timeago.js` - Sistema de tempo relativo
- `app/web/static/read-tracker.js` - Rastreamento de artigos lidos

### 🔧 Arquivos Modificados

- `app/web/static/styles.css` - Estilos completos das novas features
- `app/web/templates/index.html` - Templates com novas funcionalidades
- `app/web/templates/base.html` - ARIA roles e skip link
- `app/web/server.py` - Endpoints de busca e ordenação
- `app/core/storage.py` - Métodos de busca, ordenação e status
- `Dockerfile` - Adicionado curl para healthcheck

### 🐛 Correções

- Corrigido bug de tema compartilhado usando chave namespaced
- Adicionado logs de debug para tema
- Headers de cache apropriados para arquivos estáticos
- Dockerfile atualizado com curl instalado

### 📊 Estatísticas

- 9 features principais implementadas
- 100% do plano executado
- 0 erros de lint
- Build Docker testada e aprovada
- Compatível com dark mode em todas as features

### 🚀 Deploy Ready

Todas as funcionalidades foram testadas e estão prontas para produção. O sistema mantém a filosofia minimalista enquanto adiciona poderosas funcionalidades de UX.

