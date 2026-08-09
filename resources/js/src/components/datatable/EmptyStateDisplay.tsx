import React from "react";
import { AlertCircle, Loader2, Info } from "lucide-react";

interface EmptyStateDisplayProps {
    message: string;
    subMessage?: string;
    isError?: boolean;
    isLoading?: boolean;
    icon?: React.ReactNode;
    onRetry?: () => void;
    onClearFilters?: () => void;
    search?: string;
}

const EmptyStateDisplay: React.FC<EmptyStateDisplayProps> = ({
    message,
    subMessage,
    isError = false,
    isLoading = false,
    icon,
    onRetry,
    onClearFilters,
    search,
}) => {
    // Default icons for different states
    const defaultIcon = isError ? (
        <AlertCircle size={40} />
    ) : isLoading ? (
        <Loader2 size={40} className="animate-spin" />
    ) : (
        <Info size={40} />
    );

    // Default sub-messages based on state
    const defaultSubMessage = isError
        ? "Please verify your input or try again later"
        : isLoading
        ? "Retrieving data..."
        : "Adjust your filters or try a different search term";

    return (
        <div className="flex items-center justify-center min-h-[240px] w-full py-6">
            <div className="flex flex-col items-center max-w-md mx-auto px-4">
                <div
                    className={`flex items-center justify-center mb-4 ${
                        isError
                            ? "text-red-500 dark:text-red-400"
                            : isLoading
                            ? "text-primary dark:text-primary-400"
                            : "text-gray-400 dark:text-gray-500"
                    }`}
                >
                    {icon || defaultIcon}
                </div>

                <h3
                    className={`text-base font-medium mb-2 text-center ${
                        isError
                            ? "text-red-600 dark:text-red-400"
                            : "text-gray-900 dark:text-gray-100"
                    }`}
                >
                    {message}
                </h3>

                <p className="text-sm text-gray-500 dark:text-gray-400 text-center mb-6">
                    {subMessage || defaultSubMessage}
                </p>

                {!isLoading && (
                    <div className="flex justify-center gap-3 pointer-events-auto z-10">
                        {search && onClearFilters && (
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onClearFilters();
                                }}
                                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200"
                            >
                                Clear Filters
                            </button>
                        )}
                        {isError && onRetry && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onRetry();
                                }}
                                className="px-4 py-2 text-sm font-medium text-white bg-red-500 hover:bg-red-600 rounded-md transition-colors duration-200"
                            >
                                Try Again
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default EmptyStateDisplay;
