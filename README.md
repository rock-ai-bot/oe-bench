# oe-bench

A calculator, built by OpenEngine. It is a single web page (`index.html`) with no build step.

The calculator is published at https://rock-ai-bot.github.io/oe-bench/

## Run the calculator on your own computer

You need [Git](https://git-scm.com/) and a web browser. Clone the repository and go into it:

```
git clone https://github.com/rock-ai-bot/oe-bench.git
cd oe-bench
```

Then open `index.html` in your browser. On macOS:

```
open index.html
```

On Linux:

```
xdg-open index.html
```

On Windows:

```
start index.html
```

You can also double-click `index.html` in your file manager.

## Run the tests

You need [Node.js](https://nodejs.org/) (the workflows use version 26.13.0). From the repository folder, install the dependencies, then run the tests:

```
npm ci
npm test
```

`npm test` runs every test file in `tests/` with Node's built-in test runner.

## How it is published and released

Four GitHub Actions workflows in `.github/workflows/` do the work:

- **Publish page** (`pages.yml`) runs on every push to `main`. It copies `index.html` to a site and deploys it to GitHub Pages, which is the published address above.
- **Release** (`release.yml`) runs on every push to `main`. It runs semantic-release, which reads the commit messages since the last release, picks the next version, tags it `vX.Y.Z`, creates a GitHub release with notes, and commits the updated `CHANGELOG.md` back to `main`.
- **Test** (`test.yml`) runs `npm ci` and `npm test` on every pull request and on every push to `main`.
- **Commit format** (`commit-format.yml`) runs on every pull request when it is opened, edited, updated or reopened. It checks the pull request title and each commit message against the commit message format.

Nothing needs to be done by hand: merging to `main` publishes the page and, if the commits call for it, cuts a release.

## Change the calculator

1. Create a branch, make your change in `index.html` (and add or update tests in `tests/`), and push it.
2. Open a pull request against `main`. The pull request title must follow the [Conventional Commits](https://www.conventionalcommits.org/) commit message format, such as `feat: add a square root button` or `fix: show an error when dividing by zero`. Every commit message in the pull request must follow it too. The format decides the next version: `fix` makes a patch release, `feat` a minor release, and a `!` after the type (or a `BREAKING CHANGE:` footer) a major release.
3. Wait for CI. The Test and Commit format checks must pass before the pull request can be merged.
4. Merge. The workflows above then publish and release the change.
