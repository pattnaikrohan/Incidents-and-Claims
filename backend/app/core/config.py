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
    
    # Azure AD / Entra ID Configuration
    AZURE_AD_CLIENT_ID: str = "51187ec7-4430-485a-bb6a-d3f70f83ff77"
    AZURE_AD_TENANT_ID: str = "9a3bb301-12fd-4106-a7f7-563f72cfdf69"
    AZURE_AD_ENABLED: bool = True
    
    class Config:
        env_file = ".env"
        extra = "ignore"

settings = Settings()
