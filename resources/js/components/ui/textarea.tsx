import * as React from "react";

import { cn } from "@/lib/utils";

const Textarea = React.forwardRef<HTMLTextAreaElement, React.ComponentProps<"textarea">>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        data-slot="textarea"
        className={cn(
          "file:text-foreground placeholder:text-slate-400 dark:placeholder:text-slate-500 selection:bg-blue-500 selection:text-white",
          "min-h-[80px] w-full min-w-0 rounded-lg border-2 border-slate-300 dark:border-[#3a3a3a]",
          "bg-white dark:bg-[#1f1f1f]",
          "px-4 py-2 text-sm",
          "text-slate-900 dark:text-slate-100",
          "transition-all duration-200",
          "focus-visible:outline-none focus-visible:border-2 focus-visible:border-blue-500 dark:focus-visible:border-blue-400",
          "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-slate-50 dark:disabled:bg-[#2a2a2a]",
          "resize-y",
          "aria-invalid:border-rose-500",
          className
        )}
        {...props}
      />
    );
  }
);

Textarea.displayName = "Textarea";

export { Textarea };

