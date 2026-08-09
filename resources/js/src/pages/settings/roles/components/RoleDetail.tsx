import { useQuery } from "@tanstack/react-query";
import React from "react";
import moment from "moment";
import { roleApi } from "../../../../services/role";
import { IRole } from "../../../../types";
import Loader from "../../../../components/Loader";

interface RoleDetailProps {
    roleId?: number | null;
}

const RoleDetail: React.FC<RoleDetailProps> = ({ roleId }) => {
    const {
        data: role,
        isLoading,
        error,
    } = useQuery<IRole>({
        queryKey: ["role", roleId],
        queryFn: () => roleApi.getById(roleId!),
        enabled: !!roleId,
    });

    if (!roleId) {
        return (
            <div className="p-6 text-center text-gray-500">
                Select a role to view details
            </div>
        );
    }

    if (isLoading) {
        return (
            <div className="p-6">
                <Loader />
            </div>
        );
    }

    if (error || !role) {
        return (
            <div className="p-6 text-center text-red-500">
                Failed to load role details
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6">
            {/* Basic Information */}
            <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    Role Information
                </h3>
                <div className="space-y-3">
                    <div>
                        <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                            Name
                        </label>
                        <p className="text-sm text-gray-900 dark:text-white">
                            {role.name}
                        </p>
                    </div>
                    <div>
                        <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                            Guard Name
                        </label>
                        <p className="text-sm text-gray-900 dark:text-white">
                            {role.guard_name}
                        </p>
                    </div>
                    <div>
                        <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                            Created At
                        </label>
                        <p className="text-sm text-gray-900 dark:text-white">
                            {role.created_at
                                ? moment(role.created_at).format(
                                      "MMM DD, YYYY HH:mm"
                                  )
                                : "-"}
                        </p>
                    </div>
                    <div>
                        <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                            Updated At
                        </label>
                        <p className="text-sm text-gray-900 dark:text-white">
                            {role.updated_at
                                ? moment(role.updated_at).format(
                                      "MMM DD, YYYY HH:mm"
                                  )
                                : "-"}
                        </p>
                    </div>
                </div>
            </div>

            {/* Permissions */}
            {role.permissions && role.permissions.length > 0 && (
                <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                        Permissions ({role.permissions.length})
                    </h3>
                </div>
            )}

            {(!role.permissions || role.permissions.length === 0) && (
                <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                        Permissions
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        No permissions assigned to this role.
                    </p>
                </div>
            )}
        </div>
    );
};

export default RoleDetail;
