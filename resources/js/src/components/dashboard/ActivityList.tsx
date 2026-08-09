import React from "react";
import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";

interface Activity {
    id: number;
    title: string;
    description: string;
    time: string;
    status: "completed" | "pending" | "in-progress";
}

interface ActivityListProps {
    title: string;
    activities: Activity[];
    viewAllLink?: string;
    onItemClick?: (activity: Activity) => void;
}

const ActivityList: React.FC<ActivityListProps> = ({
    title,
    activities,
    viewAllLink,
    onItemClick,
}) => {
    const getStatusColor = (status: Activity["status"]) => {
        switch (status) {
            case "completed":
                return "bg-success";
            case "pending":
                return "bg-warning";
            case "in-progress":
                return "bg-info";
            default:
                return "bg-success";
        }
    };

    return (
        <div className="bg-white dark:bg-black relative z-10 h-full">
            <div className="flex items-center justify-between mb-5">
                <h5 className="font-semibold text-lg dark:text-white-light">
                    {title}
                </h5>
                {viewAllLink && (
                    <Link
                        to={viewAllLink}
                        className="text-primary hover:underline font-semibold"
                    >
                        View All
                    </Link>
                )}
            </div>

            <div className="mb-5">
                {activities.length === 0 ? (
                    <p className="text-white-dark">No recent activities.</p>
                ) : (
                    <div className="space-y-4">
                        {activities.map((activity) => (
                            <div
                                key={activity.id}
                                className={`flex items-center p-3 border border-white-light dark:border-[#1b2e4b] rounded-md cursor-pointer transition-all duration-300 hover:shadow-[0_0_15px_1px_rgba(113,106,202,0.1)] dark:hover:shadow-none ${
                                    onItemClick ? "hover:bg-white-light/40 dark:hover:bg-[#1b2e4b]/40" : ""
                                }`}
                                onClick={
                                    onItemClick
                                        ? () => onItemClick(activity)
                                        : undefined
                                }
                            >
                                <span
                                    className={`${getStatusColor(
                                        activity.status
                                    )} w-2 h-2 rounded-full ltr:mr-3 rtl:ml-3`}
                                ></span>
                                <div className="flex-1">
                                    <h5 className="text-sm leading-5 dark:text-white-light font-semibold mb-1">
                                        {activity.title}
                                    </h5>
                                    <p className="text-white-dark text-xs">
                                        {activity.description}
                                    </p>
                                </div>
                                <div className="ltr:ml-auto rtl:mr-auto text-right">
                                    <p className="text-xs text-white-dark mb-1">
                                        {activity.time}
                                    </p>
                                    {onItemClick && (
                                        <ChevronRight className="w-4 h-4 text-gray-400" />
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default ActivityList;
