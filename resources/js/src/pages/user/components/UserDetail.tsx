import { useQuery } from "@tanstack/react-query";
import React from "react";
import { userApi } from "../../../services/user";
import { IUser } from "../../../types";

interface UserDetailProps {
    userId: number | null;
}

const UserDetail: React.FC<UserDetailProps> = ({
    userId,
}) => {
    const { data: user, isLoading } = useQuery({
        queryKey: ["user", userId],
        queryFn: () => userId ? userApi.getById(userId) : null,
        enabled: !!userId,
    });

    if (isLoading) {
        return null;
    }

    if (!user) {
        return (
            <div className="flex items-center justify-center h-full">
                <p className="text-gray-500">No user selected</p>
            </div>
        );
    }

    return (
        <div className="space-y-6 transition-all duration-300 ease-in-out">
            <div>
                <h3 className="text-2xl font-bold mb-1">{user.name}</h3>
                <p className="text-gray-600 dark:text-gray-300 mt-2">
                    {user.email}
                </p>
            </div>

            <div className="transition-all duration-200 ease-in-out hover:bg-gray-50 dark:hover:bg-gray-800 p-2 -mx-2 rounded-md">
                <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase mb-2">
                    Created At
                </h4>
                <p className="text-gray-700 dark:text-gray-300">
                    {user.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}
                </p>
            </div>

            <div className="transition-all duration-200 ease-in-out hover:bg-gray-50 dark:hover:bg-gray-800 p-2 -mx-2 rounded-md">
                <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase mb-2">
                    Updated At
                </h4>
                <p className="text-gray-700 dark:text-gray-300">
                    {user.updated_at ? new Date(user.updated_at).toLocaleDateString() : 'N/A'}
                </p>
            </div>

            <div className="border-t pt-4 mt-6">
                <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase mb-2">
                    ID
                </h4>
                <p className="text-gray-700 dark:text-gray-300">
                    {user.id}
                </p>
            </div>
        </div>
    );
};

export default UserDetail;
