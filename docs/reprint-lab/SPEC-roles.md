# TRUE 82 system redesign: role vocabulary and component families

Every hard-coded color in the site's CSS gets exactly one ROLE from this list.
Themes later set one CSS variable per role (`--t-<role>`), so the role must
describe what the color DOES, not what it looks like. Today's look must be
reproducible exactly (the tokenizer keeps the literal as the var() fallback).

## Roles

Surfaces (dark site)
- `ground`     page background of the dark site (#101418 "ink")
- `ground-2`   recessed or secondary panels on dark (#1A2027 tunnel, #141a21, #151b21, #131920, card gradients)
- `ground-3`   tertiary fills, hovers, wells on dark (#232B34, #1a2129)
- `overlay`    scrims and backdrops behind sheets/overlays (dark alpha used as a backdrop)

Surfaces (paper world, v48/v50 riso)
- `paper`      cream paper slips and cards (#F4ECDD, #F4EAD4, #F5EEDF)
- `paper-2`    tinted paper wells, darker paper (#EAE2D1, #E3DCCB)

Lines
- `line`       borders and rules on dark (#2a3540, maple-line #6E5530 when used as a plain rule)
- `line-paper` rules and hairlines on paper (rgba(35,42,78,.24))

Text
- `text`       primary text on dark (chalk #E8E4D8, #f2ede4)
- `text-2`     secondary or dim text on dark (#9AA0A6, #a8b0b8, #8b98a5)
- `ink`        primary text/ink on paper (navy #232A4E)
- `ink-2`      secondary text on paper (#5B5E73, #4A4E66)

Brand and action
- `accent`      the primary brand/action color: amber gold (#FFB52E and close variants used as the main fill/text)
- `accent-hi`   lighter highlight/sheen of the accent (#FFC957, #FFE9B0, #FFF3D6, top-edge highlights)
- `accent-edge` darker extrusion / bottom edge / shadow of accent keycaps and borders (#C7870A, #9E5A0F, #9a6a12, #E89A1C)
- `accent-ink`  text or icons printed ON an accent fill (#2A1A05, #1c1608)
- `metal`       decorative bronze/maple ornament lines, frames, pips (#B98A4F, #B18D5E, #7B5E3B, #6A5A3A, #584329)

Semantic
- `bad`       negative / loss / NO / bad trait fill (#E2654E whistle, #F65058 scarlet, #FF5A4A, #FF4133, #D9422D)
- `bad-edge`  darker edge of a bad fill (#B8323B, #A13C2C, #8c2317)
- `bad-ink`   deep bad text, or text on a bad fill (#B42A36, #2b0d09)
- `good`      positive / win / success (#3FAE5A, #8FB99B, #7AE08D, #00875A)
- `you`       the riso blue "you" marker (#0078BF)
- `offset`    fluorescent pink misregistration offsets and pink ink (#FF48B0, #C8217A, #E0348E)
- `sun`       sunflower ink on paper, the paper world's "yes" (#FFB511)
- `sun-edge`  sunflower keycap edge on paper (#C7870A when it sits under #FFB511)
- `sun-ink`   deep sunflower text on paper (#8A5D00)

Neutral effects
- `shadow`   black-alpha drop shadows, inner shadows, text shadows (rgba(0,0,0,a), rgba(27,22,17,a) used as shadow)
- `light`    white-alpha highlights and sheens (rgba(255,255,255,a))
- `fixed`    must NOT change with theme: data colors with fixed meaning that a theme should not touch, team/crest colors, pure white/black where swapping would break legibility of an image. Use sparingly and say why in `note`.

If a color truly fits none, use the closest role and explain in `note`.
An rgba() takes the role of its rgb; the alpha is kept by the tokenizer.

## Component families

Every selector that styles something visible gets one family:

`button-primary` (the extruded amber keycap; `button.presti-spin` is applied to nearly every button by app.js decorate3dButtons),
`button-secondary`, `button-ghost` (text/outline buttons), `button-danger`, `button-icon`,
`chip` (tags, trait chips, sort chips), `badge` (small labels, slot badges, pills),
`card` (content cards on the page), `panel` (recessed wells, trays, bars), `ticket` (the signature roll ticket / stubs),
`frame` (the ornate Daily frame, plaques), `sheet` (bottom sheets, modals, dialogs), `overlay` (full-screen overlays: reel, Tribune, Heat Check, gate),
`toast`, `input` (inputs, selects, toggles), `link`, `heading` (display type), `eyebrow` (small caps labels), `body` (running text),
`data` (mono numbers, stats, box scores), `divider`, `row` (list rows, pool rows), `progress` (pips, bars, meters),
`table`, `nav` (header, footer, site links), `print` (paper slips of the riso world), `newspaper` (the Tribune), `other`.
