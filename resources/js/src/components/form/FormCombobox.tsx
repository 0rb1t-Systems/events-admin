import React, { Fragment, useState } from "react";
import { Combobox } from "@headlessui/react";
import { Check, ChevronsUpDown, Search, ChevronsRight } from "lucide-react";

interface FormComboboxProps<T> {
    id: string;
    label: string;
    value: T | null;
    onChange: (value: T | null) => void;
    onSearch: (query: string) => void;
    options: T[];
    displayValue: (item: T) => string;
    error?: string;
    disabled?: boolean;
    placeholder?: string;
    loading?: boolean;
}

const FormCombobox = <T extends { id: number }>({
    id,
    label,
    value,
    onChange,
    onSearch,
    options,
    displayValue,
    error,
    disabled = false,
    placeholder = "Search...",
    loading = false,
}: FormComboboxProps<T>) => {
    const [query, setQuery] = useState("");

    const handleInputChange = (value: string) => {
        setQuery(value);
        onSearch(value);
    };

    // Show dropdown on focus if options exist (but do not clear input or selected value)
    const handleInputFocus = () => {
        // No-op: just let Combobox handle opening, do not clear query or selected value
    };

    return (
        <div className="space-y-2 font-sans">
            <label
                htmlFor={id}
                className={`block text-sm font-medium ${
                    error ? "text-red-500" : "text-gray-700 dark:text-gray-300"
                }`}
            >
                {label}
            </label>
            <Combobox value={value} onChange={onChange} disabled={disabled}>
                <div className="relative">
                    <div
                        className={`relative w-full cursor-default overflow-hidden rounded-lg text-left transition-all duration-200 ease-in-out border-2 ${
                            error
                                ? "border-red-500 focus-within:border-red-500 focus-within:ring-2 focus-within:ring-red-500/20 hover:border-red-600 focus-within:hover:border-red-500"
                                : "border-gray-300 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 hover:border-gray-400 focus-within:hover:border-primary"
                        } ${
                            disabled
                                ? "bg-gray-100 dark:bg-gray-800 cursor-not-allowed"
                                : "bg-white dark:bg-black/30"
                        }`}
                    >
                        <Combobox.Input
                            id={id}
                            className={`w-full border-0 py-2.5 pl-4 pr-10 text-sm bg-transparent focus:ring-0 focus:outline-none ${
                                error
                                    ? "text-red-500"
                                    : "text-gray-900 dark:text-white"
                            } ${
                                disabled ? "cursor-not-allowed" : ""
                            } placeholder:text-gray-400 dark:placeholder:text-gray-500`}
                            displayValue={displayValue}
                            onChange={(event) =>
                                handleInputChange(event.target.value)
                            }
                            onFocus={handleInputFocus}
                            placeholder={placeholder}
                            aria-invalid={error ? "true" : "false"}
                            autoComplete="off"
                        />
                        <Combobox.Button className="absolute inset-y-0 right-0 flex items-center pr-3">
                            <ChevronsUpDown
                                className={`h-5 w-5 transition-colors duration-200 ${
                                    error ? "text-red-500" : "text-gray-400"
                                }`}
                                aria-hidden="true"
                            />
                        </Combobox.Button>
                    </div>
                    <Combobox.Options className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-lg bg-white dark:bg-black/30 py-1 text-sm shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                        {loading ? (
                            <div className="relative cursor-default select-none py-2 px-4 text-gray-700 dark:text-gray-300 animate-pulse">
                                Loading...
                            </div>
                        ) : options.length === 0 && query !== "" ? (
                            <div className="relative cursor-default select-none py-2 px-4 text-gray-700 dark:text-gray-300">
                                Nothing found.
                            </div>
                        ) : (
                            options.map((item) => (
                                <Combobox.Option
                                    key={item.id}
                                    className={({ active, selected }) =>
                                        `relative cursor-pointer select-none py-2 pl-10 pr-4 rounded-md mx-1 transition-colors duration-150 ${
                                            active
                                                ? "bg-primary/10 text-primary"
                                                : selected
                                                ? "bg-primary/5 text-primary font-semibold"
                                                : "text-gray-900 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                                        }`
                                    }
                                    value={item}
                                >
                                    {({ selected }) => (
                                        <>
                                            <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                                                {selected ? (
                                                    <Check
                                                        className="h-5 w-5 text-primary"
                                                        aria-hidden="true"
                                                    />
                                                ) : (
                                                    <ChevronsRight
                                                        className="h-4 w-4 text-gray-400"
                                                        aria-hidden="true"
                                                    />
                                                )}
                                            </span>
                                            <span
                                                className={`block truncate pl-6 ${
                                                    selected
                                                        ? "font-semibold"
                                                        : "font-normal"
                                                }`}
                                            >
                                                {displayValue(item)}
                                            </span>
                                        </>
                                    )}
                                </Combobox.Option>
                            ))
                        )}
                    </Combobox.Options>
                </div>
            </Combobox>
            {error && (
                <p className="text-sm text-red-500 mt-1" role="alert">
                    {error}
                </p>
            )}
        </div>
    );
};

export default FormCombobox;
