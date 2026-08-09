import React, { forwardRef } from "react";
import { AlertCircle } from "lucide-react";

export interface FormTextareaProps
    extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
    id: string;
    label?: string;
    placeholder?: string;
    error?: string;
    required?: boolean;
    rows?: number;
    className?: string;
    labelClassName?: string;
    inputClassName?: string;
    errorClassName?: string;
}

const FormTextarea = forwardRef<HTMLTextAreaElement, FormTextareaProps>(
    (
        {
            id,
            label,
            placeholder,
            error,
            required = false,
            rows = 3,
            className = "",
            labelClassName = "",
            inputClassName = "",
            errorClassName = "",
            disabled = false,
            ...rest
        },
        ref
    ) => {
        const containerClassName = `mb-3 ${className}`;
        const textareaClassName = `block w-full px-4 py-2.5 text-gray-900 dark:text-white
            border-2 rounded-lg text-sm transition-all duration-200 ease-in-out
            focus:outline-none
            dark:bg-black/30
            ${
                error
                    ? "border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-500/20 hover:border-red-600 focus:hover:border-red-500"
                    : "border-gray-300 focus:border-primary focus:ring-2 focus:ring-primary/20 hover:border-gray-400 focus:hover:border-primary dark:border-gray-700 dark:focus:border-primary"
            }
            ${disabled ? "bg-gray-100 dark:bg-gray-800 cursor-not-allowed" : ""}
            ${inputClassName}`;

        return (
            <div className={containerClassName}>
                {label && (
                    <label
                        htmlFor={id}
                        className={`block text-sm font-medium ${
                            error ? "text-red-500" : "text-gray-700 dark:text-gray-300"
                        } mb-2 ${labelClassName}`}
                    >
                        {label}
                        {required && (
                            <span className="text-red-500 ml-1">*</span>
                        )}
                    </label>
                )}

                <div className="relative">
                    <textarea
                        id={id}
                        className={textareaClassName}
                        placeholder={placeholder}
                        disabled={disabled}
                        rows={rows}
                        ref={ref}
                        aria-invalid={error ? "true" : "false"}
                        aria-describedby={error ? `${id}-error` : undefined}
                        {...rest}
                    />
                    {error && (
                        <div className="absolute top-2.5 right-3">
                            <AlertCircle
                                className="h-5 w-5 text-red-500"
                                aria-hidden="true"
                            />
                        </div>
                    )}
                </div>

                {error && (
                    <p
                        className={`mt-1 text-sm text-red-500 ${errorClassName}`}
                        id={`${id}-error`}
                        role="alert"
                    >
                        {error}
                    </p>
                )}
            </div>
        );
    }
);

FormTextarea.displayName = "FormTextarea";

export default FormTextarea;
