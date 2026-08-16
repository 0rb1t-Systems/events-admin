import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import React, { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import ActionButton from "../../../components/ActionButton";
import Alert from "../../../components/Alert";
import FormInput from "../../../components/form/FormInput";
import { organizerApi } from "../../../services/organizer";
import { IOrganizer } from "../../../types";

const organizerSchema = z.object({
    business_name: z.string().min(1, "Business name is required").max(255),
    contact_name: z.string().min(1, "Contact name is required").max(255),
    email: z
        .string()
        .min(1, "Email is required")
        .email("Invalid email format")
        .max(255),
    phone: z.string().max(20).optional().nullable(),
});

type OrganizerFormData = z.infer<typeof organizerSchema>;

interface OrganizerFormProps {
    organizer: IOrganizer;
    onClose: () => void;
}

/** Admin identity edit — business, contact, email, phone (not password/status). */
const OrganizerForm: React.FC<OrganizerFormProps> = ({ organizer, onClose }) => {
    const queryClient = useQueryClient();
    const [generalError, setGeneralError] = useState<string | null>(null);

    const {
        control,
        handleSubmit,
        reset,
        setError,
        formState: { errors, isSubmitting },
    } = useForm<OrganizerFormData>({
        resolver: zodResolver(organizerSchema),
        defaultValues: {
            business_name: "",
            contact_name: "",
            email: "",
            phone: "",
        },
        mode: "onChange",
    });

    const handleMutationError = (error: any) => {
        if (error?.errors) {
            Object.entries(error.errors).forEach(([key, value]) => {
                if (
                    ["business_name", "contact_name", "email", "phone"].includes(
                        key
                    )
                ) {
                    setError(key as keyof OrganizerFormData, {
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

    const updateOrganizer = useMutation({
        mutationFn: (data: OrganizerFormData) =>
            organizerApi.update(organizer.id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["Organizer Table"] });
            queryClient.invalidateQueries({
                queryKey: ["organizer", organizer.id],
            });
            toast.success("Organizer updated successfully");
            handleClose();
        },
        onError: handleMutationError,
    });

    const isLoading = isSubmitting || updateOrganizer.isPending;

    const onSubmit = (data: OrganizerFormData) => {
        setGeneralError(null);
        updateOrganizer.mutate({
            ...data,
            phone: data.phone || null,
        });
    };

    const handleClose = () => {
        reset();
        setGeneralError(null);
        onClose();
    };

    useEffect(() => {
        reset({
            business_name: organizer.business_name,
            contact_name: organizer.contact_name,
            email: organizer.email,
            phone: organizer.phone || "",
        });
        setGeneralError(null);
    }, [organizer, reset]);

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
                name="business_name"
                control={control}
                render={({ field }) => (
                    <FormInput
                        id="organizer_business_name"
                        type="text"
                        label="Business name"
                        error={errors.business_name?.message}
                        placeholder="Enter business name"
                        disabled={isLoading}
                        {...field}
                    />
                )}
            />

            <Controller
                name="contact_name"
                control={control}
                render={({ field }) => (
                    <FormInput
                        id="organizer_contact_name"
                        type="text"
                        label="Contact name"
                        error={errors.contact_name?.message}
                        placeholder="Enter contact name"
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
                        id="organizer_email"
                        type="email"
                        label="Email"
                        error={errors.email?.message}
                        placeholder="Enter email address"
                        disabled={isLoading}
                        {...field}
                    />
                )}
            />

            <Controller
                name="phone"
                control={control}
                render={({ field }) => (
                    <FormInput
                        id="organizer_phone"
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

            <div className="mt-8 flex justify-end">
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
                    loadingText="Updating..."
                    displayText="Update"
                    className="ltr:ml-4 rtl:mr-4"
                />
            </div>
        </form>
    );
};

export default OrganizerForm;
