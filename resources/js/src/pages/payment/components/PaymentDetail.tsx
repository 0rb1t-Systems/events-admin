import { useQuery } from "@tanstack/react-query";
import moment from "moment";
import React from "react";
import Loader from "../../../components/Loader";
import { paymentApi } from "../../../services/payment";
import { IPayment } from "../../../types/payment";

interface Props {
    paymentId: number | null;
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

const PaymentDetail: React.FC<Props> = ({ paymentId }) => {
    const { data, isLoading, error } = useQuery({
        queryKey: ["payment", paymentId],
        queryFn: () => paymentApi.getById(paymentId!),
        enabled: !!paymentId,
    });

    if (!paymentId) {
        return (
            <div className="p-4 text-center text-sm text-gray-500">
                Select a payment to view details
            </div>
        );
    }
    if (isLoading) return <Loader />;
    if (error || !data) {
        return <div className="p-4 text-center text-sm text-red-500">Failed to load</div>;
    }

    const row = data as IPayment;
    const gateway =
        !row.gateway || row.gateway === "waafipay" ? "WaafiPay" : row.gateway;

    return (
        <div className="space-y-3 p-1">
            <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {Number(row.amount).toFixed(2)} {row.currency || "USD"}
                </h3>
                <p className="text-xs capitalize text-gray-500">
                    {String(row.status).replace(/_/g, " ")} - {gateway}
                </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
                <Field label="Event">{row.participation?.event?.title ?? "—"}</Field>
                <Field label="Organizer">
                    {row.participation?.event?.organizer?.business_name ?? "—"}
                </Field>
                <Field label="Participant">{row.participation?.user?.name ?? "—"}</Field>
                <Field label="Email">{row.participation?.user?.email ?? "—"}</Field>
                <Field label="Participation status">
                    {(row.participation?.status || "—").replace(/_/g, " ")}
                </Field>
                <Field label="Ticket">{row.ticket_type?.name ?? "—"}</Field>
                <Field label="Reference">{row.reference_id || "—"}</Field>
                <Field label="Payer phone">{row.payer_phone || "—"}</Field>
                <Field label="Waafi TX">{row.waafi_transaction_id || "—"}</Field>
                <Field label="Waafi issuer TX">
                    {row.waafi_issuer_transaction_id || "—"}
                </Field>
                <Field label="ID">{row.id}</Field>
                <Field label="Created">
                    {row.created_at
                        ? moment(row.created_at).format("MMM DD, YYYY HH:mm")
                        : "—"}
                </Field>
            </div>

            {row.failure_reason && (
                <Field label="Failure reason">{row.failure_reason}</Field>
            )}

            <p className="text-xs text-gray-500 dark:text-gray-400">
                Refunds are handled from the event Payments panel.
            </p>
        </div>
    );
};

export default PaymentDetail;
