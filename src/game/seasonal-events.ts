/**
 * Seasonal Events System
 * Time-limited events, challenges, and rewards
 */

interface Event {
  id: string;
  name: string;
  description: string;
  type: 'seasonal' | 'limited-time' | 'daily' | 'weekly';
  startDate: Date;
  endDate: Date;
  rewards: {
    experience: number;
    currency: number;
    cosmetics: string[];
    achievements: string[];
  };
  challenges: Challenge[];
  active: boolean;
}

interface Challenge {
  id: string;
  title: string;
  description: string;
  objective: string;
  progress: number;
  target: number;
  reward: any;
  difficulty: 'easy' | 'medium' | 'hard' | 'expert';
}

interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  condition: string;
  reward: number;
  unlockedAt?: Date;
}

export class SeasonalEventsManager {
  private events: Map<string, Event> = new Map();
  private achievements: Map<string, Achievement> = new Map();
  private playerProgress: Map<string, any> = new Map();

  constructor() {
    this.initializeSeasons();
    this.initializeAchievements();
  }

  /**
   * Initialize seasonal events
   */
  private initializeSeasons() {
    const now = new Date();
    const seasonEnd = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days

    // Spring Festival
    const springEvent: Event = {
      id: 'event-spring-2026',
      name: '🌸 Spring Festival',
      description: 'Celebrate spring with special challenges and rewards',
      type: 'seasonal',
      startDate: now,
      endDate: seasonEnd,
      active: true,
      rewards: {
        experience: 5000,
        currency: 1000,
        cosmetics: ['spring_crown', 'petal_trail'],
        achievements: ['spring_master']
      },
      challenges: [
        {
          id: 'challenge-1',
          title: 'Flower Collector',
          description: 'Collect 100 flower atoms',
          objective: 'Collect flower atoms',
          progress: 42,
          target: 100,
          reward: { experience: 500, currency: 100 },
          difficulty: 'easy'
        },
        {
          id: 'challenge-2',
          title: 'Spring Speed Run',
          description: 'Complete zone in under 5 minutes',
          objective: 'Speed completion',
          progress: 0,
          target: 1,
          reward: { experience: 1000, currency: 250 },
          difficulty: 'medium'
        }
      ]
    };

    this.events.set('event-spring-2026', springEvent);

    // Summer Heatwave
    const summerEvent: Event = {
      id: 'event-summer-2026',
      name: '☀️ Summer Heatwave',
      description: 'Survive intense heat and earn exclusive rewards',
      type: 'seasonal',
      startDate: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
      endDate: new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000),
      active: false,
      rewards: {
        experience: 6000,
        currency: 1200,
        cosmetics: ['sun_hat', 'heat_wave'],
        achievements: ['heat_master']
      },
      challenges: []
    };

    this.events.set('event-summer-2026', summerEvent);
  }

  /**
   * Initialize achievements
   */
  private initializeAchievements() {
    const achievements: Achievement[] = [
      {
        id: 'first-steps',
        name: 'First Steps',
        description: 'Complete your first zone',
        icon: '👣',
        condition: 'zone_completed:1',
        reward: 100
      },
      {
        id: 'zone-master',
        name: 'Zone Master',
        description: 'Complete all 5 zones',
        icon: '👑',
        condition: 'zones_completed:5',
        reward: 1000
      },
      {
        id: 'atom-collector',
        name: 'Atom Collector',
        description: 'Collect 1000 atoms',
        icon: '⚛️',
        condition: 'atoms_collected:1000',
        reward: 500
      },
      {
        id: 'pvp-champion',
        name: 'PvP Champion',
        description: 'Win 10 PvP matches',
        icon: '🏆',
        condition: 'pvp_wins:10',
        reward: 750
      },
      {
        id: 'speedrunner',
        name: 'Speedrunner',
        description: 'Complete zone in under 3 minutes',
        icon: '⚡',
        condition: 'fast_completion:180',
        reward: 600
      }
    ];

    achievements.forEach(ach => {
      this.achievements.set(ach.id, ach);
    });
  }

  /**
   * Get active events
   */
  getActiveEvents(): Event[] {
    const now = new Date();
    return Array.from(this.events.values()).filter(
      e => e.active && e.startDate <= now && e.endDate >= now
    );
  }

  /**
   * Get event progress
   */
  getEventProgress(playerId: string, eventId: string): any {
    const event = this.events.get(eventId);
    if (!event) return null;

    return {
      event: event.name,
      challenges: event.challenges.map(c => ({
        title: c.title,
        progress: c.progress,
        target: c.target,
        percentage: (c.progress / c.target) * 100,
        reward: c.reward
      })),
      totalProgress: event.challenges.reduce((sum, c) => sum + c.progress, 0),
      totalTarget: event.challenges.reduce((sum, c) => sum + c.target, 0)
    };
  }

  /**
   * Update challenge progress
   */
  updateChallengeProgress(eventId: string, challengeId: string, increment: number) {
    const event = this.events.get(eventId);
    if (!event) return null;

    const challenge = event.challenges.find(c => c.id === challengeId);
    if (!challenge) return null;

    challenge.progress = Math.min(challenge.progress + increment, challenge.target);
    return challenge;
  }

  /**
   * Get unlocked achievements
   */
  getUnlockedAchievements(playerId: string): Achievement[] {
    const playerData = this.playerProgress.get(playerId) || {};
    return Array.from(this.achievements.values()).filter(ach => {
      const [metric, value] = ach.condition.split(':');
      const playerValue = playerData[metric] || 0;
      return playerValue >= parseInt(value);
    });
  }

  /**
   * Check and award achievements
   */
  checkAchievements(playerId: string, metric: string, value: number): Achievement[] {
    const playerData = this.playerProgress.get(playerId) || {};
    playerData[metric] = (playerData[metric] || 0) + value;
    this.playerProgress.set(playerId, playerData);

    const newAchievements: Achievement[] = [];
    for (const [id, ach] of this.achievements) {
      const playerAch = playerData[`achievement_${id}`];
      if (!playerAch) {
        const [metric, targetStr] = ach.condition.split(':');
        const target = parseInt(targetStr);
        if (playerData[metric] >= target) {
          playerData[`achievement_${id}`] = true;
          newAchievements.push(ach);
        }
      }
    }

    return newAchievements;
  }

  /**
   * Get leaderboard for event
   */
  getEventLeaderboard(eventId: string, limit: number = 100): any[] {
    return [
      { rank: 1, player: 'ZipMaster', progress: 95, reward: 'gold_medal' },
      { rank: 2, player: 'KaiOptimizer', progress: 87, reward: 'silver_medal' },
      { rank: 3, player: 'MiraArtist', progress: 78, reward: 'bronze_medal' },
      { rank: 4, player: 'LunaTech', progress: 65, reward: 'event_badge' },
      { rank: 5, player: 'FillLeader', progress: 52, reward: 'event_badge' }
    ];
  }

  /**
   * Get all active challenges
   */
  getActiveChallenges(): any[] {
    const challenges: any[] = [];
    for (const event of this.events.values()) {
      if (event.active) {
        challenges.push(...event.challenges.map(c => ({
          ...c,
          eventId: event.id,
          eventName: event.name
        })));
      }
    }
    return challenges;
  }

  /**
   * Get overall leaderboard
   */
  getLeaderboard(limit: number = 100): any[] {
    return Array.from(this.playerProgress.entries()).slice(0, limit).map(([player, data], idx) => ({
      rank: idx + 1,
      player,
      points: data.total_points || 0,
      achievements: Object.keys(data).filter(k => k.startsWith('achievement_')).length
    }));
  }

  /**
   * Update event progress for player
   */
  updateEventProgress(eventId: string, playerId: string, progressData: any): any {
    const event = this.events.get(eventId);
    if (!event) {
      return { success: false, error: 'Event not found' };
    }

    for (const [challengeId, increment] of Object.entries(progressData)) {
      const challenge = event.challenges.find(c => c.id === challengeId);
      if (challenge && typeof increment === 'number') {
        this.updateChallengeProgress(eventId, challengeId, increment);
      }
    }

    const eventProgress = this.getEventProgress(playerId, eventId);
    return {
      success: true,
      playerId,
      eventId,
      progress: eventProgress
    };
  }
}

export default SeasonalEventsManager;
