import { Button } from './ui/button'
import { Badge } from './ui/badge'
import { Clock, Users, LogOut, Star, Zap, Trophy, Shield } from 'lucide-react'

interface GameHeaderProps {
  roomCode: string
  currentRound: number
  maxRounds: number
  timeLeft: number
  gameState: 'waiting' | 'playing' | 'finished'
  difficulty?: string
  teamMode?: boolean
  customWords?: boolean
  onLeaveRoom: () => void
}

export function GameHeader({ 
  roomCode, 
  currentRound, 
  maxRounds, 
  timeLeft, 
  gameState,
  difficulty = 'medium',
  teamMode = false,
  customWords = false,
  onLeaveRoom 
}: GameHeaderProps) {
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const getTimerColor = () => {
    if (timeLeft > 30) return 'text-green-600'
    if (timeLeft > 10) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getDifficultyIcon = () => {
    switch (difficulty) {
      case 'easy':
        return <Star className="h-3 w-3" />
      case 'hard':
        return <Trophy className="h-3 w-3" />
      default:
        return <Zap className="h-3 w-3" />
    }
  }

  const getDifficultyColor = () => {
    switch (difficulty) {
      case 'easy':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'hard':
        return 'bg-red-100 text-red-800 border-red-200'
      default:
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
    }
  }

  return (
    <header className="bg-card border-b border-border px-4 py-3">
      <div className="container mx-auto flex items-center justify-between">
        {/* Left: Game Title & Room Code */}
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-heading text-primary">
            Sketch & Guess
          </h1>
          <Badge variant="secondary" className="text-sm font-mono">
            Room: {roomCode}
          </Badge>
        </div>

        {/* Center: Game Status & Settings */}
        <div className="flex items-center gap-4">
          {/* Game Settings */}
          <div className="flex items-center gap-2">
            {/* Difficulty */}
            <Badge className={`text-xs flex items-center gap-1 ${getDifficultyColor()}`}>
              {getDifficultyIcon()}
              {difficulty}
            </Badge>

            {/* Team Mode */}
            {teamMode && (
              <Badge className="text-xs flex items-center gap-1 bg-purple-100 text-purple-800 border-purple-200">
                <Shield className="h-3 w-3" />
                Teams
              </Badge>
            )}

            {/* Custom Words */}
            {customWords && (
              <Badge className="text-xs bg-blue-100 text-blue-800 border-blue-200">
                Custom
              </Badge>
            )}
          </div>

          {/* Round Counter */}
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">
              Round {currentRound} of {maxRounds}
            </span>
          </div>

          {/* Timer */}
          {gameState === 'playing' && (
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className={`text-lg font-mono font-bold ${getTimerColor()}`}>
                {formatTime(timeLeft)}
              </span>
            </div>
          )}

          {/* Game State */}
          <Badge 
            variant={
              gameState === 'playing' ? 'default' : 
              gameState === 'waiting' ? 'secondary' : 
              'destructive'
            }
            className="capitalize"
          >
            {gameState === 'waiting' ? 'Waiting to Start' : 
             gameState === 'playing' ? 'Playing' : 
             'Game Over'}
          </Badge>
        </div>

        {/* Right: Leave Button */}
        <Button 
          variant="outline" 
          size="sm" 
          onClick={onLeaveRoom}
          className="flex items-center gap-2"
        >
          <LogOut className="h-4 w-4" />
          Leave Room
        </Button>
      </div>
    </header>
  )
}