local M = {}

-- Game Documentation Module
-- This module provides documentation about the current state of MOLGANG
-- without affecting runtime behavior.

-- NPC Characters
M.NPCCharacters = {
    Femke = {
        role = "Chemistry professor",
        location = "Laboratory zone",
        description = "Provides chemistry-related quests and information"
    },
    Vanadis = {
        role = "Industrial engineer",
        location = "Factory zone",
        description = "Manages production cycles and factory operations"
    },
    Ank = {
        role = "Loan officer",
        location = "Office zone",
        description = "Handles MolCoin transactions and loans"
    },
    Kwantje = {
        role = "Quantum specialist",
        location = "Research lab",
        description = "Provides advanced quantum mechanics content"
    },
    Yusuf = {
        role = "Market trader",
        location = "Marketplace zone",
        description = "Facilitates trading and market transactions"
    },
    Quiz = {
        role = "Education bot",
        location = "Nexus Hub",
        description = "Provides educational quizzes and tutorials"
    }
}

-- UI Screens
M.UIScreens = {
    LoadingScreen = {description = "Initial loading screen with progress indicator"},
    Dashboard = {description = "Main game dashboard showing player stats"},
    HUDWidget = {description = "Heads-up display showing atom count and MolCoins"},
    LeaderboardGui = {description = "Displays leaderboard rankings across 4 categories"},
    QuestTrackerGui = {description = "Shows active quests and progress"},
    InventoryGui = {description = "Manages player inventory items"},
    AchievementsGui = {description = "Displays earned achievements"},
    MahjongGui = {description = "Mahjong mini-game interface"},
    SettingsGui = {description = "Game settings and preferences"},
    RecipeBookGui = {description = "Shows crafting recipes and production formulas"}
}

-- Game Systems
M.GameSystems = {
    AtomCollection = {
        description = "Real-time collection of yellow glowing spheres",
        mechanics = "Players collect atoms by walking near them or pressing E"
    },
    ProductionCycles = {
        description = "60-second intervals for resource production",
        mechanics = "Factory produces resources in regular cycles"
    },
    EconomySystem = {
        description = "MolCoin currency system",
        mechanics = "Players earn MolCoins through gameplay and can spend them on upgrades"
    },
    LeaderboardTracking = {
        description = "4 category leaderboard system",
        mechanics = "Tracks player performance across different metrics"
    },
    MarketTrading = {
        description = "Player-to-player trading system",
        mechanics = "Facilitates exchange of resources between players"
    }
}

-- Performance Metrics
M.PerformanceMetrics = {
    targetFPS = 60,
    memoryUsage = "~350MB single player, ~5MB per additional player",
    loadTime = "30-60 seconds first load",
    fileSize = "206KB (optimized)",
    serverCapacity = "100+ concurrent players"
}

-- Version Information
M.version = "1.0"
M.lastUpdated = os.date("%Y-%m-%d")

return M
