import { zodResolver } from "@hookform/resolvers/zod";
import { Lock, Mail, ShieldCheck } from "lucide-react";
import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { useSelector } from "react-redux";
import { useLocation, useNavigate } from "react-router-dom";
import FormInput from "../../components/form/FormInput";
import { useLogin } from "../../hooks/useAuth";
import { IRootState } from "../../store";
import LoginCover from "./components/LoginCover";
import { LoginFormData, loginSchema } from "./schema";
import { authUtils } from "../../utils/auth";

const Login = () => {
    const navigate = useNavigate();
    const location = useLocation();

    // Get redirect URL from query parameters if present
    const searchParams = new URLSearchParams(location.search);
    const redirectPath = searchParams.get("redirect") || "/";

    const { isAuthenticated, user } = useSelector(
        (state: IRootState) => state.auth
    );

    // Use React Query login mutation
    const loginMutation = useLogin();

    useEffect(() => {
        // Redirect if already authenticated
        if (isAuthenticated && user) {
            // Navigate to the redirect path or dashboard
            const decodedRedirectPath = redirectPath
                ? decodeURIComponent(redirectPath)
                : authUtils.getHomePage();
            navigate(decodedRedirectPath);
        }
    }, [isAuthenticated, user, navigate, redirectPath]);

    const {
        control,
        handleSubmit,
        formState: { errors },
    } = useForm<LoginFormData>({
        resolver: zodResolver(loginSchema),
        mode: "onChange",
        defaultValues: {
            email: "",
            password: "",
            rememberMe: false,
        },
    });

    const onSubmit = async (data: LoginFormData) => {
        try {
            await loginMutation.mutateAsync(data);
            // Success is handled in the mutation's onSuccess callback
        } catch (error) {
            // Error is handled in the mutation's onError callback
            console.error("Login failed:", error);
        }
    };

    return (
        <LoginCover>
            <div className="w-full max-w-full sm:max-w-[360px] md:max-w-[600px] p-4 sm:p-6 md:p-8 py-14 rounded-2xl bg-white/90 backdrop-blur-xl shadow-[0_0_40px_-10px_rgba(0,0,0,0.1)] dark:bg-[#181f2a]/90 dark:backdrop-blur-xl dark:shadow-[0_8px_32px_0_rgba(10,20,50,0.85)] border border-gray-100 dark:border-[#232a3b] mx-auto">
                <div className="mb-6 sm:mb-8">
                    <div className="flex items-center justify-center mb-4 sm:mb-6">
                        <div className="relative">
                            <div className="absolute -inset-1">
                                <div className="w-full h-full mx-auto opacity-30 blur-lg filter bg-gradient-to-r from-primary to-secondary" />
                            </div>
                            <ShieldCheck className="relative w-10 h-10 sm:w-12 sm:h-12 text-primary drop-shadow-[0_0_12px_rgba(255,200,80,0.25)] dark:text-primary-light" />
                        </div>
                    </div>
                    <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-center text-gray-900 dark:text-white mb-2">
                        Admin Login
                    </h1>
                    <p className="text-center text-gray-600 dark:text-gray-400 text-sm sm:text-base">
                        Please sign in to continue to dashboard
                    </p>
                </div>

                <form
                    className="space-y-4"
                    onSubmit={handleSubmit(onSubmit)}
                    noValidate
                >
                    <Controller
                        name="email"
                        control={control}
                        render={({ field }) => (
                            <FormInput
                                id="email"
                                type="email"
                                label="Email"
                                icon={Mail}
                                error={errors.email?.message}
                                placeholder="admin@example.com"
                                autoComplete="email"
                                disabled={loginMutation.isPending}
                                className="dark:bg-[#232a3b] dark:text-gray-100 dark:placeholder-gray-500"
                                {...field}
                            />
                        )}
                    />

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
                                placeholder="Enter Password"
                                autoComplete="current-password"
                                disabled={loginMutation.isPending}
                                className="dark:bg-[#232a3b] dark:text-gray-100 dark:placeholder-gray-500"
                                {...field}
                            />
                        )}
                    />

                    <div className="flex items-center">
                        <label className="flex items-center cursor-pointer">
                            <Controller
                                name="rememberMe"
                                control={control}
                                render={({
                                    field: { value, onChange, ...field },
                                }) => (
                                    <input
                                        type="checkbox"
                                        className="form-checkbox rounded border-gray-300 text-primary focus:ring-primary dark:border-gray-700 dark:bg-[#232a3b]"
                                        disabled={loginMutation.isPending}
                                        checked={value}
                                        onChange={(e) =>
                                            onChange(e.target.checked)
                                        }
                                        {...field}
                                    />
                                )}
                            />
                            <span className="text-gray-600 dark:text-gray-400 ml-2 text-sm">
                                Keep me signed in
                            </span>
                        </label>
                    </div>

                    <button
                        type="submit"
                        className="w-full h-11 sm:h-12 px-4 bg-gradient-to-r from-primary to-secondary rounded-lg text-white font-semibold text-sm transition-all duration-300 hover:from-primary/90 hover:to-secondary/90 focus:ring-2 focus:ring-primary/20 disabled:opacity-70 disabled:hover:from-primary disabled:hover:to-secondary shadow-md dark:shadow-[0_2px_16px_0_rgba(255,140,0,0.10)]"
                        disabled={loginMutation.isPending}
                    >
                        {loginMutation.isPending ? (
                            <span className="flex items-center justify-center">
                                <svg
                                    className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                                    xmlns="http://www.w3.org/2000/svg"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                >
                                    <circle
                                        className="opacity-25"
                                        cx="12"
                                        cy="12"
                                        r="10"
                                        stroke="currentColor"
                                        strokeWidth="4"
                                    ></circle>
                                    <path
                                        className="opacity-75"
                                        fill="currentColor"
                                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                    ></path>
                                </svg>
                                Signing in...
                            </span>
                        ) : (
                            "Login"
                        )}
                    </button>
                </form>
            </div>
        </LoginCover>
    );
};

export default Login;
