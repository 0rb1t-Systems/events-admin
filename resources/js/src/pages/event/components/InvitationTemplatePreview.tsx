import { useQuery } from "@tanstack/react-query";
import React from "react";
import Loader from "../../../components/Loader";
import { eventApi } from "../../../services/event";
import { IEventInvitationTemplate } from "../../../types/invitationTemplate";

interface Props {
    eventId: number;
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

const modeLabel = (mode?: string | null) => {
    if (mode === "template") return "Template (system design)";
    if (mode === "custom") return "Custom (uploaded background)";
    return "Not configured";
};

const InvitationTemplatePreview: React.FC<Props> = ({ eventId }) => {
    const { data, isLoading, error } = useQuery({
        queryKey: ["event-invitation-template", eventId],
        queryFn: () => eventApi.getInvitationTemplate(eventId),
    });

    if (isLoading) return <Loader />;
    if (error) {
        return (
            <p className="text-sm text-red-500">Failed to load invitation template</p>
        );
    }

    const template = (data?.template || null) as IEventInvitationTemplate | null;

    if (!template || !template.mode) {
        return (
            <p className="text-sm text-gray-500 dark:text-gray-400">
                No invitation template has been configured for this event yet. The
                organizer will set this up on the Web App.
            </p>
        );
    }

    const customizations = template.customizations ?? {};
    const overlays = template.overlay_positions ?? {};
    const legacyConfig = template.config ?? {};

    return (
        <div className="space-y-3 text-sm">
            <p className="text-xs text-gray-500 dark:text-gray-400">
                Read-only preview of organizer invitation setup (designer is Web App).
            </p>

            <div className="grid grid-cols-2 gap-3">
                <Field label="Mode">{modeLabel(template.mode)}</Field>
                <Field label="ID">{template.id}</Field>
            </div>

            {template.mode === "template" && (
                <div className="space-y-2 rounded border border-gray-100 p-2 dark:border-[#1b2e4b]">
                    <Field label="System template">
                        {template.system_template?.name ??
                            (template.system_template_id
                                ? `#${template.system_template_id}`
                                : "Not configured")}
                    </Field>
                    {template.system_template?.slug && (
                        <Field label="Slug">
                            <code className="text-xs">{template.system_template.slug}</code>
                        </Field>
                    )}
                    {template.system_template?.background_image_path && (
                        <Field label="System background">
                            <code className="break-all text-xs">
                                {template.system_template.background_image_path}
                            </code>
                        </Field>
                    )}
                </div>
            )}

            {template.mode === "custom" && (
                <Field label="Custom background">
                    <code className="break-all text-xs">
                        {template.background_image_path || "Not configured"}
                    </code>
                </Field>
            )}

            <div>
                <label className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    Customizations
                </label>
                <div className="mt-1 grid grid-cols-2 gap-2 text-xs">
                    {(
                        [
                            ["primary_color", "Primary color"],
                            ["secondary_color", "Secondary color"],
                            ["font_family", "Font"],
                            ["header_text", "Header text"],
                            ["logo_path", "Logo path"],
                        ] as const
                    ).map(([key, label]) => (
                        <div key={key}>
                            <span className="text-gray-500">{label}: </span>
                            <span className="text-gray-900 dark:text-white">
                                {(customizations as any)?.[key] ??
                                    (legacyConfig as any)?.[key] ??
                                    "Not configured"}
                            </span>
                        </div>
                    ))}
                </div>
            </div>

            <div>
                <label className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    Overlay positions
                </label>
                {Object.keys(overlays).length === 0 ? (
                    <p className="mt-1 text-xs text-gray-500">Not configured</p>
                ) : (
                    <ul className="mt-1 max-h-40 space-y-1 overflow-auto text-xs">
                        {Object.entries(overlays).map(([key, pos]) => (
                            <li key={key}>
                                <span className="font-medium">{key}:</span>{" "}
                                {pos
                                    ? `x=${pos.x ?? "?"}, y=${pos.y ?? "?"}${
                                          pos.width != null ? `, w=${pos.width}` : ""
                                      }${pos.height != null ? `, h=${pos.height}` : ""}${
                                          pos.font_size != null
                                              ? `, size=${pos.font_size}`
                                              : ""
                                      }`
                                    : "Not configured"}
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
};

export default InvitationTemplatePreview;
