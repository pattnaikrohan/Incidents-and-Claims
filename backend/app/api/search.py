from fastapi import APIRouter, Depends, Query
from app.api.deps import get_current_active_user
from app.models.users import User
from app.services.search import search_client

router = APIRouter()

@router.get("/query")
def search_incidents_and_documents(
    q: str = Query(..., min_length=1, description="Search query string"),
    branch_id: int | None = Query(None, description="Optional branch ID to filter by"),
    current_user: User = Depends(get_current_active_user)
):
    """
    Search across incidents, documents (extracted OCR/Tika), and email correspondence.
    Delegates to Solr/Elasticsearch backend.
    """
    # Force branch filter if user is not risk&compliance
    effective_branch = branch_id
    if current_user.role != "risk_compliance":
        effective_branch = current_user.branch_id

    # Simulated search hit
    # In production, this would parse highlighted excerpts from `search_client.query()`
    return {
        "query": q,
        "results": [
            {
                "type": "Incident",
                "id": 1,
                "excerpt": f"...regarding {q}... cargo was damaged...",
                "relevance": 0.95
            }
        ]
    }
