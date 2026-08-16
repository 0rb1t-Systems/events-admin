import React from "react";
import GenericModal from "../../../../components/GenericModal";
import PackageForm from "./PackageForm";
import { IPackage } from "../../../../types";

interface PackageModalProps {
    isOpen: boolean;
    setIsOpen: (isOpen: boolean) => void;
    packageToEdit?: IPackage | null;
}

const PackageModal: React.FC<PackageModalProps> = ({
    isOpen,
    setIsOpen,
    packageToEdit,
}) => {
    const isEditMode = Boolean(packageToEdit);

    return (
        <GenericModal
            isOpen={isOpen}
            setIsOpen={setIsOpen}
            title={isEditMode ? "Edit Package" : "New Package"}
        >
            <PackageForm
                packageToEdit={packageToEdit}
                onClose={() => setIsOpen(false)}
            />
        </GenericModal>
    );
};

export default PackageModal;
