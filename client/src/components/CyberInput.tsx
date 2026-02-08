import React, { InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface CyberInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  icon?: React.ReactNode;
}

export const CyberInput = React.forwardRef<HTMLInputElement, CyberInputProps>(
  ({ className, label, error, icon, ...props }, ref) => {
    return (
      <div className="space-y-2 w-full">
        <label className="text-xs font-mono font-medium text-muted-foreground uppercase tracking-wider ml-1">
          {label}
        </label>
        <div className="relative group">
          {icon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors">
              {icon}
            </div>
          )}
          <input
            ref={ref}
            className={cn(
              "flex h-12 w-full rounded-lg bg-card/50 border border-input px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:border-primary disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-300 backdrop-blur-sm",
              icon ? "pl-10" : "",
              error ? "border-destructive focus-visible:ring-destructive/50" : "",
              className
            )}
            {...props}
          />
          {/* Decorative corner accents */}
          <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-primary/0 group-focus-within:border-primary/50 transition-all duration-300 rounded-tr-lg" />
          <div className="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-primary/0 group-focus-within:border-primary/50 transition-all duration-300 rounded-bl-lg" />
        </div>
        {error && (
          <p className="text-xs text-destructive font-medium animate-in slide-in-from-top-1 ml-1">
            {error}
          </p>
        )}
      </div>
    );
  }
);
CyberInput.displayName = "CyberInput";
