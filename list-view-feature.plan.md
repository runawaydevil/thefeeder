# Version 0.0.2 - List View and Link Colors

## Overview
Add a toggle to switch between Cards view (current) and List view (compact with icons), improve link colors for better aesthetics, and update version to 0.0.2.

## Changes Required

### 1. Version Update (`app/__init__.py`)
Update version from `0.0.1` to `0.0.2`:
```python
__version__ = "0.0.2"
```

### 2. Templates (`app/web/templates/base.html`)
Add the new JavaScript file to load view toggle functionality:
```html
<script src="/static/view-toggle.js" defer></script>
```

### 3. Link Colors (`app/web/static/styles.css`)
Update link colors from default blue to a more pleasant color scheme:
- Change `.card h3 a` color to use `--fg` by default
- On hover, use a softer accent color
- Update footer link colors for consistency
- Ensure good contrast for accessibility

Suggested colors:
- Links: `#2c5282` (slate blue) or `#2d3748` (dark gray)
- Hover: `#1a365d` (deeper blue) or `--accent`

### 4. JavaScript Features (`app/web/static/view-toggle.js`)
Already created with:
- Icon mapping for popular feeds (YouTube, GitHub, Reddit, Dev.to, Hacker News)
- Toggle between Cards and List view
- Save preference in localStorage
- Add feed icons dynamically in list view

### 5. CSS Styling (`app/web/static/styles.css`)
Already added:
- List view layout (horizontal cards)
- View toggle buttons with active state
- Hide summary and thumbnails in list view
- Compact meta information

### 6. Documentation Updates
- `README.md` - Update version and add list view feature
- `CHANGELOG.md` - Add v0.0.2 entry with new features
- Version will auto-update in footer from `__init__.py`

## Files to Modify
1. `app/__init__.py` - Update version to 0.0.2
2. `app/web/templates/base.html` - Add view-toggle.js script
3. `app/web/static/styles.css` - Update link colors
4. `README.md` - Document list view feature
5. `CHANGELOG.md` - Add v0.0.2 changelog entry

## Features

### List View Toggle
- **Toggle Buttons**: Cards ☐ and List ☰ buttons in header
- **Feed Icons**: Automatic detection based on feed name
  - 📺 YouTube
  - 💻 GitHub
  - 🔴 Reddit
  - 💜 Dev.to
  - 🍊 Hacker News
  - 📰 Default
- **Persistent**: View preference saved in localStorage
- **Compact Layout**: List view shows only essential info
- **Responsive**: Works on mobile with existing responsive CSS

### Link Colors
- More pleasant, readable link colors
- Consistent across the application
- Maintains accessibility (WCAG AA contrast)

## Expected Behavior
- User can toggle between Cards and List view
- List view shows articles in compact horizontal layout
- Each article shows icon, title, feed name, date, author
- Summary and thumbnails hidden in list view
- Preference persists across page reloads
- Links have improved colors throughout the site
- Footer displays "Version 0.0.2"

## Implementation Order
1. Update version in `app/__init__.py`
2. Add script tag to `base.html`
3. Update link colors in `styles.css`
4. Update `README.md` with new feature
5. Update `CHANGELOG.md` with v0.0.2 changes
6. Test functionality
7. Commit and push to GitHub/Forgejo

