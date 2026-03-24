# Offline Caching Strategy

This document describes the offline support implementation for GreEnergy BESS Tech Portal.

## Overview

The app implements a **cache-first-with-update** strategy to enable technicians to view assignments and jobsite details even in remote areas without reliable connectivity.

## Components

### 1. **IndexedDB Storage** (`lib/offlineDB.js`)
- Persists data locally in the browser
- Stores: assignments, jobsites, survey questions, submissions, and cache metadata
- Database: `greenergy-offline` (v2)

**Key Functions:**
- `cacheAssignments()` / `getCachedAssignments()`
- `cacheJobsites()` / `getCachedJobsites()`
- `setCacheMetadata()` / `getCacheMetadata()` — tracks last sync times

### 2. **Smart Cache Service** (`lib/cacheService.js`)
Implements intelligent caching logic with background updates:
- `fetchAndCacheAssignments()` — Returns cached data immediately, updates in background
- `fetchAndCacheJobsites()` — Caches jobsites with 1-hour TTL
- `getGroupJobsites()` — Queries cached jobsites by group
- `clearOfflineCache()` — Clears all cached data (for logout)

### 3. **Service Worker** (`public/service-worker.js`)
Provides:
- **Asset caching** — Static files cached at install time
- **Network-first with fallback** — API calls use network first, fall back to cache
- **Cache-first for assets** — Images and static resources cached for reuse
- **Background sync** — Syncs pending submissions when connection restored

### 4. **Online Status Hook** (`lib/useOfflineSync.js`)
Tracks network connectivity and triggers sync:
- `useOnlineStatus()` — Returns `boolean` for current connection status
- `useOfflineSync()` — Tracks pending submissions and sync status
- Auto-syncs when device comes back online

## Data Flow

### Viewing Assignments (Offline)
```
EmployeeSchedule → fetchAndCacheAssignments()
  ↓
  1. Check online status
  2. Return cached assignments immediately
  3. If online: fetch fresh data in background
  4. Cache fresh data for future use
```

### Viewing Jobsites (Offline)
```
BessTechPortal → fetchAndCacheJobsites()
  ↓
  1. Check cache metadata (1-hour TTL)
  2. Return cached jobsites immediately
  3. If online AND cache stale: refresh in background
  4. Update cache metadata timestamp
```

## Usage in Components

### Enable caching in a component:

```jsx
import { fetchAndCacheAssignments } from '@/lib/cacheService';
import { useOnlineStatus } from '@/lib/useOfflineSync';

function MyComponent() {
  const isOnline = useOnlineStatus();

  const { data: assignments = [] } = useQuery({
    queryKey: ['my-assignments'],
    queryFn: async () => {
      return fetchAndCacheAssignments(
        myEmployeeId,
        () => fetchAssignments({ employee_fk: myEmployeeId }),
        isOnline
      );
    },
  });

  return <div>{/* Render data */}</div>;
}
```

## Cache Behavior

| Scenario | Behavior |
|----------|----------|
| **Online + Fresh cache** | Return cache immediately, fetch fresh data in background |
| **Online + Stale cache** | Return cache, fetch and update fresh data in background |
| **Offline + Cached data** | Return cached data |
| **Offline + No cache** | Show empty state or loading indicator |

## Cache Metadata

Cache metadata tracks last sync times to prevent unnecessary network requests:

```javascript
// Set metadata after successful sync
await setCacheMetadata('assignments_sync', Date.now());

// Check if cache is stale (> 1 hour)
const lastSync = await getCacheMetadata('assignments_sync');
const isStale = !lastSync || Date.now() - lastSync > CACHE_DURATION;
```

## Clearing Cache

- On logout: `clearOfflineCache()` clears all IndexedDB stores
- On user request: Components can trigger selective clearing

## Browser Support

- **IndexedDB**: All modern browsers (Chrome, Firefox, Safari, Edge)
- **Service Worker**: All modern browsers (background sync may be limited on iOS)
- **Fallback**: App gracefully degrades without these APIs

## Performance

- **Initial load**: Cached data served instantly
- **Background sync**: Non-blocking, doesn't freeze UI
- **Storage**: ~5MB limit for IndexedDB per app origin
- **TTL**: 1-hour refresh for non-critical data (jobsites), real-time for assignments

## Testing Offline Mode

1. Open DevTools → Network tab
2. Set throttling to "Offline"
3. Navigate the app — cached data should still be visible
4. Toggle back to "Online" — app should sync fresh data

## Future Enhancements

- [ ] Selective cache refresh by resource type
- [ ] User-controlled cache clearing UI
- [ ] Sync queue visualization
- [ ] Intelligent prefetching for likely assignment changes
- [ ] Conflict resolution for concurrent edits