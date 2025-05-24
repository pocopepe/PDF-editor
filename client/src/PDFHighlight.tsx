import React from 'react';

interface PDFHighlightProps {
  text: string;
}

export const PDFHighlight: React.FC<PDFHighlightProps> = ({ text }) => {
  if (!text) return null;

    return (
    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-yellow-400 bg-opacity-50 p-2 rounded shadow-lg pointer-events-none">
      <p className="text-black text-sm">Selected: "{text}"</p>
    </div>
  );
};
