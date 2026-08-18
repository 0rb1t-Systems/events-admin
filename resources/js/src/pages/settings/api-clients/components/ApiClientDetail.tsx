import React from "react";
import { useQuery } from "@tanstack/react-query";
import moment from "moment";
import Loader from "../../../../components/Loader";
import { apiClientApi } from "../../../../services/apiClient";

interface ApiClientDetailProps {
    clientId: number;
    onClose: () => void;
}

const ApiClientDetail: React.FC<ApiClientDetailProps> = ({ clientId }) => {
    const { data, isLoading, isError } = useQuery({
        queryKey: ["api-client", clientId],
        queryFn: () => apiClientApi.getById(clientId),
    });

    if (isLoading) {
        return <Loader />;
    }

    if (isError || !data) {
        return (
            <div className="p-4 text-center text-sm text-gray-500 dark:text-gray-400">
                Unable to load API client details.
            </div>
        );
    }

    return (
        <div className="space-y-4 p-1">
            <div>
                <p className="text-xs font-medium uppercase text-gray-500 dark:text-gray-400">
                    Client
                </p>
                <p className="text-base font-semibold text-gray-900 dark:text-white">{data.name}</p>
            </div>

            <div>
                <p className="text-xs font-medium uppercase text-gray-500 dark:text-gray-400">
                    Public key
                </p>
                <p className="break-all font-mono text-xs text-gray-700 dark:text-gray-200">
                    {data.public_key}
                </p>
            </div>

            <div>
                <p className="text-xs font-medium uppercase text-gray-500 dark:text-gray-400">
                    Status
                </p>
                <span
                    className={`badge ${
                        data.active ? "badge-outline-success" : "badge-outline-danger"
                    }`}
                >
                    {data.active ? "Active" : "Inactive"}
                </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
                <div>
                    <p className="text-xs font-medium uppercase text-gray-500 dark:text-gray-400">
                        Created
                    </p>
                    <p className="text-sm text-gray-700 dark:text-gray-200">
                        {moment(data.created_at).format("MMM DD, YYYY HH:mm")}
                    </p>
                </div>
                <div>
                    <p className="text-xs font-medium uppercase text-gray-500 dark:text-gray-400">
                        Updated
                    </p>
                    <p className="text-sm text-gray-700 dark:text-gray-200">
                        {moment(data.updated_at).format("MMM DD, YYYY HH:mm")}
                    </p>
                </div>
            </div>

            <div>
                <p className="text-xs font-medium uppercase text-gray-500 dark:text-gray-400">
                    ID
                </p>
                <p className="text-sm text-gray-700 dark:text-gray-200">#{data.id}</p>
            </div>

            <p className="rounded-lg bg-gray-50 p-3 text-xs text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                Secrets are never shown in Admin. Rotate the public key by updating{" "}
                <code className="font-mono">WEBAPP_API_PUBLIC_KEY</code>, then reseed.
            </p>
        </div>
    );
};

export default ApiClientDetail;
