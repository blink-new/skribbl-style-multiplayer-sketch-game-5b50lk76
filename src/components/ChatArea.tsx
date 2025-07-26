import { useState, useEffect, useRef, useCallback } from 'react'
import { blink } from '../blink/client'
import { Card } from './ui/card'
import { Input } from './ui/input'
import { Button } from './ui/button'
import { Badge } from './ui/badge'
import { Send, MessageCircle, CheckCircle } from 'lucide-react'

interface ChatAreaProps {
  roomId: string
  currentWord: string | null
  isDrawer: boolean
  gameState: 'waiting' | 'playing' | 'finished'
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

export function ChatArea({ roomId, currentWord, isDrawer, gameState }: ChatAreaProps) {
  const [messages, setMessages] = useState<GameMessage[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [user, setUser] = useState<any>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

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

  useEffect(() => {
    loadMessages()
    // Set up real-time message updates here
  }, [loadMessages])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

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
      await blink.db.gameMessages.create({
        id: `msg_${Date.now()}_${Math.random()}`,
        roomId,
        userId: user.id,
        displayName: user.email?.split('@')[0] || 'Player',
        message: newMessage.trim(),
        isGuess,
        isCorrect
      })

      // If correct guess, award points and potentially end round
      if (isCorrect) {
        // Award points logic would go here
        console.log('Correct guess!')
      }

      setNewMessage('')
      loadMessages()
    } catch (error) {
      console.error('Error sending message:', error)
    }
  }

  const getMessageStyle = (message: GameMessage) => {
    if (message.isCorrect) {
      return 'bg-green-100 border-green-200 text-green-800'
    }
    if (message.isGuess) {
      return 'bg-blue-50 border-blue-200'
    }
    return 'bg-muted/50'
  }

  const getMessageIcon = (message: GameMessage) => {
    if (message.isCorrect) {
      return <CheckCircle className="h-3 w-3 text-green-600" />
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
          <Badge variant="outline" className="text-xs">
            Type your guesses!
          </Badge>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-2 mb-4 max-h-96">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`p-2 rounded-lg border ${getMessageStyle(message)}`}
          >
            <div className="flex items-center gap-2 mb-1">
              {getMessageIcon(message)}
              <span className="text-xs font-medium text-muted-foreground">
                {message.displayName}
              </span>
              {message.isCorrect && (
                <Badge variant="default" className="text-xs">
                  Correct!
                </Badge>
              )}
            </div>
            <p className="text-sm">
              {message.isCorrect ? '🎉 Guessed correctly!' : message.message}
            </p>
          </div>
        ))}
        
        {messages.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <MessageCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No messages yet</p>
            <p className="text-xs mt-1">
              {gameState === 'playing' && !isDrawer 
                ? 'Start guessing!' 
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
        />
        <Button 
          type="submit" 
          size="sm"
          disabled={!newMessage.trim() || (isDrawer && gameState === 'playing')}
        >
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </Card>
  )
}