import React, { useState, useRef } from "react";
import clsx from "clsx";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Spinner } from "@/components/ui/spinner"; // optional

import { createWorker } from "tesseract.js";
import tesseractWorker from "tesseract.js/dist/worker.min.js?url";

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
    if (!/#\w+/.test(text)) suggestionsList.push("🏷️ Add 3–8 hashtags for better reach.");
    if (!/@\w+/.test(text)) suggestionsList.push("👥 Tag collaborators using @mentions.");
    if (!/https?:\/\//.test(text)) suggestionsList.push("🔗 Consider adding a call-to-action link.");
    suggestionsList.push("✏️ Keep sentences short and clear.");
    suggestionsList.push("🖼️ Add alt text to images.");

    setSuggestions(suggestionsList);
  }

  function onDrop(e) {
    e.preventDefault();
    handleFiles(e.dataTransfer.files);
  }

  return (
    <div className="min-h-screen relative overflow-hidden bg-gray-900 text-white">
      {/* Background Gradient Orbs */}
      <div className="fixed inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-to-br from-gray-950 via-slate-900 to-gray-950"></div>
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-600 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse" style={{ animationDuration: "4s" }} />
        <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-purple-600 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse" style={{ animationDuration: "5s", animationDelay: "1s" }} />
        <div className="absolute bottom-0 left-1/2 w-96 h-96 bg-pink-600 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse" style={{ animationDuration: "6s", animationDelay: "2s" }} />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:50px_50px] opacity-40" />
      </div>

      {/* Content */}
      <div className="relative z-10 p-4 md:p-8 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8 mt-8">

          {/* Left Panel */}
          <div className="flex flex-col gap-6">

            {/* Header Card */}
            <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 rounded-3xl p-8 shadow-2xl relative overflow-hidden group">
              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-5xl group-hover:scale-125 transition-transform duration-300">✨</span>
                  <h1 className="text-4xl md:text-5xl font-bold text-white drop-shadow-lg">Extract and Analyze</h1>
                </div>
                <p className="text-white/95 text-lg font-medium drop-shadow-md">Transform Your Content Into Social Gold</p>
              </div>
            </div>

            {/* Upload Card */}
            <div
              onDrop={onDrop}
              onDragOver={(e) => e.preventDefault()}
              className="flex-1 relative rounded-3xl p-8 shadow-2xl border-2 border-dashed border-blue-400/50 hover:border-blue-300 transition-all duration-300 group overflow-hidden cursor-pointer"
            >
              <input
                type="file"
                accept="application/pdf,image/*"
                id="file"
                className="hidden"
                onChange={(e) => handleFiles(e.target.files)}
              />
              <label htmlFor="file" className="relative z-10 flex flex-col items-center justify-center py-12 gap-6">
                <div className="text-7xl group-hover:scale-125 group-hover:rotate-12 transition-transform duration-300">📄</div>
                <h2 className="text-2xl md:text-3xl font-bold text-white mb-2 drop-shadow-md">Choose Your File</h2>
                <p className="text-gray-300 text-lg mb-6 drop-shadow-sm text-center">Drag & drop your PDF or image here</p>
                <span className="inline-block px-8 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-full font-bold text-lg hover:shadow-xl hover:scale-105 transition-all duration-200 drop-shadow-lg">
                  Browse Files
                </span>
                <p className="text-gray-400 text-sm drop-shadow-sm">Supported: PDF, PNG, JPG, JPEG, WEBP, BMP, TIFF</p>
              </label>

              {/* Status Messages */}
              {fileName && (
                <div className="mt-6 px-4 py-3 bg-emerald-500/20 border border-emerald-500/50 rounded-2xl backdrop-blur-sm relative z-10 drop-shadow-lg text-center font-semibold text-emerald-200">
                  ✓ {fileName}
                </div>
              )}
              {error && (
                <div className="mt-6 px-4 py-3 bg-red-500/20 border border-red-500/50 rounded-2xl backdrop-blur-sm relative z-10 drop-shadow-lg text-center font-semibold text-red-200">
                  ⚠️ {error}
                </div>
              )}
            </div>
          </div>

          {/* Right Panel */}
          <div className="flex flex-col gap-6">
            {loading && (
              <div className="bg-slate-800/90 backdrop-blur-xl rounded-3xl p-8 shadow-2xl border border-blue-500/30 flex flex-col items-center gap-6">
                <div className="relative w-16 h-16">
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 rounded-full animate-spin"></div>
                  <div className="absolute inset-2 bg-slate-800 rounded-full"></div>
                </div>
                <p className="text-white font-semibold text-center mb-3 drop-shadow-md">Processing your file...</p>
                <div className="w-full bg-slate-700 rounded-full h-3 overflow-hidden border border-blue-500/30 shadow-lg">
                  <div
                    className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 h-full transition-all duration-300 rounded-full shadow-lg shadow-blue-500/50"
                    style={{ width: `${progress}%` }}
                  ></div>
                </div>
                <p className="text-blue-300 text-center text-sm mt-3 font-medium drop-shadow-sm">{progress}% Complete</p>
              </div>
            )}

            {extractedText && (
              <>
                {/* Extracted Text */}
                <div className="bg-slate-800/90 backdrop-blur-xl rounded-3xl p-6 shadow-2xl border border-blue-500/30">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-2xl font-bold text-white flex items-center gap-3 drop-shadow-md">
                      <span className="text-3xl">📝</span> Extracted Text
                    </h2>
                    <Button
                      size="sm"
                      onClick={copyToClipboard}
                      className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-semibold rounded-lg px-4 py-2 transition-all duration-200 hover:shadow-lg hover:shadow-blue-500/50 hover:scale-105 drop-shadow-md"
                    >
                      {copied ? "✓ Copied" : "📋 Copy"}
                    </Button>
                  </div>
                  <div className="bg-slate-900/50 border border-slate-700/50 rounded-2xl p-4 overflow-auto max-h-56 shadow-inner">
                    <pre className="text-gray-200 text-sm whitespace-pre-wrap font-mono leading-relaxed">{extractedText}</pre>
                  </div>
                </div>

                {/* Suggestions */}
                <div className="bg-slate-800/90 backdrop-blur-xl rounded-3xl p-6 shadow-2xl border border-purple-500/30">
                  <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-3 drop-shadow-md">
                    <span className="text-3xl">💡</span> Smart Suggestions
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {suggestions.map((s, i) => {
                      const gradients = [
                        "from-blue-600 to-blue-500",
                        "from-purple-600 to-purple-500",
                        "from-pink-600 to-pink-500",
                        "from-orange-600 to-orange-500",
                        "from-green-600 to-green-500",
                        "from-cyan-600 to-cyan-500",
                      ];
                      return (
                        <div
                          key={i}
                          className={clsx(
                            "bg-gradient-to-r",
                            gradients[i % gradients.length],
                            "rounded-2xl p-4 shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-102 cursor-pointer relative overflow-hidden"
                          )}
                        >
                          <p className="text-white font-medium text-base leading-relaxed">{s}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Reset Button */}
                <Button
                  onClick={reset}
                  className="w-full bg-gradient-to-r from-slate-700 to-slate-600 hover:from-slate-600 hover:to-slate-500 text-white font-bold py-3 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-200 text-lg hover:scale-105 drop-shadow-lg relative overflow-hidden"
                >
                  🔄 Analyze Another File
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}


