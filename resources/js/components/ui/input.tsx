import * as React from 'react';

import { cn } from '@/lib/utils';

function assignRef<T>(ref: React.Ref<T> | undefined, value: T | null) {
    if (!ref) {
        return;
    }
    if (typeof ref === 'function') {
        ref(value);
        return;
    }
    (ref as React.RefObject<T | null>).current = value;
}

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<'input'>>(
    ({ className, type, onWheel, ...props }, forwardedRef) => {
        const inputRef = React.useRef<HTMLInputElement | null>(null);

        const setRefs = React.useCallback(
            (node: HTMLInputElement | null) => {
                inputRef.current = node;
                assignRef(forwardedRef, node);
            },
            [forwardedRef],
        );

        React.useEffect(() => {
            if (type !== 'number') {
                return;
            }

            const el = inputRef.current;
            if (!el) {
                return;
            }

            const blockWheelChange = (event: WheelEvent) => {
                if (document.activeElement === el) {
                    event.preventDefault();
                }
            };

            el.addEventListener('wheel', blockWheelChange, { passive: false });

            return () => el.removeEventListener('wheel', blockWheelChange);
        }, [type]);

        return (
            <input
                ref={setRefs}
                type={type}
                onWheel={onWheel}
                data-slot="input"
                className={cn(
                    'file:text-foreground placeholder:text-slate-400 dark:placeholder:text-slate-500 selection:bg-blue-500 selection:text-white',
                    'h-10 w-full min-w-0 rounded-lg border-2 border-slate-300 dark:border-[#3a3a3a]',
                    'bg-white dark:bg-[#1f1f1f]',
                    'px-4 py-2 text-sm',
                    'text-slate-900 dark:text-slate-100',
                    'transition-all duration-200',
                    'focus-visible:outline-none focus-visible:border-2 focus-visible:border-blue-500 dark:focus-visible:border-blue-400',
                    'disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-slate-50 dark:disabled:bg-[#2a2a2a]',
                    'aria-invalid:border-rose-500',
                    type === 'number' &&
                        '[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none',
                    className,
                )}
                {...props}
            />
        );
    },
);

Input.displayName = 'Input';

export { Input };
