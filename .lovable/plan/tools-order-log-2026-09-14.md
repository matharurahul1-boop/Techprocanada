# Tools Order Log

## What will be built
- Add a new **Tools Order Log** screen to the floating left menu.
- Show saved order records with index, tool name, brand, quantity ordered, amount, previous quantity, total quantity, document, purchase date, confirmation status, and delete action.
- Add compact filters for the searchable fields, newest-first sorting, and pagination at 15 records per page.
- Make the log easy to read on desktop and mobile while matching the existing TechPro style.
- Add a display-only confirmation switch for each order; changing it will not affect inventory quantities or balance.

## Technical details
- Extend saved order records with an optional confirmation value that remains compatible with existing browser data.
- Create the TanStack route at `/tools-order-log` with unique page metadata.
- Add an order update action for confirmation and reuse the existing order removal behavior.
- Calculate each row’s previous and total quantity from the chronological order history for its inventory item.
- Verify filtering, confirmation, deletion, pagination, and desktop/mobile layouts.
