import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import React, { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import ActionButton from "../../../../components/ActionButton";
import Alert from "../../../../components/Alert";
import FormInput from "../../../../components/form/FormInput";
import { roleApi } from "../../../../services/role";
import { IRole } from "../../../../types";

// ---------------------- Schema & Types ----------------------
// The user only edits the name. guard_name is always "web" internally.
const roleSchema = z.object({
    name: z.string().min(1, "Name is required").max(255),
});

type RoleFormData = z.infer<typeof roleSchema>;

interface RoleFormProps {
    roleToEdit?: IRole | null;
    onClose: () => void;
}

// ---------------------- Main Component ----------------------
const RoleForm: React.FC<RoleFormProps> = ({
    roleToEdit,
    onClose,
}) => {
    const queryClient = useQueryClient();
    const [generalError, setGeneralError] = useState<string | null>(null);

    const isEditMode = Boolean(roleToEdit);

    const {
        control,
        handleSubmit,
        reset,
        setError,
        formState: { errors, isSubmitting },
    } = useForm<RoleFormData>({
        resolver: zodResolver(roleSchema),
        defaultValues: {
            name: "",
        },
        mode: "onChange",
    });

    // ---------------------- Mutations ----------------------
    const handleMutationError = (error: any) => {
        if (error?.errors) {
            Object.entries(error.errors).forEach(([key, value]) => {
                if (["name", "guard_name"].includes(key)) {
                    setError(key as any, {
                        type: "server",
                        message: Array.isArray(value) ? value[0] : value,
                    });
                }
            });
        } else if (error?.message) {
            setGeneralError(error.message);
        } else {
            setGeneralError("An unexpected error occurred. Please try again.");
        }
    };

    const createRole = useMutation({
        mutationFn: (data: RoleFormData) => roleApi.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["Role Table"] });
            toast.success("Role created successfully");
            handleClose();
        },
        onError: handleMutationError,
    });

    const updateRole = useMutation({
        mutationFn: ({ id, data }: { id: number; data: RoleFormData }) =>
            roleApi.update(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["Role Table"] });
            queryClient.invalidateQueries({ queryKey: ["role", roleToEdit?.id] });
            toast.success("Role updated successfully");
            handleClose();
        },
        onError: handleMutationError,
    });

    const isLoading = isSubmitting || createRole.isPending || updateRole.isPending;

    // ---------------------- Handlers ----------------------
    const onSubmit = (data: RoleFormData) => {
        // Always send guard_name as "web" to the API
        const payload = {
            ...data,
            guard_name: "web",
        } as any;

        if (isEditMode && roleToEdit) {
            updateRole.mutate({ id: roleToEdit.id, data: payload });
        } else {
            createRole.mutate(payload);
        }
    };

    const handleClose = () => {
        reset();
        setGeneralError(null);
        onClose();
    };

    useEffect(() => {
        if (roleToEdit) {
            reset({
                name: roleToEdit.name,
            });
        } else {
            reset({
                name: "",
            });
        }
        setGeneralError(null);
    }, [roleToEdit, reset]);

    // ---------------------- Render ----------------------
    return (
        <form className="space-y-5" onSubmit={handleSubmit(onSubmit)} noValidate>
            {generalError && (
                <Alert type="danger" title="Error" message={generalError} />
            )}

            <Controller
                name="name"
                control={control}
                render={({ field }) => (
                    <FormInput
                        id="role_name"
                        type="text"
                        label="Role Name"
                        error={errors.name?.message}
                        placeholder="Enter role name"
                        disabled={isLoading}
                        {...field}
                    />
                )}
            />

            {/* Guard name is always "web" and not editable, so we hide the input completely */}

            {/* Actions */}
            <div className="flex justify-end mt-8">
                <ActionButton
                    type="button"
                    variant="outline-danger"
                    onClick={handleClose}
                    isLoading={false}
                    displayText="Cancel"
                    disabled={isLoading}
                />

                <ActionButton
                    type="submit"
                    variant="primary"
                    isLoading={isLoading}
                    loadingText={isEditMode ? "Updating..." : "Saving..."}
                    displayText={isEditMode ? "Update" : "Save"}
                    className="ltr:ml-4 rtl:mr-4"
                />
            </div>
        </form>
    );
};

export default RoleForm;
