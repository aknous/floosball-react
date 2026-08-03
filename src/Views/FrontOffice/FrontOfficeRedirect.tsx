import React from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'

/**
 * `/front-office` used to be a separate hub. It served the same purpose as the
 * team page — your team — so the two were merged: everything that lived here
 * (Facilities, the vote cards, Supporter) is now a gated section on
 * `/team/:id`. This keeps old links and bookmarks working.
 */
const FrontOfficeRedirect: React.FC = () => {
  const { user, loading } = useAuth()
  if (loading) return null
  // No team picked yet — the team list is the only sensible landing place.
  if (!user?.favoriteTeamId) return <Navigate to="/teams" replace />
  return <Navigate to={`/team/${user.favoriteTeamId}`} replace />
}

export default FrontOfficeRedirect
