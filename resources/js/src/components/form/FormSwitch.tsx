import React from "react";

interface FormSwitchProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange" | "checked" | "size"> {
    label: string;
    error?: string;
    checked: boolean;
    onChange: (checked: boolean) => void;
    onBlur: () => void;
    disabled?: boolean;
    size?: 'sm' | 'md' | 'lg';
}

const FormSwitch: React.FC<FormSwitchProps> = ({
    label,
    error,
    className = "",
    checked,
    onChange,
    onBlur,
    disabled = false,
    size = 'md',
    ...props
}) => {
    // Size mappings
    const sizeClasses = {
        sm: {
            wrapper: "w-7 h-4",
            handle: "before:w-3 before:h-3 ltr:peer-checked:before:left-3.5 rtl:peer-checked:before:right-3.5"
        },
        md: {
            wrapper: "w-9 h-5",
            handle: "before:w-4 before:h-4 ltr:peer-checked:before:left-4.5 rtl:peer-checked:before:right-4.5"
        },
        lg: {
            wrapper: "w-11 h-6",
            handle: "before:w-5 before:h-5 ltr:peer-checked:before:left-5.5 rtl:peer-checked:before:right-5.5"
        }
    };

    const classes = sizeClasses[size];

    return (
        <div className="space-y-2">
            <div className="flex items-center gap-4">
                <label
                    htmlFor={props.id}
                    className={`flex-grow text-sm font-medium cursor-pointer ${error ? "text-red-500" : "text-gray-700 dark:text-gray-300"
                        }`}
                >
                    {label}
                </label>
                <label className={`${classes.wrapper} relative cursor-pointer mb-0 ${disabled ? 'opacity-60' : ''}`}>
                    <input
                        type="checkbox"
                        className="peer absolute w-full h-full opacity-0 z-10 focus:ring-0 focus:outline-none cursor-pointer"
                        checked={checked}
                        onChange={() => !disabled && onChange(!checked)}
                        onBlur={onBlur}
                        disabled={disabled}
                        onClick={(e) => e.stopPropagation()}
                        id={props.id}
                        {...props}
                    />
                    <span className={`rounded-full border border-[#adb5bd] bg-white peer-checked:bg-primary peer-checked:border-primary dark:bg-dark block h-full before:absolute ltr:before:left-0.5 rtl:before:right-0.5 ${classes.handle} peer-checked:before:bg-white before:bg-[#adb5bd] dark:before:bg-white-dark before:bottom-[2px] before:rounded-full before:transition-all before:duration-300`}></span>
                </label>
            </div>
            {error && (
                <p className="text-sm text-red-500 mt-1" role="alert">
                    {error}
                </p>
            )}
        </div>
    );
};

export default FormSwitch;
