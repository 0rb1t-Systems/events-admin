import React from "react";
import GenericModal from "../../../../components/GenericModal";
import { IInvitationSystemTemplate } from "../../../../types/invitationTemplate";
import InvitationSystemTemplateForm from "./InvitationSystemTemplateForm";

interface Props {
    isOpen: boolean;
    setIsOpen: (open: boolean) => void;
    templateToEdit?: IInvitationSystemTemplate | null;
}

const InvitationSystemTemplateModal: React.FC<Props> = ({
    isOpen,
    setIsOpen,
    templateToEdit,
}) => (
    <GenericModal
        isOpen={isOpen}
        setIsOpen={setIsOpen}
        title={templateToEdit ? "Edit invitation template" : "Add invitation template"}
        maxWidth="2xl"
    >
        <InvitationSystemTemplateForm
            templateToEdit={templateToEdit}
            onClose={() => setIsOpen(false)}
        />
    </GenericModal>
);

export default InvitationSystemTemplateModal;
