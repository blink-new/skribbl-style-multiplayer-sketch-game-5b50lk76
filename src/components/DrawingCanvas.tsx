import { useRef, useEffect, useState, useCallback } from 'react'
import { blink } from '../blink/client'
import { Card } from './ui/card'
import { Button } from './ui/button'
import { Slider } from './ui/slider'
import { Eraser, Trash2, Palette, Undo } from 'lucide-react'

interface DrawingCanvasProps {
  roomId: string
  canDraw: boolean
  currentRound: number
}

interface DrawingStroke {
  id: string
  roomId: string
  roundNumber: number
  strokeData: string
  createdAt: string
}

interface Point {
  x: number
  y: number
}

interface StrokeData {
  points: Point[]
  color: string
  size: number
  isEraser: boolean
}

const COLORS = [
  '#000000', // Black
  '#FF6B6B', // Red
  '#4ECDC4', // Teal
  '#45B7D1', // Blue
  '#96CEB4', // Green
  '#FFEAA7', // Yellow
  '#DDA0DD', // Plum
  '#FFA07A', // Light Salmon
  '#98D8C8', // Mint
  '#F7DC6F', // Light Yellow
  '#BB8FCE', // Light Purple
  '#85C1E9'  // Light Blue
]

export function DrawingCanvas({ roomId, canDraw, currentRound }: DrawingCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [currentColor, setCurrentColor] = useState('#000000')
  const [brushSize, setBrushSize] = useState([5])
  const [isEraser, setIsEraser] = useState(false)
  const [strokes, setStrokes] = useState<DrawingStroke[]>([])
  const [currentStroke, setCurrentStroke] = useState<Point[]>([])
  const realtimeChannelRef = useRef<any>(null)

  const drawStroke = useCallback((ctx: CanvasRenderingContext2D, strokeData: StrokeData) => {
    if (!strokeData.points || strokeData.points.length < 2) return

    ctx.beginPath()
    ctx.strokeStyle = strokeData.color
    ctx.lineWidth = strokeData.size
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'

    if (strokeData.isEraser) {
      ctx.globalCompositeOperation = 'destination-out'
    } else {
      ctx.globalCompositeOperation = 'source-over'
    }

    ctx.moveTo(strokeData.points[0].x, strokeData.points[0].y)
    
    for (let i = 1; i < strokeData.points.length; i++) {
      ctx.lineTo(strokeData.points[i].x, strokeData.points[i].y)
    }
    
    ctx.stroke()
  }, [])

  const redrawCanvas = useCallback((strokesData: DrawingStroke[]) => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    // Redraw all strokes
    strokesData.forEach(stroke => {
      try {
        const strokeData = JSON.parse(stroke.strokeData) as StrokeData
        drawStroke(ctx, strokeData)
      } catch (error) {
        console.error('Error parsing stroke data:', error)
      }
    })
  }, [drawStroke])

  const loadStrokes = useCallback(async () => {
    try {
      const strokesData = await blink.db.drawingStrokes.list({
        where: { 
          roomId,
          roundNumber: currentRound 
        },
        orderBy: { createdAt: 'asc' }
      })
      
      setStrokes(strokesData as DrawingStroke[])
      redrawCanvas(strokesData as DrawingStroke[])
    } catch (error) {
      console.error('Error loading strokes:', error)
    }
  }, [roomId, currentRound, redrawCanvas])

  // Set up real-time drawing synchronization
  useEffect(() => {
    if (!roomId) return

    const setupRealtime = async () => {
      try {
        const unsubscribe = await blink.realtime.subscribe(`drawing_${roomId}`, (message) => {
          if (message.type === 'new_stroke') {
            loadStrokes()
          } else if (message.type === 'canvas_cleared') {
            setStrokes([])
            const canvas = canvasRef.current
            if (canvas) {
              const ctx = canvas.getContext('2d')
              if (ctx) {
                ctx.clearRect(0, 0, canvas.width, canvas.height)
                ctx.fillStyle = '#ffffff'
                ctx.fillRect(0, 0, canvas.width, canvas.height)
              }
            }
          }
        })

        realtimeChannelRef.current = unsubscribe
      } catch (error) {
        console.error('Error setting up drawing realtime:', error)
      }
    }

    setupRealtime()
    loadStrokes()

    return () => {
      if (realtimeChannelRef.current) {
        realtimeChannelRef.current()
      }
    }
  }, [roomId, loadStrokes])

  const getMousePos = (e: React.MouseEvent<HTMLCanvasElement>): Point => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }

    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height

    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    }
  }

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canDraw) return

    setIsDrawing(true)
    const point = getMousePos(e)
    setCurrentStroke([point])

    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.beginPath()
    ctx.moveTo(point.x, point.y)
  }

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !canDraw) return

    const canvas = canvasRef.current
    if (!canvas) return

    const point = getMousePos(e)
    setCurrentStroke(prev => [...prev, point])

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.strokeStyle = isEraser ? '#ffffff' : currentColor
    ctx.lineWidth = brushSize[0]
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'

    if (isEraser) {
      ctx.globalCompositeOperation = 'destination-out'
    } else {
      ctx.globalCompositeOperation = 'source-over'
    }

    ctx.lineTo(point.x, point.y)
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(point.x, point.y)
  }

  const stopDrawing = async () => {
    if (!isDrawing || !canDraw || currentStroke.length < 2) {
      setIsDrawing(false)
      setCurrentStroke([])
      return
    }

    setIsDrawing(false)

    // Save stroke to database
    const strokeData: StrokeData = {
      points: currentStroke,
      color: isEraser ? '#ffffff' : currentColor,
      size: brushSize[0],
      isEraser
    }

    try {
      const strokeId = `stroke_${Date.now()}_${Math.random()}`
      await blink.db.drawingStrokes.create({
        id: strokeId,
        roomId,
        roundNumber: currentRound,
        strokeData: JSON.stringify(strokeData)
      })

      // Notify other players about new stroke
      await blink.realtime.publish(`drawing_${roomId}`, 'new_stroke', {
        strokeId,
        roundNumber: currentRound
      })

      setCurrentStroke([])
    } catch (error) {
      console.error('Error saving stroke:', error)
    }
  }

  const clearCanvas = async () => {
    if (!canDraw) return

    try {
      // Delete all strokes for current round
      const currentStrokes = await blink.db.drawingStrokes.list({
        where: { roomId, roundNumber: currentRound }
      })

      for (const stroke of currentStrokes) {
        await blink.db.drawingStrokes.delete(stroke.id)
      }

      // Clear canvas visually
      const canvas = canvasRef.current
      if (!canvas) return

      const ctx = canvas.getContext('2d')
      if (!ctx) return

      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      setStrokes([])

      // Notify other players about canvas clear
      await blink.realtime.publish(`drawing_${roomId}`, 'canvas_cleared', {
        roundNumber: currentRound
      })
    } catch (error) {
      console.error('Error clearing canvas:', error)
    }
  }

  const undoLastStroke = async () => {
    if (!canDraw || strokes.length === 0) return

    try {
      // Remove the last stroke
      const lastStroke = strokes[strokes.length - 1]
      await blink.db.drawingStrokes.delete(lastStroke.id)

      // Reload and redraw
      loadStrokes()

      // Notify other players
      await blink.realtime.publish(`drawing_${roomId}`, 'new_stroke', {
        action: 'undo',
        roundNumber: currentRound
      })
    } catch (error) {
      console.error('Error undoing stroke:', error)
    }
  }

  return (
    <Card className="p-4 h-full flex flex-col">
      {/* Drawing Tools */}
      {canDraw && (
        <div className="mb-4 space-y-4">
          {/* Color Palette */}
          <div className="flex flex-wrap gap-2">
            {COLORS.map((color) => (
              <button
                key={color}
                className={`w-8 h-8 rounded-full border-2 transition-all hover:scale-110 ${ 
                  currentColor === color && !isEraser
                    ? 'border-gray-800 scale-110 ring-2 ring-primary'
                    : 'border-gray-300'
                }`}
                style={{ backgroundColor: color }}
                onClick={() => {
                  setCurrentColor(color)
                  setIsEraser(false)
                }}
              />
            ))}
            
            {/* Eraser */}
            <Button
              variant={isEraser ? 'default' : 'outline'}
              size="sm"
              onClick={() => setIsEraser(!isEraser)}
              className="ml-2"
            >
              <Eraser className="h-4 w-4" />
            </Button>

            {/* Undo */}
            <Button
              variant="outline"
              size="sm"
              onClick={undoLastStroke}
              disabled={strokes.length === 0}
              className="ml-1"
            >
              <Undo className="h-4 w-4" />
            </Button>

            {/* Clear Canvas */}
            <Button
              variant="outline"
              size="sm"
              onClick={clearCanvas}
              className="ml-1"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>

          {/* Brush Size */}
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium">Size:</span>
            <div className="flex-1 max-w-32">
              <Slider
                value={brushSize}
                onValueChange={setBrushSize}
                max={20}
                min={1}
                step={1}
                className="w-full"
              />
            </div>
            <span className="text-sm text-muted-foreground w-8">{brushSize[0]}px</span>
          </div>

          {/* Current Tool Display */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <div 
              className="w-4 h-4 rounded-full border"
              style={{ 
                backgroundColor: isEraser ? '#f0f0f0' : currentColor,
                borderColor: isEraser ? '#ccc' : currentColor
              }}
            />
            <span>
              {isEraser ? 'Eraser' : 'Brush'} - {brushSize[0]}px
            </span>
          </div>
        </div>
      )}

      {/* Canvas */}
      <div className="flex-1 bg-white rounded-lg border-2 border-dashed border-gray-300 relative overflow-hidden">
        <canvas
          ref={canvasRef}
          width={800}
          height={600}
          className="w-full h-full"
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          style={{
            cursor: canDraw ? (isEraser ? 'grab' : 'crosshair') : 'not-allowed'
          }}
        />
        
        {!canDraw && (
          <div className="absolute inset-0 bg-black/10 flex items-center justify-center">
            <div className="bg-white/90 px-4 py-2 rounded-lg text-center">
              <Palette className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                {currentRound === 0 ? 'Game not started' : 'Wait for your turn to draw'}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Canvas Info */}
      <div className="mt-2 text-center text-xs text-muted-foreground">
        {canDraw ? (
          <span className="text-primary font-medium">🎨 Your turn to draw!</span>
        ) : (
          <span>Watching {strokes.length} stroke{strokes.length !== 1 ? 's' : ''}</span>
        )}
      </div>
    </Card>
  )
}