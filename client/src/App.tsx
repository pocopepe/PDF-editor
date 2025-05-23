import { useState, useEffect, useCallback, useRef } from 'react';
import { pdfjs } from 'react-pdf'; 
import { AppHeader } from './components/AppHeader';
import { DirectorySidebar } from './components/DirectorySidebar';
import { PdfDisplay } from './components/PdfDisplay';
import { listDirectoryContents } from './helpers/fileSystemUtils';
import { loadHighlightsFromFile, saveHighlightsToFile, generateId } from './helpers/highlightUtils';
import type { DirectoryItem, IHighlight, NewHighlight, FileExif } from './helpers/types';

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url,
).toString();

function App() {
    const [fileExif, setFileExif] = useState<FileExif | null>(null);
    // Removed error state
    // const [error, setError] = useState<string | null>(null);

    const [directoryContents, setDirectoryContents] = useState<DirectoryItem[] | null>(null);
    const [currentDirectoryHandle, setCurrentDirectoryHandle] = useState<FileSystemDirectoryHandle | null>(null);
    const [directoryHistory, setDirectoryHistory] = useState<FileSystemDirectoryHandle[]>([]);

    const [pdfFile, setPdfFile] = useState<File | null>(null);
    const [pdfFileUrl, setPdfFileUrl] = useState<string>('');
    const [highlights, setHighlights] = useState<IHighlight[]>([]);
    const [scrollToHighlight, setScrollToHighlight] = useState<IHighlight | null>(null);

    const [sidebarWidth, setSidebarWidth] = useState(window.innerWidth / 3);
    const isResizing = useRef(false);

    const resetAppStates = useCallback(() => {
        // Removed setError(null)
        setFileExif(null);
        setDirectoryContents(null); setCurrentDirectoryHandle(null); setDirectoryHistory([]);
        setPdfFile(null); setPdfFileUrl(''); setHighlights([]); setScrollToHighlight(null);
    }, []);

    useEffect(() => {
        if (pdfFile) {
            const url = URL.createObjectURL(pdfFile);
            setPdfFileUrl(url);
            setHighlights(loadHighlightsFromFile(pdfFile.name));
            return () => URL.revokeObjectURL(url);
        }
        setPdfFileUrl('');
    }, [pdfFile]);

    useEffect(() => {
        if (pdfFile?.name) {
            saveHighlightsToFile(pdfFile.name, highlights);
        }
    }, [highlights, pdfFile]);

    // --- Resizing Logic ---
    const handleMouseDown = () => {
        isResizing.current = true;
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
        document.body.style.userSelect = 'none';
        document.body.style.cursor = 'ew-resize';
    };

    const handleMouseMove = (e: MouseEvent) => {
        if (!isResizing.current) return;
        const minWidth = 200;
        const maxWidth = window.innerWidth * 0.75;
        let newWidth = e.clientX;
        if (newWidth < minWidth) newWidth = minWidth;
        else if (newWidth > maxWidth) newWidth = maxWidth;
        setSidebarWidth(newWidth);
    };

    const handleMouseUp = () => {
        isResizing.current = false;
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        document.body.style.userSelect = '';
        document.body.style.cursor = '';
    };
    // --- End Resizing Logic ---

    const updateDirectoryView = async (dirHandle: FileSystemDirectoryHandle, history: FileSystemDirectoryHandle[]) => {
        const contents = await listDirectoryContents(dirHandle, history.length);
        setDirectoryContents(contents);
        setCurrentDirectoryHandle(dirHandle);
        setDirectoryHistory(history);
        setFileExif({ fileName: dirHandle.name, fileType: 'directory' });
        // Removed setError(null);
    };

    const handleOpenFilePicker = async () => {
        resetAppStates();
        if (!('showOpenFilePicker' in window)) {
            // Removed setError and added console warning for unsupported API
            console.warn("File System Access API not supported.");
            return;
        }
        const [fileHandle] = await (window as any).showOpenFilePicker({
            types: [
                { description: 'PDF Files', accept: { 'application/pdf': ['.pdf'] } },
            ],
        });
        const file: File = await fileHandle.getFile();
        setFileExif({ fileName: file.name, fileType: file.type });
        if (file.type === 'application/pdf') {
            setPdfFile(file);
        } else {
            setPdfFile(null);
            // Removed setError and added console warning for unsupported file type
            console.warn(`Only PDF files are supported. Selected: ${file.name} (${file.type})`);
        }
    };

    const handleOpenDirectoryPicker = async () => {
        resetAppStates();
        if (!('showDirectoryPicker' in window)) {
            // Removed setError and added console warning for unsupported API
            console.warn("Directory Picker API not supported.");
            return;
        }
        const dirHandle: FileSystemDirectoryHandle = await (window as any).showDirectoryPicker();
        await updateDirectoryView(dirHandle, [dirHandle]);
    };

    const handleDirectoryEntryClick = async (entry: DirectoryItem) => {
        // Removed setError(null)
        setHighlights([]); setPdfFile(null); setScrollToHighlight(null);

        if (entry.kind === 'pseudo-directory-up') {
            if (directoryHistory.length > 1) {
                const newHistory = directoryHistory.slice(0, -1);
                await updateDirectoryView(newHistory[newHistory.length - 1], newHistory);
            }
        } else if (entry.kind === 'directory') {
            await updateDirectoryView(entry as FileSystemDirectoryHandle, [...directoryHistory, entry as FileSystemDirectoryHandle]);
        } else if (entry.kind === 'file') {
            const fileHandle = entry as FileSystemFileHandle;
            const file: File = await fileHandle.getFile();
            setFileExif({ fileName: file.name, fileType: file.type });
            if (file.type === 'application/pdf') {
                setPdfFile(file);
            } else {
                setPdfFile(null);
                // Removed setError and added console warning for unsupported file type
                console.warn(`Only PDF files are supported. Selected: ${file.name} (${file.type})`);
            }
        }
    };

    const addHighlightToList = (highlight: NewHighlight) => {
        setHighlights(prev => [{ ...highlight, id: generateId() }, ...prev]);
    };
    const removeHighlightFromList = (highlightId: string) => {
        setHighlights(prev => prev.filter(h => h.id !== highlightId));
    };
    const updateHighlightInList = (highlightId: string, contentUpdate: any) => {
        setHighlights(prev => prev.map(h =>
            h.id === highlightId
                ? { ...h, position: { ...h.position, ...contentUpdate }, content: { ...h.content, ...contentUpdate } } // Corrected positionUpdate to contentUpdate
                : h
        ));
    };
    const handleSidebarHighlightClick = (highlight: IHighlight) => {
        setScrollToHighlight(highlight);
        setTimeout(() => setScrollToHighlight(null), 100); 
    };

    return (
        <div className="flex flex-col h-screen bg-zinc-950 text-gray-50 font-sans">
            <AppHeader
                // Removed error prop
                fileExif={fileExif}
                onOpenFile={handleOpenFilePicker}
                onOpenFolder={handleOpenDirectoryPicker}
            />
            <div className="flex flex-row flex-1 overflow-hidden">
                <DirectorySidebar
                    className="h-full bg-zinc-900 p-4 overflow-y-auto border-r border-zinc-800 rounded-bl-lg"
                    style={{ width: sidebarWidth }}
                    currentDirectoryName={currentDirectoryHandle?.name || null}
                    directoryContents={directoryContents}
                    highlights={highlights}
                    pdfFileIsLoaded={!!pdfFileUrl}
                    onDirectoryEntryClick={handleDirectoryEntryClick}
                    onHighlightClick={handleSidebarHighlightClick}
                />

                <div
                    className="w-2 bg-zinc-800 hover:bg-zinc-700 cursor-ew-resize transition-colors duration-100"
                    onMouseDown={handleMouseDown}
                    title="Drag to resize sidebar"
                ></div>

                <main className="flex-1 bg-zinc-900 p-0 overflow-y-auto relative rounded-br-lg">
                    {pdfFileUrl ? (
                        <PdfDisplay
                            pdfFileUrl={pdfFileUrl}
                            highlights={highlights}
                            onAddHighlight={addHighlightToList}
                            onRemoveHighlight={removeHighlightFromList}
                            onUpdateHighlight={updateHighlightInList}
                            initialScrollToHighlight={scrollToHighlight}
                        />
                    ) : (
                        <div className="flex items-center justify-center h-full text-gray-400 text-xl">
                            <p>{currentDirectoryHandle ? "Select a PDF file from the sidebar." : "Open a PDF file or folder."}</p>
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
}

export default App;
