import Phaser from 'phaser';
import { apiClient } from '../api/client';
import { RegisterSchema } from '../api/schemas';

export class RegisterScene extends Phaser.Scene {
  private usernameInput?: HTMLInputElement;
  private emailInput?: HTMLInputElement;
  private passwordInput?: HTMLInputElement;
  private registerButton?: HTMLButtonElement;
  private loginButton?: HTMLButtonElement;
  private errorText?: Phaser.GameObjects.Text;
  private formContainer?: HTMLDivElement;

  constructor() {
    super({ key: 'RegisterScene' });
  }

  create(): void {
    this.createUI();
    this.createForm();
    this.scale.on('resize', this.handleResize, this);
  }

  private createUI(): void {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    this.add.text(width / 2, 80, 'CREATE ACCOUNT', {
      fontSize: '42px',
      color: '#e94560',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    this.add.text(width / 2, 140, 'Join to start learning cybersecurity', {
      fontSize: '18px',
      color: '#ffffff',
    }).setOrigin(0.5);

    this.errorText = this.add.text(width / 2, height - 100, '', {
      fontSize: '16px',
      color: '#e94560',
      backgroundColor: '#16213e',
      padding: { x: 20, y: 10 },
    }).setOrigin(0.5).setVisible(false);
  }

  private createForm(): void {
    this.formContainer = document.createElement('div');
    this.formContainer.style.position = 'absolute';
    this.formContainer.style.left = '50%';
    this.formContainer.style.top = '50%';
    this.formContainer.style.transform = 'translate(-50%, -50%)';
    this.formContainer.style.display = 'flex';
    this.formContainer.style.flexDirection = 'column';
    this.formContainer.style.gap = '20px';
    this.formContainer.style.width = '400px';
    this.formContainer.style.maxWidth = '90%';

    this.usernameInput = this.createInput('text', 'Username (min 3 characters)');
    this.emailInput = this.createInput('email', 'Email');
    this.passwordInput = this.createInput('password', 'Password (min 8 characters)');

    const buttonContainer = document.createElement('div');
    buttonContainer.style.display = 'flex';
    buttonContainer.style.gap = '10px';
    buttonContainer.style.marginTop = '10px';

    this.registerButton = this.createButton('Create Account', () => this.handleRegister());
    this.registerButton.style.flex = '1';
    this.registerButton.style.backgroundColor = '#e94560';

    this.loginButton = this.createButton('Back to Login', () => this.handleBackToLogin());
    this.loginButton.style.flex = '1';
    this.loginButton.style.backgroundColor = '#0f3460';

    buttonContainer.appendChild(this.registerButton);
    buttonContainer.appendChild(this.loginButton);

    this.formContainer.appendChild(this.usernameInput);
    this.formContainer.appendChild(this.emailInput);
    this.formContainer.appendChild(this.passwordInput);
    this.formContainer.appendChild(buttonContainer);

    document.body.appendChild(this.formContainer);

    this.usernameInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') this.emailInput?.focus();
    });

    this.emailInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') this.passwordInput?.focus();
    });

    this.passwordInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') this.handleRegister();
    });
  }

  private createInput(type: string, placeholder: string): HTMLInputElement {
    const input = document.createElement('input');
    input.type = type;
    input.placeholder = placeholder;
    input.style.padding = '15px';
    input.style.fontSize = '16px';
    input.style.border = '2px solid #0f3460';
    input.style.borderRadius = '5px';
    input.style.backgroundColor = '#16213e';
    input.style.color = '#ffffff';
    input.style.outline = 'none';

    input.addEventListener('focus', () => {
      input.style.borderColor = '#e94560';
    });

    input.addEventListener('blur', () => {
      input.style.borderColor = '#0f3460';
    });

    return input;
  }

  private createButton(text: string, onClick: () => void): HTMLButtonElement {
    const button = document.createElement('button');
    button.textContent = text;
    button.style.padding = '15px';
    button.style.fontSize = '16px';
    button.style.border = 'none';
    button.style.borderRadius = '5px';
    button.style.color = '#ffffff';
    button.style.cursor = 'pointer';
    button.style.fontWeight = 'bold';
    button.style.transition = 'opacity 0.2s';

    button.addEventListener('mouseenter', () => {
      button.style.opacity = '0.8';
    });

    button.addEventListener('mouseleave', () => {
      button.style.opacity = '1';
    });

    button.addEventListener('click', onClick);

    return button;
  }

  private async handleRegister(): Promise<void> {
    const username = this.usernameInput?.value.trim() || '';
    const email = this.emailInput?.value.trim() || '';
    const password = this.passwordInput?.value || '';

    try {
      const result = RegisterSchema.safeParse({ username, email, password });

      if (!result.success) {
        const errors = result.error.errors.map(e => e.message).join(', ');
        this.showError(`Invalid input: ${errors}`);
        return;
      }

      this.setButtonsEnabled(false);
      this.showError('Creating account...');

      await apiClient.register(username, email, password);

      this.showError('Account created! Logging in...');
      await apiClient.login(username, password);

      this.cleanupForm();
      this.scene.start('LevelSelectScene');
    } catch (error) {
      this.showError(error instanceof Error ? error.message : 'Registration failed');
      this.setButtonsEnabled(true);
    }
  }

  private handleBackToLogin(): void {
    this.cleanupForm();
    this.scene.start('LoginScene');
  }

  private showError(message: string): void {
    if (this.errorText) {
      this.errorText.setText(message);
      this.errorText.setVisible(true);
    }
  }

  private setButtonsEnabled(enabled: boolean): void {
    if (this.registerButton) this.registerButton.disabled = !enabled;
    if (this.loginButton) this.loginButton.disabled = !enabled;
    if (this.usernameInput) this.usernameInput.disabled = !enabled;
    if (this.emailInput) this.emailInput.disabled = !enabled;
    if (this.passwordInput) this.passwordInput.disabled = !enabled;
  }

  private handleResize(): void {
    // Guard: don't handle resize if scene is no longer active
    if (!this.scene.isActive() || !this.cameras.main) return;

    this.children.removeAll();
    this.createUI();
  }

  private cleanupForm(): void {
    if (this.formContainer && this.formContainer.parentNode) {
      this.formContainer.parentNode.removeChild(this.formContainer);
    }
  }

  shutdown(): void {
    this.scale.off('resize', this.handleResize, this);
    this.cleanupForm();
  }

  destroy(): void {
    this.cleanupForm();
  }
}
