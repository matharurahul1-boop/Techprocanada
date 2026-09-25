# Add Company screen

## What will change
- Add **Company** to the left navigation.
- Create a Company screen with a single company-name text field.
- Match the existing Tool Types and Brand workflow: floating add button, add/edit form, and icon-only edit/remove actions.
- Save companies in the current local browser storage so the screen works before the backend is connected.

## Technical details
- Extend the shared inventory store with company records and add, edit, and remove actions.
- Add a `/company` route with its own page title and social metadata.
- Keep existing screens and workflows unchanged.
- Verify the page, navigation, and add/edit actions on the running app.
