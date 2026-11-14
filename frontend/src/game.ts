import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene';
import { MainMenuScene } from './scenes/MainMenuScene';
import { LevelSelectScene } from './scenes/LevelSelectScene';
import { LoginScene } from './scenes/LoginScene';
import { RegisterScene } from './scenes/RegisterScene';
import { GameplayScene } from './scenes/GameplayScene';
import { QuizScene } from './scenes/QuizScene';
import { ProgressScene } from './scenes/ProgressScene';
import { StoryScene } from './scenes/StoryScene';
import { SettingsScene } from './scenes/SettingsScene';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: window.innerWidth,
  height: window.innerHeight,
  parent: 'game-container',
  backgroundColor: '#1a1a2e',
  scale: {
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  render: {
    antialias: true,
    pixelArt: false,
  },
  scene: [BootScene, MainMenuScene, LevelSelectScene, LoginScene, RegisterScene, GameplayScene, QuizScene, ProgressScene, StoryScene, SettingsScene],
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { y: 0, x: 0 },
      debug: false,
    },
  },
};

export default config;
