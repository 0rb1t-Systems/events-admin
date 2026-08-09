import React, { useState, useEffect } from "react";
import {
    Menu,
    Button,
    Divider,
    Text,
    Group,
    Badge,
    Switch,
} from "@mantine/core";
import { Columns, Eye, EyeOff } from "lucide-react";
import { ColumnConfig } from "../../types/columns";

interface ColumnVisibilityToggleProps<T> {
    columns: ColumnConfig<T>[];
    onChange: (updatedColumns: ColumnConfig<T>[]) => void;
}

function ColumnVisibilityToggle<T>({
    columns,
    onChange,
}: ColumnVisibilityToggleProps<T>) {
    const [visibleColumns, setVisibleColumns] = useState<
        Record<string, boolean>
    >(
        columns.reduce((acc, column) => {
            acc[column.accessor] = !column.hidden;
            return acc;
        }, {} as Record<string, boolean>)
    );

    // Sync component state with prop changes
    useEffect(() => {
        const newState = columns.reduce((acc, column) => {
            acc[column.accessor] = !column.hidden;
            return acc;
        }, {} as Record<string, boolean>);

        setVisibleColumns(newState);
    }, [columns]);

    const handleToggle = (columnAccessor: string, e?: React.MouseEvent) => {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }

        const newVisibleColumns = {
            ...visibleColumns,
            [columnAccessor]: !visibleColumns[columnAccessor],
        };

        // Update local state
        setVisibleColumns(newVisibleColumns);

        // Update parent component with new column configurations
        const updatedColumns = columns.map((column) => ({
            ...column,
            hidden:
                column.accessor === columnAccessor
                    ? !newVisibleColumns[columnAccessor]
                    : !newVisibleColumns[column.accessor],
        }));

        onChange(updatedColumns);
    };

    const selectAll = () => {
        const newVisibleColumns = { ...visibleColumns };
        Object.keys(newVisibleColumns).forEach((key) => {
            newVisibleColumns[key] = true;
        });

        setVisibleColumns(newVisibleColumns);

        const updatedColumns = columns.map((column) => ({
            ...column,
            hidden: false,
        }));

        onChange(updatedColumns);
    };

    const unselectAll = () => {
        // Get list of columns that should always be visible (like action columns)
        const actionsColumns = columns
            .filter((col) => col.type === "actions")
            .map((col) => col.accessor);

        const newVisibleColumns = { ...visibleColumns };
        Object.keys(newVisibleColumns).forEach((key) => {
            // Keep action columns visible
            newVisibleColumns[key] = actionsColumns.includes(key);
        });

        setVisibleColumns(newVisibleColumns);

        const updatedColumns = columns.map((column) => ({
            ...column,
            hidden: !actionsColumns.includes(column.accessor),
        }));

        onChange(updatedColumns);
    };

    const visibleCount = Object.values(visibleColumns).filter(Boolean).length;
    const totalCount = Object.keys(visibleColumns).length;
    const percentage = Math.round((visibleCount / totalCount) * 100);

    return (
        <Menu
            shadow="md"
            width={270}
            position="bottom-end"
            radius="md"
            closeOnItemClick={false}
        >
            <Menu.Target>
                <Button
                    variant="outline"
                    size="sm"
                    leftIcon={<Columns size={16} />}
                    radius="md"
                    color="blue"
                    className="p-2 transition-colors duration-300"
                >
                    Columns
                </Button>
            </Menu.Target>

            <Menu.Dropdown className="bg-white p-0 rounded-md shadow-lg border border-gray-100 dark:bg-gray-800 dark:border-gray-700">
                <div className="p-3 bg-blue-50 dark:bg-blue-900/50">
                    <Text
                        size="sm"
                        weight={600}
                        className="text-blue-700 dark:text-blue-200 mb-1"
                    >
                        Column Visibility
                    </Text>
                    <Badge
                        color="blue"
                        size="sm"
                        variant="filled"
                        radius="sm"
                        className="mt-1"
                    >
                        {percentage}%
                    </Badge>
                </div>

                <div className="p-2">
                    <Group className="mb-1">
                        <Button
                            onClick={selectAll}
                            leftIcon={<Eye size={14} />}
                            compact
                            variant="subtle"
                            color="blue"
                            radius="sm"
                            className="text-left justify-start dark:text-blue-200"
                        >
                            Show all columns
                        </Button>

                        <Button
                            onClick={unselectAll}
                            leftIcon={<EyeOff size={14} />}
                            compact
                            variant="subtle"
                            color="gray"
                            radius="sm"
                            disabled={visibleCount <= 1}
                            className="text-left justify-start dark:text-blue-200"
                        >
                            Hide all columns
                        </Button>
                    </Group>
                </div>

                <Divider className="my-0" />

                <div
                    style={{ maxHeight: "300px", overflowY: "auto" }}
                    className="p-0"
                >
                    {columns.map((column) => (
                        <div
                            key={column.accessor}
                            className="flex items-center justify-between px-3 py-2 hover:bg-blue-50/30 cursor-pointer dark:hover:bg-blue-900/50"
                            onClick={(e) => handleToggle(column.accessor, e)}
                        >
                            <Text size="sm" className="font-medium flex-1">
                                {column.title}
                            </Text>
                            <Switch
                                checked={
                                    visibleColumns[column.accessor] ?? false
                                }
                                onChange={(e) => {
                                    e.stopPropagation();
                                    handleToggle(column.accessor);
                                }}
                                onClick={(e) => e.stopPropagation()}
                                size="xs"
                                color="blue"
                                styles={{
                                    root: {
                                        display: "flex",
                                        alignItems: "center",
                                    },
                                    track: {
                                        cursor: "pointer",
                                        width: "28px",
                                        height: "16px",
                                        backgroundColor: visibleColumns[
                                            column.accessor
                                        ]
                                            ? "var(--mantine-color-blue-6)"
                                            : "var(--mantine-color-gray-3)",
                                    },
                                    thumb: {
                                        width: "12px",
                                        height: "12px",
                                    },
                                }}
                            />
                        </div>
                    ))}
                </div>
            </Menu.Dropdown>
        </Menu>
    );
}

export default ColumnVisibilityToggle;
