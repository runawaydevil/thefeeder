# Contributing to Pablo Feeds

Thank you for your interest in contributing to Pablo Feeds!

## Development Setup

1. Clone the repository:
```bash
git clone https://github.com/runawaydevil/thefeeder.git
cd thefeeder
```

2. Install dependencies:
```bash
pip install -r requirements.txt
pip install -r requirements-dev.txt
```

3. Create `.env` file:
```bash
cp .env.example .env
# Edit .env with your configuration
```

4. Run locally:
```bash
python app/main.py
```

## Running Tests

```bash
# Run all tests
pytest

# Run with coverage
pytest --cov=app --cov-report=html

# Open coverage report
open htmlcov/index.html
```

## Code Style

We use `ruff` for linting and formatting:

```bash
# Check code
ruff check app/

# Format code
ruff format app/
```

## Pull Request Process

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Add tests for new features
5. Ensure all tests pass (`pytest`)
6. Commit your changes (`git commit -m 'Add amazing feature'`)
7. Push to the branch (`git push origin feature/amazing-feature`)
8. Open a Pull Request

## Code Guidelines

- Follow PEP 8 style guide
- Write docstrings for all functions and classes
- Add type hints to function signatures
- Write tests for new features
- Keep functions small and focused
- Add comments for complex logic

## Testing Guidelines

- Aim for 80%+ code coverage
- Write unit tests for core functionality
- Write integration tests for API endpoints
- Test edge cases and error conditions

## Documentation

- Update README.md for user-facing changes
- Update docstrings for API changes
- Add examples for new features

## Questions?

Open an issue or contact pablo@pablomurad.com

Thank you for contributing! 🎉

