import React from "react";
import { CheckCircle2 } from "lucide-react";

interface FormActionsProps {
    onClose: () => void;
    isSubmitting: boolean;
    hasEntries: boolean;
}

const FormActions = ({
    onClose,
    isSubmitting,
    hasEntries,
}: FormActionsProps) => {
    return (
        <div className="flex justify-end gap-3">
            <button
                type="button"
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
                onClick={onClose}
            >
                Cancel
            </button>
            <button
                type="submit"
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 border border-transparent rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                disabled={isSubmitting || !hasEntries}
            >
                {isSubmitting ? (
                    <span className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Saving...
                    </span>
                ) : (
                    <span className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4" />
                        Save Entries
                    </span>
                )}
            </button>
        </div>
    );
};

export default FormActions;
