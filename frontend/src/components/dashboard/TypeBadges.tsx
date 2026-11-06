import type { ItemType } from '../../api/items'

const LABELS: Record<ItemType, string> = { lecture: 'Lecture', lab: 'Lab' }

function TypeBadges({ types }: { types: ItemType[] }) {
  return (
    <>
      {types.map((type) => (
        <span key={type} className={`badge badge-${type}`}>
          {LABELS[type]}
        </span>
      ))}
    </>
  )
}

export default TypeBadges
