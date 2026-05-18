# Design Document: High-Fidelity Brand-Aligned Organization Profile Redesign

**Date:** 2026-05-18  
**Status:** Approved  
**Author:** Antigravity AI Coding Assistant  

---

## 1. Goal & Context
The user wants to revamp the Watsub Project Management Organization Profile page to perfectly match their custom high-fidelity brand guidelines:
1. **Full Dark Theme:** The page must use a premium dark theme (`bg-[#0c0d12]` matching `brandColors.dark`) with colorful neon ambient glows (`#D2FA00` Lime Yellow, `#F4622A` Orange, `#6B3FA0` Purple, and `#3EADD4` Blue) floating in the background to provide real glassmorphic depth.
2. **True Brand Logos & Taglines:** Render the high-resolution stacked logo `logo_watsub_stacked.png` at the top of the page, paired with a massive, bold geometric tagline **"CONNECT. CREATE. INSPIRE."** in all-caps uppercase styling resembling Futura.
3. **Core Values (3 Pillars) Frame Assets:**
   - **#VIBES (City & Lifestyle):** Styled inside a beautiful **Stamp Frame** using the uploaded `frame_stamp.png` asset.
   - **#SOUL (Human & Idea):** Styled inside a realistic **Polaroid Frame** using the `frame_polaroid.png` asset with a subtle natural rotation.
   - **#JOINT (Work & Opportunity):** Styled inside a custom **Bracket Frame** using the `frame_bracket.png` asset with big orange brackets.
4. **Preserved Editing:** Admin must still be able to edit all organization fields via the hover pencil buttons and the `OrgAdminEditor`.

---

## 2. Architecture & Design Details

### 2.1 Color Palette & Theme Canvas
We will set a solid dark page wrapper:
```tsx
<div className="min-h-full bg-[#0c0d12] text-white font-sans relative overflow-hidden pb-12">
```
To provide the glowing ambient glass background, we will insert multiple blurry radial glow circles:
- Top-Left Glow: `#D2FA00` (Lime Yellow) at `opacity-10`, `blur-3xl`, `w-96 h-96`
- Middle-Right Glow: `#F4622A` (Orange) at `opacity-[0.07]`, `blur-3xl`, `w-96 h-96`
- Bottom-Left Glow: `#6B3FA0` (Purple) at `opacity-[0.08]`, `blur-3xl`, `w-96 h-96`

### 2.2 Brand Headers & Assets
At the very top, we will display a stunning brand banner:
- Left: The `logo_watsub_stacked.png` (stacked, bold italic logo with chunky black shadow) sized at `h-16 w-auto`.
- Right: Large geometric bold text:
  ```tsx
  <h2 className="text-xl sm:text-2xl font-black tracking-[0.2em] text-[#D2FA00] uppercase">
    CONNECT. CREATE. INSPIRE.
  </h2>
  ```

### 2.3 The 3 Pillars Custom Framing
We will design a dedicated flex/grid container for the 3 Content Pillars, rendering them with their exact brand frame overlays:
- **#VIBES (Stamp Frame):**
  - Container with a background image of `/frame_stamp.png` (object-contain).
  - Centered text inside the stamp frame with `#D2FA00` text highlights.
- **#SOUL (Polaroid Frame):**
  - White polaroid container (`/frame_polaroid.png`) with natural drop-shadow, tilted slightly using `rotate-1 hover:rotate-0 transition-transform`.
  - Dark text inside the polaroid (matching authentic polaroid photos).
- **#JOINT (Bracket Frame):**
  - Container styled with `/frame_bracket.png` as the background border.
  - Symmetrical padded layout with `#F4622A` accent colors.

---

## 3. Verification Plan

### 3.1 Visual Verification
1. Run local dev server with `npm run dev`.
2. Inspect the `/organization` route on both desktop and mobile viewports.
3. Confirm that the background is pitch-dark with vibrant neon glows, and all three custom frame cards (Stamp, Polaroid, Bracket) render with pixel-perfect accuracy.

### 3.2 Compilation & Integrity Checks
1. Run `npx tsc --noEmit` to ensure zero compilation or import errors.
2. Run `npm run build` to verify production bundling compiles successfully.
3. Run `npm run test` to verify all 39 tests pass.
