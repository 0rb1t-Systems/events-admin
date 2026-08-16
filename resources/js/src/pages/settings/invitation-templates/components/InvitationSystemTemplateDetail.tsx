import { useQuery } from "@tanstack/react-query";
import moment from "moment";
import React from "react";
import Loader from "../../../../components/Loader";
import { invitationSystemTemplateApi } from "../../../../services/invitationSystemTemplate";
import { IInvitationSystemTemplate } from "../../../../types/invitationTemplate";

interface Props {
    templateId: number | null;
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

const InvitationSystemTemplateDetail: React.FC<Props> = ({ templateId }) => {
    const { data, isLoading, error } = useQuery({
        queryKey: ["invitation-system-template", templateId],
        queryFn: () => invitationSystemTemplateApi.getById(templateId!),
        enabled: !!templateId,
    });

    if (!templateId) {
        return (
            <div className="p-4 text-center text-sm text-gray-500">
                Select a template to view details
            </div>
        );
    }
    if (isLoading) return <Loader />;
    if (error || !data) {
        return <div className="p-4 text-center text-sm text-red-500">Failed to load</div>;
    }

    const row = data as IInvitationSystemTemplate;

    return (
        <div className="space-y-3 p-1">
            <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {row.name}
                </h3>
                <p className="text-xs text-gray-500">{row.slug}</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
                <Field label="Status">{row.active ? "Active" : "Inactive"}</Field>
                <Field label="ID">{row.id}</Field>
                <Field label="Created">
                    {row.created_at ? moment(row.created_at).format("MMM DD, YYYY") : "—"}
                </Field>
                <Field label="Updated">
                    {row.updated_at ? moment(row.updated_at).format("MMM DD, YYYY") : "—"}
                </Field>
            </div>

            <Field label="Background path">
                <code className="break-all text-xs">{row.background_image_path}</code>
            </Field>
            <Field label="Thumbnail path">
                <code className="break-all text-xs">{row.thumbnail_path || "—"}</code>
            </Field>

            {row.thumbnail_path && (
                <img
                    src={row.thumbnail_path}
                    alt={row.name}
                    className="max-h-32 rounded border border-gray-100 dark:border-[#1b2e4b]"
                />
            )}

            <Field label="Default customizations">
                <pre className="max-h-32 overflow-auto rounded bg-gray-50 p-2 text-xs dark:bg-[#0e1726]">
                    {JSON.stringify(row.default_customizations ?? {}, null, 2)}
                </pre>
            </Field>

            <Field label="Default overlay positions">
                <pre className="max-h-40 overflow-auto rounded bg-gray-50 p-2 text-xs dark:bg-[#0e1726]">
                    {JSON.stringify(row.default_overlay_positions ?? {}, null, 2)}
                </pre>
            </Field>
        </div>
    );
};

export default InvitationSystemTemplateDetail;
