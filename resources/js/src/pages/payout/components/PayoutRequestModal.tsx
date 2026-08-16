import React, { useState } from "react";
import GenericModal from "../../../components/GenericModal";
import FormCombobox from "../../../components/form/FormCombobox";
import {
    formatEventOption,
    useEventSearch,
} from "../../../hooks/useEntitySearch";
import { IEvent } from "../../../types/event";

interface Props {
    open: boolean;
    onClose: () => void;
    onSubmit: (values: { event_id: number; requested_amount: number }) => void;
    loading?: boolean;
}

const PayoutRequestModal: React.FC<Props> = ({
    open,
    onClose,
    onSubmit,
    loading,
}) => {
    const [selectedEvent, setSelectedEvent] = useState<IEvent | null>(null);
    const [amount, setAmount] = useState("");
    const eventSearch = useEventSearch();

    return (
        <GenericModal
            isOpen={open}
            setIsOpen={(v) => !v && onClose()}
            title="New payout request"
        >
            <form
                className="space-y-4"
                onSubmit={(e) => {
                    e.preventDefault();
                    if (!selectedEvent) return;
                    onSubmit({
                        event_id: selectedEvent.id,
                        requested_amount: Number(amount),
                    });
                }}
            >
                <FormCombobox<IEvent>
                    id="payout_event"
                    label="Event"
                    value={selectedEvent}
                    onChange={setSelectedEvent}
                    onSearch={eventSearch.setQuery}
                    options={eventSearch.options}
                    displayValue={formatEventOption}
                    loading={eventSearch.loading}
                    placeholder="Search events by title…"
                />
                <div>
                    <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">
                        Requested amount (USD)
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
                <p className="text-xs text-gray-500 dark:text-gray-400">
                    Per-event payout. Cannot exceed outstanding (collected −
                    reserved/paid-out). Commission rate is snapshotted at create
                    time.
                </p>
                <div className="flex justify-end gap-2">
                    <button type="button" className="btn" onClick={onClose}>
                        Cancel
                    </button>
                    <button
                        type="submit"
                        className="btn btn-primary"
                        disabled={loading || !selectedEvent}
                    >
                        Create
                    </button>
                </div>
            </form>
        </GenericModal>
    );
};

export default PayoutRequestModal;
