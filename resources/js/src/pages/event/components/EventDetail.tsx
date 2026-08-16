import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import moment from "moment";
import React, { useState } from "react";
import { toast } from "sonner";
import Loader from "../../../components/Loader";
import { useConfirmDialog, usePermission } from "../../../hooks";
import { eventApi } from "../../../services/event";
import { ITicketType, IDiscountCode } from "../../../types";
import ParticipationOversight from "./ParticipationOversight";
import FormFieldOversight from "./FormFieldOversight";
import CheckInStatsPanel from "./CheckInStatsPanel";
import EventFinancePanel from "./EventFinancePanel";
import EventAnalyticsPanel from "./EventAnalyticsPanel";
import EventAddOnOversight from "./EventAddOnOversight";
import EventPaymentsPanel from "./EventPaymentsPanel";
import InvitationTemplatePreview from "./InvitationTemplatePreview";
import TicketTypeModal from "./TicketTypeModal";
import DiscountCodeModal from "./DiscountCodeModal";
import GenericModal from "../../../components/GenericModal";
import FileUpload from "../../../components/form/FileUpload";

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
    const { hasPermission } = usePermission();
    const canEditEvent = hasPermission("edit events");

    const [ttModal, setTtModal] = useState<{ open: boolean; item: ITicketType | null }>({
        open: false,
        item: null,
    });
    const [dcModal, setDcModal] = useState<{ open: boolean; item: IDiscountCode | null }>({
        open: false,
        item: null,
    });
    const [galleryOpen, setGalleryOpen] = useState(false);
    const [galleryFile, setGalleryFile] = useState<File | null>(null);
    const [galleryError, setGalleryError] = useState<string | null>(null);

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

    const uploadImage = useMutation({
        mutationFn: (file: File) => eventApi.uploadGalleryImage(eventId!, file),
        onSuccess: () => {
            toast.success("Image uploaded");
            queryClient.invalidateQueries({ queryKey: ["event", eventId] });
            setGalleryOpen(false);
            setGalleryFile(null);
            setGalleryError(null);
        },
        onError: (e: any) => toast.error(e?.message || "Upload failed"),
    });

    const disableSales = useMutation({
        mutationFn: (ticketTypeId: number) => eventApi.disableTicketSales(ticketTypeId),
        onSuccess: () => {
            toast.success("Further sales disabled");
            queryClient.invalidateQueries({ queryKey: ["event", eventId] });
            queryClient.invalidateQueries({ queryKey: ["Event Table"] });
        },
        onError: (e: Error) => toast.error(e.message),
    });

    const enableSales = useMutation({
        mutationFn: (ticketTypeId: number) => eventApi.enableTicketSales(ticketTypeId),
        onSuccess: () => {
            toast.success("Sales re-enabled");
            queryClient.invalidateQueries({ queryKey: ["event", eventId] });
            queryClient.invalidateQueries({ queryKey: ["Event Table"] });
        },
        onError: (e: Error) => toast.error(e.message),
    });

    const deleteTt = useMutation({
        mutationFn: (id: number) => eventApi.deleteTicketType(id),
        onSuccess: () => {
            toast.success("Ticket type deleted");
            queryClient.invalidateQueries({ queryKey: ["event", eventId] });
            queryClient.invalidateQueries({ queryKey: ["Event Table"] });
        },
        onError: (e: any) => toast.error(e?.message || "Delete failed"),
    });

    const deleteDc = useMutation({
        mutationFn: (id: number) => eventApi.deleteDiscountCode(id),
        onSuccess: () => {
            toast.success("Discount code deleted");
            queryClient.invalidateQueries({ queryKey: ["event", eventId] });
            queryClient.invalidateQueries({ queryKey: ["Event Table"] });
        },
        onError: (e: any) => toast.error(e?.message || "Delete failed"),
    });

    const toggleDcActive = useMutation({
        mutationFn: ({ id, active }: { id: number; active: boolean }) =>
            eventApi.updateDiscountCode(id, { active }),
        onSuccess: () => {
            toast.success("Code updated");
            queryClient.invalidateQueries({ queryKey: ["event", eventId] });
        },
        onError: (e: any) => toast.error(e?.message || "Update failed"),
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
    <>
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
                    {formatCapacity(event.capacity, event.registered_count ?? event.registrations_count)}
                    {event.seats_remaining != null && (
                        <span className="ml-1 text-xs text-gray-500">
                            ({event.seats_remaining} left)
                        </span>
                    )}
                </Field>
                <Field label="Waitlisted">{event.waitlisted_count ?? 0}</Field>
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
                    Analytics
                </h4>
                <EventAnalyticsPanel eventId={event.id} />
            </div>

            <div className="border-t border-gray-100 pt-3 dark:border-[#1b2e4b]">
                <h4 className="mb-2 text-sm font-semibold text-gray-900 dark:text-white">
                    Financial summary
                </h4>
                <p className="mb-2 text-xs text-gray-500">
                    Collected vs paid out / outstanding (USD).
                </p>
                <EventFinancePanel eventId={event.id} />
            </div>

            <div className="border-t border-gray-100 pt-3 dark:border-[#1b2e4b]">
                <h4 className="mb-2 text-sm font-semibold text-gray-900 dark:text-white">
                    Payments
                </h4>
                <p className="mb-2 text-xs text-gray-500 dark:text-gray-400">
                    Individual transactions for this event. Refunds available on completed payments.
                </p>
                <EventPaymentsPanel eventId={event.id} />
            </div>

            <div className="border-t border-gray-100 pt-3 dark:border-[#1b2e4b]">
                <h4 className="mb-2 text-sm font-semibold text-gray-900 dark:text-white">
                    Check-in dashboard
                </h4>
                <p className="mb-2 text-xs text-gray-500">
                    Registered vs arrived vs absent (scanning UI is Web App).
                </p>
                <CheckInStatsPanel eventId={event.id} />
            </div>

            <div className="border-t border-gray-100 pt-3 dark:border-[#1b2e4b]">
                <h4 className="mb-2 text-sm font-semibold text-gray-900 dark:text-white">
                    Participations
                </h4>
                <ParticipationOversight eventId={eventId} />
            </div>

            <div className="border-t border-gray-100 pt-3 dark:border-[#1b2e4b]">
                <h4 className="mb-2 text-sm font-semibold text-gray-900 dark:text-white">
                    Registration form
                </h4>
                <FormFieldOversight eventId={event.id} />
            </div>

            <div className="border-t border-gray-100 pt-3 dark:border-[#1b2e4b]">
                <div className="mb-2 flex items-center justify-between gap-2">
                    <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
                        Ticket types
                    </h4>
                    <button
                        type="button"
                        className="btn btn-primary btn-sm gap-1"
                        onClick={() => setTtModal({ open: true, item: null })}
                    >
                        + Add
                    </button>
                </div>
                <p className="mb-2 text-xs text-gray-500">
                    Monetized is derived from paid tiers (price &gt; 0).
                </p>
                {(event.ticket_types?.length ?? 0) === 0 ? (
                    <p className="text-sm text-gray-500">No ticket types</p>
                ) : (
                    <ul className="max-h-48 space-y-1.5 overflow-y-auto text-xs">
                        {event.ticket_types!.map((tt) => (
                            <li
                                key={tt.id}
                                className="rounded border border-gray-100 px-2 py-1.5 dark:border-[#1b2e4b]"
                            >
                                <div className="flex items-center justify-between gap-2">
                                    <span className="font-medium">{tt.name}</span>
                                    <span>
                                        ${Number(tt.price).toFixed(2)}
                                        {Number(tt.price) === 0 ? " (free)" : ""}
                                    </span>
                                </div>
                                <div className="text-gray-500">
                                    Sold{" "}
                                    {tt.quantity_limit === null
                                        ? `${tt.quantity_sold} / Unlimited`
                                        : `${tt.quantity_sold} / ${tt.quantity_limit}`}
                                    {" · "}
                                    {tt.sales_enabled ? "Sales on" : "Sales off"}
                                </div>
                                <div className="mt-1 flex flex-wrap gap-1">
                                    <button
                                        type="button"
                                        className="btn btn-outline-primary btn-sm"
                                        onClick={() => setTtModal({ open: true, item: tt })}
                                    >
                                        Edit
                                    </button>
                                    {tt.sales_enabled ? (
                                        <button
                                            type="button"
                                            className="btn btn-outline-danger btn-sm"
                                            onClick={async () => {
                                                const ok = await confirmAction({
                                                    title: "Disable further sales?",
                                                    text: `Stop new sales for "${tt.name}".`,
                                                    confirmButtonText: "Disable",
                                                });
                                                if (ok) disableSales.mutate(tt.id);
                                            }}
                                        >
                                            Disable sales
                                        </button>
                                    ) : (
                                        <button
                                            type="button"
                                            className="btn btn-outline-success btn-sm"
                                            onClick={() => enableSales.mutate(tt.id)}
                                        >
                                            Enable sales
                                        </button>
                                    )}
                                    <button
                                        type="button"
                                        className="btn btn-outline-danger btn-sm"
                                        onClick={async () => {
                                            const ok = await confirmAction({
                                                title: "Delete ticket type?",
                                                text: `Soft-deletes "${tt.name}". Blocked if sales history exists.`,
                                                confirmButtonText: "Delete",
                                            });
                                            if (ok) deleteTt.mutate(tt.id);
                                        }}
                                    >
                                        Delete
                                    </button>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            <div className="border-t border-gray-100 pt-3 dark:border-[#1b2e4b]">
                <div className="mb-2 flex items-center justify-between gap-2">
                    <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
                        Discount codes
                    </h4>
                    <button
                        type="button"
                        className="btn btn-primary btn-sm gap-1"
                        onClick={() => setDcModal({ open: true, item: null })}
                    >
                        + Add
                    </button>
                </div>
                {(event.discount_codes?.length ?? 0) === 0 ? (
                    <p className="text-sm text-gray-500">No codes for this event</p>
                ) : (
                    <ul className="max-h-44 space-y-1.5 overflow-y-auto text-xs">
                        {event.discount_codes!.map((dc) => (
                            <li
                                key={dc.id}
                                className="rounded border border-gray-100 px-2 py-1.5 dark:border-[#1b2e4b]"
                            >
                                <div className="flex items-center justify-between gap-2">
                                    <span className="font-medium">{dc.code}</span>
                                    <span>
                                        {dc.type === "percent"
                                            ? `${dc.value}%`
                                            : `$${Number(dc.value).toFixed(2)}`}
                                    </span>
                                </div>
                                <div className="text-gray-500">
                                    Used {dc.usage_count}
                                    {dc.usage_limit ? ` / ${dc.usage_limit}` : ""}
                                    {dc.expires_at
                                        ? ` · exp ${moment(dc.expires_at).format("MMM DD, YYYY")}`
                                        : ""}
                                    {dc.event_id ? " · event" : " · org-wide"}
                                </div>
                                <div className="mt-1 flex flex-wrap gap-1">
                                    <button
                                        type="button"
                                        className="btn btn-outline-primary btn-sm"
                                        onClick={() => setDcModal({ open: true, item: dc })}
                                    >
                                        Edit
                                    </button>
                                    <button
                                        type="button"
                                        className={`btn btn-sm ${dc.active ? "btn-outline-warning" : "btn-outline-success"}`}
                                        onClick={() =>
                                            toggleDcActive.mutate({ id: dc.id, active: !dc.active })
                                        }
                                    >
                                        {dc.active ? "Deactivate" : "Activate"}
                                    </button>
                                    <button
                                        type="button"
                                        className="btn btn-outline-danger btn-sm"
                                        onClick={async () => {
                                            const ok = await confirmAction({
                                                title: "Delete discount code?",
                                                text: `Soft-deletes code "${dc.code}".`,
                                                confirmButtonText: "Delete",
                                            });
                                            if (ok) deleteDc.mutate(dc.id);
                                        }}
                                    >
                                        Delete
                                    </button>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            <div className="border-t border-gray-100 pt-3 dark:border-[#1b2e4b]">
                <h4 className="mb-2 text-sm font-semibold text-gray-900 dark:text-white">
                    Content & engagement
                </h4>
                <EventAddOnOversight eventId={event.id} />
            </div>

            <div className="border-t border-gray-100 pt-3 dark:border-[#1b2e4b]">
                <h4 className="mb-2 text-sm font-semibold text-gray-900 dark:text-white">
                    Invitation template
                </h4>
                <InvitationTemplatePreview eventId={event.id} />
            </div>

            <div className="border-t border-gray-100 pt-3 dark:border-[#1b2e4b]">
                <div className="mb-2 flex items-center justify-between gap-2">
                    <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
                        Gallery
                    </h4>
                    {canEditEvent && (
                        <button
                            type="button"
                            className="btn btn-primary btn-sm gap-1"
                            onClick={() => {
                                setGalleryFile(null);
                                setGalleryError(null);
                                setGalleryOpen(true);
                            }}
                        >
                            Upload Image
                        </button>
                    )}
                </div>
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
                                {canEditEvent && (
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
                                )}
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>

        {/* Ticket type create/edit modal */}
        {eventId && (
            <TicketTypeModal
                isOpen={ttModal.open}
                onClose={() => setTtModal({ open: false, item: null })}
                eventId={eventId}
                ticketType={ttModal.item}
            />
        )}

        {/* Discount code create/edit modal */}
        {eventId && (
            <DiscountCodeModal
                isOpen={dcModal.open}
                onClose={() => setDcModal({ open: false, item: null })}
                eventId={eventId}
                discountCode={dcModal.item}
            />
        )}

        <GenericModal
            isOpen={galleryOpen}
            setIsOpen={setGalleryOpen}
            title="Upload gallery image"
            maxWidth="md"
        >
            <div className="space-y-4">
                <FileUpload
                    id="event-gallery-upload"
                    label="Image"
                    accept="image/jpeg,image/png,image/jpg,image/gif,image/webp"
                    value={galleryFile}
                    onChange={(file) => {
                        setGalleryError(null);
                        if (!file) {
                            setGalleryFile(null);
                            return;
                        }
                        const okType = /image\/(jpeg|png|jpg|gif|webp)/i.test(file.type)
                            || /\.(jpe?g|png|gif|webp)$/i.test(file.name);
                        if (!okType) {
                            setGalleryError("Please select a JPG, PNG, GIF, or WebP image.");
                            setGalleryFile(null);
                            return;
                        }
                        // Backend max: 4096 KB
                        if (file.size > 4096 * 1024) {
                            setGalleryError("Image must be 4 MB or smaller.");
                            setGalleryFile(null);
                            return;
                        }
                        setGalleryFile(file);
                    }}
                    error={galleryError}
                    maxSize={4096}
                    helpText="JPG, PNG, GIF, or WebP — max 4 MB"
                />
                <div className="flex justify-end gap-2">
                    <button
                        type="button"
                        className="btn"
                        onClick={() => setGalleryOpen(false)}
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        className="btn btn-primary"
                        disabled={!galleryFile || uploadImage.isPending}
                        onClick={() => {
                            if (!galleryFile) return;
                            uploadImage.mutate(galleryFile);
                        }}
                    >
                        {uploadImage.isPending ? "Uploading…" : "Upload"}
                    </button>
                </div>
            </div>
        </GenericModal>
    </>
    );
};

export default EventDetail;
