import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import React from "react";
import { toast } from "sonner";
import Loader from "../../../components/Loader";
import { useConfirmDialog } from "../../../hooks";
import { eventApi } from "../../../services/event";

interface Props {
    eventId: number;
}

const ParticipationOversight: React.FC<Props> = ({ eventId }) => {
    const queryClient = useQueryClient();
    const { confirmAction } = useConfirmDialog();

    const { data, isLoading, error } = useQuery({
        queryKey: ["event-participations", eventId],
        queryFn: () => eventApi.participations(eventId),
    });

    const invalidate = () => {
        queryClient.invalidateQueries({ queryKey: ["event-participations", eventId] });
        queryClient.invalidateQueries({ queryKey: ["event", eventId] });
        queryClient.invalidateQueries({ queryKey: ["Event Table"] });
    };

    const promote = useMutation({
        mutationFn: (id: number) => eventApi.promoteParticipation(id),
        onSuccess: () => {
            toast.success("Promoted from waitlist");
            invalidate();
        },
        onError: (e: Error) => toast.error(e.message),
    });

    const cancel = useMutation({
        mutationFn: (id: number) => eventApi.cancelParticipation(id),
        onSuccess: () => {
            toast.success("Participation cancelled");
            invalidate();
        },
        onError: (e: Error) => toast.error(e.message),
    });

    if (isLoading) {
        return <Loader />;
    }
    if (error || !data) {
        return <p className="text-sm text-red-500">Failed to load participations</p>;
    }

    const cap = data.capacity;

    return (
        <div className="space-y-2">
            <p className="text-xs text-gray-500">
                Registered {cap.registered_count}
                {cap.capacity != null ? ` / ${cap.capacity}` : " (unlimited)"}
                {" · "}
                Waitlisted {cap.waitlisted_count}
                {cap.seats_remaining != null ? ` · ${cap.seats_remaining} seats left` : ""}
            </p>
            {data.participations.length === 0 ? (
                <p className="text-sm text-gray-500">No participations yet</p>
            ) : (
                <ul className="max-h-56 space-y-1.5 overflow-y-auto text-xs">
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
                            <div className="mt-1 flex gap-2">
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
                                            if (ok) cancel.mutate(p.id);
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
    );
};

export default ParticipationOversight;
