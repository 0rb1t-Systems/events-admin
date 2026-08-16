import { useQuery } from "@tanstack/react-query";
import React from "react";
import Loader from "../../../components/Loader";
import { fetchEventFinance } from "../../../services/payout";

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
        { label: "Collected", value: data.total_collected },
        { label: "Paid out", value: data.total_paid_out },
        { label: "Reserved", value: data.total_reserved },
        { label: "Outstanding", value: data.outstanding_balance },
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
                            {Number(c.value).toFixed(2)} {data.currency}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default EventFinancePanel;
