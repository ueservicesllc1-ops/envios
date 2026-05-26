---
name: Vibrant Velocity
colors:
  surface: '#fcf9f8'
  surface-dim: '#dcd9d9'
  surface-bright: '#fcf9f8'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f6f3f2'
  surface-container: '#f0eded'
  surface-container-high: '#eae7e7'
  surface-container-highest: '#e5e2e1'
  on-surface: '#1c1b1b'
  on-surface-variant: '#5a4136'
  inverse-surface: '#313030'
  inverse-on-surface: '#f3f0ef'
  outline: '#8e7164'
  outline-variant: '#e2bfb0'
  surface-tint: '#a04100'
  primary: '#a04100'
  on-primary: '#ffffff'
  primary-container: '#ff6b00'
  on-primary-container: '#572000'
  inverse-primary: '#ffb693'
  secondary: '#bb000f'
  on-secondary: '#ffffff'
  secondary-container: '#e32322'
  on-secondary-container: '#fffbff'
  tertiary: '#006e2f'
  on-tertiary: '#ffffff'
  tertiary-container: '#00b050'
  on-tertiary-container: '#003a15'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#ffdbcc'
  primary-fixed-dim: '#ffb693'
  on-primary-fixed: '#351000'
  on-primary-fixed-variant: '#7a3000'
  secondary-fixed: '#ffdad5'
  secondary-fixed-dim: '#ffb4aa'
  on-secondary-fixed: '#410002'
  on-secondary-fixed-variant: '#930009'
  tertiary-fixed: '#6bff8f'
  tertiary-fixed-dim: '#4ae176'
  on-tertiary-fixed: '#002109'
  on-tertiary-fixed-variant: '#005321'
  background: '#fcf9f8'
  on-background: '#1c1b1b'
  surface-variant: '#e5e2e1'
typography:
  display-lg:
    fontFamily: Inter
    fontSize: 40px
    fontWeight: '800'
    lineHeight: 48px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.01em
  headline-lg-mobile:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
  title-md:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 24px
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-sm:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  price-lg:
    fontFamily: Inter
    fontSize: 22px
    fontWeight: '700'
    lineHeight: 28px
  label-bold:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '700'
    lineHeight: 16px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 4px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 40px
  gutter: 12px
  margin-mobile: 12px
  margin-desktop: 24px
---

## Brand & Style
This design system is engineered for high-conversion, high-density e-commerce environments. It evokes a sense of urgency, excitement, and accessibility, mirroring the fast-paced nature of modern global marketplaces. The brand personality is unapologetically energetic, retail-focused, and social.

The design style is **Corporate Modern with a High-Contrast retail edge**. It prioritizes extreme clarity and visual "hooks"—such as bright accents and density—to keep users engaged in a continuous scroll. The UI stays out of the way of product photography while using strategic bursts of color to guide the eye toward "Buy" actions and limited-time offers.

## Colors
The palette is dominated by **Energetic Orange (#FF6B00)**, reserved exclusively for primary conversion points and Flash Sale indicators. 

- **Primary (Orange):** Used for "Add to Cart," "Buy Now," and key promotional banners.
- **Secondary (Discount Red):** A high-visibility #E02020 used strictly for price drops, discount percentages, and countdown timers.
- **Tertiary (Success Green):** Used for positive social proof, "In Stock" indicators, and verified purchase badges.
- **Neutrals:** A range of grays from #1A1A1A (Text) to #F7F7F7 (Secondary backgrounds) ensures that product images remain the focal point without the UI feeling stark.

## Typography
We use **Inter** for its exceptional readability at small sizes and its neutral, modern aesthetic. 

The type hierarchy is optimized for retail:
- **Price Display:** Prices use a specific `price-lg` style with heavy weights and the secondary red color to ensure they are the first thing a user sees on a product card.
- **High Density:** Body text is kept to `body-sm` (14px) for product descriptions and secondary details to allow for more content on screen.
- **Urgency:** Labels for "Flash Sale" or "Limited Stock" use the `label-bold` style with uppercase transformations to create a "badge" feel.

## Layout & Spacing
The layout follows a **High-Density Fluid Grid** model. On mobile, we prioritize a 2-column product feed with minimal margins (12px) to maximize image real estate. 

- **Grid:** 12-column system for desktop; 2-column (side-by-side) for mobile product listings.
- **Spacing Rhythm:** Based on a 4px scale. Most common spacing between elements within a card is 4px or 8px (`xs` or `sm`) to keep the interface compact.
- **Reflow:** On tablet, the 2-column mobile view expands to 3 or 4 columns. On desktop, the grid expands to a maximum of 6 columns per row for product feeds.

## Elevation & Depth
This design system uses **Tonal Layers** and **Low-Contrast Outlines** rather than heavy shadows to maintain a clean, fast-loading aesthetic.

- **Product Cards:** Use a subtle 1px border (#EEEEEE) and no shadow by default. On hover (desktop), apply a soft, neutral ambient shadow to lift the card.
- **Floating Actions:** "Back to Top" or "Sticky Cart" buttons use a medium-diffusion shadow to separate them from the dense content layer.
- **Modals & Drawers:** Use a 20% opacity black backdrop blur to maintain context while focusing the user on the checkout or filter action.

## Shapes
The shape language is **friendly and modern**, utilizing a consistent 8px (0.5rem) base radius.

- **Core Elements:** Buttons, Input fields, and Product Cards use the 8px radius (`rounded`).
- **Promotional Badges:** "Flash Sale" and discount tags use a 4px radius (`rounded-sm`) to feel slightly sharper and more "urgent."
- **Interactive Icons:** Small utility buttons (like "Add to Wishlist" heart) should be fully circular to distinguish them from functional CTA buttons.

## Components
- **Buttons:** Primary buttons are Solid Orange (#FF6B00) with white text, bold weight. Secondary buttons use a ghost style with an orange border.
- **Product Cards:** Highly dense. Image (1:1 ratio), followed by a 4px gap to the Title (max 2 lines), followed by the Price in Bold Red. Social proof (stars) and "Sold Count" are placed immediately below the price in `body-xs` gray text.
- **Flash Sale Banner:** High-contrast background (Orange or Red), featuring a white countdown timer with monospaced digits for stability.
- **Social Proof Elements:** Star ratings use a gold #FFC107. "Verified Purchase" badges use a small green checkmark icon with `label-bold` text.
- **Input Fields:** Clean white backgrounds with 1px gray borders. On focus, the border shifts to Orange.
- **Chips/Filters:** Rounded pill shapes with light gray backgrounds that turn Orange with white text when selected.