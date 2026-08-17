async function sha256Hex(input: string): Promise<string> {
    const data = new TextEncoder().encode(input);
    const hash = await crypto.subtle.digest("SHA-256", data);

    return Array.from(new Uint8Array(hash))
        .map((byte) => byte.toString(16).padStart(2, "0"))
        .join("");
}

async function hmacSha256Hex(payload: string, secret: string): Promise<string> {
    const key = await crypto.subtle.importKey(
        "raw",
        new TextEncoder().encode(secret),
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["sign"]
    );
    const signature = await crypto.subtle.sign(
        "HMAC",
        key,
        new TextEncoder().encode(payload)
    );

    return Array.from(new Uint8Array(signature))
        .map((byte) => byte.toString(16).padStart(2, "0"))
        .join("");
}

export function resolveApiRequestPath(baseURL: string | undefined, url: string | undefined): string {
    const base = (baseURL ?? "").replace(/\/$/, "");
    const relative = url ?? "";

    if (relative.startsWith("http://") || relative.startsWith("https://")) {
        return new URL(relative).pathname;
    }

    const path = `${base}${relative.startsWith("/") ? relative : `/${relative}`}`;

    return path || "/";
}

export function resolveApiRequestBody(data: unknown): string {
    if (data === undefined || data === null) {
        return "";
    }

    if (typeof data === "string") {
        return data;
    }

    if (data instanceof FormData || data instanceof URLSearchParams || data instanceof Blob) {
        return "";
    }

    return JSON.stringify(data);
}

export async function buildApiClientHeaders(
    method: string,
    path: string,
    body: string,
    publicKey: string,
    secret: string,
    timestamp = Math.floor(Date.now() / 1000)
): Promise<Record<string, string>> {
    const bodyHash = await sha256Hex(body);
    const payload = `${method.toUpperCase()}:${path}:${timestamp}:${bodyHash}`;
    const signature = await hmacSha256Hex(payload, secret);

    return {
        "X-API-Key": publicKey,
        "X-API-Timestamp": String(timestamp),
        "X-API-Signature": signature,
    };
}
