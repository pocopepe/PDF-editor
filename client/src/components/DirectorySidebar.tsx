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
  highlights,
  pdfFileIsLoaded,
    onDirectoryEntryClick,
  onHighlightClick,

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

    {pdfFileIsLoaded && (
      <div className="border-t border-stone-500 pt-3">
        <h4 className="text-sm font-semibold text-stone-800 mb-2">Highlights</h4>
        {highlights.length === 0 ? (
          <p className="text-xs text-stone-600">No highlights yet. Select text in the PDF to add one.</p>
        ) : (
          <ul className="space-y-1.5">
            {highlights.map((highlight) => (
              <li key={highlight.id}>
                <button
                  onClick={() => onHighlightClick(highlight)}
                  className="w-full text-left px-2 py-1.5 rounded-md bg-stone-300 hover:bg-amber-200 text-xs text-stone-800 transition-colors"
                  title={highlight.content.text || 'Area highlight'}
                >
                  <span className="line-clamp-2">
                    {highlight.content.text || 'Area highlight'}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    )}
  </aside>
);

};
