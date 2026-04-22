# Astro Color Picker Widget

Astro Dev Toolbar color picker integration for local color inspection,
preview, copying, and browser-session persistence.

## Status

This package has Phase 8 behavior from `DEVELOPMENT_PLAN.md`. The
integration registers an Astro Dev Toolbar app during `astro dev`, renders the
toolbar UI, supports element picking, previews direct color and CSS variable
changes, resets browser-only mutations, includes copy/persistence behavior,
and has a first polish pass for browser support, responsive layout, and
common demo scenarios.

Tested target:

- Astro `6.1.8`
- Node `18.20.8 || ^20.3.0 || >=22.0.0`

## Installation

This package is currently private and intended for local development. Install it
from a local path in an Astro project:

```sh
npm install -D ../path/to/astro-color-picker
```

For the included demo workspace, the dependency is already configured with
`file:..`.

## Usage

Add the integration to `astro.config.mjs`:

```js
import { defineConfig } from "astro/config";
import colorPickerWidget from "astro-color-picker-widget";

export default defineConfig({
  integrations: [colorPickerWidget()]
});
```

Run Astro in development mode:

```sh
npm run dev
```

Open the Astro Dev Toolbar and choose **Color Picker**. The tool is only
registered during `astro dev`; production builds do not receive page scripts or
runtime behavior from this package.

## Workflow

1. Open the Color Picker app from the Astro Dev Toolbar.
2. Select **Pick** and click a page element.
3. Adjust text, background, border, or detected CSS variable colors.
4. Use **Reset** or **Reset All** to remove browser-only preview mutations.
5. Copy the current CSS, all CSS changes, or a token assignment.
6. Paste the copied output into the owning project file manually.

Recent colors and preview changes are stored in `localStorage`, scoped by origin
and pathname. Use **Clear Saved** to remove the saved session for the current
page.

## Development

```sh
npm install
npm run validate
```

## Demo

The `demo` workspace references the local package with `file:..`.

```sh
npm --workspace demo run dev
npm --workspace demo run build
```

Use the demo page to manually check element picking, direct color edits, CSS
variable previews, reset, copy output, persistence, repeated selectors, and
transparent colors.

## Configuration

The integration accepts an optional configuration object:

```js
colorPickerWidget({
  enabled: true
});
```

Currently implemented:

- `enabled: false` disables toolbar registration.

The type surface also reserves options for future defaults, ignored selectors,
variable scopes, storage, and copy formatting. Those are not fully wired yet.

## Known Limitations

- The tool does not edit source files. It only previews browser mutations and
  copies CSS for manual use.
- CSS source detection is best effort. Computed styles do not reliably expose
  the exact source declaration that produced a color.
- CSS variable detection handles obvious matched-rule and inline cases, but it
  does not fully model the cascade.
- Editing a root or theme variable can affect more than the selected element.
- Supported editable color inputs are HEX, RGB(A), and HSL(A). Named colors,
  OKLCH, Lab/LCH, color-mix, gradients, shadows, SVG fill/stroke, and individual
  border sides are out of scope for v1.
- The EyeDropper button only appears in browsers that support the EyeDropper
  API.
- Browser flow validation is manual for now. Automated Playwright coverage is
  intentionally deferred while this remains a solo local tool.

## Troubleshooting

If the toolbar app does not appear:

- Confirm the integration is added to `astro.config.mjs`.
- Run `astro dev`; the app is not registered during `astro build`.
- Confirm the consuming project can resolve `astro-color-picker-widget`.
- Run `npm run build` in this package so `dist/` exists for local file installs.

If color edits do not apply:

- Select a page element first.
- Use HEX, RGB(A), or HSL(A) in the text input.
- If editing a detected token, confirm **Edit variable preview** is enabled.
- Use **Reset All** if stale preview mutations are confusing the current state.

If copied output is not what you expected:

- Treat generated selectors as helpful output, not guaranteed source truth.
- Prefer token output when the tool detects a project CSS variable.
- For repeated selectors, inspect the copied selector before pasting.

## Release Checklist

Before considering this ready beyond local use:

- Run `npm run validate`.
- Run `npm --workspace demo run dev` and manually test pick, edit, reset, copy,
  persistence, and clear-saved flows.
- Run `npm --workspace demo run build` and confirm the production build
  completes without injected runtime behavior.
- Test the package from a fresh Astro project with a local file install.
- Confirm README limitations match the current behavior.
