import Phaser from 'phaser';
import { AudioManager } from '../audio/AudioManager';

interface LevelData {
  id: number;
  title: string;
  description: string;
  isLocked: boolean;
  isCompleted: boolean;
  score?: number;
}

export class LevelSelectScene extends Phaser.Scene {
  private levels: LevelData[] = [];

  constructor() {
    super({ key: 'LevelSelectScene' });
  }

  create(): void {
    AudioManager.init(this);

    this.initializeLevelData();
    this.createUI();
    this.setupKeyboardControls();

    this.scale.on('resize', this.handleResize, this);
  }

  private initializeLevelData(): void {
    // Get completed levels from localStorage
    const completedLevelsStr = localStorage.getItem('completedLevels');
    const completedLevels = completedLevelsStr ? JSON.parse(completedLevelsStr) : [];

    this.levels = [
      {
        id: 1,
        title: 'Password Security',
        description: 'Learn about strong passwords and authentication',
        isLocked: false,
        isCompleted: completedLevels.includes(1),
      },
      {
        id: 2,
        title: 'Phishing Awareness',
        description: 'Identify and avoid phishing attempts',
        isLocked: !completedLevels.includes(1),
        isCompleted: completedLevels.includes(2),
      },
      {
        id: 3,
        title: 'Network Security',
        description: 'Understanding secure network practices',
        isLocked: !completedLevels.includes(2),
        isCompleted: completedLevels.includes(3),
      },
      {
        id: 4,
        title: 'Data Encryption',
        description: 'Learn how encryption protects data and how to share files securely.',
        isLocked: !completedLevels.includes(3),
        isCompleted: completedLevels.includes(4),
      },
      {
        id: 5,
        title: 'Social Engineering',
        description: 'Recognize manipulation tactics and verify suspicious requests safely.',
        isLocked: !completedLevels.includes(4),
        isCompleted: completedLevels.includes(5),
      },
      {
        id: 6,
        title: 'Secure Browsing & 2FA',
        description: 'Identify safe websites and enable two-factor authentication.',
        isLocked: !completedLevels.includes(5),
        isCompleted: completedLevels.includes(6),
      },
    ];
  }

  private createUI(): void {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    this.add.text(width / 2, 60, 'SELECT LEVEL', {
      fontSize: '42px',
      color: '#e94560',
      fontStyle: 'bold',
    }).setOrigin(0.5).setName('title');

    this.createLevelGrid();
    this.createBackButton();

    this.add.text(width / 2, height - 30, 'Press ESC to return to menu', {
      fontSize: '14px',
      color: '#888888',
    }).setOrigin(0.5).setName('instructions');
  }

  private createLevelGrid(): void {
    const width = this.cameras.main.width;

    const cardWidth = 320;
    const cardHeight = 180;
    const padding = 20;
    const columns = width > 800 ? 3 : 2;

    const totalWidth = columns * cardWidth + (columns - 1) * padding;
    const startX = (width - totalWidth) / 2 + cardWidth / 2;
    const startY = 200;

    this.levels.forEach((level, index) => {
      const col = index % columns;
      const row = Math.floor(index / columns);

      const x = startX + col * (cardWidth + padding);
      const y = startY + row * (cardHeight + padding);

      this.createLevelCard(x, y, cardWidth, cardHeight, level);
    });
  }

  private createLevelCard(x: number, y: number, width: number, height: number, level: LevelData): void {
    const container = this.add.container(x, y).setName(`level-${level.id}`);
    const background = this.add.rectangle(0, 0, width, height, 0x16213e);
    background.setStrokeStyle(2, level.isLocked ? 0x0f3460 : 0xe94560);
    container.add(background);

    const badge = this.add.circle(-width / 2 + 30, -height / 2 + 30, 20, 0x0f3460);
    badge.setStrokeStyle(2, 0xe94560);
    container.add([badge, this.add.text(-width / 2 + 30, -height / 2 + 30, level.id.toString(), {
      fontSize: '20px', color: '#ffffff', fontStyle: 'bold',
    }).setOrigin(0.5)]);

    if (level.isLocked) {
      container.add([
        this.add.text(0, -20, '🔒', { fontSize: '48px' }).setOrigin(0.5),
        this.add.text(0, 30, 'LOCKED', { fontSize: '18px', color: '#888888', fontStyle: 'bold' }).setOrigin(0.5)
      ]);
    } else {
      container.add([
        this.add.text(0, -35, level.title, { fontSize: '18px', color: '#ffffff', fontStyle: 'bold', align: 'center', wordWrap: { width: width - 50 } }).setOrigin(0.5),
        this.add.text(0, 5, level.description, { fontSize: '13px', color: '#cccccc', align: 'center', wordWrap: { width: width - 40 } }).setOrigin(0.5),
        this.add.text(0, 55, level.isCompleted ? '✓ COMPLETED' : 'PLAY ▶', {
          fontSize: level.isCompleted ? '14px' : '16px',
          color: level.isCompleted ? '#4ecca3' : '#e94560',
          fontStyle: 'bold'
        }).setOrigin(0.5)
      ]);

      background.setInteractive({ useHandCursor: true });
      background.on('pointerover', () => {
        background.setFillStyle(0x0f3460);
        container.setScale(1.05);
      });
      background.on('pointerout', () => {
        background.setFillStyle(0x16213e);
        container.setScale(1);
      });
      background.on('pointerdown', () => container.setScale(1.02));
      background.on('pointerup', () => {
        container.setScale(1.05);
        this.startLevel(level.id);
      });
    }
  }

  private startLevel(levelId: number): void {
    AudioManager.playClick();

    // Show intro story before level 1
    if (levelId === 1) {
      this.scene.start('StoryScene', {
        beat: 'intro',
        nextScene: 'GameplayScene',
        nextSceneData: { levelId },
      });
      return;
    }

    this.scene.start('GameplayScene', { levelId });
  }

  private createBackButton(): void {
    const backButton = this.add.text(40, 40, '← Back', {
      fontSize: '20px',
      color: '#e94560',
      fontStyle: 'bold',
    }).setOrigin(0);

    backButton.setInteractive({ useHandCursor: true });
    backButton.on('pointerover', () => backButton.setScale(1.1));
    backButton.on('pointerout', () => backButton.setScale(1));
    backButton.on('pointerup', () => this.returnToMenu());
  }

  private setupKeyboardControls(): void {
    this.input.keyboard?.on('keydown-ESC', () => {
      this.returnToMenu();
    });
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
  }

  shutdown(): void {
    // Remove resize listener when scene shuts down
    this.scale.off('resize', this.handleResize, this);
  }
}
