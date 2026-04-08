import logging
import sys
import os
from fastapi import FastAPI, UploadFile, File, HTTPException
from sqlalchemy import create_engine, text
from pythonjsonlogger import jsonlogger
from utils.connection import DatabaseClient
import datetime
import pandas as pd
import io
import openpyxl

logger = logging.getLogger()
logHandler = logging.StreamHandler(sys.stdout)
formatter = jsonlogger.JsonFormatter()
logHandler.setFormatter(formatter)
logger.addHandler(logHandler)
logger.setLevel(logging.INFO)

db_client = DatabaseClient()
DB_HOST = os.getenv("DB_HOST", "db")

app = FastAPI(root_path="/api")

@app.get("/health", tags=["Health Check"])
def health_check():
    logger.info("health_check_called")
    return {"status": "online", "message": "FastAPI is running on Fedora"}

@app.get("/db-time", tags=["Database"])
def get_db_time():
    logger.info("db_time_endpoint_called")
    try:
        result = db_client.send_query("SELECT NOW()")
        db_time = result[0][0]
        logger.info("database_query_success", extra={"db_time": str(db_time)})
        return {
            "status": "success",
            "database_time": str(db_time),
            "host": DB_HOST
        }
    except Exception as e:
        logger.error("database_query_failed", extra={"error": str(e)})
        return {
            "status": "error",
            "message": "Internal Server Error"
        }

@app.post("/database/import", tags=["Database"])
async def import_database(file: UploadFile = File(...)):
    filename = file.filename.lower()
    contents = await file.read()
    
    try:
        if filename.endswith('.xlsx') or filename.endswith('.xls'):
            df = pd.read_excel(io.BytesIO(contents))
            
        elif filename.endswith('.csv'):
            df = pd.read_csv(io.BytesIO(contents))
        
        else:
            raise HTTPException(
                status_code=400, 
                detail="Unsupported file extension. Please upload .csv or .xlsx"
            )

        print(df.head()) 
        return {
            "filename": file.filename,
            "detected_type": "Excel" if "xls" in filename else "CSV",
            "row_count": len(df),
            "columns": df.columns.tolist()
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error parsing file: {str(e)}")
    finally:
        await file.close()