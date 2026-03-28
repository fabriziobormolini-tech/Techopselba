import { cn } from '@/lib/utils'
import { forwardRef, TextareaHTMLAttributes } from 'react'

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement> & { label?: string; error?: string }>(
  ({ className, label, error, id, ...props }, ref) => (
    <div className="space-y-1">
      {label && <label htmlFor={id} className="block text-sm font-medium text-gray-700">{label}</label>}
      <textarea
        ref={ref}
        id={id}
        rows={3}
        className={cn(
          'block w-full rounded-lg border px-3 py-2 text-sm text-gray-900 placeholder-gray-400 resize-none',
          'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent',
          error ? 'border-red-300' : 'border-gray-300',
          className
        )}
        {...props}
      />
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  )
)
Textarea.displayName = 'Textarea'
