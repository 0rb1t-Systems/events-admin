import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import moment from "moment";
import React, { useState } from "react";
import { toast } from "sonner";
import Loader from "../../../components/Loader";
import { useConfirmDialog } from "../../../hooks";
import { eventApi } from "../../../services/event";
import { IDiscountCode, ITicketType } from "../../../types";
import DiscountCodeModal from "./DiscountCodeModal";
import TicketTypeModal from "./TicketTypeModal";

interface Props {
    eventId: number;
}

const EventTicketTypesTab: React.FC<Props> = ({ eventId }) => {
    const queryClient = useQueryClient();
    const { confirmAction } = useConfirmDialog();
    const [ttModal, setTtModal] = useState<{ open: boolean; item: ITicketType | null }>({
        open: false,
        item: null,
    });
    const [dcModal, setDcModal] = useState<{ open: boolean; item: IDiscountCode | null }>({
        open: false,
        item: null,
    });

    const { data: event, isLoading, error } = useQuery({
        queryKey: ["event", eventId],
        queryFn: () => eventApi.getById(eventId),
        enabled: !!eventId,
    });

    const disableSales = useMutation({
        mutationFn: (ticketTypeId: number) => eventApi.disableTicketSales(ticketTypeId),
        onSuccess: () => {
            toast.success("Further sales disabled");
            queryClient.invalidateQueries({ queryKey: ["event", eventId] });
            queryClient.invalidateQueries({ queryKey: ["Event Table"] });
        },
        onError: (e: Error) => toast.error(e.message),
    });

    const enableSales = useMutation({
        mutationFn: (ticketTypeId: number) => eventApi.enableTicketSales(ticketTypeId),
        onSuccess: () => {
            toast.success("Sales re-enabled");
            queryClient.invalidateQueries({ queryKey: ["event", eventId] });
            queryClient.invalidateQueries({ queryKey: ["Event Table"] });
        },
        onError: (e: Error) => toast.error(e.message),
    });

    const deleteTt = useMutation({
        mutationFn: (id: number) => eventApi.deleteTicketType(id),
        onSuccess: () => {
            toast.success("Ticket type deleted");
            queryClient.invalidateQueries({ queryKey: ["event", eventId] });
            queryClient.invalidateQueries({ queryKey: ["Event Table"] });
        },
        onError: (e: any) => toast.error(e?.message || "Delete failed"),
    });

    const deleteDc = useMutation({
        mutationFn: (id: number) => eventApi.deleteDiscountCode(id),
        onSuccess: () => {
            toast.success("Discount code deleted");
            queryClient.invalidateQueries({ queryKey: ["event", eventId] });
            queryClient.invalidateQueries({ queryKey: ["Event Table"] });
        },
        onError: (e: any) => toast.error(e?.message || "Delete failed"),
    });

    const toggleDcActive = useMutation({
        mutationFn: ({ id, active }: { id: number; active: boolean }) =>
            eventApi.updateDiscountCode(id, { active }),
        onSuccess: () => {
            toast.success("Code updated");
            queryClient.invalidateQueries({ queryKey: ["event", eventId] });
        },
        onError: (e: any) => toast.error(e?.message || "Update failed"),
    });

    if (isLoading) {
        return (
            <div className="p-4">
                <Loader />
            </div>
        );
    }
    if (error || !event) {
        return <div className="p-4 text-center text-sm text-red-500">Failed to load</div>;
    }

    return (
        <>
            <div className="space-y-6 p-1">
                <div>
                    <div className="mb-2 flex items-center justify-between gap-2">
                        <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
                            Ticket types
                        </h4>
                        <button
                            type="button"
                            className="btn btn-primary btn-sm gap-1"
                            onClick={() => setTtModal({ open: true, item: null })}
                        >
                            + Add
                        </button>
                    </div>
                    <p className="mb-2 text-xs text-gray-500 dark:text-gray-400">
                        Monetized is derived from paid tiers (price &gt; 0).
                    </p>
                    {(event.ticket_types?.length ?? 0) === 0 ? (
                        <p className="text-sm text-gray-500">No ticket types</p>
                    ) : (
                        <ul className="space-y-1.5 text-xs">
                            {event.ticket_types!.map((tt) => (
                                <li
                                    key={tt.id}
                                    className="rounded border border-gray-100 px-2 py-1.5 dark:border-[#1b2e4b]"
                                >
                                    <div className="flex items-center justify-between gap-2">
                                        <span className="font-medium text-gray-900 dark:text-white">
                                            {tt.name}
                                        </span>
                                        <span className="whitespace-nowrap text-right">
                                            ${Number(tt.price).toFixed(2)}
                                            {Number(tt.price) === 0 ? " (free)" : ""}
                                        </span>
                                    </div>
                                    <div className="text-gray-500">
                                        Sold{" "}
                                        {tt.quantity_limit === null
                                            ? `${tt.quantity_sold} / Unlimited`
                                            : `${tt.quantity_sold} / ${tt.quantity_limit}`}
                                        {" · "}
                                        {tt.sales_enabled ? "Sales on" : "Sales off"}
                                    </div>
                                    <div className="mt-1 flex flex-wrap gap-1">
                                        <button
                                            type="button"
                                            className="btn btn-outline-primary btn-sm"
                                            onClick={() => setTtModal({ open: true, item: tt })}
                                        >
                                            Edit
                                        </button>
                                        {tt.sales_enabled ? (
                                            <button
                                                type="button"
                                                className="btn btn-outline-danger btn-sm"
                                                onClick={async () => {
                                                    const ok = await confirmAction({
                                                        title: "Disable further sales?",
                                                        text: `Stop new sales for "${tt.name}".`,
                                                        confirmButtonText: "Disable",
                                                    });
                                                    if (ok) disableSales.mutate(tt.id);
                                                }}
                                            >
                                                Disable sales
                                            </button>
                                        ) : (
                                            <button
                                                type="button"
                                                className="btn btn-outline-success btn-sm"
                                                onClick={() => enableSales.mutate(tt.id)}
                                            >
                                                Enable sales
                                            </button>
                                        )}
                                        <button
                                            type="button"
                                            className="btn btn-outline-danger btn-sm"
                                            onClick={async () => {
                                                const ok = await confirmAction({
                                                    title: "Delete ticket type?",
                                                    text: `Soft-deletes "${tt.name}". Blocked if sales history exists.`,
                                                    confirmButtonText: "Delete",
                                                });
                                                if (ok) deleteTt.mutate(tt.id);
                                            }}
                                        >
                                            Delete
                                        </button>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>

                <div className="border-t border-gray-100 pt-4 dark:border-[#1b2e4b]">
                    <div className="mb-2 flex items-center justify-between gap-2">
                        <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
                            Discount codes
                        </h4>
                        <button
                            type="button"
                            className="btn btn-primary btn-sm gap-1"
                            onClick={() => setDcModal({ open: true, item: null })}
                        >
                            + Add
                        </button>
                    </div>
                    {(event.discount_codes?.length ?? 0) === 0 ? (
                        <p className="text-sm text-gray-500">No codes for this event</p>
                    ) : (
                        <ul className="space-y-1.5 text-xs">
                            {event.discount_codes!.map((dc) => (
                                <li
                                    key={dc.id}
                                    className="rounded border border-gray-100 px-2 py-1.5 dark:border-[#1b2e4b]"
                                >
                                    <div className="flex items-center justify-between gap-2">
                                        <span className="font-medium text-gray-900 dark:text-white">
                                            {dc.code}
                                        </span>
                                        <span>
                                            {dc.type === "percent"
                                                ? `${dc.value}%`
                                                : `$${Number(dc.value).toFixed(2)}`}
                                        </span>
                                    </div>
                                    <div className="text-gray-500">
                                        Used {dc.usage_count}
                                        {dc.usage_limit ? ` / ${dc.usage_limit}` : ""}
                                        {dc.expires_at
                                            ? ` · exp ${moment(dc.expires_at).format("MMM DD, YYYY")}`
                                            : ""}
                                        {dc.event_id ? " · event" : " · org-wide"}
                                    </div>
                                    <div className="mt-1 flex flex-wrap gap-1">
                                        <button
                                            type="button"
                                            className="btn btn-outline-primary btn-sm"
                                            onClick={() => setDcModal({ open: true, item: dc })}
                                        >
                                            Edit
                                        </button>
                                        <button
                                            type="button"
                                            className={`btn btn-sm ${dc.active ? "btn-outline-warning" : "btn-outline-success"}`}
                                            onClick={() =>
                                                toggleDcActive.mutate({
                                                    id: dc.id,
                                                    active: !dc.active,
                                                })
                                            }
                                        >
                                            {dc.active ? "Deactivate" : "Activate"}
                                        </button>
                                        <button
                                            type="button"
                                            className="btn btn-outline-danger btn-sm"
                                            onClick={async () => {
                                                const ok = await confirmAction({
                                                    title: "Delete discount code?",
                                                    text: `Soft-deletes code "${dc.code}".`,
                                                    confirmButtonText: "Delete",
                                                });
                                                if (ok) deleteDc.mutate(dc.id);
                                            }}
                                        >
                                            Delete
                                        </button>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>

            <TicketTypeModal
                isOpen={ttModal.open}
                onClose={() => setTtModal({ open: false, item: null })}
                eventId={eventId}
                ticketType={ttModal.item}
            />
            <DiscountCodeModal
                isOpen={dcModal.open}
                onClose={() => setDcModal({ open: false, item: null })}
                eventId={eventId}
                discountCode={dcModal.item}
            />
        </>
    );
};

export default EventTicketTypesTab;
