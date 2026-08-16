import { useQuery } from "@tanstack/react-query";
import React from "react";
import Loader from "../../../components/Loader";
import { eventApi } from "../../../services/event";
import { IEventFormField } from "../../../types/event";

interface Props {
    eventId: number;
}

const typeLabel = (t: string) => t.replace(/_/g, " ");

const optionsPreview = (field: IEventFormField): string | null => {
    if (!field.options || field.options.length === 0) return null;
    const values = field.options.map((o) =>
        typeof o === "string" ? o : String(o.value ?? o.label ?? "")
    );
    return values.filter(Boolean).join(", ");
};

/** Admin read-only view of organizer-authored registration form schema. */
const FormFieldOversight: React.FC<Props> = ({ eventId }) => {
    const { data, isLoading, error } = useQuery({
        queryKey: ["event-form-fields", eventId],
        queryFn: () => eventApi.formFields(eventId),
    });

    if (isLoading) {
        return <Loader />;
    }
    if (error || !data) {
        return <p className="text-sm text-red-500">Failed to load form fields</p>;
    }

    if (data.form_fields.length === 0) {
        return <p className="text-sm text-gray-500">No custom form fields</p>;
    }

    return (
        <ul className="max-h-56 space-y-1.5 overflow-y-auto text-xs">
            {data.form_fields.map((f) => {
                const opts = optionsPreview(f);
                return (
                    <li
                        key={f.id}
                        className="rounded border border-gray-100 px-2 py-1.5 dark:border-[#1b2e4b]"
                    >
                        <div className="flex items-center justify-between gap-2">
                            <span className="font-medium text-gray-900 dark:text-white">
                                {f.label}
                            </span>
                            <span className="shrink-0 text-gray-500">
                                {f.required ? "required" : "optional"}
                                {!f.active ? " · inactive" : ""}
                            </span>
                        </div>
                        <div className="text-gray-500">
                            <code className="text-[11px]">{f.key}</code>
                            {" · "}
                            {typeLabel(f.type)}
                            {opts ? ` · [${opts}]` : ""}
                        </div>
                    </li>
                );
            })}
        </ul>
    );
};

export default FormFieldOversight;
