-- ResponsiveGui.lua
-- Shared viewport scaling for interactive modal surfaces.

local ResponsiveGui = {}

function ResponsiveGui.Attach(screenGui, designWidth, designHeight)
	local scaleObject = Instance.new("UIScale")
	scaleObject.Name = "ResponsiveScale"
	scaleObject.Parent = screenGui

	local viewportConnection
	local cameraConnection
	local function updateScale()
		local camera = workspace.CurrentCamera
		if not camera then return end
		local viewport = camera.ViewportSize
		scaleObject.Scale = math.clamp(
			math.min(viewport.X / designWidth, viewport.Y / designHeight),
			0.65,
			1
		)
	end
	local function bindCamera()
		if viewportConnection then viewportConnection:Disconnect() end
		local camera = workspace.CurrentCamera
		if camera then
			updateScale()
			viewportConnection = camera:GetPropertyChangedSignal("ViewportSize"):Connect(updateScale)
		end
	end

	bindCamera()
	cameraConnection = workspace:GetPropertyChangedSignal("CurrentCamera"):Connect(bindCamera)
	screenGui.Destroying:Connect(function()
		if viewportConnection then viewportConnection:Disconnect() end
		if cameraConnection then cameraConnection:Disconnect() end
	end)
	return scaleObject
end

return ResponsiveGui
