import React from "react";

export const EventField = ({
    label,
    children,
}: {
    label: string;
    children: React.ReactNode;
}) => (
    <div>
        <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            {label}
        </label>
        <div className="mt-1 text-sm font-medium text-gray-900 dark:text-white">{children}</div>
    </div>
);

export const EventMetricCard = ({
    label,
    value,
}: {
    label: string;
    value: React.ReactNode;
}) => (
    <div className="panel p-4">
        <div className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            {label}
        </div>
        <div className="mt-2 text-xl font-semibold text-gray-900 dark:text-white">{value}</div>
    </div>
);

export default EventField;
