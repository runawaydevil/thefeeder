# Implementation Plan

- [ ] 1. Criar infraestrutura de temas
  - [x] 1.1 Criar ThemeContext



    - Criar arquivo `apps/web/src/contexts/ThemeContext.tsx`
    - Definir type Theme = "vaporwave" | "clean"
    - Definir interface ThemeContextType
    - Criar ThemeContext com createContext
    - _Requirements: 1.1, 1.2_

  - [x] 1.2 Criar ThemeProvider

    - Implementar componente ThemeProvider
    - Adicionar estado theme com useState
    - Carregar tema do localStorage no useEffect
    - Aplicar data-theme no document.documentElement
    - Implementar função setTheme que salva no localStorage
    - Implementar função toggleTheme
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 2.1, 2.2, 2.3_

  - [x] 1.3 Criar hook useTheme

    - Criar arquivo `apps/web/src/hooks/useTheme.ts`
    - Implementar hook que usa useContext(ThemeContext)
    - Adicionar validação de uso dentro do Provider
    - Exportar hook
    - _Requirements: 1.1, 1.2_

  - [x] 1.4 Adicionar sincronização entre abas


    - Adicionar listener para storage event
    - Atualizar tema quando outra aba mudar
    - Dispatch storage event ao mudar tema
    - _Requirements: 2.5_

- [ ] 2. Criar sistema de CSS Variables
  - [x] 2.1 Criar arquivo de temas

    - Criar `apps/web/app/themes.css`
    - Definir CSS variables em :root
    - Definir variável --theme-transition
    - _Requirements: 6.1, 6.2, 7.1, 7.2_

  - [x] 2.2 Definir variáveis do tema Vaporwave

    - Criar seletor [data-theme="vaporwave"]
    - Definir --color-bg-primary, --color-bg-secondary
    - Definir --color-text-primary, --color-text-secondary
    - Definir --color-accent-primary (pink), --color-accent-secondary (cyan)
    - Definir --color-border
    - Definir --font-heading (Orbitron), --font-body
    - Definir --shadow-glow, --shadow-card
    - Definir --effect-scanlines, --effect-grid, --effect-stars (block)
    - _Requirements: 1.1, 3.1, 3.2, 3.3, 3.4, 3.5_

  - [x] 2.3 Definir variáveis do tema Clean

    - Criar seletor [data-theme="clean"]
    - Definir --color-bg-primary (#FFFFFF), --color-bg-secondary (#FAFAFA)
    - Definir --color-text-primary (#1A1A1A), --color-text-secondary (#4A4A4A)
    - Definir --color-accent-primary (#0066CC), --color-accent-secondary (#000000)
    - Definir --color-border (#E0E0E0)
    - Definir --font-heading e --font-body (system fonts)
    - Definir --shadow-glow (none), --shadow-card (subtle)
    - Definir --effect-scanlines, --effect-grid, --effect-stars (none)
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

  - [x] 2.4 Adicionar transições

    - Aplicar transition em body, header, feed-item, etc
    - Usar var(--theme-transition)
    - Configurar 0.3s ease-in-out
    - _Requirements: 7.1, 7.2, 7.3_

- [ ] 3. Atualizar componentes para usar CSS Variables
  - [x] 3.1 Atualizar globals.css

    - Substituir cores hardcoded por var(--color-*)
    - Substituir fonts hardcoded por var(--font-*)
    - Substituir shadows por var(--shadow-*)
    - Aplicar transições em elementos principais
    - _Requirements: 6.1, 6.2, 7.1_

  - [x] 3.2 Atualizar componente Header


    - Usar var(--color-text-primary) para texto
    - Usar var(--color-accent-primary) para título
    - Usar var(--font-heading) para título
    - Usar var(--shadow-glow) para text-shadow
    - _Requirements: 8.1, 8.2, 9.1, 9.2_

  - [x] 3.3 Atualizar componente FeedList




    - Usar var(--color-bg-secondary) para cards
    - Usar var(--color-border) para bordas
    - Usar var(--shadow-card) para box-shadow
    - Usar var(--color-accent-primary) para links
    - _Requirements: 8.2, 4.1, 4.2, 4.3_

  - [x] 3.4 Atualizar componente SubscribeForm


    - Usar var(--color-bg-secondary) para background
    - Usar var(--color-text-primary) para texto
    - Usar var(--color-accent-primary) para botão
    - Usar var(--color-border) para inputs
    - _Requirements: 8.3_

  - [x] 3.5 Atualizar componente Pagination


    - Usar var(--color-accent-primary) para botões ativos
    - Usar var(--color-text-secondary) para botões inativos
    - Usar var(--color-border) para bordas
    - _Requirements: 8.4_

  - [x] 3.6 Atualizar efeitos visuais

    - Usar var(--effect-scanlines) para display da classe .scanlines
    - Usar var(--effect-grid) para display da classe .vaporwave-grid
    - Usar var(--effect-stars) para display do StarsEffect
    - _Requirements: 3.4_

- [ ] 4. Criar componente ThemeToggle
  - [x] 4.1 Criar componente ThemeToggle

    - Criar arquivo `apps/web/src/components/ThemeToggle.tsx`
    - Usar hook useTheme
    - Criar botão com onClick={toggleTheme}
    - Adicionar ícone que muda baseado no tema (🎨 / 📄)
    - Adicionar label "THEME"
    - _Requirements: 1.1, 1.2, 5.1, 5.2_

  - [x] 4.2 Adicionar acessibilidade

    - Adicionar aria-label descritivo
    - Adicionar title com tema atual
    - Adicionar onKeyDown para Enter e Space
    - Adicionar aria-live="polite"
    - Garantir área de toque mínima 44x44px
    - _Requirements: 5.3, 5.4, 5.5, 10.3, 10.4_

  - [x] 4.3 Estilizar botão

    - Criar estilos que funcionam em ambos os temas
    - Adicionar hover state
    - Adicionar active state
    - Usar CSS variables para cores
    - _Requirements: 4.3, 4.4, 5.2_

- [ ] 5. Integrar ThemeToggle na aplicação
  - [x] 5.1 Adicionar ThemeProvider ao layout

    - Editar `apps/web/app/layout.tsx`
    - Envolver children com ThemeProvider
    - Importar themes.css
    - _Requirements: 1.1, 1.2, 2.1, 2.2_

  - [x] 5.2 Substituir botão "READY" por ThemeToggle

    - Editar `apps/web/app/page.tsx`
    - Remover span com "READY"
    - Adicionar componente ThemeToggle
    - Manter posição no rodapé
    - _Requirements: 5.1, 5.2_

  - [x] 5.3 Adicionar script de prevenção de flash

    - Adicionar script inline no head do layout
    - Carregar tema do localStorage antes do React
    - Aplicar data-theme imediatamente
    - _Requirements: 2.3, 2.4_

- [ ] 6. Adicionar suporte a prefers-reduced-motion
  - [x] 6.1 Criar media query para reduced motion

    - Adicionar @media (prefers-reduced-motion: reduce)
    - Desabilitar todas as transições
    - Desabilitar todas as animações
    - _Requirements: 7.4, 10.5_

  - [ ] 6.2 Testar com preferência do sistema
    - Ativar reduced motion no sistema
    - Verificar que transições são desabilitadas
    - Verificar que tema ainda funciona
    - _Requirements: 10.5_

- [ ] 7. Garantir contraste adequado
  - [ ] 7.1 Verificar contraste do tema Vaporwave
    - Verificar pink (#ff006e) em fundo escuro
    - Garantir contraste mínimo 4.5:1 para texto
    - Garantir contraste mínimo 3:1 para texto grande
    - _Requirements: 10.1, 10.2_

  - [ ] 7.2 Verificar contraste do tema Clean
    - Verificar preto (#1A1A1A) em fundo branco
    - Verificar azul (#0066CC) em fundo branco
    - Garantir contraste mínimo 4.5:1 para texto
    - Garantir contraste mínimo 3:1 para texto grande
    - _Requirements: 10.1, 10.2_

- [ ] 8. Otimizar performance
  - [x] 8.1 Evitar flash de tema incorreto

    - Aplicar tema antes do React hydration
    - Usar script inline no head
    - Esconder conteúdo até tema ser aplicado
    - _Requirements: 2.3, 2.4_

  - [x] 8.2 Otimizar transições

    - Apenas transicionar propriedades de cor
    - Evitar transicionar width, height, position
    - Usar will-change com cuidado
    - Desabilitar transições no carregamento inicial
    - _Requirements: 7.3, 7.4, 7.5_

  - [x] 8.3 Limpar event listeners

    - Remover storage listener no cleanup
    - Usar AbortController se necessário
    - _Requirements: 7.5_

- [ ] 9. Adicionar testes
  - [ ]* 9.1 Criar testes para ThemeProvider
    - Testar carregamento inicial do localStorage
    - Testar toggleTheme
    - Testar setTheme
    - Testar persistência no localStorage
    - Testar tratamento de valor inválido
    - _Requirements: 1.1, 1.2, 1.3, 2.1, 2.2, 2.3, 2.4_

  - [ ]* 9.2 Criar testes para ThemeToggle
    - Testar renderização do botão
    - Testar click alterna tema
    - Testar aria-label atualiza
    - Testar ícone muda
    - _Requirements: 1.1, 1.2, 5.1, 5.2, 5.3, 5.4_

  - [ ]* 9.3 Criar testes de integração
    - Testar mudança de tema atualiza CSS variables
    - Testar sincronização entre abas
    - Testar persistência após reload
    - _Requirements: 1.3, 1.4, 2.1, 2.2, 2.5_

  - [ ]* 9.4 Testar visualmente
    - Testar todas as páginas em tema vaporwave
    - Testar todas as páginas em tema clean
    - Testar transições são suaves
    - Testar não há flash de tema incorreto
    - _Requirements: 1.4, 7.1, 7.2, 8.1, 8.2, 8.3, 8.4, 8.5_

  - [ ]* 9.5 Testar acessibilidade
    - Testar navegação por teclado
    - Testar com screen reader
    - Testar contraste com ferramentas
    - Testar com prefers-reduced-motion
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_

- [ ] 10. Documentar mudanças
  - [x] 10.1 Atualizar README


    - Documentar sistema de temas
    - Explicar como alternar temas
    - Documentar persistência de preferência
    - _Requirements: 6.4_

  - [ ] 10.2 Criar guia para desenvolvedores



    - Documentar CSS variables
    - Explicar como adicionar novos temas
    - Fornecer template de tema
    - Documentar convenções de nomenclatura
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

  - [ ] 10.3 Adicionar comentários no código
    - Documentar ThemeProvider
    - Documentar useTheme hook
    - Documentar CSS variables
    - Documentar ThemeToggle
    - _Requirements: 6.4_

  - [ ] 10.4 Criar checklist de testes de tema
    - Listar todos os componentes a testar
    - Listar verificações de acessibilidade
    - Listar verificações de performance
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_
