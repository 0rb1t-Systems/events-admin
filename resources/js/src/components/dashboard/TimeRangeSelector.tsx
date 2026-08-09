import React from "react";

type TimeRange = "week" | "month" | "year";

interface TimeRangeSelectorProps {
    activeTimeRange: TimeRange;
    onRangeChange: (range: TimeRange) => void;
}

const TimeRangeSelector: React.FC<TimeRangeSelectorProps> = ({
    activeTimeRange,
    onRangeChange,
}) => {
    return (
        <div className="flex items-center">
            <span className="text-xs text-gray-500 mr-2">View by:</span>
            <div className="bg-white dark:bg-black rounded-full p-1 flex space-x-1">
                {["week", "month", "year"].map((range) => (
                    <button
                        key={range}
                        className={`px-3 py-1 text-xs rounded-full ${
                            activeTimeRange === range
                                ? "bg-primary text-white"
                                : "bg-transparent text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700"
                        }`}
                        onClick={() => onRangeChange(range as TimeRange)}
                    >
                        {range.charAt(0).toUpperCase() + range.slice(1)}
                    </button>
                ))}
            </div>
        </div>
    );
};

export default TimeRangeSelector;
