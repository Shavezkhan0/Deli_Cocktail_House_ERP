"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, X } from "lucide-react";
import { cn } from "@/lib/utils";

export type MultiSelectOption = {
  value: string;
  label: string;
};

export function MultiSelect({
  options,
  value = [],
  onChange,
  placeholder = "Select options...",
  className,
  disabled,
}: {
  options: MultiSelectOption[];
  value?: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const toggle = (optionValue: string) => {
    if (value.includes(optionValue)) {
      onChange(value.filter((v) => v !== optionValue));
    } else {
      onChange([...value, optionValue]);
    }
  };

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "flex h-8 w-full min-w-0 items-center justify-between gap-1.5 rounded-lg border border-input bg-background px-2.5 py-1 text-sm text-foreground shadow-xs outline-none transition-[color,box-shadow]",
          "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
          "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
          open && "border-ring ring-3 ring-ring/50"
        )}
      >
        {value.length > 0 ? (
          <div className="flex flex-1 flex-wrap items-center gap-1 overflow-hidden">
            {value.map((v) => {
              const option = options.find((o) => o.value === v);
              return (
                <span
                  key={v}
                  className="inline-flex items-center gap-1 rounded-md bg-secondary px-1.5 py-0.5 text-xs font-medium text-secondary-foreground"
                >
                  {option?.label ?? v}
                  <span
                    role="button"
                    tabIndex={0}
                    aria-label={`Remove ${option?.label ?? v}`}
                    className="inline-flex cursor-pointer rounded-sm hover:bg-muted"
                    onClick={(event) => {
                      event.stopPropagation();
                      onChange(value.filter((x) => x !== v));
                    }}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        event.stopPropagation();
                        onChange(value.filter((x) => x !== v));
                      }
                    }}
                  >
                    <X className="h-3 w-3" />
                  </span>
                </span>
              );
            })}
          </div>
        ) : (
          <span className="truncate text-muted-foreground">{placeholder}</span>
        )}
        <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
      </button>

      {open ? (
        <div className="absolute z-20 mt-1 max-h-64 w-full overflow-y-auto rounded-lg border border-border bg-popover p-1 text-sm text-popover-foreground shadow-md">
          {options.length === 0 ? (
            <p className="px-2 py-1.5 text-muted-foreground">No options</p>
          ) : (
            options.map((option) => {
              const selected = value.includes(option.value);
              return (
                <label
                  key={option.value}
                  className={cn(
                    "flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 transition-colors hover:bg-accent",
                    selected && "bg-accent/60"
                  )}
                >
                  <input
                    type="checkbox"
                    checked={selected}
                    onChange={() => toggle(option.value)}
                    className="size-3.5 shrink-0 accent-primary"
                  />
                  <span className="flex-1 truncate">{option.label}</span>
                  {selected ? <Check className="h-4 w-4 shrink-0 text-primary" /> : null}
                </label>
              );
            })
          )}
        </div>
      ) : null}
    </div>
  );
}
