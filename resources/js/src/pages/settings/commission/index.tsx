import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import React, { useState } from "react";
import { toast } from "sonner";
import Loader from "../../../components/Loader";
import { fetchCommissionRate, updateCommissionRate } from "../../../services/payout";

const CommissionSettingsPage: React.FC = () => {
    const queryClient = useQueryClient();
    const { data: rate, isLoading } = useQuery({
        queryKey: ["commission-rate"],
        queryFn: fetchCommissionRate,
    });
    const [value, setValue] = useState<string>("");

    React.useEffect(() => {
        if (rate !== undefined) setValue(String(rate));
    }, [rate]);

    const save = useMutation({
        mutationFn: () => updateCommissionRate(Number(value)),
        onSuccess: () => {
            toast.success("Commission rate updated (applies to new payout requests only)");
            queryClient.invalidateQueries({ queryKey: ["commission-rate"] });
        },
        onError: (e: Error) => toast.error(e.message),
    });

    if (isLoading) return <Loader />;

    return (
        <div className="max-w-md space-y-4 p-1">
            <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Platform commission
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                    Default rate snapshotted onto each payout request at creation. Changing this
                    never recalculates historical payouts.
                </p>
            </div>
            <div>
                <label className="mb-1 block text-xs font-medium uppercase text-gray-500">
                    Rate (%)
                </label>
                <input
                    type="number"
                    min={0}
                    max={100}
                    step="0.01"
                    className="form-input"
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                />
            </div>
            <button
                type="button"
                className="btn btn-primary"
                disabled={save.isPending}
                onClick={() => save.mutate()}
            >
                Save
            </button>
        </div>
    );
};

export default CommissionSettingsPage;
