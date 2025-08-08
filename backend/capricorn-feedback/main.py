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

import os
import logging
import functions_framework

from flask import jsonify, request  # noqa: F401
from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail, To

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Define team recipients
TEAM_RECIPIENTS = [
    'williszhang@google.com',
    'U.ilan-2@prinsesmaximacentrum.nl'
]


@functions_framework.http
def send_feedback_email(request):  # noqa: F811
    """
    Cloud Function to send feedback emails using SendGrid.

    Args:
        request (flask.Request): The request object.

    Returns:
        The response text, or any set of values that can be turned into a
        Response object using `make_response`.
    """
    # Set CORS headers for preflight requests
    if request.method == 'OPTIONS':
        # Allows POST requests from any origin with the Content-Type
        # header and caches preflight response for 3600s
        headers = {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST',
            'Access-Control-Allow-Headers': 'Content-Type',
            'Access-Control-Max-Age': '3600'
        }
        return ('', 204, headers)

    # Set CORS headers for the main request
    headers = {
        'Access-Control-Allow-Origin': '*'
    }

    try:
        # Get request data
        request_json = request.get_json(silent=True)

        if not request_json:
            logger.error("No JSON data in request")
            return (jsonify({'success': False, 'error': 'No data provided'}), 400, headers)

        # Extract feedback data
        name = request_json.get('name', 'Anonymous User')
        email = request_json.get('email', 'No email provided')
        feedback_text = request_json.get('feedback')

        if not feedback_text:
            logger.error("No feedback text provided")
            return (jsonify({'success': False, 'error': 'No feedback text provided'}), 400, headers)

        # Get SendGrid API key from environment variable
        api_key = os.environ.get('SENDGRID_API_KEY')
        if not api_key:
            logger.error("SendGrid API key not found")
            return (jsonify({'success': False, 'error': 'Email service configuration error'}), 500, headers)

        # Create recipients list - include sender if they provided a valid email
        recipients = TEAM_RECIPIENTS.copy()
        if email and email != 'No email provided' and '@' in email:
            recipients.append(email)

        # Create email message
        message = Mail(
            from_email='williszhang@williszhang.com',
            to_emails=[To(email=recipient) for recipient in recipients],
            subject='Capricorn Medical Research App Feedback',
            html_content=f"""
            <h2>New Feedback Received</h2>
            <p><strong>From:</strong> {name}</p>
            <p><strong>Email:</strong> {email}</p>
            <p><strong>Feedback:</strong></p>
            <p>{feedback_text}</p>
            <p>Thank you for helping us improve the Capricorn Medical Research App.</p>
            """
        )

        # Send email
        sg = SendGridAPIClient(api_key)
        response = sg.send(message)

        logger.info(f"Email sent with status code: {response.status_code}")

        return (jsonify({'success': True}), 200, headers)

    except Exception as e:
        logger.error(f"Error sending email: {str(e)}")
        return (jsonify({'success': False, 'error': str(e)}), 500, headers)
