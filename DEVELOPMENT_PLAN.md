# Astro Color Picker Dev Toolbar Development Plan

## Current Repository State

Phase 6 implementation is now present:

- Astro integration registration is present and dev-only.
- The Dev Toolbar app shell renders in the toolbar ShadowRoot.
- Element picking, selector display, style inspection, live preview, and reset behavior are implemented.
- Copy output, recent colors, and local browser-session persistence are implemented for Phase 6.

## Goal

Build a small Astro-focused local development tool that lets a developer visually select an element in the browser, adjust its colors live, and copy the resulting CSS or token values back into their project.

The tool should feel native to Astro development:

- Installed as an Astro integration.
- Available through the Astro Dev Toolbar during `astro dev`.
- Absent from production builds.
- Isolated from the host page's CSS.
- Useful for both static Astro sites and Astro projects using React islands.

## Recommended Product Shape

Build this as an Astro Dev Toolbar app registered by an Astro integration.

Astro's Dev Toolbar is already a local-only interface for development tools. Custom toolbar apps are added by integrations through `addDevToolbarApp()`, and each toolbar app receives a dedicated `ShadowRoot` for UI rendering. That makes it the right foundation for a temporary in-browser design tool.

Official references:

- Astro Dev Toolbar: https://docs.astro.build/en/guides/dev-toolbar/
- Dev Toolbar App API: https://docs.astro.build/en/reference/dev-toolbar-app-reference/
- Astro Integration API: https://docs.astro.build/en/reference/integrations-reference/

## Non-Goals For The First Version

- No browser extension.
- No generic framework-agnostic script tag distribution.
- No React component as the primary interface.
- No automatic source-file editing in v1.
- No gradient editor in v1.
- No full design-token management system.
- No attempt to perfectly reverse-engineer every CSS framework abstraction.
- No production runtime behavior.

## Primary User Workflow

1. A developer installs the package in an Astro project.
2. They add the integration to `astro.config`.
3. They run `astro dev`.
4. They open the color picker app from the Astro Dev Toolbar.
5. They click "Pick element".
6. Hovering the page highlights candidate elements.
7. Clicking an element selects it and opens editable color properties.
8. They adjust text, background, border, or CSS variable color values.
9. The selected element updates live in the page.
10. They copy the final CSS or token value.
11. They paste the result into the owning project file manually.

## Product Principles

- Local-first: everything should work during `astro dev` without an account, backend, or remote service.
- Temporary by design: the tool helps choose colors, then gets out of the way.
- Source-conscious: prefer copyable output over hidden page mutation.
- CSS-variable friendly: Astro projects often centralize colors as custom properties, so token editing must be first-class.
- Page-safe: the toolbar UI and overlays must avoid breaking the host page layout.
- Fast interaction: element picking and color adjustments should feel immediate.
- Small dependency surface: this should remain a lightweight dev tool.

## Package Strategy

Package type:

- TypeScript package.
- ESM-first.
- Astro integration as the main export.
- Dev Toolbar app entrypoint bundled with the package.

Suggested package name:

- Internal/dev name: `astro-color-picker-widget`
- Public name candidate: `astro-color-tuner`

Supported Astro version:

- Target the latest stable Astro release used by this project as the primary support version.
- The current scaffold targets Astro 6.1.8.
- Document the tested Astro version explicitly once scaffolding begins.

Expected project usage:

- Install as a dev dependency.
- Add the integration to `astro.config`.
- Use only in local development.

## High-Level Architecture

### 1. Astro Integration

Responsibilities:

- Register the Dev Toolbar app with `addDevToolbarApp()`.
- Give the app a stable id, name, and icon.
- Optionally validate that it is running in dev mode.
- Optionally expose server communication later for file-writing features.

The integration should be very small. It should not inject production scripts into pages.

### 2. Dev Toolbar App Client

Responsibilities:

- Render the tool UI into the provided toolbar `ShadowRoot`.
- Manage active/inactive toolbar state.
- Start and stop element picking.
- Display selected element metadata.
- Coordinate color controls, preview state, reset state, and copy output.

Implementation preference:

- Use TypeScript and direct DOM rendering for v1.
- Avoid React in the toolbar app unless the UI complexity grows enough to justify it.
- Use Astro's toolbar component library where it improves consistency.

### 3. Page Overlay Layer

Responsibilities:

- Highlight hovered elements during pick mode.
- Highlight the selected element.
- Show a small tooltip with tag, classes, dimensions, or selector.
- Avoid intercepting clicks except while picking.
- Clean up all overlay elements when the app deactivates.

Implementation notes:

- Overlay elements should be inserted into the document with stable internal attributes.
- Use high z-index values and `pointer-events: none` except when capturing pick-mode clicks.
- Keep overlay styling minimal and isolated.

### 4. Element Selection Engine

Responsibilities:

- Track hovered element.
- Ignore the toolbar UI and internal overlay nodes.
- Select a clicked page element.
- Produce a readable selector for display and copied CSS.
- Handle route changes or DOM replacement during Astro dev navigation.

Selector generation should be pragmatic:

- Prefer `id` when present and unique.
- Prefer meaningful class combinations when unique.
- Fall back to tag plus `nth-of-type` path.
- Treat generated selectors as helpful output, not guaranteed source truth.

### 5. Style Inspection Engine

Responsibilities:

- Read computed color values for the selected element.
- Inspect relevant matching CSS rules when possible.
- Detect likely declarations for:
  - `color`
  - `background-color`
  - `border-color`
  - CSS custom properties used by those properties
- Track the original values for reset.

Important limitation:

Computed CSS does not reliably expose which source declaration or CSS variable produced a final color. The tool should do best-effort inspection and clearly distinguish "detected token" from "computed fallback".

### 6. Live Edit Engine

Responsibilities:

- Apply preview changes immediately.
- Prefer editing CSS custom properties on the selected element or root when the user explicitly chooses a token.
- Use inline styles for temporary property-level previews.
- Keep a reversible record of every mutation made by the tool.
- Reset changes cleanly when requested.

Mutation policy:

- V1 should not write files.
- V1 may set inline styles or runtime CSS variables in the browser only.
- All browser mutations should be removable by reset, page refresh, or disabling the app.

### 7. Storage Layer

Responsibilities:

- Store local session data in browser storage.
- Persist recent colors.
- Persist current page adjustments across refreshes if enabled.
- Avoid storing large page snapshots or personal data.

Recommended storage:

- `localStorage` for simple project/page-scoped preferences.
- Key storage by origin and pathname.

### 8. Export Layer

Responsibilities:

- Generate copyable CSS output.
- Generate copyable CSS variable updates.
- Generate a short summary of changed values.
- Support "copy current declaration" and "copy all changes".

Output examples should be source-oriented:

- Selector block when editing direct properties.
- `:root` or scoped selector block when editing variables.
- Plain token assignment when a custom property is selected.

## Public Configuration

The integration should start with a small configuration surface.

Potential options:

- `enabled`: enable or disable the toolbar app.
- `defaultProperty`: initial property tab, such as `color` or `background-color`.
- `storage`: enable or disable local persistence.
- `ignoredSelectors`: selectors that cannot be picked.
- `rootVariableScopes`: selectors to inspect for custom properties, such as `:root`, `html`, `body`, or `[data-theme]`.
- `copyFormat`: default copied output format.

Keep all options optional. The zero-config experience should be good.

## UI Specification

### Toolbar Entry

The Astro toolbar entry should use a simple color-related icon and the name "Color Picker" or "Color Tuner".

When activated, it opens a compact floating tool window. The UI should feel like a focused dev instrument, not a landing page.

### Main Panel Regions

1. Header
   - Tool name.
   - Current mode indicator.
   - Close/deactivate affordance if appropriate.

2. Element target
   - Pick element button.
   - Selected element summary.
   - Manual selector input.
   - Clear selection action.

3. Property selector
   - Text color.
   - Background.
   - Border.
   - CSS variable.

4. Color editor
   - Native color input.
   - HEX input.
   - RGB or HSL readout.
   - Opacity control where applicable.
   - Eyedropper button when supported.

5. Token context
   - Detected variable name if found.
   - Scope where the variable appears, if known.
   - Toggle between editing direct style and editing variable preview.

6. Recent colors
   - Small swatches.
   - Current color.
   - Original color.

7. Actions
   - Reset current property.
   - Reset all changes.
   - Copy CSS.
   - Copy token.

### Interaction States

- Inactive: app registered but panel closed.
- Ready: panel open, no element selected.
- Picking: page hover highlights candidates.
- Selected: element selected and properties loaded.
- Editing: live preview active.
- Copied: transient success state after copying output.
- Error: recoverable issue such as invalid selector or unsupported color value.

### Visual Design Direction

- Compact, dense, and legible.
- Favor native controls where they are good enough.
- Use icons for clear commands such as pick, copy, reset, and eyedropper.
- Use text labels for property modes where ambiguity would slow the workflow.
- Avoid decorative UI.
- Keep border radius restrained.
- Use a neutral palette with a distinct accent that is not the whole visual theme.
- Ensure text and controls fit in narrow viewports.

### Accessibility Requirements

- All controls need accessible names.
- Buttons must have explicit button type.
- Inputs need labels or `aria-label`.
- Pick mode must be cancelable with Escape.
- Keyboard users should be able to tab through the panel.
- Color values must be editable as text, not only through visual controls.
- Copy success must be exposed as text or aria-live feedback.

## Color Editing Behavior

### Supported Initial Properties

V1:

- `color`
- `background-color`
- `border-color`
- CSS custom properties that resolve to color values

Later:

- Individual border sides.
- Outline color.
- Fill/stroke for inline SVG.
- Shadow colors.
- Gradients.

### Color Formats

V1 should parse and display:

- HEX
- RGB/RGBA
- HSL/HSLA

It should preserve original values for reset but can normalize copied output to a consistent format.

Potential later support:

- OKLCH
- Lab/LCH
- Named colors
- Color-mix

### CSS Variable Handling

The tool should detect obvious cases like:

- A matched CSS rule sets `color: var(--some-color)`.
- The selected element or ancestor defines `--some-color`.
- `:root` defines `--some-color`.

When a variable is detected:

- Show the variable name.
- Show the resolved current color.
- Let the user preview changing that variable.
- Warn through wording when the variable may affect more than the selected element.

When no variable is detected:

- Let the user edit the direct property.
- Generate selector-based CSS output.

## Element Picking Details

Picking mode should:

- Temporarily listen for pointer movement and clicks on the document.
- Highlight the deepest meaningful element under the pointer.
- Ignore the Astro toolbar, the app UI, overlays, `html`, `head`, `body`, `script`, `style`, and internal nodes.
- Prevent navigation when clicking links during pick mode.
- Stop after a successful selection.
- Be cancelable with Escape.

Selected element state should update if:

- The element is removed.
- The page route changes.
- The document reloads.
- The selector no longer matches.

## Copy Output Requirements

The copied CSS should be practical and minimal.

For direct property edits:

- Include the generated selector.
- Include only changed properties.
- Include comments only if needed to explain ambiguity.

For variable edits:

- Include the variable assignment.
- Include the inferred scope if known.
- Prefer the smallest safe scope detected by the tool.

For multiple changes:

- Group by selector or scope.
- Keep output deterministic.

## Suggested Repository Structure

Initial structure:

- `src/index.ts`: integration entrypoint.
- `src/app.ts`: Dev Toolbar app entrypoint.
- `src/core/selection.ts`: element picking and selector generation.
- `src/core/styles.ts`: computed style and rule inspection.
- `src/core/colors.ts`: color parsing and formatting.
- `src/core/mutations.ts`: live edit and reset logic.
- `src/core/storage.ts`: local persistence.
- `src/core/export.ts`: copy output generation.
- `src/ui/`: small DOM UI helpers/components.
- `src/types.ts`: shared types.
- `demo/`: local Astro demo project for manual testing.
- `tests/`: unit tests for pure logic.
- `README.md`: installation and usage.
- `DEVELOPMENT_PLAN.md`: this plan.

This structure may change during implementation, but the boundaries should remain: integration, toolbar UI, selection, style analysis, mutations, storage, and export.

## Dependency Strategy

Prefer minimal dependencies.

Likely dependencies:

- `astro` as a peer dependency.
- `typescript` for development.
- `vite` or a library build tool if needed.
- `vitest` for unit tests.
- `playwright` for browser interaction tests.

Avoid unless proven necessary:

- React or Preact for the toolbar UI.
- Large color picker packages.
- Large CSS parsing packages in the browser path.

A small color utility may be acceptable if it materially improves parsing correctness and bundle size remains reasonable.

## Development Phases

### Phase 0: Project Scaffold

Status: complete as of the initial scaffold.

Deliverables:

- Package metadata.
- TypeScript config.
- Build config.
- Lint/format decision.
- Minimal source layout.
- Demo Astro project.

Validation:

- Package builds.
- Demo project can reference the local package.
- No toolbar behavior required yet.

### Phase 1: Astro Integration Registration

Deliverables:

- Integration export.
- Dev Toolbar app registration.
- Stable app id.
- Toolbar icon.
- App entrypoint connected.

Validation:

- Running the demo with `astro dev` shows the toolbar app.
- Production build does not inject page behavior.

### Phase 2: UI Shell

Deliverables:

- Floating toolbar window.
- Basic panel layout.
- Pick button.
- Empty selected-element state.
- Static controls for property mode and color input.

Validation:

- UI renders inside the toolbar app ShadowRoot.
- Host page styles do not affect the panel.
- Controls are keyboard reachable.

### Phase 3: Element Picking

Deliverables:

- Pick mode.
- Hover highlight.
- Click-to-select.
- Escape-to-cancel.
- Element summary.
- Generated selector display.

Validation:

- Links do not navigate while picking.
- Toolbar and overlay elements cannot be selected.
- Highlight tracks scroll and resize.
- Selection works on nested elements.

### Phase 4: Style Inspection

Deliverables:

- Read computed color, background color, and border color.
- Show original values.
- Detect obvious CSS variable usage in matching rules.
- Handle transparent or unset values gracefully.

Validation:

- Works on static Astro markup.
- Works on React island output.
- Handles classes, ids, inline styles, and inherited text color.

### Phase 5: Live Editing And Reset

Deliverables:

- Apply direct property edits.
- Apply CSS variable preview edits.
- Track mutations.
- Reset current property.
- Reset all changes.

Validation:

- Edits are immediate.
- Reset restores original browser state.
- Multiple selected elements over a session do not leak stale mutations.

### Phase 6: Copy And Persistence

Deliverables:

- Copy current change.
- Copy all changes.
- Recent colors.
- Optional local persistence across refresh.
- Clear persisted session action.

Validation:

- Copied output is deterministic.
- Refresh restores expected session state when persistence is enabled.
- Persistence is scoped to origin and pathname.

### Phase 7: Polish And Hardening

Deliverables:

- Better invalid selector handling.
- Better unsupported color messaging.
- Eyedropper progressive enhancement.
- Responsive toolbar panel behavior.
- Accessibility pass.
- Demo pages covering common cases.

Validation:

- Manual test across Chromium, Firefox, and Safari where available.
- Playwright coverage for pick, edit, reset, and copy flows.
- No obvious layout overlap or clipped controls at mobile widths.

### Phase 8: Documentation And Release Prep

Deliverables:

- README installation.
- Usage guide.
- Known limitations.
- Troubleshooting.
- Release checklist.

Validation:

- A fresh Astro project can install and use the package from local build.
- Docs state exactly what is local-only and what is not.

## Testing Strategy

### Unit Tests

Focus on pure logic:

- Selector generation.
- Color parsing and normalization.
- CSS output generation.
- Storage key generation.
- Mutation record bookkeeping.

### Browser Tests

Use a demo Astro project with Playwright:

- Toolbar app appears in dev.
- Pick mode selects the intended element.
- Highlight overlay appears and disappears.
- Color changes update the page.
- Reset restores the original style.
- Copy output matches expectation.
- CSS variable preview works in simple cases.

### Manual Testing Matrix

Astro scenarios:

- Plain `.astro` page.
- Astro layout with global CSS.
- Astro project with React island.
- CSS variables in `:root`.
- Theme variables on `[data-theme]`.
- Tailwind-style utility classes.
- Inline styles.

Browsers:

- Chromium as primary.
- Firefox for core flows.
- Safari if available.

## Quality Checklist

Before calling the first version complete:

- The app is visible only in Astro dev toolbar.
- The panel does not inherit host page styles.
- The page layout does not shift when opening the tool.
- Element picking is accurate and cancelable.
- Direct property edits work.
- CSS variable edits work for obvious cases.
- Reset is reliable.
- Copy output is usable without cleanup.
- Recent colors work.
- Unsupported cases fail clearly.
- README explains installation, usage, and limitations.

## Key Risks

### CSS Source Detection Is Imperfect

Computed styles collapse the cascade and do not preserve source intent. The tool should avoid pretending it can always know where a color came from.

Mitigation:

- Present detected variables as "detected" or "likely".
- Provide direct property editing fallback.
- Make copy output easy to adjust manually.

### CSS Variables Can Have Broad Effects

Changing a root variable may affect more than the selected element.

Mitigation:

- Show variable scope.
- Warn when editing a root/global variable.
- Prefer preview-only mutation in v1.

### Host Page Interaction Conflicts

Click-to-pick can interfere with links, buttons, forms, and app interactions.

Mitigation:

- Only capture events during explicit pick mode.
- Prevent default action only in pick mode.
- Exit pick mode immediately after selection.

### Astro Toolbar API Version Drift

The toolbar API has version-specific behavior, especially around app entrypoints.

Mitigation:

- Pin and document supported Astro versions.
- Use official Astro APIs only.
- Keep integration code small and easy to adapt.

### Bundle Size Creep

Color picker UI can become dependency-heavy.

Mitigation:

- Start with native controls.
- Add custom controls only where they improve workflow.
- Review bundle size before adding dependencies.

## Open Questions

- Should the package name be private/internal or prepared for npm publishing from the start?
- Should copied output default to HEX, RGB, HSL, or preserve the user's input format?
- Should local persistence be enabled by default?
- Should variable inspection prioritize `:root`, nearest ancestor, or matched CSS rule order?
- Should v1 include a standalone demo site, or only a demo Astro project?
- Should there be a later opt-in file-writing mode for token files?

## Definition Of Done For MVP

The MVP is done when a developer can install the integration into an Astro project, open the Astro Dev Toolbar color picker during local development, select an element on the page, adjust one of its primary color properties live, reset the change, and copy usable CSS or token output back into the project.

No source-file write-back is required for MVP.
