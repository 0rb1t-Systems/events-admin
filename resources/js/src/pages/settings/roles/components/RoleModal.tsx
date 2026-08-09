import React from "react";
import GenericModal from "../../../../components/GenericModal";
import RoleForm from "./RoleForm";
import { IRole } from "../../../../types";

interface RoleModalProps {
    isOpen: boolean;
    setIsOpen: (isOpen: boolean) => void;
    roleToEdit?: IRole | null;
}

const RoleModal: React.FC<RoleModalProps> = ({
    isOpen,
    setIsOpen,
    roleToEdit,
}) => {
    const isEditMode = Boolean(roleToEdit);

    return (
        <GenericModal
            isOpen={isOpen}
            setIsOpen={setIsOpen}
            title={isEditMode ? "Edit Role" : "New Role"}
        >
            <RoleForm roleToEdit={roleToEdit} onClose={() => setIsOpen(false)} />
        </GenericModal>
    );
};

export default RoleModal;
