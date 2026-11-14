import Phaser from 'phaser';
import { AudioManager } from '../audio/AudioManager';
import { VisualEffects } from '../effects/VisualEffects';
import { apiClient } from '../api/client';
import { StoryProgressResponse, Achievement } from '../api/schemas';

type StoryBeat =
  | 'intro'
  | 'pre_level_2'
  | 'pre_level_3'
  | 'pre_level_4'
  | 'pre_level_5'
  | 'pre_level_6'
  | 'completion';

interface DialogueLine {
  text: string;
  delay?: number;
}

interface StoryData {
  beat: StoryBeat;
  nextScene: string;
  nextSceneData?: object;
}

export class StoryScene extends Phaser.Scene {
  private storyData: StoryData | null = null;
  private dialogueContainer!: Phaser.GameObjects.Container;
  private cipherAvatar!: Phaser.GameObjects.Container;
  private currentLineIndex: number = 0;
  private isTyping: boolean = false;
  private dialogueLines: DialogueLine[] = [];
  private currentText: Phaser.GameObjects.Text | null = null;
  private skipEnabled: boolean = false;
  private typingTimer: Phaser.Time.TimerEvent | null = null;
  private isEnding: boolean = false;
  private inputLocked: boolean = false;
  private spaceKey: Phaser.Input.Keyboard.Key | null = null;
  private enterKey: Phaser.Input.Keyboard.Key | null = null;
  private escKey: Phaser.Input.Keyboard.Key | null = null;

  constructor() {
    super({ key: 'StoryScene' });
  }

  init(data: StoryData): void {
    this.storyData = data;
    this.currentLineIndex = 0;
    this.isTyping = false;
    this.isEnding = false;
    this.inputLocked = false;
    this.typingTimer = null;
    this.currentText = null;
  }

  create(): void {
    this.createBackground();
    this.createCipherAvatar();
    this.createDialogueBox();
    this.setupControls();

    this.loadDialogue();
    this.showNextLine();

    AudioManager.init(this);
    AudioManager.playMusic('story_dramatic');
  }

  update(): void {
    // Handle keyboard input via polling instead of events
    if (this.isEnding || this.inputLocked) return;

    if (this.spaceKey && Phaser.Input.Keyboard.JustDown(this.spaceKey)) {
      this.advance();
    } else if (this.enterKey && Phaser.Input.Keyboard.JustDown(this.enterKey)) {
      this.advance();
    } else if (this.escKey && Phaser.Input.Keyboard.JustDown(this.escKey)) {
      this.skipStory();
    }
  }

  private createBackground(): void {
    const { width, height } = this.cameras.main;

    // Dark gradient background
    this.add.rectangle(0, 0, width, height, 0x0d1b2a).setOrigin(0, 0);

    // Grid pattern overlay
    const graphics = this.add.graphics();
    graphics.lineStyle(1, 0x1e3a5f, 0.3);

    for (let x = 0; x < width; x += 40) {
      graphics.moveTo(x, 0);
      graphics.lineTo(x, height);
    }
    for (let y = 0; y < height; y += 40) {
      graphics.moveTo(0, y);
      graphics.lineTo(width, y);
    }
    graphics.strokePath();

    // Animated scan line
    const scanLine = this.add
      .rectangle(0, 0, width, 2, 0x4ecca3, 0.3)
      .setOrigin(0, 0);

    this.tweens.add({
      targets: scanLine,
      y: height,
      duration: 3000,
      repeat: -1,
      ease: 'Linear',
    });
  }

  private createCipherAvatar(): void {
    const { width, height } = this.cameras.main;
    const avatarX = width / 2;
    const avatarY = height * 0.25;

    this.cipherAvatar = this.add.container(avatarX, avatarY);

    // Shield/lock icon background circle
    const bgCircle = this.add.circle(0, 0, 60, 0x16213e);
    bgCircle.setStrokeStyle(3, 0xe94560);

    // Shield icon
    const shield = this.add
      .text(0, 0, '🛡️', { fontSize: '48px' })
      .setOrigin(0.5);

    // Name label
    const nameLabel = this.add
      .text(0, 80, 'CIPHER', {
        fontSize: '24px',
        color: '#e94560',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    // Subtitle
    const subtitle = this.add
      .text(0, 105, 'AI Security Guide', {
        fontSize: '14px',
        color: '#4ecca3',
      })
      .setOrigin(0.5);

    this.cipherAvatar.add([bgCircle, shield, nameLabel, subtitle]);

    // Pulsing animation for the avatar
    this.tweens.add({
      targets: bgCircle,
      scale: 1.05,
      duration: 1500,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  private createDialogueBox(): void {
    const { width, height } = this.cameras.main;
    const boxWidth = Math.min(700, width - 60);
    const boxHeight = 200;
    const boxX = width / 2;
    const boxY = height - boxHeight / 2 - 100;

    this.dialogueContainer = this.add.container(boxX, boxY);

    // Dialogue box background
    const boxBg = this.add.rectangle(0, 0, boxWidth, boxHeight, 0x16213e, 0.95);
    boxBg.setStrokeStyle(2, 0x4ecca3);

    // Continue hint
    const continueHint = this.add
      .text(boxWidth / 2 - 20, boxHeight / 2 - 20, 'Click or press SPACE to continue', {
        fontSize: '12px',
        color: '#888888',
      })
      .setOrigin(1, 1)
      .setName('continueHint');

    this.dialogueContainer.add([boxBg, continueHint]);

    // Make the box interactive
    boxBg.setInteractive();
    boxBg.on('pointerdown', () => this.advance());
  }

  private setupControls(): void {
    // Use key objects for polling in update() instead of event listeners
    this.spaceKey = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE) || null;
    this.enterKey = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER) || null;
    this.escKey = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.ESC) || null;

    // Create skip button in top right
    const { width } = this.cameras.main;
    const skipButton = this.add
      .text(width - 30, 30, 'Skip >', {
        fontSize: '18px',
        color: '#888888',
        backgroundColor: '#16213e',
        padding: { x: 15, y: 8 },
      })
      .setOrigin(1, 0)
      .setInteractive({ useHandCursor: true })
      .setDepth(100);

    skipButton.on('pointerover', () => {
      skipButton.setColor('#ffffff');
      skipButton.setScale(1.05);
    });
    skipButton.on('pointerout', () => {
      skipButton.setColor('#888888');
      skipButton.setScale(1);
    });
    skipButton.on('pointerdown', () => this.skipStory());

    // Enable skip immediately
    this.skipEnabled = true;
  }

  private loadDialogue(): void {
    const dialogues: Record<StoryBeat, DialogueLine[]> = {
      intro: [
        { text: 'ALERT: Security breach detected in global database.' },
        { text: 'Your personal data may have been compromised.' },
        { text: 'I am CIPHER, your AI security guide.' },
        { text: 'I will help you secure your digital presence.' },
        { text: 'First, let\'s strengthen your password security.' },
        { text: 'A strong password is your first line of defense.' },
        { text: 'Ready to begin? Let\'s protect your digital life.' },
      ],
      pre_level_2: [
        { text: 'Excellent work on your password security!' },
        { text: 'Your new password is strong and secure.' },
        { text: 'But the threat isn\'t over yet...' },
        { text: 'I\'ve detected suspicious activity in your inbox.' },
        { text: 'Phishing emails are attempting to steal your credentials.' },
        { text: 'Let\'s learn to identify and eliminate these threats.' },
      ],
      pre_level_3: [
        { text: 'Impressive! You\'ve identified all phishing attempts.' },
        { text: 'Your email security is now strengthened.' },
        { text: 'However, I\'m detecting an unsafe network connection.' },
        { text: 'Public WiFi networks can expose your data to attackers.' },
        { text: 'Let\'s ensure you\'re connected to a secure network.' },
        { text: 'Remember: not all networks are safe, even if they look legitimate.' },
      ],
      pre_level_4: [
        { text: 'Well done. Your network choices were smart and secure.' },
        { text: 'Now we need to protect the data itself.' },
        { text: 'Sensitive files are being shared without encryption.' },
        { text: 'Attackers only need one exposed link to get inside.' },
        { text: 'Let\'s lock it down with strong encryption.' },
        { text: 'Your next mission: secure your data before it moves.' },
      ],
      pre_level_5: [
        { text: 'Encryption is active. Your data is protected in transit.' },
        { text: 'But attackers don\'t always use code. They use people.' },
        { text: 'I\'m seeing manipulation attempts targeting your team.' },
        { text: 'Urgency, authority, and fear are their favorite tools.' },
        { text: 'Stay calm. Verify requests before you act.' },
        { text: 'Let\'s train your instincts against social engineering.' },
      ],
      pre_level_6: [
        { text: 'You resisted the manipulation. Good discipline.' },
        { text: 'Next, we harden your everyday browsing.' },
        { text: 'Unsafe sites and weak logins are open doors.' },
        { text: 'We\'ll verify trusted URLs and enable strong 2FA.' },
        { text: 'This is about reducing risk, not eliminating it.' },
        { text: 'Let\'s finish this phase and prepare for what comes next.' },
      ],
      completion: [
        { text: 'Outstanding work, Digital Guardian!' },
        { text: 'You have secured your digital perimeter for now.' },
        { text: 'Your password is strong.' },
        { text: 'Your inbox is protected from phishing.' },
        { text: 'Your network connection is secure.' },
        { text: 'Your data is encrypted and your instincts are sharp.' },
        { text: 'Remember: stay vigilant. Threats evolve constantly.' },
        { text: 'This is one chapter complete, not the final one.' },
        { text: 'Stay ready. We will continue the fight soon.' },
      ],
    };

    this.dialogueLines = dialogues[this.storyData?.beat || 'intro'];
  }

  private showNextLine(): void {
    if (this.currentLineIndex >= this.dialogueLines.length) {
      this.endStory();
      return;
    }

    const line = this.dialogueLines[this.currentLineIndex];
    this.displayText(line.text);
  }

  private displayText(text: string): void {
    // IMPORTANT: Destroy any existing timer first to prevent accumulation
    if (this.typingTimer) {
      this.typingTimer.destroy();
      this.typingTimer = null;
    }

    // Remove old text
    if (this.currentText) {
      this.currentText.destroy();
    }

    const { width } = this.cameras.main;
    const boxWidth = Math.min(700, width - 60);

    this.isTyping = true;

    // Create text with typewriter effect
    this.currentText = this.add
      .text(-boxWidth / 2 + 30, -60, '', {
        fontSize: '18px',
        color: '#ffffff',
        wordWrap: { width: boxWidth - 60 },
        lineSpacing: 8,
      })
      .setOrigin(0, 0);

    this.dialogueContainer.add(this.currentText);

    // Start typing sound (loops automatically)
    AudioManager.startTyping();

    // Typewriter effect
    let index = 0;
    this.typingTimer = this.time.addEvent({
      delay: 30,
      callback: () => {
        if (!this.currentText) return;

        this.currentText.setText(text.substring(0, index + 1));
        index++;

        if (index >= text.length) {
          this.typingTimer?.destroy();
          this.typingTimer = null;
          this.isTyping = false;
          AudioManager.stopTyping();
        }
      },
      repeat: text.length - 1,
    });
  }

  private advance(): void {
    // Prevent any input during ending or when locked
    if (this.isEnding || this.inputLocked) return;

    // Lock input immediately to prevent duplicate calls
    this.inputLocked = true;

    if (this.isTyping) {
      // Skip to end of current line
      const line = this.dialogueLines[this.currentLineIndex];
      if (this.currentText && line) {
        if (this.typingTimer) {
          this.typingTimer.destroy();
          this.typingTimer = null;
        }
        this.currentText.setText(line.text);
        this.isTyping = false;
        AudioManager.stopTyping();
      }
      // Unlock after delay
      this.time.delayedCall(200, () => { this.inputLocked = false; });
      return;
    }

    this.currentLineIndex++;
    AudioManager.playClick();
    this.showNextLine();

    // Unlock after delay
    this.time.delayedCall(200, () => { this.inputLocked = false; });
  }

  private skipStory(): void {
    if (!this.skipEnabled || this.isEnding) return;
    this.endStory();
  }

  private async endStory(): Promise<void> {
    // Prevent multiple calls from spam clicking
    if (this.isEnding) return;
    this.isEnding = true;
    this.inputLocked = true;

    // Stop any typing
    if (this.typingTimer) {
      this.typingTimer.destroy();
      this.typingTimer = null;
    }
    this.isTyping = false;

    AudioManager.stopTyping();
    AudioManager.fadeOutMusic(500);

    let newAchievements: Achievement[] = [];

    // Record story progress (for analytics) and get achievements
    if (this.storyData?.beat) {
      try {
        const updateData: Record<string, boolean> = {};
        switch (this.storyData.beat) {
          case 'intro':
            updateData.intro_seen = true;
            break;
          case 'pre_level_2':
            updateData.level1_story_seen = true;
            break;
          case 'pre_level_3':
            updateData.level2_story_seen = true;
            break;
          case 'pre_level_4':
            updateData.level3_story_seen = true;
            break;
          case 'pre_level_5':
            updateData.level4_story_seen = true;
            break;
          case 'pre_level_6':
            updateData.level5_story_seen = true;
            break;
          case 'completion':
            updateData.completion_seen = true;
            break;
        }
        const response = await apiClient.updateStoryProgress<StoryProgressResponse>(updateData);
        newAchievements = response.new_achievements || [];
      } catch (error) {
        console.warn('Failed to update story progress:', error);
      }
    }

    // Show achievements before transitioning
    if (newAchievements.length > 0) {
      VisualEffects.init(this);
      this.showAchievements(newAchievements, () => this.transitionToNextScene());
    } else {
      this.transitionToNextScene();
    }
  }

  private showAchievements(achievements: Achievement[], onComplete: () => void): void {
    if (achievements.length === 0) {
      onComplete();
      return;
    }

    const achievement = achievements.shift()!;
    AudioManager.playAchievement();

    VisualEffects.showAchievementPopup(
      achievement.name,
      achievement.description,
      achievement.icon,
      () => {
        // Show next achievement or complete
        this.time.delayedCall(300, () => {
          this.showAchievements(achievements, onComplete);
        });
      }
    );
  }

  private transitionToNextScene(): void {
    // Fade out and transition
    this.cameras.main.fadeOut(500, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.start(
        this.storyData?.nextScene || 'LevelSelectScene',
        this.storyData?.nextSceneData
      );
    });
  }

  shutdown(): void {
    // Clean up timers
    if (this.typingTimer) {
      this.typingTimer.destroy();
      this.typingTimer = null;
    }
    // Clean up key objects
    this.spaceKey = null;
    this.enterKey = null;
    this.escKey = null;
    AudioManager.stopTyping();
  }
}
