import { atom } from 'recoil';
import type { DirectoryItem, IHighlight, FileExif } from '../helpers/types';




export const fileExifAtom = atom<FileExif | null>({
  key: 'fileExifAtom',
  default: null,
});

export const directoryContentsAtom = atom<DirectoryItem[] | null>({
    key: 'directoryContentsAtom',
    default: null
});


export const currentDirectoryHandleAtom = atom<FileSystemDirectoryHandle | null>({
    key: 'currentDirectoryHandleAtom',
    default: null,
});

export const directoryHistoryAtom = atom<FileSystemDirectoryHandle[]>({
    key: 'directoryHistoryAtom',
    default: [], 
});

export const pdfFileAtom = atom<File | null>({
    key: 'pdfFileAtom',
    default: null,
});

export const pdfFileUrlAtom = atom<string>({
    key: 'pdfFileUrlAtom',
    default: '', 
});

export const highlightsAtom = atom<IHighlight[]>({
    key: 'highlightsAtom',
    default: [],
});

export const scrollToHighlightAtom = atom<IHighlight | null>({
    key: 'scrollToHighlightAtom',
    default: null,
});

export const sidebarWidthAtom = atom<number>({
    key: 'sidebarWidthAtom',
    default: window.innerWidth / 3, 
});

