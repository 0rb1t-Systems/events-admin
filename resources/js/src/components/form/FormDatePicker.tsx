import React, { useState, useEffect, useRef } from "react";
import Flatpickr from "react-flatpickr";
import "flatpickr/dist/flatpickr.css";
import { useSelector } from "react-redux";
import { IRootState } from "../../store";
import { Calendar } from "lucide-react";

interface FormDatePickerProps {
    id: string;
    label: string;
    error?: string;
    value: string | Date;
    onChange: (date: Date[]) => void;
    onBlur?: () => void;
    disabled?: boolean;
    placeholder?: string;
    className?: string;
    required?: boolean;
    helpText?: string;
    dateFormat?: string;
    name?: string;
    "data-testid"?: string;
}

const FormDatePicker: React.FC<FormDatePickerProps> = ({
    id,
    label,
    error,
    value,
    onChange,
    onBlur,
    disabled = false,
    placeholder = "Select date",
    className = "",
    required = false,
    helpText,
    dateFormat = "Y-m-d",
    name,
    "data-testid": dataTestId,
}) => {
    const isRtl = useSelector((state: IRootState) => state.themeConfig.rtlClass) === 'rtl';
    const flatpickrRef = useRef<any>(null);

    // Add custom styles to make sure Flatpickr takes full width
    useEffect(() => {
        if (flatpickrRef.current) {
            // Get the parent wrapper div that Flatpickr creates
            const wrapper = flatpickrRef.current.flatpickr.calendarContainer?.parentElement;
            if (wrapper) {
                wrapper.style.width = '100%';
                wrapper.style.display = 'block';

                // Also target the direct input element
                const inputElement = wrapper.querySelector('input');
                if (inputElement) {
                    inputElement.style.width = '100%';
                }
            }
        }
    }, [flatpickrRef.current]);

    return (
        <div className="space-y-2 w-full">
            <label
                htmlFor={id}
                className={`block text-sm font-medium ${
                    error ? "text-red-500" : "text-gray-700 dark:text-gray-300"
                }`}
            >
                {label}
                {required && <span className="text-red-500 ltr:ml-1 rtl:mr-1">*</span>}
            </label>
            <div className={`relative ${error ? 'has-error' : ''} w-full`}>
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none z-10">
                    <Calendar
                        className={`h-5 w-5 ${
                            error ? "text-red-500" : "text-gray-400"
                        }`}
                    />
                </div>
                <div className="w-full" style={{ display: 'block', width: '100%',  }}>
                    <Flatpickr
                        id={id}
                        name={name}
                        value={value}
                        options={{
                            dateFormat: dateFormat,
                            position: isRtl ? 'auto right' : 'auto left',
                            static: true,
                            disableMobile: true,
                        }}
                        onChange={(dates) => onChange(dates)}
                        onClose={onBlur}
                        aria-invalid={error ? "true" : "false"}
                        data-testid={dataTestId}
                        ref={flatpickrRef}
                        className={`
                            form-input w-full
                            pl-11 pr-10 py-2.5
                            border-2 rounded-lg text-sm
                            ${!disabled ? "cursor-pointer" : ""}
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
                        placeholder={placeholder}
                        disabled={disabled}
                    />
                </div>
            </div>
            {error && (
                <p className="text-sm text-red-500 mt-1" role="alert">
                    {error}
                </p>
            )}
            {helpText && !error && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {helpText}
                </p>
            )}
        </div>
    );
};

export default FormDatePicker;
