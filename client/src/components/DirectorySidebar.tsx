import React from 'react';
import type { DirectoryItem, IHighlight } from '../helpers/types';
import { PSEUDO_DIR_UP_KIND } from '../helpers/types';

interface DirectorySidebarProps {
    currentDirectoryName: string | null;
    directoryContents: DirectoryItem[] | null;
    highlights: IHighlight[];
    pdfFileIsLoaded: boolean;
    onDirectoryEntryClick: (entry: DirectoryItem) => void;
    onHighlightClick: (highlight: IHighlight) => void;
    className?: string; // Still useful for other static classes
    style?: React.CSSProperties; // Add style prop for dynamic width
}

export const DirectorySidebar: React.FC<DirectorySidebarProps> = ({
    currentDirectoryName,
    directoryContents,
    onDirectoryEntryClick,

    className, // Destructure className
    style, // Destructure style
}) => {
    return (
  <aside
    className={`${className || ''} bg-stone-400 border-r border-stone-600 p-3 overflow-y-auto shadow-inner`}
    style={style}
  >
    {currentDirectoryName ? (
      <h3 className="text-md font-semibold text-amber-700 mb-2 sticky top-0 bg-stone-400 py-1 z-10">
        {currentDirectoryName}
      </h3>
    ) : (
      <p className="text-stone-600 text-sm">No folder selected.</p>
    )}

    {/* Directory listing */}
    {directoryContents && currentDirectoryName && (
      <ul className="space-y-1 mb-4">
        {directoryContents.map((entry) => (
          <li key={entry.name + entry.kind}>
            <button
              onClick={() => onDirectoryEntryClick(entry)}
              title={entry.name}
              className="w-full text-left px-2 py-1.5 text-sm text-stone-800 hover:bg-amber-300 hover:text-amber-800 rounded-md transition-colors focus:outline-none focus:bg-amber-300 flex items-center"
            >
              <span className="mr-2">
                {entry.kind === PSEUDO_DIR_UP_KIND
                  ? '⬆️'
                  : entry.kind === 'directory'
                  ? '📁'
                  : '📄'}
              </span>
              <span className="truncate">{entry.name}</span>
            </button>
          </li>
        ))}
      </ul>
    )}
  </aside>
);

};
