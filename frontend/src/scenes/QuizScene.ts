import Phaser from 'phaser';
import { apiClient } from '../api/client';
import { QuizQuestion, QuizResult, StoryProgress, Achievement } from '../api/schemas';
import { AudioManager } from '../audio/AudioManager';
import { VisualEffects } from '../effects/VisualEffects';

export class QuizScene extends Phaser.Scene {
  private currentLevel: number = 1;
  private questions: QuizQuestion[] = [];
  private currentQuestionIndex: number = 0;
  private answers: Record<number, number> = {};
  private startTime: number = 0;
  private computerScreen!: Phaser.GameObjects.Rectangle;
  private screenContent!: Phaser.GameObjects.Container;
  private isLoading: boolean = false;
  private isSubmitting: boolean = false;
  private storyProgress: StoryProgress | null = null;
  private pendingAchievements: Achievement[] = [];

  constructor() {
    super({ key: 'QuizScene' });
  }

  init(data: { levelId: number }): void {
    this.currentLevel = data.levelId || 1;
    this.currentQuestionIndex = 0;
    this.answers = {};
    this.startTime = Date.now();
    this.isLoading = true;
    this.isSubmitting = false;
    this.pendingAchievements = [];
  }

  async create(): Promise<void> {
    AudioManager.init(this);
    VisualEffects.init(this);

    // Load story progress
    try {
      this.storyProgress = await apiClient.getStoryProgress<StoryProgress>();
    } catch (error) {
      console.warn('Failed to load story progress:', error);
    }

    this.createDeskView();
    this.createComputerScreen();
    this.createUI();
    this.setupKeyboardControls();

    await this.loadQuestions();

    this.scale.on('resize', this.handleResize, this);
  }

  private async loadQuestions(): Promise<void> {
    try {
      this.showLoadingMessage('Loading quiz questions...');
      this.questions = await apiClient.getQuizQuestions<QuizQuestion[]>(this.currentLevel);
      this.isLoading = false;
      this.displayCurrentQuestion();
    } catch (error) {
      this.isLoading = false;
      const errorMessage = error instanceof Error ? error.message : 'Failed to load quiz';

      if (errorMessage.includes('Session expired') || errorMessage.includes('login again')) {
        this.showSessionExpiredError();
      } else {
        this.showErrorMessage(errorMessage);
      }
    }
  }

  private createDeskView(): void {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    this.add.rectangle(0, 0, width, height, 0x1a1a2e).setOrigin(0, 0);

    const deskHeight = height * 0.3;
    this.add.rectangle(0, height - deskHeight, width, deskHeight, 0x3d2817).setOrigin(0, 0);
    this.add.rectangle(0, height - deskHeight, width, 4, 0x5c3d2e).setOrigin(0, 0);

    const keyboardWidth = 400;
    const keyboardHeight = 120;
    const keyboardX = width / 2;
    const keyboardY = height - deskHeight / 2 + 20;

    this.add.rectangle(keyboardX, keyboardY, keyboardWidth, keyboardHeight, 0x2a2a2a)
      .setStrokeStyle(2, 0x1a1a1a);

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

    const mouseX = keyboardX + keyboardWidth / 2 + 60;
    this.add.ellipse(mouseX, keyboardY, 40, 60, 0x2a2a2a)
      .setStrokeStyle(2, 0x1a1a1a);
  }

  private createComputerScreen(): void {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    // Make screen size more responsive - use more of the available space
    const screenWidth = Math.min(900, width * 0.7);
    const screenHeight = Math.min(600, height * 0.65);
    const screenX = width / 2;
    const screenY = height * 0.32;

    this.add.rectangle(screenX, screenY, screenWidth + 20, screenHeight + 20, 0x1a1a1a)
      .setStrokeStyle(3, 0x0a0a0a);

    this.computerScreen = this.add.rectangle(screenX, screenY, screenWidth, screenHeight, 0x0d1b2a)
      .setStrokeStyle(1, 0x1e3a5f);

    this.screenContent = this.add.container(screenX - screenWidth / 2 + 20, screenY - screenHeight / 2 + 20);

    const standWidth = 80;
    const standHeight = 40;
    this.add.rectangle(screenX, screenY + screenHeight / 2 + 30, standWidth, standHeight, 0x2a2a2a);
    this.add.rectangle(screenX, screenY + screenHeight / 2 + 50, standWidth * 2, 10, 0x1a1a1a);
  }

  private showLoadingMessage(message: string): void {
    this.screenContent.removeAll(true);

    const contentWidth = this.computerScreen.width - 40;
    const contentHeight = this.computerScreen.height - 40;

    const loadingText = this.add.text(
      contentWidth / 2,
      contentHeight / 2,
      message,
      {
        fontSize: '18px',
        color: '#e94560',
        align: 'center',
      }
    ).setOrigin(0.5);

    this.screenContent.add(loadingText);
    this.fitScreenContentToViewport();
  }

  private showSessionExpiredError(): void {
    this.screenContent.removeAll(true);

    const contentWidth = this.computerScreen.width - 40;
    const contentHeight = this.computerScreen.height - 40;

    const errorText = this.add.text(
      contentWidth / 2,
      contentHeight / 2 - 60,
      'Session Expired',
      {
        fontSize: '24px',
        color: '#e94560',
        fontStyle: 'bold',
      }
    ).setOrigin(0.5);

    const messageText = this.add.text(
      contentWidth / 2,
      contentHeight / 2 - 10,
      'Your session has expired.\nPlease login again to continue.',
      {
        fontSize: '16px',
        color: '#ffffff',
        align: 'center',
        wordWrap: { width: contentWidth - 40 },
      }
    ).setOrigin(0.5);

    const loginButton = this.add.text(
      contentWidth / 2,
      contentHeight / 2 + 50,
      'Go to Login',
      {
        fontSize: '16px',
        color: '#e94560',
        backgroundColor: '#0f3460',
        padding: { x: 20, y: 10 },
      }
    ).setOrigin(0.5).setInteractive({ useHandCursor: true });

    loginButton.on('pointerover', () => loginButton.setScale(1.1));
    loginButton.on('pointerout', () => loginButton.setScale(1));
    loginButton.on('pointerup', () => this.scene.start('LoginScene'));

    this.screenContent.add([errorText, messageText, loginButton]);
    this.fitScreenContentToViewport();
  }

  private showErrorMessage(message: string): void {
    this.screenContent.removeAll(true);

    const contentWidth = this.computerScreen.width - 40;
    const contentHeight = this.computerScreen.height - 40;

    const errorText = this.add.text(
      contentWidth / 2,
      contentHeight / 2 - 60,
      'Error',
      {
        fontSize: '24px',
        color: '#e94560',
        fontStyle: 'bold',
      }
    ).setOrigin(0.5);

    const messageText = this.add.text(
      contentWidth / 2,
      contentHeight / 2 - 10,
      message,
      {
        fontSize: '16px',
        color: '#ffffff',
        align: 'center',
        wordWrap: { width: contentWidth - 40 },
      }
    ).setOrigin(0.5);

    const retryButton = this.add.text(
      contentWidth / 2,
      contentHeight / 2 + 50,
      'Return to Level Select',
      {
        fontSize: '16px',
        color: '#e94560',
        backgroundColor: '#0f3460',
        padding: { x: 20, y: 10 },
      }
    ).setOrigin(0.5).setInteractive({ useHandCursor: true });

    retryButton.on('pointerover', () => retryButton.setScale(1.1));
    retryButton.on('pointerout', () => retryButton.setScale(1));
    retryButton.on('pointerup', () => this.returnToLevelSelect());

    this.screenContent.add([errorText, messageText, retryButton]);
    this.fitScreenContentToViewport();
  }

  private displayCurrentQuestion(): void {
    if (this.isLoading || this.questions.length === 0) return;

    this.screenContent.removeAll(true);

    const question = this.questions[this.currentQuestionIndex];
    const contentWidth = this.computerScreen.width - 40;
    const contentHeight = this.computerScreen.height - 40;

    // Title bar
    const titleBar = this.add.rectangle(0, 0, contentWidth, 35, 0x16213e)
      .setOrigin(0, 0);
    this.screenContent.add(titleBar);

    const titleText = this.add.text(10, 8, `Quiz - Question ${this.currentQuestionIndex + 1}/${this.questions.length}`, {
      fontSize: '16px',
      color: '#e94560',
      fontStyle: 'bold',
    }).setOrigin(0, 0);
    this.screenContent.add(titleText);

    // Question text
    const questionText = this.add.text(10, 50, question.question_text, {
      fontSize: '15px',
      color: '#ffffff',
      wordWrap: { width: contentWidth - 20 },
    }).setOrigin(0, 0);
    this.screenContent.add(questionText);

    const options = [
      { label: 'A', text: question.option_a, value: 0 },
      { label: 'B', text: question.option_b, value: 1 },
      { label: 'C', text: question.option_c, value: 2 },
      { label: 'D', text: question.option_d, value: 3 },
    ];

    // Calculate dynamic spacing based on available height
    const questionHeight = questionText.height;
    const availableHeight = contentHeight - 35 - 50 - questionHeight - 70; // Leave space for title, question, and bottom UI
    const optionSpacing = Math.min(58, Math.floor(availableHeight / 4)); // Dynamic spacing, max 58px
    const optionHeight = Math.min(55, optionSpacing - 3); // Option box height

    const startY = 50 + questionHeight + 15;
    const selectedAnswer = this.answers[question.id];

    options.forEach((option, index) => {
      const y = startY + index * optionSpacing;
      const isSelected = selectedAnswer === option.value;

      const optionBox = this.add.rectangle(0, y, contentWidth - 20, optionHeight, 0x1a2332)
        .setOrigin(0, 0)
        .setStrokeStyle(2, isSelected ? 0xe94560 : 0x2a3a4a)
        .setInteractive({ useHandCursor: true });

      const labelText = this.add.text(10, y + 8, option.label, {
        fontSize: '18px',
        color: isSelected ? '#e94560' : '#4ecca3',
        fontStyle: 'bold',
      }).setOrigin(0, 0);

      const optionText = this.add.text(40, y + 8, option.text, {
        fontSize: '13px',
        color: '#ffffff',
        wordWrap: { width: contentWidth - 80 },
      }).setOrigin(0, 0);

      optionBox.on('pointerover', () => {
        if (!isSelected) optionBox.setStrokeStyle(2, 0x4ecca3);
      });
      optionBox.on('pointerout', () => {
        if (!isSelected) optionBox.setStrokeStyle(2, 0x2a3a4a);
      });
      optionBox.on('pointerup', () => {
        AudioManager.playClick();
        this.selectAnswer(question.id, option.value);
      });

      this.screenContent.add([optionBox, labelText, optionText]);
    });

    // Navigation buttons at the bottom - dynamically positioned
    const navY = contentHeight - 50;

    if (this.currentQuestionIndex > 0) {
      const prevButton = this.add.text(10, navY, '← Previous', {
        fontSize: '15px',
        color: '#888888',
        fontStyle: 'bold',
      }).setOrigin(0, 0).setInteractive({ useHandCursor: true });

      prevButton.on('pointerover', () => prevButton.setColor('#e94560'));
      prevButton.on('pointerout', () => prevButton.setColor('#888888'));
      prevButton.on('pointerup', () => this.previousQuestion());

      this.screenContent.add(prevButton);
    }

    if (this.currentQuestionIndex < this.questions.length - 1) {
      const nextButton = this.add.text(contentWidth - 10, navY, 'Next →', {
        fontSize: '15px',
        color: '#888888',
        fontStyle: 'bold',
      }).setOrigin(1, 0).setInteractive({ useHandCursor: true });

      nextButton.on('pointerover', () => nextButton.setColor('#e94560'));
      nextButton.on('pointerout', () => nextButton.setColor('#888888'));
      nextButton.on('pointerup', () => this.nextQuestion());

      this.screenContent.add(nextButton);
    } else {
      const submitButton = this.add.text(contentWidth - 10, navY, 'Submit Quiz', {
        fontSize: '15px',
        color: '#4ecca3',
        backgroundColor: '#0f3460',
        padding: { x: 15, y: 8 },
        fontStyle: 'bold',
      }).setOrigin(1, 0).setInteractive({ useHandCursor: true });

      submitButton.on('pointerover', () => submitButton.setScale(1.05));
      submitButton.on('pointerout', () => submitButton.setScale(1));
      submitButton.on('pointerup', () => this.submitQuiz());

      this.screenContent.add(submitButton);
    }

    // Progress text - positioned at the very bottom
    const progressText = this.add.text(
      contentWidth / 2,
      contentHeight - 20,
      `Answered: ${Object.keys(this.answers).length}/${this.questions.length}`,
      {
        fontSize: '13px',
        color: '#888888',
      }
    ).setOrigin(0.5, 0);
    this.screenContent.add(progressText);
    this.fitScreenContentToViewport();
  }

  private selectAnswer(questionId: number, answer: number): void {
    this.answers[questionId] = answer;
    this.displayCurrentQuestion();
  }

  private previousQuestion(): void {
    if (this.currentQuestionIndex > 0) {
      this.currentQuestionIndex--;
      this.displayCurrentQuestion();
    }
  }

  private nextQuestion(): void {
    if (this.currentQuestionIndex < this.questions.length - 1) {
      this.currentQuestionIndex++;
      this.displayCurrentQuestion();
    }
  }

  private async submitQuiz(): Promise<void> {
    if (this.isSubmitting) return;

    if (Object.keys(this.answers).length < this.questions.length) {
      this.showConfirmSubmit();
      return;
    }

    await this.performSubmit();
  }

  private showConfirmSubmit(): void {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    const overlay = this.add.rectangle(0, 0, width, height, 0x000000, 0.7)
      .setOrigin(0, 0)
      .setDepth(100);

    const box = this.add.rectangle(width / 2, height / 2, 500, 200, 0x16213e)
      .setStrokeStyle(3, 0xe94560)
      .setDepth(101);

    const titleText = this.add.text(width / 2, height / 2 - 50, 'Incomplete Quiz', {
      fontSize: '24px',
      color: '#e94560',
      fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(101);

    const messageText = this.add.text(
      width / 2,
      height / 2 - 10,
      `You have only answered ${Object.keys(this.answers).length} out of ${this.questions.length} questions.\nDo you want to submit anyway?`,
      {
        fontSize: '14px',
        color: '#ffffff',
        align: 'center',
      }
    ).setOrigin(0.5).setDepth(101);

    const submitButton = this.add.text(width / 2 - 70, height / 2 + 50, 'Submit', {
      fontSize: '16px',
      color: '#e94560',
      backgroundColor: '#0f3460',
      padding: { x: 20, y: 10 },
    }).setOrigin(0.5).setDepth(101).setInteractive({ useHandCursor: true });

    const cancelButton = this.add.text(width / 2 + 70, height / 2 + 50, 'Cancel', {
      fontSize: '16px',
      color: '#888888',
      backgroundColor: '#1a2332',
      padding: { x: 20, y: 10 },
    }).setOrigin(0.5).setDepth(101).setInteractive({ useHandCursor: true });

    submitButton.on('pointerover', () => submitButton.setScale(1.1));
    submitButton.on('pointerout', () => submitButton.setScale(1));
    submitButton.on('pointerup', async () => {
      overlay.destroy();
      box.destroy();
      titleText.destroy();
      messageText.destroy();
      submitButton.destroy();
      cancelButton.destroy();
      await this.performSubmit();
    });

    cancelButton.on('pointerover', () => cancelButton.setScale(1.1));
    cancelButton.on('pointerout', () => cancelButton.setScale(1));
    cancelButton.on('pointerup', () => {
      overlay.destroy();
      box.destroy();
      titleText.destroy();
      messageText.destroy();
      submitButton.destroy();
      cancelButton.destroy();
    });
  }

  private async performSubmit(): Promise<void> {
    this.isSubmitting = true;
    this.showLoadingMessage('Submitting quiz...');

    try {
      const timeSpent = Math.floor((Date.now() - this.startTime) / 1000);
      const result = await apiClient.submitQuiz<QuizResult>(
        this.currentLevel,
        this.answers,
        timeSpent
      );
      this.displayResults(result);
    } catch (error) {
      this.isSubmitting = false;
      const errorMessage = error instanceof Error ? error.message : 'Failed to submit quiz';

      if (errorMessage.includes('Session expired') || errorMessage.includes('login again')) {
        this.showSessionExpiredError();
      } else {
        this.showErrorMessage(errorMessage);
      }
    }
  }

  private displayResults(result: QuizResult): void {
    this.screenContent.removeAll(true);

    // Play appropriate sound
    if (result.passed) {
      AudioManager.playSuccess();
    } else {
      AudioManager.playFailure();
    }

    const contentWidth = this.computerScreen.width - 40;
    const contentHeight = this.computerScreen.height - 40;

    const titleBar = this.add.rectangle(0, 0, contentWidth, 35, 0x16213e)
      .setOrigin(0, 0);
    this.screenContent.add(titleBar);

    const titleText = this.add.text(10, 8, 'Quiz Results', {
      fontSize: '16px',
      color: '#e94560',
      fontStyle: 'bold',
    }).setOrigin(0, 0);
    this.screenContent.add(titleText);

    const statusText = this.add.text(
      contentWidth / 2,
      50,
      result.passed ? '🎉 Passed!' : '❌ Not Passed',
      {
        fontSize: '24px',
        color: result.passed ? '#4ecca3' : '#e94560',
        fontStyle: 'bold',
      }
    ).setOrigin(0.5, 0);
    this.screenContent.add(statusText);

    const correctCount = result.feedback.filter(f => f.is_correct).length;
    const scoreText = this.add.text(
      contentWidth / 2,
      85,
      `Score: ${correctCount}/${result.total_questions}`,
      {
        fontSize: '18px',
        color: '#ffffff',
      }
    ).setOrigin(0.5, 0);
    this.screenContent.add(scoreText);

    // Show XP earned if passed
    if (result.passed && result.xp_earned && result.xp_earned > 0) {
      const xpText = this.add.text(
        contentWidth / 2,
        110,
        `+${result.xp_earned} XP`,
        {
          fontSize: '20px',
          color: '#4ecca3',
          fontStyle: 'bold',
        }
      ).setOrigin(0.5, 0);
      this.screenContent.add(xpText);

      // Show floating XP animation
      VisualEffects.showXPGain(
        this.cameras.main.width / 2,
        this.cameras.main.height / 3,
        result.xp_earned
      );

      // Queue achievements to show
      if (result.new_achievements && result.new_achievements.length > 0) {
        this.pendingAchievements = result.new_achievements as Achievement[];
        this.showNextAchievement();
      }
    }

    const feedbackTitle = this.add.text(10, result.passed ? 140 : 120, 'Detailed Feedback:', {
      fontSize: '14px',
      color: '#cccccc',
      fontStyle: 'bold',
    }).setOrigin(0, 0);
    this.screenContent.add(feedbackTitle);

    // Calculate dynamic spacing for feedback items
    const feedbackStartY = result.passed ? 165 : 145;
    const availableHeight = contentHeight - feedbackStartY - 60;
    const feedbackSpacing = Math.min(60, Math.floor(availableHeight / result.feedback.length));

    const feedbackContainer = this.add.container(0, feedbackStartY);
    this.screenContent.add(feedbackContainer);

    result.feedback.forEach((item, index) => {
      const y = index * feedbackSpacing;
      const icon = item.is_correct ? '✓' : '✗';
      const color = item.is_correct ? '#4ecca3' : '#e94560';

      const questionNum = this.add.text(10, y, `${index + 1}. ${icon}`, {
        fontSize: '13px',
        color,
        fontStyle: 'bold',
      }).setOrigin(0, 0);

      const explanation = this.add.text(50, y, item.explanation, {
        fontSize: '11px',
        color: '#cccccc',
        wordWrap: { width: contentWidth - 70 },
      }).setOrigin(0, 0);

      feedbackContainer.add([questionNum, explanation]);
    });

    // Position button at the bottom
    const buttonY = contentHeight - 35;

    // Determine next destination
    const buttonLabel = this.getNextDestinationLabel(result.passed);

    const continueButton = this.add.text(
      contentWidth / 2,
      buttonY,
      buttonLabel,
      {
        fontSize: '15px',
        color: '#e94560',
        backgroundColor: '#0f3460',
        padding: { x: 20, y: 10 },
      }
    ).setOrigin(0.5, 0).setInteractive({ useHandCursor: true });

    continueButton.on('pointerover', () => continueButton.setScale(1.1));
    continueButton.on('pointerout', () => continueButton.setScale(1));
    continueButton.on('pointerup', () => {
      AudioManager.playClick();
      this.handleContinue(result.passed);
    });

    this.screenContent.add(continueButton);
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

  private showNextAchievement(): void {
    if (this.pendingAchievements.length === 0) return;

    const achievement = this.pendingAchievements.shift()!;
    AudioManager.playAchievement();

    VisualEffects.showAchievementPopup(
      achievement.name,
      achievement.description,
      achievement.icon,
      () => {
        // Show next achievement after this one finishes
        this.time.delayedCall(500, () => this.showNextAchievement());
      }
    );
  }

  private getNextDestinationLabel(passed: boolean): string {
    if (!passed) {
      return 'Return to Level Select';
    }

    // Check if we should show completion story
    if (this.currentLevel === 6 && this.storyProgress && !this.storyProgress.completion_seen) {
      return 'Continue';
    }

    return 'Return to Level Select';
  }

  private handleContinue(passed: boolean): void {
    if (!passed) {
      this.returnToLevelSelect();
      return;
    }

    // Check if we should show completion story after level 6
    if (this.currentLevel === 6 && this.storyProgress && !this.storyProgress.completion_seen) {
      this.scene.start('StoryScene', {
        beat: 'completion',
        nextScene: 'LevelSelectScene',
      });
      return;
    }

    this.returnToLevelSelect();
  }

  private createUI(): void {
    const exitButton = this.add.text(20, 20, '← Exit', {
      fontSize: '16px',
      color: '#e94560',
      fontStyle: 'bold',
    }).setOrigin(0, 0);

    exitButton.setInteractive({ useHandCursor: true });
    exitButton.on('pointerover', () => exitButton.setScale(1.1));
    exitButton.on('pointerout', () => exitButton.setScale(1));
    exitButton.on('pointerup', () => this.confirmExit());
  }

  private confirmExit(): void {
    if (this.isSubmitting) return;

    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    const overlay = this.add.rectangle(0, 0, width, height, 0x000000, 0.7)
      .setOrigin(0, 0)
      .setDepth(100);

    const box = this.add.rectangle(width / 2, height / 2, 500, 200, 0x16213e)
      .setStrokeStyle(3, 0xe94560)
      .setDepth(101);

    const titleText = this.add.text(width / 2, height / 2 - 50, 'Exit Quiz?', {
      fontSize: '24px',
      color: '#e94560',
      fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(101);

    const messageText = this.add.text(
      width / 2,
      height / 2 - 10,
      'Your progress will be lost. Are you sure?',
      {
        fontSize: '16px',
        color: '#ffffff',
        align: 'center',
      }
    ).setOrigin(0.5).setDepth(101);

    const exitButton = this.add.text(width / 2 - 70, height / 2 + 50, 'Exit', {
      fontSize: '16px',
      color: '#e94560',
      backgroundColor: '#0f3460',
      padding: { x: 20, y: 10 },
    }).setOrigin(0.5).setDepth(101).setInteractive({ useHandCursor: true });

    const cancelButton = this.add.text(width / 2 + 70, height / 2 + 50, 'Cancel', {
      fontSize: '16px',
      color: '#888888',
      backgroundColor: '#1a2332',
      padding: { x: 20, y: 10 },
    }).setOrigin(0.5).setDepth(101).setInteractive({ useHandCursor: true });

    exitButton.on('pointerover', () => exitButton.setScale(1.1));
    exitButton.on('pointerout', () => exitButton.setScale(1));
    exitButton.on('pointerup', () => this.returnToLevelSelect());

    cancelButton.on('pointerover', () => cancelButton.setScale(1.1));
    cancelButton.on('pointerout', () => cancelButton.setScale(1));
    cancelButton.on('pointerup', () => {
      overlay.destroy();
      box.destroy();
      titleText.destroy();
      messageText.destroy();
      exitButton.destroy();
      cancelButton.destroy();
    });
  }

  private setupKeyboardControls(): void {
    this.input.keyboard?.on('keydown-ESC', () => {
      if (!this.isSubmitting) {
        this.confirmExit();
      }
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
