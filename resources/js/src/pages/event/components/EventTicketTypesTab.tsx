import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import moment from "moment";
import React, { useState } from "react";
import { toast } from "sonner";
import Loader from "../../../components/Loader";
import SimpleAdminTable, { SimpleAdminTd } from "../../../components/SimpleAdminTable";
import { useConfirmDialog } from "../../../hooks";
import { eventApi } from "../../../services/event";
import { IDiscountCode, ITicketType } from "../../../types";
import { formatMoney } from "../../../utils/money";
import { statusBadgeClass } from "../../../utils/statusBadge";
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

    const ticketTypes = event.ticket_types ?? [];
    const discountCodes = event.discount_codes ?? [];

    return (
        <>
            <div className="space-y-8 p-1">
                <div>
                    <div className="mb-3 flex items-center justify-between gap-2">
                        <div>
                            <h4 className="text-base font-semibold text-gray-900 dark:text-white">
                                Ticket types
                            </h4>
                            <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
                                Monetized is derived from paid tiers (price &gt; 0).
                            </p>
                        </div>
                        <button
                            type="button"
                            className="btn btn-primary btn-sm gap-1"
                            onClick={() => setTtModal({ open: true, item: null })}
                        >
                            + Add
                        </button>
                    </div>
                    <SimpleAdminTable
                        columns={[
                            { key: "name", label: "Name" },
                            { key: "vip", label: "VIP" },
                            { key: "price", label: "Price", align: "right" },
                            { key: "sold", label: "Sold" },
                            { key: "sales", label: "Sales" },
                            { key: "actions", label: "Actions", align: "center" },
                        ]}
                        empty={ticketTypes.length === 0}
                        emptyText="No ticket types"
                    >
                        {ticketTypes.map((tt) => (
                            <tr
                                key={tt.id}
                                className="hover:bg-white-light/20 dark:hover:bg-[#1a2941]/40"
                            >
                                <SimpleAdminTd>
                                    <span className="font-medium text-gray-900 dark:text-white">
                                        {tt.name}
                                    </span>
                                </SimpleAdminTd>
                                <SimpleAdminTd>
                                    {tt.is_vip ? (
                                        <span className={statusBadgeClass("info")}>VIP</span>
                                    ) : (
                                        <span className="text-gray-400 dark:text-gray-500">—</span>
                                    )}
                                </SimpleAdminTd>
                                <SimpleAdminTd align="right">
                                    {Number(tt.price) === 0 ? "Free" : formatMoney(tt.price)}
                                </SimpleAdminTd>
                                <SimpleAdminTd>
                                    {tt.quantity_limit === null
                                        ? `${tt.quantity_sold} / Unlimited`
                                        : `${tt.quantity_sold} / ${tt.quantity_limit}`}
                                </SimpleAdminTd>
                                <SimpleAdminTd>
                                    <span
                                        className={statusBadgeClass(
                                            tt.sales_enabled ? "success" : "warning"
                                        )}
                                    >
                                        {tt.sales_enabled ? "On" : "Off"}
                                    </span>
                                </SimpleAdminTd>
                                <SimpleAdminTd align="center">
                                    <div className="flex items-center justify-center gap-1.5">
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
                                                Disable
                                            </button>
                                        ) : (
                                            <button
                                                type="button"
                                                className="btn btn-outline-success btn-sm"
                                                onClick={() => enableSales.mutate(tt.id)}
                                            >
                                                Enable
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
                                </SimpleAdminTd>
                            </tr>
                        ))}
                    </SimpleAdminTable>
                </div>

                <div>
                    <div className="mb-3 flex items-center justify-between gap-2">
                        <h4 className="text-base font-semibold text-gray-900 dark:text-white">
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
                    <SimpleAdminTable
                        columns={[
                            { key: "code", label: "Code" },
                            { key: "value", label: "Value", align: "right" },
                            { key: "usage", label: "Usage" },
                            { key: "expires", label: "Expires", hideBelow: "lg" },
                            { key: "scope", label: "Scope", hideBelow: "lg" },
                            { key: "status", label: "Status" },
                            { key: "actions", label: "Actions", align: "center" },
                        ]}
                        empty={discountCodes.length === 0}
                        emptyText="No codes for this event"
                    >
                        {discountCodes.map((dc) => (
                            <tr
                                key={dc.id}
                                className="hover:bg-white-light/20 dark:hover:bg-[#1a2941]/40"
                            >
                                <SimpleAdminTd>
                                    <span className="font-medium text-gray-900 dark:text-white">
                                        {dc.code}
                                    </span>
                                </SimpleAdminTd>
                                <SimpleAdminTd align="right">
                                    {dc.type === "percent"
                                        ? `${dc.value}%`
                                        : formatMoney(dc.value)}
                                </SimpleAdminTd>
                                <SimpleAdminTd>
                                    {dc.usage_count}
                                    {dc.usage_limit ? ` / ${dc.usage_limit}` : ""}
                                </SimpleAdminTd>
                                <SimpleAdminTd hideBelow="lg">
                                    {dc.expires_at
                                        ? moment(dc.expires_at).format("MMM DD, YYYY")
                                        : "—"}
                                </SimpleAdminTd>
                                <SimpleAdminTd hideBelow="lg">
                                    {dc.event_id ? "Event" : "Org-wide"}
                                </SimpleAdminTd>
                                <SimpleAdminTd>
                                    <span
                                        className={statusBadgeClass(
                                            dc.active ? "success" : "warning"
                                        )}
                                    >
                                        {dc.active ? "Active" : "Inactive"}
                                    </span>
                                </SimpleAdminTd>
                                <SimpleAdminTd align="center">
                                    <div className="flex items-center justify-center gap-1.5">
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
                                </SimpleAdminTd>
                            </tr>
                        ))}
                    </SimpleAdminTable>
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
