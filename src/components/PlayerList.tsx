import { Card } from './ui/card'
import { Badge } from './ui/badge'
import { Avatar, AvatarFallback } from './ui/avatar'
import { Crown, Palette, Trophy } from 'lucide-react'

interface Player {
  id: string
  userId: string
  displayName: string
  score: number
  isReady: boolean
}

interface PlayerListProps {
  players: Player[]
  currentDrawerId: string | null
  hostId: string
}

export function PlayerList({ players, currentDrawerId, hostId }: PlayerListProps) {
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
            }`}
          >
            {/* Avatar */}
            <Avatar className="h-10 w-10">
              <AvatarFallback className="bg-gradient-to-br from-primary to-secondary text-white font-bold">
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