FROM python:3.13-slim

COPY requirements.txt .
RUN pip install -r requirements.txt

COPY main.py .

EXPOSE 8080

ENTRYPOINT ["functions-framework"]
CMD ["--target=redact_sensitive_info", "--port=8080"]