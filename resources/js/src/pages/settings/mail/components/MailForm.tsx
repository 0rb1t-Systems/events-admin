import { SendHorizonal } from "lucide-react";
import React from "react";
import { Control, Controller, FieldErrors } from "react-hook-form";
import ActionButton from "../../../../components/ActionButton";
import FormInput from "../../../../components/form/FormInput";
import { MailConfigFormData } from "../index";

interface MailFormProps {
    control: Control<MailConfigFormData>;
    errors: FieldErrors<MailConfigFormData>;
    isLoading: boolean;
    isSubmitting: boolean;
    isPending: boolean;
    generalError: string | null;
    hasApiKey?: boolean;
    onSubmit: (e?: React.BaseSyntheticEvent) => void;
    showTestButton?: boolean;
    onShowTestModal?: () => void;
}

const MailForm: React.FC<MailFormProps> = ({
    control,
    errors,
    isLoading,
    isSubmitting,
    isPending,
    generalError,
    hasApiKey,
    onSubmit,
    showTestButton,
    onShowTestModal,
}) => (
    <form className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5" onSubmit={onSubmit} noValidate>
        <div className="md:col-span-2">
            <Controller
                name="api_key"
                control={control}
                render={({ field }) => (
                    <FormInput
                        id="mail_api_key"
                        label={hasApiKey ? "Resend API Key (leave blank to keep current)" : "Resend API Key *"}
                        type="password"
                        error={errors.api_key?.message}
                        disabled={isLoading || isSubmitting || isPending}
                        autoComplete="new-password"
                        placeholder={hasApiKey ? "••••••••••••••••" : "re_..."}
                        value={field.value ?? ""}
                        onChange={field.onChange}
                        onBlur={field.onBlur}
                    />
                )}
            />
        </div>

        <Controller
            name="from_name"
            control={control}
            render={({ field }) => (
                <FormInput
                    id="mail_from_name"
                    label="From Name *"
                    error={errors.from_name?.message}
                    disabled={isLoading || isSubmitting || isPending}
                    {...field}
                />
            )}
        />
        <Controller
            name="from_email"
            control={control}
            render={({ field }) => (
                <FormInput
                    id="mail_from_email"
                    label="From Email *"
                    error={errors.from_email?.message}
                    disabled={isLoading || isSubmitting || isPending}
                    placeholder="noreply@yourdomain.com"
                    {...field}
                />
            )}
        />

        {generalError && (
            <div className="md:col-span-2">
                <div className="text-red-500 text-sm mb-2">{generalError}</div>
            </div>
        )}
        <div className="md:col-span-2 mt-6 flex gap-3">
            <ActionButton
                type="submit"
                variant="primary"
                isLoading={isSubmitting || isPending}
                displayText="Save"
            />

            {showTestButton && onShowTestModal && (
                <ActionButton
                    type="button"
                    variant="info"
                    displayText="Send Test Email"
                    onClick={onShowTestModal}
                    disabled={isLoading || isSubmitting || isPending}
                    iconLeft={<SendHorizonal size={16} />}
                />
            )}
        </div>
    </form>
);

export default MailForm;
