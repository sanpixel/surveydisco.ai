import { motion } from "framer-motion";
import { Flame, Trophy, Trash2, Pencil } from "lucide-react";
import { Habit, Completion, isCompletedToday, getStreak, getBestStreak, getLast7Days, colorMap } from "@/lib/habits";

interface HabitCardProps {
  habit: Habit;
  completions: Completion[];
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onEdit: (habit: Habit) => void;
}

const HabitCard = ({ habit, completions, onToggle, onDelete, onEdit }: HabitCardProps) => {
  const completed = isCompletedToday(habit.id, completions);
  const streak = getStreak(habit.id, completions);
  const bestStreak = getBestStreak(habit.id, completions);
  const last7 = getLast7Days();
  const colors = colorMap[habit.color];

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className={`glass rounded-xl p-5 transition-all duration-300 ${completed ? colors.glow : ''}`}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <motion.button
            whileTap={{ scale: 0.85 }}
            onClick={() => onToggle(habit.id)}
            className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl transition-all duration-300 ${
              completed
                ? `${colors.bg} ring-2 ${colors.ring}`
                : 'bg-secondary/50 hover:bg-secondary'
            }`}
          >
            {completed ? (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 500, damping: 15 }}
              >
                ✓
              </motion.span>
            ) : (
              <span>{habit.emoji}</span>
            )}
          </motion.button>
          <div>
            <h3 className={`font-heading font-semibold text-lg ${completed ? colors.text : 'text-foreground'}`}>
              {habit.name}
            </h3>
            <span className="text-xs text-muted-foreground capitalize">{habit.frequency}</span>
          </div>
        </div>
        <div className="flex gap-1">
          <button
            onClick={() => onEdit(habit)}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onDelete(habit.id)}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-secondary/50 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Streak info */}
      <div className="flex items-center gap-4 mb-4 text-sm">
        <div className="flex items-center gap-1.5">
          <Flame className={`w-4 h-4 ${streak > 0 ? 'text-neon-orange' : 'text-muted-foreground'}`} />
          <span className={streak > 0 ? 'text-foreground font-medium' : 'text-muted-foreground'}>
            {streak} day{streak !== 1 ? 's' : ''}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <Trophy className={`w-4 h-4 ${bestStreak > 0 ? 'text-neon-cyan' : 'text-muted-foreground'}`} />
          <span className="text-muted-foreground">Best: {bestStreak}</span>
        </div>
      </div>

      {/* Weekly heatmap */}
      <div className="flex gap-1.5">
        {last7.map((date) => {
          const done = completions.some(c => c.habitId === habit.id && c.date === date);
          const dayLabel = new Date(date + 'T12:00:00').toLocaleDateString('en', { weekday: 'narrow' });
          return (
            <div key={date} className="flex flex-col items-center gap-1">
              <div
                className={`w-8 h-8 rounded-md transition-all duration-300 ${
                  done
                    ? `${colors.bg} ${colors.ring} ring-1`
                    : 'bg-secondary/30'
                }`}
                style={done ? { boxShadow: `0 0 8px hsla(var(--neon-${habit.color}) / 0.4)` } : {}}
              />
              <span className="text-[10px] text-muted-foreground">{dayLabel}</span>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
};

export default HabitCard;
