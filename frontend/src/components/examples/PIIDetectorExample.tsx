/**
 * Example: Using the PII Detector with the API Client
 */

"use client";

import { useState } from "react";
import { apiClient } from "@/src/lib/api-client";

export function PIIDetectorExample() {
  const [input, setInput] = useState(
    "Contact John Doe at john@example.com or (555) 123-4567",
  );
  const [results, setResults] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleDetectPII = async () => {
    setLoading(true);
    setError("");
    try {
      const result = await apiClient.detectPII({
        text: input,
        remove_pii: true,
      });

      setResults(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "PII detection failed");
    } finally {
      setLoading(false);
    }
  };

  const handleRiskScore = async () => {
    setLoading(true);
    setError("");
    try {
      const result = await apiClient.calculateRiskScore(input);
      console.log("Risk Score:", result);
      setResults(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Risk calculation failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4 p-4">
      <h2>PII Detection Example</h2>

      <textarea
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="Enter text to check for PII"
        className="w-full p-2 border rounded"
      />

      <div className="flex gap-2">
        <button
          onClick={handleDetectPII}
          disabled={loading}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
        >
          {loading ? "Detecting..." : "Detect PII"}
        </button>
        <button
          onClick={handleRiskScore}
          disabled={loading}
          className="px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600 disabled:opacity-50"
        >
          {loading ? "Scoring..." : "Risk Score"}
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
