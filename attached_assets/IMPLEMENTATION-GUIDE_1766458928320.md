# Sentinel UI Redesign - Implementation Guide

## Overview

This guide will help you safely implement the new design system into your existing Replit app without breaking functionality. The key is to work **incrementally** and use CSS variables for easy theming.

---

## Step 1: Add the Font Imports

Add this to your main HTML file (`index.html`) in the `<head>` section:

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=Playfair+Display:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
```

---

## Step 2: Import the Theme File

### Option A: If using plain CSS
Copy `sentinel-theme.css` to your project's styles folder and import it at the top of your main CSS file:

```css
@import './sentinel-theme.css';
```

### Option B: If using React/Next.js
Import in your root layout or App component:

```jsx
import './sentinel-theme.css';
```

### Option C: If using Tailwind CSS
You can extend your `tailwind.config.js` with these colors:

```js
module.exports = {
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#34d399',
          dark: '#10b981',
          light: '#6ee7b7',
        },
        surface: {
          base: '#0a0a0f',
          elevated: '#12121a',
        }
      },
      fontFamily: {
        display: ['Playfair Display', 'Georgia', 'serif'],
        body: ['DM Sans', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      }
    }
  }
}
```

---

## Step 3: Apply the Theme Wrapper

Add the `sentinel-theme` class to your root container to enable the global styles:

```jsx
// In your App.jsx or layout
<div className="sentinel-theme">
  {/* Your existing app content */}
</div>
```

---

## Step 4: Migrate Components Incrementally

### Priority Order (safest approach):

1. **Colors first** - Update background and text colors using CSS variables
2. **Typography second** - Apply new font families
3. **Buttons & inputs** - Update interactive elements
4. **Cards & containers** - Apply new border radius and shadows
5. **Navigation** - Update sidebar and tabs last (most complex)

### Example: Updating a Button

**Before:**
```jsx
<button style={{ 
  background: '#4F46E5', 
  color: 'white',
  padding: '8px 16px',
  borderRadius: '4px'
}}>
  Edit Deal
</button>
```

**After:**
```jsx
<button className="btn btn-primary">
  Edit Deal
</button>
```

Or with inline styles using CSS variables:
```jsx
<button style={{ 
  background: 'linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-dark) 100%)', 
  color: 'var(--color-bg-base)',
  padding: 'var(--space-2) var(--space-4)',
  borderRadius: 'var(--radius-lg)',
  border: 'none',
  cursor: 'pointer'
}}>
  Edit Deal
</button>
```

---

## Step 5: Component-by-Component Migration

### Sidebar Navigation

Replace your existing nav items with:

```jsx
<button 
  className={`nav-item ${isActive ? 'active' : ''}`}
  onClick={handleClick}
>
  <IconComponent size={18} />
  <span>Label</span>
</button>
```

### Cards

Wrap content sections with:

```jsx
<div className="card">
  <div className="card-header">
    <h3>Title</h3>
  </div>
  <div className="card-body">
    {/* Content */}
  </div>
</div>
```

### Badges/Status Tags

```jsx
<span className="badge badge-success">Active</span>
<span className="badge badge-warning">Pending</span>
<span className="badge badge-error">Urgent</span>
```

### Tabs

```jsx
<div className="tabs">
  {tabs.map(tab => (
    <button 
      key={tab}
      className={`tab ${activeTab === tab ? 'active' : ''}`}
      onClick={() => setActiveTab(tab)}
    >
      {tab}
    </button>
  ))}
</div>
```

---

## Step 6: Testing Checklist

After each component update, verify:

- [ ] Component renders correctly
- [ ] Click handlers still work
- [ ] Forms submit properly
- [ ] Data displays correctly
- [ ] Responsive behavior is intact
- [ ] No console errors

---

## Quick Reference: Color Mapping

| Old Color Purpose | New CSS Variable |
|-------------------|------------------|
| Primary/Accent | `var(--color-primary)` |
| Background | `var(--color-bg-base)` |
| Card background | `var(--color-bg-surface)` |
| Text | `var(--color-text-primary)` |
| Muted text | `var(--color-text-muted)` |
| Borders | `var(--color-border)` |
| Success/Green | `var(--color-success)` |
| Warning/Yellow | `var(--color-warning)` |
| Error/Red | `var(--color-error)` |
| Info/Blue | `var(--color-info)` |

---

## Rollback Plan

If something breaks:

1. **Git**: If using version control, you can revert: `git checkout -- path/to/file`
2. **Manual**: Keep a backup of your original CSS before making changes
3. **Toggle**: You can conditionally apply the theme:

```jsx
<div className={useNewTheme ? 'sentinel-theme' : ''}>
```

---

## Need Help?

If you want, I can help you:
- Create specific component replacements for your existing code
- Build a migration script
- Set up a feature flag to toggle between old/new design
- Review your current code and suggest the safest migration path

Just share your current component code and I'll provide the exact updates needed!
