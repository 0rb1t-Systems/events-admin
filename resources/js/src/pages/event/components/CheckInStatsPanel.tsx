import { useQuery } from "@tanstack/react-query";
import React from "react";
import Loader from "../../../components/Loader";
import { fetchCheckInStats } from "../../../services/qrScanLog";
import { EventMetricCard } from "./EventField";

interface Props {
    eventId: number;
}

const CheckInStatsPanel: React.FC<Props> = ({ eventId }) => {
    const { data, isLoading, error } = useQuery({
        queryKey: ["event-check-in-stats", eventId],
        queryFn: () => fetchCheckInStats(eventId),
    });

    if (isLoading) {
        return <Loader />;
    }
    if (error || !data) {
        return <p className="text-sm text-red-500">Failed to load check-in stats</p>;
    }

    const cells = [
        { label: "Registered", value: data.registered },
        { label: "Arrived", value: data.arrived },
        { label: "Absent", value: data.absent },
        { label: "Waitlisted", value: data.waitlisted },
    ];

    return (
        <div className="space-y-2">
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                {cells.map((c) => (
                    <EventMetricCard key={c.label} label={c.label} value={c.value} />
                ))}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">
                Scans: {data.scan_attempts} total · {data.valid_scans} valid ·{" "}
                {data.already_used_scans} already used · {data.invalid_scans} invalid
            </p>
        </div>
    );
};

export default CheckInStatsPanel;
