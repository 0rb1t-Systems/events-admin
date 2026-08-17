import { useQuery } from "@tanstack/react-query";
import React from "react";
import Loader from "../../../components/Loader";
import { fetchEventFinance } from "../../../services/payout";
import { formatMoney } from "../../../utils/money";
import { EventMetricCard } from "./EventField";

interface Props {
    eventId: number;
}

const EventFinancePanel: React.FC<Props> = ({ eventId }) => {
    const { data, isLoading, error } = useQuery({
        queryKey: ["event-finance", eventId],
        queryFn: () => fetchEventFinance(eventId),
    });

    if (isLoading) return <Loader />;
    if (error || !data) {
        return <p className="text-sm text-red-500">Failed to load finance</p>;
    }

    const cells = [
        { label: "Collected", value: formatMoney(data.total_collected, data.currency) },
        { label: "Paid out", value: formatMoney(data.total_paid_out, data.currency) },
        { label: "Reserved", value: formatMoney(data.total_reserved, data.currency) },
        { label: "Outstanding", value: formatMoney(data.outstanding_balance, data.currency) },
    ];

    return (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {cells.map((c) => (
                <EventMetricCard key={c.label} label={c.label} value={c.value} />
            ))}
        </div>
    );
};

export default EventFinancePanel;
