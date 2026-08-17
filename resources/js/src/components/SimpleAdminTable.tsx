import React from "react";
import { clsx } from "clsx";

export interface SimpleAdminColumn {
    key: string;
    label: string;
    align?: "left" | "right" | "center";
    hideBelow?: "lg";
}

interface TableProps {
    columns: SimpleAdminColumn[];
    empty?: boolean;
    emptyText?: string;
    children: React.ReactNode;
}

const hideClass = (hideBelow?: "lg") =>
    hideBelow === "lg" ? "hidden lg:table-cell" : undefined;

/** Compact theme table for nested event-hub lists (not a full DataTable). */
const SimpleAdminTable: React.FC<TableProps> = ({
    columns,
    empty,
    emptyText = "No records",
    children,
}) => {
    return (
        <div className="admin-table-scroll rounded border border-white-light dark:border-[#1b2e4b]">
            <table className="w-full min-w-[640px] text-sm">
                <thead>
                    <tr className="bg-white-light/30 dark:bg-[#1a2941]">
                        {columns.map((col) => (
                            <th
                                key={col.key}
                                className={clsx(
                                    "whitespace-nowrap px-4 py-3 font-semibold text-gray-900 dark:text-white-dark",
                                    col.align === "right" && "text-right",
                                    col.align === "center" && "text-center",
                                    col.align !== "right" && col.align !== "center" && "text-left",
                                    hideClass(col.hideBelow)
                                )}
                            >
                                {col.label}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-[#1b2e4b]">
                    {empty ? (
                        <tr>
                            <td
                                colSpan={columns.length}
                                className="px-4 py-8 text-center text-gray-500 dark:text-gray-400"
                            >
                                {emptyText}
                            </td>
                        </tr>
                    ) : (
                        children
                    )}
                </tbody>
            </table>
        </div>
    );
};

export const SimpleAdminTd: React.FC<{
    children?: React.ReactNode;
    align?: "left" | "right" | "center";
    hideBelow?: "lg";
    className?: string;
}> = ({ children, align, hideBelow, className }) => (
    <td
        className={clsx(
            "px-4 py-3 text-gray-800 dark:text-white-light",
            !className?.includes("whitespace") && "whitespace-nowrap",
            align === "right" && "text-right",
            align === "center" && "text-center",
            hideClass(hideBelow),
            className
        )}
    >
        {children}
    </td>
);

export default SimpleAdminTable;
