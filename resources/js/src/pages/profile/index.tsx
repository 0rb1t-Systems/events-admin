import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useDispatch, useSelector } from "react-redux";
import { z } from "zod";
import { useCurrentUser } from "../../hooks/useAuth";
import { updateUser as updateUserAction } from "../../store/authSlice";
import { IUser } from "../../types";
import GeneralInfoForm from "./components/GeneralInfoForm";
import SecurityForm from "./components/SecurityForm";

const profileSchema = z.object({
    name: z.string().min(1, "Name is required").max(255),
    email: z.string().min(1, "Email is required").email("Invalid email format"),
    phone: z.string().optional().nullable(),
    address: z.string().optional().nullable(),
    profile_image: z.any().optional().nullable(),
});

type ProfileFormData = z.infer<typeof profileSchema>;

const passwordSchema = z
    .object({
        current_password: z.string().min(8, "Current password is required"),
        new_password: z
            .string()
            .min(8, "New password must be at least 8 characters"),
        confirm_password: z.string(),
    })
    .refine((data) => data.new_password === data.confirm_password, {
        message: "Passwords do not match",
        path: ["confirm_password"],
    });

type PasswordFormData = z.infer<typeof passwordSchema>;

const ProfilePage = () => {
    const dispatch = useDispatch();
    const { data, isLoading } = useCurrentUser();
    const user = useSelector((state: any) => state.auth.user) as IUser;
    const [generalError, setGeneralError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [imageFile, setImageFile] = useState<File | null>(null);

    // Profile form
    const {
        control,
        handleSubmit,
        reset,
        setValue,
        formState: { errors, isSubmitting },
    } = useForm<ProfileFormData>({
        resolver: zodResolver(profileSchema),
        defaultValues: {
            name: user?.name || "",
            email: user?.email || "",
            phone: user?.phone || "",
            address: user?.address || "",
            profile_image: user?.profile_image || null,
        },
    });

    // Password form
    const {
        control: pwControl,
        handleSubmit: handlePwSubmit,
        reset: resetPw,
        formState: { errors: pwErrors, isSubmitting: pwIsSubmitting },
    } = useForm<PasswordFormData>({
        resolver: zodResolver(passwordSchema),
        defaultValues: {
            current_password: "",
            new_password: "",
            confirm_password: "",
        },
    });

    useEffect(() => {
        if (user) {
            reset({
                name: user.name || "",
                email: user.email || "",
                phone: user.phone || "",
                address: user.address || "",
                profile_image: user.profile_image || null,
            });
            setImageFile(null);
        }
    }, [user, reset]);

    // Handle profile update
    const onSubmit = async (data: ProfileFormData) => {
        setGeneralError(null);
        setSuccessMessage(null);
        try {
            const updatedUser = { ...user, ...data };
            dispatch(updateUserAction(updatedUser));
            setSuccessMessage("Profile updated successfully.");
        } catch (err: any) {
            setGeneralError(err.message || "Failed to update profile.");
        }
    };

    // Handle password change
    const onPasswordSubmit = async (data: PasswordFormData) => {
        setGeneralError(null);
        setSuccessMessage(null);
        try {
            setSuccessMessage("Password changed successfully (placeholder).");
            resetPw();
        } catch (err: any) {
            setGeneralError(err.message || "Failed to change password.");
        }
    };

    if (isLoading) return <div>Loading...</div>;

    return (
        <div className="py-10">
            <GeneralInfoForm
                control={control}
                handleSubmit={handleSubmit}
                onSubmit={onSubmit}
                errors={errors}
                isSubmitting={isSubmitting}
                generalError={generalError}
                successMessage={successMessage}
                imageFile={imageFile}
                setImageFile={setImageFile}
                user={user}
            />
            <SecurityForm
                pwControl={pwControl}
                handlePwSubmit={handlePwSubmit}
                onPasswordSubmit={onPasswordSubmit}
                pwErrors={pwErrors}
                pwIsSubmitting={pwIsSubmitting}
            />
        </div>
    );
};

export default ProfilePage;
