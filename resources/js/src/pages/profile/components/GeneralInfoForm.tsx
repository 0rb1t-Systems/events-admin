import React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Controller } from "react-hook-form";
import ActionButton from "../../../components/ActionButton";
import ImageUpload from "../../../components/form/ImageUpload";
import FormInput from "../../../components/form/FormInput";
import { authKeys } from "../../../hooks/useAuth";
import { authService } from "../../../services/auth";
import { toast } from "sonner";
import { getImageUrl } from "../../../utils/images";

const GeneralInfoForm = ({
    control,
    handleSubmit,
    onSubmit,
    errors,
    isSubmitting,
    generalError,
    successMessage,
    imageFile,
    setImageFile,
    user,
}: any) => {
    const queryClient = useQueryClient();

    // Profile info update mutation
    const updateProfileMutation = useMutation({
        mutationFn: authService.updateProfile,
        onSuccess: () => {
            // Invalidate auth queries to refetch current user data
            queryClient.invalidateQueries({ queryKey: authKeys.all });
        },
        onError: (error: any) => {
            console.error("Profile update failed:", error);
        },
    });
    // Profile picture update mutation
    const updateProfilePictureMutation = useMutation({
        mutationFn: authService.updateProfilePicture,
        onSuccess: () => {
            // Invalidate auth queries to refetch current user data
            queryClient.invalidateQueries({ queryKey: authKeys.all });
        },
        onError: (error: any) => {
            console.error("Profile picture update failed:", error);
        },
    });

    const onFormSubmit = async (data: any) => {
        let profileImageUrl = user?.profile_image;
        // If a new image is selected, upload it first
        if (imageFile && imageFile instanceof File) {
            try {
                const res = await updateProfilePictureMutation.mutateAsync(
                    imageFile as File
                );
                profileImageUrl = res.data.profile_image;
                setImageFile(null); // Clear after upload
                toast.success("Profile picture updated successfully");
            } catch (err) {
                toast.error("Failed to update profile picture");
                return;
            }
        }
        // Update profile info
        try {
            await updateProfileMutation.mutateAsync({
                ...data,
                profile_image: profileImageUrl,
            });
            onSubmit(data); // call parent handler for success message
            toast.success("Profile updated successfully");
        } catch (err) {
            toast.error("Failed to update profile");
        }
    };

    return (
        <form
            className="border border-[#ebedf2] dark:border-[#191e3a] rounded-md p-8 mb-8 bg-white dark:bg-black w-full"
            onSubmit={handleSubmit(onFormSubmit)}
        >
            <h6 className="text-lg font-bold mb-5">General Information</h6>
            <div className="flex flex-col md:flex-row items-start">
                {/* Profile Image */}
                <div className="md:mr-8 w-32 h-32 mb-5 flex justify-center items-start self-start">
                    <ImageUpload
                        id="profile_image"
                        label=""
                        value={imageFile}
                        onChange={setImageFile}
                        previewUrl={getImageUrl(user?.profile_image)}
                        error={
                            typeof errors.profile_image?.message === "string"
                                ? errors.profile_image.message
                                : undefined
                        }
                    />
                </div>
                {/* Fields */}
                <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-2">
                    <Controller
                        name="name"
                        control={control}
                        render={({ field }) => (
                            <div>
                                <label
                                    htmlFor="name"
                                    className="block mb-1 font-medium"
                                >
                                    Full Name
                                </label>
                                <FormInput
                                    id="name"
                                    label=""
                                    error={errors.name?.message}
                                    placeholder="Enter your full name"
                                    {...field}
                                />
                            </div>
                        )}
                    />
                    <Controller
                        name="email"
                        control={control}
                        render={({ field }) => (
                            <div>
                                <label
                                    htmlFor="email"
                                    className="block mb-1 font-medium"
                                >
                                    Email
                                </label>
                                <FormInput
                                    id="email"
                                    label=""
                                    error={errors.email?.message}
                                    placeholder="Enter your email"
                                    {...field}
                                />
                            </div>
                        )}
                    />
                    <Controller
                        name="phone"
                        control={control}
                        render={({ field }) => (
                            <div>
                                <label
                                    htmlFor="phone"
                                    className="block mb-1 font-medium"
                                >
                                    Phone
                                </label>
                                <FormInput
                                    id="phone"
                                    label=""
                                    error={
                                        typeof errors.phone?.message ===
                                        "string"
                                            ? errors.phone.message
                                            : undefined
                                    }
                                    placeholder="Enter your phone number"
                                    {...field}
                                    value={field.value ?? ""}
                                />
                            </div>
                        )}
                    />
                    <Controller
                        name="address"
                        control={control}
                        render={({ field }) => (
                            <div>
                                <label
                                    htmlFor="address"
                                    className="block mb-1 font-medium"
                                >
                                    Address
                                </label>
                                <FormInput
                                    id="address"
                                    label=""
                                    error={
                                        typeof errors.address?.message ===
                                        "string"
                                            ? errors.address.message
                                            : undefined
                                    }
                                    placeholder="Enter your address"
                                    {...field}
                                    value={field.value ?? ""}
                                />
                            </div>
                        )}
                    />
                </div>
            </div>
            <div className="mt-6 flex">
                <ActionButton
                    type="submit"
                    variant="primary"
                    isLoading={
                        isSubmitting ||
                        updateProfileMutation.isPending ||
                        updateProfilePictureMutation.isPending
                    }
                    displayText="Save"
                />
            </div>
        </form>
    );
};

export default GeneralInfoForm;
