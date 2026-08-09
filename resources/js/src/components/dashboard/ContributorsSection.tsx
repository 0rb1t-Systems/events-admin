import React from "react";
import { Loader2, User } from "lucide-react";
import ContributorCard from "./ContributorCard";

interface Contributor {
    id: number;
    name: string;
    word_entries_count: number;
}

interface ContributorsSectionProps {
    loading: boolean;
    contributors: Contributor[];
}

const ContributorsSection: React.FC<ContributorsSectionProps> = ({
    loading,
    contributors,
}) => {
    return (
        <div className="panel h-full xl:col-span-1">
            <div className="mb-5">
                <h5 className="font-semibold text-lg dark:text-white-light">
                    Top Contributors
                </h5>
                <p className="text-xs text-gray-500">
                    Users with most word entries
                </p>
            </div>

            {loading ? (
                <div className="flex items-center justify-center h-[400px]">
                    <Loader2 className="animate-spin h-8 w-8 text-primary" />
                </div>
            ) : (
                <div className="space-y-4 max-h-[450px] overflow-y-auto pr-2">
                    {contributors.slice(0, 5).map((contributor, index) => (
                        <ContributorCard
                            key={contributor.id}
                            contributor={contributor}
                            index={index}
                        />
                    ))}

                    {contributors.length === 0 && (
                        <div className="text-center py-8 text-gray-500 dark:text-gray-400 h-[400px] flex items-center justify-center">
                            <div>
                                <User className="w-12 h-12 mx-auto mb-4 text-gray-400 opacity-50" />
                                No contributor data available
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default ContributorsSection;
