# Tool Assigned Log

## What will be built
- Add a new **Tool Assigned Log** screen to the floating left menu.
- Show every saved assignment in a clean table inspired by the reference: index, issued date, quantity, tool, tool type, current balance, and recipient.
- Add a compact filter row for date, quantity, tool, type, and recipient.
- Sort newest assignments first and paginate the results at 15 rows per page.
- Provide a mobile layout that keeps the same information readable without a wide table.

## Technical details
- Create a new TanStack route at `/tool-assigned-log` with unique page metadata.
- Read existing assignments, inventory items, tool types, and users from the current local store; no backend changes.
- Add the route to the shared navigation and use the existing TechPro tokens, floating panels, typography, and controls.
- Verify route loading, filters, pagination behavior, and desktop/mobile presentation.
