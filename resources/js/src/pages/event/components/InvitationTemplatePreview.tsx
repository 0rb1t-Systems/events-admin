import { useQuery } from "@tanstack/react-query";
import React from "react";
import Loader from "../../../components/Loader";
import { eventApi } from "../../../services/event";

interface Props {
    eventId: number;
}

const KNOWN_FIELDS: { key: string; label: string }[] = [
    { key: "title", label: "Header text" },
    { key: "subtitle", label: "Subtitle" },
    { key: "primary_color", label: "Primary color" },
    { key: "secondary_color", label: "Secondary color" },
    { key: "background_color", label: "Background color" },
    { key: "logo_url", label: "Logo" },
    { key: "show_qr", label: "Show QR" },
    { key: "show_date", label: "Show date" },
    { key: "show_venue", label: "Show venue" },
    { key: "layout", label: "Layout" },
    { key: "message", label: "Message" },
];

const formatValue = (value: unknown): string => {
    if (value === null || value === undefined || value === "") return "Not configured";
    if (typeof value === "boolean") return value ? "Yes" : "No";
    if (typeof value === "object") return JSON.stringify(value);
    return String(value);
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

    const template = data?.template;
    if (!template) {
        return (
            <p className="text-sm text-gray-500 dark:text-gray-400">
                No invitation template has been configured for this event yet. The
                organizer will set this up on the Web App.
            </p>
        );
    }

    const config = (template.config && typeof template.config === "object"
        ? template.config
        : {}) as Record<string, unknown>;

    const knownKeys = new Set(KNOWN_FIELDS.map((f) => f.key));
    const extraKeys = Object.keys(config).filter((k) => !knownKeys.has(k));

    return (
        <div className="space-y-3 text-sm">
            <p className="text-xs text-gray-500 dark:text-gray-400">
                Read-only preview of organizer-authored invitation card config.
            </p>

            <div className="grid grid-cols-2 gap-3">
                {KNOWN_FIELDS.map(({ key, label }) => (
                    <div key={key}>
                        <label className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                            {label}
                        </label>
                        <div className="mt-0.5 text-gray-900 dark:text-white">
                            {key.includes("color") &&
                            typeof config[key] === "string" &&
                            String(config[key]).startsWith("#") ? (
                                <span className="inline-flex items-center gap-2">
                                    <span
                                        className="inline-block h-3 w-3 rounded border border-gray-200 dark:border-gray-600"
                                        style={{ backgroundColor: String(config[key]) }}
                                    />
                                    {formatValue(config[key])}
                                </span>
                            ) : (
                                formatValue(config[key])
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {extraKeys.length > 0 && (
                <div>
                    <label className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                        Additional fields
                    </label>
                    <ul className="mt-1 space-y-1 text-xs text-gray-700 dark:text-gray-300">
                        {extraKeys.map((key) => (
                            <li key={key}>
                                <span className="font-medium">{key}:</span>{" "}
                                {formatValue(config[key])}
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
};

export default InvitationTemplatePreview;
