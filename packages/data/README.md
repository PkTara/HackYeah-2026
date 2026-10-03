# @hackyeah/data: where the app's data lives

The screens never fetch anything. They call `useGame()` (in `packages/app/src/state/GameProvider.tsx`), which updates the screen straight away and then hands the change to a **`ClimbingBackend`**. Swapping the backend changes where data is stored without touching a single screen.

```
screens -> useGame() -> ClimbingBackend -> local storage (today)
                                        -> your API (later)
```

## The contract

`src/backend.ts` defines the interface. Both implementations follow it:

| Method | When the app calls it |
|---|---|
| `load()` | On start, and after a failed save to get back in step |
| `addClimb(log)` / `removeClimb(id)` | Log screen |
| `completeQuest(id)` / `skipQuest(id)` | Quest card on the profile |
| `setHandFlag(flag, flagged)` | Hands screen |
| `saveReach(reach)` | Tests screen |
| `resetDemo()` (optional) | Tests screen, local demo only |

Rules the backend can rely on, and should keep:
- **Ids and dates are made on the device.** A retried `addClimb` sends the same id, so the server can treat repeats as no-ops.
- **Commands are safe to repeat.** `setHandFlag` is on or off, not a toggle. Completing a quest twice must not count twice.
- **XP and the profile are derived, not stored.** The app computes the focus, the quest and the monkey's level from the climbs and completed quest ids (`packages/core`). The server only needs to store records.

## Connecting the real API

1. **Endpoints:** edit `src/endpoints.ts`. Every path and HTTP method is listed there.
2. **Payloads:** edit `src/wire.ts`. It holds the JSON shapes (currently a guess in snake_case) and the functions that convert them to app types.
3. **Switch it on:** set `API_BASE_URL` in `src/config.ts`. A host can also pass its own backend: `<App backend={createHttpBackend({ baseUrl, getAuthToken })} />`.
4. **Auth:** `createHttpBackend` takes `getAuthToken()`; whatever it returns is sent as `Authorization: Bearer <token>`.
5. **Check it:** `src/__tests__/http.test.ts` runs the HTTP backend against a fake server. Update the expected paths and bodies there and you have a contract test for the real API.

Current placeholder API:

| Call | Method and path | Body |
|---|---|---|
| Load everything | `GET /me/profile` | answer: `ProfileDto` |
| Log a climb | `POST /me/climbs` | `ClimbDto` |
| Remove a climb | `DELETE /me/climbs/:id` | |
| Complete / skip a quest | `POST /me/quests/:id/complete`, `POST /me/quests/:id/skip` | |
| Flag / clear a finger | `PUT` / `DELETE /me/hand-flags/:side/:finger` | `HandFlagDto` on PUT |
| Save reach | `PUT /me/reach` | `ReachDto` |

## What happens when the server says no

`useGame()` shows the change immediately. If the backend call fails, it reloads the last saved state from the backend and shows a short notice at the top of the screen. If the very first load fails, the app shows a "Try again" screen instead of an empty profile.

## Not done yet

- No offline queue: with the HTTP backend, a change made without signal is rolled back, not retried later.
- Quests come from the library in `packages/core/src/quests.ts`. If the server should own quest content, add a `loadQuests()` call to the contract and pass the result to `pickQuest`.
