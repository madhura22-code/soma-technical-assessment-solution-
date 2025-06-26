import { Todo } from '@prisma/client';

export type TodoWithDependencies = Todo & {
  dependencies?: string;
  duration?: number;
  imageUrl?: string;
};

export type TodoWithCalculations = TodoWithDependencies & {
  earliestStart?: Date;
  isOnCriticalPath?: boolean;
  dependsOn?: number[];
};

// Parse dependencies from JSON string
export function parseDependencies(dependencies: string | null): number[] {
  if (!dependencies) return [];
  try {
    const parsed = JSON.parse(dependencies);
    return Array.isArray(parsed) ? parsed.filter(id => typeof id === 'number') : [];
  } catch {
    return [];
  }
}

// Check for circular dependencies using DFS
export function hasCircularDependency(todos: TodoWithDependencies[], newTodo: { id?: number; dependencies: number[] }): boolean {
  const graph = new Map<number, number[]>();
  
  // Build dependency graph
  todos.forEach(todo => {
    const deps = parseDependencies(todo.dependencies || null);
    graph.set(todo.id, deps);
  });
  
  // Add new todo to graph
  if (newTodo.id !== undefined) {
    graph.set(newTodo.id, newTodo.dependencies);
  }
  
  // DFS to detect cycles
  const visited = new Set<number>();
  const recursionStack = new Set<number>();
  
  function hasCycle(nodeId: number): boolean {
    if (recursionStack.has(nodeId)) return true;
    if (visited.has(nodeId)) return false;
    
    visited.add(nodeId);
    recursionStack.add(nodeId);
    
    const dependencies = graph.get(nodeId) || [];
    for (const depId of dependencies) {
      if (hasCycle(depId)) return true;
    }
    
    recursionStack.delete(nodeId);
    return false;
  }
  
  // Check all nodes for cycles
  Array.from(graph.keys()).forEach(nodeId => {
    if (hasCycle(nodeId)) return true;
  });
  
  return false;
}

// Topological sort to find dependency order
export function topologicalSort(todos: TodoWithDependencies[]): number[] {
  const graph = new Map<number, number[]>();
  const inDegree = new Map<number, number>();
  
  // Initialize
  todos.forEach(todo => {
    graph.set(todo.id, []);
    inDegree.set(todo.id, 0);
  });
  
  // Build graph and calculate in-degrees
  todos.forEach(todo => {
    const deps = parseDependencies(todo.dependencies || null);
    deps.forEach(depId => {
      if (graph.has(depId)) {
        graph.get(depId)!.push(todo.id);
        inDegree.set(todo.id, (inDegree.get(todo.id) || 0) + 1);
      }
    });
  });
  
  // Kahn's algorithm
  const queue: number[] = [];
  const result: number[] = [];
  
  // Start with nodes that have no dependencies
  inDegree.forEach((degree, nodeId) => {
    if (degree === 0) queue.push(nodeId);
  });
  
  while (queue.length > 0) {
    const current = queue.shift()!;
    result.push(current);
    
    const neighbors = graph.get(current) || [];
    neighbors.forEach(neighbor => {
      inDegree.set(neighbor, inDegree.get(neighbor)! - 1);
      if (inDegree.get(neighbor) === 0) {
        queue.push(neighbor);
      }
    });
  }
  
  return result;
}

// Calculate earliest start dates and critical path
export function calculateSchedule(todos: TodoWithDependencies[]): TodoWithCalculations[] {
  const todoMap = new Map(todos.map(todo => [todo.id, { ...todo }]));
  const sortedIds = topologicalSort(todos);
  
  // Calculate earliest start dates
  const earliestStart = new Map<number, Date>();
  const completionTime = new Map<number, Date>();
  
  sortedIds.forEach(todoId => {
    const todo = todoMap.get(todoId)!;
    const deps = parseDependencies(todo.dependencies || null);
    
    let maxCompletionTime = new Date();
    
    // Find the latest completion time of dependencies
    deps.forEach(depId => {
      const depCompletionTime = completionTime.get(depId);
      if (depCompletionTime && depCompletionTime > maxCompletionTime) {
        maxCompletionTime = depCompletionTime;
      }
    });
    
    earliestStart.set(todoId, maxCompletionTime);
    
    // Calculate completion time (start + duration)
    const duration = todo.duration || 1; // Default 1 hour if not specified
    const completion = new Date(maxCompletionTime.getTime() + duration * 60 * 60 * 1000);
    completionTime.set(todoId, completion);
  });
  
  // Find critical path (longest path through the network)
  const criticalPath = findCriticalPath(todos, earliestStart, completionTime);
  
  // Return todos with calculations
  return todos.map(todo => ({
    ...todo,
    dependsOn: parseDependencies(todo.dependencies || null),
    earliestStart: earliestStart.get(todo.id),
    isOnCriticalPath: criticalPath.includes(todo.id)
  }));
}

// Find critical path using longest path algorithm
function findCriticalPath(
  todos: TodoWithDependencies[], 
  earliestStart: Map<number, Date>, 
  completionTime: Map<number, Date>
): number[] {
  // Find the task with the latest completion time
  let latestCompletion = new Date(0);
  let endTask = -1;
  
  completionTime.forEach((time, todoId) => {
    if (time > latestCompletion) {
      latestCompletion = time;
      endTask = todoId;
    }
  });
  
  if (endTask === -1) return [];
  
  // Trace back the critical path
  const criticalPath: number[] = [];
  const visited = new Set<number>();
  
  function tracePath(todoId: number): void {
    if (visited.has(todoId)) return;
    visited.add(todoId);
    criticalPath.push(todoId);
    
    const todo = todos.find(t => t.id === todoId);
    if (!todo) return;
    
    const deps = parseDependencies(todo.dependencies || null);
    const todoStart = earliestStart.get(todoId)!;
    
    // Find the dependency that determines this task's start time
    let criticalDep = -1;
    let latestDepCompletion = new Date(0);
    
    deps.forEach(depId => {
      const depCompletion = completionTime.get(depId);
      if (depCompletion && Math.abs(depCompletion.getTime() - todoStart.getTime()) < 1000) {
        if (depCompletion > latestDepCompletion) {
          latestDepCompletion = depCompletion;
          criticalDep = depId;
        }
      }
    });
    
    if (criticalDep !== -1) {
      tracePath(criticalDep);
    }
  }
  
  tracePath(endTask);
  return criticalPath.reverse();
} 