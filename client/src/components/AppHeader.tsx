import React from 'react';
import type { FileExif } from '../helpers/types';

interface AppHeaderProps {
    fileExif: FileExif | null;
    onOpenFile: () => void;
    onOpenFolder: () => void;
}

export const AppHeader: React.FC<AppHeaderProps> = ({ onOpenFile, onOpenFolder }) => {
    return (
        <header className="p-3 bg-stone-300 border-b border-stone-400 shadow-md">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth="1.5"
                        stroke="white"
                        className="h-6 w-6 bg-stone-800 p-1 rounded"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10"
                        />
                    </svg>
                    <h1 className="text-xl font-semibold text-stone-900">Dotmark</h1>
                </div>

                <div className="space-x-2">
                    <button
                        onClick={onOpenFile}
                        className="px-4 py-2 bg-stone-800 hover:bg-stone-700 text-white rounded-md text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-stone-500 focus:ring-opacity-50"
                    >
                        Open File
                    </button>
                    <button
                        onClick={onOpenFolder}
                        className="px-4 py-2 bg-stone-800 hover:bg-stone-700 text-white rounded-md text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-stone-500 focus:ring-opacity-50"
                    >
                        Open Folder
                    </button>
                </div>
            </div>
        </header>
    );
};
