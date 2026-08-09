/**
 * Image utility functions for handling profile images and other image URLs
 */

/**
 * Gets the current system base URL
 * @returns The current system base URL
 */
const getBaseUrl = (): string => {
    return window.location.origin;
};

/**
 * Formats a profile image URL by prepending the current system URL
 * @param imagePath - The image path from the database
 * @returns Complete image URL with system base URL
 */
export const getImageUrl = (imagePath: string | null | undefined): string => {
    if (!imagePath) {
        return `${getBaseUrl()}/assets/images/auth/user.png`;
    }

    // If the path already starts with http/https, return as is
    if (imagePath.startsWith("http://") || imagePath.startsWith("https://")) {
        return imagePath;
    }

    // Remove leading slash if present to avoid double slashes
    const cleanPath = imagePath.startsWith("/")
        ? imagePath.slice(1)
        : imagePath;

    return `${getBaseUrl()}/${cleanPath}`;
};

/**
 * Checks if an image URL is valid and accessible
 * @param url - The image URL to check
 * @returns Promise that resolves to true if image is accessible
 */
export const isImageAccessible = async (url: string): Promise<boolean> => {
    try {
        const response = await fetch(url, { method: "HEAD" });
        return response.ok;
    } catch {
        return false;
    }
};

/**
 * Gets a profile image URL with validation and fallback
 * @param imagePath - The image path from the database
 * @param fallbackPath - Optional fallback image path
 * @returns Promise that resolves to the best available image URL
 */
export const getValidatedProfileImageUrl = async (
    imagePath: string | null | undefined,
    fallbackPath: string = "/assets/images/auth/user.png"
): Promise<string> => {
    if (!imagePath) {
        return fallbackPath;
    }

    const formattedUrl = getImageUrl(imagePath);

    // Check if the image is accessible
    const isAccessible = await isImageAccessible(formattedUrl);

    return isAccessible ? formattedUrl : fallbackPath;
};
