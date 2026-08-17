import { useQuery } from "@tanstack/react-query";
import React from "react";
import Loader from "../../../components/Loader";
import axiosInstance from "../../../utils/axios";
import { formatMoney } from "../../../utils/money";
import { EventMetricCard } from "./EventField";

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
            value: formatMoney(data.revenue, data.currency || "USD"),
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
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {cells.map((c) => (
                <EventMetricCard key={c.label} label={c.label} value={c.value} />
            ))}
        </div>
    );
};

export default EventAnalyticsPanel;
