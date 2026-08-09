import { DataTableColumn } from "mantine-datatable";
import { ColumnConfig, StatusOption } from "../types/columns";
import { Eye, Edit, Trash2, RotateCcw, Shield } from "lucide-react";
import React from "react";
import ToggleSwitch from "../components/ToggleSwitch";

export function createColumn<T>(config: ColumnConfig<T>): DataTableColumn<T> {
    const baseColumn: DataTableColumn<T> = {
        accessor: config.accessor,
        title: config.title,
        sortable: config.sortable ?? true,
        width: config.width,
        textAlignment: config.textAlignment,
        hidden: config.hidden,
    };

    if (config.type === "text") {
        return {
            ...baseColumn,
            render: (record: T) => {
                const value = record[config.accessor as keyof T];
                if (config.render) {
                    return config.render(record);
                }
                return String(value);
            },
        };
    }

    if (config.type === "number") {
        return {
            ...baseColumn,
            render: (record: T) => {
                const value = record[config.accessor as keyof T];
                if (config.render) {
                    return config.render(record);
                }
                return config.format
                    ? config.format(Number(value))
                    : String(value);
            },
        };
    }

    if (config.type === "date") {
        return {
            ...baseColumn,
            render: (record: T) => {
                const value = record[config.accessor as keyof T];
                if (config.render) {
                    return config.render(record);
                }
                const date = new Date(value as any);
                return config.format
                    ? config.format(date)
                    : date.toLocaleDateString();
            },
        };
    }

    if (config.type === "boolean") {
        return {
            ...baseColumn,
            render: (record: T) => {
                const value = record[config.accessor as keyof T];
                if (config.render) {
                    return config.render(record);
                }
                return value
                    ? config.trueText || "Yes"
                    : config.falseText || "No";
            },
        };
    }

    if (config.type === "custom") {
        return {
            ...baseColumn,
            render: config.render,
        };
    }

    if (config.type === "status") {
        return {
            ...baseColumn,
            render: (record: T) => {
                if (config.render) {
                    return config.render(record);
                }

                let statusData: { value: string; label: string; color: string };

                // If valueAccessor is provided, use it to get status data
                if (config.valueAccessor) {
                    statusData = config.valueAccessor(record);
                } else {
                    // Otherwise, assume the value is directly accessible or is an object with value, label, color properties
                    const value = record[config.accessor as keyof T];

                    if (typeof value === 'object' && value !== null && 'value' in value && 'label' in value && 'color' in value) {
                        // If value is an object with the expected properties
                        statusData = value as any;
                    } else if (typeof value === 'string' && config.options) {
                        // If value is a string, look up the corresponding option
                        const option = config.options.find(opt => opt.value === value);
                        if (option) {
                            statusData = option;
                        } else {
                            // Fallback if no matching option is found
                            return String(value);
                        }
                    } else {
                        // Fallback for unexpected value format
                        return String(value);
                    }
                }

                return React.createElement(
                    "span",
                    {
                        className: `badge badge-outline-${statusData.color}`,
                        style: {
                            color: statusData.value === 'inactive' ? '#dc2626' : '',
                            borderColor: statusData.value === 'inactive' ? '#dc2626' : ''
                        }
                    },
                    statusData.label
                );
            },
        };
    }

    if (config.type === "actions") {
        return {
            ...baseColumn,
            render: (record: T) => {
                const defaultIcons: Record<string, React.ReactElement> = {
                    view: React.createElement(Eye, { size: 18 }),
                    edit: React.createElement(Edit, { size: 18 }),
                    delete: React.createElement(Trash2, { size: 18 }),
                    restore: React.createElement(RotateCcw, { size: 18 }),
                    permissions: React.createElement(Shield, { size: 18 }),
                };

                const getButtonVariant = (type: string) => {
                    switch (type) {
                        case "delete":
                            return "btn-outline-danger";
                        case "restore":
                            return "btn-outline-success";
                        case "edit":
                            return "btn-outline-info";
                        case "view":
                            return "btn-outline-primary";
                        case "permissions":
                            return "btn-outline-warning";
                        default:
                            return "btn-outline-secondary";

                    }
                };

                const actions = config.actions
                    .map((action, index) => {
                        if (action.show && !action.show(record)) {
                            return null;
                        }

                        const icon =
                            action.icon ||
                            (config.defaultIcons !== false
                                ? defaultIcons[action.type]
                                : null);
                        const buttonVariant = getButtonVariant(action.type);

                        return React.createElement(
                            "button",
                            {
                                key: index,
                                type: "button",
                                className: `btn btn-sm ${buttonVariant} p-1.5 rounded-md hover:shadow-sm ${
                                    action.className || ""
                                }`,
                                onClick: () => action.onClick(record),
                                title: action.label || action.type,
                            },
                            icon
                        );
                    })
                    .filter(Boolean);

                return React.createElement(
                    "div",
                    { className: "flex items-center justify-center space-x-2" },
                    actions
                );
            },
        };
    }

    if (config.type === "toggle") {
        return {
            ...baseColumn,
            render: (record: T) => {
                if (config.render) {
                    return config.render(record);
                }

                const value = record[config.accessor as keyof T];
                return React.createElement(ToggleSwitch, {
                    checked: Boolean(value),
                    disabled: config.isLoading,
                    onChange: () => config.onChange(record, !Boolean(value)),
                });
            },
        };
    }

    return baseColumn;
}
