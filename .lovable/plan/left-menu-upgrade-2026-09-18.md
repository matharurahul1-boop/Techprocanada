# Left Menu Upgrade

## What will change
- Add a distinct Lucide icon beside every navigation destination, with icons remaining visible when the menu is compact.
- Add an icon-only control in the menu header to minimise and expand the desktop menu, including an accessible label and tooltip.
- Remember the chosen menu width in the browser so it stays consistent between screens and reloads.
- Keep the current compact top navigation on phones while adding the same icons for faster recognition.

## Visual treatment
- Give the left menu its own premium glass style with stronger blur, layered highlights, and a restrained crimson tint.
- Highlight the current screen with the existing red gradient, while keeping inactive links readable in both day and night themes.
- Animate the width and label reveal smoothly, with motion disabled for users who prefer reduced motion.

## Technical details
- Extend the existing navigation data in `Shell` with Lucide icon components.
- Store only the presentation preference (`expanded` or `minimised`) locally; no inventory data or workflows change.
- Add semantic sidebar-glass tokens and a reusable utility in the global theme stylesheet.
- Verify expanded and compact states on desktop, plus the icon navigation on mobile, in both themes.
