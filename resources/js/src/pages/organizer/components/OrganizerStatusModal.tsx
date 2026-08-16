import React from "react";
import GenericModal from "../../../components/GenericModal";
import { IOrganizer } from "../../../types";
import OrganizerStatusForm from "./OrganizerStatusForm";

interface OrganizerStatusModalProps {
    isOpen: boolean;
    setIsOpen: (isOpen: boolean) => void;
    organizer: IOrganizer | null;
}

const OrganizerStatusModal: React.FC<OrganizerStatusModalProps> = ({
    isOpen,
    setIsOpen,
    organizer,
}) => {
    if (!organizer) {
        return null;
    }

    return (
        <GenericModal
            isOpen={isOpen}
            setIsOpen={setIsOpen}
            title="Change organizer status"
            maxWidth="md"
        >
            <OrganizerStatusForm
                organizer={organizer}
                onClose={() => setIsOpen(false)}
            />
        </GenericModal>
    );
};

export default OrganizerStatusModal;
