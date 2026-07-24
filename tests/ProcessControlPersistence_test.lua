local DataTemplate = require("../game/src/ReplicatedStorage/Data/DataTemplate")

assert(type(DataTemplate.processControl) == "table", "process controls must be persistent")
assert(DataTemplate.processControl.temperature == 25, "new process lines must start at 25C")
assert(DataTemplate.processControl.pressure == 101.325, "new process lines must start at atmospheric pressure")
assert(DataTemplate.processControl.pH == 7.0, "new process lines must start neutral")

print("Process Control Persistence Tests: 4 passed, 0 failed")
