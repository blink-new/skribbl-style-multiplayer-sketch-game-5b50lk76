import { useState, useEffect, useRef, useCallback } from 'react'
import { blink } from '../blink/client'
import { DrawingCanvas } from './DrawingCanvas'
import { PlayerList } from './PlayerList'
import { ChatArea } from './ChatArea'
import { GameHeader } from './GameHeader'
import { WordDisplay } from './WordDisplay'
import { Button } from './ui/button'
import { Card } from './ui/card'
import { Loader2 } from 'lucide-react'

interface GameRoomProps {
  roomCode: string
  onLeaveRoom: () => void
}

interface Player {
  id: string
  userId: string
  displayName: string
  score: number
  isReady: boolean
}

interface GameRoom {
  id: string
  roomCode: string
  hostUserId: string
  currentRound: number
  maxRounds: number
  roundTime: number
  currentDrawerId: string | null
  currentWord: string | null
  gameState: 'waiting' | 'playing' | 'finished'
}

export function GameRoom({ roomCode, onLeaveRoom }: GameRoomProps) {
  const [room, setRoom] = useState<GameRoom | null>(null)
  const [players, setPlayers] = useState<Player[]>([])
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [timeLeft, setTimeLeft] = useState(0)
  const [isDrawer, setIsDrawer] = useState(false)
  const timerRef = useRef<NodeJS.Timeout>()

  const startTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current)
    
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current)
          // Handle round end
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }, [])

  const loadGameRoom = useCallback(async () => {
    try {
      // Load room data
      const roomData = await blink.db.gameRooms.list({
        where: { roomCode },
        limit: 1
      })

      if (roomData.length === 0) {
        throw new Error('Room not found')
      }

      const gameRoom = roomData[0] as any
      setRoom(gameRoom)

      // Load players
      const playersData = await blink.db.roomPlayers.list({
        where: { roomId: gameRoom.id },
        orderBy: { score: 'desc' }
      })

      setPlayers(playersData as Player[])
      setIsDrawer(gameRoom.currentDrawerId === user?.id)
      
      // Set up timer if game is playing
      if (gameRoom.gameState === 'playing') {
        setTimeLeft(gameRoom.roundTime)
        startTimer()
      }

      setLoading(false)
    } catch (error) {
      console.error('Error loading game room:', error)
      setLoading(false)
    }
  }, [roomCode, user?.id, startTimer])

  useEffect(() => {
    const unsubscribe = blink.auth.onAuthStateChanged((state) => {
      setUser(state.user)
      if (state.user && !state.isLoading) {
        loadGameRoom()
      }
    })
    return unsubscribe
  }, [loadGameRoom])

  const joinRoom = async () => {
    if (!user || !room) return

    try {
      await blink.db.roomPlayers.create({
        id: `player_${user.id}_${room.id}`,
        roomId: room.id,
        userId: user.id,
        displayName: user.email?.split('@')[0] || 'Player',
        score: 0,
        isReady: false
      })

      loadGameRoom()
    } catch (error) {
      console.error('Error joining room:', error)
    }
  }

  const startGame = async () => {
    if (!room || !user || room.hostUserId !== user.id) return

    try {
      // Pick first drawer and word
      const firstDrawer = players[0]
      const words = await blink.db.wordLists.list({ limit: 1 })
      const randomWord = words[Math.floor(Math.random() * words.length)]

      await blink.db.gameRooms.update(room.id, {
        gameState: 'playing',
        currentDrawerId: firstDrawer.userId,
        currentWord: randomWord.word,
        currentRound: 1
      })

      loadGameRoom()
    } catch (error) {
      console.error('Error starting game:', error)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Loading game room...</p>
        </div>
      </div>
    )
  }

  if (!room) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="p-8 text-center">
          <h2 className="text-2xl font-heading text-primary mb-4">Room Not Found</h2>
          <p className="text-muted-foreground mb-6">The room code "{roomCode}" does not exist.</p>
          <Button onClick={onLeaveRoom}>Back to Home</Button>
        </Card>
      </div>
    )
  }

  const currentPlayer = players.find(p => p.userId === user?.id)
  const isHost = room.hostUserId === user?.id

  return (
    <div className="min-h-screen bg-background">
      <GameHeader 
        roomCode={roomCode}
        currentRound={room.currentRound}
        maxRounds={room.maxRounds}
        timeLeft={timeLeft}
        gameState={room.gameState}
        onLeaveRoom={onLeaveRoom}
      />

      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-[calc(100vh-120px)]">
          {/* Players List */}
          <div className="lg:col-span-1">
            <PlayerList 
              players={players}
              currentDrawerId={room.currentDrawerId}
              hostId={room.hostUserId}
            />
          </div>

          {/* Main Game Area */}
          <div className="lg:col-span-2 flex flex-col gap-4">
            {/* Word Display */}
            {room.gameState === 'playing' && (
              <WordDisplay 
                word={room.currentWord}
                isDrawer={isDrawer}
                gameState={room.gameState}
              />
            )}

            {/* Drawing Canvas */}
            <div className="flex-1">
              <DrawingCanvas 
                roomId={room.id}
                canDraw={isDrawer && room.gameState === 'playing'}
                currentRound={room.currentRound}
              />
            </div>

            {/* Game Controls */}
            {room.gameState === 'waiting' && (
              <div className="text-center py-4">
                {!currentPlayer ? (
                  <Button onClick={joinRoom} size="lg" className="font-heading">
                    Join Game
                  </Button>
                ) : isHost ? (
                  <Button 
                    onClick={startGame} 
                    size="lg" 
                    className="font-heading"
                    disabled={players.length < 2}
                  >
                    {players.length < 2 ? 'Need 2+ Players' : 'Start Game'}
                  </Button>
                ) : (
                  <p className="text-muted-foreground font-medium">
                    Waiting for host to start the game...
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Chat Area */}
          <div className="lg:col-span-1">
            <ChatArea 
              roomId={room.id}
              currentWord={room.currentWord}
              isDrawer={isDrawer}
              gameState={room.gameState}
            />
          </div>
        </div>
      </div>
    </div>
  )
}