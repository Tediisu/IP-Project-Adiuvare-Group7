import { type DragEvent, useRef, useState } from 'react'
import uploadIcon from '../../assets/icons/upload.svg'
import Modal, { ModalCloseButton } from '../Modal'
import './ImportImageModal.css'

interface ImportImageModalProps {
  onClose: () => void
  onFile: (file: File) => void
}

const ACCEPTED_TYPES = ['image/jpeg', 'image/png']
const MAX_BYTES = 15 * 1024 * 1024

function ImportImageModal({ onClose, onFile }: ImportImageModalProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function handleFile(file: File | undefined) {
    if (!file) return
    if (!ACCEPTED_TYPES.includes(file.type)) return setError('Only JPG or PNG images are supported.')
    if (file.size > MAX_BYTES) return setError('That image is larger than 15 MB.')
    setError(null)
    onFile(file)
  }

  function handleDrop(e: DragEvent) {
    e.preventDefault()
    setDragging(false)
    handleFile(e.dataTransfer.files[0])
  }

  return (
    <Modal onClose={onClose} labelledBy="import-image-title" width={576}>
      <div className="modal-header">
        <div>
          <h2 id="import-image-title" className="modal-title">
            Import Schedule from Image
          </h2>
          <p className="modal-subtitle">Upload a JPG or PNG of your class schedule</p>
        </div>
        <ModalCloseButton onClick={onClose} />
      </div>

      <div className="modal-body">
        <div
          className={`dropzone${dragging ? ' dragging' : ''}`}
          role="button"
          tabIndex={0}
          onClick={() => inputRef.current?.click()}
          onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault()
            setDragging(true)
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
        >
          <div className="dropzone-icon">
            <img src={uploadIcon} alt="" width={27.986} height={27.986} />
          </div>
          <div className="dropzone-text">
            <strong>Drag &amp; drop your schedule image</strong>
            <span>or click to browse files</span>
          </div>
          <span className="btn btn-primary">Browse Files</span>
          <span className="dropzone-hint">JPG or PNG · Max 15 MB</span>
          {error && <span className="form-error">{error}</span>}
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPTED_TYPES.join(',')}
            hidden
            onChange={(e) => handleFile(e.target.files?.[0])}
          />
        </div>
      </div>
    </Modal>
  )
}

export default ImportImageModal
