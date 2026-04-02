export type HabitColor = 'green' | 'cyan' | 'purple' | 'orange';

export interface Habit {
  id: string;
  name: string;
  emoji: string;
  color: HabitColor;
  frequency: 'daily' | 'weekly';
  createdAt: string;
}

export interface Completion {
  habitId: string;
  date: string; // YYYY-MM-DD
}

const HABITS_KEY = 'habitflow_habits';
const COMPLETIONS_KEY = 'habitflow_completions';

export const getHabits = (): Habit[] => {
  const data = localStorage.getItem(HABITS_KEY);
  return data ? JSON.parse(data) : [];
};

export const saveHabits = (habits: Habit[]) => {
  localStorage.setItem(HABITS_KEY, JSON.stringify(habits));
};

export const getCompletions = (): Completion[] => {
  const data = localStorage.getItem(COMPLETIONS_KEY);
  return data ? JSON.parse(data) : [];
};

export const saveCompletions = (completions: Completion[]) => {
  localStorage.setItem(COMPLETIONS_KEY, JSON.stringify(completions));
};

export const getTodayStr = (): string => {
  return new Date().toISOString().split('T')[0];
};

export const isCompletedToday = (habitId: string, completions: Completion[]): boolean => {
  const today = getTodayStr();
  return completions.some(c => c.habitId === habitId && c.date === today);
};

export const toggleCompletion = (habitId: string, completions: Completion[]): Completion[] => {
  const today = getTodayStr();
  const exists = completions.find(c => c.habitId === habitId && c.date === today);
  if (exists) {
    return completions.filter(c => !(c.habitId === habitId && c.date === today));
  }
  return [...completions, { habitId, date: today }];
};

export const getStreak = (habitId: string, completions: Completion[]): number => {
  const habitCompletions = completions
    .filter(c => c.habitId === habitId)
    .map(c => c.date)
    .sort()
    .reverse();

  if (habitCompletions.length === 0) return 0;

  let streak = 0;
  const today = new Date();
  const checkDate = new Date(today);

  // Check if completed today, if not start from yesterday
  const todayStr = getTodayStr();
  if (!habitCompletions.includes(todayStr)) {
    checkDate.setDate(checkDate.getDate() - 1);
  }

  while (true) {
    const dateStr = checkDate.toISOString().split('T')[0];
    if (habitCompletions.includes(dateStr)) {
      streak++;
      checkDate.setDate(checkDate.getDate() - 1);
    } else {
      break;
    }
  }

  return streak;
};

export const getBestStreak = (habitId: string, completions: Completion[]): number => {
  const dates = completions
    .filter(c => c.habitId === habitId)
    .map(c => c.date)
    .sort();

  if (dates.length === 0) return 0;

  let best = 1;
  let current = 1;

  for (let i = 1; i < dates.length; i++) {
    const prev = new Date(dates[i - 1]);
    const curr = new Date(dates[i]);
    const diff = (curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24);
    if (diff === 1) {
      current++;
      best = Math.max(best, current);
    } else if (diff > 1) {
      current = 1;
    }
  }

  return best;
};

export const getLast7Days = (): string[] => {
  const days: string[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(d.toISOString().split('T')[0]);
  }
  return days;
};

export const colorMap: Record<HabitColor, { bg: string; glow: string; text: string; ring: string }> = {
  green: { bg: 'bg-neon-green/20', glow: 'glow-green', text: 'text-neon-green', ring: 'ring-neon-green/50' },
  cyan: { bg: 'bg-neon-cyan/20', glow: 'glow-cyan', text: 'text-neon-cyan', ring: 'ring-neon-cyan/50' },
  purple: { bg: 'bg-neon-purple/20', glow: 'glow-purple', text: 'text-neon-purple', ring: 'ring-neon-purple/50' },
  orange: { bg: 'bg-neon-orange/20', glow: 'glow-orange', text: 'text-neon-orange', ring: 'ring-neon-orange/50' },
};

export const EMOJI_OPTIONS = ['💪', '📚', '🧘', '🏃', '💧', '🎯', '✍️', '🍎', '😴', '🧠', '🎨', '🎵', '💊', '🌱', '🚶', '🧹'];
