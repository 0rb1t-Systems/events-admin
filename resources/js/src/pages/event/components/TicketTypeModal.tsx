import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import React, { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import GenericModal from "../../../components/GenericModal";
import FormInput from "../../../components/form/FormInput";
import FormSwitch from "../../../components/form/FormSwitch";
import { eventApi } from "../../../services/event";
import { ITicketType } from "../../../types";

const schema = z.object({
    name: z.string().min(1, "Required"),
    price: z.coerce.number().min(0, "Must be ≥ 0"),
    unlimited: z.boolean(),
    quantity_limit: z.union([z.coerce.number().int().min(0), z.literal("")]).nullable().optional(),
    sales_enabled: z.boolean(),
    sort_order: z.coerce.number().int().min(0).optional(),
});

type FormData = z.infer<typeof schema>;

interface Props {
    isOpen: boolean;
    onClose: () => void;
    eventId: number;
    ticketType?: ITicketType | null;
}

const TicketTypeModal: React.FC<Props> = ({ isOpen, onClose, eventId, ticketType }) => {
    const queryClient = useQueryClient();
    const isEdit = !!ticketType;

    const {
        control,
        handleSubmit,
        reset,
        watch,
        setValue,
        formState: { errors, isSubmitting },
    } = useForm<FormData>({
        resolver: zodResolver(schema),
        defaultValues: {
            name: "",
            price: 0,
            unlimited: true,
            quantity_limit: null,
            sales_enabled: true,
            sort_order: 0,
        },
    });

    const unlimited = watch("unlimited");

    useEffect(() => {
        if (isOpen) {
            if (ticketType) {
                reset({
                    name: ticketType.name,
                    price: Number(ticketType.price),
                    unlimited: ticketType.quantity_limit === null,
                    quantity_limit: ticketType.quantity_limit,
                    sales_enabled: ticketType.sales_enabled,
                    sort_order: ticketType.sort_order,
                });
            } else {
                reset({
                    name: "",
                    price: 0,
                    unlimited: true,
                    quantity_limit: null,
                    sales_enabled: true,
                    sort_order: 0,
                });
            }
        }
    }, [isOpen, ticketType, reset]);

    useEffect(() => {
        if (unlimited) setValue("quantity_limit", null);
    }, [unlimited, setValue]);

    const invalidate = () => {
        queryClient.invalidateQueries({ queryKey: ["event", eventId] });
        queryClient.invalidateQueries({ queryKey: ["Event Table"] });
    };

    const mutation = useMutation({
        mutationFn: (data: FormData) => {
            const payload = {
                name: data.name,
                price: data.price,
                quantity_limit: data.unlimited ? null : (data.quantity_limit ? Number(data.quantity_limit) : 0),
                sales_enabled: data.sales_enabled,
                sort_order: data.sort_order ?? 0,
            };
            if (isEdit) {
                return eventApi.updateTicketType(ticketType!.id, payload);
            }
            return eventApi.createTicketType({ ...payload, event_id: eventId });
        },
        onSuccess: () => {
            toast.success(isEdit ? "Ticket type updated" : "Ticket type created");
            invalidate();
            onClose();
        },
        onError: (e: any) => toast.error(e?.message || "Save failed"),
    });

    return (
        <GenericModal
            isOpen={isOpen}
            setIsOpen={onClose}
            title={isEdit ? "Edit Ticket Type" : "Add Ticket Type"}
            maxWidth="md"
        >
            <form className="space-y-4" onSubmit={handleSubmit((d) => mutation.mutate(d))}>
                <Controller
                    name="name"
                    control={control}
                    render={({ field }) => (
                        <FormInput
                            id="tt_name"
                            label="Name"
                            value={field.value}
                            onChange={field.onChange}
                            onBlur={field.onBlur}
                            error={errors.name?.message}
                        />
                    )}
                />

                <Controller
                    name="price"
                    control={control}
                    render={({ field }) => (
                        <FormInput
                            id="tt_price"
                            label="Price (USD)"
                            type="number"
                            min={0}
                            step="0.01"
                            value={String(field.value)}
                            onChange={field.onChange}
                            onBlur={field.onBlur}
                            error={errors.price?.message}
                        />
                    )}
                />

                <Controller
                    name="unlimited"
                    control={control}
                    render={({ field }) => (
                        <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-white-light">
                            <input
                                type="checkbox"
                                className="form-checkbox"
                                checked={field.value}
                                onChange={(e) => field.onChange(e.target.checked)}
                            />
                            Unlimited quantity (null — distinct from 0)
                        </label>
                    )}
                />

                {!unlimited && (
                    <Controller
                        name="quantity_limit"
                        control={control}
                        render={({ field }) => (
                            <FormInput
                                id="tt_qty"
                                label="Quantity limit"
                                type="number"
                                min={0}
                                value={field.value === null || field.value === undefined ? "" : String(field.value)}
                                onChange={(v) => field.onChange(v === "" ? null : v)}
                                onBlur={field.onBlur}
                                error={errors.quantity_limit?.message}
                            />
                        )}
                    />
                )}

                <Controller
                    name="sales_enabled"
                    control={control}
                    render={({ field }) => (
                        <FormSwitch
                            label="Sales enabled"
                            checked={field.value}
                            onChange={field.onChange}
                            onBlur={field.onBlur}
                        />
                    )}
                />

                <Controller
                    name="sort_order"
                    control={control}
                    render={({ field }) => (
                        <FormInput
                            id="tt_sort"
                            label="Sort order"
                            type="number"
                            min={0}
                            value={String(field.value ?? 0)}
                            onChange={field.onChange}
                            onBlur={field.onBlur}
                        />
                    )}
                />

                <div className="flex justify-end gap-2">
                    <button type="button" className="btn btn-outline-danger" onClick={onClose}>
                        Cancel
                    </button>
                    <button
                        type="submit"
                        className="btn btn-primary"
                        disabled={isSubmitting || mutation.isPending}
                    >
                        {mutation.isPending ? "Saving…" : "Save"}
                    </button>
                </div>
            </form>
        </GenericModal>
    );
};

export default TicketTypeModal;
