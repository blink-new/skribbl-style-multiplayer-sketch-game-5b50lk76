import { Card } from './ui/card'
import { Badge } from './ui/badge'
import { Avatar, AvatarFallback } from './ui/avatar'
import { Crown, Palette, Trophy, Users } from 'lucide-react'

interface Player {
  id: string
  userId: string
  displayName: string
  score: number
  isReady: boolean
  team?: string | null
}

interface PlayerListProps {
  players: Player[]
  currentDrawerId: string | null
  hostId: string
  teamMode?: boolean
}

export function PlayerList({ players, currentDrawerId, hostId, teamMode = false }: PlayerListProps) {
  const sortedPlayers = [...players].sort((a, b) => b.score - a.score)

  const getPlayerIcon = (player: Player) => {
    if (player.userId === hostId) {
      return <Crown className="h-4 w-4 text-yellow-500" />
    }
    if (player.userId === currentDrawerId) {
      return <Palette className="h-4 w-4 text-primary" />
    }
    return null
  }

  const getPlayerBadge = (player: Player, index: number) => {
    if (player.userId === currentDrawerId) {
      return <Badge variant="default" className="text-xs">Drawing</Badge>
    }
    if (index === 0 && player.score > 0) {
      return <Badge variant="secondary" className="text-xs flex items-center gap-1">
        <Trophy className="h-3 w-3" />
        Leader
      </Badge>
    }
    return null
  }

  const getTeamColor = (team: string | null | undefined) => {
    if (!team) return ''
    return team === 'red' 
      ? 'border-l-4 border-red-500 bg-red-50' 
      : 'border-l-4 border-blue-500 bg-blue-50'
  }

  const getTeamStats = () => {
    if (!teamMode) return null
    
    const redTeam = players.filter(p => p.team === 'red')
    const blueTeam = players.filter(p => p.team === 'blue')
    const redScore = redTeam.reduce((sum, p) => sum + p.score, 0)
    const blueScore = blueTeam.reduce((sum, p) => sum + p.score, 0)
    
    return { redTeam, blueTeam, redScore, blueScore }
  }

  const teamStats = getTeamStats()

  if (teamMode && teamStats) {
    return (
      <Card className="p-4 h-full">
        <div className="flex items-center gap-2 mb-4">
          <h3 className="font-heading text-lg text-primary">Teams</h3>
          <Badge variant="outline" className="text-xs">
            {players.length}
          </Badge>
        </div>

        {/* Team Scores */}
        <div className="grid grid-cols-2 gap-2 mb-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-center">
            <div className="text-red-600 font-bold text-lg">{teamStats.redScore}</div>
            <div className="text-red-500 text-xs">Red Team</div>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-center">
            <div className="text-blue-600 font-bold text-lg">{teamStats.blueScore}</div>
            <div className="text-blue-500 text-xs">Blue Team</div>
          </div>
        </div>

        {/* Red Team */}
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-2">
            <Users className="h-4 w-4 text-red-500" />
            <span className="font-medium text-sm text-red-600">Red Team</span>
            <Badge variant="outline" className="text-xs text-red-500">
              {teamStats.redTeam.length}
            </Badge>
          </div>
          <div className="space-y-2">
            {teamStats.redTeam.map((player) => (
              <div
                key={player.id}
                className={`flex items-center gap-3 p-2 rounded-lg transition-all border-l-4 border-red-500 bg-red-50 ${
                  player.userId === currentDrawerId ? 'ring-2 ring-primary/20' : ''
                }`}
              >
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-red-500 text-white font-bold text-xs">
                    {player.displayName.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1">
                    {getPlayerIcon(player)}
                    <span className="font-medium text-xs truncate">
                      {player.displayName}
                    </span>
                  </div>
                  <div className="text-xs text-red-600">{player.score} pts</div>
                </div>
                {getPlayerBadge(player, 0)}
              </div>
            ))}
          </div>
        </div>

        {/* Blue Team */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Users className="h-4 w-4 text-blue-500" />
            <span className="font-medium text-sm text-blue-600">Blue Team</span>
            <Badge variant="outline" className="text-xs text-blue-500">
              {teamStats.blueTeam.length}
            </Badge>
          </div>
          <div className="space-y-2">
            {teamStats.blueTeam.map((player) => (
              <div
                key={player.id}
                className={`flex items-center gap-3 p-2 rounded-lg transition-all border-l-4 border-blue-500 bg-blue-50 ${
                  player.userId === currentDrawerId ? 'ring-2 ring-primary/20' : ''
                }`}
              >
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-blue-500 text-white font-bold text-xs">
                    {player.displayName.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1">
                    {getPlayerIcon(player)}
                    <span className="font-medium text-xs truncate">
                      {player.displayName}
                    </span>
                  </div>
                  <div className="text-xs text-blue-600">{player.score} pts</div>
                </div>
                {getPlayerBadge(player, 0)}
              </div>
            ))}
          </div>
        </div>

        {players.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <p className="text-sm">No players yet</p>
            <p className="text-xs mt-1">Share the room code to invite friends!</p>
          </div>
        )}
      </Card>
    )
  }

  // Regular mode (non-team)
  return (
    <Card className="p-4 h-full">
      <div className="flex items-center gap-2 mb-4">
        <h3 className="font-heading text-lg text-primary">Players</h3>
        <Badge variant="outline" className="text-xs">
          {players.length}
        </Badge>
      </div>

      <div className="space-y-3">
        {sortedPlayers.map((player, index) => (
          <div
            key={player.id}
            className={`flex items-center gap-3 p-3 rounded-lg transition-all ${
              player.userId === currentDrawerId
                ? 'bg-primary/10 border border-primary/20'
                : 'bg-muted/50 hover:bg-muted'
            } ${getTeamColor(player.team)}`}
          >
            {/* Avatar */}
            <Avatar className="h-10 w-10">
              <AvatarFallback className={`font-bold text-white ${
                player.team === 'red' ? 'bg-red-500' :
                player.team === 'blue' ? 'bg-blue-500' :
                'bg-gradient-to-br from-primary to-secondary'
              }`}>
                {player.displayName.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>

            {/* Player Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                {getPlayerIcon(player)}
                <span className="font-medium text-sm truncate">
                  {player.displayName}
                </span>
                {player.team && (
                  <Badge 
                    variant="outline" 
                    className={`text-xs ${
                      player.team === 'red' ? 'text-red-600 border-red-300' : 'text-blue-600 border-blue-300'
                    }`}
                  >
                    {player.team}
                  </Badge>
                )}
              </div>
              
              <div className="flex items-center justify-between mt-1">
                <span className="text-xs text-muted-foreground">
                  {player.score} points
                </span>
                {getPlayerBadge(player, index)}
              </div>
            </div>

            {/* Rank */}
            <div className="text-right">
              <div className={`text-lg font-bold ${
                index === 0 ? 'text-yellow-500' :
                index === 1 ? 'text-gray-400' :
                index === 2 ? 'text-amber-600' :
                'text-muted-foreground'
              }`}>
                #{index + 1}
              </div>
            </div>
          </div>
        ))}

        {players.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <p className="text-sm">No players yet</p>
            <p className="text-xs mt-1">Share the room code to invite friends!</p>
          </div>
        )}

        {players.length === 1 && (
          <div className="text-center py-4 text-muted-foreground">
            <p className="text-sm">Waiting for more players...</p>
            <p className="text-xs mt-1">Need at least 2 players to start</p>
          </div>
        )}
      </div>
    </Card>
  )
}