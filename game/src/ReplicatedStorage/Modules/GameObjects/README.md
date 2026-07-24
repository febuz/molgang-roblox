# GameObjects — data-driven object system

A small composition engine for MOLGANG game objects, so new content is
**data** (an object described by named trait blocks) instead of another
one-off hardcoded table + bespoke logic scattered across a server script.

The design borrows two ideas from open-source game engines:

- **OpenRA (Red Alert) Actor/Trait rules** — an object ("archetype") is a
  data table composed of named *trait* blocks. Archetypes reuse a base
  archetype's traits via `inherits` (OpenRA's `Inherits: ^Base`), and can
  hold several trait blocks of the same kind via an `@SUFFIX` on the key
  (OpenRA's `WithInfantryBody@RUN`).
- **Build engine (Duke Nukem 3D) `statnum` buckets** — each archetype is
  filed into a bucket keyed by its `category` at define-time, so
  "iterate all Drinks" touches only Drinks, not every archetype.

## Files

| Module | Pure? | Purpose |
|---|---|---|
| `ObjectRegistry.lua` | ✅ pure | The engine: `Define`, `GetTrait(s)`, `HasTrait`, `GetTraitsImplementing`, `EachInCategory`, `CategoryIds`. |
| `RarityTrait.lua` | ✅ pure | Cost×buff rarity-tier scoring. |
| `Achievements.lua` | ✅ pure | Drink-purchase badge thresholds. |
| `MiningMilestones.lua` | ✅ pure | Atom-collection milestone thresholds. |
| `RegionalEconomy.lua` | ✅ pure | 6 world regions + regional buy/sell pricing + product→category bridge. |
| `SeasonalDrinks.lua` | ⚠️ not pure | Seasonal drink archetypes (uses `Color3` + `require(script.Parent.X)`). |
| `Regions.lua` | ⚠️ not pure | Files `RegionalEconomy`'s regions into an `ObjectRegistry`. |

**"Pure"** = no `require`, no `Color3`, no Roblox globals → the module loads
and runs directly under [`lune`](https://lune-org.github.io/docs), so its
logic is unit-tested headlessly. Keep new *logic* in pure modules; a module
that needs `Color3` or the Rojo `require(script.Parent.X)` instance path
(like `SeasonalDrinks`/`Regions`) can only be checked by `selene` +
`rojo build`, not `lune` — so keep those thin (data + glue), and put the
testable logic in a pure sibling that takes plain values.

## Defining an object

```lua
local ObjectRegistry = require(script.Parent.ObjectRegistry)
local registry = ObjectRegistry.new()

-- Base archetype other objects inherit (OpenRA ^Base).
registry:Define("Drink", {
    category = "Drink",
    traits = { Metadata = { kind = "Beverage" } },
})

registry:Define("pumpkinSpice", {
    inherits = "Drink",          -- gets Metadata for free
    category = "Drink",
    traits = {
        Descriptive = { name = "Pumpkin Spice Latte" },
        Buyable     = { cost = 45 },
        Buff        = { type = "production", value = 1.35, duration = 150 },
        -- multiple same-kind traits via @SUFFIX:
        -- ["Buff@SECONDARY"] = { ... },
    },
})
```

Queries:

```lua
registry:GetTrait("pumpkinSpice", "Buyable").cost        --> 45
registry:HasTrait("pumpkinSpice", "Metadata")            --> true (inherited)
registry:GetTraitsImplementing("dog", "Buff")            --> every Buff@* block
for id, traits in registry:EachInCategory("Drink") do ... end  -- statnum bucket
```

Rules enforced by `Define`: base archetypes must be defined before anything
that `inherits` them; a duplicate id errors; a circular `inherits` chain
errors instead of looping.

## Testing

```
lune run tests/GameObjects_test.lua      # from repo root
selene game/src/ReplicatedStorage/Modules/GameObjects/
rojo build game/default.project.json -o /tmp/check.rbxlx
```

The lune suite covers the engine (inherits, `@SUFFIX`, category buckets,
error paths) and every pure content module. When you add a pure module, add
its cases there; when you add a non-pure module, cover its underlying logic
via a pure sibling and rely on `selene` + `rojo build` for the glue.
