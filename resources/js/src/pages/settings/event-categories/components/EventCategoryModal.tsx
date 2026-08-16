import React from "react";
import GenericModal from "../../../../components/GenericModal";
import { IEventCategory } from "../../../../types";
import EventCategoryForm from "./EventCategoryForm";

interface Props {
    isOpen: boolean;
    setIsOpen: (v: boolean) => void;
    categoryToEdit?: IEventCategory | null;
}

const EventCategoryModal: React.FC<Props> = ({ isOpen, setIsOpen, categoryToEdit }) => (
    <GenericModal
        isOpen={isOpen}
        setIsOpen={setIsOpen}
        title={categoryToEdit ? "Edit Category" : "New Category"}
    >
        <EventCategoryForm
            categoryToEdit={categoryToEdit}
            onClose={() => setIsOpen(false)}
        />
    </GenericModal>
);

export default EventCategoryModal;
