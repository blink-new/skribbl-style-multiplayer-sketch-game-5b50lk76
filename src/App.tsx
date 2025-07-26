import { useState, useEffect } from 'react'
import { blink } from './blink/client'
import { HomePage } from './components/HomePage'
import { GameRoom } from './components/GameRoom'
import { Loader2 } from 'lucide-react'

function App() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [currentRoom, setCurrentRoom] = useState<string | null>(null)

  useEffect(() => {
    const unsubscribe = blink.auth.onAuthStateChanged((state) => {
      setUser(state.user)
      setLoading(state.isLoading)
    })
    return unsubscribe
  }, [])

  const handleJoinRoom = (roomCode: string) => {
    setCurrentRoom(roomCode)
  }

  const handleLeaveRoom = () => {
    setCurrentRoom(null)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <h1 className="text-3xl font-heading text-primary">Welcome to Sketch & Guess!</h1>
          <p className="text-muted-foreground">Please sign in to start playing</p>
          <div className="text-sm text-muted-foreground">
            You'll be redirected to sign in automatically...
          </div>
        </div>
      </div>
    )
  }

  if (currentRoom) {
    return (
      <GameRoom 
        roomCode={currentRoom} 
        onLeaveRoom={handleLeaveRoom}
      />
    )
  }

  return <HomePage onJoinRoom={handleJoinRoom} />
}

export default App