import React from "react";
import { IUser } from "../../../types";
import UserForm from "./UserForm";
import GenericModal from "../../../components/GenericModal";

interface UserModalProps {
    isOpen: boolean;
    setIsOpen: (isOpen: boolean) => void;
    userToEdit?: IUser | null;
    userType: string;
}

// ---------------------- Component ----------------------
const UserModal: React.FC<UserModalProps> = ({
    isOpen,
    setIsOpen,
    userToEdit,
    userType,
}) => {
    const isEditMode = Boolean(userToEdit);

    return (
        <GenericModal
            isOpen={isOpen}
            setIsOpen={setIsOpen}
            title={isEditMode ? "Edit User" : "New User"}
            maxWidth="xl"
        >
            <UserForm
                userToEdit={userToEdit}
                onClose={() => setIsOpen(false)}
                userType={userType}
            />
        </GenericModal>
    );
};

export default UserModal;
