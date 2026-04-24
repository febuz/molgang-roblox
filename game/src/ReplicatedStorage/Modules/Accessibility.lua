--[[
	Accessibility.lua
	MOLGANG — Accessibility Options (#80)

	Provides colorblind-friendly palettes and accessibility settings.
]]

local Accessibility = {}

-- Colorblind-safe palette (Wong 2011 — Nature Methods)
Accessibility.ColorblindPalette = {
	orange    = Color3.fromRGB(230, 159, 0),
	skyBlue   = Color3.fromRGB(86, 180, 233),
	green     = Color3.fromRGB(0, 158, 115),
	yellow    = Color3.fromRGB(240, 228, 66),
	blue      = Color3.fromRGB(0, 114, 178),
	vermilion = Color3.fromRGB(213, 94, 0),
	purple    = Color3.fromRGB(204, 121, 167),
	black     = Color3.fromRGB(0, 0, 0),
}

-- Rarity colors in colorblind-safe mode
Accessibility.RarityColors = {
	normal = {
		common    = Color3.fromRGB(200, 200, 200),
		uncommon  = Color3.fromRGB(100, 200, 100),
		rare      = Color3.fromRGB(68, 136, 255),
		epic      = Color3.fromRGB(180, 68, 255),
		legendary = Color3.fromRGB(255, 215, 0),
	},
	colorblind = {
		common    = Color3.fromRGB(200, 200, 200),
		uncommon  = Color3.fromRGB(86, 180, 233),   -- skyBlue
		rare      = Color3.fromRGB(0, 114, 178),     -- blue
		epic      = Color3.fromRGB(230, 159, 0),     -- orange
		legendary = Color3.fromRGB(240, 228, 66),    -- yellow
	},
}

-- Shape markers for colorblind identification (supplement color with shape)
Accessibility.RarityShapes = {
	common    = "",
	uncommon  = "▲",
	rare      = "◆",
	epic      = "★",
	legendary = "✦",
}

local currentMode = "normal"

function Accessibility.SetMode(mode)
	currentMode = (mode == "colorblind") and "colorblind" or "normal"
end

function Accessibility.GetMode()
	return currentMode
end

function Accessibility.GetRarityColor(rarity)
	local palette = Accessibility.RarityColors[currentMode] or Accessibility.RarityColors.normal
	return palette[rarity] or palette.common
end

function Accessibility.GetRarityLabel(rarity)
	local shape = Accessibility.RarityShapes[rarity] or ""
	if currentMode == "colorblind" and shape ~= "" then
		return shape .. " " .. rarity:upper()
	end
	return rarity:upper()
end

return Accessibility
