import React from "react";
import { ArrowUpRight, ChevronsRight } from "lucide-react";
import { Link } from "react-router-dom";

interface StatCardProps {
    title: string;
    count: number;
    previousCount: number;
    icon: React.ReactNode;
    linkTo: string;
    gradientColors: string;
    badgeText: string;
}

const StatCard: React.FC<StatCardProps> = ({
    title,
    count,
    previousCount,
    icon,
    linkTo,
    gradientColors,
    badgeText,
}) => {
    // Format percentage growth
    const formatGrowth = (current: number, previous: number): string => {
        if (previous === 0) return "∞%";
        const growth = ((current - previous) / previous) * 100;
        return growth > 0 ? `+${growth.toFixed(1)}%` : `${growth.toFixed(1)}%`;
    };

    // Check if growth is positive
    const isPositiveGrowth = (current: number, previous: number): boolean => {
        return current >= previous;
    };

    return (
        <div
            className={`panel p-0 ${gradientColors} text-white overflow-hidden`}
        >
            <div className="p-6">
                <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center">
                        {icon}
                        <h5 className="font-semibold text-lg">{title}</h5>
                    </div>
                    <span className="bg-white/20 text-white text-xs px-2 py-1 rounded-full">
                        {badgeText}
                    </span>
                </div>
                <div className="text-4xl font-bold">{count}</div>
                <div className="flex items-center mt-4">
                    <span
                        className={`text-xs px-2 py-1 rounded-full mr-2 ${
                            isPositiveGrowth(count, previousCount)
                                ? "bg-green-400/20"
                                : "bg-red-400/20"
                        }`}
                    >
                        {isPositiveGrowth(count, previousCount) ? (
                            <ArrowUpRight size={12} className="inline mr-1" />
                        ) : (
                            <ArrowUpRight
                                size={12}
                                className="inline mr-1 rotate-180"
                            />
                        )}
                        {formatGrowth(count, previousCount)}
                    </span>
                    <span className="text-xs text-white/80">vs last month</span>
                </div>
            </div>
            <div className="h-12 bg-white/10">
                <Link
                    to={linkTo}
                    className="flex items-center justify-center h-full text-sm hover:bg-white/20 transition"
                >
                    View {title} <ChevronsRight size={16} className="ml-1" />
                </Link>
            </div>
        </div>
    );
};

export default StatCard;
