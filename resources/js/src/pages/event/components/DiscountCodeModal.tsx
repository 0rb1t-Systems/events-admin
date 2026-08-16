import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import React, { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import GenericModal from "../../../components/GenericModal";
import FormInput from "../../../components/form/FormInput";
import FormSelect from "../../../components/form/FormSelect";
import FormSwitch from "../../../components/form/FormSwitch";
import { eventApi } from "../../../services/event";
import { IDiscountCode } from "../../../types";

const schema = z.object({
    code: z.string().min(1, "Required").max(64),
    type: z.enum(["percent", "fixed"]),
    value: z.coerce.number().min(0, "Must be ≥ 0"),
    usage_limit: z.union([z.coerce.number().int().min(1), z.literal("")]).nullable().optional(),
    expires_at: z.string().optional().nullable(),
    active: z.boolean(),
});

type FormData = z.infer<typeof schema>;

interface Props {
    isOpen: boolean;
    onClose: () => void;
    eventId: number;
    discountCode?: IDiscountCode | null;
}

const DiscountCodeModal: React.FC<Props> = ({ isOpen, onClose, eventId, discountCode }) => {
    const queryClient = useQueryClient();
    const isEdit = !!discountCode;

    const {
        control,
        handleSubmit,
        reset,
        formState: { errors, isSubmitting },
    } = useForm<FormData>({
        resolver: zodResolver(schema),
        defaultValues: {
            code: "",
            type: "percent",
            value: 10,
            usage_limit: null,
            expires_at: null,
            active: true,
        },
    });

    useEffect(() => {
        if (isOpen) {
            if (discountCode) {
                reset({
                    code: discountCode.code,
                    type: discountCode.type as "percent" | "fixed",
                    value: Number(discountCode.value),
                    usage_limit: discountCode.usage_limit ?? null,
                    expires_at: discountCode.expires_at?.split("T")[0] ?? null,
                    active: discountCode.active,
                });
            } else {
                reset({
                    code: "",
                    type: "percent",
                    value: 10,
                    usage_limit: null,
                    expires_at: null,
                    active: true,
                });
            }
        }
    }, [isOpen, discountCode, reset]);

    const invalidate = () => {
        queryClient.invalidateQueries({ queryKey: ["event", eventId] });
        queryClient.invalidateQueries({ queryKey: ["Event Table"] });
    };

    const mutation = useMutation({
        mutationFn: (data: FormData) => {
            const payload = {
                code: data.code,
                type: data.type,
                value: data.value,
                usage_limit: data.usage_limit ? Number(data.usage_limit) : null,
                expires_at: data.expires_at || null,
                active: data.active,
            };
            if (isEdit) {
                return eventApi.updateDiscountCode(discountCode!.id, payload);
            }
            return eventApi.createDiscountCode({ ...payload, event_id: eventId });
        },
        onSuccess: () => {
            toast.success(isEdit ? "Discount code updated" : "Discount code created");
            invalidate();
            onClose();
        },
        onError: (e: any) => toast.error(e?.message || "Save failed"),
    });

    return (
        <GenericModal
            isOpen={isOpen}
            setIsOpen={onClose}
            title={isEdit ? "Edit Discount Code" : "Add Discount Code"}
            maxWidth="md"
        >
            <form className="space-y-4" onSubmit={handleSubmit((d) => mutation.mutate(d))}>
                <Controller
                    name="code"
                    control={control}
                    render={({ field }) => (
                        <FormInput
                            id="dc_code"
                            label="Code"
                            value={field.value}
                            onChange={field.onChange}
                            onBlur={field.onBlur}
                            disabled={isEdit}
                            error={errors.code?.message}
                        />
                    )}
                />

                <Controller
                    name="type"
                    control={control}
                    render={({ field }) => (
                        <FormSelect
                            id="dc_type"
                            label="Type"
                            value={field.value}
                            onChange={field.onChange}
                            onBlur={field.onBlur}
                            options={[
                                { value: "percent", label: "Percent (%)" },
                                { value: "fixed", label: "Fixed ($)" },
                            ]}
                        />
                    )}
                />

                <Controller
                    name="value"
                    control={control}
                    render={({ field }) => (
                        <FormInput
                            id="dc_value"
                            label="Value"
                            type="number"
                            min={0}
                            step="0.01"
                            value={String(field.value)}
                            onChange={field.onChange}
                            onBlur={field.onBlur}
                            error={errors.value?.message}
                        />
                    )}
                />

                <Controller
                    name="usage_limit"
                    control={control}
                    render={({ field }) => (
                        <FormInput
                            id="dc_usage"
                            label="Usage limit (blank = unlimited)"
                            type="number"
                            min={1}
                            value={field.value === null || field.value === undefined ? "" : String(field.value)}
                            onChange={(v) => field.onChange(v === "" ? null : v)}
                            onBlur={field.onBlur}
                        />
                    )}
                />

                <Controller
                    name="expires_at"
                    control={control}
                    render={({ field }) => (
                        <FormInput
                            id="dc_expires"
                            label="Expires at (blank = no expiry)"
                            type="date"
                            value={field.value ?? ""}
                            onChange={(v) => field.onChange(v || null)}
                            onBlur={field.onBlur}
                        />
                    )}
                />

                <Controller
                    name="active"
                    control={control}
                    render={({ field }) => (
                        <FormSwitch
                            label="Active"
                            checked={field.value}
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

export default DiscountCodeModal;
