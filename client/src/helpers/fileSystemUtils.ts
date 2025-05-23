// src/helpers/fileSystemUtils.ts
import type { DirectoryItem, GoUpEntry } from './types';
import { PSEUDO_DIR_UP_KIND } from './types';

export const listDirectoryContents = async (
    dirHandle: FileSystemDirectoryHandle,
    currentPathLength: number
): Promise<DirectoryItem[]> => {
    const actualEntries: FileSystemHandle[] = [];
    // This line is correct and should work after installing the types
    for await (const entry of dirHandle.values()) {
        actualEntries.push(entry);
    }

    const itemsForState: DirectoryItem[] = [];
    if (currentPathLength > 1) {
        const goUpEntry: GoUpEntry = {
            kind: PSEUDO_DIR_UP_KIND,
            name: '../',
        };
        itemsForState.push(goUpEntry);
    }

    actualEntries.sort((a, b) => {
        if (a.kind === 'directory' && b.kind === 'file') return -1;
        if (a.kind === 'file' && b.kind === 'directory') return 1;
        return a.name.localeCompare(b.name);
    });

    itemsForState.push(...actualEntries);
    return itemsForState;
};
