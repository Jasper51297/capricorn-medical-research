FROM python:3.13-slim

COPY requirements.txt .
RUN pip install -r requirements.txt

COPY main.py .

EXPOSE 8080
CMD ["functions-framework" "--target=retrieve_full_articles" "--port=8080"]