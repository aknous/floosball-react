import { useCallback, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useIsMobile } from './useIsMobile'

/**
 * Opening a game means two different things depending on the screen.
 *
 * On desktop it navigates to `/game/:id`, the game's own route — the page that
 * has room for the Bleachers rail, which is the whole reason it stopped being a
 * modal. On mobile it still opens the modal: the redesigned pages are a fixed
 * 1440px desktop layout (see the shell switch in `App.js`), and the route
 * inherits that.
 *
 * Every surface that lists games uses this, so there is one answer to "what
 * happens when you click a game" rather than one per page.
 */
export function useOpenGame() {
  const navigate = useNavigate()
  const isMobile = useIsMobile()
  const [modalGameId, setModalGameId] = useState<number | null>(null)

  const openGame = useCallback((gameId: number | null) => {
    if (gameId == null) { setModalGameId(null); return }
    if (isMobile) { setModalGameId(gameId); return }
    navigate(`/game/${gameId}`)
  }, [isMobile, navigate])

  const closeGame = useCallback(() => setModalGameId(null), [])

  return { openGame, modalGameId, closeGame }
}
