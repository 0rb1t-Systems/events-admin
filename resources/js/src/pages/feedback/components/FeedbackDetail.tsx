import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import moment from "moment";
import React from "react";
import { toast } from "sonner";
import Loader from "../../../components/Loader";
import { useConfirmDialog } from "../../../hooks";
import { feedbackApi } from "../../../services/feedback";
import { IEventFeedback } from "../../../types/feedback";

interface Props {
    feedbackId: number | null;
    onVisibilityChanged?: () => void;
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

const Stars = ({ rating }: { rating: number }) => {
    const n = Math.max(0, Math.min(5, Math.round(rating)));
    return (
        <span className="text-amber-500" title={`${n}/5`}>
            {"★".repeat(n)}
            <span className="text-gray-300 dark:text-gray-600">{"★".repeat(5 - n)}</span>
        </span>
    );
};

const FeedbackDetail: React.FC<Props> = ({ feedbackId, onVisibilityChanged }) => {
    const queryClient = useQueryClient();
    const { confirmAction } = useConfirmDialog();

    const { data, isLoading, error } = useQuery({
        queryKey: ["feedback", feedbackId],
        queryFn: () => feedbackApi.getById(feedbackId!),
        enabled: !!feedbackId,
    });

    const visibility = useMutation({
        mutationFn: (hidden: boolean) => feedbackApi.updateVisibility(feedbackId!, hidden),
        onSuccess: (row) => {
            toast.success(row.hidden ? "Feedback hidden" : "Feedback visible");
            queryClient.invalidateQueries({ queryKey: ["feedback", feedbackId] });
            onVisibilityChanged?.();
        },
        onError: (e: Error) => toast.error(e.message),
    });

    if (!feedbackId) {
        return (
            <div className="p-4 text-center text-sm text-gray-500">
                Select feedback to view details
            </div>
        );
    }
    if (isLoading) return <Loader />;
    if (error || !data) {
        return <div className="p-4 text-center text-sm text-red-500">Failed to load</div>;
    }

    const row = data as IEventFeedback;

    return (
        <div className="space-y-3 p-1">
            <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    <Stars rating={row.rating} />
                </h3>
                <p className="text-xs text-gray-500">
                    {row.submitted_at
                        ? moment(row.submitted_at).format("MMM DD, YYYY HH:mm")
                        : "—"}
                </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
                <Field label="Event">{row.participation?.event?.title ?? "—"}</Field>
                <Field label="Participant">{row.participation?.user?.name ?? "—"}</Field>
                <Field label="Email">{row.participation?.user?.email ?? "—"}</Field>
                <Field label="Visibility">{row.hidden ? "Hidden" : "Visible"}</Field>
                <Field label="ID">{row.id}</Field>
                <Field label="Participation ID">{row.participation_id}</Field>
            </div>

            <Field label="Comment">
                <p className="whitespace-pre-wrap text-sm">{row.comment || "—"}</p>
            </Field>

            <button
                type="button"
                className={`btn btn-sm gap-2 ${
                    row.hidden ? "btn-outline-success" : "btn-outline-warning"
                }`}
                disabled={visibility.isPending}
                onClick={async () => {
                    const hide = !row.hidden;
                    const ok = await confirmAction({
                        title: hide ? "Hide feedback?" : "Show feedback?",
                        text: hide
                            ? "Soft-hides this comment from public/organizer views. Fully reversible."
                            : "Makes this comment visible again.",
                        confirmButtonText: hide ? "Hide" : "Show",
                    });
                    if (ok) visibility.mutate(hide);
                }}
            >
                {row.hidden ? "Show" : "Hide"}
            </button>
        </div>
    );
};

export default FeedbackDetail;
