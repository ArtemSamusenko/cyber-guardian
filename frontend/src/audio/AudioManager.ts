import Phaser from 'phaser';

export interface AudioSettings {
  musicEnabled: boolean;
  sfxEnabled: boolean;
  musicVolume: number;
  sfxVolume: number;
}

const STORAGE_KEY = 'audio_settings';

const DEFAULT_SETTINGS: AudioSettings = {
  musicEnabled: true,
  sfxEnabled: true,
  musicVolume: 0.1,
  sfxVolume: 0.7,
};

class AudioManagerClass {
  private scene: Phaser.Scene | null = null;
  private settings: AudioSettings = DEFAULT_SETTINGS;
  private currentMusic: Phaser.Sound.BaseSound | null = null;
  private currentMusicKey: string | null = null;
  private typingSound: Phaser.Sound.BaseSound | null = null;

  constructor() {
    this.loadSettings();
  }

  init(scene: Phaser.Scene): void {
    this.scene = scene;
  }

  private loadSettings(): void {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        this.settings = { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
      }
    } catch {
      this.settings = DEFAULT_SETTINGS;
    }
  }

  saveSettings(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.settings));
    } catch {
      console.warn('Failed to save audio settings');
    }
  }

  getSettings(): AudioSettings {
    return { ...this.settings };
  }

  setMusicEnabled(enabled: boolean): void {
    this.settings.musicEnabled = enabled;
    if (this.currentMusic) {
      if (enabled) {
        this.currentMusic.resume();
      } else {
        this.currentMusic.pause();
      }
    }
    this.saveSettings();
  }

  setSfxEnabled(enabled: boolean): void {
    this.settings.sfxEnabled = enabled;
    this.saveSettings();
  }

  setMusicVolume(volume: number): void {
    this.settings.musicVolume = Math.max(0, Math.min(1, volume));
    if (this.currentMusic && 'setVolume' in this.currentMusic) {
      (this.currentMusic as Phaser.Sound.WebAudioSound).setVolume(this.settings.musicVolume);
    }
    this.saveSettings();
  }

  setSfxVolume(volume: number): void {
    this.settings.sfxVolume = Math.max(0, Math.min(1, volume));
    this.saveSettings();
  }

  playMusic(key: string, config?: Phaser.Types.Sound.SoundConfig): void {
    if (!this.scene || !this.settings.musicEnabled) return;

    // Don't restart if same music is playing
    if (this.currentMusicKey === key && this.currentMusic?.isPlaying) {
      return;
    }

    this.stopMusic();

    // Check if sound exists in cache
    if (!this.scene.cache.audio.exists(key)) {
      console.warn(`Audio '${key}' not found in cache`);
      return;
    }

    this.currentMusic = this.scene.sound.add(key, {
      loop: true,
      volume: this.settings.musicVolume,
      ...config,
    });

    this.currentMusicKey = key;
    this.currentMusic.play();
  }

  stopMusic(): void {
    if (this.currentMusic) {
      this.currentMusic.stop();
      this.currentMusic.destroy();
      this.currentMusic = null;
      this.currentMusicKey = null;
    }
  }

  fadeOutMusic(duration: number = 1000): Promise<void> {
    return new Promise((resolve) => {
      if (!this.currentMusic || !this.scene) {
        resolve();
        return;
      }

      const sound = this.currentMusic as Phaser.Sound.WebAudioSound;
      if ('setVolume' in sound) {
        this.scene.tweens.add({
          targets: { volume: sound.volume },
          volume: 0,
          duration,
          onUpdate: (tween) => {
            const value = Number(tween.getValue() ?? 0);
            sound.setVolume(value);
          },
          onComplete: () => {
            this.stopMusic();
            resolve();
          },
        });
      } else {
        this.stopMusic();
        resolve();
      }
    });
  }

  playSfx(key: string, config?: Phaser.Types.Sound.SoundConfig): void {
    if (!this.scene || !this.settings.sfxEnabled) return;

    // Check if sound exists in cache
    if (!this.scene.cache.audio.exists(key)) {
      console.warn(`Audio '${key}' not found in cache`);
      return;
    }

    this.scene.sound.play(key, {
      volume: this.settings.sfxVolume,
      ...config,
    });
  }

  // Sound effect shortcuts
  playClick(): void {
    this.playSfx('click');
  }

  playHover(): void {
    this.playSfx('hover');
  }

  playSuccess(): void {
    this.playSfx('success');
  }

  playFailure(): void {
    this.playSfx('failure');
  }

  playLevelComplete(): void {
    this.playSfx('level_complete');
  }

  playAchievement(): void {
    this.playSfx('achievement');
  }

  startTyping(): void {
    if (!this.scene || !this.settings.sfxEnabled) return;
    if (this.typingSound?.isPlaying) return; // Already playing

    if (!this.scene.cache.audio.exists('typing')) {
      console.warn("Audio 'typing' not found in cache");
      return;
    }

    this.typingSound = this.scene.sound.add('typing', {
      loop: true,
      volume: this.settings.sfxVolume * 0.5,
    });
    this.typingSound.play();
  }

  stopTyping(): void {
    if (this.typingSound) {
      this.typingSound.stop();
      this.typingSound.destroy();
      this.typingSound = null;
    }
  }

  playTyping(): void {
    // Legacy method - now just starts typing sound
    this.startTyping();
  }

  playAlert(): void {
    this.playSfx('alert');
  }
}

export const AudioManager = new AudioManagerClass();
