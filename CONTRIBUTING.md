# Contributing Guide

Thank you for your interest in contributing to Screenshot Service! This guide will help you get started.

## Development Setup

1. **Install Bun**

   ```bash
   curl -fsSL https://bun.sh/install | bash
   ```

2. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd screenshot
   ```

3. **Install dependencies**

   ```bash
   bun install
   ```

4. **Start development server**
   ```bash
   bun run dev
   ```

## Code Quality

We use Prettier and ESLint to maintain code quality.

### Running Code Quality Checks

```bash
# Check code formatting
bun run format:check

# Run ESLint
bun run lint

# Run both checks
bun run check

# Auto-fix issues
bun run check:fix
```

### Editor Setup

For the best development experience, install these VS Code extensions:

- ESLint
- Prettier - Code formatter
- EditorConfig for VS Code

VS Code settings are included in `.vscode/settings.json`.

## Project Structure

```
src/
├── core/          # Core screenshot functionality
├── server/        # API server implementation
├── cli/           # Command-line interface
├── types/         # TypeScript type definitions
└── index.ts       # Library entry point
```

## Testing

Run tests with:

```bash
bun test
```

Write tests for new features in the `test/` directory.

## Making Changes

1. **Create a feature branch**

   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes**
   - Follow existing code patterns
   - Add tests for new functionality
   - Update documentation as needed

3. **Ensure code quality**

   ```bash
   bun run check
   bun test
   ```

4. **Commit your changes**
   - Use descriptive commit messages
   - Follow conventional commits format:
     - `feat:` for new features
     - `fix:` for bug fixes
     - `docs:` for documentation
     - `refactor:` for code refactoring
     - `test:` for tests
     - `chore:` for maintenance

5. **Push and create a pull request**
   ```bash
   git push origin feature/your-feature-name
   ```

## Code Style Guidelines

- Use TypeScript for all new code
- Prefer `const` over `let` when possible
- Use meaningful variable and function names
- Add JSDoc comments for public APIs
- Keep functions small and focused
- Handle errors appropriately

## API Design Principles

- Keep APIs simple and intuitive
- Provide sensible defaults
- Return consistent response formats
- Include proper error messages
- Document all public interfaces

## Questions?

Feel free to open an issue for any questions or discussions!
