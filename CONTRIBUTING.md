# Contributing

## Commit messages

This repo uses [Conventional Commits](https://www.conventionalcommits.org/) to drive automated versioning via [semantic-release](https://semantic-release.gitbook.io/). Every commit on `main` is scanned by the `Release` workflow (`.github/workflows/release.yml`) to decide the next version, changelog entry, and GitHub release.

Format:

```
type(scope): subject

body (optional)

footer (optional)
```

| Type | Effect | Example |
|---|---|---|
| `fix` | patch release (`x.y.Z`) | `fix: correct low-contrast button text and unstyled placeholder` |
| `feat` | minor release (`x.Y.z`) | `feat: add CLI-parity routes and PWA UI` |
| `feat!` / `fix!` / footer `BREAKING CHANGE:` | major release (`X.y.z`) | `feat!: change relay session API contract` |
| `docs`, `chore`, `ci`, `refactor`, `test`, `style` | no release | `docs: migrate Director-Agent governance to GitHub issues` |

`scope` is optional and free-form.

Squash-merged PRs should carry a Conventional Commits–style title, since that becomes the commit message on `main`. Past commits predate this convention and are left untouched.
