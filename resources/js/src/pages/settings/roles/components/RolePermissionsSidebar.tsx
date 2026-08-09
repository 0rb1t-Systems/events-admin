import React, { useEffect, useState, useRef } from "react";
import GenericSidebar from "../../../../components/GenericSidebar";
import { IRole, IPermission } from "../../../../types";
import { roleApi } from "../../../../services/role";
import ActionButton from "../../../../components/ActionButton";
import Loader from "../../../../components/Loader";
import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";

interface RolePermissionsSidebarProps {
    onClose: () => void;
    role: IRole | null;
}

const ACTIONS = [
    { key: "view", label: "View" },
    { key: "create", label: "Add" },
    { key: "edit", label: "Edit" },
    { key: "delete", label: "Delete" },
];

function groupPermissions(permissions: IPermission[]) {
    const groups: Record<string, Record<string, IPermission>> = {};
    permissions.forEach((perm) => {
        const [action, ...subjectParts] = perm.name.split(" ");
        const subject = subjectParts.join(" ");
        if (!groups[subject]) groups[subject] = {};
        groups[subject][action] = perm;
    });
    return groups;
}

const RolePermissionsSidebar: React.FC<RolePermissionsSidebarProps> = ({
    onClose,
    role,
}) => {
    const [allPermissions, setAllPermissions] = useState<IPermission[]>([]);
    const [selected, setSelected] = useState<Set<number>>(new Set());
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const formRef = useRef<HTMLFormElement>(null);
    const queryClient = useQueryClient();

    const updatePermissions = useMutation({
        mutationFn: async (permissionNames: string[]) => {
            if (!role) return;
            return roleApi.assignPermissions(role.id, permissionNames);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["Role Table"] });
            queryClient.invalidateQueries({ queryKey: ["role", role?.id] });
            toast.success("Permissions updated successfully");
        },
        onError: (err: any) => {
            toast.error(err?.message || "Failed to update permissions.");
        },
    });

    useEffect(() => {
        setLoading(true);
        setError(null);
        roleApi
            .getAvailablePermissions()
            .then((perms) => setAllPermissions(perms))
            .catch(() => setError("Failed to load permissions."))
            .finally(() => setLoading(false));
    }, []);

    useEffect(() => {
        if (role) {
            setSelected(new Set(role.permissions?.map((p) => p.id)));
        }
    }, [role]);

    const handleChange = (permId: number) => {
        setSelected((prev) => {
            const next = new Set(prev);
            if (next.has(permId)) next.delete(permId);
            else next.add(permId);
            return next;
        });
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!role) return;
        // Map selected IDs to permission names
        const permissionNames = allPermissions
            .filter((perm) => selected.has(perm.id))
            .map((perm) => perm.name);
        updatePermissions.mutate(permissionNames);
    };

    if (loading) {
        return (
            <GenericSidebar
                isOpen={true}
                setIsOpen={(open) => {
                    if (!open) onClose();
                }}
                title="Role Permissions"
                width="600px"
                closeButtonPosition="both"
            >
                <div className="flex justify-center py-10">
                    <Loader />
                </div>
            </GenericSidebar>
        );
    }

    const grouped = groupPermissions(allPermissions);

    return (
        <GenericSidebar
            isOpen={true}
            setIsOpen={(open) => {
                if (!open) onClose();
            }}
            title="Role Permissions"
            width="700px"
            closeButtonPosition="both"
            footerActions={
                <>
                    <ActionButton
                        type="button"
                        variant="outline-danger"
                        onClick={onClose}
                        isLoading={false}
                        displayText="Cancel"
                        disabled={updatePermissions.isPending}
                    />
                    <ActionButton
                        type="button"
                        variant="primary"
                        isLoading={updatePermissions.isPending}
                        loadingText="Updating..."
                        displayText="Update"
                        disabled={updatePermissions.isPending}
                        onClick={() => formRef.current?.requestSubmit()}
                    />
                </>
            }
        >
            <form
                ref={formRef}
                id="role-permissions-form"
                onSubmit={handleSubmit}
                className="flex flex-col h-[calc(100vh-60px)]"
            >
                {/* Section Title */}
                <div className="font-semibold text-lg mb-2 mt-2">
                    Permissions
                </div>
                {/* Grouped Permissions List - Compact, no card/box */}
                <div className="flex-1 overflow-y-hidden divide-y divide-gray-200 dark:divide-gray-800">
                    {Object.entries(grouped).map(([subject, actions]) => (
                        <div
                            key={subject}
                            className="flex items-center py-3 px-1 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                        >
                            <div className="w-56 font-medium text-gray-900 dark:text-white whitespace-nowrap">
                                {subject.charAt(0).toUpperCase() +
                                    subject.slice(1)}
                            </div>
                            <div className="flex flex-wrap gap-4 ml-4">
                                {Object.entries(actions).map(
                                    ([action, perm]) => (
                                        <label
                                            key={action}
                                            className="flex items-center gap-1 text-gray-700 dark:text-gray-200 font-normal cursor-pointer select-none"
                                        >
                                            <input
                                                type="checkbox"
                                                checked={selected.has(perm.id)}
                                                onChange={() =>
                                                    handleChange(perm.id)
                                                }
                                                disabled={
                                                    updatePermissions.isPending
                                                }
                                                className="form-checkbox h-4 w-4 text-primary accent-primary focus:ring-primary"
                                            />
                                            <span className="text-sm">
                                                {ACTIONS.find(
                                                    (a) => a.key === action
                                                )?.label ||
                                                    action
                                                        .charAt(0)
                                                        .toUpperCase() +
                                                        action.slice(1)}
                                            </span>
                                        </label>
                                    )
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </form>
        </GenericSidebar>
    );
};

export default RolePermissionsSidebar;
