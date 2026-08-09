import React, { useState } from "react";
import { X, CheckCircle2 } from "lucide-react";
import { Control, Controller } from "react-hook-form";
import {
    Combobox,
    ComboboxInput,
    ComboboxButton,
    ComboboxOptions,
    ComboboxOption,
} from "@headlessui/react";
import {
    BulkCreateFormColumn,
    ComboboxOption as ComboboxOptionType,
    FormData,
} from "./types";

interface FormFieldProps<T> {
    column: BulkCreateFormColumn<T>;
    control: Control<FormData<T>>;
    index: number;
    errors: any;
    comboboxOptions: ComboboxOptionType[];
    onComboboxSearch: (
        query: string,
        rowIndex: number,
        columnKey: string,
        fetchFn?: (query: string) => Promise<ComboboxOptionType[]>
    ) => void;
}

const FormField = <T extends Record<string, any>>({
    column,
    control,
    index,
    errors,
    comboboxOptions,
    onComboboxSearch,
}: FormFieldProps<T>) => {
    return (
        <div className="flex flex-col">
            <Controller
                control={control}
                name={`entries.${index}.${String(column.key)}`}
                render={({ field: { onChange, value, onBlur } }) => {
                    const hasError =
                        errors.entries?.[index]?.[String(column.key)];

                    // Handle combobox field type
                    if (column.type === "combobox") {
                        return (
                            <ComboboxField
                                column={column}
                                value={value}
                                onChange={onChange}
                                hasError={hasError}
                                availableOptions={comboboxOptions}
                                onSearch={(query) =>
                                    onComboboxSearch(
                                        query,
                                        index,
                                        String(column.key),
                                        column.fetchOptions
                                    )
                                }
                            />
                        );
                    }

                    if (column.type === "select") {
                        return (
                            <select
                                className={`w-full px-3 py-1.5 border-0 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600 rounded-sm
                                ${
                                    hasError
                                        ? "border-red-500 bg-red-50 dark:bg-red-900/30"
                                        : "bg-white dark:bg-gray-800"
                                }
                                dark:text-gray-300`}
                                value={value || ""}
                                onChange={onChange}
                                onBlur={onBlur}
                            >
                                <option
                                    value=""
                                    className="dark:bg-gray-800 dark:text-gray-300"
                                >
                                    Select {column.label}
                                </option>
                                {column.options?.map((option) => (
                                    <option
                                        key={option.value}
                                        value={option.value}
                                        className="dark:bg-gray-800 dark:text-gray-300"
                                    >
                                        {option.label}
                                    </option>
                                ))}
                            </select>
                        );
                    }

                    if (column.type === "textarea") {
                        return (
                            <textarea
                                className={`w-full px-3 py-1.5 border-0 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600 rounded-sm resize-none
                                ${
                                    hasError
                                        ? "border-red-500 bg-red-50 dark:bg-red-900/30"
                                        : "bg-white dark:bg-gray-800"
                                }
                                dark:text-gray-300`}
                                value={value || ""}
                                onChange={onChange}
                                onBlur={onBlur}
                                rows={2}
                                placeholder={`Enter ${column.label.toLowerCase()}`}
                            />
                        );
                    }

                    return (
                        <input
                            type={column.type || "text"}
                            className={`w-full px-3 py-1.5 border-0 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600 rounded-sm
                            ${
                                hasError
                                    ? "border-red-500 bg-red-50 dark:bg-red-900/30"
                                    : "bg-white dark:bg-gray-800"
                            }
                            dark:text-gray-300`}
                            value={value || ""}
                            onChange={onChange}
                            onBlur={onBlur}
                            placeholder={`Enter ${column.label.toLowerCase()}`}
                        />
                    );
                }}
            />
            {errors.entries?.[index]?.[String(column.key)] && (
                <span className="text-red-500 dark:text-red-400 text-xs mt-1">
                    {String(
                        errors.entries[index][String(column.key)]?.message || ""
                    )}
                </span>
            )}
        </div>
    );
};

interface ComboboxFieldProps<T> {
    column: BulkCreateFormColumn<T>;
    value: string;
    onChange: (value: string) => void;
    hasError: boolean;
    availableOptions: ComboboxOptionType[];
    onSearch: (query: string) => void;
}

const ComboboxField = <T extends Record<string, any>>({
    column,
    value,
    onChange,
    hasError,
    availableOptions,
    onSearch,
}: ComboboxFieldProps<T>) => {
    const [query, setQuery] = useState("");

    const selectedOption = availableOptions.find((opt) => opt.value === value);

    const displayedValue = selectedOption
        ? selectedOption.label
        : column.displayValue
        ? column.displayValue(value, availableOptions)
        : value;

    return (
        <div className="relative">
            <Combobox
                value={value}
                onChange={(newValue: any) => {
                    onChange(
                        newValue && typeof newValue === "object"
                            ? newValue.value
                            : newValue || ""
                    );
                }}
            >
                <div className="relative">
                    <div className="flex items-center">
                        <ComboboxInput
                            className={`w-full px-3 py-1.5 border-0 focus:ring-2 focus:ring-blue-500 rounded-sm
                                ${
                                    hasError
                                        ? "border-red-500 bg-red-50 dark:bg-red-900/30"
                                        : "bg-white dark:bg-gray-800"
                                }
                                dark:text-gray-300`}
                            displayValue={() => displayedValue || ""}
                            onChange={(e) => {
                                setQuery(e.target.value);
                                onSearch(e.target.value);
                            }}
                            placeholder={`Search ${column.label}...`}
                        />
                        {value && (
                            <button
                                type="button"
                                className="absolute right-8 p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"
                                onClick={() => onChange("")}
                            >
                                <X className="h-3 w-3 text-gray-400" />
                            </button>
                        )}
                    </div>
                    <ComboboxButton className="absolute inset-y-0 right-0 flex items-center pr-2">
                        <svg
                            className="h-4 w-4 text-gray-400"
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 20 20"
                            fill="currentColor"
                            aria-hidden="true"
                        >
                            <path
                                fillRule="evenodd"
                                d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
                                clipRule="evenodd"
                            />
                        </svg>
                    </ComboboxButton>
                </div>
                <ComboboxOptions className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white dark:bg-gray-800 py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
                    {availableOptions.length === 0 ? (
                        <div className="relative cursor-default select-none py-2 px-4 text-gray-700 dark:text-gray-300">
                            {query ? "No results found" : "Type to search"}
                        </div>
                    ) : (
                        availableOptions.map((option) => (
                            <ComboboxOption
                                key={option.value}
                                value={option.value}
                                className={({ active }) =>
                                    `relative cursor-default select-none py-2 pl-10 pr-4 ${
                                        active
                                            ? "bg-blue-600 text-white"
                                            : "text-gray-900 dark:text-gray-300"
                                    }`
                                }
                            >
                                {({ selected, active }) => (
                                    <>
                                        <span
                                            className={`block truncate ${
                                                selected
                                                    ? "font-medium"
                                                    : "font-normal"
                                            }`}
                                        >
                                            {option.label}
                                        </span>
                                        {selected ? (
                                            <span
                                                className={`absolute inset-y-0 left-0 flex items-center pl-3 ${
                                                    active
                                                        ? "text-white"
                                                        : "text-blue-600"
                                                }`}
                                            >
                                                <CheckCircle2
                                                    className="h-5 w-5"
                                                    aria-hidden="true"
                                                />
                                            </span>
                                        ) : null}
                                    </>
                                )}
                            </ComboboxOption>
                        ))
                    )}
                </ComboboxOptions>
            </Combobox>
        </div>
    );
};

export default FormField;
