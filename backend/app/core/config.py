from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "Incident & Claims Management API"
    
    # Primary application database (Postgres/SQLite/SQLServer)
    DATABASE_URL: str = "sqlite:///./sql_app.db"
    
    # Local SQL Server Enrichment (Replaces Snowflake)
    # Format: mssql+pyodbc://<user>:<password>@<host>/<db>?driver=ODBC+Driver+17+for+SQL+Server
    SQL_SERVER_ENRICHMENT_URL: str = "mssql+pyodbc://sa:YourPassword@localhost/CargoWiseDB?driver=ODBC+Driver+17+for+SQL+Server"
    
    SECRET_KEY: str = "secret-key-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7
    
    class Config:
        env_file = ".env"

settings = Settings()
