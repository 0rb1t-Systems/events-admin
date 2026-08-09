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
    host: z.string().min(1, "Mail host is required"),
    port: z.string().min(1, "Mail port is required"),
    username: z.string().min(1, "Mail username is required"),
    password: z.string().optional(),
    from_name: z.string().min(1, "Mail from name is required"),
    from_email: z.string().email("Invalid email address"),
    encryption: z.enum(["ssl", "tls"], { required_error: "Mail encryption is required" }),
});

export type MailConfigFormData = z.infer<typeof mailConfigSchema>;

// Helper to check if mail config is valid (all required fields are non-empty)
function isMailConfigValid(config?: Partial<MailConfigFormData>): boolean {
    if (!config) return false;
    return (
        !!config.host &&
        !!config.port &&
        !!config.username &&
        !!config.from_name &&
        !!config.from_email &&
        !!config.encryption
    );
}

const MailSettings = () => {
    const queryClient = useQueryClient();
    const [testModalOpen, setTestModalOpen] = useState(false);
    const [testEmail, setTestEmail] = useState("");
    const [testLoading, setTestLoading] = useState(false);
    const [generalError, setGeneralError] = useState<string | null>(null);

    // Fetch mail config with react-query
    const {
        data: mailConfig,
        isLoading: isMailConfigLoading,
        isFetching: isMailConfigFetching,
        refetch: refetchMailConfig,
        error: mailConfigError,
        isSuccess,
    } = useQuery({
        queryKey: ["mail-config"],
        queryFn: mailApi.getConfig,
        refetchOnWindowFocus: true,
        staleTime: 1000 * 60 * 2, // 2 minutes
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
            host: "",
            port: "",
            username: "",
            password: "",
            from_name: "",
            from_email: "",
            encryption: "ssl",
        },
        mode: "onChange",
    });

    // Reset form when mailConfig is fetched and successful
    useEffect(() => {
        if (isSuccess && mailConfig) {
            reset({
                host: mailConfig.host || "",
                port: mailConfig.port || "",
                username: mailConfig.username || "",
                password: mailConfig.password || "",
                from_name: mailConfig.from_name || "",
                from_email: mailConfig.from_email || "",
                encryption: mailConfig.encryption || "ssl",
            });
        }
    }, [isSuccess, mailConfig, reset]);

    // Mutation for updating mail config
    const updateMailConfig = useMutation({
        mutationFn: (data: IMailConfigPayload) => mailApi.updateConfig(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["mail-config"] });
            toast.success("Mail settings updated successfully");
        },
        onError: (err: any) => {
            if (err?.errors) {
                Object.entries(err.errors).forEach(([key, value]) => {
                    setError(key as any, {
                        type: "server",
                        message: Array.isArray(value) ? value[0] : value,
                    });
                });
            } else {
                setGeneralError(err?.message || "Failed to update mail config");
            }
        },
    });

    const onSubmit = async (data: MailConfigFormData) => {
        setGeneralError(null);
        updateMailConfig.mutate({
            ...data,
            password: data.password || "",
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
            <h2 className="text-2xl font-semibold mb-6">Mail</h2>
            <MailForm
                control={control}
                errors={errors}
                isLoading={isMailConfigLoading || isMailConfigFetching}
                isSubmitting={isSubmitting}
                isPending={updateMailConfig.isPending}
                generalError={generalError}
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
}

export default MailSettings;
