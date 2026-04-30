from celery import Celery

celery_app = Celery(
    "worker",
    broker="redis://localhost:6379/0",
    backend="redis://localhost:6379/0"
)

celery_app.conf.task_routes = {
    "app.worker.ocr_task": "main-queue",
    "app.worker.email_task": "main-queue",
    "app.worker.snowflake_enrichment": "main-queue"
}
