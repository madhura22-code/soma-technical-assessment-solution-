import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { calculateSchedule, type TodoWithDependencies } from '@/lib/dependencies';

export async function GET() {
  try {
    const todos = await prisma.todo.findMany({
      orderBy: {
        createdAt: 'desc',
      },
    });
    
    // Convert to TodoWithDependencies format with proper type casting
    const todosWithDeps: TodoWithDependencies[] = todos.map(todo => ({
      ...(todo as any),
      dependencies: (todo as any).dependencies || undefined,
      duration: (todo as any).duration || undefined,
      imageUrl: todo.imageUrl || undefined,
    }));
    
    // Calculate schedule with critical path and earliest start dates
    const todosWithCalculations = calculateSchedule(todosWithDeps);
    
    return NextResponse.json({
      todos: todosWithCalculations,
      totalTodos: todos.length,
      criticalPathTodos: todosWithCalculations.filter(todo => todo.isOnCriticalPath).length
    });
  } catch (error) {
    console.error('Error fetching todos with dependencies:', error);
    return NextResponse.json({ error: 'Error fetching todos with dependencies' }, { status: 500 });
  }
} 