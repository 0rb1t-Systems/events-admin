import React, { useState, useEffect } from 'react';
import debounce from 'lodash/debounce';

interface DebouncedInputProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    className?: string;
    debounceTimeout?: number;
}

const DebouncedInput: React.FC<DebouncedInputProps> = ({
    value,
    onChange,
    placeholder = 'Search...',
    className = 'form-input w-auto',
    debounceTimeout = 500,
}) => {
    const [inputValue, setInputValue] = useState(value);

    // Update local state when the external value changes
    useEffect(() => {
        setInputValue(value);
    }, [value]);

    // Create a debounced function that calls the onChange
    const debouncedChange = React.useMemo(
        () => debounce((value: string) => {
            onChange(value);
        }, debounceTimeout),
        [onChange, debounceTimeout]
    );

    // Clean up the debounce on unmount
    useEffect(() => {
        return () => {
            debouncedChange.cancel();
        };
    }, [debouncedChange]);

    // Handle the input change
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newValue = e.target.value;
        setInputValue(newValue);
        debouncedChange(newValue);
    };

    return (
        <input
            type="text"
            value={inputValue}
            onChange={handleChange}
            placeholder={placeholder}
            className={className}
        />
    );
};

export default DebouncedInput;
