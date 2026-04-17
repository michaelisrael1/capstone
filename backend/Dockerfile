# 1. Start with a lightweight Python image
FROM python:3.12-slim

# 2. Set the directory where your code will live inside the container
WORKDIR /code

# 3. Copy the requirements file first to take advantage of Docker caching
COPY ./backend/requirements.txt /code/backend/requirements.txt
# 4. Install your Python dependencies
RUN pip install --no-cache-dir --upgrade -r /code/backend/requirements.txt

# 5. Copy your 'app' folder into the container

COPY ./conversion /code/conversion
COPY ./backend /code/backend


# 6. The command to start the FastAPI server
CMD ["fastapi", "run", "backend/app/main.py", "--port", "8000", "--proxy-headers"]
