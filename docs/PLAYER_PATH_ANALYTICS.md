# Player path analytics

`Analytics.server.lua` samples each player's `HumanoidRootPart` every three seconds during a session. Samples are rounded to half-stud precision and capped at 600 points (30 minutes), keeping the dataset useful for route analysis without recording physics-frame noise.

Each session is stored in the `MolGang_PlayerPaths_v1` DataStore under:

```text
path_<userId>_<sessionStartUnixTime>
```

The record contains `userId`, `playerName`, `startedAt`, `duration`, and `samples`. Each sample has `t`, `x`, `y`, `z`, and the nearest generated zone name. Missing characters or short sessions simply produce fewer samples.

The existing `Analytics_v1` OrderedDataStore remains the lightweight session-duration index; path records are kept in the normal DataStore because they are structured tables.
