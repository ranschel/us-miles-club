# Contributing to US Miles Club

Thanks for your interest in improving US Miles Club. Issues and pull requests are welcome.

## Getting set up

1. Fork the repository and clone your fork.
2. Install [Bun](https://bun.sh) (the repo ships a `bun.lock`).
3. Run `bun install`.
4. Create a `.env` file in the project root using the variables documented in the README. Only ever put publishable values in `VITE_`-prefixed keys, and never commit `.env`.
5. Apply the migrations in `supabase/migrations/` to a Supabase project.
6. Start the dev server with `bun run dev`.

## Making changes

- Keep changes focused. One logical change per pull request is easier to review.
- Run `bun run lint` and `bun run format` before opening a PR.
- Describe the user-facing behavior your change affects, and include screenshots for UI changes where it helps.
- Reference any related issue in your PR description.

## Reporting issues

When filing an issue, please include steps to reproduce, what you expected to happen, and what actually happened. For UI problems, a screenshot and your browser and OS help a lot. Never include secrets such as your `SUPABASE_SERVICE_ROLE_KEY` in issues or pull requests.

## Code style

The project uses ESLint and Prettier. Configuration lives in the repository, so please rely on `bun run lint` and `bun run format` rather than hand-formatting.

## License

By contributing, you agree that your contributions are licensed under the [MIT License](LICENSE).
