import { useEffect, useState } from "react";
import { playChime } from "../lib/chime";

export interface Reminder {
  label: string;
  message: string;
}

// Reminder times (Saudi local time on the office computer)
// Only one reminder now — at 7:00 PM, to remind employees to check out before going home.
const REMINDER_TIMES = [
  { hour: 19, minute: 0, label: "Time to Check Out", message: "Don't forget to check out before leaving the office" },
];

export function useCheckOutReminder() {
  const [reminder, setReminder] = useState<Reminder | null>(null);

  useEffect(() => {
    const firedKeys = new Set<string>();
    const checkAndFire = () => {
      const now = new Date();
      const todayKey = now.toDateString();
      for (const r of REMINDER_TIMES) {
        const key = `${todayKey}_${r.hour}_${r.minute}`;
        if (firedKeys.has(key)) continue;
        if (now.getHours() === r.hour && now.getMinutes() === r.minute) {
          firedKeys.add(key);
          playChime();
          setReminder({ label: r.label, message: r.message });
          // Auto-dismiss banner after 60 seconds
          setTimeout(() => setReminder(null), 60 * 1000);
        }
      }
    };
    const id = setInterval(checkAndFire, 30 * 1000);
    checkAndFire();
    return () => clearInterval(id);
  }, []);

  function dismiss() {
    setReminder(null);
    playChime();
  }

  return { reminder, dismiss };
}
