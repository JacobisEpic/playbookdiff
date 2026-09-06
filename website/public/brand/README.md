# PlaybookDiff brand assets

The mark is a pair: Claude Code as an orange pixel head, Codex as a purple cloud carrying a terminal prompt.

| File                   | Used for                                                                |
| ---------------------- | ----------------------------------------------------------------------- |
| `mascots-reading.png`  | The logo mark, in the site header and footer, and inside the favicon.   |
| `mascots-running.png`  | Spare illustration. Not currently placed on the site.                   |
| `wordmark.png`         | The word mark, in the site header and footer.                           |
| `wordmark-on-dark.png` | The same word mark with its ink recoloured to paper, for dark surfaces. |

All four are cropped from the brand sticker sheet.
They arrived as JPEG, so the white background was flood-filled to transparency from the border and the JPEG halo around the outlines was cleared, which is why the interior cream of the book survives: it is enclosed by the black outline and never touched by the fill.
They are palette PNGs, 7-17 KB each.

`../../app/icon.png` is the favicon: `mascots-reading.png` centred on the brand's dark rounded square at 512px, which Next.js serves and links from the document head.

## Colours

The site uses exactly two hues, and both are identities rather than decoration:
one means Claude Code and the other means Codex.
Everything else is neutral paper and ink, so a coloured mark on the page always
tells you which agent is being talked about.

| Token              | Value     | Used for                                    |
| ------------------ | --------- | ------------------------------------------- |
| `--claude`         | `#d24a20` | Claude Code, on light surfaces              |
| `--claude-on-dark` | `#f0834f` | Claude Code, inside the dark product panels |
| `--codex`          | `#4b3be0` | Codex, on light surfaces                    |
| `--codex-on-dark`  | `#9284ff` | Codex, inside the dark product panels       |

Links, buttons, and focus rings are ink, never an accent colour.

## Replacing these

Keep the filenames. The header, footer, and favicon reference them by path, and the favicon is generated from `mascots-reading.png`, so a higher-resolution crop can be dropped in and the icon regenerated without touching any component.
