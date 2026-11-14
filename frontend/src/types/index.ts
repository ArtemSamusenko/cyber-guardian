export interface User {
  id: number;
  username: string;
  email: string;
}

export interface Level {
  id: number;
  title: string;
  description: string;
  order_num: number;
}

export interface UserProgress {
  level_id: number;
  is_completed: boolean;
  score: number | null;
  attempts: number;
  time_spent: number;
}

export interface GameState {
  user: User | null;
  currentLevel: number | null;
  isAuthenticated: boolean;
}
