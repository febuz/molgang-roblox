local StationAccess = require("../game/src/ReplicatedStorage/Modules/StationAccess")

assert(StationAccess.Stations.crush.partName == "CrushPlatform"
	and StationAccess.Stations.crush.interactionType == "SlagCrushStation"
	and StationAccess.Stations.crush.radius == 28,
	"crushing station contract must match the world geometry")
assert(StationAccess.Stations.leach.partName == "LeachPlatform"
	and StationAccess.Stations.leach.interactionType == "SlagLeachStation"
	and StationAccess.Stations.leach.radius == 42
	and StationAccess.Stations.leach.mapPosition.z == 40,
	"leaching station contract must match the world geometry")
assert(StationAccess.Stations.crush.mapPosition.z == -40,
	"crushing station map position must match the world geometry")
assert(StationAccess.Stations.cone.partName == "ConeCrusherBase"
	and StationAccess.Stations.cone.interactionType == "SlagConeCrusher"
	and StationAccess.Stations.cone.radius == 24
	and StationAccess.Stations.mill.partName == "MillBase"
	and StationAccess.Stations.mill.interactionType == "SlagBallMill"
	and StationAccess.Stations.mill.radius == 30,
	"machine station contracts must match the physical cone crusher and ball mill")

local station = {x = 10, y = 5, z = -2}
assert(StationAccess.WithinRange({x = 10, y = 5, z = -2}, station, 0),
	"player at station must be accepted")
assert(StationAccess.WithinRange({x = 12, y = 5, z = -2}, station, 2),
	"player on station radius boundary must be accepted")
assert(not StationAccess.WithinRange({x = 13, y = 5, z = -2}, station, 2),
	"player outside station radius must be rejected")
assert(not StationAccess.WithinRange(nil, station, 10),
	"missing player position must be rejected")
assert(not StationAccess.WithinRange({x = 10, y = 5}, station, 10),
	"incomplete player positions must be rejected")
assert(not StationAccess.WithinRange({x = 0 / 0, y = 5, z = -2}, station, 10),
	"non-finite player positions must be rejected")

print("Station Access Tests: 10 passed, 0 failed")
