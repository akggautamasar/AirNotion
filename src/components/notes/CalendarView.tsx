'use client';

import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  isToday,
  parseISO,
} from 'date-fns';
import { useNotesStore } from '@/store/notesStore';
import { cn, truncate } from '@/lib/utils';
import type { Note } from '@/lib/types';

export default function CalendarView() {
  const { getFilteredNotes, setActiveNote } = useNotesStore();
  const notes = getFilteredNotes();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarStart = startOfWeek(monthStart);
  const calendarEnd = endOfWeek(monthEnd);
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const getNotesForDay = (day: Date): Note[] =>
    notes.filter((n) => {
      const noteDate = n.dueDate
        ? parseISO(n.dueDate)
        : parseISO(n.createdAt);
      return isSameDay(noteDate, day);
    });

  const selectedDayNotes = selectedDay ? getNotesForDay(selectedDay) : [];

  const prevMonth = () => setCurrentDate((d) => new Date(d.getFullYear(), d.getMonth() - 1));
  const nextMonth = () => setCurrentDate((d) => new Date(d.getFullYear(), d.getMonth() + 1));
  const goToday = () => setCurrentDate(new Date());

  const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="flex flex-col h-full p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <button
            onClick={prevMonth}
            className="p-1.5 rounded-lg text-surface-500 hover:text-surface-700 hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors"
          >
            <ChevronLeft size={16} />
          </button>
          <h2 className="text-base font-semibold text-surface-900 dark:text-surface-100 min-w-32 text-center">
            {format(currentDate, 'MMMM yyyy')}
          </h2>
          <button
            onClick={nextMonth}
            className="p-1.5 rounded-lg text-surface-500 hover:text-surface-700 hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors"
          >
            <ChevronRight size={16} />
          </button>
        </div>
        <button
          onClick={goToday}
          className="px-3 py-1.5 text-xs font-medium rounded-lg bg-surface-100 dark:bg-surface-800 text-surface-600 dark:text-surface-400 hover:bg-surface-200 dark:hover:bg-surface-700 transition-colors"
        >
          Today
        </button>
      </div>

      <div className="flex flex-1 gap-4 overflow-hidden">
        {/* Calendar grid */}
        <div className="flex-1 flex flex-col">
          {/* Weekday headers */}
          <div className="grid grid-cols-7 gap-1 mb-1">
            {WEEKDAYS.map((day) => (
              <div key={day} className="text-center text-xs font-semibold text-surface-400 dark:text-surface-500 py-1.5">
                {day}
              </div>
            ))}
          </div>

          {/* Days grid */}
          <div className="flex-1 grid grid-cols-7 gap-1">
            {calendarDays.map((day) => {
              const dayNotes = getNotesForDay(day);
              const isCurrentMonth = isSameMonth(day, currentDate);
              const isSelected = selectedDay ? isSameDay(day, selectedDay) : false;
              const isTodayDate = isToday(day);

              return (
                <button
                  key={day.toISOString()}
                  onClick={() => setSelectedDay(isSameDay(day, selectedDay ?? new Date(0)) ? null : day)}
                  className={cn(
                    'flex flex-col p-1.5 rounded-lg transition-colors text-left min-h-14 relative',
                    !isCurrentMonth && 'opacity-30',
                    isSelected
                      ? 'bg-brand-500/15 ring-1 ring-brand-500'
                      : 'hover:bg-surface-100 dark:hover:bg-surface-800',
                    isTodayDate && !isSelected && 'bg-brand-50 dark:bg-brand-950/20'
                  )}
                >
                  <span className={cn(
                    'text-xs font-medium w-5 h-5 flex items-center justify-center rounded-full flex-shrink-0',
                    isTodayDate
                      ? 'bg-brand-500 text-white'
                      : 'text-surface-700 dark:text-surface-300'
                  )}>
                    {format(day, 'd')}
                  </span>

                  {/* Note indicators */}
                  <div className="flex flex-col gap-0.5 mt-0.5 w-full overflow-hidden">
                    {dayNotes.slice(0, 2).map((note) => (
                      <div
                        key={note.id}
                        className="text-xs truncate px-1 py-0.5 rounded bg-brand-500/10 text-brand-600 dark:text-brand-400 leading-none"
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveNote(note.id);
                        }}
                      >
                        {note.title || 'Untitled'}
                      </div>
                    ))}
                    {dayNotes.length > 2 && (
                      <span className="text-xs text-surface-400 px-1">
                        +{dayNotes.length - 2} more
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected day panel */}
        {selectedDay && (
          <div className="w-64 flex-shrink-0 bg-surface-50 dark:bg-surface-800/50 rounded-xl border border-surface-200 dark:border-surface-700 overflow-hidden flex flex-col">
            <div className="px-4 py-3 border-b border-surface-200 dark:border-surface-700">
              <h3 className="text-sm font-semibold text-surface-900 dark:text-surface-100">
                {format(selectedDay, 'MMMM d, yyyy')}
              </h3>
              <p className="text-xs text-surface-400 mt-0.5">
                {selectedDayNotes.length} note{selectedDayNotes.length !== 1 ? 's' : ''}
              </p>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {selectedDayNotes.length === 0 ? (
                <p className="text-sm text-surface-400 text-center py-4">No notes for this day</p>
              ) : (
                selectedDayNotes.map((note) => (
                  <button
                    key={note.id}
                    onClick={() => setActiveNote(note.id)}
                    className="w-full text-left p-3 rounded-lg bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700 hover:border-brand-300 dark:hover:border-brand-700 transition-colors"
                  >
                    <p className={cn(
                      'text-sm font-medium leading-snug',
                      note.title ? 'text-surface-900 dark:text-surface-100' : 'text-surface-400 italic'
                    )}>
                      {note.title || 'Untitled'}
                    </p>
                    {note.plainText && (
                      <p className="text-xs text-surface-500 dark:text-surface-400 mt-0.5 line-clamp-2">
                        {truncate(note.plainText, 60)}
                      </p>
                    )}
                    {note.tags.length > 0 && (
                      <div className="flex gap-1 mt-1.5 flex-wrap">
                        {note.tags.slice(0, 2).map((tag) => (
                          <span key={tag} className="text-xs px-1.5 py-0.5 rounded-full bg-surface-100 dark:bg-surface-700 text-surface-400">
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </button>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
