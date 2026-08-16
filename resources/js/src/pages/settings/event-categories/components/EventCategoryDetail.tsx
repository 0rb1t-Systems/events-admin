import { useQuery } from "@tanstack/react-query";
import moment from "moment";
import React from "react";
import Loader from "../../../../components/Loader";
import { eventCategoryApi } from "../../../../services/eventCategory";

interface Props {
    categoryId?: number | null;
}

const EventCategoryDetail: React.FC<Props> = ({ categoryId }) => {
    const { data, isLoading, error } = useQuery({
        queryKey: ["event-category", categoryId],
        queryFn: () => eventCategoryApi.getById(categoryId!),
        enabled: !!categoryId,
    });

    if (!categoryId) {
        return <div className="p-6 text-center text-gray-500">Select a category</div>;
    }
    if (isLoading) {
        return (
            <div className="p-6">
                <Loader />
            </div>
        );
    }
    if (error || !data) {
        return <div className="p-6 text-center text-red-500">Failed to load</div>;
    }

    return (
        <div className="space-y-3 p-6 text-sm">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{data.name}</h3>
            <div>
                <div className="text-xs uppercase text-gray-500">ID</div>
                <div className="text-gray-900 dark:text-white">{data.id}</div>
            </div>
            <div>
                <div className="text-xs uppercase text-gray-500">Created</div>
                <div className="text-gray-900 dark:text-white">
                    {data.created_at ? moment(data.created_at).format("MMM DD, YYYY HH:mm") : "—"}
                </div>
            </div>
        </div>
    );
};

export default EventCategoryDetail;
