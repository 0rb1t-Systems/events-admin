import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import moment from "moment";
import React from "react";
import { toast } from "sonner";
import Loader from "../../../components/Loader";
import { useConfirmDialog } from "../../../hooks";
import { payoutRequestApi } from "../../../services/payout";
import { IPayoutRequest } from "../../../types/payment";

interface Props {
    payoutId: number | null;
}

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
        <div className="mt-0.5 text-sm text-gray-900 dark:text-white">{children}</div>
    </div>
);

const PayoutDetail: React.FC<Props> = ({ payoutId }) => {
    const queryClient = useQueryClient();
    const { confirmAction } = useConfirmDialog();

    const { data, isLoading, error } = useQuery({
        queryKey: ["payout-request", payoutId],
        queryFn: () => payoutRequestApi.getById(payoutId!),
        enabled: !!payoutId,
    });

    const invalidate = () => {
        queryClient.invalidateQueries({ queryKey: ["payout-request", payoutId] });
        queryClient.invalidateQueries({ queryKey: ["Payout Request Table"] });
    };

    const approve = useMutation({
        mutationFn: () => payoutRequestApi.approve(payoutId!),
        onSuccess: () => {
            toast.success("Payout approved");
            invalidate();
        },
        onError: (e: Error) => toast.error(e.message),
    });

    const reject = useMutation({
        mutationFn: () => payoutRequestApi.reject(payoutId!),
        onSuccess: () => {
            toast.success("Payout rejected");
            invalidate();
        },
        onError: (e: Error) => toast.error(e.message),
    });

    const record = useMutation({
        mutationFn: (net: number) => payoutRequestApi.recordPayment(payoutId!, net),
        onSuccess: () => {
            toast.success("Payout recorded as paid");
            invalidate();
        },
        onError: (e: Error) => toast.error(e.message),
    });

    if (!payoutId) {
        return <div className="p-4 text-center text-sm text-gray-500">Select a payout</div>;
    }
    if (isLoading) return <Loader />;
    if (error || !data) {
        return <div className="p-4 text-center text-sm text-red-500">Failed to load</div>;
    }

    // getById may return wrapped { payout } from show() — normalize
    const row = ((data as any).payout ?? data) as IPayoutRequest;
    const rate = Number(row.commission_rate);
    const requested = Number(row.requested_amount);
    const commission =
        row.commission_amount != null
            ? Number(row.commission_amount)
            : Math.round(requested * (rate / 100) * 100) / 100;
    const net =
        row.net_amount != null
            ? Number(row.net_amount)
            : Math.round((requested - commission) * 100) / 100;

    return (
        <div className="space-y-3 p-1">
            <div>
                <h3 className="text-lg font-semibold capitalize text-gray-900 dark:text-white">
                    {(row.status || "").replace(/_/g, " ")}
                </h3>
                <p className="text-sm text-gray-500">{row.event?.title ?? `Event #${row.event_id}`}</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
                <Field label="Organizer">
                    {row.organizer?.business_name ?? `#${row.organizer_id}`}
                </Field>
                <Field label="Requested">{requested.toFixed(2)}</Field>
                <Field label="Commission rate (snapshot)">{rate.toFixed(2)}%</Field>
                <Field label="Commission">{commission.toFixed(2)}</Field>
                <Field label="Net to organizer">{net.toFixed(2)}</Field>
                <Field label="ID">{row.id}</Field>
                <Field label="Created">
                    {row.created_at ? moment(row.created_at).format("MMM DD, YYYY") : "—"}
                </Field>
                <Field label="Paid at">
                    {row.paid_at ? moment(row.paid_at).format("MMM DD, YYYY HH:mm") : "—"}
                </Field>
            </div>

            {row.admin_notes && <Field label="Notes">{row.admin_notes}</Field>}

            <p className="text-[11px] text-gray-500">
                Amounts use the snapshotted commission rate stored on this request — not the live
                settings rate.
            </p>

            <div className="flex flex-wrap gap-2 border-t border-gray-100 pt-3 dark:border-[#1b2e4b]">
                {row.status === "requested" && (
                    <>
                        <button
                            type="button"
                            className="btn btn-primary btn-sm"
                            disabled={approve.isPending}
                            onClick={async () => {
                                const ok = await confirmAction({
                                    title: "Approve payout?",
                                    text: `Approve ${requested.toFixed(2)} (net ~${net.toFixed(2)} after ${rate}% commission snapshot).`,
                                    confirmButtonText: "Approve",
                                });
                                if (ok) approve.mutate();
                            }}
                        >
                            Approve
                        </button>
                        <button
                            type="button"
                            className="btn btn-outline-danger btn-sm"
                            disabled={reject.isPending}
                            onClick={async () => {
                                const ok = await confirmAction({
                                    title: "Reject payout?",
                                    text: "Releases the reserved outstanding balance.",
                                    confirmButtonText: "Reject",
                                });
                                if (ok) reject.mutate();
                            }}
                        >
                            Reject
                        </button>
                    </>
                )}
                {row.status === "approved" && (
                    <button
                        type="button"
                        className="btn btn-primary btn-sm"
                        disabled={record.isPending}
                        onClick={async () => {
                            const ok = await confirmAction({
                                title: "Record offline payment?",
                                text: `Confirm you paid the organizer net ${net.toFixed(2)}.`,
                                confirmButtonText: "Mark paid",
                            });
                            if (ok) record.mutate(net);
                        }}
                    >
                        Record payment
                    </button>
                )}
            </div>
        </div>
    );
};

export default PayoutDetail;
