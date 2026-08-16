import React from "react";
import GenericModal from "../../../components/GenericModal";
import { IEvent } from "../../../types";
import EventForm from "./EventForm";

interface Props {
    isOpen: boolean;
    setIsOpen: (v: boolean) => void;
    eventToEdit: IEvent | null;
}

const EventModal: React.FC<Props> = ({ isOpen, setIsOpen, eventToEdit }) => {
    if (!eventToEdit) return null;

    return (
        <GenericModal isOpen={isOpen} setIsOpen={setIsOpen} title="Moderate Event">
            <EventForm eventToEdit={eventToEdit} onClose={() => setIsOpen(false)} />
        </GenericModal>
    );
};

export default EventModal;
