import React from "react";
import { ChevronDown } from "lucide-react";

interface SelectOption {
    value: string;
    label: string;
}

interface FormSelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, "onChange"> {
    label: string;
    options: SelectOption[];
    error?: string;
    value: string;
    onChange: (value: string) => void;
    onBlur: () => void;
    disabled?: boolean;
}

const FormSelect: React.FC<FormSelectProps> = ({
    label,
    options,
    error,
    className = "",
    value,
    onChange,
    onBlur,
    disabled,
    ...props
}) => {
    return (
        <div className="space-y-2">
            <label
                htmlFor={props.id}
                className={`block text-sm font-medium ${
                    error ? "text-red-500" : "text-gray-700 dark:text-gray-300"
                }`}
            >
                {label}
            </label>
            <div className="relative">
                <select
                    {...props}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    onBlur={onBlur}
                    aria-invalid={error ? "true" : "false"}
                    className={`
                        block w-full pl-4 pr-10 py-2.5 text-gray-900 dark:text-white
                        border-2 rounded-lg text-sm transition-all duration-200 ease-in-out
                        focus:outline-none appearance-none
                        dark:bg-black/30
                        ${
                            error
                                ? "border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-500/20 hover:border-red-600 focus:hover:border-red-500"
                                : "border-gray-300 focus:border-primary focus:ring-2 focus:ring-primary/20 hover:border-gray-400 focus:hover:border-primary dark:border-gray-700 dark:focus:border-primary"
                        }
                        ${
                            disabled
                                ? "bg-gray-100 dark:bg-gray-800 cursor-not-allowed"
                                : ""
                        }
                        ${className}
                    `}
                >
                    {options.map((option) => (
                        <option key={option.value} value={option.value}>
                            {option.label}
                        </option>
                    ))}
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                    <ChevronDown
                        className={`h-5 w-5 ${
                            error ? "text-red-500" : "text-gray-400"
                        }`}
                    />
                </div>
            </div>
            {error && (
                <p className="text-sm text-red-500 mt-1" role="alert">
                    {error}
                </p>
            )}
        </div>
    );
};

export default FormSelect;
