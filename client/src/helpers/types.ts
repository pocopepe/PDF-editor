// src/helpers/types.ts
import type { IHighlight as RphHighlight, NewHighlight as RphNewHighlight } from 'react-pdf-highlighter';

export const PSEUDO_DIR_UP_KIND = 'pseudo-directory-up' as const;

export type GoUpEntry = { kind: typeof PSEUDO_DIR_UP_KIND; name: string };
export type DirectoryItem = FileSystemHandle | GoUpEntry;

export type IHighlight = RphHighlight;
export type NewHighlight = RphNewHighlight;

export interface FileExif {
    fileName: string;
    fileType: string;
}
