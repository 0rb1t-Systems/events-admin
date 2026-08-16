import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import moment from "moment";
import React from "react";
import { toast } from "sonner";
import Loader from "../../../components/Loader";
import { useConfirmDialog } from "../../../hooks";
import { eventApi } from "../../../services/event";

interface Props {
    eventId: number | null;
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

const formatCapacity = (capacity: number | null | undefined, count: number) => {
    if (capacity === null || capacity === undefined) return `${count} / Unlimited`;
    if (capacity === 0) return `${count} / 0 (none)`;
    return `${count} / ${capacity}`;
};

const EventDetail: React.FC<Props> = ({ eventId }) => {
    const queryClient = useQueryClient();
    const { confirmAction } = useConfirmDialog();

    const { data: event, isLoading, error } = useQuery({
        queryKey: ["event", eventId],
        queryFn: () => eventApi.getById(eventId!),
        enabled: !!eventId,
    });

    const syncMut = useMutation({
        mutationFn: () => eventApi.syncCapacity(eventId!),
        onSuccess: (data) => {
            toast.success(
                data.status_changed
                    ? "Capacity sync moved event to sold_out"
                    : "Capacity sync — no status change"
            );
            queryClient.invalidateQueries({ queryKey: ["event", eventId] });
            queryClient.invalidateQueries({ queryKey: ["Event Table"] });
        },
        onError: (e: Error) => toast.error(e.message),
    });

    const deleteImage = useMutation({
        mutationFn: (imageId: number) => eventApi.deleteGalleryImage(eventId!, imageId),
        onSuccess: () => {
            toast.success("Image removed (file deleted from disk)");
            queryClient.invalidateQueries({ queryKey: ["event", eventId] });
        },
        onError: (e: Error) => toast.error(e.message),
    });

    if (!eventId) {
        return (
            <div className="p-4 text-center text-sm text-gray-500">Select an event</div>
        );
    }
    if (isLoading) {
        return (
            <div className="p-4">
                <Loader />
            </div>
        );
    }
    if (error || !event) {
        return <div className="p-4 text-center text-sm text-red-500">Failed to load</div>;
    }

    const gates = event.registration_gates;

    return (
        <div className="space-y-4 p-1">
            <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {event.title}
                </h3>
                <p className="text-sm capitalize text-gray-500">{event.status}</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
                <Field label="Organizer">
                    {event.organizer?.business_name ?? `#${event.organizer_id}`}
                </Field>
                <Field label="Category">{event.category?.name ?? "—"}</Field>
                <Field label="City">{event.city || "—"}</Field>
                <Field label="Address">{event.address || "—"}</Field>
                <Field label="Lat / Lng">
                    {event.latitude != null && event.longitude != null
                        ? `${event.latitude}, ${event.longitude}`
                        : "—"}
                </Field>
                <Field label="Featured">{event.featured ? "Yes" : "No"}</Field>
                <Field label="Monetized">{event.monetized ? "Yes" : "No"}</Field>
                <Field label="Capacity">
                    {formatCapacity(event.capacity, event.registrations_count)}
                </Field>
                <Field label="Reg. deadline">
                    {event.registration_deadline
                        ? moment(event.registration_deadline).format("MMM DD, YYYY HH:mm")
                        : "—"}
                </Field>
                <Field label="Starts">
                    {event.starts_at
                        ? moment(event.starts_at).format("MMM DD, YYYY HH:mm")
                        : "—"}
                </Field>
                <Field label="Ends">
                    {event.ends_at ? moment(event.ends_at).format("MMM DD, YYYY HH:mm") : "—"}
                </Field>
                <Field label="ID">{event.id}</Field>
            </div>

            {event.description && (
                <Field label="Description">
                    <p className="whitespace-pre-wrap text-sm">{event.description}</p>
                </Field>
            )}

            <div className="border-t border-gray-100 pt-3 dark:border-[#1b2e4b]">
                <h4 className="mb-2 text-sm font-semibold text-gray-900 dark:text-white">
                    Registration gates (independent)
                </h4>
                <div className="space-y-1 text-xs text-gray-700 dark:text-gray-300">
                    <div>
                        Capacity reached:{" "}
                        <strong>{gates?.capacity_reached ? "yes" : "no"}</strong>
                    </div>
                    <div>
                        Deadline passed:{" "}
                        <strong>{gates?.deadline_passed ? "yes" : "no"}</strong>
                    </div>
                    <div>
                        Can accept registration:{" "}
                        <strong>{gates?.allowed ? "yes" : "no"}</strong>
                        {gates?.reason ? ` (${gates.reason})` : ""}
                    </div>
                </div>
                <button
                    type="button"
                    className="btn btn-outline-primary btn-sm mt-2"
                    onClick={() => syncMut.mutate()}
                    disabled={syncMut.isPending}
                >
                    Sync sold_out from capacity
                </button>
            </div>

            <div className="border-t border-gray-100 pt-3 dark:border-[#1b2e4b]">
                <h4 className="mb-2 text-sm font-semibold text-gray-900 dark:text-white">
                    Gallery
                </h4>
                {(event.images?.length ?? 0) === 0 ? (
                    <p className="text-sm text-gray-500">No images</p>
                ) : (
                    <ul className="max-h-40 space-y-1 overflow-y-auto text-xs">
                        {event.images!.map((img) => (
                            <li
                                key={img.id}
                                className="flex items-center justify-between gap-2 rounded border border-gray-100 px-2 py-1 dark:border-[#1b2e4b]"
                            >
                                <span className="truncate">{img.path}</span>
                                <button
                                    type="button"
                                    className="text-danger"
                                    onClick={async () => {
                                        const ok = await confirmAction({
                                            title: "Delete gallery image?",
                                            text: "Removes the DB row and deletes the file from disk.",
                                            confirmButtonText: "Delete",
                                        });
                                        if (ok) deleteImage.mutate(img.id);
                                    }}
                                >
                                    Remove
                                </button>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
};

export default EventDetail;
