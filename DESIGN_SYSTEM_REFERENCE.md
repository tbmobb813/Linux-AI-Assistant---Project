# Linux AI Assistant - Design System Reference

**Status**: Complete reference guide for UI/UX implementation  
**Version**: 1.0 (November 2025)  
**Based on**: Industry best practices + developer-focused patterns

---

## Quick Reference

### Color System (Tokyo Night Dark)

```css
--bg-primary: #1a1b26; /* Main background */
--bg-secondary: #24283b; /* Elevated surfaces */
--bg-tertiary: #414868; /* Hover states */
--accent-primary: #7aa2f7; /* Primary actions */
--text-primary: #c0caf5; /* Main text */
```

### Typography

- **Body**: Inter (fallback: system-ui)
- **Code**: JetBrains Mono (fallback: SF Mono)
- **Base size**: 16px (1rem)
- **Code line-height**: 1.6

### Component Patterns

- **Message bubbles**: 16px border-radius (4px on tail corner)
- **Code blocks**: Syntax highlighting + line numbers + copy button
- **Input field**: Auto-expand (max 200px height)
- **Loading**: Smooth spinner at 530ms blink rate

### Accessibility Requirements

- **Contrast ratio**: 4.5:1 minimum (normal text)
- **Focus indicators**: 2px outline, accent color
- **Keyboard nav**: All actions accessible via keyboard
- **ARIA labels**: All icons and interactive elements

### Animation Principles

- **Fast**: 150ms (button clicks, hover states)
- **Normal**: 250ms (panel transitions)
- **Smooth**: Use `transform` and `opacity` only (GPU-accelerated)
- **60fps minimum** for all animations

---

## Implementation Status

### ✅ Already Implemented

- [x] Dark mode color system (Tokyo Night inspired)
- [x] Tailwind CSS configuration
- [x] Message bubble components
- [x] Code syntax highlighting
- [x] Responsive three-panel layout
- [x] Keyboard shortcuts system

### 🚧 In Progress (Sprint 1)

- [ ] Enhanced message actions (copy, regenerate, edit)
- [ ] Auto-expanding input field
- [ ] Context panel (files, git, quick actions)
- [ ] Loading states and animations
- [ ] Error state components

### ⏳ Planned (Sprint 2+)

- [ ] Command palette (Ctrl+K)
- [ ] Multi-model selector UI
- [ ] Conversation branching visualization
- [ ] Code artifacts panel with live preview
- [ ] Voice input interface

---

## Key Design Principles

### 1. Developer-First

- Keyboard shortcuts for everything
- Terminal aesthetics + modern polish
- Code as first-class citizen
- No decoration for decoration's sake

### 2. Performance is UX

- Fast load times (<1.5s FCP)
- Smooth 60fps animations
- Instant feedback on all actions
- GPU-accelerated transitions

### 3. Accessibility

- WCAG 2.1 AA compliance
- Screen reader support
- Keyboard navigation
- Proper semantic HTML

### 4. Responsive Design

- Mobile-first approach
- Touch targets 44x44px minimum
- Progressive enhancement
- Three breakpoints: 640px, 1024px, 1280px

---

## Component Library

### Core Components (Implemented)

- `MessageBubble` - User/assistant messages with markdown
- `CodeBlock` - Syntax highlighted code with copy button
- `ChatInput` - Auto-expanding textarea
- `ConversationList` - Sidebar with search
- `LoadingSpinner` - Animated loading indicator
- `EmptyState` - Placeholder states

### Layout Components (Implemented)

- `MainLayout` - Three-panel responsive layout
- `ChatInterface` - Message container + input
- `ContextPanel` - Right sidebar (collapsible)

### Planned Components (Sprint 1)

- `CommandPalette` - Fuzzy search + actions
- `ModelSelector` - Multi-model dropdown
- `QuickActions` - Context-aware action buttons
- `ErrorNotification` - Toast notifications
- `FileTree` - Project file browser

---

## Technical Stack

**Frontend**:

- React 18 + TypeScript
- Tailwind CSS (utility-first)
- Framer Motion (animations)
- React Markdown (message rendering)
- React Syntax Highlighter (code blocks)

**Design Tokens**:

- CSS custom properties
- Tailwind config extensions
- Dark mode via `prefers-color-scheme`

**Fonts**:

- Inter (UI text) - Open source, optimized for screens
- JetBrains Mono (code) - Developer-focused, ligatures

---

## Keyboard Shortcuts

### Global

- `Ctrl+K` - Command palette
- `Ctrl+N` - New conversation
- `Ctrl+B` - Toggle sidebar
- `Ctrl+Shift+K` - Toggle context panel
- `Ctrl+,` - Settings
- `Esc` - Close modals

### Message Actions

- `Ctrl+Enter` - Send message
- `Ctrl+E` - Edit last message
- `Ctrl+R` - Regenerate response
- `Ctrl+↑/↓` - Navigate conversations

---

## Next Steps

### Immediate (This Session)

1. Enhance `MessageBubble` with hover actions
2. Add copy/regenerate/edit buttons
3. Implement auto-expanding input
4. Create error state components
5. Add loading animations

### Sprint 1 Completion

1. Build context panel (files, git, actions)
2. Implement command palette
3. Add model selector UI
4. Create quick action buttons
5. Polish animations and transitions

### Sprint 2 Goals

1. Code artifacts panel with live preview
2. Conversation branching UI
3. Multi-model comparison view
4. Enhanced keyboard navigation
5. Onboarding tour

---

## Resources

**Design Inspiration**:

- GitHub's interface (code presentation)
- Linear App (command palette, keyboard-first)
- Warp Terminal (developer aesthetics)
- VSCode UI (familiar patterns)

**Component Libraries**:

- Radix UI (accessible primitives)
- Headless UI (unstyled components)
- lucide-react (icon system)

**Testing Tools**:

- axe DevTools (accessibility)
- Lighthouse (performance)
- Percy (visual regression)

---

## Reference: Full Design System Document

The complete 67-page design system guide includes:

- Detailed color palette with semantic meanings
- Complete typography scale and font stack
- Layout architecture and responsive patterns
- Every component specification with code examples
- Interaction patterns and animation specs
- Accessibility requirements (WCAG 2.1 AA)
- Testing strategy and success metrics

**Location**: See uploaded design document for full specifications

---

**Last Updated**: November 2, 2025  
**Maintained By**: Linux AI Assistant Team  
**Status**: Active reference for all UI/UX implementation
