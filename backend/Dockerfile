# 1. Start with a lightweight Python image
FROM python:3.12-slim

# 2. Set the directory where your code will live inside the container
WORKDIR /code

# 3. Copy the requirements file first to take advantage of Docker caching
COPY ./requirements.txt /code/requirements.txt

# 4. Install your Python dependencies
RUN pip install --no-cache-dir --upgrade -r /code/requirements.txt

# 5. Copy your 'app' folder into the container
COPY ./app /code/app

# 6. The command to start the FastAPI server
CMD ["fastapi", "run", "app/main.py", "--port", "8000", "--proxy-headers"]