# AGENTS.md - Coding Agent Guidelines for LNVPS Web

This file is an index. Load only the specific doc(s) relevant to your task to minimize context usage.

**Always load [docs/agents-common/common.md](docs/agents-common/common.md) first** — it contains essential guidelines for task sizing, git commits, and git push that apply to all tasks.

<!-- Uncomment and populate when you have active work files:
| File | Description |
|---|---|
| [work/example-task.md](work/example-task.md) | Description of the task |
-->

## Generic Docs

These docs apply to all projects using this agent structure:

| Doc                                                                              | When to load                                                               |
| -------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| [docs/agents-common/bug-fixes.md](docs/agents-common/bug-fixes.md)               | Resolving bugs (includes regression test requirement)                      |
| [docs/agents-common/coverage.md](docs/agents-common/coverage.md)                 | Any edit that adds or modifies functions (100% function coverage required) |
| [docs/agents-common/incremental-work.md](docs/agents-common/incremental-work.md) | Managing a work file for a multi-increment task                            |

### Language-Specific Docs

Load the appropriate language-specific doc alongside the generic one:

| Doc                                                                                    | When to load                                   |
| -------------------------------------------------------------------------------------- | ---------------------------------------------- |
| [docs/agents-common/typescript/coverage.md](docs/agents-common/typescript/coverage.md) | TypeScript projects: coverage tooling commands |

## Project-Specific Docs

| Doc                                                  | When to load                                                                                |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| [docs/project-overview.md](docs/project-overview.md) | Understanding project structure, modules, API client, deployment                            |
| [docs/build-and-test.md](docs/build-and-test.md)     | Running builds, type-checking, linting, or verifying changes                                |
| [docs/code-style.md](docs/code-style.md)             | Writing or reviewing code (formatting, components, hooks, error handling, styling, routing) |
