import { Card } from './ui/card'
import { Badge } from './ui/badge'
import { Eye, EyeOff } from 'lucide-react'

interface WordDisplayProps {
  word: string | null
  isDrawer: boolean
  gameState: 'waiting' | 'playing' | 'finished'
}

export function WordDisplay({ word, isDrawer, gameState }: WordDisplayProps) {
  if (gameState !== 'playing' || !word) {
    return null
  }

  const getWordDisplay = () => {
    if (isDrawer) {
      return word.toUpperCase()
    } else {
      // Show blanks for guessers
      return word.split('').map(char => char === ' ' ? ' ' : '_').join(' ')
    }
  }

  const getHint = () => {
    if (isDrawer) return null
    
    return (
      <div className="text-xs text-muted-foreground mt-2">
        {word.length} letters
      </div>
    )
  }

  return (
    <Card className="p-4">
      <div className="text-center">
        <div className="flex items-center justify-center gap-2 mb-2">
          {isDrawer ? (
            <>
              <Eye className="h-4 w-4 text-primary" />
              <Badge variant="default" className="text-xs">Your Word</Badge>
            </>
          ) : (
            <>
              <EyeOff className="h-4 w-4 text-muted-foreground" />
              <Badge variant="secondary" className="text-xs">Guess the Word</Badge>
            </>
          )}
        </div>

        <div className={`text-2xl font-heading tracking-wider ${
          isDrawer ? 'text-primary' : 'text-foreground'
        }`}>
          {getWordDisplay()}
        </div>

        {getHint()}

        {isDrawer && (
          <p className="text-xs text-muted-foreground mt-2">
            Draw this word for others to guess!
          </p>
        )}
      </div>
    </Card>
  )
}