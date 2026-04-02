import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Habit, HabitColor, EMOJI_OPTIONS } from "@/lib/habits";

interface AddHabitDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (habit: Omit<Habit, 'id' | 'createdAt'>) => void;
  editingHabit?: Habit | null;
}

const COLORS: { value: HabitColor; label: string; class: string }[] = [
  { value: 'green', label: 'Green', class: 'bg-neon-green' },
  { value: 'cyan', label: 'Cyan', class: 'bg-neon-cyan' },
  { value: 'purple', label: 'Purple', class: 'bg-neon-purple' },
  { value: 'orange', label: 'Orange', class: 'bg-neon-orange' },
];

const AddHabitDialog = ({ open, onOpenChange, onSave, editingHabit }: AddHabitDialogProps) => {
  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState('💪');
  const [color, setColor] = useState<HabitColor>('green');
  const [frequency, setFrequency] = useState<'daily' | 'weekly'>('daily');

  useEffect(() => {
    if (editingHabit) {
      setName(editingHabit.name);
      setEmoji(editingHabit.emoji);
      setColor(editingHabit.color);
      setFrequency(editingHabit.frequency);
    } else {
      setName('');
      setEmoji('💪');
      setColor('green');
      setFrequency('daily');
    }
  }, [editingHabit, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSave({ name: name.trim(), emoji, color, frequency });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass border-border/50 sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-heading text-xl">
            {editingHabit ? 'Edit Habit' : 'New Habit'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="text-sm text-muted-foreground mb-2 block">Name</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Read 30 minutes"
              className="bg-secondary/50 border-border/50"
              autoFocus
            />
          </div>

          <div>
            <label className="text-sm text-muted-foreground mb-2 block">Icon</label>
            <div className="flex flex-wrap gap-2">
              {EMOJI_OPTIONS.map((e) => (
                <button
                  key={e}
                  type="button"
                  onClick={() => setEmoji(e)}
                  className={`w-10 h-10 rounded-lg text-lg flex items-center justify-center transition-all ${
                    emoji === e ? 'bg-primary/20 ring-2 ring-primary/50 scale-110' : 'bg-secondary/50 hover:bg-secondary'
                  }`}
                >
                  {e}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-sm text-muted-foreground mb-2 block">Color</label>
            <div className="flex gap-3">
              {COLORS.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setColor(c.value)}
                  className={`w-8 h-8 rounded-full ${c.class} transition-all ${
                    color === c.value ? 'ring-2 ring-offset-2 ring-offset-background ring-foreground/50 scale-110' : 'opacity-60 hover:opacity-100'
                  }`}
                />
              ))}
            </div>
          </div>

          <div>
            <label className="text-sm text-muted-foreground mb-2 block">Frequency</label>
            <div className="flex gap-2">
              {(['daily', 'weekly'] as const).map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setFrequency(f)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition-all ${
                    frequency === f
                      ? 'bg-primary/20 text-primary ring-1 ring-primary/30'
                      : 'bg-secondary/50 text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          <Button type="submit" className="w-full font-heading font-semibold">
            {editingHabit ? 'Save Changes' : 'Add Habit'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddHabitDialog;
