import Phaser from 'phaser';
import { apiClient } from '../api/client';
import { AudioManager } from '../audio/AudioManager';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  preload(): void {
    this.createLoadingScreen();

    this.load.on('progress', (value: number) => {
      this.updateLoadingBar(value);
    });

    this.load.on('complete', async () => {
      // Initialize audio manager
      AudioManager.init(this);

      // Drop an expired token so the player is sent back to the login screen
      if (apiClient.isAuthenticated()) {
        apiClient.validateToken();
      }

      // Process daily login if authenticated
      if (apiClient.isAuthenticated() && apiClient.validateToken()) {
        try {
          await apiClient.processDailyLogin();
        } catch (error) {
          console.warn('Failed to process daily login:', error);
        }
      }

      this.scene.start('MainMenuScene');
    });

    // Load audio assets
    this.loadAudioAssets();

    // Simulate loading with a small image or dummy asset
    this.load.image('pixel', 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==');
  }

  private loadAudioAssets(): void {
    // Music tracks
    this.load.audio('menu_ambient', 'assets/audio/music/menu_ambient.mp3');
    this.load.audio('gameplay_cyberpunk', 'assets/audio/music/gameplay_cyberpunk.mp3');
    this.load.audio('story_dramatic', 'assets/audio/music/story_dramatic.mp3');

    // Sound effects
    this.load.audio('click', 'assets/audio/sfx/click.mp3');
    this.load.audio('hover', 'assets/audio/sfx/hover.mp3');
    this.load.audio('success', 'assets/audio/sfx/success.mp3');
    this.load.audio('failure', 'assets/audio/sfx/failure.mp3');
    this.load.audio('level_complete', 'assets/audio/sfx/level_complete.mp3');
    this.load.audio('achievement', 'assets/audio/sfx/achievement.mp3');
    this.load.audio('typing', 'assets/audio/sfx/typing.mp3');
    this.load.audio('alert', 'assets/audio/sfx/alert.mp3');
  }

  private createLoadingScreen(): void {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    const progressBar = this.add.graphics();
    const progressBox = this.add.graphics();
    progressBox.fillStyle(0x0f3460, 0.8);
    progressBox.fillRect(width / 2 - 160, height / 2 - 25, 320, 50);

    const loadingText = this.add.text(width / 2, height / 2 - 50, 'Loading...', {
      fontSize: '20px',
      color: '#ffffff',
    });
    loadingText.setOrigin(0.5, 0.5);

    this.registry.set('progressBar', progressBar);
    this.registry.set('progressBox', progressBox);
  }

  private updateLoadingBar(value: number): void {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;
    const progressBar = this.registry.get('progressBar') as Phaser.GameObjects.Graphics;

    progressBar.clear();
    progressBar.fillStyle(0xe94560, 1);
    progressBar.fillRect(width / 2 - 150, height / 2 - 15, 300 * value, 30);
  }
}
