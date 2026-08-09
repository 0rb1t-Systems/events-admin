import React, { useEffect, useState } from "react";
import { useModal } from "../contexts/ModalContext";
import UserModal from "../pages/user/components/UserModal";
import RoleModal from "../pages/settings/roles/components/RoleModal";
import { IUser, IRole } from "../types";

const GlobalModalManager: React.FC = () => {
    const { currentModal, isModalOpen, closeModal } = useModal();
    const [roleToEdit, setRoleToEdit] = useState<IRole | null>(null);

    const handleCloseModal = () => {
        // Reset all edit states
        setRoleToEdit(null);
        closeModal();
    };

    const renderModal = () => {
        switch (currentModal) {
            case "user":
                return (
                    <UserModal
                        isOpen={isModalOpen}
                        setIsOpen={handleCloseModal}
                        userToEdit={null}
                        userType="user"
                    />
                );
            case "admin":
                return (
                    <UserModal
                        isOpen={isModalOpen}
                        setIsOpen={handleCloseModal}
                        userToEdit={null}
                        userType="admin"
                    />
                );
            case "role":
                return (
                    <RoleModal
                        isOpen={isModalOpen}
                        setIsOpen={handleCloseModal}
                        roleToEdit={roleToEdit}
                    />
                );
            default:
                return null;
        }
    };

    return renderModal();
};

export default GlobalModalManager;
