# Copilot Instructions for dzutech.com Website (Node.js Tech Stack)

1. Implement all tasks using Node.js technologies as specified in the project requirements.
2. After completing any coding task, always run the following command to check for errors:
    ```
    npm run ci:local
    ```
    - If any errors are reported, fix them before marking the task as complete.
3. Run the LINT check to ensure code quality and compliance:
    ```
    npm run lint
    ```
    - Do not use the `any` type in TypeScript code, as it will fail the LINT check. Use more specific types or alternatives such as `unknown`, `Record<string, unknown>`, or appropriate interfaces.
4. Only consider a task done when both the CI and LINT checks pass without errors.

5. Do not add lint disable lines such as "/* eslint-disable @typescript-eslint/no-explicit-any */". Instead, write code properly to pass lint checks.

6. After modifying any files, check the test coverage of the modified files. Make sure test coverage is at least 80%. If coverage is below 80%, add more tests and repeat all the checks above until coverage meets the requirement.