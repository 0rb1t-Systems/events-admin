import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import React, { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import GenericModal from "../../../components/GenericModal";
import Loader from "../../../components/Loader";
import FormCombobox from "../../../components/form/FormCombobox";
import FormSelect from "../../../components/form/FormSelect";
import { useConfirmDialog } from "../../../hooks";
import { useUserSearch, formatUserOption } from "../../../hooks/useEntitySearch";
import { eventApi } from "../../../services/event";
import { ITicketType, IUser } from "../../../types";

interface Props {
    eventId: number;
}

interface AddForm {
    user: IUser | null;
    ticket_type_id: string;
}

const ParticipationOversight: React.FC<Props> = ({ eventId }) => {
    const queryClient = useQueryClient();
    const { confirmAction } = useConfirmDialog();

    const [showAddModal, setShowAddModal] = useState(false);
    const [cancelReason, setCancelReason] = useState<Record<number, string>>({});

    const { data, isLoading, error } = useQuery({
        queryKey: ["event-participations", eventId],
        queryFn: () => eventApi.participations(eventId),
    });

    const ticketQuery = useQuery({
        queryKey: ["event-ticket-types-simple", eventId],
        queryFn: () => eventApi.ticketTypes(eventId),
        enabled: showAddModal,
    });

    const userSearch = useUserSearch();

    const invalidate = () => {
        queryClient.invalidateQueries({ queryKey: ["event-participations", eventId] });
        queryClient.invalidateQueries({ queryKey: ["event", eventId] });
        queryClient.invalidateQueries({ queryKey: ["Event Table"] });
    };

    const addForm = useForm<AddForm>({
        defaultValues: { user: null, ticket_type_id: "" },
    });

    const addMut = useMutation({
        mutationFn: (vals: AddForm) =>
            eventApi.createParticipation({
                event_id: eventId,
                user_id: vals.user!.id,
                ticket_type_id: vals.ticket_type_id ? Number(vals.ticket_type_id) : null,
            }),
        onSuccess: () => {
            toast.success("Participation added");
            invalidate();
            setShowAddModal(false);
            addForm.reset({ user: null, ticket_type_id: "" });
        },
        onError: (e: any) => toast.error(e?.message || "Failed to add participation"),
    });

    const promote = useMutation({
        mutationFn: (id: number) => eventApi.promoteParticipation(id),
        onSuccess: () => {
            toast.success("Promoted from waitlist");
            invalidate();
        },
        onError: (e: Error) => toast.error(e.message),
    });

    const cancel = useMutation({
        mutationFn: ({ id, reason }: { id: number; reason?: string }) =>
            eventApi.cancelParticipation(id, reason),
        onSuccess: () => {
            toast.success("Participation cancelled");
            invalidate();
        },
        onError: (e: Error) => toast.error(e.message),
    });

    if (isLoading) return <Loader />;
    if (error || !data)
        return <p className="text-sm text-red-500">Failed to load participations</p>;

    const cap = data.capacity;
    const ticketOptions: ITicketType[] = ticketQuery.data?.ticket_types ?? [];

    return (
        <>
            <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                    <p className="text-xs text-gray-500">
                        Registered {cap.registered_count}
                        {cap.capacity != null ? ` / ${cap.capacity}` : " (unlimited)"}
                        {" · "}
                        Waitlisted {cap.waitlisted_count}
                        {cap.seats_remaining != null ? ` · ${cap.seats_remaining} left` : ""}
                    </p>
                    <button
                        type="button"
                        className="btn btn-primary btn-sm gap-1"
                        onClick={() => setShowAddModal(true)}
                    >
                        + Add
                    </button>
                </div>

                {data.participations.length === 0 ? (
                    <p className="text-sm text-gray-500">No participations yet</p>
                ) : (
                    <ul className="max-h-64 space-y-1.5 overflow-y-auto text-xs">
                        {data.participations.map((p) => (
                            <li
                                key={p.id}
                                className="rounded border border-gray-100 px-2 py-1.5 dark:border-[#1b2e4b]"
                            >
                                <div className="font-medium text-gray-900 dark:text-white">
                                    {p.user?.name ?? `User #${p.user_id}`}
                                </div>
                                <div className="text-gray-500">
                                    {p.user?.email}
                                    {" · "}
                                    <span className="capitalize">{p.status.replace(/_/g, " ")}</span>
                                    {" · pay: "}
                                    {p.payment_status}
                                    {p.ticket_type ? ` · ${p.ticket_type.name}` : ""}
                                </div>

                                {/* Cancel reason input (shown when not yet cancelled) */}
                                {p.status !== "cancelled" && (
                                    <div className="mt-1 flex items-center gap-1">
                                        <input
                                            type="text"
                                            placeholder="Reason (optional)"
                                            className="form-input h-6 flex-1 rounded border border-gray-200 px-1.5 text-[11px] dark:border-gray-700 dark:bg-black/30 dark:text-white"
                                            value={cancelReason[p.id] ?? ""}
                                            onChange={(e) =>
                                                setCancelReason((prev) => ({
                                                    ...prev,
                                                    [p.id]: e.target.value,
                                                }))
                                            }
                                        />
                                    </div>
                                )}

                                <div className="mt-1 flex flex-wrap gap-2">
                                    {p.status === "waitlisted" && (
                                        <button
                                            type="button"
                                            className="btn btn-outline-primary btn-sm"
                                            onClick={() => promote.mutate(p.id)}
                                        >
                                            Promote
                                        </button>
                                    )}
                                    {p.status !== "cancelled" && (
                                        <button
                                            type="button"
                                            className="btn btn-outline-danger btn-sm"
                                            onClick={async () => {
                                                const ok = await confirmAction({
                                                    title: "Cancel participation?",
                                                    text: "Releases a seat/ticket if held. User may re-join later.",
                                                    confirmButtonText: "Cancel participation",
                                                });
                                                if (ok)
                                                    cancel.mutate({
                                                        id: p.id,
                                                        reason: cancelReason[p.id] || undefined,
                                                    });
                                            }}
                                        >
                                            Cancel
                                        </button>
                                    )}
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            {/* Add Participation Modal */}
            <GenericModal
                isOpen={showAddModal}
                setIsOpen={setShowAddModal}
                title="Add Participation"
                maxWidth="md"
            >
                <form
                    className="space-y-4"
                    onSubmit={addForm.handleSubmit((vals) => {
                        if (!vals.user) {
                            toast.error("Select a user");
                            return;
                        }
                        addMut.mutate(vals);
                    })}
                >
                    <Controller
                        name="user"
                        control={addForm.control}
                        render={({ field }) => (
                            <FormCombobox<IUser>
                                id="participation_user"
                                label="User (name or email)"
                                value={field.value}
                                onChange={field.onChange}
                                onSearch={userSearch.setQuery}
                                options={userSearch.options}
                                displayValue={formatUserOption}
                                loading={userSearch.loading}
                                placeholder="Type to search..."
                                error={
                                    addForm.formState.errors.user
                                        ? "Select a user"
                                        : undefined
                                }
                            />
                        )}
                    />

                    {ticketOptions.length > 0 && (
                        <Controller
                            name="ticket_type_id"
                            control={addForm.control}
                            render={({ field }) => (
                                <FormSelect
                                    id="participation_ticket"
                                    label="Ticket type (optional)"
                                    value={field.value}
                                    onChange={field.onChange}
                                    onBlur={field.onBlur}
                                    options={[
                                        { value: "", label: "— None —" },
                                        ...ticketOptions
                                            .filter((t) => t.sales_enabled && !t.deleted_at)
                                            .map((t) => ({
                                                value: String(t.id),
                                                label: `${t.name} ($${Number(t.price).toFixed(2)})`,
                                            })),
                                    ]}
                                />
                            )}
                        />
                    )}

                    <div className="flex justify-end gap-2">
                        <button
                            type="button"
                            className="btn btn-outline-danger"
                            onClick={() => {
                                setShowAddModal(false);
                                addForm.reset({ user: null, ticket_type_id: "" });
                            }}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="btn btn-primary"
                            disabled={addMut.isPending}
                        >
                            {addMut.isPending ? "Adding…" : "Add Participation"}
                        </button>
                    </div>
                </form>
            </GenericModal>
        </>
    );
};

export default ParticipationOversight;
