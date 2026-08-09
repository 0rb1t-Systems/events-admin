import React from 'react';

/**
 * Text Input Renderer - Standard single-line text input
 */
export const TextInputRenderer = <T extends Record<string, any>>(
    value: string,
    item: T,
    onChange: (key: keyof T, value: any) => void,
    key: keyof T,
    placeholder?: string,
    required?: boolean,
    className?: string
) => {
    return (
        <div className="flex flex-col">
            <input
                type="text"
                className={`w-full px-3 py-1.5 border-0 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600 rounded-sm
                dark:bg-gray-800 dark:text-gray-300 ${
                    required && !value ? "border-red-500 bg-red-50 dark:bg-red-900/30" : ""
                } ${className || ""}`}
                value={value || ""}
                onChange={(e) => onChange(key, e.target.value)}
                placeholder={placeholder || `Enter ${String(key)}`}
            />
            {required && !value && (
                <span className="text-red-500 dark:text-red-400 text-xs mt-1">
                    This field is required
                </span>
            )}
        </div>
    );
};

/**
 * Text Area Renderer - Multi-line text input
 */
export const TextAreaRenderer = <T extends Record<string, any>>(
    value: string,
    item: T,
    onChange: (key: keyof T, value: any) => void,
    key: keyof T,
    placeholder?: string,
    required?: boolean,
    rows: number = 2,
    className?: string
) => {
    return (
        <div className="flex flex-col">
            <textarea
                className={`w-full px-3 py-1.5 border-0 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600 rounded-sm
                dark:bg-gray-800 dark:text-gray-300 ${
                    required && !value ? "border-red-500 bg-red-50 dark:bg-red-900/30" : ""
                } ${className || ""}`}
                value={value || ""}
                onChange={(e) => onChange(key, e.target.value)}
                placeholder={placeholder || `Enter ${String(key)}`}
                rows={rows}
            />
            {required && !value && (
                <span className="text-red-500 dark:text-red-400 text-xs mt-1">
                    This field is required
                </span>
            )}
        </div>
    );
};

/**
 * Select Renderer - Dropdown selection
 */
export interface SelectOption {
    value: string | number;
    label: string;
}

export const SelectRenderer = <T extends Record<string, any>>(
    value: string | number,
    item: T,
    onChange: (key: keyof T, value: any) => void,
    key: keyof T,
    options: SelectOption[],
    required?: boolean,
    placeholder: string = "Select an option",
    className?: string
) => {
    return (
        <div className="flex flex-col">
            <select
                className={`w-full px-3 py-1.5 border-0 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600 rounded-sm
                dark:bg-gray-800 dark:text-gray-300 ${
                    required && !value ? "border-red-500 bg-red-50 dark:bg-red-900/30" : ""
                } ${className || ""}`}
                value={value || ""}
                onChange={(e) => {
                    // Convert numeric values if needed
                    const val = e.target.value;
                    const numericVal = !isNaN(Number(val)) ? Number(val) : val;
                    onChange(key, numericVal);
                }}
            >
                <option value="" className="dark:bg-gray-800 dark:text-gray-300">{placeholder}</option>
                {options.map((option) => (
                    <option key={option.value} value={option.value} className="dark:bg-gray-800 dark:text-gray-300">
                        {option.label}
                    </option>
                ))}
            </select>
            {required && !value && (
                <span className="text-red-500 dark:text-red-400 text-xs mt-1">
                    This field is required
                </span>
            )}
        </div>
    );
};

/**
 * Error Display Renderer - Shows error message if present
 */
export const ErrorRenderer = (errorMessage: string | null | undefined) => {
    if (!errorMessage) return null;

    return (
        <span className="text-red-500 dark:text-red-400 text-xs mt-1">
            {errorMessage}
        </span>
    );
};
