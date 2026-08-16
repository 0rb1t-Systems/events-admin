import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import React, { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import ActionButton from "../../../components/ActionButton";
import Alert from "../../../components/Alert";
import FormInput from "../../../components/form/FormInput";
import FormSelect from "../../../components/form/FormSelect";
import FormSwitch from "../../../components/form/FormSwitch";
import { eventApi } from "../../../services/event";
import { EventStatus, IEvent } from "../../../types";

/** Admin moderation form — not full organizer event creation. */
const schema = z.object({
    featured: z.boolean(),
    monetized: z.boolean(),
    title: z.string().min(1).max(255).optional(),
    capacity: z.union([z.coerce.number().int().min(0), z.literal(""), z.null()]).optional(),
    unlimited_capacity: z.boolean(),
});

type FormData = z.infer<typeof schema>;

const STATUS_OPTIONS: { value: EventStatus; label: string }[] = [
    { value: "draft", label: "Draft" },
    { value: "published", label: "Published" },
    { value: "registration_open", label: "Registration open" },
    { value: "sold_out", label: "Sold out" },
    { value: "registration_closed", label: "Registration closed" },
    { value: "ongoing", label: "Ongoing" },
    { value: "completed", label: "Completed" },
    { value: "cancelled", label: "Cancelled" },
];

interface Props {
    eventToEdit: IEvent;
    onClose: () => void;
}

const EventForm: React.FC<Props> = ({ eventToEdit, onClose }) => {
    const queryClient = useQueryClient();
    const [generalError, setGeneralError] = useState<string | null>(null);
    const [nextStatus, setNextStatus] = useState(eventToEdit.status);

    const {
        control,
        handleSubmit,
        reset,
        watch,
        setValue,
        formState: { isSubmitting },
    } = useForm<FormData>({
        resolver: zodResolver(schema),
        defaultValues: {
            featured: eventToEdit.featured,
            monetized: eventToEdit.monetized,
            title: eventToEdit.title,
            unlimited_capacity: eventToEdit.capacity === null,
            capacity: eventToEdit.capacity,
        },
    });

    const unlimited = watch("unlimited_capacity");

    useEffect(() => {
        reset({
            featured: eventToEdit.featured,
            monetized: eventToEdit.monetized,
            title: eventToEdit.title,
            unlimited_capacity: eventToEdit.capacity === null,
            capacity: eventToEdit.capacity,
        });
        setNextStatus(eventToEdit.status);
    }, [eventToEdit, reset]);

    useEffect(() => {
        if (unlimited) setValue("capacity", null);
    }, [unlimited, setValue]);

    const updateMut = useMutation({
        mutationFn: (data: FormData) =>
            eventApi.update(eventToEdit.id, {
                featured: data.featured,
                monetized: data.monetized,
                title: data.title,
                capacity: data.unlimited_capacity ? null : Number(data.capacity ?? 0),
            }),
        onSuccess: async () => {
            if (nextStatus !== eventToEdit.status) {
                try {
                    await eventApi.transition(eventToEdit.id, nextStatus);
                } catch (e: any) {
                    setGeneralError(e?.message || "Invalid status transition");
                    queryClient.invalidateQueries({ queryKey: ["Event Table"] });
                    queryClient.invalidateQueries({ queryKey: ["event", eventToEdit.id] });
                    return;
                }
            }
            queryClient.invalidateQueries({ queryKey: ["Event Table"] });
            queryClient.invalidateQueries({ queryKey: ["event", eventToEdit.id] });
            toast.success("Event updated");
            onClose();
        },
        onError: (e: any) => setGeneralError(e?.message || "Update failed"),
    });

    return (
        <form
            className="space-y-4"
            onSubmit={handleSubmit((data) => {
                setGeneralError(null);
                updateMut.mutate(data);
            })}
        >
            {generalError && <Alert type="danger" title="Error" message={generalError} />}
            <p className="text-xs text-gray-500 dark:text-gray-400">
                Admin moderation only — organizers own full event creation in the Web App.
            </p>

            <Controller
                name="title"
                control={control}
                render={({ field }) => (
                    <FormInput
                        id="event_title"
                        label="Title"
                        value={field.value ?? ""}
                        onChange={field.onChange}
                        onBlur={field.onBlur}
                    />
                )}
            />

            <Controller
                name="featured"
                control={control}
                render={({ field }) => (
                    <FormSwitch
                        label="Featured"
                        checked={field.value}
                        onChange={field.onChange}
                        onBlur={field.onBlur}
                    />
                )}
            />

            <Controller
                name="monetized"
                control={control}
                render={({ field }) => (
                    <FormSwitch
                        label="Monetized"
                        checked={field.value}
                        onChange={field.onChange}
                        onBlur={field.onBlur}
                    />
                )}
            />

            <Controller
                name="unlimited_capacity"
                control={control}
                render={({ field }) => (
                    <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-white-light">
                        <input
                            type="checkbox"
                            className="form-checkbox"
                            checked={field.value}
                            onChange={(e) => field.onChange(e.target.checked)}
                        />
                        Unlimited capacity (null — distinct from 0)
                    </label>
                )}
            />

            {!unlimited && (
                <Controller
                    name="capacity"
                    control={control}
                    render={({ field }) => (
                        <FormInput
                            id="event_capacity"
                            label="Capacity"
                            type="number"
                            min={0}
                            value={
                                field.value === null || field.value === undefined
                                    ? ""
                                    : String(field.value)
                            }
                            onChange={(v) => field.onChange(v === "" ? null : Number(v))}
                            onBlur={field.onBlur}
                        />
                    )}
                />
            )}

            <FormSelect
                label="Status transition"
                value={String(nextStatus)}
                onChange={setNextStatus}
                onBlur={() => undefined}
                options={STATUS_OPTIONS.map((o) => ({
                    value: o.value,
                    label: o.label,
                }))}
            />
            <p className="text-xs text-gray-500 -mt-2">
                Invalid transitions are rejected by the server state machine.
            </p>

            <div className="flex justify-end gap-2">
                <ActionButton
                    type="button"
                    variant="outline-danger"
                    onClick={onClose}
                    isLoading={false}
                    displayText="Cancel"
                />
                <ActionButton
                    type="submit"
                    variant="primary"
                    isLoading={isSubmitting || updateMut.isPending}
                    displayText="Save"
                />
            </div>
        </form>
    );
};

export default EventForm;
