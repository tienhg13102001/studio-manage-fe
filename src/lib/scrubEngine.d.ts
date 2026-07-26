// Type surface for the vendored vanilla-JS scroll-world engine (scrubEngine.js).
// Only the bits WorldPage.tsx relies on are typed; the config is intentionally
// loose since the engine reads many optional fields.
export interface ScrollWorldSection {
  id?: string;
  label?: string;
  still?: string;
  stillMobile?: string;
  clip?: string;
  clipMobile?: string;
  accent?: string;
  focus?: string;
  scroll?: number;
  linger?: number;
  eyebrow?: string;
  title?: string;
  body?: string;
  tags?: string[];
  cta?: {
    primary?: { label: string; href?: string };
    secondary?: { label: string; href?: string };
  };
}

export interface ScrollWorldConfig {
  brand?: { name?: string; href?: string; logo?: string };
  hint?: string;
  nav?: boolean;
  atmosphere?: boolean;
  crossfade?: number;
  diveScroll?: number;
  connScroll?: number;
  cta?: { label?: string; href?: string };
  sections: ScrollWorldSection[];
  connectors?: (string | null)[];
  connectorsMobile?: (string | null)[];
}

export interface ScrollWorldInstance {
  destroy(): void;
}

export function mountScrollWorld(
  container: HTMLElement,
  config: ScrollWorldConfig,
): ScrollWorldInstance;
