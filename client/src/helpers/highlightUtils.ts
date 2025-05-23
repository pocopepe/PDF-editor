import type { IHighlight } from './types';

const HIGHLIGHT_STORAGE_PREFIX = 'pdfHighlights_';

export const generateId = (): string => Math.random().toString(36).substring(7);

export const loadHighlightsFromFile = (fileName: string): IHighlight[] => {
    const storedHighlights = localStorage.getItem(`${HIGHLIGHT_STORAGE_PREFIX}${fileName}`);
    return storedHighlights ? JSON.parse(storedHighlights) : [];
};

export const saveHighlightsToFile = (fileName: string, highlights: IHighlight[]): void => {
    if (highlights.length === 0) {
        localStorage.removeItem(`${HIGHLIGHT_STORAGE_PREFIX}${fileName}`);
    } else {
        localStorage.setItem(`${HIGHLIGHT_STORAGE_PREFIX}${fileName}`, JSON.stringify(highlights));
    }
};
