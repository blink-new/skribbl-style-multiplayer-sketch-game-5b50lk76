import { useState } from 'react'
import { blink } from '../blink/client'
import { Card } from './ui/card'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Separator } from './ui/separator'
import { Palette, Users, Play, Plus } from 'lucide-react'

interface HomePageProps {
  onJoinRoom: (roomCode: string) => void
}

export function HomePage({ onJoinRoom }: HomePageProps) {
  const [roomCode, setRoomCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const generateRoomCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    let result = ''
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return result
  }

  const createRoom = async () => {
    setLoading(true)
    setError('')

    try {
      const user = await blink.auth.me()
      const newRoomCode = generateRoomCode()

      await blink.db.gameRooms.create({
        id: `room_${Date.now()}`,
        roomCode: newRoomCode,
        hostUserId: user.id,
        currentRound: 0,
        maxRounds: 3,
        roundTime: 60,
        currentDrawerId: null,
        currentWord: null,
        gameState: 'waiting'
      })

      onJoinRoom(newRoomCode)
    } catch (error) {
      console.error('Error creating room:', error)
      setError('Failed to create room. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const joinRoom = async () => {
    if (!roomCode.trim()) {
      setError('Please enter a room code')
      return
    }

    setLoading(true)
    setError('')

    try {
      // Check if room exists
      const rooms = await blink.db.gameRooms.list({
        where: { roomCode: roomCode.toUpperCase() },
        limit: 1
      })

      if (rooms.length === 0) {
        setError('Room not found. Please check the code.')
        return
      }

      onJoinRoom(roomCode.toUpperCase())
    } catch (error) {
      console.error('Error joining room:', error)
      setError('Failed to join room. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="p-3 bg-primary/10 rounded-full">
              <Palette className="h-8 w-8 text-primary" />
            </div>
          </div>
          <h1 className="text-4xl font-heading text-primary">
            Sketch & Guess
          </h1>
          <p className="text-muted-foreground">
            Draw, guess, and have fun with friends!
          </p>
        </div>

        {/* Create Room */}
        <Card className="p-6">
          <div className="space-y-4">
            <div className="text-center">
              <h2 className="text-xl font-heading text-foreground mb-2">
                Create New Room
              </h2>
              <p className="text-sm text-muted-foreground">
                Start a new game and invite your friends
              </p>
            </div>

            <Button 
              onClick={createRoom} 
              disabled={loading}
              size="lg"
              className="w-full font-heading"
            >
              <Plus className="h-5 w-5 mr-2" />
              Create Room
            </Button>
          </div>
        </Card>

        {/* Divider */}
        <div className="relative">
          <Separator />
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="bg-background px-3 text-sm text-muted-foreground">
              or
            </span>
          </div>
        </div>

        {/* Join Room */}
        <Card className="p-6">
          <div className="space-y-4">
            <div className="text-center">
              <h2 className="text-xl font-heading text-foreground mb-2">
                Join Existing Room
              </h2>
              <p className="text-sm text-muted-foreground">
                Enter a room code to join your friends
              </p>
            </div>

            <div className="space-y-3">
              <div>
                <Label htmlFor="roomCode" className="text-sm font-medium">
                  Room Code
                </Label>
                <Input
                  id="roomCode"
                  value={roomCode}
                  onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                  placeholder="Enter 6-digit code"
                  maxLength={6}
                  className="text-center text-lg font-mono tracking-wider"
                />
              </div>

              <Button 
                onClick={joinRoom} 
                disabled={loading || !roomCode.trim()}
                size="lg"
                variant="secondary"
                className="w-full font-heading"
              >
                <Play className="h-5 w-5 mr-2" />
                Join Room
              </Button>
            </div>
          </div>
        </Card>

        {/* Error Message */}
        {error && (
          <Card className="p-4 border-destructive/50 bg-destructive/5">
            <p className="text-sm text-destructive text-center">{error}</p>
          </Card>
        )}

        {/* Game Features */}
        <Card className="p-6 bg-muted/30">
          <h3 className="font-heading text-lg text-center mb-4">How to Play</h3>
          <div className="space-y-3 text-sm">
            <div className="flex items-start gap-3">
              <div className="p-1 bg-primary/10 rounded-full mt-0.5">
                <Users className="h-3 w-3 text-primary" />
              </div>
              <div>
                <p className="font-medium">Multiplayer Fun</p>
                <p className="text-muted-foreground text-xs">
                  Play with 2+ friends in real-time
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <div className="p-1 bg-secondary/10 rounded-full mt-0.5">
                <Palette className="h-3 w-3 text-secondary" />
              </div>
              <div>
                <p className="font-medium">Draw & Guess</p>
                <p className="text-muted-foreground text-xs">
                  Take turns drawing words while others guess
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <div className="p-1 bg-accent/10 rounded-full mt-0.5">
                <Play className="h-3 w-3 text-accent" />
              </div>
              <div>
                <p className="font-medium">Score Points</p>
                <p className="text-muted-foreground text-xs">
                  Earn points for correct guesses and good drawings
                </p>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}