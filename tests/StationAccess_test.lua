local StationAccess = require("../game/src/ReplicatedStorage/Modules/StationAccess")

assert(StationAccess.Stations.crush.partName == "CrushPlatform"
	and StationAccess.Stations.crush.interactionType == "SlagCrushStation"
	and StationAccess.Stations.crush.radius == 28,
	"crushing station contract must match the world geometry")
assert(StationAccess.Stations.leach.partName == "LeachPlatform"
	and StationAccess.Stations.leach.interactionType == "SlagLeachStation"
	and StationAccess.Stations.leach.radius == 42,
	"leaching station contract must match the world geometry")

local station = {x = 10, y = 5, z = -2}
assert(StationAccess.WithinRange({x = 10, y = 5, z = -2}, station, 0),
	"player at station must be accepted")
assert(StationAccess.WithinRange({x = 12, y = 5, z = -2}, station, 2),
	"player on station radius boundary must be accepted")
assert(not StationAccess.WithinRange({x = 13, y = 5, z = -2}, station, 2),
	"player outside station radius must be rejected")
assert(not StationAccess.WithinRange(nil, station, 10),
	"missing player position must be rejected")

print("Station Access Tests: 6 passed, 0 failed")
