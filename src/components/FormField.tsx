import type { InputHTMLAttributes, TextareaHTMLAttributes } from 'react'

export function FormField({ label, hint, ...props }: { label: string; hint?: string } & InputHTMLAttributes<HTMLInputElement>) {
  return <label className="form-field">
    <span>{label}</span>
    <input {...props} />
    {hint && <small>{hint}</small>}
  </label>
}

export function TextAreaField({ label, ...props }: { label: string } & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <label className="form-field form-field--wide">
    <span>{label}</span>
    <textarea rows={3} {...props} />
  </label>
}
