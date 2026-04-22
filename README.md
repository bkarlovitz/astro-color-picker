# Astro Color Picker Widget

Development scaffold for an Astro Dev Toolbar color picker integration.

## Status

This package is at Phase 0 from `DEVELOPMENT_PLAN.md`: project scaffold only. It builds as a TypeScript package and includes a demo Astro project, but it does not register toolbar behavior yet.

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

Toolbar registration and runtime behavior start in Phase 1.
