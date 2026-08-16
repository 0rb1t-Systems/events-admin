import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import moment from "moment";
import React from "react";
import { toast } from "sonner";
import Loader from "../../../components/Loader";
import { useConfirmDialog, usePermission } from "../../../hooks";
import { certificateApi } from "../../../services/certificate";
import { ICertificate } from "../../../types/certificate";

interface Props {
    certificateId: number | null;
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

const CertificateDetail: React.FC<Props> = ({ certificateId }) => {
    const queryClient = useQueryClient();
    const { confirmAction } = useConfirmDialog();
    const { hasPermission } = usePermission();
    const canReissue = hasPermission("reissue certificates");

    const { data, isLoading, error } = useQuery({
        queryKey: ["certificate", certificateId],
        queryFn: () => certificateApi.getById(certificateId!),
        enabled: !!certificateId,
    });

    const reissue = useMutation({
        mutationFn: (participationId: number) => certificateApi.reissue(participationId),
        onSuccess: () => {
            toast.success("Certificate re-issued");
            queryClient.invalidateQueries({ queryKey: ["certificate", certificateId] });
            queryClient.invalidateQueries({ queryKey: ["Certificates"] });
        },
        onError: (e: any) => toast.error(e?.message || "Re-issue failed"),
    });

    if (!certificateId) {
        return (
            <div className="p-4 text-center text-sm text-gray-500">
                Select a certificate to view details
            </div>
        );
    }
    if (isLoading) return <Loader />;
    if (error || !data) {
        return <div className="p-4 text-center text-sm text-red-500">Failed to load</div>;
    }

    const row = data as ICertificate;
    const fileHref = row.file_url || row.file_path || null;

    return (
        <div className="space-y-3 p-1">
            <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {row.participation?.user?.name ?? `P#${row.participation_id}`}
                </h3>
                <p className="text-xs text-gray-500">
                    {row.participation?.event?.title ?? "—"}
                </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
                <Field label="Participant">{row.participation?.user?.name ?? "—"}</Field>
                <Field label="Email">{row.participation?.user?.email ?? "—"}</Field>
                <Field label="Event">{row.participation?.event?.title ?? "—"}</Field>
                <Field label="Verified">{row.verified ? "Yes" : "No"}</Field>
                <Field label="Issued">
                    {row.issued_at
                        ? moment(row.issued_at).format("MMM DD, YYYY HH:mm")
                        : "—"}
                </Field>
                <Field label="ID">{row.id}</Field>
            </div>

            <Field label="File">
                {fileHref ? (
                    <a
                        href={fileHref.startsWith("http") ? fileHref : `/${fileHref}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-primary underline"
                    >
                        View / download
                    </a>
                ) : (
                    "No file yet"
                )}
            </Field>

            {canReissue && (
                <button
                    type="button"
                    className="btn btn-outline-primary btn-sm"
                    disabled={reissue.isPending}
                    onClick={async () => {
                        const name =
                            row.participation?.user?.name ??
                            `participation #${row.participation_id}`;
                        const ok = await confirmAction({
                            title: "Re-issue certificate?",
                            text: `Re-issue certificate for ${name}? This will replace their existing certificate.`,
                            confirmButtonText: "Re-issue",
                        });
                        if (ok) reissue.mutate(row.participation_id);
                    }}
                >
                    Re-issue Certificate
                </button>
            )}
        </div>
    );
};

export default CertificateDetail;
