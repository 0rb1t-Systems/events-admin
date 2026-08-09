import { useQuery } from "@tanstack/react-query";
import moment from "moment";
import React from "react";
import { logsApi } from "../../../services/logs";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

interface LogDetailProps {
    logId: number | null;
    onClose?: () => void;
}

const LogDetail: React.FC<LogDetailProps> = ({ logId, onClose }) => {
    const {
        data: log,
        isLoading,
        isError,
    } = useQuery({
        queryKey: ["Log", logId],
        queryFn: () => logsApi.getById(logId!),
        enabled: !!logId,
    });

    if (!logId) {
        return <div className="p-6">Select a log to view details</div>;
    }

    if (isLoading) {
        return (
            <div className="p-6">
                <div className="animate-pulse">
                    <div className="h-4 bg-gray-200 rounded w-1/4 mb-2.5"></div>
                    <div className="h-4 bg-gray-200 rounded w-1/2 mb-2.5"></div>
                    <div className="h-4 bg-gray-200 rounded w-3/4 mb-2.5"></div>
                    <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                </div>
            </div>
        );
    }

    if (isError) {
        return (
            <div className="p-6">
                <div className="text-danger">Failed to load log details</div>
            </div>
        );
    }

    const renderProperties = (properties: any) => {
        if (!properties || Object.keys(properties).length === 0) {
            return <p className="text-gray-500">No properties recorded</p>;
        }

        return (
            <div className="mt-6">
                <h6 className="text-sm font-semibold mb-2">Properties:</h6>
                <div className="bg-gray-50 border border-gray-200 rounded-md overflow-hidden">
                    <pre className="text-xs p-4 overflow-auto max-h-64 whitespace-pre-wrap">
                        {JSON.stringify(properties, null, 2)}
                    </pre>
                    <div className="bg-gray-100 py-2 px-4 border-t border-gray-200 flex justify-between items-center">
                        <ChevronLeft className="text-gray-500 w-4 h-4" />
                        <span className="text-xs text-gray-500">
                            Scroll to view
                        </span>
                        <ChevronRight className="text-gray-500 w-4 h-4" />
                    </div>
                </div>
            </div>
        );
    };

    const renderCauserInfo = () => {
        if (!log.causer_type) {
            return <p className="text-gray-500">No causer information</p>;
        }

        // Check if we have causer object (user)
        if (log.causer) {
            return (
                <div>
                    <p>
                        <span className="font-medium">User:</span>{" "}
                        {log.causer.name}
                    </p>
                    <p>
                        <span className="font-medium">Email:</span>{" "}
                        {log.causer.email}
                    </p>
                    <p>
                        <span className="font-medium">ID:</span> {log.causer.id}
                    </p>
                    <p>
                        <span className="font-medium">Type:</span>{" "}
                        {log.causer_type.split("\\").pop()}
                    </p>
                </div>
            );
        }

        return (
            <div>
                <p>
                    <span className="font-medium">Type:</span>{" "}
                    {log.causer_type.split("\\").pop()}
                </p>
                <p>
                    <span className="font-medium">ID:</span> {log.causer_id}
                </p>
            </div>
        );
    };

    const renderSubjectInfo = () => {
        if (!log.subject_type) {
            return <p className="text-gray-500">No subject information</p>;
        }

        return (
            <div>
                <p>
                    <span className="font-medium">Type:</span>{" "}
                    {log.subject_type.split("\\").pop()}
                </p>
                <p>
                    <span className="font-medium">ID:</span> {log.subject_id}
                </p>
            </div>
        );
    };

    return (
        <div className="h-full flex flex-col">
            {/* Header with title and close button */}

            {/* Content */}
            <div className="p-6 flex-1 overflow-auto">
                <div className="mb-6">
                    <h3 className="text-lg font-semibold capitalize mb-1">
                        {log.log_name?.replace("_", " ")} Log
                    </h3>
                    <p className="text-gray-500 text-sm">
                        {moment(log.created_at).format(
                            "MMMM D, YYYY [at] h:mm:ss A"
                        )}
                    </p>
                </div>

                <div className="mb-6">
                    <h6 className="text-sm font-semibold mb-2">Description</h6>
                    <p>{log.description}</p>
                </div>

                <div className="grid grid-cols-2 gap-6 mb-6">
                    <div>
                        <h6 className="text-sm font-semibold mb-2">Subject</h6>
                        {renderSubjectInfo()}
                    </div>
                    <div>
                        <h6 className="text-sm font-semibold mb-2">Causer</h6>
                        {renderCauserInfo()}
                    </div>
                </div>

                {renderProperties(log.properties)}

                {log.changes && (
                    <div className="mt-6">
                        <h6 className="text-sm font-semibold mb-2">Changes</h6>
                        <div className="bg-gray-50 border border-gray-200 rounded-md p-4">
                            <pre className="text-xs overflow-auto max-h-60">
                                {JSON.stringify(log.changes, null, 2)}
                            </pre>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default LogDetail;
