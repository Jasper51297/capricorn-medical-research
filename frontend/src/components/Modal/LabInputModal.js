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

import React from 'react';
import { Upload, FileText } from 'lucide-react';

const LabInputModal = ({ isOpen, onClose, onUploadClick, onTextClick }) => {
  if (!isOpen) return null;

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      onClick={handleBackdropClick}
    >
      <div className="bg-white rounded-lg shadow-xl p-6 w-96 max-w-[90%]">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Add Lab Results</h3>
        <p className="text-sm text-gray-600 mb-6">Choose how you'd like to add lab results:</p>
        
        <div className="space-y-3">
          <button
            onClick={onUploadClick}
            className="w-full flex items-center justify-center px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <Upload className="w-5 h-5 mr-2" />
            Upload File (Experimental)
          </button>
          
          <button
            onClick={onTextClick}
            className="w-full flex items-center justify-center px-4 py-3 bg-gray-100 text-gray-800 rounded-lg hover:bg-gray-200 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-gray-400"
          >
            <FileText className="w-5 h-5 mr-2" />
            Enter Text Manually
          </button>
        </div>
        
        <button
          onClick={onClose}
          className="w-full mt-4 text-sm text-gray-500 hover:text-gray-700 transition-colors duration-200"
        >
          Cancel
        </button>
      </div>
    </div>
  );
};

export default LabInputModal;
