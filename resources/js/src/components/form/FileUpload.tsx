import React, { useState } from "react";
import { X, Upload, FileText } from "lucide-react";

interface FileUploadProps {
    id: string;
    label: string;
    accept: string;
    value: File | null;
    onChange: (file: File | null) => void;
    error?: string | null;
    required?: boolean;
    maxSize?: number;
    disabled?: boolean;
    helpText?: string;
    placeholder?: string;
}

const FileUpload: React.FC<FileUploadProps> = ({
    id,
    label,
    accept,
    value,
    onChange,
    error,
    required = false,
    maxSize = 10240, // Default 10MB
    disabled = false,
    helpText,
    placeholder = "Drop your file here or click to browse"
}) => {
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            onChange(e.target.files[0]);
        }
    };

    const handleDelete = () => {
        onChange(null);

        // Reset the file input by clearing its value
        const fileInput = document.getElementById(id) as HTMLInputElement;
        if (fileInput) fileInput.value = '';
    };

    // Determine file icon based on file type
    const getFileIcon = () => {
        return <FileText className="h-5 w-5 text-blue-500 dark:text-blue-400 mr-2" />;
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
            <label htmlFor={id} className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                {label} {required && <span className="text-red-500 dark:text-red-400">*</span>}
            </label>

            <div className="relative">
                <div className={`border border-gray-300 dark:border-gray-600 rounded-md p-4 ${error ? 'border-red-500 dark:border-red-700' : ''}`}>
                    {value ? (
                        <div className="flex items-center justify-between">
                            <div className="flex items-center">
                                {getFileIcon()}
                                <span className="text-sm font-medium dark:text-gray-300">{value.name}</span>
                                <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">({formatFileSize(value.size)})</span>
                            </div>
                            <button
                                type="button"
                                onClick={handleDelete}
                                className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                                disabled={disabled}
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-4">
                            <Upload className="h-8 w-8 text-gray-400 dark:text-gray-500 mb-2" />
                            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                {placeholder}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{helpText}</p>
                            <input
                                id={id}
                                type="file"
                                accept={accept}
                                className="absolute inset-0 opacity-0 cursor-pointer"
                                onChange={handleFileChange}
                                disabled={disabled}
                            />
                        </div>
                    )}
                </div>
                {error && <p className="mt-1 text-sm text-red-500 dark:text-red-400">{error}</p>}
            </div>
        </div>
    );
};

export default FileUpload;
