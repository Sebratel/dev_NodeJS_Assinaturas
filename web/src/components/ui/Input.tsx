import {
  forwardRef,
  type InputHTMLAttributes,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react'
import { cn } from '../../utils/cn'

/** Receita de input do design system (padroes-frontend §7). */
const BASE =
  'w-full rounded-xl border border-neutral-200 bg-surface-container-lowest px-3 py-2.5 text-sm text-on-surface shadow-sm transition ' +
  'placeholder:text-on-surface-variant/60 focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-500/20 ' +
  'dark:border-white/10 aria-[invalid=true]:border-rose-400 disabled:opacity-60'

export const Input = forwardRef<
  HTMLInputElement,
  InputHTMLAttributes<HTMLInputElement>
>(function Input({ className, ...rest }, ref) {
  return (
    <input
      ref={ref}
      className={cn(BASE, 'min-h-[44px]', className)}
      {...rest}
    />
  )
})

export const Select = forwardRef<
  HTMLSelectElement,
  SelectHTMLAttributes<HTMLSelectElement>
>(function Select({ className, children, ...rest }, ref) {
  return (
    <select
      ref={ref}
      className={cn(BASE, 'min-h-[44px] pr-8', className)}
      {...rest}
    >
      {children}
    </select>
  )
})

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  TextareaHTMLAttributes<HTMLTextAreaElement>
>(function Textarea({ className, ...rest }, ref) {
  return (
    <textarea ref={ref} className={cn(BASE, 'min-h-20', className)} {...rest} />
  )
})
