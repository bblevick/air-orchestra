# Publishing Air Orchestra

Repository: https://github.com/bblevick/air-orchestra
Verified Pages URL: https://bblevick.github.io/air-orchestra/

The `Verify and publish` workflow checks the code, installs Chromium/WebKit, runs browser tests, and builds with `BASE_PATH=/air-orchestra/`. Pull requests verify without deploying. Pushes to main or manual workflow dispatch deploy after verification. Repository Pages settings must select **GitHub Actions** as the source.

For a local deployment-path check:

```sh
BASE_PATH=/air-orchestra/ npm run build
BASE_PATH=/air-orchestra/ npm run preview
```

Open the printed preview origin followed by `/air-orchestra/`. Repositories contain original public portfolio code and redistributable assets. Keep environment files, credentials, raw test captures, and build output out of Git.

Profile pins are managed through GitHub’s profile UI. Publishing and pinning are separate actions; verify both instead of inferring pins from repository creation.

Published October 24, 2026. [First successful verification and deployment](https://github.com/bblevick/air-orchestra/actions/runs/40144783859). Public browser interactions and bundled worker/model initialization passed without page errors, failed requests or external application requests; see `public-release-check.json`. The repository is pinned on the GitHub profile. Linux WebKit inference exception is recorded in VERIFICATION.md.
