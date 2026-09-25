# Timeliness Configuration screen

## What will change
- Add **Timeliness Configuration** to the desktop left menu and the mobile **More** menu.
- Create a responsive screen matching the existing glass styling and add/edit/remove workflow.
- Provide these fields: Report Name, Report Table, Frequency, Day of Submission, and Submitted By.
- Use fixed report options (Inventory Assigned, Inventory Orders, Machining Hours, Inventory Items), weekly/monthly/quarterly frequencies, all weekdays, and the existing Users list for Submitted By.
- Save configurations in the current local browser storage for the client showcase.

## Technical details
- Extend the shared frontend store with timeliness configuration records and add, update, and remove actions.
- Add a `/timeliness-configuration` route with unique page and social metadata.
- Display saved configurations in a clean responsive list with icon-only edit and remove actions.
- Verify add, edit, remove, navigation, and mobile presentation in the running app.
