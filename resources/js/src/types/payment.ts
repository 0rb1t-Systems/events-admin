import { ITimestamped } from "./common";

export type PaymentStatus = "pending" | "completed" | "refunded" | "failed";
export type PayoutRequestStatus = "requested" | "approved" | "paid" | "rejected";

export interface IPayment extends ITimestamped {
    id: number;
    participation_id: number;
    ticket_type_id?: number | null;
    amount: number | string;
    currency: string;
    status: PaymentStatus | string;
    reference_id: string;
    waafi_transaction_id?: string | null;
    payer_phone?: string | null;
    failure_reason?: string | null;
}

export interface IPayoutRequest extends ITimestamped {
    id: number;
    organizer_id: number;
    event_id: number;
    requested_amount: number | string;
    status: PayoutRequestStatus | string;
    commission_rate: number | string;
    commission_amount?: number | string | null;
    net_amount?: number | string | null;
    admin_notes?: string | null;
    paid_at?: string | null;
    organizer?: { id: number; business_name?: string } | null;
    event?: { id: number; title: string } | null;
    reviewer?: { id: number; name: string } | null;
}

export interface IEventFinance {
    event_id: number;
    currency: string;
    total_collected: number;
    total_paid_out: number;
    total_reserved: number;
    outstanding_balance: number;
}
