"use client";
// apps/web/components/invoice/InvoiceUpload.tsx
// Handles file selection, drag-and-drop, and calls /api/extract.

import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import type { InvoiceData } from "@voltwise/invoice-parser/claude-parser";

interface Props {
  onExtracted: (data: Partial<InvoiceData>) => void;
  onManual: () => void;
}

const ACCEPTED = {
  "application/pdf":  [".pdf"],
  "image/jpeg":       [".jpg", ".jpeg"],
  "image/png":        [".png"],
  "image/webp":       [".webp"],
};

type Status = "idle" | "uploading" | "extracting" | "done" | "error";

export function InvoiceUpload({ onExtracted, onManual }: Props) {
  const [status, setStatus]   = useState<Status>("idle");
  const [message, setMessage] = useState("");

  const processFile = useCallback(async (file: File) => {
    setStatus("uploading");
    setMessage("Uploading invoice...");

    const formData = new FormData();
    formData.append("file", file);

    try {
      setStatus("extracting");
      setMessage("Claude is reading your invoice...");

      const res = await fetch("/api/extract", { method: "POST", body: formData });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Extraction failed");
      }

      const { data } = await res.json();
      setStatus("done");
      setMessage(data.summary);
      onExtracted(data);
    } catch (err) {
      setStatus("error");
      setMessage(err instanceof Error ? err.message : "Could not read invoice");
    }
  }, [onExtracted]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: (files) => files[0] && processFile(files[0]),
    accept: ACCEPTED,
    maxFiles: 1,
    maxSize: 10 * 1024 * 1024,
  });

  return (
    <div className="space-y-4">
      <div
        {...getRootProps()}
        className={[
          "border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-colors",
          isDragActive
            ? "border-green-500 bg-green-50"
            : status === "done"
            ? "border-green-400 bg-green-50"
            : status === "error"
            ? "border-red-300 bg-red-50"
            : "border-gray-200 bg-gray-50 hover:border-green-400 hover:bg-green-50",
        ].join(" ")}
      >
        <input {...getInputProps()} />

        {status === "idle" || status === "error" ? (
          <>
            <div className="text-4xl mb-3">📄</div>
            <p className="text-base font-medium text-gray-800 mb-1">
              {isDragActive ? "Drop it here" : "Drop your electricity invoice here"}
            </p>
            <p className="text-sm text-gray-400">PDF, PNG, JPG or screenshot — up to 10 MB</p>
            {status === "error" && (
              <p className="mt-3 text-sm text-red-600">{message}</p>
            )}
          </>
        ) : status === "uploading" || status === "extracting" ? (
          <>
            <div className="w-8 h-8 border-2 border-gray-200 border-t-green-500 rounded-full animate-spin mx-auto mb-4" />
            <p className="text-sm font-medium text-gray-700">{message}</p>
            <p className="text-xs text-gray-400 mt-1">Powered by claude-sonnet-4-6 vision</p>
          </>
        ) : (
          <>
            <div className="text-3xl mb-2">✅</div>
            <p className="text-sm font-medium text-green-700">{message}</p>
            <p className="text-xs text-gray-400 mt-1">Review the extracted data below</p>
          </>
        )}
      </div>

      <div className="flex gap-2 justify-center flex-wrap">
        {["PDF", "PNG", "JPG", "Screenshot"].map((f) => (
          <span key={f} className="text-xs bg-gray-100 border border-gray-200 px-2.5 py-1 rounded-md text-gray-500">
            {f}
          </span>
        ))}
      </div>

      <button
        onClick={onManual}
        className="w-full text-center py-2.5 text-sm text-green-600 font-medium hover:text-green-700 underline underline-offset-2"
      >
        Enter details manually instead →
      </button>
    </div>
  );
}
