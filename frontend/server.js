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

const express = require('express');
const path = require('path');
const cors = require('cors');
const axios = require('axios'); // Add axios
const app = express();

// Add body parser for JSON
app.use(express.json());

// Define backend API base URL
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

// CORS configuration
const corsOptions = {
  origin: [
    'http://localhost:8080',
    'http://localhost:3000',
    'https://lh3.googleusercontent.com',
  ],
  credentials: true,
  optionsSuccessStatus: 200
};

// Apply CORS middleware
app.use(cors(corsOptions));

app.get('/api/config', async (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    try {
      const getMetadata = async (variable) => {
        const url = `http://metadata.google.internal/computeMetadata/v1/instance/attributes/${variable}`;
        const response = await axios.get(url, {
          headers: { 'Metadata-Flavor': 'Google' },
        });
        return response.data;
      };

      const config = {
        REACT_APP_FRONTEND_SERVER_URL: await getMetadata('REACT_APP_FRONTEND_SERVER_URL'),
        REACT_APP_API_BASE_URL: await getMetadata('REACT_APP_API_BASE_URL'),
        REACT_APP_FIREBASE_API_KEY: await getMetadata('REACT_APP_FIREBASE_API_KEY'),
        REACT_APP_FIREBASE_AUTH_DOMAIN: await getMetadata('REACT_APP_FIREBASE_AUTH_DOMAIN'),
        REACT_APP_FIREBASE_PROJECT_ID: await getMetadata('REACT_APP_FIREBASE_PROJECT_ID'),
        REACT_APP_FIREBASE_STORAGE_BUCKET: await getMetadata('REACT_APP_FIREBASE_STORAGE_BUCKET'),
        REACT_APP_FIREBASE_MESSAGING_SENDER_ID: await getMetadata('REACT_APP_FIREBASE_MESSAGING_SENDER_ID'),
        REACT_APP_FIREBASE_APP_ID: await getMetadata('REACT_APP_FIREBASE_APP_ID'),
        REACT_APP_FIREBASE_MEASUREMENT_ID: await getMetadata('REACT_APP_FIREBASE_MEASUREMENT_ID'),
      };
      res.json(config);
    } catch (error) {
      console.error('Error fetching metadata from Google Cloud:', error.message);
      res.status(500).send('Error fetching configuration');
    }
  } else {
    // Fallback for local development
    res.json({
      REACT_APP_FRONTEND_SERVER_URL: process.env.REACT_APP_FRONTEND_SERVER_URL,
      REACT_APP_API_BASE_URL: process.env.REACT_APP_API_BASE_URL,
      REACT_APP_FIREBASE_API_KEY: process.env.REACT_APP_FIREBASE_API_KEY,
      REACT_APP_FIREBASE_AUTH_DOMAIN: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
      REACT_APP_FIREBASE_PROJECT_ID: process.env.REACT_APP_FIREBASE_PROJECT_ID,
      REACT_APP_FIREBASE_STORAGE_BUCKET: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
      REACT_APP_FIREBASE_MESSAGING_SENDER_ID: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
      REACT_APP_FIREBASE_APP_ID: process.env.REACT_APP_FIREBASE_APP_ID,
      REACT_APP_FIREBASE_MEASUREMENT_ID: process.env.REACT_APP_FIREBASE_MEASUREMENT_ID,
    });
  }
});

// Serve static files from the React app build directory
app.use(express.static(path.join(__dirname, 'build')));

// Proxy API requests to the backend
app.post('/capricorn-retrieve-full-articles', async (req, res) => {
  try {
    const backendResponse = await axios.post(`${API_BASE_URL}/capricorn-retrieve-full-articles`, req.body, {
      responseType: 'stream'
    });
    backendResponse.data.pipe(res); // Pipe the backend stream directly to the frontend response
  } catch (error) {
    console.error('Error proxying /capricorn-retrieve-full-articles:', error.message);
    res.status(error.response?.status || 500).send(error.message);
  }
});

app.post('/capricorn-chat', async (req, res) => {
  try {
    const backendResponse = await axios.post(`${API_BASE_URL}/capricorn-chat`, req.body, {
      responseType: 'stream'
    });
    backendResponse.data.pipe(res);
  } catch (error) {
    console.error('Error proxying /capricorn-chat:', error.message);
    res.status(error.response?.status || 500).send(error.message);
  }
});

app.post('/capricorn-redact-sensitive-info', async (req, res) => {
  try {
    const backendResponse = await axios.post(`${API_BASE_URL}/capricorn-redact-sensitive-info`, req.body);
    res.json(backendResponse.data);
  } catch (error) {
    console.error('Error proxying /capricorn-redact-sensitive-info:', error.message);
    res.status(error.response?.status || 500).send(error.message);
  }
});

app.post('/pubmed-search-tester-extract-disease', async (req, res) => {
  try {
    const backendResponse = await axios.post(`${API_BASE_URL}/pubmed-search-tester-extract-disease`, req.body);
    res.json(backendResponse.data);
  } catch (error) {
    console.error('Error proxying /pubmed-search-tester-extract-disease:', error.message);
    res.status(error.response?.status || 500).send(error.message);
  }
});

app.post('/pubmed-search-tester-extract-events', async (req, res) => {
  try {
    const backendResponse = await axios.post(`${API_BASE_URL}/pubmed-search-tester-extract-events`, req.body);
    res.json(backendResponse.data);
  } catch (error) {
    console.error('Error proxying /pubmed-search-tester-extract-events:', error.message);
    res.status(error.response?.status || 500).send(error.message);
  }
});

app.post('/templates', async (req, res) => {
  try {
    const backendResponse = await axios.post(`${API_BASE_URL}/templates`, req.body);
    res.json(backendResponse.data);
  } catch (error) {
    console.error('Error proxying /templates (POST):', error.message);
    res.status(error.response?.status || 500).send(error.message);
  }
});

app.get('/templates', async (req, res) => {
  try {
    const backendResponse = await axios.get(`${API_BASE_URL}/templates`);
    res.json(backendResponse.data);
  } catch (error) {
    console.error('Error proxying /templates (GET):', error.message);
    res.status(error.response?.status || 500).send(error.message);
  }
});

app.delete('/templates/:templateId', async (req, res) => {
  try {
    const { templateId } = req.params;
    await axios.delete(`${API_BASE_URL}/templates/${templateId}`);
    res.status(200).send();
  } catch (error) {
    console.error('Error proxying /templates (DELETE):', error.message);
    res.status(error.response?.status || 500).send(error.message);
  }
});

app.post('/capricorn-final-analysis', async (req, res) => {
  try {
    const backendResponse = await axios.post(`${API_BASE_URL}/capricorn-final-analysis`, req.body);
    res.json(backendResponse.data);
  } catch (error) {
    console.error('Error proxying /capricorn-final-analysis:', error.message);
    res.status(error.response?.status || 500).send(error.message);
  }
});

app.post('/capricorn-feedback', async (req, res) => {
  try {
    const backendResponse = await axios.post(`${API_BASE_URL}/capricorn-feedback`, req.body);
    res.json(backendResponse.data);
  } catch (error) {
    console.error('Error proxying /capricorn-feedback:', error.message);
    res.status(error.response?.status || 500).send(error.message);
  }
});

app.post('/capricorn-process-lab', async (req, res) => {
  try {
    const backendResponse = await axios.post(`${API_BASE_URL}/capricorn-process-lab`, req.body);
    res.json(backendResponse.data);
  } catch (error) {
    console.error('Error proxying /capricorn-process-lab:', error.message);
    res.status(error.response?.status || 500).send(error.message);
  }
});

// Proxy for generateSampleCase
app.get('/generate-sample-case', async (req, res) => {
  try {
    const backendResponse = await axios.get(API_BASE_URL + '/generate-sample-case'); // Use API_BASE_URL directly
    res.json(backendResponse.data);
  } catch (error) {
    console.error('Error proxying /generate-sample-case:', error.message);
    res.status(error.response?.status || 500).send(error.message);
  }
});

// All remaining requests return the React app, so it can handle routing
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

const port = process.env.PORT || 8080;
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
