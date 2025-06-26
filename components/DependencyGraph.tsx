"use client"
import { useEffect, useRef, useState } from 'react';
import { TodoWithCalculations } from '@/lib/dependencies';

interface DependencyGraphProps {
  todos: TodoWithCalculations[];
  onTodoClick?: (todoId: number) => void;
}

interface Node {
  id: number;
  title: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  isOnCriticalPath: boolean;
  level: number;
  isHovered: boolean;
}

interface Edge {
  from: number;
  to: number;
  isOnCriticalPath: boolean;
  isHighlighted: boolean;
}

export default function DependencyGraph({ todos, onTodoClick }: DependencyGraphProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const [hoveredNode, setHoveredNode] = useState<number | null>(null);
  const [animationTime, setAnimationTime] = useState(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || todos.length === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * window.devicePixelRatio;
    canvas.height = rect.height * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

    const width = rect.width;
    const height = rect.height;

    // Calculate hierarchical levels
    const calculateLevels = () => {
      const levels = new Map<number, number>();
      const visited = new Set<number>();
      
      const dfs = (todoId: number): number => {
        if (visited.has(todoId)) return levels.get(todoId) || 0;
        visited.add(todoId);
        
        const todo = todos.find(t => t.id === todoId);
        if (!todo || !todo.dependsOn || todo.dependsOn.length === 0) {
          levels.set(todoId, 0);
          return 0;
        }
        
        const maxDepLevel = Math.max(...todo.dependsOn.map(depId => dfs(depId)));
        const level = maxDepLevel + 1;
        levels.set(todoId, level);
        return level;
      };
      
      todos.forEach(todo => dfs(todo.id));
      return levels;
    };

    const levelMap = calculateLevels();
    const maxLevel = Math.max(...Array.from(levelMap.values()));

    // Create nodes with hierarchical positioning
    const nodes: Node[] = todos.map((todo, index) => {
      const level = levelMap.get(todo.id) || 0;
      const nodesAtLevel = todos.filter(t => (levelMap.get(t.id) || 0) === level);
      const indexAtLevel = nodesAtLevel.findIndex(t => t.id === todo.id);
      
      return {
        id: todo.id,
        title: todo.title,
        x: (width / (maxLevel + 1)) * level + 80,
        y: (height / (nodesAtLevel.length + 1)) * (indexAtLevel + 1),
        vx: 0,
        vy: 0,
        isOnCriticalPath: todo.isOnCriticalPath || false,
        level: level,
        isHovered: hoveredNode === todo.id,
      };
    });

    // Create enhanced edges
    const edges: Edge[] = [];
    todos.forEach(todo => {
      if (todo.dependsOn) {
        todo.dependsOn.forEach(depId => {
          const fromNode = nodes.find(n => n.id === depId);
          const toNode = nodes.find(n => n.id === todo.id);
          const isOnCriticalPath = fromNode?.isOnCriticalPath && toNode?.isOnCriticalPath;
          const isHighlighted = hoveredNode === depId || hoveredNode === todo.id;
          
          edges.push({ 
            from: depId, 
            to: todo.id, 
            isOnCriticalPath: isOnCriticalPath || false,
            isHighlighted: isHighlighted
          });
        });
      }
    });

    // Enhanced force simulation
    const simulate = () => {
      nodes.forEach(node => {
        // Update hover state
        node.isHovered = hoveredNode === node.id;
        
        // Vertical alignment within level
        const nodesAtLevel = nodes.filter(n => n.level === node.level);
        const targetY = (height / (nodesAtLevel.length + 1)) * (nodesAtLevel.findIndex(n => n.id === node.id) + 1);
        node.vy += (targetY - node.y) * 0.02;
        
        // Horizontal level positioning
        const targetX = (width / (maxLevel + 1)) * node.level + 80;
        node.vx += (targetX - node.x) * 0.02;

        // Enhanced repulsion between nodes
        nodesAtLevel.forEach(other => {
          if (node.id !== other.id) {
            const dy = node.y - other.y;
            const distance = Math.abs(dy);
            if (distance < 80) {
              const force = (80 - distance) * 0.3;
              node.vy += dy > 0 ? force : -force;
            }
          }
        });

        // Damping
        node.vx *= 0.85;
        node.vy *= 0.85;

        // Update position
        node.x += node.vx;
        node.y += node.vy;

        // Keep nodes in bounds
        node.x = Math.max(60, Math.min(width - 60, node.x));
        node.y = Math.max(50, Math.min(height - 50, node.y));
      });
    };

    // Create gradient for edges
    const createEdgeGradient = (fromX: number, fromY: number, toX: number, toY: number, isOnCriticalPath: boolean, isHighlighted: boolean) => {
      const gradient = ctx.createLinearGradient(fromX, fromY, toX, toY);
      
      if (isOnCriticalPath) {
        gradient.addColorStop(0, isHighlighted ? '#ef4444' : '#dc2626');
        gradient.addColorStop(0.5, isHighlighted ? '#f87171' : '#ef4444');
        gradient.addColorStop(1, isHighlighted ? '#dc2626' : '#b91c1c');
      } else {
        gradient.addColorStop(0, isHighlighted ? '#3b82f6' : '#64748b');
        gradient.addColorStop(0.5, isHighlighted ? '#60a5fa' : '#94a3b8');
        gradient.addColorStop(1, isHighlighted ? '#1d4ed8' : '#475569');
      }
      
      return gradient;
    };

    // Enhanced render function
    const render = () => {
      ctx.clearRect(0, 0, width, height);

      // Draw subtle background grid
      ctx.strokeStyle = '#f1f5f9';
      ctx.lineWidth = 0.5;
      ctx.setLineDash([2, 4]);
      for (let i = 0; i <= maxLevel; i++) {
        const x = (width / (maxLevel + 1)) * i + 80;
        ctx.beginPath();
        ctx.moveTo(x, 30);
        ctx.lineTo(x, height - 30);
        ctx.stroke();
      }
      ctx.setLineDash([]);

      // Draw enhanced edges with multiple styles
      edges.forEach(edge => {
        const fromNode = nodes.find(n => n.id === edge.from);
        const toNode = nodes.find(n => n.id === edge.to);
        if (fromNode && toNode) {
          const isHighlighted = edge.isHighlighted || fromNode.isHovered || toNode.isHovered;
          
          // Calculate control points for smooth curves
          const dx = toNode.x - fromNode.x;
          const dy = toNode.y - fromNode.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          
          const controlOffset = Math.min(distance * 0.4, 100);
          const controlX1 = fromNode.x + controlOffset;
          const controlY1 = fromNode.y;
          const controlX2 = toNode.x - controlOffset;
          const controlY2 = toNode.y;

          // Draw edge shadow for depth
          ctx.strokeStyle = 'rgba(0, 0, 0, 0.15)';
          ctx.lineWidth = edge.isOnCriticalPath ? 5 : 3;
          ctx.beginPath();
          ctx.moveTo(fromNode.x + 32, fromNode.y + 2);
          ctx.bezierCurveTo(controlX1 + 2, controlY1 + 2, controlX2 + 2, controlY2 + 2, toNode.x - 28, toNode.y + 2);
          ctx.stroke();

          // Draw main edge with gradient
          const gradient = createEdgeGradient(fromNode.x, fromNode.y, toNode.x, toNode.y, edge.isOnCriticalPath, isHighlighted);
          ctx.strokeStyle = gradient;
          ctx.lineWidth = edge.isOnCriticalPath ? (isHighlighted ? 4 : 3) : (isHighlighted ? 3 : 2);
          
          ctx.beginPath();
          ctx.moveTo(fromNode.x + 30, fromNode.y);
          ctx.bezierCurveTo(controlX1, controlY1, controlX2, controlY2, toNode.x - 30, toNode.y);
          ctx.stroke();

          // Draw animated flow dots for critical path
          if (edge.isOnCriticalPath) {
            const t = (animationTime * 0.002) % 1;
            const flowX = fromNode.x + 30 + (toNode.x - fromNode.x - 60) * t;
            const flowY = fromNode.y + (toNode.y - fromNode.y) * t;
            
            ctx.fillStyle = isHighlighted ? '#fbbf24' : '#f59e0b';
            ctx.beginPath();
            ctx.arc(flowX, flowY, isHighlighted ? 4 : 3, 0, 2 * Math.PI);
            ctx.fill();
          }

          // Draw enhanced arrow
          const arrowX = toNode.x - 30;
          const arrowY = toNode.y;
          const angle = Math.atan2(controlY2 - toNode.y, controlX2 - toNode.x);
          const arrowSize = edge.isOnCriticalPath ? (isHighlighted ? 14 : 12) : (isHighlighted ? 12 : 10);
          
          // Arrow shadow
          ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
          ctx.beginPath();
          ctx.moveTo(arrowX + 2, arrowY + 2);
          ctx.lineTo(
            arrowX - arrowSize * Math.cos(angle - Math.PI / 6) + 2,
            arrowY - arrowSize * Math.sin(angle - Math.PI / 6) + 2
          );
          ctx.lineTo(
            arrowX - arrowSize * Math.cos(angle + Math.PI / 6) + 2,
            arrowY - arrowSize * Math.sin(angle + Math.PI / 6) + 2
          );
          ctx.closePath();
          ctx.fill();

          // Main arrow
          ctx.fillStyle = edge.isOnCriticalPath ? 
            (isHighlighted ? '#dc2626' : '#b91c1c') : 
            (isHighlighted ? '#3b82f6' : '#64748b');
          ctx.beginPath();
          ctx.moveTo(arrowX, arrowY);
          ctx.lineTo(
            arrowX - arrowSize * Math.cos(angle - Math.PI / 6),
            arrowY - arrowSize * Math.sin(angle - Math.PI / 6)
          );
          ctx.lineTo(
            arrowX - arrowSize * Math.cos(angle + Math.PI / 6),
            arrowY - arrowSize * Math.sin(angle + Math.PI / 6)
          );
          ctx.closePath();
          ctx.fill();
        }
      });

      // Draw enhanced nodes with glow effects
      nodes.forEach(node => {
        const nodeSize = node.isHovered ? 32 : 28;
        const glowSize = node.isHovered ? 40 : 0;
        
        // Draw glow effect for hovered nodes
        if (node.isHovered) {
          const glowGradient = ctx.createRadialGradient(node.x, node.y, 0, node.x, node.y, glowSize);
          glowGradient.addColorStop(0, node.isOnCriticalPath ? 'rgba(220, 38, 38, 0.3)' : 'rgba(59, 130, 246, 0.3)');
          glowGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
          
          ctx.fillStyle = glowGradient;
          ctx.beginPath();
          ctx.arc(node.x, node.y, glowSize, 0, 2 * Math.PI);
          ctx.fill();
        }

        // Node shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
        ctx.beginPath();
        ctx.ellipse(node.x + 3, node.y + 3, nodeSize, nodeSize * 0.7, 0, 0, 2 * Math.PI);
        ctx.fill();
        
        // Node background with gradient
        const nodeGradient = ctx.createRadialGradient(node.x - 8, node.y - 8, 0, node.x, node.y, nodeSize);
        if (node.isOnCriticalPath) {
          nodeGradient.addColorStop(0, node.isHovered ? '#fef2f2' : '#fef2f2');
          nodeGradient.addColorStop(1, node.isHovered ? '#fee2e2' : '#fef2f2');
        } else {
          nodeGradient.addColorStop(0, node.isHovered ? '#f0f9ff' : '#f8fafc');
          nodeGradient.addColorStop(1, node.isHovered ? '#e0f2fe' : '#f1f5f9');
        }
        
        ctx.fillStyle = nodeGradient;
        ctx.beginPath();
        ctx.ellipse(node.x, node.y, nodeSize, nodeSize * 0.7, 0, 0, 2 * Math.PI);
        ctx.fill();

        // Node border with enhanced styling
        ctx.strokeStyle = node.isOnCriticalPath ? 
          (node.isHovered ? '#dc2626' : '#ef4444') : 
          (node.isHovered ? '#2563eb' : '#3b82f6');
        ctx.lineWidth = node.isHovered ? 3 : 2;
        ctx.stroke();

        // Inner highlight
        ctx.strokeStyle = node.isOnCriticalPath ? 
          'rgba(220, 38, 38, 0.3)' : 
          'rgba(59, 130, 246, 0.3)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.ellipse(node.x, node.y, nodeSize - 3, (nodeSize - 3) * 0.7, 0, 0, 2 * Math.PI);
        ctx.stroke();

        // Node text with better typography
        ctx.fillStyle = node.isOnCriticalPath ? '#991b1b' : '#1e40af';
        ctx.font = node.isHovered ? 'bold 12px sans-serif' : 'bold 11px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        // Truncate title if too long
        let displayTitle = node.title;
        if (displayTitle.length > 12) {
          displayTitle = displayTitle.substring(0, 12) + '...';
        }
        
        ctx.fillText(displayTitle, node.x, node.y - 3);
        
        // Add ID number with better styling
        ctx.font = node.isHovered ? '10px sans-serif' : '9px sans-serif';
        ctx.fillStyle = '#64748b';
        ctx.fillText(`#${node.id}`, node.x, node.y + 12);
      });

      // Draw enhanced level labels
      ctx.fillStyle = '#475569';
      ctx.font = 'bold 13px sans-serif';
      ctx.textAlign = 'center';
      for (let i = 0; i <= maxLevel; i++) {
        const x = (width / (maxLevel + 1)) * i + 80;
        
        // Label background
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.fillRect(x - 25, 5, 50, 20);
        
        // Label border
        ctx.strokeStyle = '#e2e8f0';
        ctx.lineWidth = 1;
        ctx.strokeRect(x - 25, 5, 50, 20);
        
        // Label text
        ctx.fillStyle = '#475569';
        ctx.fillText(`Level ${i}`, x, 16);
      }
    };

    // Animation loop with time tracking
    const animate = () => {
      setAnimationTime(prev => prev + 16);
      simulate();
      render();
      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    // Enhanced mouse handling
    const handleMouseMove = (event: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;

      const hoveredNode = nodes.find(node => {
        const dx = x - node.x;
        const dy = y - node.y;
        return Math.sqrt(dx * dx + dy * dy) < 30;
      });

      setHoveredNode(hoveredNode ? hoveredNode.id : null);
      canvas.style.cursor = hoveredNode ? 'pointer' : 'default';
    };

    const handleClick = (event: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;

      const clickedNode = nodes.find(node => {
        const dx = x - node.x;
        const dy = y - node.y;
        return Math.sqrt(dx * dx + dy * dy) < 30;
      });

      if (clickedNode && onTodoClick) {
        onTodoClick(clickedNode.id);
      }
    };

    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('click', handleClick);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('click', handleClick);
    };
  }, [todos, onTodoClick, hoveredNode, animationTime]);

  if (todos.length === 0) {
    return (
      <div className="bg-white bg-opacity-90 p-6 rounded-lg shadow-lg text-center">
        <p className="text-gray-600">No todos to display in dependency graph</p>
      </div>
    );
  }

  return (
    <div className="bg-white bg-opacity-95 p-4 rounded-xl shadow-xl border border-gray-200">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-bold text-gray-800">📊 Dependency Graph</h3>
        <div className="flex items-center space-x-4 text-sm">
          <div className="flex items-center">
            <div className="w-4 h-3 bg-gradient-to-r from-blue-400 to-blue-600 rounded-full mr-2 border-2 border-blue-600 shadow-sm"></div>
            <span className="text-gray-600">Regular Task</span>
          </div>
          <div className="flex items-center">
            <div className="w-4 h-3 bg-gradient-to-r from-red-400 to-red-600 rounded-full mr-2 border-2 border-red-600 shadow-sm"></div>
            <span className="text-gray-600">Critical Path</span>
          </div>
          <div className="flex items-center">
            <div className="w-2 h-2 bg-yellow-500 rounded-full mr-2 animate-pulse"></div>
            <span className="text-gray-600">Flow Animation</span>
          </div>
        </div>
      </div>
      <div className="mb-3 text-xs text-gray-500 bg-gray-50 p-2 rounded-lg">
        <p>• <strong>Hover</strong> over nodes to see glow effects and enhanced connections</p>
        <p>• <strong>Critical path</strong> shows animated flow dots indicating task sequence</p>
        <p>• <strong>Curved edges</strong> with gradients show dependency relationships</p>
      </div>
      <canvas
        ref={canvasRef}
        className="w-full h-80 border border-gray-300 rounded-lg cursor-pointer bg-gradient-to-br from-gray-50 to-white shadow-inner"
        style={{ width: '100%', height: '320px' }}
      />
      <p className="text-xs text-gray-500 mt-2 text-center">
        ✨ <strong>Interactive:</strong> Click nodes to scroll to tasks • Hover for enhanced visual effects
      </p>
    </div>
  );
} 