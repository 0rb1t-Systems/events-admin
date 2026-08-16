import { useQuery } from "@tanstack/react-query";
import moment from "moment";
import React from "react";
import Loader from "../../../components/Loader";
import { qrScanLogApi } from "../../../services/qrScanLog";
import { IQrScanLog } from "../../../types/qrScan";

interface Props {
    scanId: number | null;
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

const QrScanLogDetail: React.FC<Props> = ({ scanId }) => {
    const { data: log, isLoading, error } = useQuery({
        queryKey: ["qr-scan-log", scanId],
        queryFn: () => qrScanLogApi.getById(scanId!),
        enabled: !!scanId,
    });

    if (!scanId) {
        return (
            <div className="p-4 text-center text-sm text-gray-500">
                Select a scan to view details
            </div>
        );
    }
    if (isLoading) {
        return <Loader />;
    }
    if (error || !log) {
        return <div className="p-4 text-center text-sm text-red-500">Failed to load</div>;
    }

    const row = log as IQrScanLog;

    return (
        <div className="space-y-3 p-1">
            <div>
                <h3 className="text-lg font-semibold capitalize text-gray-900 dark:text-white">
                    {(row.result || "").replace(/_/g, " ")}
                </h3>
                <p className="text-xs text-gray-500">
                    {row.created_at
                        ? moment(row.created_at).format("MMM DD, YYYY HH:mm:ss")
                        : "—"}
                </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
                <Field label="Event">{row.event?.title ?? (row.event_id ? `#${row.event_id}` : "—")}</Field>
                <Field label="Gate">{row.gate || "—"}</Field>
                <Field label="Participant">
                    {row.participation?.user?.name ??
                        (row.participation_id ? `#${row.participation_id}` : "—")}
                </Field>
                <Field label="Email">{row.participation?.user?.email ?? "—"}</Field>
                <Field label="Participation status">
                    {row.participation?.status?.replace(/_/g, " ") ?? "—"}
                </Field>
                <Field label="Scanner">{row.scanner_user?.name ?? "—"}</Field>
                <Field label="ID">{row.id}</Field>
            </div>

            <Field label="Scanned token">
                <code className="break-all text-xs">{row.scanned_token}</code>
            </Field>

            {row.meta && Object.keys(row.meta).length > 0 && (
                <Field label="Meta">
                    <pre className="max-h-32 overflow-auto rounded bg-gray-50 p-2 text-xs dark:bg-[#0e1726]">
                        {JSON.stringify(row.meta, null, 2)}
                    </pre>
                </Field>
            )}
        </div>
    );
};

export default QrScanLogDetail;
