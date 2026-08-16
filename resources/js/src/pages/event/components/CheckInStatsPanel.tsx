import { useQuery } from "@tanstack/react-query";
import React from "react";
import Loader from "../../../components/Loader";
import { fetchCheckInStats } from "../../../services/qrScanLog";

interface Props {
    eventId: number;
}

/** Compact check-in dashboard stats (add-on 12.5) on Event Detail. */
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
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {cells.map((c) => (
                    <div
                        key={c.label}
                        className="rounded border border-gray-100 px-2 py-1.5 dark:border-[#1b2e4b]"
                    >
                        <div className="text-[10px] font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                            {c.label}
                        </div>
                        <div className="text-sm font-semibold text-gray-900 dark:text-white">
                            {c.value}
                        </div>
                    </div>
                ))}
            </div>
            <p className="text-[11px] text-gray-500">
                Scans: {data.scan_attempts} total · {data.valid_scans} valid ·{" "}
                {data.already_used_scans} already used · {data.invalid_scans} invalid
            </p>
        </div>
    );
};

export default CheckInStatsPanel;
