FROM python:3.14-slim

COPY requirements.txt .
RUN pip install -r requirements.txt

COPY main.py .

EXPOSE 8080
CMD ["functions-framework" "--target=final_analysis" "--port=8080"]