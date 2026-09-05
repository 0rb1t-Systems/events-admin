import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { mailApi } from "../../../services/mail";
import { IMailConfigPayload } from "../../../types";
import MailForm from "./components/MailForm";
import MailTestModal from "./components/MailTestModal";

const mailConfigSchema = z.object({
    api_key: z.string().optional(),
    from_name: z.string().min(1, "From name is required"),
    from_email: z.string().email("Invalid email address"),
});

export type MailConfigFormData = z.infer<typeof mailConfigSchema>;

function isMailConfigValid(config?: {
    has_api_key?: boolean;
    from_name?: string;
    from_email?: string;
    configured?: boolean;
}): boolean {
    if (!config) return false;
    if (config.configured) return true;
    return !!config.has_api_key && !!config.from_name && !!config.from_email;
}

const MailSettings = () => {
    const queryClient = useQueryClient();
    const [testModalOpen, setTestModalOpen] = useState(false);
    const [testEmail, setTestEmail] = useState("");
    const [testLoading, setTestLoading] = useState(false);
    const [generalError, setGeneralError] = useState<string | null>(null);

    const {
        data: mailConfig,
        isLoading: isMailConfigLoading,
        isFetching: isMailConfigFetching,
        error: mailConfigError,
        isSuccess,
    } = useQuery({
        queryKey: ["mail-config"],
        queryFn: mailApi.getConfig,
        refetchOnWindowFocus: true,
        staleTime: 1000 * 60 * 2,
    });

    const {
        control,
        handleSubmit,
        reset,
        setError,
        formState: { errors, isSubmitting },
    } = useForm<MailConfigFormData>({
        resolver: zodResolver(mailConfigSchema),
        defaultValues: {
            api_key: "",
            from_name: "",
            from_email: "",
        },
        mode: "onChange",
    });

    useEffect(() => {
        if (isSuccess && mailConfig) {
            reset({
                api_key: "",
                from_name: mailConfig.from_name || "",
                from_email: mailConfig.from_email || "",
            });
        }
    }, [isSuccess, mailConfig, reset]);

    const updateMailConfig = useMutation({
        mutationFn: (data: IMailConfigPayload) => mailApi.updateConfig(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["mail-config"] });
            toast.success("Mail settings updated successfully");
            reset((values) => ({ ...values, api_key: "" }));
        },
        onError: (err: any) => {
            if (err?.errors) {
                Object.entries(err.errors).forEach(([key, value]) => {
                    setError(key as keyof MailConfigFormData, {
                        type: "server",
                        message: Array.isArray(value) ? value[0] : String(value),
                    });
                });
            } else {
                setGeneralError(err?.message || "Failed to update mail config");
            }
        },
    });

    const onSubmit = async (data: MailConfigFormData) => {
        setGeneralError(null);
        if (!data.api_key && !mailConfig?.has_api_key) {
            setError("api_key", { type: "manual", message: "Resend API key is required" });
            return;
        }
        updateMailConfig.mutate({
            from_name: data.from_name,
            from_email: data.from_email,
            api_key: data.api_key || undefined,
        });
    };

    const handleTestEmail = async () => {
        setTestLoading(true);
        try {
            await mailApi.sendTestEmail({ test_email: testEmail });
            toast.success("Test email sent successfully");
            setTestModalOpen(false);
            setTestEmail("");
        } catch (err: any) {
            toast.error(err?.message || "Failed to send test email");
        } finally {
            setTestLoading(false);
        }
    };

    return (
        <div className="panel w-full">
            <h2 className="text-2xl font-semibold mb-6 text-gray-900 dark:text-white">Mail (Resend)</h2>
            {mailConfigError ? (
                <p className="text-sm text-red-500 mb-4">Failed to load mail settings.</p>
            ) : null}
            <MailForm
                control={control}
                errors={errors}
                isLoading={isMailConfigLoading || isMailConfigFetching}
                isSubmitting={isSubmitting}
                isPending={updateMailConfig.isPending}
                generalError={generalError}
                hasApiKey={!!mailConfig?.has_api_key}
                onSubmit={handleSubmit(onSubmit)}
                showTestButton={isMailConfigValid(mailConfig)}
                onShowTestModal={() => setTestModalOpen(true)}
            />
            <MailTestModal
                isOpen={testModalOpen}
                setIsOpen={setTestModalOpen}
                testEmail={testEmail}
                setTestEmail={setTestEmail}
                testLoading={testLoading}
                onSend={handleTestEmail}
            />
        </div>
    );
};

export default MailSettings;
