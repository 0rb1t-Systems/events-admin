import React from "react";

export interface StatusFilterOption {
    value: string;
    label: string;
}

interface Props {
    options: StatusFilterOption[];
    value: string;
    onChange: (value: string) => void;
    /** Extra filters (date pickers, comboboxes) aligned to the right of the pills. */
    extra?: React.ReactNode;
}

/**
 * Shared status filter row: filled pill for the active value.
 * Place between page title/actions and the table.
 */
const StatusFilterBar: React.FC<Props> = ({ options, value, onChange, extra }) => {
    return (
        <div className="mb-4 mt-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap gap-2">
                {options.map((option) => {
                    const active = value === option.value;
                    return (
                        <button
                            key={option.value || "all"}
                            type="button"
                            className={`btn btn-sm gap-1 ${
                                active ? "btn-primary" : "btn-outline-primary"
                            }`}
                            onClick={() => onChange(option.value)}
                        >
                            {option.label}
                        </button>
                    );
                })}
            </div>
            {extra ? <div className="flex flex-wrap items-end gap-2">{extra}</div> : null}
        </div>
    );
};

export default StatusFilterBar;
