import { useState, useCallback, useMemo } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Plus, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import HabitCard from "@/components/HabitCard";
import AddHabitDialog from "@/components/AddHabitDialog";
import ProgressRing from "@/components/ProgressRing";
import {
  Habit,
  getHabits,
  saveHabits,
  getCompletions,
  saveCompletions,
  toggleCompletion,
  isCompletedToday,
} from "@/lib/habits";

const Index = () => {
  const [habits, setHabits] = useState<Habit[]>(getHabits);
  const [completions, setCompletions] = useState(getCompletions);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null);

  const todayCompleted = useMemo(
    () => habits.filter((h) => isCompletedToday(h.id, completions)).length,
    [habits, completions]
  );

  const handleToggle = useCallback(
    (id: string) => {
      const updated = toggleCompletion(id, completions);
      setCompletions(updated);
      saveCompletions(updated);
    },
    [completions]
  );

  const handleSave = useCallback(
    (data: Omit<Habit, "id" | "createdAt">) => {
      let updated: Habit[];
      if (editingHabit) {
        updated = habits.map((h) =>
          h.id === editingHabit.id ? { ...h, ...data } : h
        );
      } else {
        const newHabit: Habit = {
          ...data,
          id: crypto.randomUUID(),
          createdAt: new Date().toISOString(),
        };
        updated = [...habits, newHabit];
      }
      setHabits(updated);
      saveHabits(updated);
      setEditingHabit(null);
    },
    [habits, editingHabit]
  );

  const handleDelete = useCallback(
    (id: string) => {
      const updated = habits.filter((h) => h.id !== id);
      setHabits(updated);
      saveHabits(updated);
    },
    [habits]
  );

  const handleEdit = useCallback((habit: Habit) => {
    setEditingHabit(habit);
    setDialogOpen(true);
  }, []);

  const today = new Date().toLocaleDateString("en", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="border-b border-border/50 backdrop-blur-md bg-background/60 sticky top-0 z-50">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            <h1 className="text-xl font-heading font-bold text-foreground">
              HabitFlow
            </h1>
          </div>
          <Button
            onClick={() => {
              setEditingHabit(null);
              setDialogOpen(true);
            }}
            size="sm"
            className="font-heading font-semibold gap-1.5"
          >
            <Plus className="w-4 h-4" />
            Add Habit
          </Button>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-3xl mx-auto px-4 py-8">
        {/* Today overview */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row items-center gap-6 mb-10"
        >
          <ProgressRing completed={todayCompleted} total={habits.length} />
          <div className="text-center sm:text-left">
            <p className="text-sm text-muted-foreground">{today}</p>
            <h2 className="text-2xl font-heading font-bold text-foreground mt-1">
              {todayCompleted === habits.length && habits.length > 0
                ? "All done! 🎉"
                : habits.length === 0
                ? "Start tracking"
                : `${habits.length - todayCompleted} left to go`}
            </h2>
            {habits.length === 0 && (
              <p className="text-sm text-muted-foreground mt-1">
                Add your first habit to get started
              </p>
            )}
          </div>
        </motion.div>

        {/* Habit cards */}
        <div className="grid gap-4">
          <AnimatePresence mode="popLayout">
            {habits.map((habit) => (
              <HabitCard
                key={habit.id}
                habit={habit}
                completions={completions}
                onToggle={handleToggle}
                onDelete={handleDelete}
                onEdit={handleEdit}
              />
            ))}
          </AnimatePresence>
        </div>

        {habits.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="glass rounded-2xl p-12 text-center mt-4"
          >
            <div className="text-5xl mb-4">🌱</div>
            <h3 className="font-heading font-semibold text-lg text-foreground mb-2">
              Your journey starts here
            </h3>
            <p className="text-muted-foreground text-sm mb-6 max-w-xs mx-auto">
              Build lasting habits with daily tracking, streaks, and beautiful visualizations.
            </p>
            <Button
              onClick={() => {
                setEditingHabit(null);
                setDialogOpen(true);
              }}
              className="font-heading font-semibold gap-1.5"
            >
              <Plus className="w-4 h-4" />
              Create your first habit
            </Button>
          </motion.div>
        )}
      </main>

      <AddHabitDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setEditingHabit(null);
        }}
        onSave={handleSave}
        editingHabit={editingHabit}
      />
    </div>
  );
};

export default Index;
