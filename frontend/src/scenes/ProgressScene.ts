import Phaser from 'phaser';
import { apiClient } from '../api/client';
import { Achievement, Level, Progress, UserStats, UserAchievement } from '../api/schemas';
import { AudioManager } from '../audio/AudioManager';

// /achievements/all returns the full definition, including the XP reward
interface AchievementDefinition extends Achievement {
  xp_reward: number;
}

interface LevelProgress {
  level: Level;
  progress?: Progress;
}

export class ProgressScene extends Phaser.Scene {
  private isLoading: boolean = true;
  private levelProgress: LevelProgress[] = [];
  private userStats: UserStats | null = null;
  private userAchievements: UserAchievement[] = [];
  private allAchievements: AchievementDefinition[] = [];
  private currentTab: 'progress' | 'achievements' = 'progress';

  constructor() {
    super({ key: 'ProgressScene' });
  }

  async create(): Promise<void> {
    AudioManager.init(this);
    this.createUI();
    await this.loadProgress();
    this.scale.on('resize', this.handleResize, this);
  }

  private createUI(): void {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    this.add.text(width / 2, 60, 'YOUR PROGRESS', {
      fontSize: '42px',
      color: '#e94560',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    const backButton = this.add.text(20, 20, '← Back', {
      fontSize: '16px',
      color: '#e94560',
      fontStyle: 'bold',
    }).setOrigin(0, 0);

    backButton.setInteractive({ useHandCursor: true });
    backButton.on('pointerover', () => backButton.setScale(1.1));
    backButton.on('pointerout', () => backButton.setScale(1));
    backButton.on('pointerup', () => this.returnToMenu());

    if (this.isLoading) {
      this.add.text(width / 2, height / 2, 'Loading progress...', {
        fontSize: '18px',
        color: '#ffffff',
      }).setOrigin(0.5).setName('loadingText');
    }
  }

  private async loadProgress(): Promise<void> {
    try {
      const [levels, progress, stats, achievements, allAchievements] = await Promise.all([
        apiClient.getLevels<Level[]>(),
        apiClient.getUserProgress<Progress[]>(),
        apiClient.getUserStats<UserStats>(),
        apiClient.getUserAchievements<UserAchievement[]>(),
        apiClient.getAllAchievements<AchievementDefinition[]>(),
      ]);

      this.levelProgress = levels.map(level => {
        const levelProgress = progress.find(p => p.level_id === level.id);
        return { level, progress: levelProgress };
      });

      this.userStats = stats;
      this.userAchievements = achievements;
      this.allAchievements = allAchievements;

      this.isLoading = false;
      this.displayContent();
    } catch (error) {
      this.isLoading = false;
      const errorMessage = error instanceof Error ? error.message : 'Failed to load progress';

      if (errorMessage.includes('Session expired') || errorMessage.includes('login again')) {
        this.scene.start('LoginScene');
      } else {
        this.showError(errorMessage);
      }
    }
  }

  private displayContent(): void {
    const loadingText = this.children.getByName('loadingText');
    if (loadingText) {
      loadingText.destroy();
    }

    // Clear existing content except UI
    this.children.each(child => {
      if (child.name !== 'title' && child.name !== 'backButton' && child.name !== 'loadingText') {
        // Keep only what we need
      }
    });

    if (this.currentTab === 'progress') {
      this.displayProgressTab();
    } else {
      this.displayAchievementsTab();
    }
  }

  private displayProgressTab(): void {
    const width = this.cameras.main.width;

    // Create tabs
    this.createTabs();

    // User stats summary
    if (this.userStats) {
      this.createStatsSummary();
    }

    // Start below the XP / rating / streak line so the first card doesn't cover it
    const startY = 215;
    const itemHeight = 100;
    const maxWidth = Math.min(800, width - 80);

    this.levelProgress.forEach((item, index) => {
      const x = width / 2;
      const y = startY + index * itemHeight;

      this.createProgressCard(x, y, maxWidth, item);
    });

    const completedCount = this.levelProgress.filter(lp => lp.progress?.completed).length;
    const totalCount = this.levelProgress.length;
    const overallPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

    const summaryY = startY + this.levelProgress.length * itemHeight + 20;
    this.add.text(width / 2, summaryY, `Overall Progress: ${completedCount}/${totalCount} levels (${overallPercent}%)`, {
      fontSize: '20px',
      color: '#4ecca3',
      fontStyle: 'bold',
    }).setOrigin(0.5);
  }

  private displayAchievementsTab(): void {
    const width = this.cameras.main.width;

    // Create tabs
    this.createTabs();

    // User stats summary
    if (this.userStats) {
      this.createStatsSummary();
    }

    // Cards are 120px tall, so start low enough to clear the XP / rating / streak line
    const startY = 230;
    const gridColumns = width > 600 ? 3 : 2;
    const cardWidth = Math.min(200, (width - 100) / gridColumns);
    const cardHeight = 120;
    const padding = 15;

    const unlockedCodes = new Set(this.userAchievements.map(ua => ua.achievement.code));

    this.allAchievements.forEach((achievement, index) => {
      const col = index % gridColumns;
      const row = Math.floor(index / gridColumns);

      const x = width / 2 - ((gridColumns - 1) * (cardWidth + padding)) / 2 + col * (cardWidth + padding);
      const y = startY + row * (cardHeight + padding);

      const isUnlocked = unlockedCodes.has(achievement.code);
      this.createAchievementCard(x, y, cardWidth, cardHeight, achievement, isUnlocked);
    });
  }

  private createTabs(): void {
    const width = this.cameras.main.width;
    const tabY = 110;

    const progressTab = this.add.text(width / 2 - 80, tabY, 'Progress', {
      fontSize: '18px',
      color: this.currentTab === 'progress' ? '#e94560' : '#888888',
      fontStyle: this.currentTab === 'progress' ? 'bold' : 'normal',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    const achievementsTab = this.add.text(width / 2 + 80, tabY, 'Achievements', {
      fontSize: '18px',
      color: this.currentTab === 'achievements' ? '#e94560' : '#888888',
      fontStyle: this.currentTab === 'achievements' ? 'bold' : 'normal',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    progressTab.on('pointerover', () => progressTab.setColor(this.currentTab === 'progress' ? '#e94560' : '#cccccc'));
    progressTab.on('pointerout', () => progressTab.setColor(this.currentTab === 'progress' ? '#e94560' : '#888888'));
    progressTab.on('pointerup', () => {
      if (this.currentTab !== 'progress') {
        AudioManager.playClick();
        this.currentTab = 'progress';
        this.refreshDisplay();
      }
    });

    achievementsTab.on('pointerover', () => achievementsTab.setColor(this.currentTab === 'achievements' ? '#e94560' : '#cccccc'));
    achievementsTab.on('pointerout', () => achievementsTab.setColor(this.currentTab === 'achievements' ? '#e94560' : '#888888'));
    achievementsTab.on('pointerup', () => {
      if (this.currentTab !== 'achievements') {
        AudioManager.playClick();
        this.currentTab = 'achievements';
        this.refreshDisplay();
      }
    });
  }

  private createStatsSummary(): void {
    if (!this.userStats) return;

    const width = this.cameras.main.width;
    const y = 155;

    // XP and Rating
    this.add.text(
      width / 2,
      y,
      `${this.userStats.total_xp} XP  |  ${this.userStats.security_rating}  |  ${this.userStats.current_streak} day streak`,
      {
        fontSize: '16px',
        color: '#4ecca3',
        fontStyle: 'bold',
      }
    ).setOrigin(0.5);
  }

  private createAchievementCard(
    x: number,
    y: number,
    cardWidth: number,
    cardHeight: number,
    achievement: AchievementDefinition,
    isUnlocked: boolean
  ): void {
    this.add.rectangle(x, y, cardWidth, cardHeight, isUnlocked ? 0x16213e : 0x0d1520)
      .setStrokeStyle(2, isUnlocked ? 0x4ecca3 : 0x2a3a4a);

    // Icon mapping
    const iconMap: Record<string, string> = {
      trophy: '🏆', star: '⭐', stars: '🌟', fire: '🔥', flame: '🔥',
      shield: '🛡️', mail: '📧', wifi: '📶', crown: '👑', lightning: '⚡',
      target: '🎯', calendar: '📅', refresh: '🔄', medal: '🏅', door: '🚪',
      lock: '🔒', users: '👥', globe: '🌐',
    };

    this.add.text(x, y - 25, iconMap[achievement.icon] || '🏆', {
      fontSize: '28px',
    }).setOrigin(0.5).setAlpha(isUnlocked ? 1 : 0.3);

    this.add.text(x, y + 10, achievement.name, {
      fontSize: '12px',
      color: isUnlocked ? '#ffffff' : '#666666',
      fontStyle: 'bold',
      align: 'center',
      wordWrap: { width: cardWidth - 10 },
    }).setOrigin(0.5);

    if (isUnlocked) {
      this.add.text(x, y + 40, `+${achievement.xp_reward} XP`, {
        fontSize: '10px',
        color: '#4ecca3',
      }).setOrigin(0.5);
    } else {
      this.add.text(x, y + 40, '🔒 Locked', {
        fontSize: '10px',
        color: '#666666',
      }).setOrigin(0.5);
    }
  }

  private refreshDisplay(): void {
    // Remove all children except title and back button
    const toKeep: Phaser.GameObjects.GameObject[] = [];
    this.children.each(child => {
      const gameObject = child as Phaser.GameObjects.Text;
      if (gameObject.name === 'title') {
        toKeep.push(child);
      }
    });

    this.children.removeAll();

    toKeep.forEach(child => this.add.existing(child));

    this.createUI();
    this.displayContent();
  }

  // Legacy method - renamed
  private displayProgress(): void {
    this.displayContent();
  }

  private createProgressCard(x: number, y: number, cardWidth: number, item: LevelProgress): void {
    this.add.rectangle(x, y, cardWidth, 80, 0x16213e)
      .setStrokeStyle(2, item.progress?.completed ? 0x4ecca3 : 0x0f3460);

    const titleX = x - cardWidth / 2 + 20;
    this.add.text(titleX, y - 20, item.level.title, {
      fontSize: '18px',
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0, 0.5);

    this.add.text(titleX, y + 10, item.level.description, {
      fontSize: '12px',
      color: '#cccccc',
      wordWrap: { width: cardWidth - 250 },
    }).setOrigin(0, 0.5);

    const statusX = x + cardWidth / 2 - 20;

    if (item.progress) {
      const statusIcon = item.progress.completed ? '✓' : '○';
      const statusColor = item.progress.completed ? '#4ecca3' : '#888888';

      this.add.text(statusX, y - 20, statusIcon, {
        fontSize: '20px',
        color: statusColor,
        fontStyle: 'bold',
      }).setOrigin(1, 0.5);

      this.add.text(statusX, y + 5, `Score: ${item.progress.score}%`, {
        fontSize: '12px',
        color: '#ffffff',
      }).setOrigin(1, 0.5);

      const minutes = Math.floor(item.progress.time_spent / 60);
      const seconds = item.progress.time_spent % 60;
      const timeText = minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
      this.add.text(statusX, y + 22, `Time: ${timeText}`, {
        fontSize: '11px',
        color: '#888888',
      }).setOrigin(1, 0.5);
    } else {
      this.add.text(statusX, y, 'Not Started', {
        fontSize: '14px',
        color: '#888888',
        fontStyle: 'italic',
      }).setOrigin(1, 0.5);
    }
  }

  private showError(message: string): void {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    this.add.text(width / 2, height / 2 - 40, 'Error', {
      fontSize: '24px',
      color: '#e94560',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    this.add.text(width / 2, height / 2, message, {
      fontSize: '16px',
      color: '#ffffff',
      align: 'center',
      wordWrap: { width: Math.min(600, width - 80) },
    }).setOrigin(0.5);

    const retryButton = this.add.text(width / 2, height / 2 + 60, 'Retry', {
      fontSize: '16px',
      color: '#e94560',
      backgroundColor: '#0f3460',
      padding: { x: 20, y: 10 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    retryButton.on('pointerover', () => retryButton.setScale(1.1));
    retryButton.on('pointerout', () => retryButton.setScale(1));
    retryButton.on('pointerup', () => this.scene.restart());
  }

  private returnToMenu(): void {
    this.scene.start('MainMenuScene');
  }

  private handleResize(gameSize: Phaser.Structs.Size): void {
    // Guard: don't handle resize if scene is no longer active
    if (!this.scene.isActive() || !this.cameras.main) return;

    const width = gameSize.width;
    const height = gameSize.height;

    this.cameras.resize(width, height);
    this.children.removeAll();
    this.createUI();
    if (!this.isLoading) {
      this.displayProgress();
    }
  }

  shutdown(): void {
    this.scale.off('resize', this.handleResize, this);
  }
}
