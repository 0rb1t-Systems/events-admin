import { useQuery } from "@tanstack/react-query";
import moment from "moment";
import React from "react";
import Loader from "../../../components/Loader";
import { userApi } from "../../../services/user";

interface UserDetailProps {
    userId: number | null;
}

const Field = ({
    label,
    children,
}: {
    label: string;
    children: React.ReactNode;
}) => (
    <div>
        <label className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
            {label}
        </label>
        <div className="mt-0.5 text-sm text-gray-900 dark:text-white">
            {children}
        </div>
    </div>
);

const UserDetail: React.FC<UserDetailProps> = ({ userId }) => {
    const { data: user, isLoading, error } = useQuery({
        queryKey: ["user", userId],
        queryFn: () => userApi.getById(userId!),
        enabled: !!userId,
    });

    if (!userId) {
        return (
            <div className="p-4 text-center text-sm text-gray-500 dark:text-gray-400">
                Select a user to view details
            </div>
        );
    }

    if (isLoading) {
        return (
            <div className="p-4">
                <Loader />
            </div>
        );
    }

    if (error || !user) {
        return (
            <div className="p-4 text-center text-sm text-red-500">
                Failed to load user details
            </div>
        );
    }

    const typeLabel = user.user_type === "admin" ? "Admin" : "Participant";
    const roleNames =
        user.roles?.map((role) => role.name).filter(Boolean).join(", ") || "—";

    return (
        <div className="space-y-4 p-1">
            <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {user.name}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                    {user.email}
                </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
                <Field label="User type (read-only)">
                    <span
                        className={`inline-flex rounded px-2 py-0.5 text-xs font-medium ${
                            user.user_type === "admin"
                                ? "bg-primary/10 text-primary"
                                : "bg-secondary/10 text-secondary"
                        }`}
                    >
                        {typeLabel}
                    </span>
                </Field>
                <Field label="Status">
                    <span className="capitalize">{user.status || "—"}</span>
                </Field>
                <Field label="Phone">{user.phone || "—"}</Field>
                <Field label="Roles">{roleNames}</Field>
            </div>

            <Field label="Address">{user.address || "—"}</Field>

            <div className="grid grid-cols-2 gap-3 border-t border-gray-100 pt-3 dark:border-[#1b2e4b]">
                <Field label="Created">
                    {user.created_at
                        ? moment(user.created_at).format("MMM DD, YYYY HH:mm")
                        : "—"}
                </Field>
                <Field label="Updated">
                    {user.updated_at
                        ? moment(user.updated_at).format("MMM DD, YYYY HH:mm")
                        : "—"}
                </Field>
                <Field label="ID">{user.id}</Field>
                <Field label="Verified">
                    {user.email_verified_at
                        ? moment(user.email_verified_at).format("MMM DD, YYYY")
                        : "No"}
                </Field>
            </div>
        </div>
    );
};

export default UserDetail;
