import { zodResolver } from "@hookform/resolvers/zod";
import { Lock, User } from "lucide-react";
import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import FormInput from "../../components/form/FormInput";
import { useUnlock, useCheckLock } from "../../hooks/useAuth";
import { IRootState } from "../../store";
import { getImageUrl } from "../../utils/images";
import { storageUtil } from "../../utils/storage";

const unlockSchema = z.object({
    password: z.string().min(1, "Password is required"),
});

type UnlockFormData = z.infer<typeof unlockSchema>;

const LockScreen = () => {
    const navigate = useNavigate();
    const { user } = useSelector((state: IRootState) => state.auth);
    const [lockedUser, setLockedUser] = useState<any>(null);

    // Check lock status
    const { data: lockData, isLoading: isCheckingLock } = useCheckLock();

    // Unlock mutation
    const unlockMutation = useUnlock();

    const {
        control,
        handleSubmit,
        formState: { errors },
        reset,
    } = useForm<UnlockFormData>({
        resolver: zodResolver(unlockSchema),
        mode: "onChange",
        defaultValues: {
            password: "",
        },
    });

    useEffect(() => {
        if (lockData?.data) {
            if (lockData.data.is_locked && lockData.data.user) {
                setLockedUser(lockData.data.user);
            } else if (!lockData.data.is_locked) {
                // If not locked, redirect to dashboard
                navigate("/");
            }
        }
    }, [lockData, navigate]);

    // If we have a token but no lock data yet, show loading
    if (storageUtil.getToken() && !lockData) {
        return (
            <div className="flex h-screen items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent"></div>
            </div>
        );
    }

    // If no token, redirect to login
    if (!storageUtil.getToken()) {
        navigate("/auth/login");
        return null;
    }

    const onSubmit = async (data: UnlockFormData) => {
        try {
            await unlockMutation.mutateAsync(data.password);
            reset();
            // Redirect to dashboard after successful unlock
            navigate("/");
        } catch (error) {
            // Error is handled in the mutation's onError callback
            console.error("Unlock failed:", error);
        }
    };

    if (isCheckingLock) {
        return (
            <div className="flex h-screen items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent"></div>
            </div>
        );
    }

    if (!lockedUser) {
        return null; // Will redirect in useEffect
    }

    return (
        <div className="min-h-screen">
            {/* Background Pattern */}
            <div className="fixed inset-0 bg-gradient-to-br from-white to-gray-100 dark:from-gray-900 dark:to-black">
                <div className="absolute inset-0 bg-grid-slate-900/[0.04] dark:bg-grid-slate-400/[0.05] bg-[size:60px_60px]" />
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-white/50 dark:to-black/50" />
            </div>

            {/* Main Content */}
            <div className="relative min-h-screen flex items-center justify-center p-4">
                <div className="w-full max-w-[440px] mx-auto">
                    <div className="w-full max-w-full sm:max-w-[360px] md:max-w-[600px] p-4 sm:p-6 md:p-8 py-14 rounded-2xl bg-white/90 backdrop-blur-xl shadow-[0_0_40px_-10px_rgba(0,0,0,0.1)] dark:bg-[#181f2a]/90 dark:backdrop-blur-xl dark:shadow-[0_8px_32px_0_rgba(10,20,50,0.85)] border border-gray-100 dark:border-[#232a3b] mx-auto">
                        <div className="mb-6 sm:mb-8">
                            <div className="flex items-center justify-center mb-4 sm:mb-6">
                                <div className="relative">
                                    <div className="absolute -inset-1">
                                        <div className="w-full h-full mx-auto opacity-30 blur-lg filter bg-gradient-to-r from-primary to-secondary" />
                                    </div>
                                    <Lock className="relative w-10 h-10 sm:w-12 sm:h-12 text-primary drop-shadow-[0_0_12px_rgba(2,25,69,0.25)] dark:text-primary-light" />
                                </div>
                            </div>
                            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-center text-gray-900 dark:text-white mb-2">
                                Session Locked
                            </h1>
                            <p className="text-center text-gray-600 dark:text-gray-400 text-sm sm:text-base">
                                Enter your password to unlock your session
                            </p>
                        </div>

                        {/* User Info */}
                        <div className="flex items-center justify-center mb-6">
                            <div className="flex items-center space-x-4">
                                <img
                                    className="w-16 h-16 rounded-full object-cover border-4 border-white dark:border-gray-700 shadow-lg"
                                    src={getImageUrl(lockedUser.profile_image)}
                                    alt="User Profile"
                                />
                                <div className="text-center sm:text-left">
                                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                                        {lockedUser.name}
                                    </h2>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">
                                        {lockedUser.email}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <form
                            className="space-y-4"
                            onSubmit={handleSubmit(onSubmit)}
                            noValidate
                        >
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
                                        disabled={unlockMutation.isPending}
                                        className="dark:bg-[#232a3b] dark:text-gray-100 dark:placeholder-gray-500"
                                        {...field}
                                    />
                                )}
                            />

                            <button
                                type="submit"
                                disabled={unlockMutation.isPending}
                                className="w-full px-6 py-3 text-white font-semibold rounded-lg bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                            >
                                {unlockMutation.isPending ? (
                                    <div className="flex items-center justify-center">
                                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                                        Unlocking...
                                    </div>
                                ) : (
                                    "Unlock Session"
                                )}
                            </button>
                        </form>

                        <div className="mt-6 text-center">
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                Your session is locked for security. Enter your password to continue.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LockScreen;
