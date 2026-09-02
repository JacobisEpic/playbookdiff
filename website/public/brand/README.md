# PlaybookDiff brand assets

The mark is a pair: Claude Code as an orange pixel head, Codex as a purple cloud carrying a terminal prompt.

| File                   | Used for                                                                |
| ---------------------- | ----------------------------------------------------------------------- |
| `mascots-reading.png`  | The logo mark, in the site header and footer, and inside the favicon.   |
| `mascots-running.png`  | Spare illustration. Not currently placed on the site.                   |
| `wordmark.png`         | The word mark for light surfaces.                                       |
| `wordmark-on-dark.png` | The same word mark with its ink recoloured to paper, for dark surfaces. |

All four are cropped from the brand sticker sheet.
They arrived as JPEG, so the white background was flood-filled to transparency from the border and the JPEG halo around the outlines was cleared, which is why the interior cream of the book survives: it is enclosed by the black outline and never touched by the fill.
They are palette PNGs, 7-17 KB each.

`../../app/icon.png` is the favicon: `mascots-reading.png` centred on the brand's dark rounded square at 512px, which Next.js serves and links from the document head.

## Colours

| Token              | Value     | Used for                                               |
| ------------------ | --------- | ------------------------------------------------------ |
| `--brand-orange`   | `#e2542a` | Claude Code, wherever the two agents are distinguished |
| `--brand-purple`   | `#5946e6` | Codex, links, primary buttons, focus rings             |
| `--accent-on-dark` | `#a99cff` | The same purple, lightened for dark surfaces           |

## Replacing these

Keep the filenames. The header, footer, and favicon reference them by path, and the favicon is generated from `mascots-reading.png`, so a higher-resolution crop can be dropped in and the icon regenerated without touching any component.
