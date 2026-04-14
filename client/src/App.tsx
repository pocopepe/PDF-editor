import { useState, useEffect, useCallback, useRef } from 'react';
import { pdfjs } from 'react-pdf';
import { PDFDocument, StandardFonts, degrees, rgb } from 'pdf-lib';
import { AppHeader } from './components/AppHeader';
import { DirectorySidebar } from './components/DirectorySidebar';
import { PdfDisplay } from './components/PdfDisplay';
import { listDirectoryContents } from './helpers/fileSystemUtils';
import { loadHighlightsFromFile, saveHighlightsToFile, generateId } from './helpers/highlightUtils';
import type { DirectoryItem, IHighlight, NewHighlight, FileExif } from './helpers/types';

type PickerWindow = Window & {
  showOpenFilePicker?: (options?: OpenFilePickerOptions) => Promise<FileSystemFileHandle[]>;
  showDirectoryPicker?: (options?: DirectoryPickerOptions) => Promise<FileSystemDirectoryHandle>;
  showSaveFilePicker?: (options?: SaveFilePickerOptions) => Promise<FileSystemFileHandle>;
};

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString();

const SIDEBAR_WIDTH_STORAGE_KEY = 'dotmark:sidebarWidth';
const TOOLS_PANEL_WIDTH_STORAGE_KEY = 'dotmark:toolsPanelWidth';

const getStoredWidth = (key: string, fallback: number) => {
  const storedValue = window.localStorage.getItem(key);
  if (!storedValue) return fallback;

  const parsed = Number(storedValue);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

type PageScrollRequest = {
  pageNumber: number;
  sourceUrl: string;
  requestId: number;
};

function App() {
  const [activeTool, setActiveTool] = useState<'page-numbers' | 'rotate' | 'reorder' | null>(null);
  const [rotateTarget, setRotateTarget] = useState<'all' | 'current'>('all');
  const [pageNumberStart, setPageNumberStart] = useState(1);
  const [toolStatus, setToolStatus] = useState<{ error: string; success: string; busy: boolean }>({
    error: '',
    success: '',
    busy: false,
  });

  const [fileExif, setFileExif] = useState<FileExif | null>(null);
  const [directoryContents, setDirectoryContents] = useState<DirectoryItem[] | null>(null);
  const [currentDirectoryHandle, setCurrentDirectoryHandle] = useState<FileSystemDirectoryHandle | null>(null);
  const [directoryHistory, setDirectoryHistory] = useState<FileSystemDirectoryHandle[]>([]);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [currentPdfFileHandle, setCurrentPdfFileHandle] = useState<FileSystemFileHandle | null>(null);
  const [pdfFileUrl, setPdfFileUrl] = useState<string>('');
  const [highlights, setHighlights] = useState<IHighlight[]>([]);
  const [scrollToHighlight, setScrollToHighlight] = useState<IHighlight | null>(null);
  const [sidebarWidth, setSidebarWidth] = useState(() => getStoredWidth(SIDEBAR_WIDTH_STORAGE_KEY, window.innerWidth / 3));
  const [isToolsPanelOpen, setIsToolsPanelOpen] = useState(false);
  const [toolsPanelWidth, setToolsPanelWidth] = useState(() => getStoredWidth(TOOLS_PANEL_WIDTH_STORAGE_KEY, 320));
  const [currentViewPage, setCurrentViewPage] = useState(1);
  const [totalViewPages, setTotalViewPages] = useState(0);
  const [pendingPageScrollRequest, setPendingPageScrollRequest] = useState<PageScrollRequest | null>(null);
  const isResizing = useRef(false);
  const isToolsResizing = useRef(false);

  const resetAppStates = useCallback(() => {
    setFileExif(null);
    setDirectoryContents(null);
    setCurrentDirectoryHandle(null);
    setDirectoryHistory([]);
    setPdfFile(null);
    setCurrentPdfFileHandle(null);
    setPdfFileUrl('');
    setHighlights([]);
    setScrollToHighlight(null);
    setCurrentViewPage(1);
    setTotalViewPages(0);
    setPendingPageScrollRequest(null);
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

  useEffect(() => {
    window.localStorage.setItem(SIDEBAR_WIDTH_STORAGE_KEY, String(sidebarWidth));
  }, [sidebarWidth]);

  useEffect(() => {
    window.localStorage.setItem(TOOLS_PANEL_WIDTH_STORAGE_KEY, String(toolsPanelWidth));
  }, [toolsPanelWidth]);

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

  const handleToolsMouseDown = () => {
    isToolsResizing.current = true;
    document.addEventListener('mousemove', handleToolsMouseMove);
    document.addEventListener('mouseup', handleToolsMouseUp);
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'ew-resize';
  };

  const handleToolsMouseMove = (e: MouseEvent) => {
    if (!isToolsResizing.current) return;
    const minWidth = 260;
    const maxWidth = window.innerWidth * 0.6;
    let newWidth = window.innerWidth - e.clientX;
    if (newWidth < minWidth) newWidth = minWidth;
    else if (newWidth > maxWidth) newWidth = maxWidth;
    setToolsPanelWidth(newWidth);
  };

  const handleToolsMouseUp = () => {
    isToolsResizing.current = false;
    document.removeEventListener('mousemove', handleToolsMouseMove);
    document.removeEventListener('mouseup', handleToolsMouseUp);
    document.body.style.userSelect = '';
    document.body.style.cursor = '';
  };

  const updateDirectoryView = async (dirHandle: FileSystemDirectoryHandle, history: FileSystemDirectoryHandle[]) => {
    const contents = await listDirectoryContents(dirHandle, history.length);
    setDirectoryContents(contents);
    setCurrentDirectoryHandle(dirHandle);
    setDirectoryHistory(history);
    setFileExif({ fileName: dirHandle.name, fileType: 'directory' });
  };

  const handleOpenFilePicker = async () => {
    resetAppStates();
    const pickerWindow = window as PickerWindow;
    if (!pickerWindow.showOpenFilePicker) {
      console.warn('File System Access API not supported.');
      return;
    }
    const [fileHandle] = await pickerWindow.showOpenFilePicker({
      types: [{ description: 'PDF Files', accept: { 'application/pdf': ['.pdf'] } }],
    });
    const file: File = await fileHandle.getFile();
    setFileExif({ fileName: file.name, fileType: file.type });
    if (file.type === 'application/pdf') {
      setPdfFile(file);
      setCurrentPdfFileHandle(fileHandle);
    } else {
      setPdfFile(null);
      setCurrentPdfFileHandle(null);
      console.warn(`Only PDF files are supported. Selected: ${file.name} (${file.type})`);
    }
  };

  const handleOpenDirectoryPicker = async () => {
    resetAppStates();
    const pickerWindow = window as PickerWindow;
    if (!pickerWindow.showDirectoryPicker) {
      console.warn('Directory Picker API not supported.');
      return;
    }
    const dirHandle: FileSystemDirectoryHandle = await pickerWindow.showDirectoryPicker();
    await updateDirectoryView(dirHandle, [dirHandle]);
  };

  const handleDirectoryEntryClick = async (entry: DirectoryItem) => {
    setHighlights([]);
    setPdfFile(null);
    setScrollToHighlight(null);

    if (entry.kind === 'pseudo-directory-up') {
      if (directoryHistory.length > 1) {
        const newHistory = directoryHistory.slice(0, -1);
        await updateDirectoryView(newHistory[newHistory.length - 1], newHistory);
      }
      return;
    }

    if (entry.kind === 'directory') {
      await updateDirectoryView(entry as FileSystemDirectoryHandle, [...directoryHistory, entry as FileSystemDirectoryHandle]);
      return;
    }

    if (entry.kind === 'file') {
      const fileHandle = entry as FileSystemFileHandle;
      const file: File = await fileHandle.getFile();
      setFileExif({ fileName: file.name, fileType: file.type });
      if (file.type === 'application/pdf') {
        setPdfFile(file);
        setCurrentPdfFileHandle(fileHandle);
        setCurrentViewPage(1);
        setTotalViewPages(0);
        setPendingPageScrollRequest(null);
      } else {
        setPdfFile(null);
        setCurrentPdfFileHandle(null);
        console.warn(`Only PDF files are supported. Selected: ${file.name} (${file.type})`);
      }
    }
  };

  const writePdfToHandle = async (fileHandle: FileSystemFileHandle, file: File) => {
    const writable = await fileHandle.createWritable();
    await writable.write(await file.arrayBuffer());
    await writable.close();
  };

  const handleSaveAs = async () => {
    if (!pdfFile) return;

    const pickerWindow = window as PickerWindow;
    if (!pickerWindow.showSaveFilePicker) {
      console.warn('Save File Picker API not supported in this browser.');
      return;
    }

    try {
      const saveHandle = await pickerWindow.showSaveFilePicker({
        suggestedName: pdfFile.name,
        types: [{ description: 'PDF Files', accept: { 'application/pdf': ['.pdf'] } }],
      });

      await writePdfToHandle(saveHandle, pdfFile);
      const savedFile = await saveHandle.getFile();

      setPdfFile(savedFile);
      setCurrentPdfFileHandle(saveHandle);
      setFileExif({ fileName: savedFile.name, fileType: savedFile.type });
    } catch (error) {
      // Ignore user cancellation; surface only unexpected errors.
      if (error instanceof Error && error.name !== 'AbortError') {
        console.warn(`Save As failed: ${error.message}`);
      }
    }
  };

  const handleOverwriteOriginal = async () => {
    if (!pdfFile) return;

    if (!currentPdfFileHandle) {
      await handleSaveAs();
      return;
    }

    const shouldProceed = window.confirm(
      'This will overwrite the original file on disk. Continue?'
    );
    if (!shouldProceed) return;

    try {
      await writePdfToHandle(currentPdfFileHandle, pdfFile);
      const savedFile = await currentPdfFileHandle.getFile();
      setPdfFile(savedFile);
      setFileExif({ fileName: savedFile.name, fileType: savedFile.type });
    } catch (error) {
      if (error instanceof Error) {
        console.warn(`Overwrite failed: ${error.message}`);
      }
    }
  };

  const addHighlightToList = (highlight: NewHighlight) => {
    setHighlights((prev) => [{ ...highlight, id: generateId() }, ...prev]);
  };

  const removeHighlightFromList = (highlightId: string) => {
    setHighlights((prev) => prev.filter((h) => h.id !== highlightId));
  };

  const updateHighlightInList = (
    highlightId: string,
    positionUpdate: Partial<IHighlight['position']>,
    contentUpdate: Partial<IHighlight['content']>,
  ) => {
    setHighlights((prev) =>
      prev.map((h) =>
        h.id === highlightId
          ? {
              ...h,
              position: { ...h.position, ...positionUpdate },
              content: { ...h.content, ...contentUpdate },
            }
          : h,
      ),
    );
  };

  const handleSidebarHighlightClick = (highlight: IHighlight) => {
    setScrollToHighlight(highlight);
    setTimeout(() => setScrollToHighlight(null), 100);
  };

  const setUpdatedPdfInViewer = async (
    bytes: Uint8Array,
    suffix: string,
    successMessage: string,
    scrollBackToPage?: number,
  ) => {
    const outBlob = new Blob([bytes], { type: 'application/pdf' });
    const updatedName = pdfFile ? pdfFile.name.replace(/\.pdf$/i, '') + suffix : `updated${suffix}`;
    const updatedFile = new File([outBlob], updatedName, { type: 'application/pdf' });

    setPdfFile(updatedFile);
    setFileExif({ fileName: updatedFile.name, fileType: updatedFile.type });
    if (scrollBackToPage && scrollBackToPage > 0) {
      setPendingPageScrollRequest({
        pageNumber: scrollBackToPage,
        sourceUrl: pdfFileUrl,
        requestId: Date.now(),
      });
    }
    setToolStatus({ error: '', success: successMessage, busy: false });
  };

  const applyPageNumbers = async () => {
    if (!pdfFile) {
      setToolStatus({ error: 'Open a PDF first to use this tool.', success: '', busy: false });
      return;
    }

    try {
      setToolStatus({ error: '', success: '', busy: true });

      const pdfBytes = await pdfFile.arrayBuffer();
      const doc = await PDFDocument.load(pdfBytes);
      const font = await doc.embedFont(StandardFonts.Helvetica);

      doc.getPages().forEach((page, index) => {
        const { width } = page.getSize();
        const text = String(pageNumberStart + index);
        page.drawText(text, {
          x: width - 42,
          y: 16,
          size: 11,
          font,
          color: rgb(0.2, 0.2, 0.2),
        });
      });

      const out = await doc.save();
      await setUpdatedPdfInViewer(out, '-numbered.pdf', 'Page numbers added. Viewer updated with the new PDF.');
    } catch (error) {
      setToolStatus({ error: (error as Error).message, success: '', busy: false });
    }
  };

  const applyRotatePages = async (rotationDelta: 90 | -90) => {
    if (!pdfFile) {
      setToolStatus({ error: 'Open a PDF first to use this tool.', success: '', busy: false });
      return;
    }

    if (rotateTarget === 'current' && currentViewPage < 1) {
      setToolStatus({ error: 'Could not detect the current page yet. Scroll in the viewer and try again.', success: '', busy: false });
      return;
    }

    try {
      setToolStatus({ error: '', success: '', busy: true });
      const restorePage = currentViewPage;

      const pdfBytes = await pdfFile.arrayBuffer();
      const doc = await PDFDocument.load(pdfBytes);

      const pages = doc.getPages();
      const targetIndices = rotateTarget === 'all'
        ? pages.map((_, index) => index)
        : [Math.min(Math.max(currentViewPage - 1, 0), Math.max(pages.length - 1, 0))];

      targetIndices.forEach((index) => {
        const page = pages[index];
        const currentRotation = page.getRotation().angle;
        page.setRotation(degrees(currentRotation + rotationDelta));
      });

      const out = await doc.save();
      const suffix = rotationDelta > 0 ? '-rotated-cw.pdf' : '-rotated-ccw.pdf';
      const targetLabel = rotateTarget === 'all' ? 'All pages' : `Page ${currentViewPage}`;
      const message = rotationDelta > 0
        ? `${targetLabel} rotated 90 degrees clockwise.`
        : `${targetLabel} rotated 90 degrees counterclockwise.`;

      await setUpdatedPdfInViewer(out, suffix, message, restorePage);
    } catch (error) {
      setToolStatus({ error: (error as Error).message, success: '', busy: false });
    }
  };

  const applyReversePageOrder = async () => {
    if (!pdfFile) {
      setToolStatus({ error: 'Open a PDF first to use this tool.', success: '', busy: false });
      return;
    }

    try {
      setToolStatus({ error: '', success: '', busy: true });

      const pdfBytes = await pdfFile.arrayBuffer();
      const srcDoc = await PDFDocument.load(pdfBytes);
      const outDoc = await PDFDocument.create();
      const pageCount = srcDoc.getPageCount();

      const sourceIndices = Array.from({ length: pageCount }, (_, index) => pageCount - 1 - index);
      const copiedPages = await outDoc.copyPages(srcDoc, sourceIndices);
      copiedPages.forEach((page) => outDoc.addPage(page));

      const out = await outDoc.save();
      await setUpdatedPdfInViewer(out, '-reversed.pdf', 'Page order reversed. Viewer updated with the new PDF.');
    } catch (error) {
      setToolStatus({ error: (error as Error).message, success: '', busy: false });
    }
  };

  return (
    <div className="flex flex-col h-screen bg-stone-400 text-stone-800 font-sans">
      <AppHeader
        fileExif={fileExif}
        onOpenFile={handleOpenFilePicker}
        onOpenFolder={handleOpenDirectoryPicker}
        onOpenTools={() => setIsToolsPanelOpen((prev) => !prev)}
      />

      <div className="flex flex-row flex-1 overflow-hidden">
        <DirectorySidebar
          className="h-full bg-stone-400 p-4 overflow-y-auto border-r border-stone-600 rounded-bl-lg"
          style={{ width: sidebarWidth }}
          currentDirectoryName={currentDirectoryHandle?.name || null}
          directoryContents={directoryContents}
          highlights={highlights}
          pdfFileIsLoaded={!!pdfFileUrl}
          onDirectoryEntryClick={handleDirectoryEntryClick}
          onHighlightClick={handleSidebarHighlightClick}
        />

        <div
          className="w-2 bg-stone-500 hover:bg-stone-600 cursor-ew-resize transition-colors duration-100"
          onMouseDown={handleMouseDown}
          title="Drag to resize sidebar"
        ></div>

        <main className="flex-1 bg-stone-200 p-0 overflow-y-auto relative rounded-br-lg">
          {pdfFileUrl ? (
            <PdfDisplay
              pdfFileUrl={pdfFileUrl}
              highlights={highlights}
              onAddHighlight={addHighlightToList}
              onRemoveHighlight={removeHighlightFromList}
              onUpdateHighlight={updateHighlightInList}
              initialScrollToHighlight={scrollToHighlight}
              scrollToPageRequest={pendingPageScrollRequest}
              onScrollToPageHandled={() => setPendingPageScrollRequest(null)}
              onCurrentPageChange={(page, totalPages) => {
                setCurrentViewPage(page);
                setTotalViewPages(totalPages);
              }}
            />
          ) : (
            <div className="flex items-center justify-center h-full text-stone-600 text-xl">
              <p>{currentDirectoryHandle ? 'Select a PDF file from the sidebar.' : 'Open a PDF file or folder.'}</p>
            </div>
          )}
        </main>

        {isToolsPanelOpen ? (
          <>
            <div
              className="w-2 bg-stone-500 hover:bg-stone-600 cursor-ew-resize transition-colors duration-100"
              onMouseDown={handleToolsMouseDown}
              title="Drag to resize tools panel"
            ></div>
            <aside className="border-l border-stone-500 bg-stone-100 p-4 overflow-y-auto" style={{ width: toolsPanelWidth }}>
            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-stone-900">Tools Workbench</h3>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSaveAs}
                  disabled={!pdfFile || toolStatus.busy}
                  className="rounded bg-stone-700 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-stone-600 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Save As
                </button>
                <button
                  type="button"
                  onClick={handleOverwriteOriginal}
                  disabled={!pdfFile || toolStatus.busy}
                  className="rounded bg-red-700 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Overwrite
                </button>
              </div>
            </div>
            <div className="mt-4 space-y-2 text-sm text-stone-800">
              <button
                type="button"
                onClick={() => {
                  setActiveTool('page-numbers');
                  setToolStatus({ error: '', success: '', busy: false });
                }}
                className={`w-full rounded px-3 py-2 text-left transition-colors ${
                  activeTool === 'page-numbers'
                    ? 'bg-amber-300 text-amber-900'
                    : 'bg-stone-200 hover:bg-stone-300'
                }`}
              >
                Add Page Numbers
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveTool('rotate');
                  setToolStatus({ error: '', success: '', busy: false });
                }}
                className={`w-full rounded px-3 py-2 text-left transition-colors ${
                  activeTool === 'rotate'
                    ? 'bg-amber-300 text-amber-900'
                    : 'bg-stone-200 hover:bg-stone-300'
                }`}
              >
                Rotate Pages
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveTool('reorder');
                  setToolStatus({ error: '', success: '', busy: false });
                }}
                className={`w-full rounded px-3 py-2 text-left transition-colors ${
                  activeTool === 'reorder'
                    ? 'bg-amber-300 text-amber-900'
                    : 'bg-stone-200 hover:bg-stone-300'
                }`}
              >
                Reorder Pages
              </button>
            </div>

            {activeTool === 'page-numbers' ? (
              <div className="mt-4 rounded border border-stone-300 bg-white p-3">
                <h4 className="text-sm font-semibold text-stone-900">Add Page Numbers</h4>
                <p className="mt-1 text-xs text-stone-600">Applies to the currently open PDF in the center view.</p>

                <label className="mt-3 block text-xs font-medium text-stone-700">Start number</label>
                <input
                  type="number"
                  min={1}
                  value={pageNumberStart}
                  onChange={(event) => setPageNumberStart(Math.max(1, Number(event.target.value) || 1))}
                  className="mt-1 w-full rounded border border-stone-300 bg-stone-50 px-2 py-1.5 text-sm"
                />

                <button
                  type="button"
                  onClick={applyPageNumbers}
                  disabled={toolStatus.busy}
                  className="mt-3 w-full rounded bg-stone-800 px-3 py-2 text-sm font-medium text-white hover:bg-stone-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {toolStatus.busy ? 'Applying...' : 'Apply to Current PDF'}
                </button>

                {toolStatus.error ? (
                  <p className="mt-2 text-xs text-red-700">{toolStatus.error}</p>
                ) : null}
                {toolStatus.success ? (
                  <p className="mt-2 text-xs text-emerald-700">{toolStatus.success}</p>
                ) : null}
              </div>
            ) : null}

            {activeTool === 'rotate' ? (
              <div className="mt-4 rounded border border-stone-300 bg-white p-3">
                <h4 className="text-sm font-semibold text-stone-900">Rotate Pages</h4>
                <p className="mt-1 text-xs text-stone-600">Rotate all pages, or just the page currently in view.</p>

                <div className="mt-3 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setRotateTarget('all')}
                    className={`rounded px-2 py-1.5 text-xs font-medium transition-colors ${
                      rotateTarget === 'all'
                        ? 'bg-amber-300 text-amber-900'
                        : 'bg-stone-200 text-stone-700 hover:bg-stone-300'
                    }`}
                  >
                    All Pages
                  </button>
                  <button
                    type="button"
                    onClick={() => setRotateTarget('current')}
                    className={`rounded px-2 py-1.5 text-xs font-medium transition-colors ${
                      rotateTarget === 'current'
                        ? 'bg-amber-300 text-amber-900'
                        : 'bg-stone-200 text-stone-700 hover:bg-stone-300'
                    }`}
                  >
                    Current Page
                  </button>
                </div>

                <p className="mt-2 text-xs text-stone-600">
                  Detected page: {totalViewPages > 0 ? `${currentViewPage} / ${totalViewPages}` : 'Detecting...'}
                </p>

                <div className="mt-3 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => applyRotatePages(90)}
                    disabled={toolStatus.busy}
                    className="rounded bg-stone-800 px-3 py-2 text-xs font-medium text-white hover:bg-stone-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Rotate +90
                  </button>
                  <button
                    type="button"
                    onClick={() => applyRotatePages(-90)}
                    disabled={toolStatus.busy}
                    className="rounded bg-stone-800 px-3 py-2 text-xs font-medium text-white hover:bg-stone-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Rotate -90
                  </button>
                </div>

                {toolStatus.error ? (
                  <p className="mt-2 text-xs text-red-700">{toolStatus.error}</p>
                ) : null}
                {toolStatus.success ? (
                  <p className="mt-2 text-xs text-emerald-700">{toolStatus.success}</p>
                ) : null}
              </div>
            ) : null}

            {activeTool === 'reorder' ? (
              <div className="mt-4 rounded border border-stone-300 bg-white p-3">
                <h4 className="text-sm font-semibold text-stone-900">Reorder Pages</h4>
                <p className="mt-1 text-xs text-stone-600">Reverse the order of all pages in the current PDF.</p>

                <button
                  type="button"
                  onClick={applyReversePageOrder}
                  disabled={toolStatus.busy}
                  className="mt-3 w-full rounded bg-stone-800 px-3 py-2 text-sm font-medium text-white hover:bg-stone-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {toolStatus.busy ? 'Applying...' : 'Reverse Page Order'}
                </button>

                {toolStatus.error ? (
                  <p className="mt-2 text-xs text-red-700">{toolStatus.error}</p>
                ) : null}
                {toolStatus.success ? (
                  <p className="mt-2 text-xs text-emerald-700">{toolStatus.success}</p>
                ) : null}
              </div>
            ) : null}
            </aside>
          </>
        ) : null}
      </div>
    </div>
  );
}

export default App;
