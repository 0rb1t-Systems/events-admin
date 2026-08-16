import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import moment from "moment";
import React, { useState } from "react";
import { toast } from "sonner";
import GenericModal from "../../../components/GenericModal";
import Loader from "../../../components/Loader";
import { useConfirmDialog, usePermission } from "../../../hooks";
import { paymentApi } from "../../../services/payment";
import { IPayment } from "../../../types/payment";

interface Props {
    eventId: number;
}

const statusBadge = (status: string) => {
    const s = String(status).toLowerCase();
    const cls =
        s === "completed"
            ? "bg-success/10 text-success"
            : s === "refunded"
              ? "bg-warning/10 text-warning"
              : s === "failed"
                ? "bg-danger/10 text-danger"
                : "bg-primary/10 text-primary";
    return (
        <span className={`badge capitalize ${cls}`}>
            {s.replace(/_/g, " ")}
        </span>
    );
};

const methodLabel = (gateway?: string | null) => {
    if (!gateway || gateway === "waafipay") return "WaafiPay";
    if (gateway === "manual") return "Manual";
    return gateway;
};

const refundBlockedMessage =
    "This payment cannot be refunded because the event's funds have already been paid out to the organizer.";

const EventPaymentsPanel: React.FC<Props> = ({ eventId }) => {
    const queryClient = useQueryClient();
    const { confirmAction } = useConfirmDialog();
    const { hasPermission } = usePermission();
    const canRefund = hasPermission("refund payments");

    const [statusFilter, setStatusFilter] = useState("");
    const [page, setPage] = useState(1);
    const [selected, setSelected] = useState<IPayment | null>(null);

    const { data, isLoading, error } = useQuery({
        queryKey: ["event-payments", eventId, statusFilter, page],
        queryFn: () =>
            paymentApi.getEventPayments(eventId, {
                status: statusFilter || undefined,
                page,
                per_page: 10,
            } as any),
    });

    const refund = useMutation({
        mutationFn: (id: number) => paymentApi.refund(id),
        onSuccess: () => {
            toast.success("Payment refunded");
            queryClient.invalidateQueries({ queryKey: ["event-payments", eventId] });
            queryClient.invalidateQueries({ queryKey: ["event-finance", eventId] });
            setSelected(null);
        },
        onError: (err: any) => {
            const code = err?.errors?.error_code?.[0];
            if (code === "refund_blocked_payout_recorded") {
                toast.error(refundBlockedMessage);
                return;
            }
            toast.error(err?.message || "Refund failed");
        },
    });

    if (isLoading) return <Loader />;
    if (error) {
        return <p className="text-sm text-red-500">Failed to load payments</p>;
    }

    const rows = (data?.data || []) as IPayment[];
    const pagination = (data as any)?.pagination;
    const lastPage = pagination?.last_page ?? 1;

    return (
        <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
                <select
                    className="form-select w-auto text-xs"
                    value={statusFilter}
                    onChange={(e) => {
                        setStatusFilter(e.target.value);
                        setPage(1);
                    }}
                >
                    <option value="">All statuses</option>
                    <option value="completed">Completed</option>
                    <option value="pending">Pending</option>
                    <option value="refunded">Refunded</option>
                    <option value="failed">Failed</option>
                </select>
                <span className="text-[10px] text-gray-500">
                    {pagination?.total ?? rows.length} payment
                    {(pagination?.total ?? rows.length) === 1 ? "" : "s"}
                </span>
            </div>

            {rows.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400">No payments yet</p>
            ) : (
                <ul className="max-h-72 space-y-1.5 overflow-y-auto text-xs">
                    {rows.map((p) => (
                        <li
                            key={p.id}
                            className="rounded border border-gray-100 px-2 py-1.5 dark:border-[#1b2e4b]"
                        >
                            <div className="flex items-start justify-between gap-2">
                                <button
                                    type="button"
                                    className="min-w-0 flex-1 text-left"
                                    onClick={() => setSelected(p)}
                                >
                                    <div className="font-medium text-gray-900 dark:text-white">
                                        {p.participation?.user?.name ?? `P#${p.participation_id}`}
                                    </div>
                                    <div className="text-gray-500 dark:text-gray-400">
                                        {p.ticket_type?.name ?? "—"}
                                        {" - "}
                                        {Number(p.amount).toFixed(2)} {p.currency || "USD"}
                                        {" - "}
                                        {methodLabel(p.gateway)}
                                        {" - "}
                                        {p.created_at
                                            ? moment(p.created_at).format("MMM DD, YYYY")
                                            : "—"}
                                    </div>
                                    <div className="mt-0.5">{statusBadge(String(p.status))}</div>
                                </button>
                                {canRefund && String(p.status) === "completed" && (
                                    <button
                                        type="button"
                                        className="btn btn-outline-danger btn-sm"
                                        disabled={refund.isPending}
                                        onClick={async () => {
                                            const name =
                                                p.participation?.user?.name ?? "participant";
                                            const ok = await confirmAction({
                                                title: "Refund payment?",
                                                text: `Refund ${Number(p.amount).toFixed(2)} ${p.currency || "USD"} to ${name}? This cannot be undone.`,
                                                confirmButtonText: "Refund",
                                            });
                                            if (ok) refund.mutate(p.id);
                                        }}
                                    >
                                        Refund
                                    </button>
                                )}
                            </div>
                        </li>
                    ))}
                </ul>
            )}

            {lastPage > 1 && (
                <div className="flex items-center justify-between gap-2 text-xs">
                    <button
                        type="button"
                        className="btn btn-sm"
                        disabled={page <= 1}
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                    >
                        Prev
                    </button>
                    <span className="text-gray-500">
                        Page {page} / {lastPage}
                    </span>
                    <button
                        type="button"
                        className="btn btn-sm"
                        disabled={page >= lastPage}
                        onClick={() => setPage((p) => p + 1)}
                    >
                        Next
                    </button>
                </div>
            )}

            <GenericModal
                isOpen={!!selected}
                setIsOpen={(open) => {
                    if (!open) setSelected(null);
                }}
                title="Payment detail"
                maxWidth="md"
            >
                {selected && (
                    <div className="space-y-3 text-sm">
                        <div className="grid grid-cols-2 gap-3">
                            <Field label="Participant">
                                {selected.participation?.user?.name ?? "—"}
                            </Field>
                            <Field label="Email">
                                {selected.participation?.user?.email ?? "—"}
                            </Field>
                            <Field label="Participation status">
                                {(selected.participation?.status || "—").replace(/_/g, " ")}
                            </Field>
                            <Field label="Ticket">{selected.ticket_type?.name ?? "—"}</Field>
                            <Field label="Amount">
                                {Number(selected.amount).toFixed(2)} {selected.currency}
                            </Field>
                            <Field label="Status">{statusBadge(String(selected.status))}</Field>
                            <Field label="Method">{methodLabel(selected.gateway)}</Field>
                            <Field label="Reference">{selected.reference_id || "—"}</Field>
                            <Field label="Payer phone">{selected.payer_phone || "—"}</Field>
                            <Field label="Waafi TX">{selected.waafi_transaction_id || "—"}</Field>
                            <Field label="Waafi issuer TX">
                                {selected.waafi_issuer_transaction_id || "—"}
                            </Field>
                            <Field label="Created">
                                {selected.created_at
                                    ? moment(selected.created_at).format("MMM DD, YYYY HH:mm")
                                    : "—"}
                            </Field>
                        </div>
                        {selected.failure_reason && (
                            <Field label="Failure reason">{selected.failure_reason}</Field>
                        )}
                        {canRefund && String(selected.status) === "completed" && (
                            <button
                                type="button"
                                className="btn btn-outline-danger btn-sm"
                                disabled={refund.isPending}
                                onClick={async () => {
                                    const name =
                                        selected.participation?.user?.name ?? "participant";
                                    const ok = await confirmAction({
                                        title: "Refund payment?",
                                        text: `Refund ${Number(selected.amount).toFixed(2)} ${selected.currency || "USD"} to ${name}? This cannot be undone.`,
                                        confirmButtonText: "Refund",
                                    });
                                    if (ok) refund.mutate(selected.id);
                                }}
                            >
                                Refund
                            </button>
                        )}
                    </div>
                )}
            </GenericModal>
        </div>
    );
};

const Field = ({
    label,
    children,
}: {
    label: string;
    children: React.ReactNode;
}) => (
    <div>
        <label className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
            {label}
        </label>
        <div className="mt-0.5 text-gray-900 dark:text-white">{children}</div>
    </div>
);

export default EventPaymentsPanel;
