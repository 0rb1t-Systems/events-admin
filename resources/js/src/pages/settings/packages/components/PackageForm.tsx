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
            status: "active",
        },
        mode: "onChange",
    });

    const unlimited = watch("unlimited");

    useEffect(() => {
        if (packageToEdit) {
            reset({
                name: packageToEdit.name,
                description: packageToEdit.description ?? "",
                price: Number(packageToEdit.price),
                unlimited: packageToEdit.event_quota === null,
                event_quota: packageToEdit.event_quota === null ? null : packageToEdit.event_quota,
                status: (packageToEdit.status as "active" | "archived") || "active",
            });
        } else {
            reset({
                name: "",
                description: "",
                price: 0,
                unlimited: false,
                event_quota: 10,
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

    const handleMutationError = (error: any) => {
        if (error?.errors) {
            Object.entries(error.errors).forEach(([key, value]) => {
                if (["name", "description", "price", "event_quota", "status"].includes(key)) {
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
        // Explicit: null = unlimited, 0 = zero quota (never use falsy collapse)
        event_quota: data.unlimited ? null : data.event_quota,
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
