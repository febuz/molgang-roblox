/**
 * MOLGANG-6.12: Battle Pass System
 * 100-tier progression with free/premium tiers
 * $9.99 seasonal pass
 * 10-week seasons
 */

interface BattlePassTier {
  tier: number;
  requiredXp: number;
  rewards: {
    currency?: number;
    cosmetics?: string[];
    unlocks?: string[];
  };
  isPremium: boolean;
}

interface PlayerProgress {
  playerId: string;
  seasonId: string;
  totalXp: number;
  currentTier: number;
  tierProgress: number; // 0-100 percentage through tier
  hasPremium: boolean;
  premiumPurchasedAt?: Date;
  claimedRewards: Map<number, boolean>; // tier -> claimed
}

interface Season {
  id: string;
  number: number;
  name: string;
  startDate: Date;
  endDate: Date;
  theme: string;
  tiers: BattlePassTier[];
  totalPlayers: number;
  totalRevenue: number;
}

export class BattlePassSystem {
  private seasons: Map<string, Season> = new Map();
  private playerProgress: Map<string, PlayerProgress> = new Map();
  private currentSeasonId = 'season_1';

  constructor() {
    this.initializeCurrentSeason();
  }

  /**
   * Initialize current season
   */
  private initializeCurrentSeason(): void {
    const tiers: BattlePassTier[] = [];

    for (let i = 1; i <= 100; i++) {
      const requiredXp = i * 1000; // 1k XP per tier
      const isPremium = i > 50; // Last 50 tiers are premium only

      tiers.push({
        tier: i,
        requiredXp,
        rewards: {
          currency: isPremium ? 200 : 100,
          cosmetics: i % 10 === 0 ? [`cosmetic_tier_${i}`] : [],
          unlocks: i % 20 === 0 ? [`unlock_tier_${i}`] : []
        },
        isPremium
      });
    }

    const season: Season = {
      id: this.currentSeasonId,
      number: 1,
      name: 'Abyssal Awakening',
      startDate: new Date('2026-04-10'),
      endDate: new Date(Date.now() + 10 * 7 * 24 * 60 * 60 * 1000), // 10 weeks
      theme: 'Deep Ocean',
      tiers,
      totalPlayers: 0,
      totalRevenue: 0
    };

    this.seasons.set(this.currentSeasonId, season);
  }

  /**
   * Initialize player in current season
   */
  initializePlayer(playerId: string, hasPremium: boolean = false): PlayerProgress {
    const progress: PlayerProgress = {
      playerId,
      seasonId: this.currentSeasonId,
      totalXp: 0,
      currentTier: 1,
      tierProgress: 0,
      hasPremium,
      premiumPurchasedAt: hasPremium ? new Date() : undefined,
      claimedRewards: new Map()
    };

    this.playerProgress.set(`${playerId}_${this.currentSeasonId}`, progress);

    // Update season stats
    const season = this.seasons.get(this.currentSeasonId)!;
    season.totalPlayers++;
    if (hasPremium) {
      season.totalRevenue += 9.99;
    }

    return progress;
  }

  /**
   * Award XP to player
   */
  awardXp(playerId: string, xp: number): void {
    const key = `${playerId}_${this.currentSeasonId}`;
    let progress = this.playerProgress.get(key);

    if (!progress) {
      progress = this.initializePlayer(playerId, false);
    }

    progress.totalXp += xp;

    // Calculate tier progression
    const season = this.seasons.get(this.currentSeasonId)!;
    let xpCounter = progress.totalXp;
    let tier = 1;

    for (let i = 1; i <= 100; i++) {
      const tierReq = season.tiers[i - 1].requiredXp;
      if (xpCounter >= tierReq) {
        xpCounter -= tierReq;
        tier = i + 1;
      } else {
        break;
      }
    }

    progress.currentTier = Math.min(100, tier);
    progress.tierProgress = Math.floor((xpCounter / season.tiers[tier - 1].requiredXp) * 100);
  }

  /**
   * Purchase premium battle pass
   */
  purchasePremium(playerId: string): boolean {
    const key = `${playerId}_${this.currentSeasonId}`;
    let progress = this.playerProgress.get(key);

    if (!progress) {
      progress = this.initializePlayer(playerId, true);
    } else {
      progress.hasPremium = true;
      progress.premiumPurchasedAt = new Date();

      // Update season revenue
      const season = this.seasons.get(this.currentSeasonId)!;
      season.totalRevenue += 9.99;
    }

    return true;
  }

  /**
   * Claim tier reward
   */
  claimReward(playerId: string, tier: number): any {
    const key = `${playerId}_${this.currentSeasonId}`;
    const progress = this.playerProgress.get(key);

    if (!progress || progress.currentTier < tier) {
      return { success: false, error: 'Tier not reached' };
    }

    if (progress.claimedRewards.has(tier)) {
      return { success: false, error: 'Reward already claimed' };
    }

    const season = this.seasons.get(this.currentSeasonId)!;
    const tierReward = season.tiers[tier - 1];

    // Check if tier is accessible (free vs premium)
    if (tierReward.isPremium && !progress.hasPremium) {
      return { success: false, error: 'Premium required for this tier' };
    }

    progress.claimedRewards.set(tier, true);

    return {
      success: true,
      reward: tierReward.rewards
    };
  }

  /**
   * Get player progress
   */
  getProgress(playerId: string): PlayerProgress | null {
    return this.playerProgress.get(`${playerId}_${this.currentSeasonId}`) || null;
  }

  /**
   * Get season leaderboard
   */
  getSeasonLeaderboard(limit: number = 100): PlayerProgress[] {
    return Array.from(this.playerProgress.values())
      .filter(p => p.seasonId === this.currentSeasonId)
      .sort((a, b) => {
        // Sort by tier, then by XP within tier
        if (a.currentTier !== b.currentTier) {
          return b.currentTier - a.currentTier;
        }
        return b.tierProgress - a.tierProgress;
      })
      .slice(0, limit);
  }

  /**
   * Get season metrics
   */
  getSeasonMetrics() {
    const season = this.seasons.get(this.currentSeasonId)!;
    const progressList = Array.from(this.playerProgress.values())
      .filter(p => p.seasonId === this.currentSeasonId);

    const premiumCount = progressList.filter(p => p.hasPremium).length;
    const avgTier = progressList.length > 0
      ? progressList.reduce((sum, p) => sum + p.currentTier, 0) / progressList.length
      : 0;

    return {
      season: season.name,
      total_players: season.totalPlayers,
      premium_players: premiumCount,
      free_players: season.totalPlayers - premiumCount,
      premium_percentage: season.totalPlayers > 0
        ? (premiumCount / season.totalPlayers * 100).toFixed(2)
        : '0.00',
      total_revenue: season.totalRevenue,
      average_tier: avgTier.toFixed(2),
      days_remaining: Math.ceil(
        (season.endDate.getTime() - Date.now()) / (24 * 60 * 60 * 1000)
      )
    };
  }
}

export default BattlePassSystem;
