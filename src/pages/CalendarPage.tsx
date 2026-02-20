import { useState } from "react";
import { ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";
import { projects, customers, standaloneTasksList } from "@/data/mockData";

const allTasks = [
  ...projects.flatMap(p => p.tasks),
  ...customers.flatMap(c => c.tasks),
  ...standaloneTasksList,
].filter(t => t.dueDate);

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

export default function CalendarPage() {
  const today = new Date("2026-02-20");
  const [current, setCurrent] = useState({ year: 2026, month: 1 }); // 0-indexed

  const daysInMonth = getDaysInMonth(current.year, current.month);
  const firstDay = getFirstDayOfMonth(current.year, current.month);
  const monthName = new Date(current.year, current.month, 1).toLocaleString("en", { month: "long" });

  const prev = () => setCurrent(c => c.month === 0 ? { year: c.year - 1, month: 11 } : { ...c, month: c.month - 1 });
  const next = () => setCurrent(c => c.month === 11 ? { year: c.year + 1, month: 0 } : { ...c, month: c.month + 1 });
  const goToday = () => setCurrent({ year: today.getFullYear(), month: today.getMonth() });

  const getTasksForDay = (day: number) => {
    const dateStr = `${current.year}-${String(current.month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    return allTasks.filter(t => t.dueDate?.startsWith(dateStr));
  };

  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <div className="p-6 page-enter">
      <div className="flex items-center justify-between mb-6 animate-stagger-1">
        <div>
          <h1 className="text-2xl font-bold">Calendar</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Tasks by due date</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={goToday} className="px-3 py-2 rounded-xl border border-border text-sm font-medium hover:bg-muted transition-colors flex items-center gap-1.5">
            <CalendarDays className="w-4 h-4" /> Today
          </button>
          <button onClick={prev} className="w-9 h-9 rounded-xl border border-border flex items-center justify-center hover:bg-muted transition-colors">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-base font-bold text-foreground min-w-[140px] text-center">{monthName} {current.year}</span>
          <button onClick={next} className="w-9 h-9 rounded-xl border border-border flex items-center justify-center hover:bg-muted transition-colors">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="bg-card rounded-2xl border border-border overflow-hidden animate-stagger-2" style={{ boxShadow: "var(--shadow-sm)" }}>
        {/* Day headers */}
        <div className="grid grid-cols-7 border-b border-border">
          {days.map(d => (
            <div key={d} className="p-3 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wide">{d}</div>
          ))}
        </div>
        {/* Cells */}
        <div className="grid grid-cols-7">
          {Array.from({ length: firstDay }).map((_, i) => (
            <div key={`empty-${i}`} className="min-h-[100px] border-b border-r border-border/40 bg-muted/20" />
          ))}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const isToday = current.year === today.getFullYear() && current.month === today.getMonth() && day === today.getDate();
            const tasks = getTasksForDay(day);
            return (
              <div key={day} className={`min-h-[100px] border-b border-r border-border/40 p-2 transition-colors ${isToday ? "bg-primary/5" : "hover:bg-muted/30"}`}>
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-semibold mb-1 ${isToday ? "bg-primary text-primary-foreground" : "text-foreground"}`}>
                  {day}
                </div>
                <div className="space-y-1">
                  {tasks.slice(0, 3).map(t => (
                    <div key={t.id} className={`px-1.5 py-0.5 rounded text-[10px] font-medium truncate ${t.status === "Done" ? "bg-green-100 text-green-700" : t.status === "In Progress" ? "bg-cyan-100 text-cyan-700" : "bg-gray-100 text-gray-600"}`}>
                      {t.name}
                    </div>
                  ))}
                  {tasks.length > 3 && <div className="text-[10px] text-muted-foreground px-1">+{tasks.length - 3} more</div>}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
