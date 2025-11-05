# Contributing to TheFeeder

Thank you for your interest in contributing to TheFeeder!

## Development Setup

1. Clone the repository:
```bash
git clone https://github.com/runawaydevil/thefeeder.git
cd thefeeder
```

2. Install dependencies:
```bash
npm run install:all
```

3. Create `.env` file:
```bash
cp .env.example .env
# Edit .env with your configuration
```

4. Setup database:
```bash
npm run prisma:generate
npm run prisma:migrate:dev
npm run prisma:seed
```

5. Run locally:
```bash
npm run dev
```

This starts both:
- Web app: http://localhost:7389
- Worker API: http://localhost:7388

## Running Tests

```bash
# Run all tests (when implemented)
npm test

# Run tests with coverage (when implemented)
npm run test:coverage

# Run tests in watch mode (when implemented)
npm run test:watch
```

**Note:** Test framework will be implemented in a future phase. Currently, manual testing is recommended.

## Code Style

We use ESLint and TypeScript for code quality:

```bash
# Check code style
npm run lint

# Type check
npm run typecheck

# Auto-fix linting issues
cd apps/web && npm run lint -- --fix
```

### TypeScript Guidelines

- Use strict TypeScript mode (already configured)
- Avoid `any` types - use proper types or `unknown`
- Write explicit return types for functions
- Use interfaces for object shapes
- Use type aliases for unions and complex types

### Code Guidelines

- Follow ESLint rules (Next.js recommended config)
- Write JSDoc comments for public functions and components
- Add type annotations to function signatures
- Write tests for new features (when test framework is implemented)
- Keep functions small and focused
- Add comments for complex logic
- Use meaningful variable and function names

## Pull Request Process

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Ensure code passes linting (`npm run lint`)
5. Ensure TypeScript checks pass (`npm run typecheck`)
6. Add tests for new features (when test framework is implemented)
7. Ensure all tests pass (when implemented)
8. Commit your changes (`git commit -m 'Add amazing feature'`)
9. Push to the branch (`git push origin feature/amazing-feature`)
10. Open a Pull Request

## Testing Guidelines

**Note:** Testing framework will be implemented in a future phase. Until then:

- Test manually in development environment
- Test edge cases and error conditions
- Verify API endpoints work correctly
- Test responsive design on mobile devices

When tests are implemented:
- Aim for 80%+ code coverage
- Write unit tests for core functionality
- Write integration tests for API endpoints
- Test edge cases and error conditions

## Project Structure

```
thefeeder/
├── apps/
│   ├── web/              # Next.js web application
│   │   ├── app/          # Pages and API routes
│   │   ├── src/          # Components and utilities
│   │   └── prisma/       # Database schema
│   └── worker/           # Background worker (BullMQ)
│       └── src/          # Job processors
├── .env                  # Environment variables (root)
├── .env.example         # Environment template
└── package.json          # Root package.json with scripts
```

## Development Workflow

### Running Individual Services

```bash
# Web app only
cd apps/web && npm run dev

# Worker only
cd apps/worker && npm run dev
```

### Database Management

```bash
# Open Prisma Studio
npm run prisma:studio

# Create migration
npm run prisma:migrate:dev

# Reset database
cd apps/web && npx prisma migrate reset
```

## Documentation

- Update README.md for user-facing changes
- Update TypeScript types/JSDoc for API changes
- Add examples for new features
- Update this CONTRIBUTING.md if workflow changes

## Questions?

Open an issue or contact the project maintainer.

Thank you for contributing! 🎉
