"use client";

import { useState, useEffect } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

type ViewMode = "SINGLE" | "PAGE";

interface PDFPreviewProps {
  pdfUrl: string;
}

export function PDFPreview({ pdfUrl }: PDFPreviewProps) {
  const [viewMode, setViewMode] = useState<ViewMode>("SINGLE");
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState<number>(1);

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
  };

  const handleModeChange = (mode: ViewMode) => {
    setViewMode(mode);
  };

  const next = () => setPageNumber(p => Math.min(numPages, p + 1));
  const prev = () => setPageNumber(p => Math.max(1, p - 1));

  return (
    <div className="flex flex-col items-center bg-gray-200 min-h-screen py-8">
      <div className="flex items-center gap-4 mb-6 bg-white p-2 rounded-lg shadow-sm">
        <button
          onClick={() => handleModeChange("SINGLE")}
          className={`px-4 py-2 rounded-md font-medium text-sm transition-colors ${viewMode === "SINGLE" ? "bg-zinc-900 text-white" : "text-zinc-600 hover:bg-zinc-100"}`}
        >
          Single Scroll
        </button>
        <button
          onClick={() => handleModeChange("PAGE")}
          className={`px-4 py-2 rounded-md font-medium text-sm transition-colors ${viewMode === "PAGE" ? "bg-zinc-900 text-white" : "text-zinc-600 hover:bg-zinc-100"}`}
        >
          Page Wise
        </button>
      </div>

      {viewMode === "PAGE" && numPages > 0 && (
        <div className="flex items-center gap-6 mb-6">
          <button 
            onClick={prev} 
            disabled={pageNumber <= 1}
            className="px-4 py-2 bg-white rounded-md shadow-sm disabled:opacity-50 font-medium text-sm text-zinc-900"
          >
            ← Previous
          </button>
          <span className="font-medium text-sm text-zinc-600">Page {pageNumber} of {numPages}</span>
          <button 
            onClick={next} 
            disabled={pageNumber >= numPages}
            className="px-4 py-2 bg-white rounded-md shadow-sm disabled:opacity-50 font-medium text-sm text-zinc-900"
          >
            Next →
          </button>
        </div>
      )}

      <div className="w-full max-w-4xl flex flex-col items-center gap-8">
        <Document
          file={pdfUrl}
          onLoadSuccess={onDocumentLoadSuccess}
          loading={<div className="text-zinc-500">Loading PDF...</div>}
        >
          {viewMode === "SINGLE" ? (
            Array.from(new Array(numPages), (el, index) => (
              <div key={`page_${index + 1}`} className="mb-8 shadow-xl bg-white rounded overflow-hidden">
                <Page 
                  pageNumber={index + 1} 
                  renderTextLayer={true}
                  renderAnnotationLayer={true}
                  className="max-w-full"
                  width={794}
                />
              </div>
            ))
          ) : (
            <div className="shadow-xl bg-white rounded overflow-hidden">
              <Page 
                pageNumber={pageNumber}
                renderTextLayer={true}
                renderAnnotationLayer={true}
                className="max-w-full"
                width={794}
              />
            </div>
          )}
        </Document>
      </div>
    </div>
  );
}