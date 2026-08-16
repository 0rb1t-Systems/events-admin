import { useQuery } from "@tanstack/react-query";
import React from "react";
import Loader from "../../../components/Loader";
import axiosInstance from "../../../utils/axios";

interface Props {
    eventId: number;
}

const fetchAnalytics = async (eventId: number) => {
    const res = await axiosInstance.get(`/events/${eventId}/analytics`);
    return res.data.data || res.data;
};

const EventAnalyticsPanel: React.FC<Props> = ({ eventId }) => {
    const { data, isLoading, error } = useQuery({
        queryKey: ["event-analytics", eventId],
        queryFn: () => fetchAnalytics(eventId),
    });

    if (isLoading) return <Loader />;
    if (error || !data) {
        return <p className="text-sm text-red-500">Failed to load analytics</p>;
    }

    const cells = [
        { label: "Views", value: data.views },
        { label: "Registrations", value: data.registrations },
        {
            label: "Conversion",
            value: data.conversion_rate != null ? `${data.conversion_rate}%` : "—",
        },
        {
            label: "Revenue",
            value: `${Number(data.revenue).toFixed(2)} ${data.currency}`,
        },
        { label: "Check-ins", value: data.check_ins },
        {
            label: "Attendance",
            value: data.attendance_rate != null ? `${data.attendance_rate}%` : "—",
        },
        {
            label: "Avg rating",
            value: data.average_rating != null ? data.average_rating : "—",
        },
    ];

    return (
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
    );
};

export default EventAnalyticsPanel;
