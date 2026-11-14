import Phaser from 'phaser';

export type TransitionType = 'fade' | 'slide' | 'wipe' | 'none';

interface TransitionConfig {
  type: TransitionType;
  duration: number;
  direction?: 'left' | 'right' | 'up' | 'down';
}

const DEFAULT_CONFIG: TransitionConfig = {
  type: 'fade',
  duration: 500,
};

class TransitionManagerClass {
  private scene: Phaser.Scene | null = null;
  private overlay: Phaser.GameObjects.Rectangle | null = null;
  private isTransitioning: boolean = false;

  init(scene: Phaser.Scene): void {
    this.scene = scene;
  }

  async transitionTo(
    targetScene: string,
    sceneData?: object,
    config: Partial<TransitionConfig> = {}
  ): Promise<void> {
    if (!this.scene || this.isTransitioning) return;

    const { type, duration, direction } = { ...DEFAULT_CONFIG, ...config };
    this.isTransitioning = true;

    await this.transitionOut(type, duration, direction);

    this.scene.scene.start(targetScene, sceneData);
    this.isTransitioning = false;
  }

  private async transitionOut(
    type: TransitionType,
    duration: number,
    direction?: string
  ): Promise<void> {
    if (!this.scene) return;

    const { width, height } = this.scene.cameras.main;

    switch (type) {
      case 'fade':
        await this.fadeOut(duration);
        break;
      case 'slide':
        await this.slideOut(duration, direction || 'left', width, height);
        break;
      case 'wipe':
        await this.wipeOut(duration, direction || 'right', width, height);
        break;
      case 'none':
      default:
        break;
    }
  }

  private fadeOut(duration: number): Promise<void> {
    return new Promise((resolve) => {
      if (!this.scene) {
        resolve();
        return;
      }

      const { width, height } = this.scene.cameras.main;

      this.overlay = this.scene.add
        .rectangle(width / 2, height / 2, width, height, 0x000000, 0)
        .setDepth(1000);

      this.scene.tweens.add({
        targets: this.overlay,
        alpha: 1,
        duration,
        ease: 'Power2',
        onComplete: () => {
          resolve();
        },
      });
    });
  }

  private slideOut(
    duration: number,
    direction: string,
    width: number,
    height: number
  ): Promise<void> {
    return new Promise((resolve) => {
      if (!this.scene) {
        resolve();
        return;
      }

      let startX = 0,
        startY = 0;
      let endX = 0,
        endY = 0;

      switch (direction) {
        case 'left':
          startX = width + width / 2;
          endX = width / 2;
          startY = endY = height / 2;
          break;
        case 'right':
          startX = -width / 2;
          endX = width / 2;
          startY = endY = height / 2;
          break;
        case 'up':
          startY = height + height / 2;
          endY = height / 2;
          startX = endX = width / 2;
          break;
        case 'down':
          startY = -height / 2;
          endY = height / 2;
          startX = endX = width / 2;
          break;
      }

      this.overlay = this.scene.add
        .rectangle(startX, startY, width, height, 0x1a1a2e)
        .setDepth(1000);

      this.scene.tweens.add({
        targets: this.overlay,
        x: endX,
        y: endY,
        duration,
        ease: 'Power2',
        onComplete: () => {
          resolve();
        },
      });
    });
  }

  private wipeOut(
    duration: number,
    direction: string,
    width: number,
    height: number
  ): Promise<void> {
    return new Promise((resolve) => {
      if (!this.scene) {
        resolve();
        return;
      }

      const isHorizontal = direction === 'left' || direction === 'right';

      this.overlay = this.scene.add
        .rectangle(
          isHorizontal ? (direction === 'right' ? 0 : width) : width / 2,
          !isHorizontal ? (direction === 'down' ? 0 : height) : height / 2,
          isHorizontal ? 0 : width,
          !isHorizontal ? 0 : height,
          0x1a1a2e
        )
        .setDepth(1000)
        .setOrigin(
          isHorizontal ? (direction === 'right' ? 0 : 1) : 0.5,
          !isHorizontal ? (direction === 'down' ? 0 : 1) : 0.5
        );

      this.scene.tweens.add({
        targets: this.overlay,
        width: isHorizontal ? width : undefined,
        height: !isHorizontal ? height : undefined,
        duration,
        ease: 'Power2',
        onComplete: () => {
          resolve();
        },
      });
    });
  }

  cleanup(): void {
    if (this.overlay) {
      this.overlay.destroy();
      this.overlay = null;
    }
    this.isTransitioning = false;
  }
}

export const TransitionManager = new TransitionManagerClass();
