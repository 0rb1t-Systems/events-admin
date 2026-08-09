import React from "react";

interface ContentTypeCardProps {
    name: string;
    count: number;
    icon: React.ReactNode;
    index: number;
}

const ContentTypeCard: React.FC<ContentTypeCardProps> = ({
    name,
    count,
    icon,
    index,
}) => {
    // Dynamically determine background color class based on index
    const bgColorClasses = [
        "bg-success-light text-success dark:bg-success/20",
        "bg-secondary-light text-secondary dark:bg-secondary/20",
        "bg-primary-light text-primary dark:bg-primary/20",
        "bg-danger-light text-danger dark:bg-danger/20",
        "bg-warning-light text-warning dark:bg-warning/20",
        "bg-info-light text-info dark:bg-info/20",
    ];

    // Dynamically determine progress bar color
    const progressBarColors = [
        "bg-success",
        "bg-secondary",
        "bg-primary",
        "bg-danger",
        "bg-warning",
        "bg-info",
    ];

    // Dynamically determine badge color
    const badgeColors = [
        "bg-success/10 text-success",
        "bg-warning/10 text-warning",
        "bg-info/10 text-info",
    ];

    return (
        <div className="panel bg-white dark:bg-black p-5 border border-gray-200 dark:border-gray-700 rounded-md">
            <div className="flex items-center justify-between mb-5">
                <div className="flex items-center">
                    <div
                        className={`w-12 h-12 rounded-lg grid place-content-center ${
                            bgColorClasses[index % bgColorClasses.length]
                        }`}
                    >
                        {icon}
                    </div>
                    <div className="ml-3">
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            {name}
                        </p>
                        <h5 className="text-xl font-bold dark:text-white">
                            {count}
                        </h5>
                    </div>
                </div>
                <div
                    className={`py-1 px-2 rounded-full text-xs ${
                        badgeColors[index % badgeColors.length]
                    }`}
                >
                    {index % 3 === 0 ? "+10%" : index % 3 === 1 ? "+5%" : "+7%"}
                </div>
            </div>
            <div className="h-1 bg-gray-200 dark:bg-gray-700 rounded-full">
                <div
                    className={`h-1 rounded-full ${
                        progressBarColors[index % progressBarColors.length]
                    }`}
                    style={{
                        width: `${Math.min(100, count * 10)}%`,
                    }}
                ></div>
            </div>
        </div>
    );
};

export default ContentTypeCard;
