import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import React, { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import ActionButton from "../../../../components/ActionButton";
import Alert from "../../../../components/Alert";
import FormInput from "../../../../components/form/FormInput";
import { eventCategoryApi } from "../../../../services/eventCategory";
import { IEventCategory } from "../../../../types";

const schema = z.object({
    name: z.string().min(1, "Name is required").max(255),
});

type FormData = z.infer<typeof schema>;

interface Props {
    categoryToEdit?: IEventCategory | null;
    onClose: () => void;
}

const EventCategoryForm: React.FC<Props> = ({ categoryToEdit, onClose }) => {
    const queryClient = useQueryClient();
    const [generalError, setGeneralError] = useState<string | null>(null);
    const isEdit = Boolean(categoryToEdit);

    const {
        control,
        handleSubmit,
        reset,
        setError,
        formState: { errors, isSubmitting },
    } = useForm<FormData>({
        resolver: zodResolver(schema),
        defaultValues: { name: "" },
    });

    useEffect(() => {
        reset({ name: categoryToEdit?.name ?? "" });
        setGeneralError(null);
    }, [categoryToEdit, reset]);

    const onError = (error: any) => {
        if (error?.errors?.name) {
            setError("name", {
                message: Array.isArray(error.errors.name)
                    ? error.errors.name[0]
                    : error.errors.name,
            });
        } else {
            setGeneralError(error?.message || "Something went wrong");
        }
    };

    const createMut = useMutation({
        mutationFn: (data: FormData) => eventCategoryApi.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["Event Category Table"] });
            toast.success("Category created");
            onClose();
        },
        onError,
    });

    const updateMut = useMutation({
        mutationFn: ({ id, data }: { id: number; data: FormData }) =>
            eventCategoryApi.update(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["Event Category Table"] });
            toast.success("Category updated");
            onClose();
        },
        onError,
    });

    return (
        <form
            className="space-y-4"
            onSubmit={handleSubmit((data) => {
                if (isEdit && categoryToEdit) {
                    updateMut.mutate({ id: categoryToEdit.id, data });
                } else {
                    createMut.mutate(data);
                }
            })}
        >
            {generalError && <Alert type="danger" title="Error" message={generalError} />}
            <Controller
                name="name"
                control={control}
                render={({ field }) => (
                    <FormInput
                        id="category_name"
                        label="Name"
                        value={field.value}
                        onChange={field.onChange}
                        onBlur={field.onBlur}
                        error={errors.name?.message}
                    />
                )}
            />
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
                    isLoading={isSubmitting || createMut.isPending || updateMut.isPending}
                    displayText={isEdit ? "Update" : "Create"}
                />
            </div>
        </form>
    );
};

export default EventCategoryForm;
