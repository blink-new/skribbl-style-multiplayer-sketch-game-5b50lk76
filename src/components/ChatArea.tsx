import { useState, useEffect, useRef, useCallback } from 'react'
import { blink } from '../blink/client'
import { Card } from './ui/card'
import { Input } from './ui/input'
import { Button } from './ui/button'
import { Badge } from './ui/badge'
import { Send, MessageCircle, CheckCircle, Trophy } from 'lucide-react'
import { toast } from 'sonner'

interface ChatAreaProps {
  roomId: string
  currentWord: string | null
  isDrawer: boolean
  gameState: 'waiting' | 'playing' | 'finished'
  onCorrectGuess: (playerId: string, points: number) => void
}

interface GameMessage {
  id: string
  roomId: string
  userId: string
  displayName: string
  message: string
  isGuess: boolean
  isCorrect: boolean
  createdAt: string
}

export function ChatArea({ roomId, currentWord, isDrawer, gameState, onCorrectGuess }: ChatAreaProps) {
  const [messages, setMessages] = useState<GameMessage[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [user, setUser] = useState<any>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const realtimeChannelRef = useRef<any>(null)

  useEffect(() => {
    const unsubscribe = blink.auth.onAuthStateChanged((state) => {
      setUser(state.user)
    })
    return unsubscribe
  }, [])

  const loadMessages = useCallback(async () => {
    try {
      const messagesData = await blink.db.gameMessages.list({
        where: { roomId },
        orderBy: { createdAt: 'asc' },
        limit: 50
      })
      
      setMessages(messagesData as GameMessage[])
    } catch (error) {
      console.error('Error loading messages:', error)
    }
  }, [roomId])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  // Set up real-time chat updates
  useEffect(() => {
    if (!roomId) return

    const setupRealtime = async () => {
      try {
        const unsubscribe = await blink.realtime.subscribe(`chat_${roomId}`, (message) => {
          if (message.type === 'new_message') {
            loadMessages()
          } else if (message.type === 'correct_guess') {
            // Show celebration animation
            toast.success(`🎉 ${message.data.playerName} guessed correctly!`, {
              description: `+${message.data.points} points!`
            })
            loadMessages()
          }
        })

        realtimeChannelRef.current = unsubscribe
      } catch (error) {
        console.error('Error setting up chat realtime:', error)
      }
    }

    setupRealtime()
    loadMessages()

    return () => {
      if (realtimeChannelRef.current) {
        realtimeChannelRef.current()
      }
    }
  }, [roomId, loadMessages])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const calculatePoints = (timeLeft: number, maxTime: number = 60): number => {
    // Award more points for faster guesses
    const timeRatio = timeLeft / maxTime
    const basePoints = 100
    const timeBonus = Math.floor(timeRatio * 50) // Up to 50 bonus points
    return Math.max(basePoints + timeBonus, 50) // Minimum 50 points
  }

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!newMessage.trim() || !user) return

    // Drawer can't guess
    if (isDrawer && gameState === 'playing') {
      return
    }

    const isGuess = gameState === 'playing' && !isDrawer
    const isCorrect = isGuess && currentWord && 
      newMessage.toLowerCase().trim() === currentWord.toLowerCase()

    try {
      const messageData = {
        id: `msg_${Date.now()}_${Math.random()}`,
        roomId,
        userId: user.id,
        displayName: user.email?.split('@')[0] || 'Player',
        message: newMessage.trim(),
        isGuess,
        isCorrect
      }

      await blink.db.gameMessages.create(messageData)

      // If correct guess, award points and notify
      if (isCorrect) {
        const points = calculatePoints(60) // Simplified - you could pass actual time left
        onCorrectGuess(user.id, points)

        // Notify all players about correct guess
        await blink.realtime.publish(`room_${roomId}`, 'correct_guess', {
          playerName: messageData.displayName,
          playerId: user.id,
          points,
          word: currentWord
        })

        // Also notify chat channel
        await blink.realtime.publish(`chat_${roomId}`, 'correct_guess', {
          playerName: messageData.displayName,
          points
        })

        // Check if round should end (simplified - could check if all players guessed)
        setTimeout(async () => {
          await blink.realtime.publish(`room_${roomId}`, 'round_end', {
            winners: [user.id],
            correctWord: currentWord
          })
        }, 1000)
      }

      // Notify chat about new message
      await blink.realtime.publish(`chat_${roomId}`, 'new_message', {
        messageId: messageData.id,
        isCorrect
      })

      setNewMessage('')
    } catch (error) {
      console.error('Error sending message:', error)
      toast.error('Failed to send message')
    }
  }

  const getMessageStyle = (message: GameMessage) => {
    if (message.isCorrect) {
      return 'bg-green-100 border-green-200 text-green-800 animate-pulse'
    }
    if (message.isGuess) {
      return 'bg-blue-50 border-blue-200'
    }
    return 'bg-muted/50'
  }

  const getMessageIcon = (message: GameMessage) => {
    if (message.isCorrect) {
      return <Trophy className="h-3 w-3 text-green-600" />
    }
    if (message.isGuess) {
      return <MessageCircle className="h-3 w-3 text-blue-600" />
    }
    return null
  }

  return (
    <Card className="p-4 h-full flex flex-col">
      <div className="flex items-center gap-2 mb-4">
        <h3 className="font-heading text-lg text-primary">Chat</h3>
        {gameState === 'playing' && !isDrawer && (
          <Badge variant="outline" className="text-xs animate-pulse">
            Type your guesses!
          </Badge>
        )}
        {gameState === 'playing' && isDrawer && (
          <Badge variant="secondary" className="text-xs">
            Drawing...
          </Badge>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-2 mb-4 max-h-96">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`p-2 rounded-lg border transition-all duration-300 ${getMessageStyle(message)}`}
          >
            <div className="flex items-center gap-2 mb-1">
              {getMessageIcon(message)}
              <span className="text-xs font-medium text-muted-foreground">
                {message.displayName}
              </span>
              {message.isCorrect && (
                <Badge variant="default" className="text-xs animate-bounce">
                  Correct! 🎉
                </Badge>
              )}
            </div>
            <p className="text-sm">
              {message.isCorrect ? (
                <span className="flex items-center gap-1">
                  <CheckCircle className="h-3 w-3" />
                  Guessed the word correctly!
                </span>
              ) : (
                message.message
              )}
            </p>
          </div>
        ))}
        
        {messages.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <MessageCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No messages yet</p>
            <p className="text-xs mt-1">
              {gameState === 'playing' && !isDrawer 
                ? 'Start guessing the word!' 
                : gameState === 'playing' && isDrawer
                ? 'Others are guessing your drawing!'
                : 'Chat with other players'}
            </p>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <form onSubmit={sendMessage} className="flex gap-2">
        <Input
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder={
            isDrawer && gameState === 'playing'
              ? "You can't guess while drawing!"
              : gameState === 'playing'
              ? 'Type your guess...'
              : 'Type a message...'
          }
          disabled={isDrawer && gameState === 'playing'}
          className="flex-1"
          autoComplete="off"
        />
        <Button 
          type="submit" 
          size="sm"
          disabled={!newMessage.trim() || (isDrawer && gameState === 'playing')}
          className="transition-all hover:scale-105"
        >
          <Send className="h-4 w-4" />
        </Button>
      </form>

      {/* Hint for guessers */}
      {gameState === 'playing' && !isDrawer && currentWord && (
        <div className="mt-2 text-center">
          <p className="text-xs text-muted-foreground">
            💡 Hint: {currentWord.length} letters
          </p>
        </div>
      )}
    </Card>
  )
}