local MiniGameRules = require("../game/src/ReplicatedStorage/Modules/MiniGameRules")

assert(MiniGameRules.Bins.magnetic == "LEFT", "magnetic bin must use the server LEFT contract")
assert(MiniGameRules.Bins.valuable == "CENTER", "valuable bin must use the server CENTER contract")
assert(MiniGameRules.Bins.hazard == "RIGHT", "hazard bin must use the server RIGHT contract")
assert(MiniGameRules.IsValidBin("LEFT"), "LEFT should be accepted")
assert(MiniGameRules.IsValidBin("CENTER"), "CENTER should be accepted")
assert(MiniGameRules.IsValidBin("RIGHT"), "RIGHT should be accepted")
assert(not MiniGameRules.IsValidBin("magnetic"), "client label must not be accepted as a server bin")

print("Mini Game Rules Tests: 7 passed, 0 failed")
