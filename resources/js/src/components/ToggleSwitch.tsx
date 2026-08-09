import React from "react";

interface ToggleSwitchProps {
    checked: boolean;
    onChange: () => void;
    size?: 'sm' | 'md' | 'lg';
    disabled?: boolean;
}

const ToggleSwitch: React.FC<ToggleSwitchProps> = ({
    checked,
    onChange,
    size = 'md',
    disabled = false,
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
        <div className="flex justify-center">
            <label className={`${classes.wrapper} relative cursor-pointer mb-0 ${disabled ? 'opacity-60' : ''}`}>
                <input

                    type="checkbox"
                    className="peer absolute w-full h-full opacity-0 z-10 focus:ring-0 focus:outline-none cursor-pointer"
                    checked={checked}
                    onChange={onChange}
                    onClick={(e) => e.stopPropagation()}
                    disabled={disabled}
                />
                <span className={`rounded-full border border-[#adb5bd] bg-white peer-checked:bg-primary peer-checked:border-primary dark:bg-dark block h-full before:absolute ltr:before:left-0.5 rtl:before:right-0.5 ${classes.handle} peer-checked:before:bg-white before:bg-[#adb5bd] dark:before:bg-white-dark before:bottom-[2px] before:rounded-full before:transition-all before:duration-300`}></span>
            </label>
        </div>
    );
};

export default ToggleSwitch;
