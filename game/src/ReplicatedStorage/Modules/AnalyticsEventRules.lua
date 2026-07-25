-- Pure validation rules for low-risk client behavior analytics.
-- These events never grant gameplay value; they are only accepted for
-- allow-listed interface names and are rate-limited by Analytics.server.lua.
local AnalyticsEventRules = {}

AnalyticsEventRules.AllowedGuiNames = {
	PeriodicTableGui = true, WalletGui = true, DashboardGui = true,
	InventoryGui = true, AchievementsGui = true, LeaderboardGui = true,
	QuestModal = true, RecipeBookGui = true, SlagProcessingGui = true,
	BubbleTeaGui = true, FertilizerGui = true, FactoryBuilderGui = true,
	ProcessControlGui = true, ResearchGui = true, MiningGui = true,
	ProductMarketGui = true, SettingsGui = true, AtomTradeGui = true,
	GuildGui = true, FeedbackGui = true,
}

function AnalyticsEventRules.IsAllowedGuiName(name)
	return type(name) == "string" and AnalyticsEventRules.AllowedGuiNames[name] == true
end

return AnalyticsEventRules
