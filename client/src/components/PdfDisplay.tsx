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
}) => {
    const highlighterRef = useRef<PdfHighlighter<IHighlight> | null>(null);

    useEffect(() => {
        if (initialScrollToHighlight && highlighterRef.current) {
            highlighterRef.current.scrollTo(initialScrollToHighlight);
        }
    }, [initialScrollToHighlight]);

    if (!pdfFileUrl) {
        return (
            <div className="flex items-center justify-center h-full text-gray-500">
                <p>Select a PDF file to view.</p>
            </div>
        );
    }

    return (
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
    );
};
