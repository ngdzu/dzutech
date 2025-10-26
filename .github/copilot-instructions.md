# Copilot Instructions for dzutech.com Website (Node.js Tech Stack)

## General Development Practices

1. **Technology Stack**: Implement all tasks using Node.js technologies as specified in the project requirements.

2. **Code Quality Checks**: After completing any coding task, always run the following command to verify code quality:
   ```bash
   npm run ci:local
   ```
   - If any errors are reported, fix them before marking the task as complete.
   - Only consider a task complete when `npm run ci:local` passes without errors.

3. **Development Environment**: Do not run the development server locally. Always run the application in a container environment. Never execute `npm run dev`.

4. **Authentication**: For testing authenticated endpoints, use the credentials from `.env.example`: username `admin@example.com` and password `changeme`.

## TypeScript and Linting Rules

5. **TypeScript Types**: Do not use the `any` type in TypeScript code, as it will fail the lint check. Use more specific types or alternatives such as `unknown`, `Record<string, unknown>`, or appropriate interfaces.

6. **Lint Disables**: Do not add lint disable comments such as `/* eslint-disable @typescript-eslint/no-explicit-any */`. Instead, write code properly to pass lint checks.

## Testing Requirements

7. **Test Coverage**: After modifying any files, ensure test coverage for modified files is at least 80%. If coverage is below 80%, add more tests and repeat the quality checks until the requirement is met.

8. **Plugin Development**: For all plugin-related changes (manifest files, plugin code, plugin API endpoints, or plugin lifecycle logic), run the plugin E2E tests:
   ```bash
   npm run test:plugin
   ```
   - This verifies plugin packaging, installation, enable/disable functionality, and client-side integration.
   - Plugin changes are not complete until both `npm run ci:local` and `npm run test:plugin` pass without errors.
