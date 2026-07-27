-- Pure client/server readiness gate for the generated Moleculia world.
local WorldReadiness = {}

function WorldReadiness.CanEnter(worldReady, spawnReady)
	return worldReady == true and spawnReady == true
end

return WorldReadiness
