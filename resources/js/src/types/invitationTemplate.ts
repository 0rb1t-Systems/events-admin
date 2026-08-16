export interface IOverlayPosition {
    x?: number;
    y?: number;
    width?: number;
    height?: number;
    font_size?: number;
    font_color?: string;
}

export type OverlayPositionsMap = Record<string, IOverlayPosition>;

export interface IInvitationCustomizations {
    primary_color?: string;
    secondary_color?: string;
    font_family?: string;
    header_text?: string;
    logo_path?: string;
}

export interface IInvitationSystemTemplate {
    id: number;
    name: string;
    slug: string;
    thumbnail_path?: string | null;
    background_image_path: string;
    default_overlay_positions?: OverlayPositionsMap | null;
    default_customizations?: IInvitationCustomizations | null;
    active: boolean;
    created_at?: string;
    updated_at?: string;
    deleted_at?: string | null;
}

export type InvitationMode = "template" | "custom" | null;

export interface IEventInvitationTemplate {
    id: number;
    event_id: number;
    mode?: InvitationMode | string | null;
    system_template_id?: number | null;
    background_image_path?: string | null;
    config?: Record<string, unknown> | null;
    overlay_positions?: OverlayPositionsMap | null;
    customizations?: IInvitationCustomizations | null;
    system_template?: IInvitationSystemTemplate | null;
    created_at?: string;
    updated_at?: string;
}
