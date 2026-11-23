import json

from fastapi import APIRouter, Depends, HTTPException, status

from app.auth import get_owner
from app.db import connect
from app.schemas import ScheduleItem, ScheduleItemCreate

router = APIRouter(prefix="/items", tags=["items"])

# Items are stored per owner (signed-in Google account or guest browser), see app.auth.get_owner.


def _to_item(row) -> ScheduleItem:
    return ScheduleItem(id=row["id"], **json.loads(row["data"]))


def _serialize(payload: ScheduleItemCreate) -> str:
    return json.dumps(payload.model_dump(mode="json"))


@router.get("", response_model=list[ScheduleItem])
def list_items(owner: str = Depends(get_owner)):
    with connect() as conn:
        rows = conn.execute("SELECT id, data FROM items WHERE owner = ?", (owner,)).fetchall()
    return sorted((_to_item(r) for r in rows), key=lambda i: i.start_time)


@router.post("", response_model=ScheduleItem, status_code=status.HTTP_201_CREATED)
def create_item(payload: ScheduleItemCreate, owner: str = Depends(get_owner)):
    with connect() as conn:
        cursor = conn.execute("INSERT INTO items (owner, data) VALUES (?, ?)", (owner, _serialize(payload)))
    return ScheduleItem(id=cursor.lastrowid, **payload.model_dump())


@router.delete("", status_code=status.HTTP_204_NO_CONTENT)
def delete_all_items(owner: str = Depends(get_owner)):
    with connect() as conn:
        conn.execute("DELETE FROM items WHERE owner = ?", (owner,))


@router.get("/{item_id}", response_model=ScheduleItem)
def get_item(item_id: int, owner: str = Depends(get_owner)):
    with connect() as conn:
        row = conn.execute("SELECT id, data FROM items WHERE id = ? AND owner = ?", (item_id, owner)).fetchone()
    if row is None:
        raise HTTPException(status_code=404, detail="Item not found")
    return _to_item(row)


@router.put("/{item_id}", response_model=ScheduleItem)
def update_item(item_id: int, payload: ScheduleItemCreate, owner: str = Depends(get_owner)):
    with connect() as conn:
        cursor = conn.execute(
            "UPDATE items SET data = ? WHERE id = ? AND owner = ?",
            (_serialize(payload), item_id, owner),
        )
    if cursor.rowcount == 0:
        raise HTTPException(status_code=404, detail="Item not found")
    return ScheduleItem(id=item_id, **payload.model_dump())


@router.delete("/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_item(item_id: int, owner: str = Depends(get_owner)):
    with connect() as conn:
        cursor = conn.execute("DELETE FROM items WHERE id = ? AND owner = ?", (item_id, owner))
    if cursor.rowcount == 0:
        raise HTTPException(status_code=404, detail="Item not found")
