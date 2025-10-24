# Fix View Toggle - Cards & List Buttons

## Problem Analysis
The Cards ↔ List toggle buttons are not working. Investigation reveals:

1. **JavaScript is loaded correctly** - Script is included in base.html
2. **CSS classes exist** - `.list-view` styles are defined
3. **Buttons are created** - Code creates buttons in `.header-right`
4. **Event listeners attached** - Click events are set up

**Possible issues**:
- Buttons are created but may not be visible
- CSS conflicts or specificity issues
- List view styles not being applied correctly
- Icon insertion might fail silently

## Root Causes Identified

### Issue 1: Buttons may not be visible/styled correctly
The buttons use `view-toggle` class but inline styles for container may conflict.

### Issue 2: List view styles may need refinement
Current list view layout needs:
- Better visual distinction from cards
- More compact layout
- Clear horizontal alignment
- Icons properly integrated

### Issue 3: Design consistency
Need to ensure toggle buttons match the minimalist design:
- Consistent with theme toggle
- Clear visual feedback
- Mobile responsive

## Solution Plan

### 1. Verify Button Rendering
- Check if `.header-right` exists
- Ensure buttons are visible
- Verify event listeners work
- Add console logging for debugging

### 2. Improve CSS Specificity
- Make `.list-view` styles more specific
- Add `!important` where needed (sparingly)
- Ensure list view overrides card grid

### 3. Enhance List View Design
Current list view should:
- Display items in single column (all screens)
- Show icon + title + meta in horizontal row
- Remove thumbnails and summaries
- Compact padding and spacing
- Clear visual separation from cards

### 4. Style Toggle Buttons
Make buttons match existing design:
```css
.view-toggle {
    /* Match theme-toggle style */
    background: none;
    border: 1px solid var(--border);
    color: var(--fg);
    padding: 6px 12px;
    border-radius: 4px;
    cursor: pointer;
    font-size: 14px;
    transition: all 0.2s;
}

.view-toggle.active {
    background: var(--accent);
    color: white;
    border-color: var(--accent);
}
```

### 5. Debug JavaScript
Add console.log statements to verify:
- Script loads
- Functions execute
- Buttons are created
- Click events fire
- Classes are applied

### 6. Test Workflow
1. Check browser console for errors
2. Verify buttons appear in header
3. Click Cards button → should remove `.list-view` class
4. Click List button → should add `.list-view` class
5. Verify localStorage saves preference
6. Reload page → preference should persist

## Implementation Steps

### Step 1: Add Debug Logging to JS
```javascript
console.log('[ViewToggle] Script loaded');
console.log('[ViewToggle] Current view:', currentView);
console.log('[ViewToggle] Header found:', headerRight ? 'yes' : 'no');
console.log('[ViewToggle] Applying view:', view);
console.log('[ViewToggle] Body classList:', body.classList);
```

### Step 2: Improve CSS List View
```css
/* Ensure list view overrides grid */
body.list-view .list {
    display: flex !important;
    flex-direction: column !important;
    grid-template-columns: none !important;
    gap: 8px;
}

/* List view card layout */
body.list-view .card {
    display: flex;
    flex-direction: row;
    align-items: center;
    padding: 12px 16px;
    gap: 12px;
}

/* Icon in list view */
body.list-view .card-icon {
    font-size: 24px;
    flex-shrink: 0;
}

/* Title in list view */
body.list-view .card h3 {
    margin: 0;
    flex: 1;
    font-size: 15px;
}

/* Hide non-essential info */
body.list-view .summary,
body.list-view .thumbnail {
    display: none !important;
}

/* Meta info compact */
body.list-view .meta {
    margin: 0;
    font-size: 12px;
    display: flex;
    gap: 8px;
    align-items: center;
}
```

### Step 3: Fix Button Container
```javascript
// Remove inline styles, use CSS class
const buttonsContainer = document.createElement('div');
buttonsContainer.className = 'view-toggle-container';

// CSS for container
.view-toggle-container {
    display: flex;
    gap: 8px;
    align-items: center;
}
```

### Step 4: Ensure Script Load Order
Verify in base.html:
```html
<script src="/static/theme.js" defer></script>
<script src="/static/timeago.js" defer></script>
<script src="/static/read-tracker.js" defer></script>
<script src="/static/view-toggle.js" defer></script>
```

### Step 5: Mobile Responsive Buttons
```css
@media (max-width: 699px) {
    .view-toggle-container {
        width: 100%;
        justify-content: stretch;
    }
    
    .view-toggle {
        flex: 1;
    }
}
```

## Files to Modify

1. **`app/web/static/view-toggle.js`**
   - Add debug console.log statements
   - Change inline styles to CSS class for container
   - Ensure proper DOM ready check
   - Verify selector specificity

2. **`app/web/static/styles.css`**
   - Improve `.list-view` CSS specificity (use `body.list-view`)
   - Add `!important` to critical overrides
   - Refine list view layout (horizontal items)
   - Add `.view-toggle-container` styles
   - Ensure mobile responsive

3. **Testing checklist**
   - [ ] Open browser developer console
   - [ ] Check for JavaScript errors
   - [ ] Verify buttons appear in header
   - [ ] Click Cards button
   - [ ] Click List button
   - [ ] Check body class changes
   - [ ] Verify visual changes
   - [ ] Test localStorage persistence
   - [ ] Test on mobile viewport

## Expected Outcome

**Cards View** (default):
- Grid layout (1/2/3 columns based on screen width)
- Full card with title, meta, summary, thumbnail
- Vertical stacking

**List View** (toggle):
- Single column, horizontal items
- Icon + Title + Meta in row
- Compact spacing
- No summaries or thumbnails
- Clear visual differentiation

**Toggle Buttons**:
- Visible in header next to theme toggle
- Clear active state
- Smooth transitions
- Mobile responsive

## Success Criteria
- ✅ Buttons appear in header
- ✅ Click Cards → cards view
- ✅ Click List → list view
- ✅ Active button highlighted
- ✅ Icons appear in list view
- ✅ Preference persists on reload
- ✅ Mobile responsive
- ✅ No console errors

