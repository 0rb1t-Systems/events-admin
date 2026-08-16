import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import React, { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import GenericModal from "../../../components/GenericModal";
import Loader from "../../../components/Loader";
import FormInput from "../../../components/form/FormInput";
import FormSelect from "../../../components/form/FormSelect";
import FormSwitch from "../../../components/form/FormSwitch";
import { useConfirmDialog } from "../../../hooks";
import { eventApi } from "../../../services/event";
import { IEventFormField } from "../../../types/event";

interface Props {
    eventId: number;
}

const FIELD_TYPES = [
    { value: "text", label: "Text" },
    { value: "number", label: "Number" },
    { value: "select", label: "Select" },
    { value: "checkbox", label: "Checkbox" },
    { value: "date", label: "Date" },
];

const schema = z.object({
    key: z.string().min(1, "Required").regex(/^[a-z0-9_]+$/, "Lowercase letters, numbers, _ only"),
    label: z.string().min(1, "Required"),
    type: z.enum(["text", "number", "select", "checkbox", "date"]),
    options: z.string().optional(),
    required: z.boolean(),
    active: z.boolean(),
});

type FormData = z.infer<typeof schema>;

const typeLabel = (t: string) => t.replace(/_/g, " ");

const optionsPreview = (field: IEventFormField): string | null => {
    if (!field.options || field.options.length === 0) return null;
    const values = field.options.map((o) =>
        typeof o === "string" ? o : String(o.value ?? o.label ?? "")
    );
    return values.filter(Boolean).join(", ");
};

const FormFieldOversight: React.FC<Props> = ({ eventId }) => {
    const queryClient = useQueryClient();
    const { confirmAction } = useConfirmDialog();

    const [modal, setModal] = useState<{ open: boolean; item: IEventFormField | null }>({
        open: false,
        item: null,
    });

    const { data, isLoading, error } = useQuery({
        queryKey: ["event-form-fields", eventId],
        queryFn: () => eventApi.formFields(eventId),
    });

    const invalidate = () =>
        queryClient.invalidateQueries({ queryKey: ["event-form-fields", eventId] });

    const isEdit = !!modal.item;

    const {
        control,
        handleSubmit,
        reset,
        watch,
        formState: { errors, isSubmitting },
    } = useForm<FormData>({
        resolver: zodResolver(schema),
        defaultValues: {
            key: "",
            label: "",
            type: "text",
            options: "",
            required: false,
            active: true,
        },
    });

    const fieldType = watch("type");

    useEffect(() => {
        if (modal.open) {
            if (modal.item) {
                const opts = modal.item.options
                    ? modal.item.options
                          .map((o) => (typeof o === "string" ? o : String(o.value ?? o.label ?? "")))
                          .join(", ")
                    : "";
                reset({
                    key: modal.item.key,
                    label: modal.item.label,
                    type: modal.item.type as FormData["type"],
                    options: opts,
                    required: modal.item.required,
                    active: modal.item.active,
                });
            } else {
                reset({
                    key: "",
                    label: "",
                    type: "text",
                    options: "",
                    required: false,
                    active: true,
                });
            }
        }
    }, [modal, reset]);

    const saveMut = useMutation({
        mutationFn: (data: FormData) => {
            const hasOptions = ["select", "checkbox"].includes(data.type);
            const optionsArr = hasOptions && data.options
                ? data.options.split(",").map((s) => s.trim()).filter(Boolean)
                : null;

            if (isEdit) {
                return eventApi.updateFormField(modal.item!.id, {
                    label: data.label,
                    type: data.type,
                    options: optionsArr,
                    required: data.required,
                    active: data.active,
                });
            }
            return eventApi.createFormField({
                event_id: eventId,
                key: data.key,
                label: data.label,
                type: data.type,
                options: optionsArr,
                required: data.required,
                active: data.active,
            });
        },
        onSuccess: () => {
            toast.success(isEdit ? "Field updated" : "Field created");
            invalidate();
            setModal({ open: false, item: null });
        },
        onError: (e: any) => toast.error(e?.message || "Save failed"),
    });

    const deleteMut = useMutation({
        mutationFn: (id: number) => eventApi.deleteFormField(id),
        onSuccess: () => {
            toast.success("Field removed (deactivated if answers exist)");
            invalidate();
        },
        onError: (e: any) => toast.error(e?.message || "Delete failed"),
    });

    const reorderMut = useMutation({
        mutationFn: (orderedIds: number[]) => eventApi.reorderFormFields(eventId, orderedIds),
        onSuccess: () => invalidate(),
        onError: (e: any) => toast.error(e?.message || "Reorder failed"),
    });

    const handleMove = (index: number, direction: "up" | "down") => {
        if (!data) return;
        const fields = [...data.form_fields];
        const newIndex = direction === "up" ? index - 1 : index + 1;
        if (newIndex < 0 || newIndex >= fields.length) return;
        [fields[index], fields[newIndex]] = [fields[newIndex], fields[index]];
        reorderMut.mutate(fields.map((f) => f.id));
    };

    if (isLoading) return <Loader />;
    if (error || !data)
        return <p className="text-sm text-red-500">Failed to load form fields</p>;

    return (
        <>
            <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                    <p className="text-xs text-gray-500">
                        {data.form_fields.length} field{data.form_fields.length !== 1 ? "s" : ""}
                    </p>
                    <button
                        type="button"
                        className="btn btn-primary btn-sm gap-1"
                        onClick={() => setModal({ open: true, item: null })}
                    >
                        + Add field
                    </button>
                </div>

                {data.form_fields.length === 0 ? (
                    <p className="text-sm text-gray-500">No custom form fields</p>
                ) : (
                    <ul className="max-h-64 space-y-1.5 overflow-y-auto text-xs">
                        {data.form_fields.map((f, idx) => {
                            const opts = optionsPreview(f);
                            return (
                                <li
                                    key={f.id}
                                    className="rounded border border-gray-100 px-2 py-1.5 dark:border-[#1b2e4b]"
                                >
                                    <div className="flex items-center justify-between gap-2">
                                        <span className="font-medium text-gray-900 dark:text-white">
                                            {f.label}
                                        </span>
                                        <span className="shrink-0 text-gray-500">
                                            {f.required ? "required" : "optional"}
                                            {!f.active ? " · inactive" : ""}
                                        </span>
                                    </div>
                                    <div className="text-gray-500">
                                        <code className="text-[11px]">{f.key}</code>
                                        {" · "}
                                        {typeLabel(f.type)}
                                        {opts ? ` · [${opts}]` : ""}
                                    </div>
                                    <div className="mt-1 flex flex-wrap gap-1">
                                        <button
                                            type="button"
                                            className="btn btn-outline-primary btn-sm"
                                            onClick={() => setModal({ open: true, item: f })}
                                        >
                                            Edit
                                        </button>
                                        <button
                                            type="button"
                                            className="btn btn-outline-danger btn-sm"
                                            onClick={async () => {
                                                const ok = await confirmAction({
                                                    title: "Remove form field?",
                                                    text: "Deactivates if answers exist; hard-deletes otherwise.",
                                                    confirmButtonText: "Remove",
                                                });
                                                if (ok) deleteMut.mutate(f.id);
                                            }}
                                        >
                                            {f.active ? "Remove" : "Delete"}
                                        </button>
                                        <button
                                            type="button"
                                            className="btn btn-outline-secondary btn-sm px-1"
                                            disabled={idx === 0 || reorderMut.isPending}
                                            onClick={() => handleMove(idx, "up")}
                                            title="Move up"
                                        >
                                            ↑
                                        </button>
                                        <button
                                            type="button"
                                            className="btn btn-outline-secondary btn-sm px-1"
                                            disabled={idx === data.form_fields.length - 1 || reorderMut.isPending}
                                            onClick={() => handleMove(idx, "down")}
                                            title="Move down"
                                        >
                                            ↓
                                        </button>
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                )}
            </div>

            {/* Add/Edit form field modal */}
            <GenericModal
                isOpen={modal.open}
                setIsOpen={() => setModal({ open: false, item: null })}
                title={isEdit ? "Edit Form Field" : "Add Form Field"}
                maxWidth="md"
            >
                <form
                    className="space-y-4"
                    onSubmit={handleSubmit((d) => saveMut.mutate(d))}
                >
                    {!isEdit && (
                        <Controller
                            name="key"
                            control={control}
                            render={({ field }) => (
                                <FormInput
                                    id="ff_key"
                                    label="Key (slug, create-only)"
                                    placeholder="e.g. phone_number"
                                    value={field.value}
                                    onChange={field.onChange}
                                    onBlur={field.onBlur}
                                    error={errors.key?.message}
                                />
                            )}
                        />
                    )}

                    <Controller
                        name="label"
                        control={control}
                        render={({ field }) => (
                            <FormInput
                                id="ff_label"
                                label="Label"
                                value={field.value}
                                onChange={field.onChange}
                                onBlur={field.onBlur}
                                error={errors.label?.message}
                            />
                        )}
                    />

                    <Controller
                        name="type"
                        control={control}
                        render={({ field }) => (
                            <FormSelect
                                id="ff_type"
                                label="Type"
                                value={field.value}
                                onChange={field.onChange}
                                onBlur={field.onBlur}
                                options={FIELD_TYPES}
                            />
                        )}
                    />

                    {["select", "checkbox"].includes(fieldType) && (
                        <Controller
                            name="options"
                            control={control}
                            render={({ field }) => (
                                <FormInput
                                    id="ff_opts"
                                    label="Options (comma-separated)"
                                    placeholder="Option A, Option B, Option C"
                                    value={field.value ?? ""}
                                    onChange={field.onChange}
                                    onBlur={field.onBlur}
                                />
                            )}
                        />
                    )}

                    <Controller
                        name="required"
                        control={control}
                        render={({ field }) => (
                            <FormSwitch
                                label="Required"
                                checked={field.value}
                                onChange={field.onChange}
                                onBlur={field.onBlur}
                            />
                        )}
                    />

                    {isEdit && (
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
                    )}

                    <div className="flex justify-end gap-2">
                        <button
                            type="button"
                            className="btn btn-outline-danger"
                            onClick={() => setModal({ open: false, item: null })}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="btn btn-primary"
                            disabled={isSubmitting || saveMut.isPending}
                        >
                            {saveMut.isPending ? "Saving…" : "Save"}
                        </button>
                    </div>
                </form>
            </GenericModal>
        </>
    );
};

export default FormFieldOversight;
