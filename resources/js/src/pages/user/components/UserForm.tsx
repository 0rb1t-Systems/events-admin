import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import React, { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import ActionButton from "../../../components/ActionButton";
import Alert from "../../../components/Alert";
import FormCombobox from "../../../components/form/FormCombobox";
import FormInput from "../../../components/form/FormInput";
import FormSelect from "../../../components/form/FormSelect";
import { roleApi } from "../../../services/role";
import { userApi } from "../../../services/user";
import { IRole, IUser } from "../../../types";

// ---------------------- Schema & Types ----------------------
const userSchema = z
    .object({
        name: z.string().min(1, "Name is required").max(255),
        email: z
            .string()
            .min(1, "Email is required")
            .email("Invalid email format"),
        password: z
            .string()
            .min(8, "Password must be at least 8 characters")
            .optional()
            .or(z.literal("")),
        password_confirmation: z.string().optional().or(z.literal("")),
        phone: z.string().optional().nullable(),
        status: z.enum(["active", "inactive"]).optional(),
        role_id: z.number().optional(),
    })
    .refine(
        (data) =>
            !data.password || data.password === data.password_confirmation,
        {
            message: "Passwords do not match",
            path: ["password_confirmation"],
        }
    );

type UserFormData = z.infer<typeof userSchema>;

interface UserFormProps {
    userToEdit?: IUser | null;
    onClose: () => void;
    userType: string;
}

// ---------------------- Main Component ----------------------
const UserForm: React.FC<UserFormProps> = ({
    userToEdit,
    onClose,
    userType,
}) => {
    const queryClient = useQueryClient();
    const [roleQuery, setRoleQuery] = useState("");
    const [generalError, setGeneralError] = useState<string | null>(null);

    const isEditMode = Boolean(userToEdit);

    const {
        control,
        handleSubmit,
        reset,
        setError,
        watch,
        formState: { errors, isSubmitting },
    } = useForm<UserFormData>({
        resolver: zodResolver(userSchema),
        defaultValues: {
            name: "",
            email: "",
            password: "",
            password_confirmation: "",
            phone: "",
            status: "active",
            role_id: userType === "admin" ? 0 : undefined,
        },
        mode: "onChange",
    });

    // Fetch roles for the combobox
    const { data: rolesData, isLoading: isLoadingRoles } = useQuery({
        queryKey: ["roles", roleQuery],
        queryFn: () => roleApi.search({ q: roleQuery }),
        enabled: roleQuery.length > 0,
    });

    // ---------------------- Mutations ----------------------
    const handleMutationError = (error: any) => {
        if (error?.errors) {
            Object.entries(error.errors).forEach(([key, value]) => {
                // Check if key is a valid form field
                if (
                    [
                        "name",
                        "email",
                        "password",
                        "password_confirmation",
                        "phone",
                        "role_id",
                        "status",
                    ].includes(key)
                ) {
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

    const createUser = useMutation({
        mutationFn: (data: UserFormData) => userApi.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["User Table"] });
            toast.success("User created successfully");
            handleClose();
        },
        onError: handleMutationError,
    });

    const updateUser = useMutation({
        mutationFn: ({ id, data }: { id: number; data: UserFormData }) =>
            userApi.update(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["User Table"] });
            queryClient.invalidateQueries({
                queryKey: ["user", userToEdit?.id],
            });
            toast.success("User updated successfully");
            handleClose();
        },
        onError: handleMutationError,
    });

    const isLoading =
        isSubmitting || createUser.isPending || updateUser.isPending;

    // ---------------------- Handlers ----------------------
    const onSubmit = (data: UserFormData) => {
        // Validate role is required for admin users
        if (userType === "admin" && (!data.role_id || data.role_id === 0)) {
            setError("role_id", {
                type: "manual",
                message: "Role is required for admin users",
            });
            return;
        }

        // Add userType to the data
        let formDataWithUserType = {
            ...data,
            user_type: userType,
        };

        // Remove role_id if user is not admin
        if (userType !== "admin") {
            const { role_id, ...dataWithoutRole } = formDataWithUserType;
            formDataWithUserType = dataWithoutRole;
        }

        // Remove empty password fields when updating
        if (isEditMode && userToEdit) {
            if (!data.password) {
                const { password, password_confirmation, ...restData } =
                    formDataWithUserType;
                updateUser.mutate({
                    id: userToEdit.id,
                    data: restData,
                });
            } else {
                updateUser.mutate({
                    id: userToEdit.id,
                    data: formDataWithUserType,
                });
            }
        } else {
            // For create, ensure password is required
            if (!data.password) {
                setError("password", {
                    type: "manual",
                    message: "Password is required",
                });
                return;
            }
            createUser.mutate(formDataWithUserType);
        }
    };

    const handleClose = () => {
        reset();
        setGeneralError(null);
        setRoleQuery("");
        onClose();
    };

    useEffect(() => {
        console.log(userToEdit);
        if (userToEdit) {
            const formData: any = {
                name: userToEdit.name,
                email: userToEdit.email,
                password: "",
                password_confirmation: "",
                phone: userToEdit.phone || "",
                status:
                    (userToEdit.status as "active" | "inactive") || "active",
            };

            // Only set role_id for admin users
            if (userType === "admin") {
                formData.role_id = userToEdit.roles?.[0]?.id || 0;
                // Set the initial role query to the role name
                if (userToEdit.roles?.[0]?.name) {
                    setRoleQuery(userToEdit.roles[0].name);
                }
            }

            reset(formData);
        }
        setGeneralError(null);
    }, [userToEdit, reset, userType]);

    const filteredRoles = rolesData?.data || [];
    const selectedRoleId = watch("role_id");
    const selectedRole =
        filteredRoles.find((r) => r.id === selectedRoleId) || null;

    // Handle search input for role
    const handleRoleSearch = (query: string) => {
        setRoleQuery(query);
    };

    // ---------------------- Render ----------------------
    return (
        <form
            className="space-y-5"
            onSubmit={handleSubmit(onSubmit)}
            noValidate
        >
            {generalError && (
                <Alert type="danger" title="Error" message={generalError} />
            )}

            <Controller
                name="name"
                control={control}
                render={({ field }) => (
                    <FormInput
                        id="user_name"
                        type="text"
                        label="Name"
                        error={errors.name?.message}
                        placeholder="Enter user's full name"
                        disabled={isLoading}
                        {...field}
                    />
                )}
            />

            <Controller
                name="email"
                control={control}
                render={({ field }) => (
                    <FormInput
                        id="user_email"
                        type="email"
                        label="Email"
                        error={errors.email?.message}
                        placeholder="Enter email address"
                        disabled={isLoading}
                        {...field}
                    />
                )}
            />

            <div className="flex flex-col md:flex-row gap-4">
                <div className="w-full md:w-1/2">
                    <Controller
                        name="password"
                        control={control}
                        render={({ field }) => (
                            <FormInput
                                id="user_password"
                                type="password"
                                label={
                                    isEditMode
                                        ? "Password (leave blank to keep current)"
                                        : "Password"
                                }
                                error={errors.password?.message}
                                placeholder={
                                    isEditMode
                                        ? "Enter new password"
                                        : "Enter password"
                                }
                                disabled={isLoading}
                                value={field.value || ""}
                                onChange={field.onChange}
                                onBlur={field.onBlur}
                            />
                        )}
                    />
                </div>
                <div className="w-full md:w-1/2">
                    <Controller
                        name="password_confirmation"
                        control={control}
                        render={({ field }) => (
                            <FormInput
                                id="user_password_confirmation"
                                type="password"
                                label="Confirm Password"
                                error={errors.password_confirmation?.message}
                                placeholder="Confirm password"
                                disabled={isLoading}
                                value={field.value || ""}
                                onChange={field.onChange}
                                onBlur={field.onBlur}
                            />
                        )}
                    />
                </div>
            </div>

            <div className="flex flex-col md:flex-row gap-4">
                <div className="w-full">
                    <Controller
                        name="phone"
                        control={control}
                        render={({ field }) => (
                            <FormInput
                                id="user_phone"
                                type="tel"
                                label="Phone"
                                error={errors.phone?.message}
                                placeholder="Enter phone number"
                                disabled={isLoading}
                                {...field}
                                value={field.value || ""}
                            />
                        )}
                    />
                </div>
            </div>

            {userType === "admin" && (
                <Controller
                    name="role_id"
                    control={control}
                    render={({ field }) => (
                        <FormCombobox<IRole>
                            id="role"
                            label="Role"
                            value={selectedRole}
                            onChange={(role) => {
                                field.onChange(role?.id || 0);
                            }}
                            onSearch={handleRoleSearch}
                            options={filteredRoles}
                            displayValue={(role) => role?.name || ""}
                            error={errors.role_id?.message}
                            disabled={isLoading}
                            placeholder="Search roles..."
                            loading={isLoadingRoles}
                        />
                    )}
                />
            )}

            {isEditMode && (
                <Controller
                    name="status"
                    control={control}
                    render={({ field }) => (
                        <FormSelect
                            id="user_status"
                            label="Status"
                            error={errors.status?.message}
                            disabled={isLoading}
                            options={[
                                { value: "active", label: "Active" },
                                { value: "inactive", label: "Inactive" },
                            ]}
                            {...field}
                            value={field.value || "active"}
                        />
                    )}
                />
            )}

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

export default UserForm;
