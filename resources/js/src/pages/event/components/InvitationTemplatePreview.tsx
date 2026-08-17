import { useQuery } from "@tanstack/react-query";
import React from "react";
import Loader from "../../../components/Loader";
import SimpleAdminTable, { SimpleAdminTd } from "../../../components/SimpleAdminTable";
import { eventApi } from "../../../services/event";
import {
    IEventInvitationTemplate,
    IInvitationCustomizations,
    IOverlayPosition,
} from "../../../types/invitationTemplate";
import { statusBadgeClass } from "../../../utils/statusBadge";
import EventField from "./EventField";

interface Props {
    eventId: number;
}

const overlayLabel = (key: string) =>
    key
        .split("_")
        .map((part) => (part.toLowerCase() === "qr" ? "QR" : part.charAt(0).toUpperCase() + part.slice(1)))
        .join(" ");

const imageSrc = (path?: string | null) => {
    if (!path) return null;
    if (path.startsWith("http://") || path.startsWith("https://") || path.startsWith("/")) {
        return path;
    }
    return `/${path}`;
};

const ColorSwatch = ({ color }: { color?: string | null }) => {
    if (!color) return <span className="text-gray-500 dark:text-gray-400">Not configured</span>;
    return (
        <span className="inline-flex items-center gap-2">
            <span
                className="h-5 w-5 shrink-0 rounded border border-gray-200 dark:border-[#1b2e4b]"
                style={{ backgroundColor: color }}
                title={color}
            />
            <span className="font-medium">{color}</span>
        </span>
    );
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

    const customizations: IInvitationCustomizations = {
        ...((template.config ?? {}) as IInvitationCustomizations),
        ...(template.customizations ?? {}),
    };
    const overlays = template.overlay_positions ?? {};
    const overlayRows = Object.entries(overlays) as [string, IOverlayPosition | null][];
    const previewImage =
        imageSrc(template.system_template?.thumbnail_path) ||
        imageSrc(template.system_template?.background_image_path) ||
        imageSrc(template.background_image_path);
    const isTemplateMode = template.mode === "template";
    const templateName =
        template.system_template?.name ??
        (template.system_template_id ? `Template #${template.system_template_id}` : "Custom upload");

    return (
        <div className="space-y-6 p-1">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                    <h4 className="text-base font-semibold text-gray-900 dark:text-white">
                        Invitation
                    </h4>
                    <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
                        Read-only preview. The designer lives on the Web App.
                    </p>
                </div>
                <span className={statusBadgeClass(isTemplateMode ? "info" : "success")}>
                    {isTemplateMode ? "System template" : "Custom background"}
                </span>
            </div>

            <div className="grid gap-4 lg:grid-cols-[220px_1fr]">
                <div className="overflow-hidden rounded-lg border border-white-light dark:border-[#1b2e4b]">
                    {previewImage ? (
                        <img
                            src={previewImage}
                            alt={templateName}
                            className="h-44 w-full object-cover lg:h-full"
                        />
                    ) : (
                        <div
                            className="flex h-44 items-center justify-center px-4 text-center lg:h-full"
                            style={{
                                backgroundColor: customizations.primary_color || "#e5e7eb",
                                color: customizations.secondary_color || "#111827",
                                fontFamily: customizations.font_family || "inherit",
                            }}
                        >
                            <span className="text-lg font-semibold">
                                {customizations.header_text || "Invitation preview"}
                            </span>
                        </div>
                    )}
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <EventField label="Design">{templateName}</EventField>
                    {isTemplateMode && template.system_template?.slug ? (
                        <EventField label="Slug">{template.system_template.slug}</EventField>
                    ) : (
                        <EventField label="Background">
                            {template.background_image_path || "Not configured"}
                        </EventField>
                    )}
                    <EventField label="Header text">
                        {customizations.header_text || "Not configured"}
                    </EventField>
                    <EventField label="Font">
                        {customizations.font_family || "Not configured"}
                    </EventField>
                    <EventField label="Primary color">
                        <ColorSwatch color={customizations.primary_color} />
                    </EventField>
                    <EventField label="Secondary color">
                        <ColorSwatch color={customizations.secondary_color} />
                    </EventField>
                    <EventField label="Logo">
                        {customizations.logo_path || "Not configured"}
                    </EventField>
                </div>
            </div>

            <div>
                <h5 className="mb-3 text-base font-semibold text-gray-900 dark:text-white">
                    Overlay positions
                </h5>
                <SimpleAdminTable
                    columns={[
                        { key: "element", label: "Element" },
                        { key: "x", label: "X", align: "right" },
                        { key: "y", label: "Y", align: "right" },
                        { key: "width", label: "Width", align: "right", hideBelow: "lg" },
                        { key: "height", label: "Height", align: "right", hideBelow: "lg" },
                        { key: "size", label: "Font size", align: "right" },
                    ]}
                    empty={overlayRows.length === 0}
                    emptyText="No overlay positions configured"
                >
                    {overlayRows.map(([key, pos]) => (
                        <tr
                            key={key}
                            className="hover:bg-white-light/20 dark:hover:bg-[#1a2941]/40"
                        >
                            <SimpleAdminTd>
                                <span className="font-medium text-gray-900 dark:text-white">
                                    {overlayLabel(key)}
                                </span>
                            </SimpleAdminTd>
                            <SimpleAdminTd align="right">{pos?.x ?? "—"}</SimpleAdminTd>
                            <SimpleAdminTd align="right">{pos?.y ?? "—"}</SimpleAdminTd>
                            <SimpleAdminTd align="right" hideBelow="lg">
                                {pos?.width ?? "—"}
                            </SimpleAdminTd>
                            <SimpleAdminTd align="right" hideBelow="lg">
                                {pos?.height ?? "—"}
                            </SimpleAdminTd>
                            <SimpleAdminTd align="right">{pos?.font_size ?? "—"}</SimpleAdminTd>
                        </tr>
                    ))}
                </SimpleAdminTable>
            </div>
        </div>
    );
};

export default InvitationTemplatePreview;
