import React, { useState } from "react";
import GenericModal from "../../../components/GenericModal";

interface Props {
    open: boolean;
    onClose: () => void;
    onSubmit: (values: { event_id: number; requested_amount: number }) => void;
    loading?: boolean;
}

const PayoutRequestModal: React.FC<Props> = ({ open, onClose, onSubmit, loading }) => {
    const [eventId, setEventId] = useState("");
    const [amount, setAmount] = useState("");

    return (
        <GenericModal isOpen={open} setIsOpen={(v) => !v && onClose()} title="New payout request">
            <form
                className="space-y-4"
                onSubmit={(e) => {
                    e.preventDefault();
                    onSubmit({
                        event_id: Number(eventId),
                        requested_amount: Number(amount),
                    });
                }}
            >
                <div>
                    <label className="mb-1 block text-xs font-medium text-gray-500">Event ID</label>
                    <input
                        type="number"
                        className="form-input"
                        required
                        min={1}
                        value={eventId}
                        onChange={(e) => setEventId(e.target.value)}
                    />
                </div>
                <div>
                    <label className="mb-1 block text-xs font-medium text-gray-500">
                        Requested amount
                    </label>
                    <input
                        type="number"
                        step="0.01"
                        min="0.01"
                        className="form-input"
                        required
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                    />
                </div>
                <p className="text-xs text-gray-500">
                    Per-event payout. Cannot exceed outstanding (collected − reserved/paid-out).
                    Commission rate is snapshotted at create time.
                </p>
                <div className="flex justify-end gap-2">
                    <button type="button" className="btn" onClick={onClose}>
                        Cancel
                    </button>
                    <button type="submit" className="btn btn-primary" disabled={loading}>
                        Create
                    </button>
                </div>
            </form>
        </GenericModal>
    );
};

export default PayoutRequestModal;
