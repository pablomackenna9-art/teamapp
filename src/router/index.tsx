import { createBrowserRouter, Navigate } from 'react-router-dom'
import { RootLayout } from './RootLayout'
import { TeamLayout } from './TeamLayout'
import { AuthLayout } from './AuthLayout'

import { LoginPage } from '@/pages/auth/LoginPage'
import { RegisterPage } from '@/pages/auth/RegisterPage'
import { TeamsPage } from '@/pages/team/TeamsPage'
import { NewTeamPage } from '@/pages/team/NewTeamPage'
import { DashboardPage } from '@/pages/dashboard/DashboardPage'
import { SquadPage } from '@/pages/squad/SquadPage'
import { PlayerPage } from '@/pages/squad/PlayerPage'
import { MatchesPage } from '@/pages/matches/MatchesPage'
import { MatchDetailPage } from '@/pages/matches/MatchDetailPage'
import { NewMatchPage } from '@/pages/matches/NewMatchPage'
import { StatsPage } from '@/pages/stats/StatsPage'
import { StandingsPage } from '@/pages/standings/StandingsPage'
import { PhotosPage } from '@/pages/photos/PhotosPage'
import { NewsPage } from '@/pages/news/NewsPage'
import { MorePage } from '@/pages/more/MorePage'
import { LineupPage } from '@/pages/matches/LineupPage'
import { FixturePage } from '@/pages/fixture/FixturePage'
import { RankingsPage } from '@/pages/rankings/RankingsPage'
import { AdminPanelPage } from '@/pages/admin/AdminPanelPage'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <RootLayout />,
    children: [
      { index: true, element: <Navigate to="/teams" replace /> },
      {
        element: <AuthLayout />,
        children: [
          { path: 'login', element: <LoginPage /> },
          { path: 'register', element: <RegisterPage /> },
        ],
      },
      { path: 'teams', element: <TeamsPage /> },
      { path: 'teams/new', element: <NewTeamPage /> },
      { path: 'rankings', element: <RankingsPage /> },
      { path: 'admin', element: <AdminPanelPage /> },
      {
        path: 'team/:slug',
        element: <TeamLayout />,
        children: [
          { index: true, element: <DashboardPage /> },
          { path: 'squad', element: <SquadPage /> },
          { path: 'squad/:playerId', element: <PlayerPage /> },
          { path: 'matches', element: <MatchesPage /> },
          { path: 'matches/new', element: <NewMatchPage /> },
          { path: 'matches/:matchId', element: <MatchDetailPage /> },
          { path: 'matches/:matchId/lineup', element: <LineupPage /> },
          { path: 'stats', element: <StatsPage /> },
          { path: 'standings', element: <StandingsPage /> },
          { path: 'photos', element: <PhotosPage /> },
          { path: 'news', element: <NewsPage /> },
          { path: 'more', element: <MorePage /> },
          { path: 'fixture', element: <FixturePage /> },
        ],
      },
    ],
  },
])
