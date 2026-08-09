import { zodResolver } from "@hookform/resolvers/zod";
import { Lock, X } from "lucide-react";
import { useState } from "react";
import { createPortal } from "react-dom";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import FormInput from "../form/FormInput";
import { useLock } from "../../hooks/useAuth";
import { toast } from "sonner";

const lockSchema = z.object({
    password: z.string().min(1, "Password is required"),
});

type LockFormData = z.infer<typeof lockSchema>;

interface LockConfirmationModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const LockConfirmationModal = ({ isOpen, onClose }: LockConfirmationModalProps) => {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const lockMutation = useLock();

    const {
        control,
        handleSubmit,
        formState: { errors },
        reset,
    } = useForm<LockFormData>({
        resolver: zodResolver(lockSchema),
        mode: "onChange",
        defaultValues: {
            password: "",
        },
    });

    const onSubmit = async (data: LockFormData) => {
        setIsSubmitting(true);
        try {
            await lockMutation.mutateAsync(data.password);
            reset();
            onClose();
            toast.success("Session locked successfully");
        } catch (error) {
            console.error("Lock failed:", error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleClose = () => {
        if (!isSubmitting) {
            reset();
            onClose();
        }
    };

    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 z-[99999] flex items-center justify-center">
            {/* Backdrop with blur effect */}
            <div
                className="absolute inset-0 bg-black/30 backdrop-blur-md"
                onClick={handleClose}
            />

            {/* Modal */}
            <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md mx-4 p-6 z-10">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                            <Lock className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                Lock Session
                            </h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                Enter your password to lock
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={handleClose}
                        disabled={isSubmitting}
                        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-50"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    <Controller
                        name="password"
                        control={control}
                        render={({ field }) => (
                            <FormInput
                                id="password"
                                type="password"
                                label="Password"
                                icon={Lock}
                                error={errors.password?.message}
                                placeholder="Enter your password"
                                autoComplete="current-password"
                                disabled={isSubmitting}
                                className="dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-500"
                                {...field}
                            />
                        )}
                    />

                    {/* Actions */}
                    <div className="flex space-x-3 pt-4">
                        <button
                            type="button"
                            onClick={handleClose}
                            disabled={isSubmitting}
                            className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="flex-1 px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 rounded-lg"
                        >
                            {isSubmitting ? (
                                <div className="flex items-center justify-center">
                                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                                    Locking...
                                </div>
                            ) : (
                                "Lock Session"
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>,
        document.body
    );
};

export default LockConfirmationModal;
