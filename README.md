# TeXbird

*LaTeX equations as images, right inside your Thunderbird emails — rendered entirely on your machine.*

A Manifest V3 MailExtension for **Thunderbird 128+** that inserts LaTeX equations as
**inline PNG images** into your emails. Rendering is **100% local** via a bundled
copy of MathJax: no LaTeX installation, no external process, no Experiment API.

> Inspired by Jonathan Protzenko's **LaTeX It!** extension, which became
> incompatible with Thunderbird 78+. TeXbird is an independent rewrite (new code,
> different architecture), not a fork: LaTeX It! shelled out to a LaTeX install on
> your machine, whereas TeXbird does all rendering in JavaScript via MathJax.

## Features

- **Display** (block) or **inline** math.
- Adjustable color, size and sharpness; live preview.
- High-resolution PNG inserted **at the cursor** in the message body.
- LaTeX source kept in `alt` / `data-latex` (accessibility + basis for future
  re-editing).
- TeX packages available offline: `ams`, `color`, `cancel`, `physics`,
  `boldsymbol`, `mhchem`, `braket`.

## Installation (testing)

1. Thunderbird → ≡ menu → **Add-ons and Themes** → gear icon →
   **Install Add-on From File…** → choose `texbird.xpi`.
   (Dev: `about:debugging` → *This Thunderbird* → *Load Temporary Add-on* →
   select `manifest.json`.)
2. Open a **new** compose window (windows already open before installation don't
   have the insertion script yet — see Limitations).
3. A **√x** button appears in the compose toolbar.

## Usage

1. Click **√x** → the popup opens.
2. Type your LaTeX (e.g. `\nabla\cdot\mathbf{u}=0`), set type, color, size,
   sharpness.
3. **Insert** (or `Ctrl+Enter`). The image is dropped at the cursor.

## Architecture

- `popup/` — input + live preview. MathJax (`svg`, `fontCache: "none"`) produces a
  self-contained SVG (glyphs as paths), rasterized to PNG via `<canvas>`.
- `compose-script.js` — injected into every compose window by `background.js`
  (`scripting.compose.registerScripts`). Receives the image and inserts it at the
  cursor.
- Fallback: if the compose script isn't present (window opened too early), the
  popup appends the image to the end of the body via `compose.setComposeDetails`.

## Known limitations (v0.1)

- **Windows opened before installation**: reopen a compose window for cursor
  insertion (the fallback still works).
- **Plain-text messages**: images can't be inserted; switch the message to HTML.
- **Vertical alignment**: `vertical-align: middle` by default; precise baseline
  alignment isn't computed yet.
- **Sending**: send yourself a test to confirm Thunderbird embeds the image
  (data-URI → inline CID attachment) for recipients.

## Roadmap

- Re-editing an equation (click the image → popup prefilled from `data-latex` →
  in-place replacement).
- Precise baseline alignment for inline mode.
- Context menu + global keyboard shortcut.
- Options page (defaults, custom macro preamble).
- Signed release on addons.thunderbird.net.

## Development

Rebuild the `.xpi`:

```bash
cd texbird
zip -r -X ../texbird.xpi . -x '.git/*' '*.xpi' >/dev/null
```

Run `make vendor` to download and checksum-verify the pinned MathJax bundle;
see `THIRD-PARTY.md` for its provenance and SHA-256.

## License

**GPLv3-or-later** — see `LICENSE`. MathJax is bundled under Apache-2.0
(compatible); see `NOTICE` and `mathjax/LICENSE`.
