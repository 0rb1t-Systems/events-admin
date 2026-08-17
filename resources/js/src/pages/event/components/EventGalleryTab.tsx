import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import React, { useState } from "react";
import { toast } from "sonner";
import GenericModal from "../../../components/GenericModal";
import Loader from "../../../components/Loader";
import FileUpload from "../../../components/form/FileUpload";
import { useConfirmDialog, usePermission } from "../../../hooks";
import { eventApi } from "../../../services/event";

interface Props {
    eventId: number;
}

const EventGalleryTab: React.FC<Props> = ({ eventId }) => {
    const queryClient = useQueryClient();
    const { confirmAction } = useConfirmDialog();
    const { hasPermission } = usePermission();
    const canEditEvent = hasPermission("edit events");
    const [galleryOpen, setGalleryOpen] = useState(false);
    const [galleryFile, setGalleryFile] = useState<File | null>(null);
    const [galleryError, setGalleryError] = useState<string | null>(null);

    const { data: event, isLoading, error } = useQuery({
        queryKey: ["event", eventId],
        queryFn: () => eventApi.getById(eventId),
        enabled: !!eventId,
    });

    const deleteImage = useMutation({
        mutationFn: (imageId: number) => eventApi.deleteGalleryImage(eventId, imageId),
        onSuccess: () => {
            toast.success("Image removed (file deleted from disk)");
            queryClient.invalidateQueries({ queryKey: ["event", eventId] });
        },
        onError: (e: Error) => toast.error(e.message),
    });

    const uploadImage = useMutation({
        mutationFn: (file: File) => eventApi.uploadGalleryImage(eventId, file),
        onSuccess: () => {
            toast.success("Image uploaded");
            queryClient.invalidateQueries({ queryKey: ["event", eventId] });
            setGalleryOpen(false);
            setGalleryFile(null);
            setGalleryError(null);
        },
        onError: (e: any) => toast.error(e?.message || "Upload failed"),
    });

    if (isLoading) {
        return (
            <div className="p-4">
                <Loader />
            </div>
        );
    }
    if (error || !event) {
        return <div className="p-4 text-center text-sm text-red-500">Failed to load</div>;
    }

    return (
        <>
            <div className="p-1">
                <div className="mb-3 flex items-center justify-between gap-2">
                    <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
                        Gallery
                    </h4>
                    {canEditEvent && (
                        <button
                            type="button"
                            className="btn btn-primary btn-sm gap-1"
                            onClick={() => {
                                setGalleryFile(null);
                                setGalleryError(null);
                                setGalleryOpen(true);
                            }}
                        >
                            Upload Image
                        </button>
                    )}
                </div>
                {(event.images?.length ?? 0) === 0 ? (
                    <p className="text-sm text-gray-500">No images</p>
                ) : (
                    <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                        {event.images!.map((img) => (
                            <li
                                key={img.id}
                                className="rounded border border-gray-100 p-2 dark:border-[#1b2e4b]"
                            >
                                <span className="block truncate text-xs text-gray-700 dark:text-gray-300">
                                    {img.path}
                                </span>
                                {canEditEvent && (
                                    <button
                                        type="button"
                                        className="mt-1 text-xs text-danger"
                                        onClick={async () => {
                                            const ok = await confirmAction({
                                                title: "Delete gallery image?",
                                                text: "Removes the DB row and deletes the file from disk.",
                                                confirmButtonText: "Delete",
                                            });
                                            if (ok) deleteImage.mutate(img.id);
                                        }}
                                    >
                                        Remove
                                    </button>
                                )}
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            <GenericModal
                isOpen={galleryOpen}
                setIsOpen={setGalleryOpen}
                title="Upload gallery image"
                maxWidth="md"
            >
                <div className="space-y-4">
                    <FileUpload
                        id="event-gallery-upload"
                        label="Image"
                        accept="image/jpeg,image/png,image/jpg,image/gif,image/webp"
                        value={galleryFile}
                        onChange={(file) => {
                            setGalleryError(null);
                            if (!file) {
                                setGalleryFile(null);
                                return;
                            }
                            const okType =
                                /image\/(jpeg|png|jpg|gif|webp)/i.test(file.type) ||
                                /\.(jpe?g|png|gif|webp)$/i.test(file.name);
                            if (!okType) {
                                setGalleryError("Please select a JPG, PNG, GIF, or WebP image.");
                                setGalleryFile(null);
                                return;
                            }
                            if (file.size > 4096 * 1024) {
                                setGalleryError("Image must be 4 MB or smaller.");
                                setGalleryFile(null);
                                return;
                            }
                            setGalleryFile(file);
                        }}
                        error={galleryError}
                        maxSize={4096}
                        helpText="JPG, PNG, GIF, or WebP — max 4 MB"
                    />
                    <div className="flex justify-end gap-2">
                        <button
                            type="button"
                            className="btn"
                            onClick={() => setGalleryOpen(false)}
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            className="btn btn-primary"
                            disabled={!galleryFile || uploadImage.isPending}
                            onClick={() => {
                                if (!galleryFile) return;
                                uploadImage.mutate(galleryFile);
                            }}
                        >
                            {uploadImage.isPending ? "Uploading…" : "Upload"}
                        </button>
                    </div>
                </div>
            </GenericModal>
        </>
    );
};

export default EventGalleryTab;
