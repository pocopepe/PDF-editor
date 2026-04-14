import React, { useRef, useEffect } from 'react';
import {
    PdfLoader,
    PdfHighlighter,
    Highlight,
    Popup,
    AreaHighlight,
} from 'react-pdf-highlighter';
import type { IHighlight, NewHighlight } from '../helpers/types';
import "react-pdf-highlighter/dist/style.css";

type PageScrollRequest = {
    pageNumber: number;
    sourceUrl: string;
    requestId: number;
};

interface PdfDisplayProps {
    pdfFileUrl: string;
    highlights: IHighlight[];
    onAddHighlight: (highlight: NewHighlight) => void;
    onRemoveHighlight: (highlightId: string) => void;
    onUpdateHighlight: (
        highlightId: string,
        positionUpdate: Partial<IHighlight['position']>,
        contentUpdate: Partial<IHighlight['content']>
    ) => void;
    initialScrollToHighlight?: IHighlight | null;
    onCurrentPageChange?: (pageNumber: number, totalPages: number) => void;
    scrollToPageRequest?: PageScrollRequest | null;
    onScrollToPageHandled?: () => void;
}

// A small component for the content of the popup shown on hover/click of a highlight
const HighlightPopupContent: React.FC<{ highlightId: string; onRemove: (id: string) => void }> = ({ highlightId, onRemove }) => (
    <div className="p-2 bg-gray-700 rounded shadow-lg text-white text-xs">
        <button
            className="px-2 py-1 bg-red-600 hover:bg-red-700 rounded w-full"
            onClick={() => onRemove(highlightId)}
        >
            Remove Highlight
        </button>
    </div>
);

export const PdfDisplay: React.FC<PdfDisplayProps> = ({
    pdfFileUrl,
    highlights,
    onAddHighlight,
    onRemoveHighlight,
    onUpdateHighlight,
    initialScrollToHighlight,
    onCurrentPageChange,
    scrollToPageRequest,
    onScrollToPageHandled,
}) => {
    const highlighterRef = useRef<PdfHighlighter<IHighlight> | null>(null);
    const containerRef = useRef<HTMLDivElement | null>(null);
    const [zoomLevel, setZoomLevel] = React.useState(1);

    useEffect(() => {
        if (initialScrollToHighlight && highlighterRef.current) {
            highlighterRef.current.scrollTo(initialScrollToHighlight);
        }
    }, [initialScrollToHighlight]);

    useEffect(() => {
        if (!scrollToPageRequest || !containerRef.current) return;
        if (pdfFileUrl === scrollToPageRequest.sourceUrl) return;

        const tryScrollToPage = () => {
            const pageElement = containerRef.current?.querySelector(`.page[data-page-number="${scrollToPageRequest.pageNumber}"]`) as HTMLElement | null;
            if (!pageElement) return false;

            pageElement.scrollIntoView({ behavior: 'auto', block: 'center' });
            onScrollToPageHandled?.();
            return true;
        };

        if (tryScrollToPage()) return;

        const observer = new MutationObserver(() => {
            if (tryScrollToPage()) {
                observer.disconnect();
            }
        });

        observer.observe(containerRef.current, { childList: true, subtree: true });
        return () => observer.disconnect();
    }, [scrollToPageRequest, onScrollToPageHandled, pdfFileUrl]);

    useEffect(() => {
        if (!containerRef.current || !onCurrentPageChange) return;

        let rafId: number | null = null;

        const updateMostVisiblePage = () => {
            const pages = Array.from(containerRef.current?.querySelectorAll('.page') ?? []) as HTMLElement[];
            if (pages.length === 0) return;

            const viewportTop = window.innerHeight * 0.1;
            const viewportBottom = window.innerHeight * 0.9;

            let bestPage = 1;
            let bestVisibleHeight = -1;

            pages.forEach((page, index) => {
                const rect = page.getBoundingClientRect();
                const visibleTop = Math.max(rect.top, viewportTop);
                const visibleBottom = Math.min(rect.bottom, viewportBottom);
                const visibleHeight = Math.max(0, visibleBottom - visibleTop);

                if (visibleHeight > bestVisibleHeight) {
                    bestVisibleHeight = visibleHeight;
                    const attrPageNum = Number(page.getAttribute('data-page-number'));
                    bestPage = Number.isFinite(attrPageNum) && attrPageNum > 0 ? attrPageNum : index + 1;
                }
            });

            onCurrentPageChange(bestPage, pages.length);
        };

        const schedulePageUpdate = () => {
            if (rafId !== null) return;
            rafId = window.requestAnimationFrame(() => {
                rafId = null;
                updateMostVisiblePage();
            });
        };

        const mutationObserver = new MutationObserver(schedulePageUpdate);
        mutationObserver.observe(containerRef.current, { childList: true, subtree: true });

        window.addEventListener('scroll', schedulePageUpdate, true);
        window.addEventListener('resize', schedulePageUpdate);
        schedulePageUpdate();

        return () => {
            mutationObserver.disconnect();
            window.removeEventListener('scroll', schedulePageUpdate, true);
            window.removeEventListener('resize', schedulePageUpdate);
            if (rafId !== null) {
                window.cancelAnimationFrame(rafId);
            }
        };
    }, [onCurrentPageChange, pdfFileUrl]);

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        const clampZoom = (value: number) => Math.min(3, Math.max(0.5, value));

        const handleWheel = (event: WheelEvent) => {
            if (!event.ctrlKey) return;
            event.preventDefault();

            const zoomFactor = Math.exp(-event.deltaY * 0.01);
            setZoomLevel((prev) => clampZoom(Number((prev * zoomFactor).toFixed(2))));
        };

        container.addEventListener('wheel', handleWheel, { passive: false });
        return () => container.removeEventListener('wheel', handleWheel);
    }, []);

    if (!pdfFileUrl) {
        return (
            <div className="flex items-center justify-center h-full text-gray-500">
                <p>Select a PDF file to view.</p>
            </div>
        );
    }

    return (
        <div ref={containerRef} className="h-full relative">
        <div className="absolute right-3 top-3 z-20 flex items-center gap-2 rounded bg-stone-900/80 px-2 py-1 text-xs text-white">
            <button
                type="button"
                className="rounded bg-stone-700 px-2 py-0.5 hover:bg-stone-600"
                onClick={() => setZoomLevel((prev) => Math.max(0.5, Number((prev - 0.1).toFixed(2))))}
            >
                -
            </button>
            <span>{Math.round(zoomLevel * 100)}%</span>
            <button
                type="button"
                className="rounded bg-stone-700 px-2 py-0.5 hover:bg-stone-600"
                onClick={() => setZoomLevel((prev) => Math.min(3, Number((prev + 0.1).toFixed(2))))}
            >
                +
            </button>
            <button
                type="button"
                className="rounded bg-stone-700 px-2 py-0.5 hover:bg-stone-600"
                onClick={() => setZoomLevel(1)}
            >
                Reset
            </button>
        </div>

        <div style={{ zoom: zoomLevel } as React.CSSProperties}>
            <PdfLoader url={pdfFileUrl} beforeLoad={<div className="flex justify-center items-center h-full text-gray-400">Loading PDF...</div>}>
                {(pdfDocument) => (
                    <PdfHighlighter
                    ref={highlighterRef}
                    pdfDocument={pdfDocument}
                    enableAreaSelection={event => event.altKey}
                    onScrollChange={() => {}}
                    scrollRef={() => {}}
                    onSelectionFinished={(
                        position,
                        content,
                        hideTipAndSelection
                    ) => {
                        onAddHighlight({ content, position, comment: { text: "", emoji: "" } });
                        hideTipAndSelection();
                        return null;
                    }}
                    highlightTransform={(
                        highlight,
                        index,
                        setTip,
                        hideTip,
                        viewportToScaled,
                        screenshot,
                        isScrolledTo
                    ) => (
                        <Popup
                            key={index}
                            // The 'popupContent' prop is where you define what the popup should display.
                            // 'setTip' is then used in event handlers to show this content.
                            popupContent={
                                <HighlightPopupContent
                                    highlightId={highlight.id}
                                    onRemove={onRemoveHighlight}
                                />
                            }
                            onMouseOver={() => setTip(highlight, (highlight) => ( // Pass highlight to ensure correct context for the tip
                                <HighlightPopupContent // Re-render with current highlight id
                                    highlightId={highlight.id}
                                    onRemove={onRemoveHighlight}
                                />
                            ))}
                            onMouseOut={hideTip}
                        >
                            {/* The children of Popup are the actual visual highlights */}
                            {highlight.content.image ? (
                                <AreaHighlight
                                  isScrolledTo={isScrolledTo}
                                  highlight={highlight}
                                  onChange={boundingRect => {
                                    onUpdateHighlight(
                                        highlight.id,
                                        { boundingRect: viewportToScaled(boundingRect) },
                                        { image: screenshot(boundingRect) }
                                    );
                                  }}
                                />
                            ) : (
                                <Highlight
                                    isScrolledTo={isScrolledTo}
                                    position={highlight.position}
                                    comment={highlight.comment}
                                />
                            )}
                        </Popup>
                    )}
                    highlights={highlights}
                />
                )}
            </PdfLoader>
        </div>
        </div>
    );
};
