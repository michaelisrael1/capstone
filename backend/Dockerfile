FROM python:3.12-slim

WORKDIR /code

COPY ./backend/requirements.txt .
RUN pip install --no-cache-dir --upgrade -r requirements.txt

COPY . .

CMD ["fastapi", "run", "backend/app/main.py", "--port", "8000", "--proxy-headers"]
