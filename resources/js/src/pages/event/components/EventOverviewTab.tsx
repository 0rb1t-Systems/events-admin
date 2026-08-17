import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import moment from "moment";
import React from "react";
import { toast } from "sonner";
import Loader from "../../../components/Loader";
import { usePermission } from "../../../hooks";
import { eventApi } from "../../../services/event";
import { EventStatus } from "../../../types";
import CheckInStatsPanel from "./CheckInStatsPanel";
import EventField from "./EventField";
import { EVENT_STATUS_OPTIONS } from "./EventForm";
import EventFinancePanel from "./EventFinancePanel";

interface Props {
    eventId: number;
}

const formatCapacity = (capacity: number | null | undefined, count: number) => {
    if (capacity === null || capacity === undefined) return `${count} / Unlimited`;
    if (capacity === 0) return `${count} / 0 (none)`;
    return `${count} / ${capacity}`;
};

const EventOverviewTab: React.FC<Props> = ({ eventId }) => {
    const queryClient = useQueryClient();
    const { hasPermission } = usePermission();
    const canEditEvent = hasPermission("edit events");

    const { data: event, isLoading, error } = useQuery({
        queryKey: ["event", eventId],
        queryFn: () => eventApi.getById(eventId),
        enabled: !!eventId,
    });

    const syncMut = useMutation({
        mutationFn: () => eventApi.syncCapacity(eventId),
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

    const transitionMut = useMutation({
        mutationFn: (status: EventStatus) => eventApi.transition(eventId, status),
        onSuccess: () => {
            toast.success("Status updated");
            queryClient.invalidateQueries({ queryKey: ["event", eventId] });
            queryClient.invalidateQueries({ queryKey: ["Event Table"] });
        },
        onError: (e: Error) => toast.error(e.message),
    });

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
    const registered = event.registered_count ?? event.registrations_count ?? 0;

    return (
        <div className="space-y-5 p-1">
            <div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                    {event.title}
                </h3>
                <p className="mt-1 text-sm capitalize text-gray-600 dark:text-gray-300">
                    {String(event.status).replace(/_/g, " ")}
                </p>
            </div>

            <EventFinancePanel eventId={event.id} />
            <CheckInStatsPanel eventId={event.id} />

            {canEditEvent && (
                <div className="border-t border-gray-100 pt-3 dark:border-[#1b2e4b]">
                    <h4 className="mb-2 text-sm font-semibold text-gray-900 dark:text-white">
                        Status
                    </h4>
                    <div className="flex flex-wrap gap-2">
                        {EVENT_STATUS_OPTIONS.map((option) => {
                            const active = event.status === option.value;
                            return (
                                <button
                                    key={option.value}
                                    type="button"
                                    className={`btn btn-sm ${
                                        active ? "btn-primary" : "btn-outline-primary"
                                    }`}
                                    disabled={active || transitionMut.isPending}
                                    onClick={() => transitionMut.mutate(option.value)}
                                >
                                    {option.label}
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}

            <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
                <EventField label="Organizer">
                    {event.organizer?.business_name ?? `#${event.organizer_id}`}
                </EventField>
                <EventField label="Category">{event.category?.name ?? "—"}</EventField>
                <EventField label="City">{event.city || "—"}</EventField>
                <EventField label="Address">{event.address || "—"}</EventField>
                <EventField label="Lat / Lng">
                    {event.latitude != null && event.longitude != null
                        ? `${event.latitude}, ${event.longitude}`
                        : "—"}
                </EventField>
                <EventField label="Featured">{event.featured ? "Yes" : "No"}</EventField>
                <EventField label="Monetized">{event.monetized ? "Yes" : "No"}</EventField>
                <EventField label="Capacity">
                    {formatCapacity(event.capacity, registered)}
                    {event.seats_remaining != null && (
                        <span className="ml-1 text-xs text-gray-500">
                            ({event.seats_remaining} left)
                        </span>
                    )}
                </EventField>
                <EventField label="Waitlisted">{event.waitlisted_count ?? 0}</EventField>
                <EventField label="Reg. deadline">
                    {event.registration_deadline
                        ? moment(event.registration_deadline).format("MMM DD, YYYY HH:mm")
                        : "—"}
                </EventField>
                <EventField label="Starts">
                    {event.starts_at
                        ? moment(event.starts_at).format("MMM DD, YYYY HH:mm")
                        : "—"}
                </EventField>
                <EventField label="Ends">
                    {event.ends_at ? moment(event.ends_at).format("MMM DD, YYYY HH:mm") : "—"}
                </EventField>
                <EventField label="ID">{event.id}</EventField>
            </div>

            {event.description && (
                <EventField label="Description">
                    <p className="whitespace-pre-wrap text-sm">{event.description}</p>
                </EventField>
            )}

            <div className="border-t border-gray-100 pt-3 dark:border-[#1b2e4b]">
                <h4 className="mb-2 text-sm font-semibold text-gray-900 dark:text-white">
                    Registration gates (independent)
                </h4>
                <div className="space-y-1.5 text-sm text-gray-700 dark:text-gray-300">
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
                {canEditEvent && (
                    <button
                        type="button"
                        className="btn btn-outline-primary btn-sm mt-2"
                        onClick={() => syncMut.mutate()}
                        disabled={syncMut.isPending}
                    >
                        Sync sold_out from capacity
                    </button>
                )}
            </div>
        </div>
    );
};

export default EventOverviewTab;
