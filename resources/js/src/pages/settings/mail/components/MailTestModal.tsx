import React from "react";
import GenericModal from "../../../../components/GenericModal";
import FormInput from "../../../../components/form/FormInput";
import ActionButton from "../../../../components/ActionButton";

interface MailTestModalProps {
    isOpen: boolean;
    setIsOpen: (open: boolean) => void;
    testEmail: string;
    setTestEmail: (email: string) => void;
    testLoading: boolean;
    onSend: () => void;
}

const MailTestModal: React.FC<MailTestModalProps> = ({
    isOpen,
    setIsOpen,
    testEmail,
    setTestEmail,
    testLoading,
    onSend,
}) => (
    <GenericModal
        isOpen={isOpen}
        setIsOpen={setIsOpen}
        title="Send Test Email"
        maxWidth="sm"
    >
        <div className="space-y-4">
            <FormInput
                id="test_email"
                label="Test Email Address"
                value={testEmail}
                onChange={setTestEmail}
                onBlur={() => {}}
                error={""}
                disabled={testLoading}
            />
            <div className="flex justify-end gap-2">
                <ActionButton
                    type="button"
                    variant="outline-danger"
                    displayText="Cancel"
                    onClick={() => setIsOpen(false)}
                    disabled={testLoading}
                />
                <ActionButton
                    type="button"
                    variant="primary"
                    isLoading={testLoading}
                    displayText="Send"
                    onClick={onSend}
                    disabled={!testEmail || testLoading}
                />
            </div>
        </div>
    </GenericModal>
);

export default MailTestModal;
