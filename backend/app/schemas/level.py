from typing import Any, Dict, Optional

from pydantic import BaseModel


class LevelResponse(BaseModel):
    id: int
    title: str
    description: str
    order_num: int
    content_data: Optional[Dict[str, Any]] = None


class LevelListResponse(BaseModel):
    id: int
    title: str
    description: str
    order_num: int
