import Phaser from 'phaser';
import { AudioManager } from '../audio/AudioManager';
import { VisualEffects } from '../effects/VisualEffects';

interface LevelConfig {
  id: number;
  title: string;
  scenario: string;
}

interface PasswordStrength {
  score: number;
  label: string;
  color: number;
  feedback: string[];
}

export class GameplayScene extends Phaser.Scene {
  private currentLevel: number = 1;
  private levelConfig: LevelConfig | null = null;
  private computerScreen!: Phaser.GameObjects.Rectangle;
  private screenContent!: Phaser.GameObjects.Container;
  private level1State = {
    username: '',
    email: '',
    password: '',
    passwordVisible: false,
    ruleChipsPlaced: new Set<string>(),
    passwordFragmentsPlaced: new Set<number>(),
  };
  private level2State = {
    selectedEmail: -1,
    emailsMarkedAsSpam: new Set<number>(),
    emailsKeptInInbox: new Set<number>(),
  };
  private level3State = {
    selectedNetwork: -1,
    isConnecting: false,
    wireSolved: false,
    wireMatches: new Set<number>(),
    wireOrder: [0, 1, 2, 3],
    plugConnected: false,
    secureSorted: new Set<number>(),
    unsafeSorted: new Set<number>(),
    sortedReady: false,
  };
  private level4State = {
    workflowReady: false,
    safePlaced: new Set<number>(),
    riskyPlaced: new Set<number>(),
    wireSolved: false,
    wireMatches: new Set<number>(),
    wireOrder: [0, 1, 2, 3] as number[],
  };
  private level5State = {
    safePlaced: new Set<number>(),
    riskyPlaced: new Set<number>(),
    resolved: false,
  };
  private level6State = {
    step: 'url' as 'url' | '2fa',
    urlSafePlaced: new Set<number>(),
    urlRiskyPlaced: new Set<number>(),
    urlResolved: false,
    twofaSafePlaced: new Set<number>(),
    twofaRiskyPlaced: new Set<number>(),
    twofaResolved: false,
    hardening: 35,
  };
  private levelCompleted: boolean = false;

  constructor() {
    super({ key: 'GameplayScene' });
  }

  init(data: { levelId: number }): void {
    this.currentLevel = data.levelId || 1;
    this.level1State.ruleChipsPlaced = new Set<string>();
    this.level1State.passwordFragmentsPlaced = new Set<number>();
    this.level1State.password = '';
    this.level2State.selectedEmail = -1;
    this.level2State.emailsMarkedAsSpam = new Set<number>();
    this.level2State.emailsKeptInInbox = new Set<number>();
    this.level3State.wireSolved = false;
    this.level3State.wireMatches = new Set<number>();
    this.level3State.wireOrder = Phaser.Utils.Array.Shuffle([0, 1, 2, 3]);
    this.level3State.plugConnected = false;
    this.level3State.secureSorted = new Set<number>();
    this.level3State.unsafeSorted = new Set<number>();
    this.level3State.sortedReady = false;
    this.level4State.workflowReady = false;
    this.level4State.safePlaced = new Set<number>();
    this.level4State.riskyPlaced = new Set<number>();
    this.level4State.wireSolved = false;
    this.level4State.wireMatches = new Set<number>();
    this.level4State.wireOrder = Phaser.Utils.Array.Shuffle([0, 1, 2, 3]);
    this.level5State.safePlaced = new Set<number>();
    this.level5State.riskyPlaced = new Set<number>();
    this.level5State.resolved = false;
    this.level6State.step = 'url';
    this.level6State.urlSafePlaced = new Set<number>();
    this.level6State.urlRiskyPlaced = new Set<number>();
    this.level6State.urlResolved = false;
    this.level6State.twofaSafePlaced = new Set<number>();
    this.level6State.twofaRiskyPlaced = new Set<number>();
    this.level6State.twofaResolved = false;
    this.level6State.hardening = 35;
    this.levelCompleted = false;
    this.loadLevelConfig();
  }

  create(): void {
    AudioManager.init(this);
    VisualEffects.init(this);
    AudioManager.playMusic('gameplay_cyberpunk');

    this.createDeskView();
    this.createComputerScreen();
    this.createLevelContent();
    this.createUI();
    this.setupKeyboardControls();

    this.scale.on('resize', this.handleResize, this);
  }

  private loadLevelConfig(): void {
    const configs: Record<number, LevelConfig> = {
      1: {
        id: 1,
        title: 'TechHub - Sign Up',
        scenario: 'Create your new TechHub account',
      },
      2: {
        id: 2,
        title: 'Email - Inbox',
        scenario: 'You have 5 new messages',
      },
      3: {
        id: 3,
        title: 'WiFi Settings',
        scenario: 'Connect to a network',
      },
      4: {
        id: 4,
        title: 'Data Encryption',
        scenario: 'Send a sensitive file to your friend safely.',
      },
      5: {
        id: 5,
        title: 'Social Engineering',
        scenario: 'A suspicious caller is asking for your credentials.',
      },
      6: {
        id: 6,
        title: 'Secure Browsing & 2FA',
        scenario: 'Identify safe websites and enable two-factor authentication.',
      },
    };

    this.levelConfig = configs[this.currentLevel] || configs[1];
  }

  private createDeskView(): void {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    // Dark background
    this.add.rectangle(0, 0, width, height, 0x1a1a2e).setOrigin(0, 0);

    // Desk surface (bottom third)
    const deskHeight = height * 0.3;
    this.add.rectangle(0, height - deskHeight, width, deskHeight, 0x3d2817).setOrigin(0, 0);

    // Desk edge (lighter strip)
    this.add.rectangle(0, height - deskHeight, width, 4, 0x5c3d2e).setOrigin(0, 0);

    // Keyboard area
    const keyboardWidth = 400;
    const keyboardHeight = 120;
    const keyboardX = width / 2;
    const keyboardY = height - deskHeight / 2 + 20;

    this.add.rectangle(keyboardX, keyboardY, keyboardWidth, keyboardHeight, 0x2a2a2a)
      .setStrokeStyle(2, 0x1a1a1a);

    // Draw keyboard keys (simple grid)
    const keySize = 20;
    const keyGap = 4;
    const keysPerRow = 15;
    const rows = 4;

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < keysPerRow; col++) {
        const keyX = keyboardX - (keysPerRow * (keySize + keyGap)) / 2 + col * (keySize + keyGap) + keySize / 2;
        const keyY = keyboardY - (rows * (keySize + keyGap)) / 2 + row * (keySize + keyGap) + keySize / 2;
        this.add.rectangle(keyX, keyY, keySize, keySize, 0x3a3a3a)
          .setStrokeStyle(1, 0x4a4a4a);
      }
    }

    // Mouse (to the right of keyboard)
    const mouseX = keyboardX + keyboardWidth / 2 + 60;
    this.add.ellipse(mouseX, keyboardY, 40, 60, 0x2a2a2a)
      .setStrokeStyle(2, 0x1a1a1a);
  }

  private createComputerScreen(): void {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    const screenWidth = Math.min(800, width * 0.6);
    const screenHeight = Math.min(500, height * 0.5);
    const screenX = width / 2;
    const screenY = height * 0.3;

    // Monitor bezel
    this.add.rectangle(screenX, screenY, screenWidth + 20, screenHeight + 20, 0x1a1a1a)
      .setStrokeStyle(3, 0x0a0a0a);

    // Screen
    this.computerScreen = this.add.rectangle(screenX, screenY, screenWidth, screenHeight, 0x0d1b2a)
      .setStrokeStyle(1, 0x1e3a5f);

    // Screen content container
    this.screenContent = this.add.container(screenX - screenWidth / 2 + 20, screenY - screenHeight / 2 + 20);

    // Monitor stand
    const standWidth = 80;
    const standHeight = 40;
    this.add.rectangle(screenX, screenY + screenHeight / 2 + 30, standWidth, standHeight, 0x2a2a2a);
    this.add.rectangle(screenX, screenY + screenHeight / 2 + 50, standWidth * 2, 10, 0x1a1a1a);
  }

  private createLevelContent(): void {
    if (!this.levelConfig) return;

    this.screenContent.removeAll(true);

    // Title bar
    const titleBar = this.add.rectangle(0, 0, this.computerScreen.width - 40, 40, 0x16213e)
      .setOrigin(0, 0);
    this.screenContent.add(titleBar);

    const titleText = this.add.text(10, 10, this.levelConfig.title, {
      fontSize: '18px',
      color: '#e94560',
      fontStyle: 'bold',
    }).setOrigin(0, 0);
    this.screenContent.add(titleText);

    // Scenario description
    const scenarioText = this.add.text(10, 60, this.levelConfig.scenario, {
      fontSize: '16px',
      color: '#ffffff',
      wordWrap: { width: this.computerScreen.width - 80 },
    }).setOrigin(0, 0);
    this.screenContent.add(scenarioText);

    // Level-specific content
    switch (this.currentLevel) {
      case 1:
        this.createLevel1Content();
        break;
      case 2:
        this.createLevel2Content();
        break;
      case 3:
        this.createLevel3Content();
        break;
      case 4:
        this.createLevel4Content();
        break;
      case 5:
        this.createLevel5Content();
        break;
      case 6:
        this.createLevel6Content();
        break;
    }

    this.fitScreenContentToViewport();
  }

  private fitScreenContentToViewport(): void {
    const baseX = this.computerScreen.x - this.computerScreen.width / 2 + 20;
    const baseY = this.computerScreen.y - this.computerScreen.height / 2 + 20;
    const availableWidth = this.computerScreen.width - 40;
    const availableHeight = this.computerScreen.height - 40;

    this.screenContent.setScale(1);
    this.screenContent.setPosition(baseX, baseY);

    if (this.screenContent.length === 0) return;

    const bounds = this.screenContent.getBounds();
    const localMinX = bounds.x - baseX;
    const localMinY = bounds.y - baseY;
    const contentWidth = Math.max(1, bounds.width);
    const contentHeight = Math.max(1, bounds.height);

    const scale = Math.min(1, availableWidth / contentWidth, availableHeight / contentHeight);
    const scaledWidth = contentWidth * scale;
    const scaledHeight = contentHeight * scale;
    const offsetX = Math.max(0, (availableWidth - scaledWidth) / 2);
    const offsetY = Math.max(0, (availableHeight - scaledHeight) / 2);

    this.screenContent.setScale(scale);
    this.screenContent.setPosition(
      baseX + offsetX - localMinX * scale,
      baseY + offsetY - localMinY * scale
    );
  }

  private toContentCoords(worldX: number, worldY: number): { x: number; y: number } {
    const scaleX = this.screenContent.scaleX || 1;
    const scaleY = this.screenContent.scaleY || 1;
    return {
      x: (worldX - this.screenContent.x) / scaleX,
      y: (worldY - this.screenContent.y) / scaleY,
    };
  }

  private renderPlacedLabels(
    labels: string[],
    leftPlaced: Set<number>,
    rightPlaced: Set<number>,
    leftX: number,
    rightX: number,
    startY: number,
    options?: {
      leftColor?: string;
      rightColor?: string;
      fontSize?: string;
      maxItemsPerBin?: number;
      maxLabelLength?: number;
    }
  ): void {
    const fontSize = options?.fontSize ?? '9px';
    const leftColor = options?.leftColor ?? '#4ecca3';
    const rightColor = options?.rightColor ?? '#e94560';
    const maxItemsPerBin = options?.maxItemsPerBin ?? 4;
    const maxLabelLength = options?.maxLabelLength ?? 24;

    const trimLabel = (text: string): string => {
      if (text.length <= maxLabelLength) return text;
      return `${text.slice(0, Math.max(1, maxLabelLength - 1))}...`;
    };

    const renderColumn = (indices: Set<number>, x: number, color: string): void => {
      const sorted = Array.from(indices).sort((a, b) => a - b);
      let y = startY;
      sorted.slice(0, maxItemsPerBin).forEach((idx) => {
        this.screenContent.add(this.add.text(x, y, trimLabel(labels[idx] ?? ''), {
          fontSize,
          color,
        }).setOrigin(0, 0));
        y += 10;
      });
      if (sorted.length > maxItemsPerBin) {
        this.screenContent.add(this.add.text(x, y, `+${sorted.length - maxItemsPerBin} more`, {
          fontSize,
          color,
        }).setOrigin(0, 0));
      }
    };

    renderColumn(leftPlaced, leftX, leftColor);
    renderColumn(rightPlaced, rightX, rightColor);
  }

  private createLevel1Content(): void {
    // Password selection form
    const startY = 85;

    // Instructions
    const instructions = this.add.text(10, startY, 'Choose a password for your TechHub account', {
      fontSize: '13px',
      color: '#cccccc',
    }).setOrigin(0, 0);
    this.screenContent.add(instructions);

    const passwords = [
      { text: 'password123', secure: false },
      { text: 'P@ssw0rd2024!', secure: false },
      { text: 'j9K$mP2#xL5q', secure: true },
      { text: 'ilovemydog', secure: false },
    ];

    passwords.forEach((pwd, index) => {
      const y = startY + 30 + index * 42;

      const button = this.add.rectangle(10, y, this.computerScreen.width - 60, 36, 0x1a2332)
        .setOrigin(0, 0)
        .setStrokeStyle(2, this.level1State.password === pwd.text ? 0xe94560 : 0x2a3a4a)
        .setInteractive({ useHandCursor: true });

      const text = this.add.text(20, y + 10, pwd.text, {
        fontSize: '13px',
        color: '#ffffff',
        fontFamily: 'monospace',
      }).setOrigin(0, 0);

      button.on('pointerover', () => button.setStrokeStyle(2, 0x4ecca3));
      button.on('pointerout', () => button.setStrokeStyle(2, this.level1State.password === pwd.text ? 0xe94560 : 0x2a3a4a));
      button.on('pointerup', () => this.selectPassword(pwd.text));

      this.screenContent.add([button, text]);
    });

    // Password strength indicator (if password selected)
    if (this.level1State.password) {
      const strength = this.evaluatePasswordStrength(this.level1State.password);
      const strengthY = startY + 202;

      const strengthLabel = this.add.text(10, strengthY, 'Password Strength:', {
        fontSize: '11px',
        color: '#cccccc',
      }).setOrigin(0, 0);
      this.screenContent.add(strengthLabel);

      const strengthBar = this.add.rectangle(135, strengthY + 6, 125, 8, 0x2a3a4a)
        .setOrigin(0, 0.5);
      const strengthFill = this.add.rectangle(135, strengthY + 6, (strength.score / 100) * 125, 8, strength.color)
        .setOrigin(0, 0.5);

      const strengthText = this.add.text(270, strengthY, strength.label, {
        fontSize: '11px',
        color: '#' + strength.color.toString(16).padStart(6, '0'),
        fontStyle: 'bold',
      }).setOrigin(0, 0);

      this.screenContent.add([strengthBar, strengthFill, strengthText]);

      // Feedback messages
      let feedbackY = strengthY + 22;
      strength.feedback.slice(0, 5).forEach(feedback => {
        const feedbackColor = feedback.startsWith('✓') ? '#4ecca3' : '#e94560';
        const feedbackText = this.add.text(10, feedbackY, feedback, {
          fontSize: '10px',
          color: feedbackColor,
        }).setOrigin(0, 0);
        this.screenContent.add(feedbackText);
        feedbackY += 16;
      });

      // Submit button
      const canSubmit = strength.score === 100;
      const submitButton = this.add.text(
        this.computerScreen.width / 2 - 20,
        feedbackY + 20,
        'Create Account',
        {
          fontSize: '15px',
          color: canSubmit ? '#ffffff' : '#666666',
          backgroundColor: canSubmit ? '#4ecca3' : '#2a3a4a',
          padding: { x: 25, y: 10 },
          fontStyle: 'bold',
        }
      ).setOrigin(0.5, 0).setInteractive({ useHandCursor: canSubmit });

      if (canSubmit) {
        submitButton.on('pointerover', () => submitButton.setScale(1.05));
        submitButton.on('pointerout', () => submitButton.setScale(1));
        submitButton.on('pointerup', () => this.submitSignupForm());
      }

      this.screenContent.add(submitButton);
    }
  }

  private selectPassword(password: string): void {
    this.level1State.password = password;
    this.createLevelContent();
  }

  private evaluatePasswordStrength(password: string): PasswordStrength {
    const feedback: string[] = [];
    let score = 0;

    // Check length
    if (password.length >= 12) {
      feedback.push('✓ Length is good (12+ characters)');
      score += 25;
    } else {
      feedback.push('✗ Too short (needs 12+ characters)');
    }

    // Check for uppercase
    if (/[A-Z]/.test(password)) {
      feedback.push('✓ Contains uppercase letters');
      score += 15;
    } else {
      feedback.push('✗ Missing uppercase letters');
    }

    // Check for lowercase
    if (/[a-z]/.test(password)) {
      feedback.push('✓ Contains lowercase letters');
      score += 15;
    } else {
      feedback.push('✗ Missing lowercase letters');
    }

    // Check for numbers
    if (/[0-9]/.test(password)) {
      feedback.push('✓ Contains numbers');
      score += 15;
    } else {
      feedback.push('✗ Missing numbers');
    }

    // Check for special characters
    if (/[^A-Za-z0-9]/.test(password)) {
      feedback.push('✓ Contains special characters');
      score += 15;
    } else {
      feedback.push('✗ Missing special characters');
    }

    // Check for common patterns
    const commonPatterns = ['password', '123', 'abc', 'qwerty'];
    const hasCommonPattern = commonPatterns.some(pattern =>
      password.toLowerCase().includes(pattern)
    );

    if (!hasCommonPattern) {
      feedback.push('✓ No common patterns detected');
      score += 15;
    } else {
      feedback.push('✗ Contains common patterns');
      score -= 20;
    }

    // Determine label and color
    let label = 'Weak';
    let color = 0xe94560;

    if (score >= 100) {
      label = 'Excellent';
      color = 0x4ecca3;
    } else if (score >= 70) {
      label = 'Strong';
      color = 0x4ecca3;
    } else if (score >= 50) {
      label = 'Moderate';
      color = 0xffa500;
    }

    return { score: Math.max(0, score), label, color, feedback };
  }

  private submitSignupForm(): void {
    AudioManager.playSuccess();

    this.showFeedback(
      '✓ Account Created!',
      'Excellent! You\'ve chosen a strong password that uses mixed characters, good length, and avoids common patterns.',
      true
    );
    this.time.delayedCall(2500, () => this.completeLevel());
  }

  private createLevel2Content(): void {
    // Realistic email inbox
    const startY = 85;

    if (this.level2State.selectedEmail === -1) {
      // Show inbox list
      this.createEmailInbox(startY);
    } else {
      // Show selected email detail
      this.createEmailDetail(startY);
    }
  }

  private createEmailInbox(startY: number): void {
    const instructions = this.add.text(10, startY, 'Click on an email to read it', {
      fontSize: '11px',
      color: '#888888',
    }).setOrigin(0, 0);
    this.screenContent.add(instructions);

    const emails = [
      {
        from: 'PayPal Security',
        email: 'noreply@paypa1-secure.com',
        subject: 'URGENT: Verify your account NOW',
        preview: 'Your account will be suspended unless you verify...',
        isSpam: true,
      },
      {
        from: 'Your Bank',
        email: 'support@yourbank.com',
        subject: 'Monthly Statement Available',
        preview: 'Your monthly statement for December is ready...',
        isSpam: false,
      },
      {
        from: 'IT Administrator',
        email: 'admin@company-security.biz',
        subject: 'Password Reset Required Immediately',
        preview: 'We have detected unusual activity. Reset now...',
        isSpam: true,
      },
      {
        from: 'Netflix',
        email: 'info@netflixx-billing.com',
        subject: 'Payment Failed - Update Required',
        preview: 'Your payment method failed. Update immediately...',
        isSpam: true,
      },
      {
        from: 'Amazon',
        email: 'orders@amazon.com',
        subject: 'Your order has been shipped',
        preview: 'Order #123-4567890-1234567 has been shipped...',
        isSpam: false,
      },
    ];

    emails.forEach((email, index) => {
      const y = startY + 25 + index * 68;
      const isMarkedAsSpam = this.level2State.emailsMarkedAsSpam.has(index);

      const emailBox = this.add.rectangle(10, y, this.computerScreen.width - 60, 60, isMarkedAsSpam ? 0x2a1a1a : 0x1a2332)
        .setOrigin(0, 0)
        .setStrokeStyle(2, isMarkedAsSpam ? 0xe94560 : 0x2a3a4a)
        .setInteractive({ useHandCursor: true });

      const fromText = this.add.text(20, y + 7, email.from, {
        fontSize: '13px',
        color: '#ffffff',
        fontStyle: 'bold',
      }).setOrigin(0, 0);

      const emailText = this.add.text(20, y + 24, email.email, {
        fontSize: '9px',
        color: '#888888',
        fontFamily: 'monospace',
      }).setOrigin(0, 0);

      const subjectText = this.add.text(20, y + 38, email.subject, {
        fontSize: '11px',
        color: isMarkedAsSpam ? '#e94560' : '#cccccc',
      }).setOrigin(0, 0);

      if (isMarkedAsSpam) {
        const spamLabel = this.add.text(this.computerScreen.width - 80, y + 7, '[SPAM]', {
          fontSize: '10px',
          color: '#e94560',
          fontStyle: 'bold',
        }).setOrigin(0, 0);
        this.screenContent.add(spamLabel);
      }

      emailBox.on('pointerover', () => emailBox.setStrokeStyle(2, 0x4ecca3));
      emailBox.on('pointerout', () => emailBox.setStrokeStyle(2, isMarkedAsSpam ? 0xe94560 : 0x2a3a4a));
      emailBox.on('pointerup', () => this.openEmail(index));

      this.screenContent.add([emailBox, fromText, emailText, subjectText]);
    });

    // Done button
    const markedCount = this.level2State.emailsMarkedAsSpam.size;
    const doneButton = this.add.text(
      this.computerScreen.width / 2 - 20,
      startY + 370,
      `Done (${markedCount} marked as spam)`,
      {
        fontSize: '13px',
        color: markedCount > 0 ? '#ffffff' : '#666666',
        backgroundColor: markedCount > 0 ? '#4ecca3' : '#2a3a4a',
        padding: { x: 22, y: 9 },
        fontStyle: 'bold',
      }
    ).setOrigin(0.5, 0).setInteractive({ useHandCursor: markedCount > 0 });

    if (markedCount > 0) {
      doneButton.on('pointerover', () => doneButton.setScale(1.05));
      doneButton.on('pointerout', () => doneButton.setScale(1));
      doneButton.on('pointerup', () => this.checkEmailResults());
    }

    this.screenContent.add(doneButton);
  }

  private createEmailDetail(startY: number): void {
    const emails = [
      {
        from: 'PayPal Security <noreply@paypa1-secure.com>',
        subject: 'URGENT: Verify your account NOW',
        body: 'Dear customer,\n\nYour account has been flagged. You MUST verify within 24 hours or your account will be SUSPENDED.\n\nVerify: http://paypa1-secure.com/verify\n\nPayPal Security',
        isSpam: true,
        warnings: ['Misspelled domain (paypa1)', 'Urgent language', 'Suspicious link'],
      },
      {
        from: 'Your Bank <support@yourbank.com>',
        subject: 'Monthly Statement Available',
        body: 'Hello,\n\nYour December 2025 statement is ready.\n\nView at: www.yourbank.com\n\nCustomer Service',
        isSpam: false,
        warnings: ['Legitimate domain', 'Professional tone', 'Normal communication'],
      },
      {
        from: 'IT Administrator <admin@company-security.biz>',
        subject: 'Password Reset Required Immediately',
        body: 'ATTENTION:\n\nUnusual activity detected. Reset password IMMEDIATELY.\n\nReset: http://company-security.biz/reset?id=xyz123\n\nIT Security',
        isSpam: true,
        warnings: ['Unknown domain (.biz)', 'Pressure tactics', 'Suspicious link'],
      },
      {
        from: 'Netflix <info@netflixx-billing.com>',
        subject: 'Payment Failed - Update Required',
        body: 'Hi,\n\nPayment failed. Update to avoid interruption.\n\nUpdate: http://netflixx-billing.com/payment\n\nNetflix Team',
        isSpam: true,
        warnings: ['Misspelled domain (netflixx)', 'Payment urgency'],
      },
      {
        from: 'Amazon <orders@amazon.com>',
        subject: 'Your order has been shipped',
        body: 'Hello,\n\nOrder #123-4567890-1234567 shipped.\nArrives Dec 15th.\n\nTrack: amazon.com/tracking\n\nAmazon Orders',
        isSpam: false,
        warnings: ['Official domain', 'Specific order number', 'Normal notification'],
      },
    ];

    const email = emails[this.level2State.selectedEmail];
    const isMarkedAsSpam = this.level2State.emailsMarkedAsSpam.has(this.level2State.selectedEmail);

    // Back button
    const backButton = this.add.text(10, startY, '← Back to Inbox', {
      fontSize: '11px',
      color: '#4ecca3',
      fontStyle: 'bold',
    }).setOrigin(0, 0).setInteractive({ useHandCursor: true });

    backButton.on('pointerover', () => backButton.setScale(1.05));
    backButton.on('pointerout', () => backButton.setScale(1));
    backButton.on('pointerup', () => this.closeEmail());

    this.screenContent.add(backButton);

    // Email header
    const headerBg = this.add.rectangle(10, startY + 22, this.computerScreen.width - 60, 70, 0x16213e)
      .setOrigin(0, 0);
    this.screenContent.add(headerBg);

    const fromText = this.add.text(20, startY + 30, `From: ${email.from}`, {
      fontSize: '11px',
      color: '#cccccc',
      wordWrap: { width: this.computerScreen.width - 100 },
    }).setOrigin(0, 0);

    const subjectText = this.add.text(20, startY + 48, `Subject: ${email.subject}`, {
      fontSize: '12px',
      color: '#ffffff',
      fontStyle: 'bold',
      wordWrap: { width: this.computerScreen.width - 100 },
    }).setOrigin(0, 0);

    this.screenContent.add([fromText, subjectText]);

    // Email body
    const bodyText = this.add.text(20, startY + 105, email.body, {
      fontSize: '11px',
      color: '#ffffff',
      lineSpacing: 5,
      wordWrap: { width: this.computerScreen.width - 100 },
    }).setOrigin(0, 0);
    this.screenContent.add(bodyText);

    // Analysis hints
    const hintsY = startY + 245;
    const hintsTitle = this.add.text(20, hintsY, 'Security Analysis:', {
      fontSize: '10px',
      color: '#888888',
      fontStyle: 'bold',
    }).setOrigin(0, 0);
    this.screenContent.add(hintsTitle);

    let hintY = hintsY + 18;
    email.warnings.slice(0, 3).forEach(warning => {
      const hintText = this.add.text(20, hintY, `• ${warning}`, {
        fontSize: '9px',
        color: '#888888',
        wordWrap: { width: this.computerScreen.width - 100 },
      }).setOrigin(0, 0);
      this.screenContent.add(hintText);
      hintY += 14;
    });

    // Mark as Spam button
    const buttonY = startY + 320;
    const spamButton = this.add.text(
      this.computerScreen.width / 2 - 20,
      buttonY,
      isMarkedAsSpam ? '✓ Marked as Spam - Click to Undo' : 'Mark as Spam',
      {
        fontSize: '14px',
        color: '#ffffff',
        backgroundColor: isMarkedAsSpam ? '#4ecca3' : '#e94560',
        padding: { x: 20, y: 10 },
        fontStyle: 'bold',
      }
    ).setOrigin(0.5, 0).setInteractive({ useHandCursor: true });

    spamButton.on('pointerover', () => spamButton.setScale(1.05));
    spamButton.on('pointerout', () => spamButton.setScale(1));
    spamButton.on('pointerup', () => this.toggleSpam(this.level2State.selectedEmail));

    this.screenContent.add(spamButton);
  }

  private openEmail(index: number): void {
    this.level2State.selectedEmail = index;
    this.createLevelContent();
  }

  private closeEmail(): void {
    this.level2State.selectedEmail = -1;
    this.createLevelContent();
  }

  private toggleSpam(index: number): void {
    if (this.level2State.emailsMarkedAsSpam.has(index)) {
      this.level2State.emailsMarkedAsSpam.delete(index);
    } else {
      this.level2State.emailsMarkedAsSpam.add(index);
    }
    this.createLevelContent();
  }

  private checkEmailResults(): void {
    const correctSpam = new Set([0, 2, 3]); // Emails 0, 2, 3 are spam
    const markedSpam = this.level2State.emailsMarkedAsSpam;

    const correctlyMarked = Array.from(markedSpam).filter(i => correctSpam.has(i)).length;
    const incorrectlyMarked = Array.from(markedSpam).filter(i => !correctSpam.has(i)).length;
    const missed = Array.from(correctSpam).filter(i => !markedSpam.has(i)).length;

    if (correctlyMarked === correctSpam.size && incorrectlyMarked === 0) {
      AudioManager.playSuccess();

      this.showFeedback(
        '✓ Excellent Work!',
        `Perfect! You identified all ${correctSpam.size} phishing emails and didn't mark any legitimate ones.`,
        true
      );
      this.time.delayedCall(2500, () => this.completeLevel());
    } else {
      AudioManager.playFailure();
      const feedback = `You correctly identified ${correctlyMarked}/${correctSpam.size} phishing emails.\n` +
        (incorrectlyMarked > 0 ? `You marked ${incorrectlyMarked} legitimate email(s) as spam.\n` : '') +
        (missed > 0 ? `You missed ${missed} phishing email(s).` : '');
      this.showFeedback('Try Again', feedback, false);
    }
  }

  private createLevel3Content(): void {
    // Realistic WiFi settings
    const startY = 85;

    if (this.level3State.isConnecting) {
      this.createConnectingScreen(startY);
    } else if (this.level3State.selectedNetwork === -1) {
      this.createNetworkList(startY);
    } else {
      this.createNetworkDetail(startY);
    }
  }

  private createLevel4Content(): void {
    const startY = 85;
    this.createLevel4WirePuzzle(startY);
  }

  private createLevel4WirePuzzle(startY: number): void {
    const instructions = this.add.text(10, startY, 'Connect each encryption component to establish a secure file transfer', {
      fontSize: '11px',
      color: '#cccccc',
      wordWrap: { width: this.computerScreen.width - 60 },
    }).setOrigin(0, 0);
    this.screenContent.add(instructions);

    const channels = [
      { label: 'AES-256 Key', color: 0xe94560 },
      { label: 'SSL Certificate', color: 0x4ecca3 },
      { label: 'Hash Verification', color: 0x00b4d8 },
      { label: 'Secure Handshake', color: 0xffa500 },
    ];

    const leftX = 115;
    const rightX = this.computerScreen.width - 115;
    const topY = startY + 50;
    const spacing = 42;

    const fixedLines = this.add.graphics();
    this.screenContent.add(fixedLines);
    const dragLine = this.add.graphics();
    this.screenContent.add(dragLine);

    // Draw already matched wires
    this.level4State.wireMatches.forEach(idx => {
      const ry = topY + this.level4State.wireOrder.indexOf(idx) * spacing;
      fixedLines.lineStyle(3, channels[idx].color, 1).lineBetween(leftX, topY + idx * spacing, rightX, ry);
    });

    // Create wire nodes with labels
    channels.forEach((channel, idx) => {
      const ly = topY + idx * spacing;
      const ry = topY + this.level4State.wireOrder.indexOf(idx) * spacing;
      const isMatched = this.level4State.wireMatches.has(idx);

      // Left side - source labels
      const leftLabel = this.add.text(10, ly, channel.label, {
        fontSize: '10px',
        color: isMatched ? '#4ecca3' : '#ffffff',
      }).setOrigin(0, 0.5);
      this.screenContent.add(leftLabel);

      // Right side - destination labels (shuffled, positioned after connector)
      const rightIdx = this.level4State.wireOrder.indexOf(idx);
      const rightLabel = this.add.text(rightX + 15, topY + rightIdx * spacing, channel.label, {
        fontSize: '10px',
        color: isMatched ? '#4ecca3' : '#888888',
      }).setOrigin(0, 0.5);
      this.screenContent.add(rightLabel);

      const leftNode = this.add.circle(leftX, ly, 8, channel.color).setStrokeStyle(2, 0xffffff);
      const rightNode = this.add.circle(rightX, ry, 8, channel.color).setStrokeStyle(2, 0xffffff);
      this.screenContent.add([leftNode, rightNode]);

      // Make unmatched left nodes draggable
      if (!isMatched) {
        leftNode.setInteractive({ useHandCursor: true });
        leftNode.on('pointerdown', () => {
          const onMove = (pointer: Phaser.Input.Pointer) => {
            const { x: localX, y: localY } = this.toContentCoords(pointer.x, pointer.y);
            dragLine.clear();
            dragLine.lineStyle(3, channel.color, 1).lineBetween(leftX, topY + idx * spacing, localX, localY);
          };
          const onUp = (pointer: Phaser.Input.Pointer) => {
            this.input.off('pointermove', onMove);
            this.input.off('pointerup', onUp);
            const localY = this.toContentCoords(pointer.x, pointer.y).y;
            let matched = false;
            this.level4State.wireOrder.forEach((wireIdx, slotIdx) => {
              const targetY = topY + slotIdx * spacing;
              if (Math.abs(localY - targetY) < 18 && wireIdx === idx && !this.level4State.wireMatches.has(wireIdx)) {
                this.level4State.wireMatches.add(wireIdx);
                matched = true;
              }
            });
            dragLine.clear();
            if (matched && this.level4State.wireMatches.size === 4) {
              this.level4State.wireSolved = true;
              AudioManager.playSuccess();
              this.showFeedback(
                '✓ Secure Connection Established!',
                'All encryption channels are connected. Your file transfer is now protected with end-to-end encryption.',
                true
              );
              this.time.delayedCall(2500, () => this.completeLevel());
              return;
            }
            this.createLevelContent();
          };
          this.input.on('pointermove', onMove);
          this.input.on('pointerup', onUp);
          dragLine.clear();
        });
      }
    });

    // Progress indicator
    const progress = this.add.text(
      this.computerScreen.width / 2 - 20,
      topY + spacing * 4 + 20,
      `Encryption channels: ${this.level4State.wireMatches.size}/4 connected`,
      {
        fontSize: '11px',
        color: this.level4State.wireMatches.size === 4 ? '#4ecca3' : '#888888',
      }
    ).setOrigin(0.5, 0);
    this.screenContent.add(progress);
  }

  private createLevel5Content(): void {
    const startY = 85;

    const header = this.add.text(10, startY, 'Social Engineering Call', {
      fontSize: '13px',
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0, 0);
    this.screenContent.add(header);

    const callText = this.add.text(10, startY + 20,
      'Caller: "Hi, this is IT. We detected suspicious activity.\\n' +
      'Please share your password so we can secure your account immediately."',
      {
        fontSize: '11px',
        color: '#cccccc',
        wordWrap: { width: this.computerScreen.width - 80 },
        lineSpacing: 4,
      }
    ).setOrigin(0, 0);
    this.screenContent.add(callText);

    const actions = [
      {
        text: 'Share your password to help IT fix it quickly',
        safe: false,
      },
      {
        text: 'Ask for a ticket number and call back via the official IT number',
        safe: true,
      },
      {
        text: 'Click a link they send to reset your password',
        safe: false,
      },
      {
        text: 'Ignore and do nothing',
        safe: false,
      },
    ];

    const zoneY = startY + 92;
    const zoneWidth = (this.computerScreen.width - 90) / 2;
    const safeZone = this.add.rectangle(15, zoneY, zoneWidth, 92, 0x16213e).setOrigin(0, 0).setStrokeStyle(2, 0x4ecca3);
    const riskyZone = this.add.rectangle(30 + zoneWidth, zoneY, zoneWidth, 92, 0x16213e).setOrigin(0, 0).setStrokeStyle(2, 0xe94560);
    this.screenContent.add([safeZone, riskyZone]);
    this.screenContent.add(this.add.text(20, zoneY + 8, `VERIFY (${this.level5State.safePlaced.size}/1)`, { fontSize: '11px', color: '#4ecca3', fontStyle: 'bold' }).setOrigin(0, 0));
    this.screenContent.add(this.add.text(35 + zoneWidth, zoneY + 8, `RISKY (${this.level5State.riskyPlaced.size}/3)`, { fontSize: '11px', color: '#e94560', fontStyle: 'bold' }).setOrigin(0, 0));
    this.renderPlacedLabels(
      actions.map((action) => action.text),
      this.level5State.safePlaced,
      this.level5State.riskyPlaced,
      20,
      35 + zoneWidth,
      zoneY + 25,
      { maxItemsPerBin: 3, maxLabelLength: 16 }
    );

    const createDraggableCard = (index: number, y: number): void => {
      const card = this.add.text(18, y, actions[index].text, {
        fontSize: '10px',
        color: '#ffffff',
        backgroundColor: '#0f3460',
        padding: { x: 10, y: 7 },
        wordWrap: { width: this.computerScreen.width - 80 },
      }).setOrigin(0, 0).setInteractive({ draggable: true, useHandCursor: true });
      card.setData('homeX', 18);
      card.setData('homeY', y);
      this.input.setDraggable(card);
      card.on('drag', (pointer: Phaser.Input.Pointer) => {
        const local = this.toContentCoords(pointer.x, pointer.y);
        card.setPosition(local.x, local.y);
      });
      card.on('dragend', (pointer: Phaser.Input.Pointer) => {
        const inSafe = safeZone.getBounds().contains(pointer.x, pointer.y);
        const inRisky = riskyZone.getBounds().contains(pointer.x, pointer.y);
        if (inSafe) {
          this.level5State.safePlaced.add(index);
          this.level5State.riskyPlaced.delete(index);
          this.level5State.resolved = this.level5State.safePlaced.size + this.level5State.riskyPlaced.size === 4;
          this.createLevelContent();
          return;
        }
        if (inRisky) {
          this.level5State.riskyPlaced.add(index);
          this.level5State.safePlaced.delete(index);
          this.level5State.resolved = this.level5State.safePlaced.size + this.level5State.riskyPlaced.size === 4;
          this.createLevelContent();
          return;
        }
        card.setPosition(card.getData('homeX'), card.getData('homeY'));
      });
      this.screenContent.add(card);
    };

    let cardY = zoneY + 104;
    actions.forEach((_, idx) => {
      const placed = this.level5State.safePlaced.has(idx) || this.level5State.riskyPlaced.has(idx);
      if (!placed) {
        createDraggableCard(idx, cardY);
        cardY += 34;
      }
    });

    const submitButton = this.add.text(
      this.computerScreen.width / 2 - 20,
      zoneY + 250,
      'Check Answer',
      {
        fontSize: '14px',
        color: this.level5State.resolved ? '#ffffff' : '#666666',
        backgroundColor: this.level5State.resolved ? '#4ecca3' : '#2a3a4a',
        padding: { x: 24, y: 10 },
        fontStyle: 'bold',
      }
    ).setOrigin(0.5, 0).setInteractive({ useHandCursor: this.level5State.resolved });

    if (this.level5State.resolved) {
      submitButton.on('pointerover', () => submitButton.setScale(1.05));
      submitButton.on('pointerout', () => submitButton.setScale(1));
      submitButton.on('pointerup', () => this.checkLevel5Results(actions));
    }

    this.screenContent.add(submitButton);
  }

  private checkLevel5Results(actions: { text: string; safe: boolean }[]): void {
    let allCorrect = true;
    actions.forEach((action, index) => {
      const inSafe = this.level5State.safePlaced.has(index);
      const inRisky = this.level5State.riskyPlaced.has(index);
      if ((action.safe && !inSafe) || (!action.safe && !inRisky)) {
        allCorrect = false;
      }
    });

    if (allCorrect) {
      AudioManager.playSuccess();
      this.showFeedback('✓ Well Done!', 'Great decision process: verify identity and avoid rushed credential sharing.', true);
      this.time.delayedCall(2500, () => this.completeLevel());
    } else {
      AudioManager.playFailure();
      this.showFeedback('Try Again', 'Some responses are misclassified. Think about which actions would verify the caller safely.', false);
      this.level5State.safePlaced = new Set<number>();
      this.level5State.riskyPlaced = new Set<number>();
      this.level5State.resolved = false;
      this.time.delayedCall(2500, () => this.createLevelContent());
    }
  }

  private createLevel6Content(): void {
    const startY = 85;

    if (this.level6State.step === 'url') {
      this.createSecureBrowsingStep(startY);
    } else {
      this.createTwoFactorStep(startY);
    }
  }

  private createSecureBrowsingStep(startY: number): void {
    const title = this.add.text(10, startY, 'Secure Browsing Check', {
      fontSize: '13px',
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0, 0);
    this.screenContent.add(title);

    const prompt = this.add.text(10, startY + 18, 'Sort URLs into SAFE and SUSPICIOUS', {
      fontSize: '11px',
      color: '#cccccc',
    }).setOrigin(0, 0);
    this.screenContent.add(prompt);

    const urls = [
      { text: 'http://secure-bank-login.com', safe: false },
      { text: 'https://secure-bank-login.com', safe: false },
      { text: 'https://bank.example.com', safe: true },
      { text: 'https://bank.example.com.verify-login.ru', safe: false },
    ];

    const zoneY = startY + 42;
    const zoneWidth = (this.computerScreen.width - 90) / 2;
    const safeZone = this.add.rectangle(15, zoneY, zoneWidth, 88, 0x16213e).setOrigin(0, 0).setStrokeStyle(2, 0x4ecca3);
    const riskyZone = this.add.rectangle(30 + zoneWidth, zoneY, zoneWidth, 88, 0x16213e).setOrigin(0, 0).setStrokeStyle(2, 0xe94560);
    this.screenContent.add([safeZone, riskyZone]);
    this.screenContent.add(this.add.text(20, zoneY + 8, `SAFE (${this.level6State.urlSafePlaced.size}/1)`, { fontSize: '11px', color: '#4ecca3', fontStyle: 'bold' }).setOrigin(0, 0));
    this.screenContent.add(this.add.text(35 + zoneWidth, zoneY + 8, `SUSPICIOUS (${this.level6State.urlRiskyPlaced.size}/3)`, { fontSize: '11px', color: '#e94560', fontStyle: 'bold' }).setOrigin(0, 0));
    this.renderPlacedLabels(
      urls.map((url) => url.text),
      this.level6State.urlSafePlaced,
      this.level6State.urlRiskyPlaced,
      20,
      35 + zoneWidth,
      zoneY + 24,
      { maxItemsPerBin: 3, maxLabelLength: 20 }
    );

    const createDraggableUrl = (index: number, y: number): void => {
      const url = urls[index];
      const card = this.add.text(20, y, url.text, {
        fontSize: '10px',
        color: '#ffffff',
        fontFamily: 'monospace',
        backgroundColor: '#0f3460',
        padding: { x: 8, y: 6 },
      }).setOrigin(0, 0).setInteractive({ draggable: true, useHandCursor: true });
      card.setData('homeX', 20);
      card.setData('homeY', y);
      this.input.setDraggable(card);
      card.on('drag', (pointer: Phaser.Input.Pointer) => {
        const local = this.toContentCoords(pointer.x, pointer.y);
        card.setPosition(local.x, local.y);
      });
      card.on('dragend', (pointer: Phaser.Input.Pointer) => {
        const inSafe = safeZone.getBounds().contains(pointer.x, pointer.y);
        const inRisky = riskyZone.getBounds().contains(pointer.x, pointer.y);
        if (inSafe) {
          this.level6State.urlSafePlaced.add(index);
          this.level6State.urlRiskyPlaced.delete(index);
          this.level6State.urlResolved = this.level6State.urlSafePlaced.size + this.level6State.urlRiskyPlaced.size === 4;
          this.createLevelContent();
          return;
        }
        if (inRisky) {
          this.level6State.urlRiskyPlaced.add(index);
          this.level6State.urlSafePlaced.delete(index);
          this.level6State.urlResolved = this.level6State.urlSafePlaced.size + this.level6State.urlRiskyPlaced.size === 4;
          this.createLevelContent();
          return;
        }
        card.setPosition(card.getData('homeX'), card.getData('homeY'));
      });
      this.screenContent.add(card);
    };

    let cardY = zoneY + 100;
    urls.forEach((_, idx) => {
      const placed = this.level6State.urlSafePlaced.has(idx) || this.level6State.urlRiskyPlaced.has(idx);
      if (!placed) {
        createDraggableUrl(idx, cardY);
        cardY += 33;
      }
    });

    const checkButton = this.add.text(
      this.computerScreen.width / 2 - 20,
      zoneY + 236,
      'Check Answer',
      {
        fontSize: '14px',
        color: this.level6State.urlResolved ? '#ffffff' : '#666666',
        backgroundColor: this.level6State.urlResolved ? '#4ecca3' : '#2a3a4a',
        padding: { x: 24, y: 10 },
        fontStyle: 'bold',
      }
    ).setOrigin(0.5, 0).setInteractive({ useHandCursor: this.level6State.urlResolved });

    if (this.level6State.urlResolved) {
      checkButton.on('pointerover', () => checkButton.setScale(1.05));
      checkButton.on('pointerout', () => checkButton.setScale(1));
      checkButton.on('pointerup', () => this.checkLevel6UrlResults(urls));
    }

    this.screenContent.add(checkButton);
  }

  private checkLevel6UrlResults(urls: { text: string; safe: boolean }[]): void {
    let allCorrect = true;
    urls.forEach((url, index) => {
      const inSafe = this.level6State.urlSafePlaced.has(index);
      const inRisky = this.level6State.urlRiskyPlaced.has(index);
      if ((url.safe && !inSafe) || (!url.safe && !inRisky)) {
        allCorrect = false;
      }
    });

    if (allCorrect) {
      AudioManager.playSuccess();
      this.showFeedback('✓ Correct!', 'Great URL identification! Now let\'s set up 2FA.', true);
      this.time.delayedCall(2500, () => {
        this.level6State.step = '2fa';
        this.createLevelContent();
      });
    } else {
      AudioManager.playFailure();
      this.showFeedback('Try Again', 'Some URLs are miscategorized. Look for suspicious domains and missing HTTPS.', false);
      this.level6State.urlSafePlaced = new Set<number>();
      this.level6State.urlRiskyPlaced = new Set<number>();
      this.level6State.urlResolved = false;
      this.time.delayedCall(2500, () => this.createLevelContent());
    }
  }

  private createTwoFactorStep(startY: number): void {
    const title = this.add.text(10, startY, 'Enable Two-Factor Authentication', {
      fontSize: '13px',
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0, 0);
    this.screenContent.add(title);

    const prompt = this.add.text(10, startY + 18, 'Sort 2FA methods into STRONG and WEAK', {
      fontSize: '11px',
      color: '#cccccc',
    }).setOrigin(0, 0);
    this.screenContent.add(prompt);

    const methods = [
      { text: 'SMS code to your phone number', safe: false },
      { text: 'Authenticator app (TOTP)', safe: true },
      { text: 'Email a verification link', safe: false },
      { text: 'Security questions only', safe: false },
    ];

    const zoneY = startY + 42;
    const zoneWidth = (this.computerScreen.width - 90) / 2;
    const strongZone = this.add.rectangle(15, zoneY, zoneWidth, 85, 0x16213e).setOrigin(0, 0).setStrokeStyle(2, 0x4ecca3);
    const weakZone = this.add.rectangle(30 + zoneWidth, zoneY, zoneWidth, 85, 0x16213e).setOrigin(0, 0).setStrokeStyle(2, 0xe94560);
    this.screenContent.add([strongZone, weakZone]);
    this.screenContent.add(this.add.text(20, zoneY + 8, `STRONG (${this.level6State.twofaSafePlaced.size}/1)`, { fontSize: '11px', color: '#4ecca3', fontStyle: 'bold' }).setOrigin(0, 0));
    this.screenContent.add(this.add.text(35 + zoneWidth, zoneY + 8, `WEAK (${this.level6State.twofaRiskyPlaced.size}/3)`, { fontSize: '11px', color: '#e94560', fontStyle: 'bold' }).setOrigin(0, 0));
    this.renderPlacedLabels(
      methods.map((method) => method.text),
      this.level6State.twofaSafePlaced,
      this.level6State.twofaRiskyPlaced,
      20,
      35 + zoneWidth,
      zoneY + 24,
      { maxItemsPerBin: 3, maxLabelLength: 18 }
    );

    const createDraggableMethod = (index: number, y: number): void => {
      const method = methods[index];
      const card = this.add.text(20, y, method.text, {
        fontSize: '10px',
        color: '#ffffff',
        backgroundColor: '#0f3460',
        padding: { x: 8, y: 6 },
        wordWrap: { width: this.computerScreen.width - 80 },
      }).setOrigin(0, 0).setInteractive({ draggable: true, useHandCursor: true });
      card.setData('homeX', 20);
      card.setData('homeY', y);
      this.input.setDraggable(card);
      card.on('drag', (pointer: Phaser.Input.Pointer) => {
        const local = this.toContentCoords(pointer.x, pointer.y);
        card.setPosition(local.x, local.y);
      });
      card.on('dragend', (pointer: Phaser.Input.Pointer) => {
        const inStrong = strongZone.getBounds().contains(pointer.x, pointer.y);
        const inWeak = weakZone.getBounds().contains(pointer.x, pointer.y);
        if (inStrong) {
          this.level6State.twofaSafePlaced.add(index);
          this.level6State.twofaRiskyPlaced.delete(index);
          this.level6State.twofaResolved = this.level6State.twofaSafePlaced.size + this.level6State.twofaRiskyPlaced.size === 4;
          this.createLevelContent();
          return;
        }
        if (inWeak) {
          this.level6State.twofaRiskyPlaced.add(index);
          this.level6State.twofaSafePlaced.delete(index);
          this.level6State.twofaResolved = this.level6State.twofaSafePlaced.size + this.level6State.twofaRiskyPlaced.size === 4;
          this.createLevelContent();
          return;
        }
        card.setPosition(card.getData('homeX'), card.getData('homeY'));
      });
      this.screenContent.add(card);
    };

    let cardY = zoneY + 95;
    methods.forEach((_, idx) => {
      const placed = this.level6State.twofaSafePlaced.has(idx) || this.level6State.twofaRiskyPlaced.has(idx);
      if (!placed) {
        createDraggableMethod(idx, cardY);
        cardY += 33;
      }
    });

    const sliderY = zoneY + 230;
    const sliderX = 30;
    const sliderWidth = this.computerScreen.width - 120;
    const sliderValueX = sliderX + (this.level6State.hardening / 100) * sliderWidth;
    const hardeningReady = this.level6State.hardening >= 75;

    this.screenContent.add(this.add.text(10, sliderY - 18, 'Security hardening slider', {
      fontSize: '11px',
      color: '#cccccc',
    }).setOrigin(0, 0));
    this.screenContent.add(this.add.rectangle(sliderX, sliderY, sliderWidth, 6, 0x2a3a4a).setOrigin(0, 0.5));
    const fillBar = this.add.rectangle(sliderX, sliderY, sliderValueX - sliderX, 6, 0x4ecca3).setOrigin(0, 0.5);
    this.screenContent.add(fillBar);
    const knob = this.add.circle(sliderValueX, sliderY, 9, 0xe94560).setInteractive({ draggable: true, useHandCursor: true });
    this.input.setDraggable(knob);
    const valueText = this.add.text(sliderX + sliderWidth + 12, sliderY - 8, `${this.level6State.hardening}%`, {
      fontSize: '11px',
      color: hardeningReady ? '#4ecca3' : '#ffa500',
      fontStyle: 'bold',
    }).setOrigin(0, 0);
    knob.on('drag', (pointer: Phaser.Input.Pointer) => {
      const localX = this.toContentCoords(pointer.x, pointer.y).x;
      const clamped = Phaser.Math.Clamp(localX, sliderX, sliderX + sliderWidth);
      knob.x = clamped;
      this.level6State.hardening = Math.round(((clamped - sliderX) / sliderWidth) * 100);
      fillBar.width = clamped - sliderX;
      valueText.setText(`${this.level6State.hardening}%`);
      valueText.setColor(this.level6State.hardening >= 75 ? '#4ecca3' : '#ffa500');
    });
    knob.on('dragend', () => this.createLevelContent());
    this.screenContent.add(knob);
    this.screenContent.add(valueText);

    const checkButton = this.add.text(
      this.computerScreen.width / 2 - 20,
      sliderY + 18,
      'Check Answer',
      {
        fontSize: '14px',
        color: this.level6State.twofaResolved && hardeningReady ? '#ffffff' : '#666666',
        backgroundColor: this.level6State.twofaResolved && hardeningReady ? '#4ecca3' : '#2a3a4a',
        padding: { x: 24, y: 10 },
        fontStyle: 'bold',
      }
    ).setOrigin(0.5, 0).setInteractive({ useHandCursor: this.level6State.twofaResolved && hardeningReady });

    if (this.level6State.twofaResolved && hardeningReady) {
      checkButton.on('pointerover', () => checkButton.setScale(1.05));
      checkButton.on('pointerout', () => checkButton.setScale(1));
      checkButton.on('pointerup', () => this.checkLevel6TwofaResults(methods));
    }

    this.screenContent.add(checkButton);
  }

  private checkLevel6TwofaResults(methods: { text: string; safe: boolean }[]): void {
    let allCorrect = true;
    methods.forEach((method, index) => {
      const inStrong = this.level6State.twofaSafePlaced.has(index);
      const inWeak = this.level6State.twofaRiskyPlaced.has(index);
      if ((method.safe && !inStrong) || (!method.safe && !inWeak)) {
        allCorrect = false;
      }
    });

    if (allCorrect) {
      AudioManager.playSuccess();
      this.showFeedback('✓ Secured!', 'Great choices: strongest 2FA method enabled with high security posture.', true);
      this.time.delayedCall(2500, () => this.completeLevel());
    } else {
      AudioManager.playFailure();
      this.showFeedback('Try Again', 'Some 2FA methods are miscategorized. Authenticator apps are the strongest option.', false);
      this.level6State.twofaSafePlaced = new Set<number>();
      this.level6State.twofaRiskyPlaced = new Set<number>();
      this.level6State.twofaResolved = false;
      this.time.delayedCall(2500, () => this.createLevelContent());
    }
  }

  private createNetworkList(startY: number): void {
    const scanningText = this.add.text(10, startY, '⟳ Scanning for networks...', {
      fontSize: '12px',
      color: '#888888',
      fontStyle: 'italic',
    }).setOrigin(0, 0);
    this.screenContent.add(scanningText);

    const networks = [
      {
        name: 'Free_Public_WiFi',
        signal: 4,
        security: 'Open',
        safe: false,
        description: 'Unsecured public network',
      },
      {
        name: 'CoffeeShop_Guest',
        signal: 3,
        security: 'WEP',
        safe: false,
        description: 'Outdated WEP encryption',
      },
      {
        name: 'HomeNetwork_5G',
        signal: 4,
        security: 'WPA3',
        safe: true,
        description: 'Secure home network',
      },
      {
        name: 'Airport_Free_WiFi',
        signal: 2,
        security: 'Open',
        safe: false,
        description: 'Public unsecured',
      },
      {
        name: 'xfinitywifi',
        signal: 3,
        security: 'Open',
        safe: false,
        description: 'Public hotspot',
      },
    ];

    networks.forEach((network, index) => {
      const y = startY + 25 + index * 68;

      const networkBox = this.add.rectangle(10, y, this.computerScreen.width - 60, 65, 0x1a2332)
        .setOrigin(0, 0)
        .setStrokeStyle(2, 0x2a3a4a)
        .setInteractive({ useHandCursor: true });

      // Network name
      const nameText = this.add.text(20, y + 10, network.name, {
        fontSize: '15px',
        color: '#ffffff',
        fontStyle: 'bold',
      }).setOrigin(0, 0);

      // Signal strength indicator
      const signalBars = [];
      const signalStartX = this.computerScreen.width - 95;
      for (let i = 0; i < 4; i++) {
        const barHeight = 6 + i * 3;
        const bar = this.add.rectangle(
          signalStartX + i * 10,
          y + 20,
          6,
          barHeight,
          i < network.signal ? 0xffffff : 0x3a3a3a
        ).setOrigin(0, 0.5);
        signalBars.push(bar);
      }

      // Security type
      const securityColor = network.security === 'Open' ? 0xe94560 :
                           network.security === 'WEP' ? 0xffa500 : 0x4ecca3;
      const lockIcon = network.security === 'Open' ? '🔓' : '🔒';

      const securityText = this.add.text(20, y + 35, `${lockIcon} ${network.security}`, {
        fontSize: '11px',
        color: `#${securityColor.toString(16).padStart(6, '0')}`,
      }).setOrigin(0, 0);

      const descText = this.add.text(20, y + 50, network.description, {
        fontSize: '10px',
        color: '#888888',
      }).setOrigin(0, 0);

      networkBox.on('pointerover', () => networkBox.setStrokeStyle(2, 0x4ecca3));
      networkBox.on('pointerout', () => networkBox.setStrokeStyle(2, 0x2a3a4a));
      networkBox.on('pointerup', () => this.selectNetwork(index));

      this.screenContent.add([networkBox, nameText, securityText, descText, ...signalBars]);
    });
  }

  private createNetworkDetail(startY: number): void {
    const networks = [
      {
        name: 'Free_Public_WiFi',
        signal: 4,
        security: 'Open',
        safe: false,
        warnings: [
          '⚠️ This network does not use encryption',
          '⚠️ Your data can be intercepted by others',
          '⚠️ Not recommended for sensitive activities',
        ],
        info: 'Public networks without encryption allow anyone nearby to see your internet traffic, including passwords and personal data.',
      },
      {
        name: 'CoffeeShop_Guest',
        signal: 3,
        security: 'WEP',
        safe: false,
        warnings: [
          '⚠️ WEP encryption is outdated (from 1997)',
          '⚠️ Can be cracked in seconds with tools',
          '⚠️ Provides minimal security',
        ],
        info: 'WEP (Wired Equivalent Privacy) has known vulnerabilities and should not be trusted. Modern tools can break it within minutes.',
      },
      {
        name: 'HomeNetwork_5G',
        signal: 4,
        security: 'WPA3',
        safe: true,
        warnings: [
          '✓ WPA3 is the latest security standard',
          '✓ Strong encryption protects your data',
          '✓ Safe for sensitive activities',
        ],
        info: 'WPA3 provides robust encryption and protection against common attacks. This is the most secure option currently available.',
      },
      {
        name: 'Airport_Free_WiFi',
        signal: 2,
        security: 'Open',
        safe: false,
        warnings: [
          '⚠️ Completely unsecured network',
          '⚠️ High risk in public places',
          '⚠️ Easy target for hackers',
        ],
        info: 'Public airport WiFi is a common target for attackers. Anyone can set up a fake network with a similar name to steal data.',
      },
      {
        name: 'xfinitywifi',
        signal: 3,
        security: 'Open',
        safe: false,
        warnings: [
          '⚠️ Public hotspot - no encryption',
          '⚠️ Shared by many users',
          '⚠️ Not suitable for private browsing',
        ],
        info: 'While legitimate, these public hotspots transmit data unencrypted. Use a VPN if you must connect to such networks.',
      },
    ];

    const network = networks[this.level3State.selectedNetwork];

    // Back button
    const backButton = this.add.text(10, startY, '← Back', {
      fontSize: '12px',
      color: '#4ecca3',
      fontStyle: 'bold',
    }).setOrigin(0, 0).setInteractive({ useHandCursor: true });

    backButton.on('pointerover', () => backButton.setScale(1.05));
    backButton.on('pointerout', () => backButton.setScale(1));
    backButton.on('pointerup', () => this.deselectNetwork());

    this.screenContent.add(backButton);

    // Network info
    const networkTitle = this.add.text(10, startY + 30, network.name, {
      fontSize: '18px',
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0, 0);
    this.screenContent.add(networkTitle);

    const securityLabel = this.add.text(10, startY + 60, `Security: ${network.security}`, {
      fontSize: '14px',
      color: network.safe ? '#4ecca3' : '#e94560',
    }).setOrigin(0, 0);
    this.screenContent.add(securityLabel);

    // Warnings/Benefits
    const warningsTitle = this.add.text(10, startY + 90, 'Security Information:', {
      fontSize: '13px',
      color: '#cccccc',
      fontStyle: 'bold',
    }).setOrigin(0, 0);
    this.screenContent.add(warningsTitle);

    let warningY = startY + 110;
    network.warnings.forEach(warning => {
      const warningText = this.add.text(20, warningY, warning, {
        fontSize: '11px',
        color: warning.startsWith('✓') ? '#4ecca3' : '#ffa500',
      }).setOrigin(0, 0);
      this.screenContent.add(warningText);
      warningY += 20;
    });

    // Information
    const infoBox = this.add.rectangle(10, startY + 190, this.computerScreen.width - 60, 85, 0x16213e)
      .setOrigin(0, 0);
    this.screenContent.add(infoBox);

    const infoTitle = this.add.text(20, startY + 198, 'Why this matters:', {
      fontSize: '11px',
      color: '#888888',
      fontStyle: 'bold',
    }).setOrigin(0, 0);

    const infoText = this.add.text(20, startY + 215, network.info, {
      fontSize: '10px',
      color: '#cccccc',
      wordWrap: { width: this.computerScreen.width - 100 },
      lineSpacing: 3,
    }).setOrigin(0, 0);

    this.screenContent.add([infoTitle, infoText]);

    // Connect button
    const connectButton = this.add.text(
      this.computerScreen.width / 2 - 20,
      startY + 300,
      'Connect to this network',
      {
        fontSize: '14px',
        color: '#ffffff',
        backgroundColor: network.safe ? '#4ecca3' : '#e94560',
        padding: { x: 25, y: 12 },
        fontStyle: 'bold',
      }
    ).setOrigin(0.5, 0).setInteractive({ useHandCursor: true });

    connectButton.on('pointerover', () => connectButton.setScale(1.05));
    connectButton.on('pointerout', () => connectButton.setScale(1));
    connectButton.on('pointerup', () => this.connectToNetwork(this.level3State.selectedNetwork, network.safe));

    this.screenContent.add(connectButton);
  }

  private createConnectingScreen(startY: number): void {
    const connectingText = this.add.text(
      this.computerScreen.width / 2 - 20,
      startY + 180,
      'Connecting...',
      {
        fontSize: '20px',
        color: '#4ecca3',
        fontStyle: 'bold',
      }
    ).setOrigin(0.5, 0);
    this.screenContent.add(connectingText);

    // Animated dots
    const dotsText = this.add.text(
      this.computerScreen.width / 2 - 20,
      startY + 220,
      '...',
      {
        fontSize: '24px',
        color: '#4ecca3',
      }
    ).setOrigin(0.5, 0);
    this.screenContent.add(dotsText);

    // Animate the dots
    this.tweens.add({
      targets: dotsText,
      alpha: 0.3,
      duration: 500,
      yoyo: true,
      repeat: -1,
    });
  }

  private selectNetwork(index: number): void {
    this.level3State.selectedNetwork = index;
    this.level3State.plugConnected = false;
    this.createLevelContent();
  }

  private deselectNetwork(): void {
    this.level3State.selectedNetwork = -1;
    this.level3State.plugConnected = false;
    this.createLevelContent();
  }

  private connectToNetwork(index: number, isSafe: boolean): void {
    this.level3State.isConnecting = true;
    this.createLevelContent();

    // Simulate connection delay
    this.time.delayedCall(1500, () => {
      this.level3State.isConnecting = false;

      if (isSafe) {
        AudioManager.playSuccess();

        this.showFeedback(
          '✓ Connected Successfully!',
          'Excellent choice! WPA3 encryption will protect your data from eavesdropping and ensure secure communication.',
          true
        );
        this.time.delayedCall(2500, () => this.completeLevel());
      } else {
        AudioManager.playFailure();
        const reasons = [
          'Open networks have no encryption. Your data is visible to anyone nearby.',
          'WEP encryption is outdated and can be cracked in seconds. Not secure.',
          'Public networks are prime targets for hackers. Always use VPN on such networks.',
          'Public hotspots transmit unencrypted data. Not recommended for sensitive activities.',
        ];

        this.showFeedback(
          '⚠️ Connected - But Not Secure',
          reasons[index] || 'This network does not provide adequate security.',
          false
        );

        // Go back to network list
        this.time.delayedCall(3000, () => {
          this.level3State.selectedNetwork = -1;
          this.createLevelContent();
        });
      }
    });
  }

  private showFeedback(title: string, message: string, isCorrect: boolean): void {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    const boxWidth = 500;
    const boxHeight = 200;

    if (isCorrect) {
      // Show brief success message before completing level
      this.add.rectangle(0, 0, width, height, 0x000000, 0.7)
        .setOrigin(0, 0)
        .setDepth(100);

      this.add.rectangle(width / 2, height / 2, boxWidth, boxHeight, 0x16213e)
        .setStrokeStyle(3, 0x4ecca3)
        .setDepth(101);

      this.add.text(width / 2, height / 2 - 50, title, {
        fontSize: '28px',
        color: '#4ecca3',
        fontStyle: 'bold',
      }).setOrigin(0.5).setDepth(101);

      this.add.text(width / 2, height / 2 + 10, message, {
        fontSize: '16px',
        color: '#ffffff',
        align: 'center',
        wordWrap: { width: boxWidth - 40 },
      }).setOrigin(0.5).setDepth(101);
    } else {
      // Show error message with ability to try again
      const overlay = this.add.rectangle(0, 0, width, height, 0x000000, 0.7)
        .setOrigin(0, 0)
        .setDepth(100);

      const box = this.add.rectangle(width / 2, height / 2, boxWidth, boxHeight, 0x16213e)
        .setStrokeStyle(3, 0xe94560)
        .setDepth(101);

      const titleText = this.add.text(width / 2, height / 2 - 50, title, {
        fontSize: '28px',
        color: '#e94560',
        fontStyle: 'bold',
      }).setOrigin(0.5).setDepth(101);

      const messageText = this.add.text(width / 2, height / 2 + 10, message, {
        fontSize: '16px',
        color: '#ffffff',
        align: 'center',
        wordWrap: { width: boxWidth - 40 },
      }).setOrigin(0.5).setDepth(101);

      const tryAgainText = this.add.text(width / 2, height / 2 + 70, 'Try again!', {
        fontSize: '14px',
        color: '#888888',
      }).setOrigin(0.5).setDepth(101);

      this.time.delayedCall(2500, () => {
        overlay.destroy();
        box.destroy();
        titleText.destroy();
        messageText.destroy();
        tryAgainText.destroy();
      });
    }
  }

  private completeLevel(): void {
    // Prevent multiple completions from spam clicking
    if (this.levelCompleted) return;
    this.levelCompleted = true;

    // Save level completion to localStorage
    const completedLevelsStr = localStorage.getItem('completedLevels');
    const completedLevels = completedLevelsStr ? JSON.parse(completedLevelsStr) : [];

    if (!completedLevels.includes(this.currentLevel)) {
      completedLevels.push(this.currentLevel);
      localStorage.setItem('completedLevels', JSON.stringify(completedLevels));
    }

    AudioManager.playLevelComplete();

    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    this.add.rectangle(0, 0, width, height, 0x000000, 0.8)
      .setOrigin(0, 0)
      .setDepth(100);

    this.add.rectangle(width / 2, height / 2, 600, 300, 0x16213e)
      .setStrokeStyle(3, 0x4ecca3)
      .setDepth(101);

    this.add.text(width / 2, height / 2 - 80, '🎉 Level Complete!', {
      fontSize: '32px',
      color: '#4ecca3',
      fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(101);

    this.add.text(width / 2, height / 2 - 20, `You've completed ${this.levelConfig?.title}!`, {
      fontSize: '18px',
      color: '#ffffff',
    }).setOrigin(0.5).setDepth(101);

    // Show XP earned
    VisualEffects.showXPGain(width / 2, height / 2 + 10, 50);

    this.add.text(width / 2, height / 2 + 30, 'Now take the quiz to test your knowledge', {
      fontSize: '14px',
      color: '#cccccc',
    }).setOrigin(0.5).setDepth(101);

    const continueButton = this.add.text(width / 2, height / 2 + 70, 'Start Quiz →', {
      fontSize: '20px',
      color: '#e94560',
      fontStyle: 'bold',
      backgroundColor: '#0f3460',
      padding: { x: 30, y: 15 },
    }).setOrigin(0.5).setDepth(101).setInteractive({ useHandCursor: true });

    continueButton.on('pointerover', () => continueButton.setScale(1.1));
    continueButton.on('pointerout', () => continueButton.setScale(1));
    continueButton.on('pointerup', () => {
      AudioManager.playClick();
      this.startQuiz();
    });
  }

  private startQuiz(): void {
    this.scene.start('QuizScene', { levelId: this.currentLevel });
  }

  private createUI(): void {
    const backButton = this.add.text(20, 20, '← Exit', {
      fontSize: '16px',
      color: '#e94560',
      fontStyle: 'bold',
    }).setOrigin(0, 0);

    backButton.setInteractive({ useHandCursor: true });
    backButton.on('pointerover', () => backButton.setScale(1.1));
    backButton.on('pointerout', () => backButton.setScale(1));
    backButton.on('pointerup', () => this.returnToLevelSelect());
  }

  private setupKeyboardControls(): void {
    this.input.keyboard?.on('keydown-ESC', () => {
      this.returnToLevelSelect();
    });
  }

  private returnToLevelSelect(): void {
    this.scene.start('LevelSelectScene');
  }

  private handleResize(gameSize: Phaser.Structs.Size): void {
    // Guard: don't handle resize if scene is no longer active
    if (!this.scene.isActive() || !this.cameras.main) return;

    const width = gameSize.width;
    const height = gameSize.height;

    this.cameras.resize(width, height);
    this.scene.restart({ levelId: this.currentLevel });
  }

  shutdown(): void {
    this.scale.off('resize', this.handleResize, this);
  }
}
