import React from "react";

interface ActivityItemProps {
    title: string;
    description?: string;
    time: string;
    status?: "pending" | "completed" | "in-progress";
    onClick?: () => void;
}

const ActivityItem: React.FC<ActivityItemProps> = ({
    title,
    description,
    time,
    status,
    onClick,
}) => {
    const statusColors = {
        pending: "bg-primary",
        completed: "bg-success",
        "in-progress": "bg-warning",
    };

    const statusBadges = {
        pending: "badge-outline-primary",
        completed: "badge-outline-success",
        "in-progress": "badge-outline-warning",
    };

    const statusLabels = {
        pending: "Pending",
        completed: "Completed",
        "in-progress": "In Progress",
    };

    return (
        <div
            className={`flex items-center py-1.5 relative group ${
                onClick ? "cursor-pointer" : ""
            }`}
            onClick={onClick}
        >
            <div
                className={`${
                    status ? statusColors[status] : "bg-gray-400"
                } w-1.5 h-1.5 rounded-full ltr:mr-1 rtl:ml-1.5`}
            ></div>
            <div className="flex-1">
                <div className="font-semibold">{title}</div>
                {description && (
                    <div className="text-xs text-gray-500">{description}</div>
                )}
            </div>
            <div className="ltr:ml-auto rtl:mr-auto text-xs text-white-dark dark:text-gray-500">
                {time}
            </div>

            {status && (
                <span
                    className={`badge ${statusBadges[status]} absolute ltr:right-0 rtl:left-0 text-xs bg-${status}-light dark:bg-black opacity-0 group-hover:opacity-100`}
                >
                    {statusLabels[status]}
                </span>
            )}
        </div>
    );
};

export default ActivityItem;
