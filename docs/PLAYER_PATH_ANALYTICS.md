# Player path analytics

`Analytics.server.lua` samples each player's `HumanoidRootPart` immediately at spawn and then every three seconds during a session. Samples are rounded to half-stud precision and capped at 600 points (30 minutes), keeping the dataset useful for route analysis without recording physics-frame noise.

Each session is stored in the `MolGang_PlayerPaths_v1` DataStore under:

```text
path_<userId>_<sessionStartUnixTime>

The `events.atomsCollected` counter is driven by the server's validated atom
collection path, not by the client collection request. Rejected requests and
Quantum Dot captures therefore cannot inflate normal atom-production metrics.
```

The record contains `schemaVersion`, `sessionId`, `userId`, `playerName`, `startedAt`, `duration`, `firstAction`, `lastAction`, `events`, and `samples`. Each sample has `t`, `x`, `y`, `z`, and the nearest generated zone name. The event summary and action bounds are copied into the same record so route segments can be correlated with validated manual collection (`atomsCollected`) and completed industrial output (`atomsProduced`, `moleculesBuilt`). Missing characters or short sessions simply produce fewer samples.

The existing `Analytics_v1` OrderedDataStore remains the lightweight session-duration index; path records are kept in the normal DataStore because they are structured tables. The two stores retry independently up to three times, using stable per-session keys. A temporary failure in the lightweight index therefore cannot prevent the route from being archived. Both stores flush through `BindToClose`, so short sessions and normal server shutdowns do not silently lose the route.
