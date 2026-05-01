/**
 * Example: Using the API Client in a Component
 * Shows how to call the Python FastAPI backend from frontend components
 */

"use client";

import { useState } from "react";
import { apiClient, TranslationRequest } from "@/src/lib/api-client";

export function TranslationExample() {
  const [input, setInput] = useState("Hello, how are you?");
  const [output, setOutput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleTranslate = async () => {
    setLoading(true);
    setError("");
    try {
      const result = await apiClient.translate({
        text: input,
        source_language: "English",
        target_language: "Nepali",
        include_confidence: true,
      });

      setOutput(result.translated_text);
      console.log("Confidence:", result.confidence_score);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Translation failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4 p-4">
      <h2>Translation Example</h2>

      <textarea
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="Enter text to translate"
        className="w-full p-2 border rounded"
      />

      <button
        onClick={handleTranslate}
        disabled={loading}
        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
      >
        {loading ? "Translating..." : "Translate"}
      </button>

      {output && (
        <div className="p-4 bg-green-100 rounded">
          <strong>Translation:</strong> {output}
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
