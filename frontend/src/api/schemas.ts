import { z } from 'zod';

export const RegisterSchema = z.object({
  username: z.string().min(3).max(50),
  email: z.string().email(),
  // bcrypt only uses the first 72 bytes, so the API rejects anything longer
  password: z
    .string()
    .min(8)
    .refine((value) => new TextEncoder().encode(value).length <= 72, {
      message: 'Password must be at most 72 bytes',
    }),
});

export const LoginSchema = z.object({
  username: z.string().min(3),
  password: z.string().min(8),
});

export const AuthResponseSchema = z.object({
  access_token: z.string(),
  token_type: z.string(),
});

export const UserSchema = z.object({
  id: z.number(),
  username: z.string(),
  email: z.string(),
  created_at: z.string(),
});

export const QuizQuestionSchema = z.object({
  id: z.number(),
  level_id: z.number(),
  question_text: z.string(),
  option_a: z.string(),
  option_b: z.string(),
  option_c: z.string(),
  option_d: z.string(),
});

export const QuizSubmissionSchema = z.object({
  level_id: z.number().min(1).max(6),
  answers: z.record(z.string(), z.number().min(0).max(3)),
  time_spent: z.number().min(0),
});

export const QuizFeedbackItemSchema = z.object({
  question_id: z.number(),
  question_text: z.string(),
  selected_answer: z.number(),
  correct_answer: z.number(),
  is_correct: z.boolean(),
  explanation: z.string(),
});

export const AchievementSchema = z.object({
  code: z.string(),
  name: z.string(),
  description: z.string(),
  icon: z.string(),
});

export const QuizResultSchema = z.object({
  score: z.number(),
  total_questions: z.number(),
  passed: z.boolean(),
  feedback: z.array(QuizFeedbackItemSchema),
  xp_earned: z.number().optional().default(0),
  new_achievements: z.array(AchievementSchema).optional().default([]),
});

export const LevelSchema = z.object({
  id: z.number(),
  title: z.string(),
  description: z.string(),
  order_num: z.number(),
});

export const ProgressSchema = z.object({
  user_id: z.number(),
  level_id: z.number(),
  completed: z.boolean(),
  score: z.number(),
  attempts: z.number(),
  time_spent: z.number(),
  completed_at: z.string().nullable(),
  updated_at: z.string(),
});

export const UserStatsSchema = z.object({
  total_xp: z.number(),
  current_streak: z.number(),
  longest_streak: z.number(),
  perfect_scores: z.number(),
  levels_completed: z.number(),
  security_rating: z.string(),
  next_rating_xp: z.number().nullable(),
});

export const UserAchievementSchema = z.object({
  achievement: z.object({
    id: z.number(),
    code: z.string(),
    name: z.string(),
    description: z.string(),
    icon: z.string(),
    xp_reward: z.number(),
    category: z.string(),
  }),
  unlocked_at: z.string(),
});

export const StoryProgressSchema = z.object({
  intro_seen: z.boolean(),
  level1_story_seen: z.boolean(),
  level2_story_seen: z.boolean(),
  level3_story_seen: z.boolean(),
  level4_story_seen: z.boolean(),
  level5_story_seen: z.boolean(),
  completion_seen: z.boolean(),
});

export const StoryProgressResponseSchema = z.object({
  progress: StoryProgressSchema,
  new_achievements: z.array(AchievementSchema).optional().default([]),
});

export const XPGainSchema = z.object({
  amount: z.number(),
  source: z.string(),
  description: z.string(),
  new_total: z.number(),
  new_achievements: z.array(AchievementSchema).optional().default([]),
});

export type RegisterInput = z.infer<typeof RegisterSchema>;
export type LoginInput = z.infer<typeof LoginSchema>;
export type AuthResponse = z.infer<typeof AuthResponseSchema>;
export type User = z.infer<typeof UserSchema>;
export type QuizQuestion = z.infer<typeof QuizQuestionSchema>;
export type QuizSubmission = z.infer<typeof QuizSubmissionSchema>;
export type QuizFeedbackItem = z.infer<typeof QuizFeedbackItemSchema>;
export type QuizResult = z.infer<typeof QuizResultSchema>;
export type Level = z.infer<typeof LevelSchema>;
export type Progress = z.infer<typeof ProgressSchema>;
export type Achievement = z.infer<typeof AchievementSchema>;
export type UserStats = z.infer<typeof UserStatsSchema>;
export type UserAchievement = z.infer<typeof UserAchievementSchema>;
export type StoryProgress = z.infer<typeof StoryProgressSchema>;
export type StoryProgressResponse = z.infer<typeof StoryProgressResponseSchema>;
export type XPGain = z.infer<typeof XPGainSchema>;
