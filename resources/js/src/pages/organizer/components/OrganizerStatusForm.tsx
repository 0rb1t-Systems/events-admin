import { useMutation, useQueryClient } from "@tanstack/react-query";
import React from "react";
import { toast } from "sonner";
import ActionButton from "../../../components/ActionButton";
import { IOrganizer } from "../../../types";
import { organizerApi } from "../../../services/organizer";

interface OrganizerStatusFormProps {
    organizer: IOrganizer;
    onClose: () => void;
}

/** Suspend / reactivate only — identity edits use OrganizerForm. */
const OrganizerStatusForm: React.FC<OrganizerStatusFormProps> = ({
    organizer,
    onClose,
}) => {
    const queryClient = useQueryClient();
    const isSuspended = organizer.status === "suspended";

    const invalidate = () => {
        queryClient.invalidateQueries({ queryKey: ["Organizer Table"] });
        queryClient.invalidateQueries({ queryKey: ["organizer", organizer.id] });
    };

    const suspendMutation = useMutation({
        mutationFn: () => organizerApi.suspend(organizer.id),
        onSuccess: () => {
            invalidate();
            toast.success("Organizer suspended");
            onClose();
        },
        onError: (error: Error) =>
            toast.error(error.message || "Failed to suspend"),
    });

    const reactivateMutation = useMutation({
        mutationFn: () => organizerApi.reactivate(organizer.id),
        onSuccess: () => {
            invalidate();
            toast.success("Organizer reactivated");
            onClose();
        },
        onError: (error: Error) =>
            toast.error(error.message || "Failed to reactivate"),
    });

    const pending = suspendMutation.isPending || reactivateMutation.isPending;

    return (
        <div className="space-y-4">
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm dark:border-[#1b2e4b] dark:bg-[#0e1726]">
                <p className="font-medium text-gray-900 dark:text-white">
                    {organizer.business_name}
                </p>
                <p className="text-gray-600 dark:text-gray-300">
                    {organizer.contact_name}
                </p>
                <p className="text-gray-500 dark:text-gray-400">
                    {organizer.email}
                </p>
                <p className="mt-2 capitalize text-gray-700 dark:text-gray-200">
                    Current status: <strong>{organizer.status}</strong>
                </p>
            </div>

            <div className="flex justify-end gap-2 pt-2">
                <ActionButton
                    type="button"
                    variant="outline-danger"
                    displayText="Cancel"
                    onClick={onClose}
                    disabled={pending}
                />
                {isSuspended ? (
                    <ActionButton
                        type="button"
                        variant="primary"
                        displayText="Reactivate"
                        isLoading={reactivateMutation.isPending}
                        onClick={() => reactivateMutation.mutate()}
                    />
                ) : (
                    <ActionButton
                        type="button"
                        variant="outline-danger"
                        displayText="Suspend"
                        isLoading={suspendMutation.isPending}
                        onClick={() => suspendMutation.mutate()}
                    />
                )}
            </div>
        </div>
    );
};

export default OrganizerStatusForm;
