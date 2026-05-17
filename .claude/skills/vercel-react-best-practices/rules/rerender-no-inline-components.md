---
title: Don't Define Components Inside Components
impact: HIGH
impactDescription: prevents remount on every render
tags: rerender, components, remount, performance
---

## Don't Define Components Inside Components

Defining a component inside another component creates a new component type on every render. React sees a different component each time and fully remounts it, destroying all state and DOM.

A common reason developers do this is to access parent variables without passing props. Always pass props instead.

**Incorrect (remounts on every render):**

```tsx
function UserProfile({ user, theme }: UserProfileProps) {
  // Defined inside to access `theme` — BAD
  const Avatar = () => (
    <img
      src={user.avatarUrl}
      className={theme === 'dark' ? 'avatar-dark' : 'avatar-light'}
    />
  )

  return (
    <div>
      <Avatar />
    </div>
  )
}
```

Every time `UserProfile` renders, `Avatar` is a new component type. React unmounts the old instance and mounts a new one, losing internal state and running effects again.

**Correct (pass props instead):**

```tsx
function Avatar({ src, theme }: { src: string; theme: string }) {
  return (
    <img
      src={src}
      className={theme === 'dark' ? 'avatar-dark' : 'avatar-light'}
    />
  )
}

function UserProfile({ user, theme }: UserProfileProps) {
  return (
    <div>
      <Avatar src={user.avatarUrl} theme={theme} />
    </div>
  )
}
```

**Symptoms of this bug:**
- Input fields lose focus on every keystroke
- Animations restart unexpectedly
- `useEffect` cleanup/setup runs on every parent render
- Scroll position resets inside the component
