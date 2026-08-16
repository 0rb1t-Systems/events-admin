import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import React, { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import FileUpload from "../../../../components/form/FileUpload";
import FormInput from "../../../../components/form/FormInput";
import FormSwitch from "../../../../components/form/FormSwitch";
import FormTextarea from "../../../../components/form/FormTextarea";
import { invitationSystemTemplateApi } from "../../../../services/invitationSystemTemplate";
import { IInvitationSystemTemplate } from "../../../../types/invitationTemplate";

const OVERLAY_KEYS = [
    "qr_code",
    "participant_name",
    "event_title",
    "event_date",
    "event_time",
    "event_venue",
    "ticket_type",
    "organizer_logo",
] as const;

const slugify = (value: string) =>
    value
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");

const schema = z.object({
    name: z.string().min(1, "Name is required").max(255),
    slug: z.string().min(1, "Slug is required").max(255),
    active: z.boolean(),
    primary_color: z.string().optional(),
    secondary_color: z.string().optional(),
    font_family: z.string().optional(),
    header_text: z.string().optional(),
    overlay_json: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

interface Props {
    templateToEdit?: IInvitationSystemTemplate | null;
    onClose: () => void;
}

const InvitationSystemTemplateForm: React.FC<Props> = ({
    templateToEdit,
    onClose,
}) => {
    const queryClient = useQueryClient();
    const isEdit = Boolean(templateToEdit);
    const [generalError, setGeneralError] = useState<string | null>(null);
    const [slugManual, setSlugManual] = useState(false);
    const [backgroundFile, setBackgroundFile] = useState<File | null>(null);
    const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
    const [bgError, setBgError] = useState<string | null>(null);

    const {
        control,
        handleSubmit,
        reset,
        watch,
        setValue,
        setError,
        formState: { errors, isSubmitting },
    } = useForm<FormData>({
        resolver: zodResolver(schema),
        defaultValues: {
            name: "",
            slug: "",
            active: true,
            primary_color: "#0ea5e9",
            secondary_color: "#0369a1",
            font_family: "Inter",
            header_text: "You are invited",
            overlay_json: "",
        },
    });

    const nameValue = watch("name");

    useEffect(() => {
        if (templateToEdit) {
            setSlugManual(true);
            reset({
                name: templateToEdit.name,
                slug: templateToEdit.slug,
                active: templateToEdit.active,
                primary_color:
                    templateToEdit.default_customizations?.primary_color ?? "#0ea5e9",
                secondary_color:
                    templateToEdit.default_customizations?.secondary_color ?? "#0369a1",
                font_family:
                    templateToEdit.default_customizations?.font_family ?? "Inter",
                header_text:
                    templateToEdit.default_customizations?.header_text ??
                    "You are invited",
                overlay_json: JSON.stringify(
                    templateToEdit.default_overlay_positions ?? {},
                    null,
                    2
                ),
            });
        } else {
            setSlugManual(false);
            reset({
                name: "",
                slug: "",
                active: true,
                primary_color: "#0ea5e9",
                secondary_color: "#0369a1",
                font_family: "Inter",
                header_text: "You are invited",
                overlay_json: "",
            });
        }
        setBackgroundFile(null);
        setThumbnailFile(null);
        setBgError(null);
        setGeneralError(null);
    }, [templateToEdit, reset]);

    useEffect(() => {
        if (!slugManual && !isEdit) {
            setValue("slug", slugify(nameValue || ""));
        }
    }, [nameValue, slugManual, isEdit, setValue]);

    const save = useMutation({
        mutationFn: async (data: FormData) => {
            if (!isEdit && !backgroundFile) {
                throw { message: "Background image is required for new templates." };
            }

            let overlay: Record<string, unknown> | undefined;
            if (data.overlay_json?.trim()) {
                try {
                    overlay = JSON.parse(data.overlay_json);
                } catch {
                    throw { message: "Overlay positions must be valid JSON." };
                }
            }

            const form = new FormData();
            form.append("name", data.name);
            form.append("slug", data.slug);
            form.append("active", data.active ? "1" : "0");
            form.append(
                "default_customizations",
                JSON.stringify({
                    primary_color: data.primary_color,
                    secondary_color: data.secondary_color,
                    font_family: data.font_family,
                    header_text: data.header_text,
                })
            );
            if (overlay) {
                form.append("default_overlay_positions", JSON.stringify(overlay));
            }
            if (backgroundFile) form.append("background_image", backgroundFile);
            if (thumbnailFile) form.append("thumbnail", thumbnailFile);

            if (isEdit && templateToEdit) {
                return invitationSystemTemplateApi.updateWithFiles(
                    templateToEdit.id,
                    form
                );
            }
            return invitationSystemTemplateApi.createWithFiles(form);
        },
        onSuccess: () => {
            toast.success(isEdit ? "Template updated" : "Template created");
            queryClient.invalidateQueries({ queryKey: ["Invitation Templates"] });
            onClose();
        },
        onError: (error: any) => {
            if (error?.errors) {
                Object.entries(error.errors).forEach(([key, value]) => {
                    if (["name", "slug"].includes(key)) {
                        setError(key as "name" | "slug", {
                            type: "server",
                            message: Array.isArray(value) ? value[0] : String(value),
                        });
                    }
                });
            }
            setGeneralError(error?.message || "Save failed");
        },
    });

    return (
        <form
            className="space-y-4"
            onSubmit={handleSubmit((data) => save.mutate(data))}
        >
            {generalError && (
                <p className="text-sm text-red-500" role="alert">
                    {generalError}
                </p>
            )}

            <Controller
                name="name"
                control={control}
                render={({ field }) => (
                    <FormInput
                        id="ist_name"
                        label="Name"
                        value={field.value}
                        onChange={field.onChange}
                        onBlur={field.onBlur}
                        error={errors.name?.message}
                    />
                )}
            />

            <Controller
                name="slug"
                control={control}
                render={({ field }) => (
                    <FormInput
                        id="ist_slug"
                        label="Slug"
                        value={field.value}
                        onChange={(v) => {
                            setSlugManual(true);
                            field.onChange(v);
                        }}
                        onBlur={field.onBlur}
                        error={errors.slug?.message}
                    />
                )}
            />
            <p className="text-xs text-gray-500 dark:text-gray-400">
                Machine id for organizers (e.g. modern-blue). Auto-filled from name
                until you edit it.
            </p>

            <Controller
                name="active"
                control={control}
                render={({ field }) => (
                    <FormSwitch
                        id="ist_active"
                        label="Active (visible to organizers)"
                        checked={field.value}
                        onChange={field.onChange}
                        onBlur={field.onBlur}
                    />
                )}
            />

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Controller
                    name="primary_color"
                    control={control}
                    render={({ field }) => (
                        <FormInput
                            id="ist_primary"
                            label="Primary color"
                            value={field.value || ""}
                            onChange={field.onChange}
                            onBlur={field.onBlur}
                        />
                    )}
                />
                <Controller
                    name="secondary_color"
                    control={control}
                    render={({ field }) => (
                        <FormInput
                            id="ist_secondary"
                            label="Secondary color"
                            value={field.value || ""}
                            onChange={field.onChange}
                            onBlur={field.onBlur}
                        />
                    )}
                />
                <Controller
                    name="font_family"
                    control={control}
                    render={({ field }) => (
                        <FormInput
                            id="ist_font"
                            label="Font family"
                            value={field.value || ""}
                            onChange={field.onChange}
                            onBlur={field.onBlur}
                        />
                    )}
                />
                <Controller
                    name="header_text"
                    control={control}
                    render={({ field }) => (
                        <FormInput
                            id="ist_header"
                            label="Header text"
                            value={field.value || ""}
                            onChange={field.onChange}
                            onBlur={field.onBlur}
                        />
                    )}
                />
            </div>

            <FileUpload
                id="ist_background"
                label="Background image"
                accept="image/jpeg,image/png,image/jpg,image/webp"
                value={backgroundFile}
                onChange={(file) => {
                    setBgError(null);
                    if (!file) {
                        setBackgroundFile(null);
                        return;
                    }
                    if (file.size > 5120 * 1024) {
                        setBgError("Background must be 5 MB or smaller.");
                        setBackgroundFile(null);
                        return;
                    }
                    setBackgroundFile(file);
                }}
                error={bgError}
                required={!isEdit}
                maxSize={5120}
                helpText="Required for new templates. Recommended 800x1100px PNG/JPG (canvas standard)."
            />

            <FileUpload
                id="ist_thumb"
                label="Thumbnail (optional)"
                accept="image/jpeg,image/png,image/jpg,image/webp"
                value={thumbnailFile}
                onChange={setThumbnailFile}
                maxSize={2048}
                helpText="Small preview shown when organizers pick a template."
            />

            <Controller
                name="overlay_json"
                control={control}
                render={({ field }) => (
                    <FormTextarea
                        id="ist_overlay"
                        label="Default overlay positions (JSON)"
                        rows={8}
                        value={field.value || ""}
                        onChange={field.onChange}
                        onBlur={field.onBlur}
                    />
                )}
            />
            <p className="text-xs text-gray-500 dark:text-gray-400">
                Keys: {OVERLAY_KEYS.join(", ")}. Leave empty to use platform defaults
                (800x1100 canvas).
            </p>

            <div className="flex justify-end gap-2 pt-2">
                <button type="button" className="btn" onClick={onClose}>
                    Cancel
                </button>
                <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={isSubmitting || save.isPending}
                >
                    {isEdit ? "Save changes" : "Create template"}
                </button>
            </div>
        </form>
    );
};

export default InvitationSystemTemplateForm;
