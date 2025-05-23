import React from 'react';
import type { FileExif } from '../helpers/types';

interface AppHeaderProps {
    fileExif: FileExif | null;
    onOpenFile: () => void;
    onOpenFolder: () => void;
}

export const AppHeader: React.FC<AppHeaderProps> = ({onOpenFile, onOpenFolder }) => {
    return (
        <header className="p-3 bg-zinc-950 border-b border-zinc-800 shadow-md">
            <div className="flex items-center justify-between">
                <h1 className="text-xl font-semibold text-blue-400">PDF Highlighter Explorer</h1> 
                <div className="space-x-2">
                    <button
                        onClick={onOpenFile}
                        className="px-4 py-2 bg-zinc-700 hover:bg-zinc-600 text-white rounded-md text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-zinc-500 focus:ring-opacity-50" // Darker grey buttons with subtle hover
                    >
                        Open File
                    </button>
                    <button
                        onClick={onOpenFolder}
                        className="px-4 py-2 bg-zinc-700 hover:bg-zinc-600 text-white rounded-md text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-zinc-500 focus:ring-opacity-50" // Darker grey buttons with subtle hover
                    >
                        Open Folder
                    </button>
                </div>
            </div>
        </header>
    );
};
