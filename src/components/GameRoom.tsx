import { useState, useEffect, useRef, useCallback } from 'react'
import { blink } from '../blink/client'
import { DrawingCanvas } from './DrawingCanvas'
import { PlayerList } from './PlayerList'
import { ChatArea } from './ChatArea'
import { GameHeader } from './GameHeader'
import { WordDisplay } from './WordDisplay'
import { Button } from './ui/button'
import { Card } from './ui/card'
import { Badge } from './ui/badge'
import { Loader2, Trophy, Star } from 'lucide-react'
import { toast } from 'sonner'

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
  roundStartTime: string | null
}

export function GameRoom({ roomCode, onLeaveRoom }: GameRoomProps) {
  const [room, setRoom] = useState<GameRoom | null>(null)
  const [players, setPlayers] = useState<Player[]>([])
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [timeLeft, setTimeLeft] = useState(0)
  const [isDrawer, setIsDrawer] = useState(false)
  const [roundWinners, setRoundWinners] = useState<string[]>([])
  const [showCelebration, setShowCelebration] = useState(false)
  const timerRef = useRef<NodeJS.Timeout>()
  const realtimeChannelRef = useRef<any>(null)

  const getRandomWord = useCallback(async (): Promise<string> => {
    try {
      // Check if room has custom words
      if (room?.customWords) {
        const customWordList = room.customWords.split(',')
        return customWordList[Math.floor(Math.random() * customWordList.length)]
      }

      // Get words based on difficulty
      const categories = await blink.db.wordCategories.list({
        where: { difficulty: room?.difficulty || 'medium' }
      })
      
      if (categories.length === 0) return 'cat' // fallback
      
      // Pick random category and word
      const randomCategory = categories[Math.floor(Math.random() * categories.length)]
      const words = randomCategory.words.split(',')
      return words[Math.floor(Math.random() * words.length)]
    } catch (error) {
      console.error('Error getting random word:', error)
      return 'cat' // fallback
    }
  }, [room?.customWords, room?.difficulty])

  const startTimer = useCallback((duration: number) => {
    if (timerRef.current) clearInterval(timerRef.current)
    
    setTimeLeft(duration)
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current)
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }, [])

  const nextRound = useCallback(async () => {
    if (!room || !user) return

    try {
      const nextRoundNumber = room.currentRound + 1
      const nextDrawerIndex = players.findIndex(p => p.userId === room.currentDrawerId) + 1
      const nextDrawer = players[nextDrawerIndex % players.length]

      if (nextRoundNumber > room.maxRounds) {
        // Game finished
        await blink.db.gameRooms.update(room.id, {
          gameState: 'finished'
        })

        await blink.realtime.publish(`room_${room.id}`, 'room_update', {
          action: 'game_finished'
        })

        toast.success('Game finished!')
        return
      }

      const randomWord = await getRandomWord()

      await blink.db.gameRooms.update(room.id, {
        currentRound: nextRoundNumber,
        currentDrawerId: nextDrawer.userId,
        currentWord: randomWord,
        roundStartTime: new Date().toISOString()
      })

      // Create new game stats entry
      await blink.db.gameStats.create({
        id: `stats_${room.id}_${nextRoundNumber}`,
        roomId: room.id,
        roundNumber: nextRoundNumber,
        drawerId: nextDrawer.userId,
        word: randomWord,
        correctGuessers: '[]'
      })

      // Notify all players
      await blink.realtime.publish(`room_${room.id}`, 'room_update', {
        action: 'next_round',
        drawer: nextDrawer.displayName,
        round: nextRoundNumber
      })

      startTimer(room.roundTime)
    } catch (error) {
      console.error('Error advancing round:', error)
    }
  }, [room, user, players, startTimer, getRandomWord])

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
      if (gameRoom.gameState === 'playing' && gameRoom.roundStartTime) {
        const elapsed = Math.floor((Date.now() - new Date(gameRoom.roundStartTime).getTime()) / 1000)
        const remaining = Math.max(0, gameRoom.roundTime - elapsed)
        if (remaining > 0) {
          startTimer(remaining)
        }
      }

      setLoading(false)
    } catch (error) {
      console.error('Error loading game room:', error)
      setLoading(false)
    }
  }, [roomCode, user?.id, startTimer])

  // Set up real-time synchronization
  useEffect(() => {
    if (!room?.id) return

    const setupRealtime = async () => {
      try {
        // Subscribe to room updates
        const unsubscribe = await blink.realtime.subscribe(`room_${room.id}`, (message) => {
          if (message.type === 'room_update') {
            loadGameRoom()
          } else if (message.type === 'player_update') {
            loadGameRoom()
          } else if (message.type === 'round_end') {
            setRoundWinners(message.data.winners || [])
            setShowCelebration(true)
            setTimeout(() => setShowCelebration(false), 3000)
            toast.success('Round ended!', {
              description: message.data.winners?.length > 0 
                ? `${message.data.winners.length} player(s) guessed correctly!`
                : 'Time\'s up! Moving to next round.'
            })
            // Auto advance to next round after celebration
            setTimeout(() => nextRound(), 3000)
          } else if (message.type === 'correct_guess') {
            toast.success(`🎉 ${message.data.playerName} guessed correctly!`)
          }
        })

        realtimeChannelRef.current = unsubscribe
      } catch (error) {
        console.error('Error setting up realtime:', error)
      }
    }

    setupRealtime()

    return () => {
      if (realtimeChannelRef.current) {
        realtimeChannelRef.current()
      }
    }
  }, [room?.id, loadGameRoom, nextRound])

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

      // Notify other players
      await blink.realtime.publish(`room_${room.id}`, 'player_update', {
        action: 'joined',
        playerId: user.id
      })

      loadGameRoom()
      toast.success('Joined the game!')
    } catch (error) {
      console.error('Error joining room:', error)
      toast.error('Failed to join room')
    }
  }

  const startGame = async () => {
    if (!room || !user || room.hostUserId !== user.id || players.length < 2) return

    try {
      // Pick first drawer and word
      const firstDrawer = players[0]
      const randomWord = await getRandomWord()

      await blink.db.gameRooms.update(room.id, {
        gameState: 'playing',
        currentDrawerId: firstDrawer.userId,
        currentWord: randomWord,
        currentRound: 1,
        roundStartTime: new Date().toISOString()
      })

      // Create game stats entry
      await blink.db.gameStats.create({
        id: `stats_${room.id}_1`,
        roomId: room.id,
        roundNumber: 1,
        drawerId: firstDrawer.userId,
        word: randomWord,
        correctGuessers: '[]'
      })

      // Notify all players
      await blink.realtime.publish(`room_${room.id}`, 'room_update', {
        action: 'game_started',
        drawer: firstDrawer.displayName,
        round: 1
      })

      startTimer(room.roundTime)
      toast.success('Game started!')
    } catch (error) {
      console.error('Error starting game:', error)
      toast.error('Failed to start game')
    }
  }

  const awardPoints = async (playerId: string, points: number) => {
    try {
      const player = players.find(p => p.userId === playerId)
      if (!player) return

      await blink.db.roomPlayers.update(player.id, {
        score: player.score + points
      })

      // Update game stats with correct guesser
      const currentStats = await blink.db.gameStats.list({
        where: { roomId: room!.id, roundNumber: room!.currentRound },
        limit: 1
      })

      if (currentStats.length > 0) {
        const stats = currentStats[0] as any
        const correctGuessers = JSON.parse(stats.correctGuessers || '[]')
        if (!correctGuessers.includes(playerId)) {
          correctGuessers.push(playerId)
          await blink.db.gameStats.update(stats.id, {
            correctGuessers: JSON.stringify(correctGuessers)
          })
        }
      }

      loadGameRoom()
    } catch (error) {
      console.error('Error awarding points:', error)
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
  const currentDrawer = players.find(p => p.userId === room.currentDrawerId)

  return (
    <div className="min-h-screen bg-background">
      {/* Celebration Overlay */}
      {showCelebration && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 pointer-events-none">
          <div className="bg-white rounded-2xl p-8 text-center animate-bounce">
            <Trophy className="h-16 w-16 text-yellow-500 mx-auto mb-4" />
            <h2 className="text-2xl font-heading text-primary mb-2">Round Complete!</h2>
            {roundWinners.length > 0 ? (
              <p className="text-muted-foreground">
                {roundWinners.length} player(s) guessed correctly! 🎉
              </p>
            ) : (
              <p className="text-muted-foreground">Time's up! Moving to next round...</p>
            )}
          </div>
        </div>
      )}

      <GameHeader 
        roomCode={roomCode}
        currentRound={room.currentRound}
        maxRounds={room.maxRounds}
        timeLeft={timeLeft}
        gameState={room.gameState}
        difficulty={room.difficulty}
        teamMode={room.teamMode}
        customWords={!!room.customWords}
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
              teamMode={room.teamMode}
            />
          </div>

          {/* Main Game Area */}
          <div className="lg:col-span-2 flex flex-col gap-4">
            {/* Game Status */}
            {room.gameState === 'playing' && currentDrawer && (
              <Card className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Star className="h-5 w-5 text-yellow-500" />
                    <span className="font-medium">
                      {isDrawer ? 'Your turn to draw!' : `${currentDrawer.displayName} is drawing`}
                    </span>
                  </div>
                  <Badge variant={isDrawer ? 'default' : 'secondary'}>
                    Round {room.currentRound}/{room.maxRounds}
                  </Badge>
                </div>
              </Card>
            )}

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

            {/* Game Finished */}
            {room.gameState === 'finished' && (
              <Card className="p-6 text-center">
                <Trophy className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
                <h2 className="text-2xl font-heading text-primary mb-4">Game Finished!</h2>
                <div className="space-y-2">
                  {players.slice(0, 3).map((player, index) => (
                    <div key={player.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                      <div className="flex items-center gap-2">
                        <Badge variant={index === 0 ? 'default' : 'secondary'}>
                          #{index + 1}
                        </Badge>
                        <span className="font-medium">{player.displayName}</span>
                      </div>
                      <span className="font-bold text-primary">{player.score} pts</span>
                    </div>
                  ))}
                </div>
                <Button onClick={onLeaveRoom} className="mt-4">
                  Back to Home
                </Button>
              </Card>
            )}
          </div>

          {/* Chat Area */}
          <div className="lg:col-span-1">
            <ChatArea 
              roomId={room.id}
              currentWord={room.currentWord}
              isDrawer={isDrawer}
              gameState={room.gameState}
              onCorrectGuess={awardPoints}
            />
          </div>
        </div>
      </div>
    </div>
  )
}