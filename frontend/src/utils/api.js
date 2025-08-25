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

// src/utils/api.js
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;
const GENERATE_CASE_URL = process.env.REACT_APP_GENERATE_CASE_URL;

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const retrieveAndAnalyzeArticles = async (disease, events, methodologyContent, onProgress, numArticles = 15) => {
  try {
    // Step 1: Get PMIDs and analysis from first cloud function
    const response = await api.post('/capricorn-retrieve-full-articles', {
      events_text: events.join('\n'),
      methodology_content: methodologyContent,
      disease: disease,
      num_articles: numArticles
    }, {
      responseType: 'stream' // Important for handling streams with axios
    });

    const reader = response.data; // Axios provides the stream directly in response.data
    const decoder = new TextDecoder();
    let buffer = '';

    reader.on('data', (chunk) => {
      buffer += decoder.decode(chunk, { stream: true });

      let lineEnd = buffer.indexOf('\n');
      while (lineEnd !== -1) {
        const line = buffer.slice(0, lineEnd).trim();
        buffer = buffer.slice(lineEnd + 1);

        if (!line) continue;

        try {
          const data = JSON.parse(line);
          if (data && typeof data === 'object' && data.type) {
            onProgress(data);
          }
        } catch (parseError) {
          console.error('Error parsing line:', line);
          console.error('Parse error:', parseError);
        }

        lineEnd = buffer.indexOf('\n');
      }
    });

    await new Promise((resolve, reject) => {
      reader.on('end', resolve);
      reader.on('error', reject);
    });

  } catch (error) {
    console.error('Error:', error);
    throw error;
  }
};

export const streamChat = async (message, userId, chatId, onChunk) => {
  try {
    const response = await api.post('/capricorn-chat', {
      message,
      userId,
      chatId
    }, {
      responseType: 'stream'
    });

    const reader = response.data;
    const decoder = new TextDecoder();

    reader.on('data', (chunk) => {
      const decodedChunk = decoder.decode(chunk);
      const lines = decodedChunk.split('\n');

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data === '[DONE]') {
            break;
          }
          try {
            const parsed = JSON.parse(data);
            if (parsed.text) {
              onChunk(parsed.text);
            }
          } catch (e) {
            console.error('Error parsing SSE data:', e);
          }
        }
      }
    });

    await new Promise((resolve, reject) => {
      reader.on('end', resolve);
      reader.on('error', reject);
    });

  } catch (error) {
    console.error('Error in chat stream:', error);
    throw error;
  }
};

/**
 * Redacts sensitive information from text while preserving medical terms, age, and gender
 * @param {string} text - The text to redact
 * @returns {Promise<string>} - A promise that resolves to the redacted text
 */
export const redactSensitiveInfo = async (text) => {
  try {
    const response = await api.post('/capricorn-redact-sensitive-info', { text });
    return response.data.redactedText;
  } catch (error) {
    console.error('Error redacting sensitive information:', error);
    throw new Error(`Failed to redact sensitive information: ${error.message}`);
  }
};

export const extractDisease = async (text) => {
  try {
    const response = await api.post('/pubmed-search-tester-extract-disease', { text });
    return response.data.trim();
  } catch (error) {
    console.error('Error:', error);
    throw error;
  }
};

export const extractEvents = async (text, promptContent) => {
  try {
    const response = await api.post('/pubmed-search-tester-extract-events', { text: `${promptContent}\n\nCase input:\n${text}` });
    return response.data.split('"').filter(event => event.trim() && event !== ' ');
  } catch (error) {
    console.error('Error:', error);
    throw error;
  }
};

/**
 * Generates a sample medical case
 * @returns {Promise<string>} - A promise that resolves to a generated sample medical case
 */
export const generateSampleCase = async () => {
  try {
    const response = await axios.get(GENERATE_CASE_URL, {
      headers: {
        'Content-Type': 'application/json',
      },
      withCredentials: true,
    });
    return response.data.medical_case;
  } catch (error) {
    console.error('Error generating sample case:', error);
    throw new Error(`Failed to generate sample case: ${error.message}`);
  }
};

/**
 * Saves a new template or updates an existing one
 * @param {Object} template - The template object to save
 * @returns {Promise<Object>} - A promise that resolves to the saved template object
 */
export const saveTemplate = async (template) => {
  try {
    const response = await api.post('/templates', template, {
      withCredentials: true,
    });
    return response.data.template;
  } catch (error) {
    console.error('Error saving template:', error);
    throw new Error(`Failed to save template: ${error.message}`);
  }
};

/**
 * Fetches all saved templates
 * @returns {Promise<Array>} - A promise that resolves to an array of template objects
 */
export const fetchTemplates = async () => {
  try {
    const response = await api.get('/templates', {
      withCredentials: true,
    });
    return response.data.templates;
  } catch (error) {
    console.error('Error fetching templates:', error);
    throw new Error(`Failed to fetch templates: ${error.message}`);
  }
};

/**
 * Deletes a template
 * @param {string} templateId - The ID of the template to delete
 * @returns {Promise<void>}
 */
export const deleteTemplate = async (templateId) => {
  try {
    await api.delete(`/templates/${templateId}`, {
      withCredentials: true,
    });
  } catch (error) {
    console.error('Error deleting template:', error);
    throw new Error(`Failed to delete template: ${error.message}`);
  }
};

/**
 * Generates a final analysis based on case notes, disease, events, and analyzed articles
 * @param {string} caseNotes - The patient's case notes
 * @param {string} disease - The extracted disease
 * @param {Array} events - The extracted actionable events
 * @param {Array} analyzedArticles - The analyzed articles with their metadata
 * @returns {Promise<Object>} - A promise that resolves to the final analysis object
 */
export const generateFinalAnalysis = async (caseNotes, disease, events, analyzedArticles) => {
  try {
    console.log('LOADING_DEBUG: Starting final analysis request with:', {
      case_notes: caseNotes,
      disease,
      events,
      analyzed_articles: analyzedArticles
    });

    const response = await api.post('/capricorn-final-analysis', {
      case_notes: caseNotes,
      disease,
      events,
      analyzed_articles: analyzedArticles
    });

    console.log('LOADING_DEBUG: Final analysis response received');
    return response.data.analysis;
  } catch (error) {
    console.error('Error generating final analysis:', error);
    throw new Error(`Failed to generate final analysis: ${error.message}`);
  }
};

/**
 * Sends user feedback to the feedback endpoint
 * @param {Object} feedbackData - The feedback data object containing name, email, and feedback
 * @returns {Promise<Object>} - A promise that resolves to the response object
 */
export const sendFeedback = async (feedbackData) => {
  try {
    const response = await api.post('/capricorn-feedback', feedbackData);
    return response.data;
  } catch (error) {
    console.error('Error sending feedback:', error);
    throw new Error(`Failed to send feedback: ${error.message}`);
  }
};

/**
 * Processes a PDF lab report to extract genomic information
 * @param {string} pdfBase64 - The base64 encoded PDF content
 * @returns {Promise<Object>} - A promise that resolves to the extracted genomic data
 */
export const processLabPDF = async (pdfBase64) => {
  try {
    const response = await api.post('/capricorn-process-lab', { pdf_data: pdfBase64 });
    
    if (response.data.success) {
      return response.data.data;
    } else {
      throw new Error(response.data.error || 'Failed to process PDF');
    }
  } catch (error) {
    console.error('Error processing lab PDF:', error);
    throw new Error(`Failed to process lab PDF: ${error.message}`);
  }
};
