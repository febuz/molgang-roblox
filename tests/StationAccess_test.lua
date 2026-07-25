local StationAccess = require("../game/src/ReplicatedStorage/Modules/StationAccess")

local station = {x = 10, y = 5, z = -2}
assert(StationAccess.WithinRange({x = 10, y = 5, z = -2}, station, 0),
	"player at station must be accepted")
assert(StationAccess.WithinRange({x = 12, y = 5, z = -2}, station, 2),
	"player on station radius boundary must be accepted")
assert(not StationAccess.WithinRange({x = 13, y = 5, z = -2}, station, 2),
	"player outside station radius must be rejected")
assert(not StationAccess.WithinRange(nil, station, 10),
	"missing player position must be rejected")

print("Station Access Tests: 4 passed, 0 failed")
