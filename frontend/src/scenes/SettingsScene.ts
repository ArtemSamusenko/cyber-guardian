import Phaser from 'phaser';
import { AudioManager, AudioSettings } from '../audio/AudioManager';

export class SettingsScene extends Phaser.Scene {
  private settings: AudioSettings = AudioManager.getSettings();

  constructor() {
    super({ key: 'SettingsScene' });
  }

  create(): void {
    AudioManager.init(this);
    this.settings = AudioManager.getSettings();

    this.createBackground();
    this.createUI();
    this.setupKeyboardControls();

    this.scale.on('resize', this.handleResize, this);
  }

  private createBackground(): void {
    const { width, height } = this.cameras.main;
    this.add.rectangle(0, 0, width, height, 0x1a1a2e).setOrigin(0, 0);
  }

  private createUI(): void {
    const { width, height } = this.cameras.main;

    // Title
    this.add
      .text(width / 2, 60, 'SETTINGS', {
        fontSize: '42px',
        color: '#e94560',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    // Settings container
    const containerWidth = Math.min(500, width - 80);
    const containerX = width / 2;
    const startY = 160;

    // Music section
    this.add
      .text(containerX - containerWidth / 2, startY, 'Music', {
        fontSize: '24px',
        color: '#ffffff',
        fontStyle: 'bold',
      })
      .setOrigin(0, 0.5);

    this.createToggle(
      containerX + containerWidth / 2 - 70,
      startY,
      this.settings.musicEnabled,
      (enabled) => {
        this.settings.musicEnabled = enabled;
        AudioManager.setMusicEnabled(enabled);
      }
    );

    // Music volume slider
    this.add
      .text(containerX - containerWidth / 2, startY + 50, 'Music Volume', {
        fontSize: '16px',
        color: '#cccccc',
      })
      .setOrigin(0, 0.5);

    this.createSlider(
      containerX,
      startY + 90,
      containerWidth - 40,
      this.settings.musicVolume,
      (value) => {
        this.settings.musicVolume = value;
        AudioManager.setMusicVolume(value);
      }
    );

    // SFX section
    this.add
      .text(containerX - containerWidth / 2, startY + 150, 'Sound Effects', {
        fontSize: '24px',
        color: '#ffffff',
        fontStyle: 'bold',
      })
      .setOrigin(0, 0.5);

    this.createToggle(
      containerX + containerWidth / 2 - 70,
      startY + 150,
      this.settings.sfxEnabled,
      (enabled) => {
        this.settings.sfxEnabled = enabled;
        AudioManager.setSfxEnabled(enabled);
        if (enabled) {
          AudioManager.playClick();
        }
      }
    );

    // SFX volume slider
    this.add
      .text(containerX - containerWidth / 2, startY + 200, 'SFX Volume', {
        fontSize: '16px',
        color: '#cccccc',
      })
      .setOrigin(0, 0.5);

    this.createSlider(
      containerX,
      startY + 240,
      containerWidth - 40,
      this.settings.sfxVolume,
      (value) => {
        this.settings.sfxVolume = value;
        AudioManager.setSfxVolume(value);
      }
    );

    // Test sound button
    const testButton = this.add
      .text(containerX, startY + 310, 'Test Sound', {
        fontSize: '16px',
        color: '#ffffff',
        backgroundColor: '#0f3460',
        padding: { x: 20, y: 10 },
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    testButton.on('pointerover', () => testButton.setScale(1.05));
    testButton.on('pointerout', () => testButton.setScale(1));
    testButton.on('pointerdown', () => {
      AudioManager.playSuccess();
    });

    // Back button
    const backButton = this.add
      .text(40, 40, '← Back', {
        fontSize: '20px',
        color: '#e94560',
        fontStyle: 'bold',
      })
      .setOrigin(0, 0);

    backButton.setInteractive({ useHandCursor: true });
    backButton.on('pointerover', () => backButton.setScale(1.1));
    backButton.on('pointerout', () => backButton.setScale(1));
    backButton.on('pointerup', () => this.returnToMenu());

    // Footer
    this.add
      .text(width / 2, height - 30, 'Press ESC to return to menu', {
        fontSize: '14px',
        color: '#888888',
      })
      .setOrigin(0.5);
  }

  private createToggle(
    x: number,
    y: number,
    initialValue: boolean,
    onChange: (enabled: boolean) => void
  ): Phaser.GameObjects.Container {
    const container = this.add.container(x, y);

    const width = 60;
    const height = 30;

    // Track background
    const track = this.add
      .rectangle(0, 0, width, height, initialValue ? 0x4ecca3 : 0x3a3a4a)
      .setStrokeStyle(2, 0x2a2a3a);

    // Thumb
    const thumb = this.add
      .circle(initialValue ? width / 4 : -width / 4, 0, 12, 0xffffff)
      .setStrokeStyle(2, 0x2a2a3a);

    container.add([track, thumb]);

    let isEnabled = initialValue;

    track.setInteractive({ useHandCursor: true });
    track.on('pointerdown', () => {
      isEnabled = !isEnabled;

      // Animate thumb
      this.tweens.add({
        targets: thumb,
        x: isEnabled ? width / 4 : -width / 4,
        duration: 150,
        ease: 'Power2',
      });

      // Change track color
      track.setFillStyle(isEnabled ? 0x4ecca3 : 0x3a3a4a);

      onChange(isEnabled);
    });

    return container;
  }

  private createSlider(
    x: number,
    y: number,
    sliderWidth: number,
    initialValue: number,
    onChange: (value: number) => void
  ): Phaser.GameObjects.Container {
    const container = this.add.container(x, y);

    const height = 10;
    const halfWidth = sliderWidth / 2;

    // Track background
    const trackBg = this.add
      .rectangle(0, 0, sliderWidth, height, 0x3a3a4a)
      .setOrigin(0.5);

    // Filled portion
    const trackFill = this.add
      .rectangle(-halfWidth, 0, sliderWidth * initialValue, height, 0x4ecca3)
      .setOrigin(0, 0.5);

    // Thumb
    const thumbX = -halfWidth + sliderWidth * initialValue;
    const thumb = this.add.circle(thumbX, 0, 12, 0xe94560).setStrokeStyle(2, 0xffffff);

    // Value text
    const valueText = this.add
      .text(halfWidth + 30, 0, `${Math.round(initialValue * 100)}%`, {
        fontSize: '14px',
        color: '#cccccc',
      })
      .setOrigin(0, 0.5);

    container.add([trackBg, trackFill, thumb, valueText]);

    // Make track interactive
    trackBg.setInteractive({ useHandCursor: true });

    let isDragging = false;

    const updateValue = (pointerX: number) => {
      const localX = pointerX - (x - halfWidth);
      const clampedX = Phaser.Math.Clamp(localX, 0, sliderWidth);
      const value = clampedX / sliderWidth;

      thumb.setX(-halfWidth + clampedX);
      trackFill.setSize(clampedX, height);
      valueText.setText(`${Math.round(value * 100)}%`);

      onChange(value);
    };

    trackBg.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      isDragging = true;
      updateValue(pointer.x);
    });

    thumb.setInteractive({ useHandCursor: true, draggable: true });
    thumb.on('pointerdown', () => {
      isDragging = true;
    });

    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (isDragging) {
        updateValue(pointer.x);
      }
    });

    this.input.on('pointerup', () => {
      isDragging = false;
    });

    return container;
  }

  private setupKeyboardControls(): void {
    this.input.keyboard?.on('keydown-ESC', () => {
      this.returnToMenu();
    });
  }

  private returnToMenu(): void {
    AudioManager.playClick();
    this.scene.start('MainMenuScene');
  }

  private handleResize(gameSize: Phaser.Structs.Size): void {
    // Guard: don't handle resize if scene is no longer active
    if (!this.scene.isActive() || !this.cameras.main) return;

    const { width, height } = gameSize;
    this.cameras.resize(width, height);
    this.children.removeAll();
    this.createBackground();
    this.createUI();
  }

  shutdown(): void {
    this.scale.off('resize', this.handleResize, this);
  }
}
