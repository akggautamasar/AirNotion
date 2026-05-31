'use client';

import { cn } from '@/lib/utils';
import type { NoteColor } from '@/lib/types';

const COLORS: { value: NoteColor; label: string; bg: string; ring: string }[] = [
  { value: 'default', label: 'Default',  bg: 'bg-surface-200 dark:bg-surface-600',  ring: 'ring-surface-400' },
  { value: 'red',     label: 'Red',      bg: 'bg-red-400',                           ring: 'ring-red-500'     },
  { value: 'orange',  label: 'Orange',   bg: 'bg-orange-400',                        ring: 'ring-orange-500'  },
  { value: 'yellow',  label: 'Yellow',   bg: 'bg-yellow-400',                        ring: 'ring-yellow-500'  },
  { value: 'green',   label: 'Green',    bg: 'bg-green-400',                         ring: 'ring-green-500'   },
  { value: 'teal',    label: 'Teal',     bg: 'bg-teal-400',                          ring: 'ring-teal-500'    },
  { value: 'blue',    label: 'Blue',     bg: 'bg-blue-400',                          ring: 'ring-blue-500'    },
  { value: 'purple',  label: 'Purple',   bg: 'bg-purple-400',                        ring: 'ring-purple-500'  },
  { value: 'pink',    label: 'Pink',     bg: 'bg-pink-400',                          ring: 'ring-pink-500'    },
  { value: 'brown',   label: 'Brown',    bg: 'bg-amber-700',                         ring: 'ring-amber-800'   },
  { value: 'gray',    label: 'Gray',     bg: 'bg-gray-400',                          ring: 'ring-gray-500'    },
];

interface ColorPickerProps {
  value: NoteColor;
  onChange: (color: NoteColor) => void;
  className?: string;
}

export default function ColorPicker({ value, onChange, className }: ColorPickerProps) {
  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <p className="text-xs font-medium text-surface-500 dark:text-surface-400 uppercase tracking-wider px-1">
        Note Color
      </p>
      <div className="grid grid-cols-6 gap-1.5 p-1">
        {COLORS.map((color) => (
          <button
            key={color.value}
            title={color.label}
            onClick={() => onChange(color.value)}
            className={cn(
              'w-7 h-7 rounded-full transition-all duration-150 hover:scale-110 focus:outline-none',
              color.bg,
              value === color.value && `ring-2 ring-offset-2 ring-offset-white dark:ring-offset-surface-800 ${color.ring} scale-110`
            )}
            aria-label={color.label}
            aria-pressed={value === color.value}
          />
        ))}
      </div>
    </div>
  );
}
