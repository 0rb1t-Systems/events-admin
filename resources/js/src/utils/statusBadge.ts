const COLOR_CLASS: Record<string, string> = {
    primary: "bg-primary/10 text-primary",
    secondary: "bg-info/10 text-info",
    success: "bg-success/10 text-success",
    danger: "bg-danger/10 text-danger",
    warning: "bg-warning/10 text-warning",
    info: "bg-info/10 text-info",
    dark: "bg-gray-800/10 text-gray-800 dark:bg-white/10 dark:text-gray-100",
};

/** Readable filled pills — never the theme `.badge` class (that forces white text). */
export function statusBadgeClass(color?: string): string {
    const tone = COLOR_CLASS[color || ""] || COLOR_CLASS.info;
    return `inline-flex items-center rounded px-2 py-0.5 text-xs font-semibold ${tone}`;
}
