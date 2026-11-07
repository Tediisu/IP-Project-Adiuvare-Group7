import { Link } from 'react-router'

function NotFoundPage() {
  return (
    <main className="not-found">
      <h1>Page not found</h1>
      <Link className="btn btn-primary" to="/">
        Back to home
      </Link>
    </main>
  )
}

export default NotFoundPage
