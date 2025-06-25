# Copyright 2025 Google LLC
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     https://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

import functions_framework
from flask import jsonify, request
import vertexai
from google import genai
from google.genai import types
from google.cloud import bigquery
import json
import logging
import os
from datetime import datetime

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Initialize clients with environment variables
vertexai.init(project=os.environ.get('GENAI_PROJECT_ID', 'gemini-med-lit-review'))
genai_client = genai.Client(
    vertexai=True,
    project=os.environ.get('GENAI_PROJECT_ID', 'gemini-med-lit-review'),
    location=os.environ.get('LOCATION', 'us-central1'),
)
bq_client = bigquery.Client(project=os.environ.get('BIGQUERY_PROJECT_ID', 'playground-439016'))

def get_full_articles(analyzed_articles):
    """Retrieve full article content from BigQuery using PMIDs."""
    # Extract PMIDs from articles
    pmids = [article['pmid'] for article in analyzed_articles if 'pmid' in article]
    pmids_str = ', '.join([f"'{pmid}'" for pmid in pmids])
    
    # Query to get full articles by joining pmid_embed_nonzero with pmid_metadata
    project_id = os.environ.get('BIGQUERY_PROJECT_ID', 'playground-439016')
    query = f"""
    SELECT 
        metadata.PMID,
        base.name as PMCID,  -- This is the PMCID
        base.content
    FROM `{project_id}.pmid_uscentral.pmid_embed_nonzero` base
    JOIN `{project_id}.pmid_uscentral.pmid_metadata` metadata
    ON base.name = metadata.AccessionID  -- Join on PMCID (AccessionID is PMCID)
    WHERE UPPER(metadata.PMID) IN ({','.join([f"'{pmid.upper()}'" for pmid in pmids])})
    """
    
    try:
        query_job = bq_client.query(query)
        results = list(query_job.result())
        
        if not results:
            logger.error(f"No articles found for PMIDs: {pmids}")
            return []
            
        # Create mapping of PMID to content and PMCID (normalize to lowercase pmid)
        content_map = {row['PMID'].lower(): {'content': row['content'], 'PMCID': row['PMCID']} for row in results}
        
        # Update analyzed articles with full content
        articles_with_content = []
        for article in analyzed_articles:
            pmid = article['pmid']
            if pmid in content_map:
                # Preserve all metadata and add full content
                article_with_content = article.copy()
                article_with_content['content'] = content_map[pmid]['content']
                article_with_content['PMCID'] = content_map[pmid]['PMCID']
                articles_with_content.append(article_with_content)
            else:
                logger.warning(f"No content found for pmid: {pmid}")
                
        return articles_with_content
        
    except Exception as e:
        logger.error(f"Error retrieving articles: {str(e)}")
        return []

def create_final_analysis_prompt(case_notes, disease, events, articles):
    """Create the prompt for final analysis."""
    
    # Create a table of analyzed articles
    articles_table = []
    for article in articles:
        # Format drug results as a comma-separated string
        drug_results = ', '.join(article.get('drug_results', [])) if article.get('drug_results') else 'None'
        
        # Format actionable events
        events_str = ', '.join([
            f"{event['event']} ({'matches' if event['matches_query'] else 'no match'})"
            for event in article.get('events', [])
        ])
        
        articles_table.append(f"""
PMID: {article.get('pmid', 'N/A')}
Title: {article.get('title', 'N/A')}
Journal: {article.get('journal_title', 'N/A')} (SJR: {article.get('journal_sjr', 0)})
Year: {article.get('year', 'N/A')}
Type: {article.get('paper_type', 'N/A')}
Cancer Type: {article.get('type_of_cancer', 'N/A')}
Events: {events_str}
Drug Results: {drug_results}
Points: {article.get('overall_points', 0)}
PMCID: {article.get('pmcid', 'N/A')}
Full Text:
{article.get('content', 'N/A')}
{'='*80}
""")

    prompt = f"""You are a pediatric hematologist sitting on a tumor board for patients with complex diseases. Your goal is to find the best treatment for every patient, considering their actionable events (genetic, immune-related, or other).

CASE INFORMATION:
{case_notes}

Disease: {disease}
Actionable Events: {', '.join(events)}

ANALYZED ARTICLES:
{'='*80}
{'\n'.join(articles_table)}
{'='*80}

Based on the clinical input, actionable events, and the analyzed articles above, please provide a comprehensive analysis in markdown format with the following sections:

## Case Analysis: {disease}

### 1. Case Summary
A brief paragraph summarizing the case.

### 2. Actionable Events Analysis
| Event | Type | Explanation | Targetable | Prognostic Value |
|-------|------|-------------|------------|------------------|
[Fill with event details, one row per event]

Following the table, provide a concise interpretation of the actionable events, focusing on their clinical implications, potential impact on treatment decisions, and overall prognosis. Highlight any synergistic or conflicting interactions between events.

### 3. Treatment Options
| Event | Treatment | Evidence (PMID) | Evidence Summary | Previous Response | Warnings |
|-------|-----------|----------------|------------------|-------------------|-----------|
[Fill with treatment details, one row per recommendation]

IMPORTANT FOR TREATMENT OPTIONS:
- You MUST include at least one PMID from the provided articles in the Evidence column for EACH recommendation
- DO NOT use "N/A" in the Evidence column - instead, find the most relevant article(s) from the provided list
- If multiple articles support a recommendation, include all relevant PMIDs
- If direct evidence is limited but an article suggests the approach, still cite that PMID and indicate it's a suggestion
- For every treatment recommendation, you MUST trace it back to specific information in at least one of the articles
- Format PMIDs as clickable links with publication year: [PMID: 12345 (2023)](https://pubmed.ncbi.nlm.nih.gov/12345/)

After the table, offer a succinct clinical perspective on the recommended treatments. Address the strength of evidence, potential benefits and risks, and how these treatments align with the patient's specific genetic and clinical profile. Discuss any notable drug interactions or sequencing considerations.

### 4. Multi-Target Opportunities
| Treatment Combination | Targeted Events | Evidence (PMID) | Summary |
|---------------------|-----------------|----------------|----------|
[Fill with combination details, one row per opportunity]

IMPORTANT FOR MULTI-TARGET OPPORTUNITIES:
- You MUST include at least one PMID in the Evidence column for EACH recommendation
- The definition of evidence is broader here - it includes any article that:
  * Directly studies the combination
  * Suggests the combination might be effective
  * Provides a scientific rationale for the combination
  * Discusses similar combinations in related contexts
- Format PMIDs as clickable links with publication year: [PMID: 12345 (2023)](https://pubmed.ncbi.nlm.nih.gov/12345/)
- DO NOT use "N/A" in the Evidence column

Following this table, provide a brief analysis of the multi-target approach. Evaluate the potential synergistic effects, discuss the rationale behind combining therapies, and comment on the anticipated efficacy and safety profile of these combinations in the context of this specific case.

IMPORTANT FORMATTING NOTES:
1. Use proper markdown table syntax with | separators and aligned headers
2. Format PMID links as clickable links with publication year: [PMID: 12345 (2023)](https://pubmed.ncbi.nlm.nih.gov/12345/)
3. For multiple items in a cell, use bullet points:
   * First item
   * Second item
4. Keep content concise but informative
5. Ensure table cells are properly aligned
6. Use proper markdown headers (##, ###) for sections

IMPORTANT NOTES:
- Include any warnings about sensitivities, adverse events, or allergies in the Warnings column
- If a treatment was previously used, include the response details in the Previous Response column
- Keep explanations and summaries concise but informative
- Ensure all PMIDs are formatted as clickable links
- Use bullet points in cells where multiple items need to be listed
- For each summary, prioritize clinically actionable insights. Focus on how the information in each table translates to practical decision-making in patient care. Keep the language concise and directly relevant to the case at hand.
- NEVER use "N/A" in the Evidence (PMID) columns - always find relevant articles to cite

IMPORTANT: Return the analysis in markdown format with the specified table structure. Do not include any JSON formatting."""

    return prompt

def analyze_with_gemini(prompt):
    """Analyze the case and articles using Gemini."""
    model = "gemini-2.0-flash-001"
    generate_content_config = types.GenerateContentConfig(
        temperature=0,
        top_p=0.95,
        max_output_tokens=8192,
        response_modalities=["TEXT"],
        safety_settings=[
            types.SafetySetting(category=cat, threshold="OFF")
            for cat in ["HARM_CATEGORY_HATE_SPEECH", "HARM_CATEGORY_DANGEROUS_CONTENT", 
                      "HARM_CATEGORY_SEXUALLY_EXPLICIT", "HARM_CATEGORY_HARASSMENT"]
        ]
    )
    
    contents = [types.Content(role="user", parts=[{"text": prompt}])]
    
    try:
        response = genai_client.models.generate_content(
            model=model,
            contents=contents,
            config=generate_content_config,
        )
        
        # Return the markdown text directly
        return {"markdown_content": response.text.strip()}
        
    except Exception as e:
        logger.error(f"Error in analyze_with_gemini: {str(e)}")
        return None

@functions_framework.http
def final_analysis(request):
    """HTTP Cloud Function for final analysis."""
    # Handle CORS
    if request.method == 'OPTIONS':
        headers = {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST',
            'Access-Control-Allow-Headers': 'Content-Type',
            'Access-Control-Max-Age': '3600'
        }
        return ('', 204, headers)

    headers = {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
    }

    try:
        request_json = request.get_json()
        logger.info(f"Received request body: {json.dumps(request_json, indent=2)}")
        
        if not request_json:
            logger.error("No JSON data received in request")
            return jsonify({'error': 'No JSON data received'}), 400, headers

        # Extract required fields
        case_notes = request_json.get('case_notes')
        disease = request_json.get('disease')
        events = request_json.get('events')
        analyzed_articles = request_json.get('analyzed_articles')

        # Log each field's presence/absence
        missing_fields = []
        if not case_notes:
            missing_fields.append('case_notes')
        if not disease:
            missing_fields.append('disease')
        if not events:
            missing_fields.append('events')
        if not analyzed_articles:
            missing_fields.append('analyzed_articles')

        if missing_fields:
            error_msg = f"Missing required fields: {', '.join(missing_fields)}"
            logger.error(error_msg)
            return jsonify({'error': error_msg}), 400, headers

        # Log analyzed articles before BigQuery
        logger.info(f"Analyzed articles before BigQuery: {json.dumps(analyzed_articles, indent=2)}")

        # Get full articles from BigQuery while preserving metadata
        articles_with_content = get_full_articles(analyzed_articles)
        
        # Log articles after BigQuery
        logger.info(f"Articles after BigQuery retrieval: {json.dumps(articles_with_content, indent=2)}")
        
        if not articles_with_content:
            logger.error("Failed to retrieve any articles from BigQuery")
            return jsonify({'error': 'Failed to retrieve articles from BigQuery'}), 500, headers

        # Create prompt and analyze
        prompt = create_final_analysis_prompt(case_notes, disease, events, articles_with_content)
        analysis = analyze_with_gemini(prompt)

        if not analysis:
            return jsonify({'error': 'Failed to generate analysis'}), 500, headers

        return jsonify({
            'success': True,
            'analysis': analysis
        }), 200, headers

    except Exception as e:
        logger.error(f"Error in final_analysis: {str(e)}")
        return jsonify({'error': str(e)}), 500, headers

if __name__ == "__main__":
    app = functions_framework.create_app(target="final_analysis")
    app.run(host="0.0.0.0", port=8080, debug=True)
