"use client";

import { useRef, useState, useEffect } from "react";
import { generateClientPdf } from "@/lib/client-pdf";
import { PDFPreview } from "@/components/pdf/PDFPreview";
import { ClientPdfProposal } from "@/lib/client-pdf";

type PDFViewerWrapperProps = {
  proposal: ClientPdfProposal;
  children: React.ReactNode;
};

export function PDFViewerWrapper({ proposal, children }: PDFViewerWrapperProps) {
  const hiddenDomRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [pdfFilename, setPdfFilename] = useState<string | null>(null);

  useEffect(() => {
    const generatePDF = async () => {
      setLoading(true);
      try {
        const docPage = hiddenDomRef.current?.querySelector(".doc-page") as HTMLElement | null;
        if (!docPage) {
          console.error("Could not find .doc-page inside hidden ref!");
        }
        const result = await generateClientPdf(proposal, docPage);
        setPdfUrl(result.url);
        setPdfFilename(result.filename);
      } catch (error) {
        console.error("PDF generation failed:", error);
      } finally {
        setLoading(false);
      }
    };

    const timeoutId = setTimeout(generatePDF, 500);
    return () => {
      clearTimeout(timeoutId);
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl);
      }
    };
  }, [proposal]);

  const handleDownload = () => {
    if (!pdfUrl || !pdfFilename) return;
    const anchor = document.createElement("a");
    anchor.href = pdfUrl;
    anchor.download = pdfFilename;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
  };

  return (
    <div style={{ position: "relative", minHeight: "100vh" }}>
      {/* Hidden template DOM — source of HTML for PDF generation */}
      <div
        ref={hiddenDomRef}
        style={{
          position: "fixed",
          top: "-20000px",
          left: 0,
          pointerEvents: "none",
          visibility: "hidden",
        }}
      >
        {children}
      </div>

      {loading && (
        <div
          style={{
            position: "fixed",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            textAlign: "center",
          }}
        >
          <span>Generating PDF…</span>
        </div>
      )}

      {!loading && pdfUrl && (
        <>
          <PDFPreview pdfUrl={pdfUrl} />

          <button
            onClick={handleDownload}
            style={{
              position: "fixed",
              bottom: "24px",
              right: "24px",
              zIndex: 1000,
              padding: "12px 24px",
              backgroundColor: "#111",
              color: "#fff",
              border: "none",
              borderRadius: "9999px",
              cursor: "pointer",
              fontFamily: "'Inter', sans-serif",
              fontSize: "14px",
              fontWeight: 600,
              boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)",
            }}
          >
            Download PDF
          </button>
        </>
      )}
    </div>
  );
}