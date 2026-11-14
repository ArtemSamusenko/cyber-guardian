import Phaser from 'phaser';
import { apiClient } from '../api/client';
import { AudioManager } from '../audio/AudioManager';

export class MainMenuScene extends Phaser.Scene {
  constructor() {
    super({ key: 'MainMenuScene' });
  }

  create(): void {
    AudioManager.init(this);
    AudioManager.playMusic('menu_ambient');

    this.createMenu();

    // Handle window resize
    this.scale.on('resize', this.handleResize, this);
  }

  private createMenu(): void {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    // Title
    this.add.text(width / 2, height * 0.15, 'CYBER GUARDIAN', {
      fontSize: '48px',
      color: '#e94560',
      fontStyle: 'bold',
    }).setOrigin(0.5).setName('title');

    this.add.text(width / 2, height * 0.22, 'Defend Your Digital World', {
      fontSize: '20px',
      color: '#ffffff',
    }).setOrigin(0.5).setName('subtitle');

    // Menu buttons - center them vertically
    const buttonSpacing = 80;
    const totalButtonHeight = buttonSpacing * 3; // 4 buttons with 3 spaces between
    const startY = height / 2 - totalButtonHeight / 2;

    this.createMenuButton(width / 2, startY, 'Start Game', () => {
      this.handleStartGame();
    });

    this.createMenuButton(width / 2, startY + buttonSpacing, 'View Progress', () => {
      this.handleViewProgress();
    });

    this.createMenuButton(width / 2, startY + buttonSpacing * 2, 'Settings', () => {
      this.handleSettings();
    });

    this.createMenuButton(width / 2, startY + buttonSpacing * 3, 'About', () => {
      this.handleAbout();
    });

    // Footer
    this.add.text(width / 2, height - 30, 'Press ESC to return to menu at any time', {
      fontSize: '14px',
      color: '#888888',
    }).setOrigin(0.5).setName('footer');

    // Logout button if authenticated
    if (apiClient.isAuthenticated()) {
      const logoutButton = this.add.text(width - 40, 40, 'Logout', {
        fontSize: '16px',
        color: '#e94560',
        fontStyle: 'bold',
      }).setOrigin(1, 0);

      logoutButton.setInteractive({ useHandCursor: true });
      logoutButton.on('pointerover', () => logoutButton.setScale(1.1));
      logoutButton.on('pointerout', () => logoutButton.setScale(1));
      logoutButton.on('pointerup', () => {
        apiClient.clearAuthToken();
        this.showMessage('Logged out successfully');
      });
    }
  }

  private handleResize(gameSize: Phaser.Structs.Size): void {
    // Guard: don't handle resize if scene is no longer active
    if (!this.scene.isActive() || !this.cameras.main) return;

    const width = gameSize.width;
    const height = gameSize.height;

    this.cameras.resize(width, height);

    // Clear and recreate menu
    this.children.removeAll();
    this.createMenu();
  }

  shutdown(): void {
    // Remove resize listener when scene shuts down
    this.scale.off('resize', this.handleResize, this);
  }

  private createMenuButton(x: number, y: number, text: string, callback: () => void): void {
    const buttonWidth = 300;
    const buttonHeight = 60;

    // Button background
    const button = this.add.rectangle(x, y, buttonWidth, buttonHeight, 0x16213e);
    button.setStrokeStyle(2, 0x0f3460);

    // Button text
    const buttonText = this.add.text(x, y, text, {
      fontSize: '24px',
      color: '#ffffff',
    }).setOrigin(0.5);

    // Make interactive
    button.setInteractive({ useHandCursor: true });

    // Hover effects
    button.on('pointerover', () => {
      button.setFillStyle(0x0f3460);
      buttonText.setColor('#e94560');
    });

    button.on('pointerout', () => {
      button.setFillStyle(0x16213e);
      buttonText.setColor('#ffffff');
    });

    button.on('pointerdown', () => {
      button.setScale(0.95);
    });

    button.on('pointerup', () => {
      button.setScale(1);
      AudioManager.playClick();
      callback();
    });
  }

  private handleStartGame(): void {
    if (!apiClient.isAuthenticated() || !apiClient.validateToken()) {
      this.scene.start('LoginScene');
    } else {
      this.scene.start('LevelSelectScene');
    }
  }

  private handleViewProgress(): void {
    if (!apiClient.isAuthenticated() || !apiClient.validateToken()) {
      this.scene.start('LoginScene');
    } else {
      this.scene.start('ProgressScene');
    }
  }

  private handleSettings(): void {
    AudioManager.playClick();
    this.scene.start('SettingsScene');
  }

  private handleAbout(): void {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    // Create overlay
    const overlay = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.8);
    overlay.setInteractive();

    // About box
    const aboutBox = this.add.rectangle(width / 2, height / 2, 600, 400, 0x16213e);
    aboutBox.setStrokeStyle(3, 0xe94560);

    const aboutTitle = this.add.text(width / 2, height / 2 - 150, 'About', {
      fontSize: '32px',
      color: '#e94560',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    const aboutText = this.add.text(width / 2, height / 2 - 50,
      'An educational game teaching\ncybersecurity concepts through\ninteractive scenarios and quizzes.\n\nBuilt with Phaser 3 and TypeScript.',
      {
        fontSize: '18px',
        color: '#ffffff',
        align: 'center',
      }
    ).setOrigin(0.5);

    const closeButton = this.add.text(width / 2, height / 2 + 120, 'Close', {
      fontSize: '20px',
      color: '#e94560',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    closeButton.setInteractive({ useHandCursor: true });
    closeButton.on('pointerover', () => closeButton.setScale(1.1));
    closeButton.on('pointerout', () => closeButton.setScale(1));
    closeButton.on('pointerup', () => {
      overlay.destroy();
      aboutBox.destroy();
      aboutTitle.destroy();
      aboutText.destroy();
      closeButton.destroy();
    });
  }

  private showMessage(message: string): void {
    const width = this.cameras.main.width;

    const messageText = this.add.text(width / 2, 250, message, {
      fontSize: '18px',
      color: '#e94560',
      backgroundColor: '#16213e',
      padding: { x: 20, y: 10 },
    }).setOrigin(0.5);

    this.time.delayedCall(2000, () => {
      messageText.destroy();
    });
  }
}
