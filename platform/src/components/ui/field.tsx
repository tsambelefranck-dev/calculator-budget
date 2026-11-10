import type { ComponentProps, ReactNode } from 'react';
import { cn } from '@/lib/utils';

export const inputClasses =
  'block w-full rounded-xl border border-border-strong bg-surface px-3.5 py-2.5 text-[15px] text-ink placeholder:text-muted ' +
  'transition-colors focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/25 disabled:opacity-60 ' +
  'aria-[invalid=true]:border-critical aria-[invalid=true]:ring-critical/20';

export function Label({ className, ...props }: ComponentProps<'label'>) {
  return <label className={cn('text-sm font-medium text-ink', className)} {...props} />;
}

export function Input({ className, ...props }: ComponentProps<'input'>) {
  return <input className={cn(inputClasses, className)} {...props} />;
}

export function Textarea({ className, ...props }: ComponentProps<'textarea'>) {
  return <textarea className={cn(inputClasses, 'min-h-24 resize-y', className)} {...props} />;
}

export function Select({ className, children, ...props }: ComponentProps<'select'>) {
  return (
    <select
      className={cn(
        inputClasses,
        'appearance-none bg-[length:16px] bg-[right_0.75rem_center] bg-no-repeat pr-9',
        "bg-[url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23889590' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")]",
        className,
      )}
      {...props}
    >
      {children}
    </select>
  );
}

export function FieldError({ errors, id }: { errors?: string[]; id?: string }) {
  if (!errors?.length) return null;
  return (
    <p id={id} className="text-sm text-critical-ink" role="alert">
      {errors[0]}
    </p>
  );
}

export interface FieldProps {
  label: ReactNode;
  htmlFor: string;
  hint?: ReactNode;
  errors?: string[];
  className?: string;
  children: ReactNode;
  optional?: boolean;
}

/** Libellé + champ + aide + erreur, avec les attributs d'accessibilité reliés. */
export function Field({ label, htmlFor, hint, errors, className, children, optional }: FieldProps) {
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <Label htmlFor={htmlFor}>
        {label}
        {optional ? <span className="ml-1 font-normal text-muted">(facultatif)</span> : null}
      </Label>
      {children}
      {hint && !errors?.length ? (
        <p id={`${htmlFor}-hint`} className="text-xs text-muted">
          {hint}
        </p>
      ) : null}
      <FieldError errors={errors} id={`${htmlFor}-error`} />
    </div>
  );
}
