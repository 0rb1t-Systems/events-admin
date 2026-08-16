import React from "react";
import GenericModal from "../../../components/GenericModal";
import { IOrganizer } from "../../../types";
import OrganizerForm from "./OrganizerForm";

interface OrganizerModalProps {
    isOpen: boolean;
    setIsOpen: (isOpen: boolean) => void;
    organizer: IOrganizer | null;
}

const OrganizerModal: React.FC<OrganizerModalProps> = ({
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
            <OrganizerForm
                organizer={organizer}
                onClose={() => setIsOpen(false)}
            />
        </GenericModal>
    );
};

export default OrganizerModal;
