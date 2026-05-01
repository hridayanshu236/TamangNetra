/**
 * Example: Using the OCR Service with the API Client
 */

"use client";

import { useState } from "react";
import { apiClient } from "@/src/lib/api-client";

export function OCRExample() {
  const [imageUrl, setImageUrl] = useState(
    "https://example.com/sample-image.jpg",
  );
  const [results, setResults] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleProcessOCR = async () => {
    setLoading(true);
    setError("");
    try {
      const result = await apiClient.processOCR({
        image_url: imageUrl,
        source_language: "English",
        target_language: "Nepali",
        perform_translation: true,
      });

      setResults(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "OCR processing failed");
    } finally {
      setLoading(false);
    }
  };

  const handleDetectRegions = async () => {
    setLoading(true);
    setError("");
    try {
      const result = await apiClient.detectTextRegions(imageUrl);
      console.log("Detected regions:", result);
      setResults(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Region detection failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4 p-4">
      <h2>OCR Example</h2>

      <input
        type="text"
        value={imageUrl}
        onChange={(e) => setImageUrl(e.target.value)}
        placeholder="Enter image URL"
        className="w-full p-2 border rounded"
      />

      <div className="flex gap-2">
        <button
          onClick={handleProcessOCR}
          disabled={loading}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
        >
          {loading ? "Processing..." : "Process OCR"}
        </button>
        <button
          onClick={handleDetectRegions}
          disabled={loading}
          className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 disabled:opacity-50"
        >
          {loading ? "Detecting..." : "Detect Regions"}
        </button>
      </div>

      {results && (
        <div className="p-4 bg-blue-100 rounded">
          <h3 className="font-bold">Results:</h3>
          <pre className="text-sm overflow-auto">
            {JSON.stringify(results, null, 2)}
          </pre>
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-100 rounded">
          <strong>Error:</strong> {error}
        </div>
      )}
    </div>
  );
}
