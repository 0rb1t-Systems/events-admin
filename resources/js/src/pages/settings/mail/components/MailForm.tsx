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
    onSubmit,
    showTestButton,
    onShowTestModal,
}) => (
    <form className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5" onSubmit={onSubmit} noValidate>
        <Controller
            name="host"
            control={control}
            render={({ field }) => (
                <FormInput
                    id="mail_host"
                    label="Mail Host *"
                    error={errors.host?.message}
                    disabled={isLoading || isSubmitting || isPending}
                    {...field}
                />
            )}
        />
        <Controller
            name="port"
            control={control}
            render={({ field }) => (
                <FormInput
                    id="mail_port"
                    label="Mail Port *"
                    error={errors.port?.message}
                    disabled={isLoading || isSubmitting || isPending}
                    {...field}
                />
            )}
        />
        <Controller
            name="username"
            control={control}
            render={({ field }) => (
                <FormInput
                    id="mail_username"
                    label="Mail Username *"
                    error={errors.username?.message}
                    disabled={isLoading || isSubmitting || isPending}
                    {...field}
                />
            )}
        />
        <Controller
            name="password"
            control={control}
            render={({ field }) => (
                <FormInput
                    id="mail_password"
                    label="Mail Password"
                    type="password"
                    error={errors.password?.message}
                    disabled={isLoading || isSubmitting || isPending}
                    autoComplete="new-password"
                    value={field.value ?? ""}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                />
            )}
        />
        <Controller
            name="from_name"
            control={control}
            render={({ field }) => (
                <FormInput
                    id="mail_from_name"
                    label="Mail From Name *"
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
                    label="Mail From Email *"
                    error={errors.from_email?.message}
                    disabled={isLoading || isSubmitting || isPending}
                    {...field}
                />
            )}
        />
        <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
                Mail Encryption *
            </label>
            <Controller
                name="encryption"
                control={control}
                render={({ field }) => (
                    <div className="flex items-center gap-6">
                        <label className="flex items-center gap-2">
                            <input
                                type="radio"
                                value="ssl"
                                checked={field.value === "ssl"}
                                onChange={() => field.onChange("ssl")}
                                disabled={isLoading || isSubmitting || isPending}
                                className="form-radio"
                            />
                            <span>SSL</span>
                        </label>
                        <label className="flex items-center gap-2">
                            <input
                                type="radio"
                                value="tls"
                                checked={field.value === "tls"}
                                onChange={() => field.onChange("tls")}
                                disabled={isLoading || isSubmitting || isPending}
                                className="form-radio"
                            />
                            <span>TLS</span>
                        </label>
                        {errors.encryption?.message && (
                            <span className="text-red-500 text-sm ml-4">{errors.encryption.message}</span>
                        )}
                    </div>
                )}
            />
        </div>
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
