import React from "react";
import { Award, FileText } from "lucide-react";

interface Contributor {
    id: number;
    name: string;
    word_entries_count: number;
}

interface ContributorCardProps {
    contributor: Contributor;
    index: number;
}

const ContributorCard: React.FC<ContributorCardProps> = ({
    contributor,
    index,
}) => {
    // Dynamically determine background color class based on index
    const bgColorClasses = [
        "bg-success-light text-success",
        "bg-warning-light text-warning",
        "bg-danger-light text-danger",
        "bg-primary-light text-primary",
        "bg-info-light text-info",
    ];

    // Dynamically determine badge color
    const badgeColors = [
        "bg-success/10 text-success",
        "bg-warning/10 text-warning",
        "bg-danger/10 text-danger",
        "bg-primary/10 text-primary",
        "bg-info/10 text-info",
    ];

    return (
        <div className="flex items-center p-3.5 rounded-md border border-gray-100 dark:border-gray-800 bg-white dark:bg-black">
            <div className="flex-none">
                <div
                    className={`w-12 h-12 rounded-full grid place-content-center ${
                        bgColorClasses[index % bgColorClasses.length]
                    }`}
                >
                    {index === 0 && <Award size={20} />}
                    {index !== 0 && (
                        <span className="text-lg font-bold">{index + 1}</span>
                    )}
                </div>
            </div>
            <div className="ltr:ml-3 rtl:mr-3 font-semibold">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                    #{index + 1} Contributor
                </p>
                <h5 className="text-base font-semibold dark:text-white-light">
                    {contributor.name}
                </h5>
                <div className="flex items-center text-xs text-gray-400 mt-1">
                    <FileText size={14} className="ltr:mr-1 rtl:ml-1" />
                    <span>{contributor.word_entries_count} entries</span>
                </div>
            </div>
            <div className="ltr:ml-auto rtl:mr-auto">
                <div
                    className={`py-1 px-2 rounded-full text-xs ${
                        badgeColors[index % badgeColors.length]
                    }`}
                >
                    {index === 0 ? "Top" : "Active"}
                </div>
            </div>
        </div>
    );
};

export default ContributorCard;
