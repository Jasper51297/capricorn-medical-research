// Copyright 2025 Google LLC
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     https://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import React, { useState } from 'react';

const IntendedUseModal = ({ isOpen, onClose }) => {
  const [acknowledged, setAcknowledged] = useState(false);

  if (!isOpen) return null;

  const handleAcknowledge = () => {
    if (acknowledged) {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4 pb-12">
      <div className="bg-white rounded-lg max-w-3xl w-full max-h-[85vh] shadow-xl flex flex-col">
        {/* Header */}
        <div className="p-6 pb-4 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-800">Intended Use & Important Information</h2>
          <p className="text-sm text-gray-600 mt-1">Please read carefully before using this software</p>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Intended Use Statement Section */}
          <div className="bg-blue-50 rounded-lg p-5 border border-blue-200">
            <h3 className="text-lg font-semibold mb-3 text-blue-900 flex items-center">
              <span className="mr-2">📋</span> Intended Use Statement
            </h3>
            <div className="space-y-3 text-gray-700">
              <p>
                This software tool is intended for use by <strong>licensed healthcare professionals</strong> to assist in the identification of scientific literature relevant to the molecular and clinical profile of individual patients. The tool uses natural language processing and structured querying to perform advanced PubMed searches based on clinician-provided inputs, including clinical history, prior treatments, and molecular diagnostics (e.g., WES, RNA-seq).
              </p>
              <p>
                The software is designed to streamline the literature search process by extracting potential actionable events from clinical text and retrieving related scientific articles. All search results are presented with direct references (PMIDs) to the original literature for full transparency and traceability.
              </p>
              <p className="font-medium text-red-700">
                This tool does not analyze, interpret, or prioritize treatment options and is not intended to provide diagnostic or therapeutic recommendations. The final decision regarding patient care remains solely with the treating physician. The software is intended to supplement, not replace, clinical judgment.
              </p>
            </div>
          </div>

          {/* Important Limitations Section */}
          <div className="bg-amber-50 rounded-lg p-5 border border-amber-200">
            <h3 className="text-lg font-semibold mb-3 text-amber-900 flex items-center">
              <span className="mr-2">⚠️</span> Important Limitations
            </h3>
            <div className="space-y-3 text-gray-700">
              <p>
                This medical research assistant utilizes artificial intelligence to analyze medical literature and research papers. Please be aware of the following important points:
              </p>
              <ul className="list-disc pl-5 space-y-2">
                <li>This tool is designed to assist medical professionals in research and literature review only.</li>
                <li>The AI analysis may not always reflect complete accuracy and should be verified against primary sources.</li>
                <li>All information should be critically evaluated and validated by qualified medical professionals.</li>
                <li>This tool should not be used as a substitute for professional medical judgment.</li>
                <li>The accuracy and completeness of the analysis depend on the available research data and AI limitations.</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Footer with Acknowledgment */}
        <div className="p-6 pt-4 border-t border-gray-200 bg-gray-50">
          <label className="flex items-start space-x-3 mb-4 cursor-pointer">
            <input
              type="checkbox"
              checked={acknowledged}
              onChange={(e) => setAcknowledged(e.target.checked)}
              className="mt-1 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">
              I have read, understood, and acknowledge the intended use and limitations of this software. 
              I confirm that I am a licensed healthcare professional using this tool for research purposes only.
            </span>
          </label>
          <button
            onClick={handleAcknowledge}
            disabled={!acknowledged}
            className={`w-full py-3 px-4 rounded font-medium transition-all ${
              acknowledged
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            Acknowledge and Continue
          </button>
        </div>
      </div>
    </div>
  );
};

export default IntendedUseModal;
