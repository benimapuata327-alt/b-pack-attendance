import type { InputHTMLAttributes, SelectHTMLAttributes, ReactNode, TextareaHTMLAttributes } from 'react';

interface FieldProps {
  label?: ReactNode;
  error?: string;
  hint?: string;
  required?: boolean;
  children: ReactNode;
}

export function Field({ label, error, hint, required, children }: FieldProps) {
  return (
    <div>
      {label && <label className="label">{label}{required && <span className="text-red-500 ml-0.5">*</span>}</label>}
      {children}
      {hint && !error && <p className="text-xs text-graphite-300 mt-1">{hint}</p>}
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  );
}

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean;
}

export function Input({ invalid, className, ...rest }: InputProps) {
  return <input className={`input ${invalid ? 'border-red-300 focus:ring-red-200' : ''} ${className ?? ''}`} {...rest} />;
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  invalid?: boolean;
}

export function Select({ invalid, className, children, ...rest }: SelectProps) {
  return <select className={`input ${invalid ? 'border-red-300 focus:ring-red-200' : ''} ${className ?? ''}`} {...rest}>{children}</select>;
}

export function Textarea({ className, ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={`input ${className ?? ''}`} {...rest} />;
}
