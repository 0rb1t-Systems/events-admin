import React from "react";
import { BulkCreateFormProps } from "./types";
import BulkCreateFormContent from "./BulkCreateFormContent";
import GenericModal from "../GenericModal";

const BulkCreateForm = <T extends Record<string, any>>(
    props: BulkCreateFormProps<T>
) => {
    const { onClose, isOpen, title, maxWidth = "full" } = props;

    return (
        <GenericModal
            isOpen={isOpen}
            setIsOpen={() => onClose()}
            title={title}
            maxWidth={maxWidth}
        >
            <BulkCreateFormContent {...props} />
        </GenericModal>
    );
};

export default BulkCreateForm;
