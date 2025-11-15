import React, { useState, useRef } from "react";
import clsx from "clsx";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Spinner } from "@/components/ui/spinner"; // Add a spinner component or use shadcn/ui spinner

// --- TESSERACT WORKER FIX FOR VITE ---
import { createWorker } from "tesseract.js";
import tesseractWorker from "tesseract.js/dist/worker.min.js?url";

// --- PDF.js WORKER FIX FOR VITE ---
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf";
import pdfWorker from "pdfjs-dist/build/pdf.worker.min.js?url";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

export default function App() {
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [extractedText, setExtractedText] = useState("");
  const [fileName, setFileName] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  const workerRef = useRef(null);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(extractedText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // --- OCR Worker Setup ---
  async function getWorker() {
    if (!workerRef.current) {
      const worker = await createWorker({
        workerPath: tesseractWorker,
        logger: (m) => {
          if (m.status === "recognizing text" && m.progress) {
            setProgress(Math.round(m.progress * 100));
          }
        },
      });

      await worker.loadLanguage("eng");
      await worker.initialize("eng");
      workerRef.current = worker;
    }
    return workerRef.current;
  }

  function reset() {
    setLoading(false);
    setProgress(0);
    setExtractedText("");
    setFileName("");
    setSuggestions([]);
    setError("");
  }

  async function handleFiles(files) {
    reset();

    if (!files || files.length === 0) return;
    const file = files[0];
    setFileName(file.name);

    try {
      setLoading(true);

      if (file.type === "application/pdf") {
        const text = await extractTextFromPDF(file);
        setExtractedText(text);
        analyzeText(text);
      } else if (file.type.startsWith("image/")) {
        const text = await extractTextFromImage(file);
        setExtractedText(text);
        analyzeText(text);
      } else {
        setError("Unsupported file type. Upload PDF or an image.");
      }
    } catch (e) {
      console.error(e);
      setError("An error occurred while processing the file.");
    } finally {
      setLoading(false);
      setProgress(0);
    }
  }

  function readFileAsDataURL(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  async function extractTextFromImage(file) {
    const worker = await getWorker();
    const dataUrl = await readFileAsDataURL(file);
    const { data } = await worker.recognize(dataUrl);
    return data.text;
  }

  async function extractTextFromPDF(file) {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

    let text = "";
    for (let p = 1; p <= pdf.numPages; p++) {
      const page = await pdf.getPage(p);
      const content = await page.getTextContent();
      const strings = content.items.map((i) => i.str);
      text += "\n" + strings.join(" ");
    }
    return text;
  }

  function analyzeText(text) {
    if (!text.trim()) {
      setSuggestions(["📝 No text found in the document."]);
      return;
    }

    const suggestionsList = [];
    const wordCount = text.split(/\s+/).length;

    suggestionsList.push(`📊 Word count: ${wordCount}`);

    if (!/#\w+/.test(text)) {
      suggestionsList.push("🏷️ Add 3–8 hashtags for better reach.");
    }

    if (!/@\w+/.test(text)) {
      suggestionsList.push("👥 Tag collaborators using @mentions.");
    }

    if (!/https?:\/\//.test(text)) {
      suggestionsList.push("🔗 Consider adding a call-to-action link.");
    }

    suggestionsList.push("✏️ Add short sentences and a clear CTA.");
    suggestionsList.push("🖼️ Include alt text for images.");

    setSuggestions(suggestionsList);
  }

  function onDrop(e) {
    e.preventDefault();
    handleFiles(e.dataTransfer.files);
  }

  return (
    <div className="min-h-screen p-6 flex flex-col md:flex-row gap-6 bg-gradient-to-r from-blue-100 to-pink-100">
      {/* Left Panel */}
      <div
        onDrop={onDrop}
        onDragOver={(e) => e.preventDefault()}
        className="flex-1 relative bg-gradient-to-br from-blue-500 to-pink-500 rounded-2xl shadow-xl p-6 flex flex-col items-center justify-center gap-4 hover:scale-[1.02] transition-transform duration-300 border-2 border-dashed border-white"
      >
        <h1 className="text-3xl font-bold text-white flex items-center gap-2">
          Extract and Analyser <span className="animate-bounce">✨</span>
        </h1>
        <p className="text-white text-center">Upload a PDF or image to analyze social media content</p>
        <input
          type="file"
          accept="application/pdf,image/*"
          id="file"
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
        <label
          htmlFor="file"
          className="cursor-pointer bg-white text-blue-600 px-6 py-2 rounded-full font-semibold shadow hover:shadow-lg hover:bg-gray-100 transition-colors duration-200"
        >
          Drag & Drop or Click
        </label>
        {fileName && <p className="text-white mt-2 truncate">📄 {fileName}</p>}
        {error && <p className="text-red-200 mt-2">{error}</p>}
      </div>

      {/* Right Panel */}
      <div className="flex-1 flex flex-col gap-4 bg-gradient-to-br from-slate-800 to-purple-900 p-6 rounded-2xl shadow-xl overflow-auto">
        {loading && (
          <div className="flex flex-col items-center gap-2">
            <Spinner className="w-12 h-12 text-white animate-spin" />
            <Progress value={progress} className="h-3 rounded-full transition-all duration-300" />
            <p className="text-white mt-1 text-sm animate-pulse">Processing... {progress}%</p>
          </div>
        )}

        {extractedText && (
          <div className="flex flex-col gap-4">
            {/* Extracted Text Card */}
            <div className="bg-white/20 backdrop-blur-md rounded-xl p-4 shadow-lg relative">
              <div className="flex justify-between items-center mb-2">
                <h2 className="text-xl font-semibold text-white">Extracted Text</h2>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={copyToClipboard}
                  className="text-white"
                >
                  {copied ? "Copied ✅" : "Copy"}
                </Button>
              </div>
              <pre className="p-3 bg-white/30 rounded max-h-64 overflow-auto text-white whitespace-pre-wrap">
                {extractedText}
              </pre>
            </div>

            {/* Suggestions Cards */}
            <div className="flex flex-col gap-2">
              {suggestions.map((s, i) => (
                <div
                  key={i}
                  className={clsx(
                    "p-3 rounded-xl shadow-lg backdrop-blur-md text-white font-medium animate-fadeIn",
                    i % 2 === 0
                      ? "bg-gradient-to-r from-pink-400 to-yellow-400"
                      : "bg-gradient-to-r from-blue-400 to-purple-400"
                  )}
                >
                  {s}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
