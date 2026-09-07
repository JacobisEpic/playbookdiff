# PlaybookDiff brand assets

The mark is a pair: Claude Code as an orange pixel head, Codex as a violet cloud carrying a terminal prompt.

| File                   | Used for                                                                                                         |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `mascots-reading.png`  | The logo mark in the header and footer, the closing illustration, the favicon, and the repository README header. |
| `mascots-running.png`  | Spare illustration. Not currently placed on the site.                                                            |
| `wordmark.png`         | The word mark, in the site header and footer.                                                                    |
| `wordmark-on-dark.png` | The same word mark with its ink recoloured to paper, for dark surfaces.                                          |

The repository README references this file by its path in this directory rather than keeping a second copy, so the mark cannot drift between the site and GitHub.
The source crop is 364x297, which is the practical ceiling: the closing illustration is placed at 300 CSS pixels so it stays under native width, and anything much larger softens the outlines on a high-density display.

All four are cropped from the brand sticker sheet.
They arrived as JPEG, so the white background was flood-filled to transparency from the border and the JPEG halo around the outlines was cleared, which is why the interior cream of the book survives: it is enclosed by the black outline and never touched by the fill.
They are palette PNGs, 7-17 KB each.

`../../app/icon.png` is the favicon: `mascots-reading.png` centred on the brand's dark rounded square at 512px, which Next.js serves and links from the document head.

## Colour

The brand artwork is the only place agent colour appears: the orange pixel head is Claude Code, the violet cloud is Codex, and the word mark's `diff` is violet.
None of it is a site colour token.

The site itself is warm neutral paper, ink, and one dark surface for the tool's own output.
Exactly one hue is declared in `app/globals.css`, `--signal-on-dark` with its dimmer `--signal-leader`, and it means one thing: PlaybookDiff proved a difference here.
It appears on a broken ledger leader, on `not received`, and on a severity label.

There is deliberately no `--claude` or `--codex` colour.
Recolouring the word "Codex" in a sentence would claim a brand PlaybookDiff does not own, and would compete with the finding for attention.
The two agents are told apart by their own icons and their names, and `tests/site.test.mjs` asserts that no agent colour token comes back.

Links, buttons, and focus rings are ink.

## Replacing these

Keep the filenames. The header, footer, and favicon reference them by path, and the favicon is generated from `mascots-reading.png`, so a higher-resolution crop can be dropped in and the icon regenerated without touching any component.
