import { Image as ImageIcon, X, Camera } from "lucide-react";
import React, { useEffect, useState } from "react";

interface ImageUploadProps {
    id: string;
    label: string;
    value: File | null;
    onChange: (file: File | null) => void;
    error?: string | null;
    required?: boolean;
    maxSize?: number;
    disabled?: boolean;
    helpText?: string;
    placeholder?: string;
    previewUrl?: string | null;
}

const ImageUpload: React.FC<ImageUploadProps> = ({
    id,
    label,
    value,
    onChange,
    error,
    required = false,
    maxSize = 5120, // Default 5MB
    disabled = false,
    helpText = "JPG, PNG, GIF (Max 5MB)",
    placeholder = "Drop your image here or click to browse",
    previewUrl = null,
}) => {
    const [preview, setPreview] = useState<string | null>(previewUrl);

    useEffect(() => {
        // When file value changes, update preview
        if (value) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setPreview(reader.result as string);
            };
            reader.readAsDataURL(value);
        } else if (previewUrl) {
            // If there's no file but there is a previewUrl, use that
            setPreview(previewUrl);
        } else {
            // Neither file nor previewUrl, clear preview
            setPreview(null);
        }
    }, [value, previewUrl]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const file = e.target.files[0];
            onChange(file);
        }
    };

    const handleDelete = () => {
        onChange(null);
        setPreview(null);

        // Reset the file input by clearing its value
        const fileInput = document.getElementById(id) as HTMLInputElement;
        if (fileInput) fileInput.value = "";
    };

    // Format file size to readable format (KB or MB)
    const formatFileSize = (bytes: number) => {
        const kb = bytes / 1024;
        if (kb < 1024) {
            return `${Math.round(kb)} KB`;
        } else {
            return `${(kb / 1024).toFixed(2)} MB`;
        }
    };

    return (
        <div className="space-y-2">
            {/* Hide label for minimal avatar style */}
            {/* <label htmlFor={id} className="block text-sm font-medium text-gray-700">
                {label} {required && <span className="text-red-500">*</span>}
            </label> */}

            <div
                className={`w-full h-full relative ${
                    error ? "border-red-500" : ""
                }`}
            >
                {preview ? (
                    <div className="flex flex-col items-center justify-center w-full h-full">
                        <div className="flex items-center justify-between mb-2 w-full">
                            <p className="text-sm font-medium">Image Preview</p>
                            <button
                                type="button"
                                onClick={handleDelete}
                                className="text-red-500 hover:text-red-700"
                                disabled={disabled}
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        <div className="relative w-full h-24 aspect-square mx-auto rounded-full overflow-hidden border border-gray-200">
                            <img
                                src={preview}
                                alt="Image Preview"
                                className="w-full h-full object-cover rounded-full"
                            />
                            {/* Camera icon overlay */}
                            <button
                                type="button"
                                tabIndex={-1}
                                className="absolute bottom-2 right-2 bg-white bg-opacity-80 rounded-full p-1 shadow hover:bg-opacity-100 transition"
                                onClick={() =>
                                    document.getElementById(id)?.click()
                                }
                                aria-label="Change profile image"
                                disabled={disabled}
                            >
                                <Camera className="h-5 w-5 text-gray-700" />
                            </button>
                            <input
                                id={id}
                                type="file"
                                accept="image/*"
                                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                                onChange={handleFileChange}
                                disabled={disabled}
                                tabIndex={-1}
                            />
                        </div>
                        {value && (
                            <p className="mt-2 text-xs text-gray-500 text-center">
                                {value.name} ({formatFileSize(value.size)})
                            </p>
                        )}
                    </div>
                ) : (
                    <div className="relative w-full h-24 aspect-square rounded-full flex items-center justify-center bg-gray-100 cursor-pointer">
                        <div className="flex flex-col items-center justify-center w-full h-full">
                            <ImageIcon className="h-8 w-8 text-gray-400 mb-2" />
                            {/* Camera icon overlay */}
                            <button
                                type="button"
                                tabIndex={-1}
                                className="absolute bottom-2 right-2 bg-white bg-opacity-80 rounded-full p-1 shadow hover:bg-opacity-100 transition"
                                onClick={() =>
                                    document.getElementById(id)?.click()
                                }
                                aria-label="Upload profile image"
                                disabled={disabled}
                            >
                                <Camera className="h-5 w-5 text-gray-700" />
                            </button>
                            <input
                                id={id}
                                type="file"
                                accept="image/*"
                                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                                onChange={handleFileChange}
                                disabled={disabled}
                                tabIndex={-1}
                            />
                        </div>
                    </div>
                )}
            </div>
            {error && <p className="mt-1 text-sm text-red-500">{error}</p>}
        </div>
    );
};

export default ImageUpload;
