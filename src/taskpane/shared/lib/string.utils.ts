// src/taskpane/shared/lib/string.utils.ts

/**
 * A helper function to truncate a string to a maximum length without splitting words.
 * If the string is truncated, it appends an ellipsis.
 * @param text The string to truncate.
 * @param maxLength The maximum character length.
 * @returns The truncated string.
 */
export const truncateComment = (text: string | undefined, maxLength: number): string => {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    
    // Substring to the max length to avoid searching the whole string
    const truncated = text.substring(0, maxLength);
    const lastSpaceIndex = truncated.lastIndexOf(' ');
    
    // If a space was found, truncate there to avoid cutting a word. Otherwise, use the hard limit.
    const finalTruncated = lastSpaceIndex > 0 ? truncated.substring(0, lastSpaceIndex) : truncated;

    return finalTruncated + '...';
};