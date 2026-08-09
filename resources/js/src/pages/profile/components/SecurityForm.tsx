import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Controller } from "react-hook-form";
import ActionButton from "../../../components/ActionButton";
import Alert from "../../../components/Alert";
import FormInput from "../../../components/form/FormInput";
import { authKeys } from "../../../hooks/useAuth";
import { authService } from "../../../services/auth";

const SecurityForm = ({
    pwControl,
    handlePwSubmit,
    pwErrors,
    pwIsSubmitting,
}: any) => {
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const queryClient = useQueryClient();

    const changePasswordMutation = useMutation({
        mutationFn: authService.changePassword,
        onSuccess: (res) => {
            setSuccessMessage(
                res.data.message || "Password changed successfully"
            );
            setErrorMessage(null);
            // Invalidate auth queries to refetch current user data
            queryClient.invalidateQueries({ queryKey: authKeys.all });
        },
        onError: (err: any) => {
            setErrorMessage(err?.message || "Failed to change password");
            setSuccessMessage(null);
        },
    });

    const onFormSubmit = (data: any) => {
        setSuccessMessage(null);
        setErrorMessage(null);
        changePasswordMutation.mutate({
            current_password: data.current_password,
            new_password: data.new_password,
            new_password_confirmation: data.confirm_password,
        });
    };

    return (
        <div className="bg-white dark:bg-[#181f2a] rounded-xl shadow p-8">
            <h2 className="text-xl font-bold mb-6">Security</h2>
            {successMessage && (
                <Alert
                    type="success"
                    title="Success"
                    message={successMessage}
                />
            )}
            {errorMessage && (
                <Alert type="danger" title="Error" message={errorMessage} />
            )}
            <form className="space-y-6" onSubmit={handlePwSubmit(onFormSubmit)}>
                <Controller
                    name="current_password"
                    control={pwControl}
                    render={({ field }) => (
                        <FormInput
                            id="current_password"
                            type="password"
                            label="Current Password"
                            error={pwErrors.current_password?.message}
                            placeholder="Enter current password"
                            {...field}
                        />
                    )}
                />
                <Controller
                    name="new_password"
                    control={pwControl}
                    render={({ field }) => (
                        <FormInput
                            id="new_password"
                            type="password"
                            label="New Password"
                            error={pwErrors.new_password?.message}
                            placeholder="Enter new password"
                            {...field}
                        />
                    )}
                />
                <Controller
                    name="confirm_password"
                    control={pwControl}
                    render={({ field }) => (
                        <FormInput
                            id="confirm_password"
                            type="password"
                            label="Confirm New Password"
                            error={pwErrors.confirm_password?.message}
                            placeholder="Confirm new password"
                            {...field}
                        />
                    )}
                />
                <div className="flex justify-end">
                    <ActionButton
                        type="submit"
                        variant="primary"
                        isLoading={
                            pwIsSubmitting || changePasswordMutation.isPending
                        }
                        displayText="Change Password"
                    />
                </div>
            </form>
        </div>
    );
};

export default SecurityForm;
