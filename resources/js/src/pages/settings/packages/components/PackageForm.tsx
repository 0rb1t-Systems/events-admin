import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import React, { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import ActionButton from "../../../../components/ActionButton";
import Alert from "../../../../components/Alert";
import FormInput from "../../../../components/form/FormInput";
import FormSelect from "../../../../components/form/FormSelect";
import FormTextarea from "../../../../components/form/FormTextarea";
import { packageApi } from "../../../../services/package";
import { IPackage } from "../../../../types";

const packageSchema = z
    .object({
        name: z.string().min(1, "Name is required").max(255),
        description: z.string().optional().nullable(),
        price: z.coerce.number().min(0, "Price must be ≥ 0"),
        unlimited: z.boolean(),
        event_quota: z.coerce.number().int().min(0).optional().nullable(),
        non_expiring: z.boolean(),
        duration_value: z.coerce.number().int().min(1).optional().nullable(),
        duration_unit: z.enum(["day", "week", "month", "year"]).optional().nullable(),
        tier_rank: z.coerce.number().int().min(0),
        status: z.enum(["active", "archived"]),
    })
    .superRefine((data, ctx) => {
        if (!data.unlimited && (data.event_quota === null || data.event_quota === undefined)) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "Enter a quota, or enable Unlimited",
                path: ["event_quota"],
            });
        }
        if (!data.non_expiring) {
            if (!data.duration_value) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: "Enter duration value, or enable Non-expiring",
                    path: ["duration_value"],
                });
            }
            if (!data.duration_unit) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: "Select a duration unit",
                    path: ["duration_unit"],
                });
            }
        }
    });

type PackageFormData = z.infer<typeof packageSchema>;

interface PackageFormProps {
    packageToEdit?: IPackage | null;
    onClose: () => void;
}

const PackageForm: React.FC<PackageFormProps> = ({ packageToEdit, onClose }) => {
    const queryClient = useQueryClient();
    const [generalError, setGeneralError] = useState<string | null>(null);
    const isEditMode = Boolean(packageToEdit);

    const {
        control,
        handleSubmit,
        reset,
        setError,
        watch,
        setValue,
        formState: { errors, isSubmitting },
    } = useForm<PackageFormData>({
        resolver: zodResolver(packageSchema),
        defaultValues: {
            name: "",
            description: "",
            price: 0,
            unlimited: false,
            event_quota: 10,
            non_expiring: false,
            duration_value: 1,
            duration_unit: "month",
            tier_rank: 10,
            status: "active",
        },
        mode: "onChange",
    });

    const unlimited = watch("unlimited");
    const nonExpiring = watch("non_expiring");

    useEffect(() => {
        if (packageToEdit) {
            const nonExp =
                packageToEdit.duration_value == null &&
                (packageToEdit.duration_unit == null || packageToEdit.duration_unit === "");
            reset({
                name: packageToEdit.name,
                description: packageToEdit.description ?? "",
                price: Number(packageToEdit.price),
                unlimited: packageToEdit.event_quota === null,
                event_quota: packageToEdit.event_quota === null ? null : packageToEdit.event_quota,
                non_expiring: nonExp,
                duration_value: nonExp ? 1 : packageToEdit.duration_value ?? 1,
                duration_unit: (nonExp
                    ? "month"
                    : (packageToEdit.duration_unit as "day" | "week" | "month" | "year") || "month"),
                tier_rank: packageToEdit.tier_rank ?? 0,
                status: (packageToEdit.status as "active" | "archived") || "active",
            });
        } else {
            reset({
                name: "",
                description: "",
                price: 0,
                unlimited: false,
                event_quota: 10,
                non_expiring: false,
                duration_value: 1,
                duration_unit: "month",
                tier_rank: 10,
                status: "active",
            });
        }
        setGeneralError(null);
    }, [packageToEdit, reset]);

    useEffect(() => {
        if (unlimited) {
            setValue("event_quota", null);
        }
    }, [unlimited, setValue]);

    useEffect(() => {
        if (nonExpiring) {
            setValue("duration_value", null);
            setValue("duration_unit", null);
        }
    }, [nonExpiring, setValue]);

    const handleMutationError = (error: any) => {
        if (error?.errors) {
            Object.entries(error.errors).forEach(([key, value]) => {
                if (
                    [
                        "name",
                        "description",
                        "price",
                        "event_quota",
                        "duration_value",
                        "duration_unit",
                        "tier_rank",
                        "status",
                    ].includes(key)
                ) {
                    setError(key as any, {
                        type: "server",
                        message: Array.isArray(value) ? value[0] : String(value),
                    });
                }
            });
        } else if (error?.message) {
            setGeneralError(error.message);
        } else {
            setGeneralError("An unexpected error occurred. Please try again.");
        }
    };

    const toPayload = (data: PackageFormData) => ({
        name: data.name,
        description: data.description || null,
        price: data.price,
        event_quota: data.unlimited ? null : data.event_quota,
        duration_value: data.non_expiring ? null : data.duration_value,
        duration_unit: data.non_expiring ? null : data.duration_unit,
        tier_rank: data.tier_rank,
        status: data.status,
    });

    const createPackage = useMutation({
        mutationFn: (data: PackageFormData) => packageApi.create(toPayload(data)),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["Package Table"] });
            toast.success("Package created successfully");
            onClose();
        },
        onError: handleMutationError,
    });

    const updatePackage = useMutation({
        mutationFn: ({ id, data }: { id: number; data: PackageFormData }) =>
            packageApi.update(id, toPayload(data)),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["Package Table"] });
            toast.success("Package updated successfully");
            onClose();
        },
        onError: handleMutationError,
    });

    const onSubmit = (data: PackageFormData) => {
        setGeneralError(null);
        if (isEditMode && packageToEdit) {
            updatePackage.mutate({ id: packageToEdit.id, data });
        } else {
            createPackage.mutate(data);
        }
    };

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {generalError && <Alert type="danger" title="Error" message={generalError} />}

            <Controller
                name="name"
                control={control}
                render={({ field }) => (
                    <FormInput
                        id="package_name"
                        label="Name"
                        value={field.value}
                        onChange={field.onChange}
                        onBlur={field.onBlur}
                        error={errors.name?.message}
                        required
                    />
                )}
            />

            <Controller
                name="description"
                control={control}
                render={({ field }) => (
                    <FormTextarea
                        id="package_description"
                        label="Description"
                        {...field}
                        value={field.value ?? ""}
                        error={errors.description?.message}
                    />
                )}
            />

            <Controller
                name="price"
                control={control}
                render={({ field }) => (
                    <FormInput
                        id="package_price"
                        label="Price"
                        type="number"
                        step="0.01"
                        min={0}
                        value={String(field.value ?? "")}
                        onChange={(v) => field.onChange(v === "" ? 0 : Number(v))}
                        onBlur={field.onBlur}
                        error={errors.price?.message}
                        required
                    />
                )}
            />

            <div className="flex items-center gap-2">
                <Controller
                    name="unlimited"
                    control={control}
                    render={({ field }) => (
                        <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-white-light cursor-pointer">
                            <input
                                type="checkbox"
                                className="form-checkbox"
                                checked={field.value}
                                onChange={(e) => field.onChange(e.target.checked)}
                            />
                            Unlimited event quota
                        </label>
                    )}
                />
            </div>
            <p className="text-xs text-gray-500 -mt-2">
                Unlimited (null) is different from 0 — zero means no events allowed.
            </p>

            {!unlimited && (
                <Controller
                    name="event_quota"
                    control={control}
                    render={({ field }) => (
                        <FormInput
                            id="package_event_quota"
                            label="Event quota"
                            type="number"
                            min={0}
                            step={1}
                            value={field.value === null || field.value === undefined ? "" : String(field.value)}
                            onChange={(v) => {
                                field.onChange(v === "" ? null : Number(v));
                            }}
                            onBlur={field.onBlur}
                            error={errors.event_quota?.message}
                            required
                        />
                    )}
                />
            )}

            <Controller
                name="tier_rank"
                control={control}
                render={({ field }) => (
                    <FormInput
                        id="package_tier_rank"
                        label="Tier rank (upgrade ladder)"
                        type="number"
                        min={0}
                        step={1}
                        value={String(field.value ?? "")}
                        onChange={(v) => field.onChange(v === "" ? 0 : Number(v))}
                        onBlur={field.onBlur}
                        error={errors.tier_rank?.message}
                        required
                    />
                )}
            />
            <p className="text-xs text-gray-500 -mt-2">
                Higher tier_rank can upgrade from lower. Same or lower is blocked for self-serve.
            </p>

            <div className="flex items-center gap-2">
                <Controller
                    name="non_expiring"
                    control={control}
                    render={({ field }) => (
                        <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-white-light cursor-pointer">
                            <input
                                type="checkbox"
                                className="form-checkbox"
                                checked={field.value}
                                onChange={(e) => field.onChange(e.target.checked)}
                            />
                            Non-expiring (no duration)
                        </label>
                    )}
                />
            </div>

            {!nonExpiring && (
                <div className="grid grid-cols-2 gap-3">
                    <Controller
                        name="duration_value"
                        control={control}
                        render={({ field }) => (
                            <FormInput
                                id="package_duration_value"
                                label="Duration"
                                type="number"
                                min={1}
                                step={1}
                                value={field.value === null || field.value === undefined ? "" : String(field.value)}
                                onChange={(v) => field.onChange(v === "" ? null : Number(v))}
                                onBlur={field.onBlur}
                                error={errors.duration_value?.message}
                                required
                            />
                        )}
                    />
                    <Controller
                        name="duration_unit"
                        control={control}
                        render={({ field }) => (
                            <FormSelect
                                label="Unit"
                                value={field.value ?? "month"}
                                onChange={field.onChange}
                                onBlur={field.onBlur}
                                options={[
                                    { value: "day", label: "Day(s)" },
                                    { value: "week", label: "Week(s)" },
                                    { value: "month", label: "Month(s)" },
                                    { value: "year", label: "Year(s)" },
                                ]}
                                error={errors.duration_unit?.message}
                            />
                        )}
                    />
                </div>
            )}

            <Controller
                name="status"
                control={control}
                render={({ field }) => (
                    <FormSelect
                        label="Status"
                        value={field.value}
                        onChange={field.onChange}
                        onBlur={field.onBlur}
                        options={[
                            { value: "active", label: "Active" },
                            { value: "archived", label: "Archived" },
                        ]}
                        error={errors.status?.message}
                    />
                )}
            />

            <div className="flex justify-end gap-2 pt-2">
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
                    isLoading={isSubmitting || createPackage.isPending || updatePackage.isPending}
                    loadingText={isEditMode ? "Updating..." : "Saving..."}
                    displayText={isEditMode ? "Update" : "Create"}
                />
            </div>
        </form>
    );
};

export default PackageForm;
