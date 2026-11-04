# oe-bench
A calculator, built by OpenEngine. It is a single page, `index.html`, published at https://rock-ai-bot.github.io/oe-bench/.

## Running the calculator locally
The calculator is a static page with no build step. Serve it from the repository root and open it in a browser:

```
git clone https://github.com/rock-ai-bot/oe-bench
cd oe-bench
python3 -m http.server 8000 --bind 127.0.0.1
```

Then open http://localhost:8000/ to see `index.html`.

## Running the tests
You need Node.js 26 and Python 3 (the tests start the local server with `python3`). From the repository root, run:

```
npm test
```

## Publishing and releasing
Both workflows run on every push to `main`, which means every merged pull request.

- `.github/workflows/pages.yml` (the pages workflow) copies `index.html` and deploys it to GitHub Pages.
- `.github/workflows/release.yml` (the release workflow) runs semantic-release. It reads the commit messages since the last tag and picks the next version: `feat` bumps the minor version, `fix` bumps the patch version, and a breaking change bumps the major version. It then updates `CHANGELOG.md`, creates a tag and publishes a GitHub release. If no commit calls for a release, nothing is published.

## Changing the calculator
Start from a branch:

```
git checkout -b my-change
```

Open a pull request against `main`. The pull request title must follow the Conventional Commits format, `<type>(scope): description`, for example `fix: handle division by zero`. The scope is optional. Because the title becomes the commit message on `main`, it decides the next release. The `commits` workflow (`.github/workflows/commits.yml`) checks the title and each commit message.

CI must pass before merging: the `tests` workflow (`.github/workflows/test.yml`) runs `npm test`, and the `commits` workflow checks the title and commit messages.
