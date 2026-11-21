import { forwardRef, type InputHTMLAttributes, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import { cn } from '../../utils/cn';

const BASE =
  'w-full rounded-md border border-outline-variant bg-surface-container-lowest px-2.5 text-sm text-on-surface placeholder:text-on-surface-variant/60 focus:border-primary-ink focus:outline-none aria-[invalid=true]:border-rose-400';

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function Input({ className, ...rest }, ref) {
  return <input ref={ref} className={cn(BASE, 'min-h-11 md:min-h-9', className)} {...rest} />;
});

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(function Select({ className, children, ...rest }, ref) {
  return (
    <select ref={ref} className={cn(BASE, 'min-h-11 pr-7 md:min-h-9', className)} {...rest}>
      {children}
    </select>
  );
});

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(function Textarea({ className, ...rest }, ref) {
  return <textarea ref={ref} className={cn(BASE, 'min-h-16 py-2', className)} {...rest} />;
});
