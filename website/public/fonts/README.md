# Typefaces

The site sets its text in IBM Plex Sans and its code, paths, and findings in IBM Plex Mono.
Both are served from this directory, so no external font service is contacted when the page loads.
`tests/site.test.mjs` asserts that every `@font-face` in `app/globals.css` resolves to a file here and that the stylesheet contains no remote URL.

| File                  | Face                   |
| --------------------- | ---------------------- |
| `plex-sans-400.woff2` | IBM Plex Sans Regular  |
| `plex-sans-500.woff2` | IBM Plex Sans Medium   |
| `plex-sans-600.woff2` | IBM Plex Sans SemiBold |
| `plex-mono-400.woff2` | IBM Plex Mono Regular  |
| `plex-mono-500.woff2` | IBM Plex Mono Medium   |

These are the Latin subsets, taken unmodified from the `@fontsource/ibm-plex-sans` and `@fontsource/ibm-plex-mono` packages.
Neither package is a dependency of this workspace: only the five files above are vendored.

IBM Plex is Copyright 2019 IBM Corp., licensed under the SIL Open Font License 1.1.
The full licence is in `LICENSE-IBM-Plex.txt`.
