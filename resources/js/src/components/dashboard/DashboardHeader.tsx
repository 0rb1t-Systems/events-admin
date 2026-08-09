import React from "react";
import { Clock } from "lucide-react";
import { Link } from "react-router-dom";

interface DashboardHeaderProps {
    dataRefreshTimestamp: string;
    onRefresh: () => void;
}

const DashboardHeader: React.FC<DashboardHeaderProps> = ({
    dataRefreshTimestamp,
    onRefresh,
}) => {
    return (
        <div className="flex items-center justify-between mb-5">
            <ul className="flex space-x-2 rtl:space-x-reverse">
                <li>
                    <Link to="/" className="text-primary hover:underline">
                        Dashboard
                    </Link>
                </li>
                <li className="before:content-['/'] ltr:before:mr-2 rtl:before:ml-2">
                    <span>Qaamus</span>
                </li>
            </ul>

            <div className="flex items-center space-x-3">
                <button
                    className="btn btn-outline-primary flex items-center"
                    onClick={onRefresh}
                >
                    <span className="ltr:mr-2 rtl:ml-2">Refresh</span>
                    <Clock size={18} />
                </button>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                    Last updated: {dataRefreshTimestamp}
                </div>
            </div>
        </div>
    );
};

export default DashboardHeader;
