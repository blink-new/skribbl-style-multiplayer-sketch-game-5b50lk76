import React, { useState, useEffect } from 'react'
import { blink } from '../blink/client'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { Textarea } from './ui/textarea'
import { Switch } from './ui/switch'
import { Label } from './ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs'
import { Badge } from './ui/badge'
import { Palette, Users, Zap, Trophy, Gamepad2, Star } from 'lucide-react'
import toast from 'react-hot-toast'

interface HomePageProps {
  onJoinRoom: (roomCode: string) => void
}

export function HomePage({ onJoinRoom }: HomePageProps) {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [joinCode, setJoinCode] = useState('')
  const [difficulty, setDifficulty] = useState('medium')
  const [customWords, setCustomWords] = useState('')
  const [teamMode, setTeamMode] = useState(false)
  const [activeTab, setActiveTab] = useState('create')

  useEffect(() => {
    const unsubscribe = blink.auth.onAuthStateChanged((state) => {
      setUser(state.user)
      setLoading(state.isLoading)
    })
    return unsubscribe
  }, [])

  const generateRoomCode = () => {
    return Math.random().toString(36).substring(2, 8).toUpperCase()
  }

  const createRoom = async () => {
    if (!user) return

    try {
      const roomCode = generateRoomCode()
      
      // Process custom words if provided
      let processedCustomWords = null
      if (customWords.trim()) {
        const words = customWords
          .split(/[,\n]/)
          .map(word => word.trim().toLowerCase())
          .filter(word => word.length > 0)
        
        if (words.length < 5) {
          toast.error('Please provide at least 5 custom words')
          return
        }
        processedCustomWords = words.join(',')
      }

      await blink.db.gameRooms.create({
        id: roomCode,
        hostId: user.id,
        status: 'waiting',
        currentRound: 0,
        maxRounds: 3,
        roundTimeLimit: 60,
        difficulty,
        customWords: processedCustomWords,
        teamMode,
        createdAt: new Date().toISOString()
      })

      await blink.db.roomPlayers.create({
        id: `${roomCode}_${user.id}`,
        roomId: roomCode,
        userId: user.id,
        playerName: user.email?.split('@')[0] || 'Player',
        score: 0,
        isDrawing: false,
        team: teamMode ? 'red' : null,
        joinedAt: new Date().toISOString()
      })

      toast.success(`Room created! Code: ${roomCode}`)
      onJoinRoom(roomCode)
    } catch (error) {
      console.error('Error creating room:', error)
      toast.error('Failed to create room')
    }
  }

  const joinRoom = async () => {
    if (!user || !joinCode.trim()) return

    try {
      const rooms = await blink.db.gameRooms.list({
        where: { id: joinCode.toUpperCase() }
      })

      if (rooms.length === 0) {
        toast.error('Room not found')
        return
      }

      const room = rooms[0]
      if (room.status === 'finished') {
        toast.error('This game has already finished')
        return
      }

      // Check if player already in room
      const existingPlayer = await blink.db.roomPlayers.list({
        where: { 
          AND: [
            { roomId: room.id },
            { userId: user.id }
          ]
        }
      })

      if (existingPlayer.length === 0) {
        // Determine team for new player in team mode
        let playerTeam = null
        if (room.teamMode) {
          const players = await blink.db.roomPlayers.list({
            where: { roomId: room.id }
          })
          const redTeamCount = players.filter(p => p.team === 'red').length
          const blueTeamCount = players.filter(p => p.team === 'blue').length
          playerTeam = redTeamCount <= blueTeamCount ? 'red' : 'blue'
        }

        await blink.db.roomPlayers.create({
          id: `${room.id}_${user.id}`,
          roomId: room.id,
          userId: user.id,
          playerName: user.email?.split('@')[0] || 'Player',
          score: 0,
          isDrawing: false,
          team: playerTeam,
          joinedAt: new Date().toISOString()
        })
      }

      toast.success('Joined room successfully!')
      onJoinRoom(room.id)
    } catch (error) {
      console.error('Error joining room:', error)
      toast.error('Failed to join room')
    }
  }

  const getDifficultyInfo = (level: string) => {
    switch (level) {
      case 'easy':
        return { 
          label: 'Easy', 
          description: 'Simple words like "cat", "pizza", "car"',
          color: 'bg-green-100 text-green-800',
          icon: <Star className="w-4 h-4" />
        }
      case 'medium':
        return { 
          label: 'Medium', 
          description: 'Moderate words like "elephant", "sushi", "guitar"',
          color: 'bg-yellow-100 text-yellow-800',
          icon: <Zap className="w-4 h-4" />
        }
      case 'hard':
        return { 
          label: 'Hard', 
          description: 'Challenging words like "chameleon", "tiramisu", "kaleidoscope"',
          color: 'bg-red-100 text-red-800',
          icon: <Trophy className="w-4 h-4" />
        }
      default:
        return { 
          label: 'Medium', 
          description: 'Moderate difficulty',
          color: 'bg-yellow-100 text-yellow-800',
          icon: <Zap className="w-4 h-4" />
        }
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-accent/5 to-primary/5 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-lg font-medium">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-accent/5 to-primary/5 flex items-center justify-center">
        <Card className="w-full max-w-md mx-4">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
              <Palette className="w-8 h-8 text-primary" />
            </div>
            <CardTitle className="text-2xl font-fredoka">Welcome to Skribbl!</CardTitle>
            <CardDescription>Sign in to start drawing and guessing with friends</CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={() => blink.auth.login()} 
              className="w-full bg-primary hover:bg-primary/90"
            >
              Sign In to Play
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-accent/5 to-primary/5 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
              <Palette className="w-6 h-6 text-primary" />
            </div>
            <h1 className="text-4xl font-fredoka text-primary">Skribbl Game</h1>
          </div>
          <p className="text-lg text-muted-foreground">
            Draw, guess, and have fun with friends in real-time!
          </p>
          <div className="flex items-center justify-center gap-6 mt-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Users className="w-4 h-4" />
              <span>Multiplayer</span>
            </div>
            <div className="flex items-center gap-1">
              <Gamepad2 className="w-4 h-4" />
              <span>Real-time</span>
            </div>
            <div className="flex items-center gap-1">
              <Trophy className="w-4 h-4" />
              <span>Competitive</span>
            </div>
          </div>
        </div>

        {/* Game Options */}
        <div className="max-w-2xl mx-auto">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="create">Create Room</TabsTrigger>
              <TabsTrigger value="join">Join Room</TabsTrigger>
            </TabsList>

            <TabsContent value="create" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Palette className="w-5 h-5" />
                    Create New Game
                  </CardTitle>
                  <CardDescription>
                    Set up a new room with custom settings
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Difficulty Selection */}
                  <div className="space-y-3">
                    <Label className="text-base font-medium">Difficulty Level</Label>
                    <Select value={difficulty} onValueChange={setDifficulty}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="easy">
                          <div className="flex items-center gap-2">
                            <Star className="w-4 h-4 text-green-600" />
                            <span>Easy</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="medium">
                          <div className="flex items-center gap-2">
                            <Zap className="w-4 h-4 text-yellow-600" />
                            <span>Medium</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="hard">
                          <div className="flex items-center gap-2">
                            <Trophy className="w-4 h-4 text-red-600" />
                            <span>Hard</span>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <div className="p-3 bg-muted/50 rounded-lg">
                      <div className="flex items-center gap-2 mb-1">
                        {getDifficultyInfo(difficulty).icon}
                        <Badge className={getDifficultyInfo(difficulty).color}>
                          {getDifficultyInfo(difficulty).label}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {getDifficultyInfo(difficulty).description}
                      </p>
                    </div>
                  </div>

                  {/* Team Mode */}
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="space-y-1">
                      <Label className="text-base font-medium">Team Mode</Label>
                      <p className="text-sm text-muted-foreground">
                        Players compete in Red vs Blue teams
                      </p>
                    </div>
                    <Switch
                      checked={teamMode}
                      onCheckedChange={setTeamMode}
                    />
                  </div>

                  {/* Custom Words */}
                  <div className="space-y-3">
                    <Label className="text-base font-medium">Custom Words (Optional)</Label>
                    <Textarea
                      placeholder="Enter custom words separated by commas or new lines&#10;Example: rainbow, butterfly, telescope, adventure..."
                      value={customWords}
                      onChange={(e) => setCustomWords(e.target.value)}
                      rows={4}
                    />
                    <p className="text-sm text-muted-foreground">
                      Add at least 5 custom words to override the default word list
                    </p>
                  </div>

                  <Button 
                    onClick={createRoom} 
                    className="w-full bg-primary hover:bg-primary/90 text-lg py-6"
                  >
                    Create Room
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="join" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="w-5 h-5" />
                    Join Existing Game
                  </CardTitle>
                  <CardDescription>
                    Enter a room code to join your friends
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="roomCode">Room Code</Label>
                    <Input
                      id="roomCode"
                      placeholder="Enter 6-digit room code"
                      value={joinCode}
                      onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                      maxLength={6}
                      className="text-center text-lg font-mono tracking-wider"
                    />
                  </div>
                  <Button 
                    onClick={joinRoom} 
                    disabled={joinCode.length !== 6}
                    className="w-full bg-accent hover:bg-accent/90 text-lg py-6"
                  >
                    Join Room
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Features */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
          <Card className="text-center">
            <CardContent className="pt-6">
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Palette className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-semibold mb-2">Real-time Drawing</h3>
              <p className="text-sm text-muted-foreground">
                See every stroke as it happens with instant synchronization
              </p>
            </CardContent>
          </Card>
          
          <Card className="text-center">
            <CardContent className="pt-6">
              <div className="w-12 h-12 bg-accent/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="w-6 h-6 text-accent" />
              </div>
              <h3 className="font-semibold mb-2">Multiplayer Fun</h3>
              <p className="text-sm text-muted-foreground">
                Play with friends, compete in teams, and climb the leaderboard
              </p>
            </CardContent>
          </Card>
          
          <Card className="text-center">
            <CardContent className="pt-6">
              <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trophy className="w-6 h-6 text-yellow-600" />
              </div>
              <h3 className="font-semibold mb-2">Smart Scoring</h3>
              <p className="text-sm text-muted-foreground">
                Earn bonus points for quick guesses and perfect drawings
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}