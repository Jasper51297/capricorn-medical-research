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

import React, { useRef, useEffect, useState, useCallback, memo } from 'react';
import { Mic, MicOff, ArrowRight } from 'lucide-react';
import LoadingSpinner from './LoadingSpinner';
import { redactSensitiveInfo } from '../utils/api';
import useDebounce from '../hooks/useDebounce';

// Define the SpeechRecognition interface
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

const ChatInput = memo(({ message, setMessage, handleSendMessage, isLoading }) => {
  const textareaRef = useRef(null);
  const recognitionRef = useRef(null);
  const cursorPositionRef = useRef(0);
  
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState(null);
  const [interimTranscript, setInterimTranscript] = useState('');
  const [redactedInput, setRedactedInput] = useState('');
  const [shouldDebounce, setShouldDebounce] = useState(true);
  const [isRedacting, setIsRedacting] = useState(false);
  console.log('message_clear_render: Initial redactedInput state:', redactedInput);
  
  const debouncedInput = useDebounce(redactedInput, 700);

  const handleClear = useCallback(() => {
    console.log('message_clear_render: handleClear called');
    console.log('message_clear_render: redactedInput before clear:', redactedInput);
    console.log('message_clear_render: message before clear:', message);
    setRedactedInput('');
    console.log('message_clear_render: Setting redactedInput to empty string');
    setMessage('');
    console.log('message_clear_render: Setting message to empty string');
    if (textareaRef.current) {
      console.log('message_clear_render: textarea value before clear:', textareaRef.current.value);
      textareaRef.current.value = '';
      textareaRef.current.style.height = 'auto';
      console.log('message_clear_render: textarea value after clear:', textareaRef.current.value);
    }
    // Prevent debounce effect from running
    setShouldDebounce(false);
    console.log('message_clear_render: Disabled debounce effect');
    console.log('message_clear_render: handleClear finished');
  }, [setMessage, redactedInput, message]);

  useEffect(() => {
    if (textareaRef.current) {
      adjustTextareaHeight(textareaRef.current);
    }
  }, [redactedInput]);

  useEffect(() => {
    const handleRedaction = async () => {
      if (shouldDebounce && debouncedInput.trim() && debouncedInput !== message) {
        try {
          setIsRedacting(true);
          const redactedText = await redactSensitiveInfo(debouncedInput);
          console.log('message_clear_render: Setting redactedInput to:', redactedText);
          setRedactedInput(redactedText);
          console.log('message_clear_render: Setting message to:', redactedText);
          setMessage(redactedText);
          
          // Preserve cursor position
          if (textareaRef.current) {
            const currentPosition = textareaRef.current.selectionStart;
            const diff = redactedText.length - debouncedInput.length;
            cursorPositionRef.current = Math.max(0, currentPosition + diff);
          }
        } catch (error) {
          console.error('Redaction failed:', error);
        } finally {
          setIsRedacting(false);
        }
      }
    };

    handleRedaction();
  }, [debouncedInput, setMessage, message, shouldDebounce]);

  // Separate effect for setting cursor position
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.setSelectionRange(cursorPositionRef.current, cursorPositionRef.current);
    }
  }, [redactedInput]);

  useEffect(() => {
    console.log('message_clear_render: Setting redactedInput to message:', message);
    setRedactedInput(message);
  }, [message]);

  useEffect(() => {
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;

      recognitionRef.current.onresult = (event) => {
        let finalTranscript = '';
        let currentInterimTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          } else {
            currentInterimTranscript += event.results[i][0].transcript;
          }
        }

        if (finalTranscript) {
          setMessage(prevMessage => {
            const newMessage = (prevMessage + ' ' + finalTranscript).trim();
            console.log('message_clear_render: Setting message from speech recognition:', newMessage);
            return newMessage;
          });
        }
        setInterimTranscript(currentInterimTranscript);
      };

      recognitionRef.current.onerror = (event) => {
        setError(`Speech recognition error: ${event.error}`);
        setIsListening(false);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
        setInterimTranscript('');
      };
    } else {
      setError('Speech Recognition API is not supported in this browser.');
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, []);

const handleSubmit = useCallback((e) => {
  if (e) e.preventDefault();
  console.log('message_clear_render: handleSubmit called');
  console.log('message_clear_render: redactedInput:', redactedInput);
  console.log('message_clear_render: isLoading:', isLoading);
  console.log('message_clear_render: isListening:', isListening);
  if (redactedInput.trim() && !isLoading && !isListening) {
    console.log('message_clear_render: Calling handleSendMessage');
    handleSendMessage(redactedInput.trim());
    console.log('message_clear_render: Calling handleClear');
    handleClear();
  } else {
    console.log('message_clear_render: Conditions not met for sending message');
  }
  console.log('message_clear_render: handleSubmit finished');
}, [redactedInput, isLoading, isListening, handleSendMessage, handleClear]);

  const handleTextareaKeyDown = useCallback((e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }, [handleSubmit]);

  const handleButtonClick = useCallback((e) => {
    e.preventDefault(); // Prevent form submission
    
    if (isListening) {
      // Stop recording
      recognitionRef.current.stop();
      setIsListening(false);
    } else if (!redactedInput.trim() && !isListening) {
      // Start recording if there's no input and not listening
      if (!recognitionRef.current) return;
      setError(null);
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch (error) {
        setError(`Failed to start recognition: ${error.message}`);
        setIsListening(false);
      }
    } else {
      handleSubmit();
    }
  }, [isListening, redactedInput, handleSubmit]);

  const adjustTextareaHeight = (textarea) => {
    if (!textarea) return;
    textarea.style.height = 'auto';
    const newHeight = textarea.scrollHeight + 4;
    const maxHeight = window.innerHeight * 0.35;
    if (newHeight <= maxHeight) {
      textarea.style.height = newHeight + 'px';
    } else {
      textarea.style.height = maxHeight + 'px';
      textarea.style.overflowY = 'auto';
    }
  };

  const handleTextareaChange = useCallback((e) => {
    const newText = e.target.value;
    if (!isListening) {
      console.log('message_clear_render: Setting redactedInput in handleTextareaChange:', newText);
      setRedactedInput(newText);
      cursorPositionRef.current = e.target.selectionStart;
      setShouldDebounce(true);
    }
    adjustTextareaHeight(textareaRef.current);
  }, [isListening]);

  return (
    <div className="w-full p-2">
      <form onSubmit={handleSubmit} className="flex items-center gap-2 relative max-w-full mx-auto">
        <div className="w-full bg-white border border-gray-200 rounded-3xl relative shadow-lg hover:shadow-xl transition-all duration-300 ease-in-out p-1">
          {isRedacting && (
            <div className="absolute top-0 left-0 right-0 bg-blue-100 bg-opacity-90 text-blue-700 px-2 py-1 text-xs z-10 rounded-t-3xl">
              <div className="flex items-center">
                <svg className="animate-spin h-3 w-3 mr-1 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Redacting sensitive information...
              </div>
            </div>
          )}
          <textarea
            ref={textareaRef}
            value={redactedInput + (isListening ? ' ' + interimTranscript : '')}
            onChange={handleTextareaChange}
            onKeyDown={handleTextareaKeyDown}
            placeholder="Ask questions here..."
            className="w-full bg-transparent text-gray-800 text-sm placeholder-gray-400 border-none focus:outline-none resize-none py-2.5 px-4 pr-12"
            disabled={isLoading}
            style={{ minHeight: '3em', maxHeight: '35vh' }}
          />
          {console.log('message_clear_render: Textarea rendered with value:', redactedInput + (isListening ? ' ' + interimTranscript : ''))}
          <button
            onClick={handleButtonClick}
            disabled={isLoading}
            className={`absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center justify-center rounded-full w-10 h-10 focus:outline-none focus:ring-2 transition-all duration-300 shadow-sm ${
              isLoading ? "bg-blue-600 text-white focus:ring-blue-300" :
              isListening ? "bg-red-500 hover:bg-red-600 text-white focus:ring-red-300 animate-pulse" :
              redactedInput.trim() ? "bg-blue-600 hover:bg-blue-700 text-white focus:ring-blue-300" :
              "bg-gray-700 hover:bg-gray-800 text-white focus:ring-gray-400"
            }`}
          >
            {isLoading ? (
              <LoadingSpinner />
            ) : isListening ? (
              <MicOff className="w-5 h-5" />
            ) : redactedInput.trim() ? (
              <ArrowRight className="w-5 h-5" />
            ) : (
              <Mic className="w-5 h-5" />
            )}
          </button>
        </div>
      </form>
      {error && (
        <div className="text-red-500 flex items-center mt-2">
          {error}
        </div>
      )}
    </div>
  );
});

export default ChatInput;
