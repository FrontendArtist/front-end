# Feature Context: Global SCSS Setup

## Overall Goal
To establish the project's foundational styling structure by creating all necessary global SCSS files, including variables, mixins, and base styles, within the `src/styles/` directory.

## File Structure & Content

**File: `src/styles/base/_variables.scss`**
```scss
:root {
  // === Colors ===
  --color-bg-primary: #061818;
  --color-text-primary: #F6D982;
  --color-title-hover: #F5C452;
  --color-card-text: #FFFAEA;
  --color-overlay: #002B20;

  // === Gradients ===
  --gradient-card-vertical: linear-gradient(to bottom, rgba(217, 217, 217, 0.3), rgba(115, 115, 115, 0.3));
  --gradient-card-horizontal-ltr: linear-gradient(to right, rgba(217, 217, 217, 0.3), rgba(115, 115, 115, 0.3));
  --gradient-card-horizontal-rtl: linear-gradient(to left, rgba(217, 217, 217, 0.3), rgba(115, 115, 115, 0.3));

  // === Typography ===
  --font-sm: 14px;
  --font-md: 16px;
  --font-lg: 20px;
  --font-xl: 32px;
  --line-height-sm: 1.4;
  --line-height-md: 1.6;
  --line-height-lg: 1.8;
  --font-weight-regular: 400;
  --font-weight-medium: 500;
  --font-weight-bold: 700;

  // === Spacing Desktop ===
  --space-section-top-desktop: 120px;
  --space-section-bottom-desktop: 100px;
  --space-title-content-desktop: 56px;
  --space-gap-desktop: 48px;
  --space-image-title-desktop: 32px;
  --space-title-text-desktop: 24px;
  --space-text-button-desktop: 24px;
  --space-container-x-desktop: 80px;
  --space-section-button-desktop: 40px;
}
File: src/styles/base/_mixins.scss

SCSS

// Breakpoints for mixin logic
$breakpoint-xl: 1280px;
$breakpoint-lg: 960px;
$breakpoint-md: 768px;
$breakpoint-sm: 440px;

@mixin respond($breakpoint) {
  @if $breakpoint == xl { @media (max-width: $breakpoint-xl) { @content; } }
  @if $breakpoint == lg { @media (max-width: $breakpoint-lg) { @content; } }
  @if $breakpoint == md { @media (max-width: $breakpoint-md) { @content; } }
  @if $breakpoint == sm { @media (max-width: $breakpoint-sm) { @content; } }
}

@mixin flex-center {
  display: flex;
  align-items: center;
  justify-content: center;
}

@mixin hover-transition {
  transition: all 0.3s ease-in-out;
}

@mixin card-container {
  padding: 24px;
  border-radius: 16px;
  @include hover-transition;
  @include respond(md) { padding: 16px; }
}

@mixin section-spacing {
  padding-top: var(--space-section-top-desktop);
  padding-bottom: var(--space-section-bottom-desktop);
  @include respond(md) {
    padding-top: 96px;
    padding-bottom: 80px;
  }
  @include respond(sm) {
    padding-top: 64px;
    padding-bottom: 56px;
  }
}

@mixin container {
  margin: 0 auto;
  padding-left: var(--space-container-x-desktop);
  padding-right: var(--space-container-x-desktop);
  max-width: $breakpoint-xl;
  @include respond(lg) {
    padding-left: 60px;
    padding-right: 60px;
  }
  @include respond(md) {
    padding-left: 40px;
    padding-right: 40px;
  }
  @include respond(sm) {
    padding-left: 20px;
    padding-right: 20px;
  }
}
File: src/styles/base/_typography.scss

SCSS

h1, h2, h3, h4, h5, h6 {
  font-weight: var(--font-weight-bold);
  color: var(--color-title-hover);
}

p {
  font-size: var(--font-md);
  line-height: var(--line-height-md);
  color: var(--color-text-primary);
}
File: src/styles/components/_cards.scss

SCSS

.card {
  @include card-container;
  color: var(--color-card-text);
  border: 1px solid var(--color-text-primary);
  @include hover-transition;

  &.vertical-gradient { background: var(--gradient-card-vertical); }
  &.horizontal-ltr { background: var(--gradient-card-horizontal-ltr); }
  &.horizontal-rtl { background: var(--gradient-card-horizontal-rtl); }

  &:hover {
    transform: scale(1.02);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
  }
}

.card-title {
  margin-top: var(--space-image-title-desktop);
  margin-bottom: var(--space-title-text-desktop);
  font-size: var(--font-lg);
  font-weight: var(--font-weight-medium);
}

.card-text {
  margin-bottom: var(--space-text-button-desktop);
  font-size: var(--font-md);
}

.card-button {
  background: var(--color-title-hover);
  color: var(--color-bg-primary);
  border: none;
  padding: 12px 24px;
  border-radius: 8px;
  cursor: pointer;
  @include hover-transition;

  &:hover {
    background: var(--color-text-primary);
  }
}
File: src/styles/components/_containers.scss

SCSS

.container {
  @include container;
}
File: src/styles/components/_sections.scss

SCSS

.section {
  @include section-spacing;
  background-color: var(--color-bg-primary);
  color: var(--color-text-primary);
}
File: src/styles/components/_overlays.scss

SCSS

.overlay {
  background-color: var(--color-overlay);
  backdrop-filter: blur(8px);
  border-radius: 16px;
}
File: src/styles/main.scss

SCSS

// Base files that define variables, mixins, and base styles
@import 'base/variables';
@import 'base/mixins';
@import 'base/typography';

// Global component classes
@import 'components/cards';
@import 'components/containers';
@import 'components/sections';
@import 'components/overlays';