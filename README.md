# Astro Color Picker Widget

Astro Dev Toolbar color picker integration for local color inspection,
preview, copying, and browser-session persistence.

## Status

This package has Phase 6 behavior from `DEVELOPMENT_PLAN.md`. The
integration registers an Astro Dev Toolbar app during `astro dev`, renders the
toolbar UI, supports element picking, previews direct color and CSS variable
changes, resets browser-only mutations, and includes copy/persistence
behavior.

Tested scaffold target:

- Astro `6.1.8`
- Node `18.20.8 || ^20.3.0 || >=22.0.0`

## Development

```sh
npm install
npm run validate
```

## Demo

The `demo` workspace references the local package with `file:..`.

```sh
npm --workspace demo run build
```

Toolbar registration and runtime behavior are implemented. Run `astro dev` in
the demo workspace to inspect the current app manually.
