import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import React, { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import GenericModal from "../../../components/GenericModal";
import Loader from "../../../components/Loader";
import SimpleAdminTable, { SimpleAdminTd } from "../../../components/SimpleAdminTable";
import FormCombobox from "../../../components/form/FormCombobox";
import FormSelect from "../../../components/form/FormSelect";
import { useConfirmDialog } from "../../../hooks";
import { useUserSearch, formatUserOption } from "../../../hooks/useEntitySearch";
import { eventApi } from "../../../services/event";
import { ITicketType, IUser } from "../../../types";
import { statusBadgeClass } from "../../../utils/statusBadge";

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

    const participationStatusColor = (status: string) => {
        if (status === "cancelled") return "danger";
        if (status === "waitlisted") return "warning";
        if (status === "checked_in") return "success";
        return "info";
    };

    return (
        <>
            <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        Registered {cap.registered_count}
                        {cap.capacity != null ? ` / ${cap.capacity}` : " (unlimited)"}
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

                <SimpleAdminTable
                    columns={[
                        { key: "participant", label: "Participant" },
                        { key: "ticket", label: "Ticket" },
                        { key: "status", label: "Status" },
                        { key: "payment", label: "Payment", hideBelow: "lg" },
                        { key: "actions", label: "Actions", align: "center" },
                    ]}
                    empty={data.participations.length === 0}
                    emptyText="No participations yet"
                >
                    {data.participations.map((p) => (
                        <tr
                            key={p.id}
                            className="hover:bg-white-light/20 dark:hover:bg-[#1a2941]/40"
                        >
                            <SimpleAdminTd>
                                <div className="font-medium text-gray-900 dark:text-white">
                                    {p.user?.name ?? `User #${p.user_id}`}
                                </div>
                                <div className="text-xs text-gray-500 dark:text-gray-400">
                                    {p.user?.email ?? "—"}
                                </div>
                            </SimpleAdminTd>
                            <SimpleAdminTd>{p.ticket_type?.name ?? "—"}</SimpleAdminTd>
                            <SimpleAdminTd>
                                <span className={statusBadgeClass(participationStatusColor(p.status))}>
                                    {p.status.replace(/_/g, " ")}
                                </span>
                            </SimpleAdminTd>
                            <SimpleAdminTd hideBelow="lg">
                                <span className="capitalize">
                                    {(p.payment_status || "—").replace(/_/g, " ")}
                                </span>
                            </SimpleAdminTd>
                            <SimpleAdminTd align="center">
                                <div className="flex items-center justify-center gap-1.5">
                                    {p.status !== "cancelled" && (
                                        <>
                                            <input
                                                type="text"
                                                placeholder="Reason (optional)"
                                                className="form-input hidden h-8 w-36 lg:block"
                                                value={cancelReason[p.id] ?? ""}
                                                onChange={(e) =>
                                                    setCancelReason((prev) => ({
                                                        ...prev,
                                                        [p.id]: e.target.value,
                                                    }))
                                                }
                                            />
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
                                        </>
                                    )}
                                </div>
                            </SimpleAdminTd>
                        </tr>
                    ))}
                </SimpleAdminTable>
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
