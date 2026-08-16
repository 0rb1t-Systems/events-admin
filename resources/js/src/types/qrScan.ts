import { ITimestamped } from "./common";

export type QrScanResult = "valid" | "already_used" | "invalid";

export interface IQrScanLog extends ITimestamped {
    id: number;
    scanned_token: string;
    participation_id?: number | null;
    event_id?: number | null;
    result: QrScanResult | string;
    gate?: string | null;
    scanner_user_id?: number | null;
    scanner_organizer_id?: number | null;
    meta?: Record<string, unknown> | null;
    participation?: {
        id: number;
        status: string;
        user?: { id: number; name: string; email: string } | null;
    } | null;
    event?: { id: number; title: string } | null;
    scanner_user?: { id: number; name: string; email: string } | null;
}

export interface ICheckInStats {
    event_id: number;
    registered: number;
    arrived: number;
    absent: number;
    waitlisted: number;
    scan_attempts: number;
    valid_scans: number;
    already_used_scans: number;
    invalid_scans: number;
}
