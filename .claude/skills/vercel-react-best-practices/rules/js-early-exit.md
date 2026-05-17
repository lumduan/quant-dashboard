---
title: Return Early from Functions
impact: LOW
impactDescription: avoids unnecessary work
tags: js, performance, early-return
---

## Return Early from Functions

Check for invalid or trivial cases at the top of a function and return immediately. This avoids running expensive logic or rendering work that will be discarded.

**Incorrect (work runs regardless):**

```tsx
function Avatar({ user }: AvatarProps) {
  let initials = ''
  if (user && user.name) {
    initials = user.name
      .split(' ')
      .map(w => w[0])
      .join('')
      .toUpperCase()
  }

  return (
    <div className="avatar">
      {user?.avatarUrl ? <img src={user.avatarUrl} /> : <span>{initials}</span>}
    </div>
  )
}
```

**Correct (bail out early):**

```tsx
function Avatar({ user }: AvatarProps) {
  if (!user) return <div className="avatar" />

  if (user.avatarUrl) {
    return (
      <div className="avatar">
        <img src={user.avatarUrl} alt={user.name} />
      </div>
    )
  }

  const initials = user.name
    .split(' ')
    .map(w => w[0])
    .join('')
    .toUpperCase()

  return (
    <div className="avatar">
      <span>{initials}</span>
    </div>
  )
}
```

The early return pattern flattens the happy path and avoids computing values that won't be rendered.
