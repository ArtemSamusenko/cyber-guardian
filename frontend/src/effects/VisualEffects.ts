import Phaser from 'phaser';

export interface ParticleConfig {
  x: number;
  y: number;
  count?: number;
  color?: number;
  speed?: number;
  lifespan?: number;
}

class VisualEffectsClass {
  private scene: Phaser.Scene | null = null;

  init(scene: Phaser.Scene): void {
    this.scene = scene;
  }

  showSuccessAnimation(x: number, y: number, callback?: () => void): void {
    if (!this.scene) return;

    const checkmark = this.scene.add
      .text(x, y, '✓', {
        fontSize: '64px',
        color: '#4ecca3',
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setScale(0)
      .setDepth(500);

    // Pop in animation
    this.scene.tweens.add({
      targets: checkmark,
      scale: 1.2,
      duration: 200,
      ease: 'Back.easeOut',
      onComplete: () => {
        // Settle animation
        this.scene?.tweens.add({
          targets: checkmark,
          scale: 1,
          duration: 100,
          onComplete: () => {
            // Create particle burst
            this.createParticleBurst({ x, y, color: 0x4ecca3 });

            // Fade out
            this.scene?.tweens.add({
              targets: checkmark,
              alpha: 0,
              y: y - 30,
              delay: 500,
              duration: 300,
              onComplete: () => {
                checkmark.destroy();
                callback?.();
              },
            });
          },
        });
      },
    });
  }

  showFailureAnimation(x: number, y: number, callback?: () => void): void {
    if (!this.scene) return;

    const cross = this.scene.add
      .text(x, y, '✗', {
        fontSize: '64px',
        color: '#e94560',
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setScale(0)
      .setDepth(500);

    // Pop in with shake
    this.scene.tweens.add({
      targets: cross,
      scale: 1,
      duration: 200,
      ease: 'Back.easeOut',
      onComplete: () => {
        this.shakeObject(cross, () => {
          // Fade out
          this.scene?.tweens.add({
            targets: cross,
            alpha: 0,
            delay: 300,
            duration: 300,
            onComplete: () => {
              cross.destroy();
              callback?.();
            },
          });
        });
      },
    });
  }

  shakeObject(
    target: Phaser.GameObjects.GameObject,
    callback?: () => void,
    intensity: number = 5,
    duration: number = 300
  ): void {
    if (!this.scene) return;
    if (!('x' in target) || typeof target.x !== 'number') return;
    const originalX = (target as { x: number }).x;
    const shakes = 6;
    const shakeDuration = duration / shakes;
    const tweens: Phaser.Types.Tweens.TweenBuilderConfig[] = [];

    for (let i = 0; i < shakes; i++) {
      const offset = (i % 2 === 0 ? 1 : -1) * intensity * (1 - i / shakes);
      tweens.push({
        targets: target,
        x: originalX + offset,
        duration: shakeDuration,
        ease: 'Sine.easeInOut',
      });
    }

    tweens.push({
      targets: target,
      x: originalX,
      duration: shakeDuration,
      onComplete: () => callback?.(),
    });

    this.scene.tweens.chain({
      tweens,
    });
  }

  createParticleBurst(config: ParticleConfig): void {
    if (!this.scene) return;

    const {
      x,
      y,
      count = 12,
      color = 0xffffff,
      speed = 200,
      lifespan = 600,
    } = config;

    // Create simple particles using graphics
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count;
      const particle = this.scene.add
        .circle(x, y, 4, color)
        .setDepth(500);

      this.scene.tweens.add({
        targets: particle,
        x: x + Math.cos(angle) * speed * 0.5,
        y: y + Math.sin(angle) * speed * 0.5,
        alpha: 0,
        scale: 0.2,
        duration: lifespan,
        ease: 'Quad.easeOut',
        onComplete: () => {
          particle.destroy();
        },
      });
    }
  }

  showFloatingText(
    x: number,
    y: number,
    text: string,
    color: string = '#4ecca3',
    fontSize: string = '24px'
  ): void {
    if (!this.scene) return;

    const floatingText = this.scene.add
      .text(x, y, text, {
        fontSize,
        color,
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setDepth(500);

    this.scene.tweens.add({
      targets: floatingText,
      y: y - 60,
      alpha: 0,
      duration: 1500,
      ease: 'Quad.easeOut',
      onComplete: () => {
        floatingText.destroy();
      },
    });
  }

  showXPGain(x: number, y: number, amount: number): void {
    this.showFloatingText(x, y, `+${amount} XP`, '#4ecca3', '28px');
  }

  showAchievementPopup(
    name: string,
    description: string,
    icon: string = 'trophy',
    callback?: () => void
  ): void {
    if (!this.scene) return;

    const { width } = this.scene.cameras.main;
    const popupWidth = 350;
    const popupHeight = 100;
    const startY = -popupHeight;
    const endY = 20;

    // Container for the popup
    const container = this.scene.add.container(width / 2, startY).setDepth(1000);

    // Background
    const bg = this.scene.add
      .rectangle(0, 0, popupWidth, popupHeight, 0x16213e)
      .setStrokeStyle(3, 0xe94560);
    container.add(bg);

    // Icon mapping
    const iconMap: Record<string, string> = {
      trophy: '🏆',
      star: '⭐',
      stars: '🌟',
      fire: '🔥',
      flame: '🔥',
      shield: '🛡️',
      mail: '📧',
      wifi: '📶',
      crown: '👑',
      lightning: '⚡',
      target: '🎯',
      calendar: '📅',
      refresh: '🔄',
      medal: '🏅',
      door: '🚪',
    };

    // Icon
    const iconText = this.scene.add
      .text(-popupWidth / 2 + 40, 0, iconMap[icon] || '🏆', {
        fontSize: '36px',
      })
      .setOrigin(0.5);
    container.add(iconText);

    // Achievement unlocked label
    const label = this.scene.add
      .text(-popupWidth / 2 + 80, -20, 'ACHIEVEMENT UNLOCKED', {
        fontSize: '12px',
        color: '#e94560',
        fontStyle: 'bold',
      })
      .setOrigin(0, 0.5);
    container.add(label);

    // Achievement name
    const nameText = this.scene.add
      .text(-popupWidth / 2 + 80, 5, name, {
        fontSize: '18px',
        color: '#ffffff',
        fontStyle: 'bold',
      })
      .setOrigin(0, 0.5);
    container.add(nameText);

    // Achievement description
    const descText = this.scene.add
      .text(-popupWidth / 2 + 80, 28, description, {
        fontSize: '12px',
        color: '#cccccc',
        wordWrap: { width: popupWidth - 100 },
      })
      .setOrigin(0, 0.5);
    container.add(descText);

    // Slide in animation
    this.scene.tweens.add({
      targets: container,
      y: endY + popupHeight / 2,
      duration: 500,
      ease: 'Back.easeOut',
      onComplete: () => {
        // Stay visible then slide out
        this.scene?.time.delayedCall(3000, () => {
          this.scene?.tweens.add({
            targets: container,
            y: startY,
            duration: 400,
            ease: 'Back.easeIn',
            onComplete: () => {
              container.destroy();
              callback?.();
            },
          });
        });
      },
    });
  }

  pulseObject(
    target: Phaser.GameObjects.GameObject,
    intensity: number = 1.1,
    duration: number = 500
  ): void {
    if (!this.scene) return;

    this.scene.tweens.add({
      targets: target,
      scale: intensity,
      duration: duration / 2,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  glowEffect(
    target: Phaser.GameObjects.Rectangle,
    _color: number = 0xe94560,
    _intensity: number = 4
  ): void {
    if (!this.scene) return;

    this.scene.tweens.add({
      targets: target,
      alpha: { from: 0.7, to: 1 },
      duration: 800,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  typewriterText(
    x: number,
    y: number,
    text: string,
    config: Phaser.Types.GameObjects.Text.TextStyle = {},
    charDelay: number = 30,
    callback?: () => void
  ): Phaser.GameObjects.Text {
    if (!this.scene) {
      throw new Error('Scene not initialized');
    }

    const textObject = this.scene.add
      .text(x, y, '', {
        fontSize: '18px',
        color: '#ffffff',
        ...config,
      })
      .setOrigin(0, 0);

    let index = 0;
    const timer = this.scene.time.addEvent({
      delay: charDelay,
      callback: () => {
        textObject.setText(text.substring(0, index + 1));
        index++;

        if (index >= text.length) {
          timer.destroy();
          callback?.();
        }
      },
      repeat: text.length - 1,
    });

    return textObject;
  }
}

export const VisualEffects = new VisualEffectsClass();
