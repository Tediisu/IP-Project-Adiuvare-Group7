from itertools import count

from fastapi import APIRouter, HTTPException, status

from app.schemas import ScheduleItem, ScheduleItemCreate

router = APIRouter(prefix="/items", tags=["items"])

# In-memory store until a database is added; resets on restart.
_items: dict[int, ScheduleItem] = {}
_ids = count(1)


def _get_or_404(item_id: int) -> ScheduleItem:
    item = _items.get(item_id)
    if item is None:
        raise HTTPException(status_code=404, detail="Item not found")
    return item


@router.get("", response_model=list[ScheduleItem])
def list_items():
    return sorted(_items.values(), key=lambda i: i.start_time)


@router.post("", response_model=ScheduleItem, status_code=status.HTTP_201_CREATED)
def create_item(payload: ScheduleItemCreate):
    item = ScheduleItem(id=next(_ids), **payload.model_dump())
    _items[item.id] = item
    return item


@router.delete("", status_code=status.HTTP_204_NO_CONTENT)
def delete_all_items():
    _items.clear()


@router.get("/{item_id}", response_model=ScheduleItem)
def get_item(item_id: int):
    return _get_or_404(item_id)


@router.put("/{item_id}", response_model=ScheduleItem)
def update_item(item_id: int, payload: ScheduleItemCreate):
    _get_or_404(item_id)
    item = ScheduleItem(id=item_id, **payload.model_dump())
    _items[item_id] = item
    return item


@router.delete("/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_item(item_id: int):
    _get_or_404(item_id)
    del _items[item_id]
