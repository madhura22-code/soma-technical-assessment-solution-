"use client"
import { Todo } from '@prisma/client';
import { useState, useEffect } from 'react';
import Image from 'next/image';
import { parseDependencies } from '@/lib/dependencies';
import DependencyGraph from '@/components/DependencyGraph';

// Extend the Todo type to include dependencies
type TodoWithImage = Todo & {
  imageUrl?: string;
  dependencies?: string;
  duration?: number;
};

export default function Home() {
  const [newTodo, setNewTodo] = useState('');
  const [todos, setTodos] = useState<TodoWithImage[]>([]);
  const [dueDate, setDueDate] = useState(''); 
  const [duration, setDuration] = useState('');
  const [selectedDependencies, setSelectedDependencies] = useState<number[]>([]);
  const [loadingTodos, setLoadingTodos] = useState<Set<number>>(new Set());
  const [showDependencies, setShowDependencies] = useState(false);
  const [showGraph, setShowGraph] = useState(false);

  useEffect(() => {
    fetchTodos();
  }, []);

  const fetchTodos = async () => {
    try {
      // Fetch todos in dependency order
      const res = await fetch('/api/todos/dependencies');
      const data = await res.json();
      setTodos(data.todos || []);
    } catch (error) {
      console.error('Failed to fetch todos:', error);
      // Fallback to regular todos endpoint
      try {
        const res = await fetch('/api/todos');
        const data = await res.json();
        setTodos(data);
      } catch (fallbackError) {
        console.error('Fallback fetch also failed:', fallbackError);
      }
    }
  };

  const handleAddTodo = async () => {
    if (!newTodo.trim() || !dueDate) return;
    try {
      const todoData = {
        title: newTodo,
        dueDate,
        ...(duration && { duration: parseInt(duration) }),
        ...(selectedDependencies.length > 0 && { 
          dependencies: JSON.stringify(selectedDependencies) 
        })
      };

      await fetch('/api/todos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(todoData),
      });
      
      setNewTodo('');
      setDueDate('');
      setDuration('');
      setSelectedDependencies([]);
      fetchTodos();
    } catch (error) {
      console.error('Failed to add todo:', error);
    }
  };

  const handleDeleteTodo = async (id: any) => {
    try {
      await fetch(`/api/todos/${id}`, {
        method: 'DELETE',
      });
      fetchTodos();
    } catch (error) {
      console.error('Failed to delete todo:', error);
    }
  };

  const handleDependencyToggle = (todoId: number) => {
    setSelectedDependencies(prev => 
      prev.includes(todoId) 
        ? prev.filter(id => id !== todoId)
        : [...prev, todoId]
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };
  
  const isOverdue = (dueDate: string) => {
    return new Date(dueDate) < new Date();
  };

  const handleImageLoad = (todoId: number) => {
    setLoadingTodos(prev => {
      const newSet = new Set(prev);
      newSet.delete(todoId);
      return newSet;
    });
  };

  const handleImageError = (todoId: number) => {
    setLoadingTodos(prev => {
      const newSet = new Set(prev);
      newSet.delete(todoId);
      return newSet;
    });
  };

  const getDependentTodos = (todoId: number): TodoWithImage[] => {
    return todos.filter(todo => {
      const deps = parseDependencies(todo.dependencies || null);
      return deps.includes(todoId);
    });
  };

  const getTodoById = (id: number): TodoWithImage | undefined => {
    return todos.find(todo => todo.id === id);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-500 to-red-500 flex flex-col items-center p-4">
      <div className="w-full max-w-2xl">
        <h1 className="text-4xl font-bold text-center text-white mb-8">
          To Do List
          
        </h1>
        
        {/* Add Todo Form */}
        <div className="bg-white bg-opacity-90 p-6 rounded-lg shadow-lg mb-6">
          <div className="flex mb-4">
            <input
              type="text"
              className="flex-grow p-3 rounded-l-full focus:outline-none text-gray-700 placeholder-gray-500"
              placeholder="Add a new todo"
              value={newTodo}
              onChange={(e) => setNewTodo(e.target.value)}
            />
            <input 
              type="date" 
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className={`p-3 border-l border-gray-300 focus:outline-none text-sm ${
                dueDate ? 'text-black' : 'text-gray-400'
              }`}
            />
            <div className="relative">
              <input
                type="number"
                placeholder="Hours"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                min="0.5"
                step="0.5"
                className={`w-24 p-3 border-l border-gray-300 focus:outline-none text-sm font-medium ${
                  duration ? 'text-black bg-indigo-50' : 'text-gray-700 placeholder-gray-600'
                } focus:bg-indigo-50 focus:text-black focus:border-indigo-300`}
              />
              {/* Hours label */}
              
            </div>
            <button
              onClick={handleAddTodo}
              className="bg-indigo-600 text-white p-3 rounded-r-full hover:bg-indigo-700 transition duration-300 font-medium"
            >
              Add
            </button>
          </div>
          
          {/* Dependencies Section */}
          {todos.length > 0 && (
            <div className="mt-4">
              <button
                onClick={() => setShowDependencies(!showDependencies)}
                className="text-sm text-indigo-600 hover:text-indigo-800 mb-2"
              >
                {showDependencies ? '▼' : '▶'} This task depends on: ({selectedDependencies.length} selected)
              </button>
              
              {showDependencies && (
                <div className="max-h-32 overflow-y-auto bg-gray-50 rounded p-3">
                  {todos.map(todo => (
                    <label key={todo.id} className="flex items-center mb-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedDependencies.includes(todo.id)}
                        onChange={() => handleDependencyToggle(todo.id)}
                        className="mr-2"
                      />
                      <span className="text-sm text-gray-700">{todo.title}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Todos List */}
        {showGraph && todos.length > 0 && (
          <div className="mb-6">
            <DependencyGraph 
              todos={todos} 
              onTodoClick={(todoId) => {
                const element = document.getElementById(`todo-${todoId}`);
                element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
              }}
            />
          </div>
        )}

        {/* Toggle Graph Button */}
        {todos.length > 0 && (
          <div className="mb-4 text-center">
            <button
              onClick={() => setShowGraph(!showGraph)}
              className="bg-white bg-opacity-90 text-indigo-600 px-4 py-2 rounded-lg hover:bg-opacity-100 transition duration-300"
            >
              {showGraph ? 'Hide' : 'Show'} Dependency Graph
            </button>
          </div>
        )}

        <ul>
          {todos.map((todo: TodoWithImage) => {
            const dependencies = parseDependencies(todo.dependencies || null);
            const dependentTodos = getDependentTodos(todo.id);
            
            return (
            <li
              key={todo.id}
              id={`todo-${todo.id}`}
              className={`bg-white bg-opacity-90 p-4 mb-4 rounded-lg shadow-lg ${
                todo.dueDate && isOverdue(new Date(todo.dueDate).toISOString()) ? 'border-l-4 border-red-500' : ''
              } ${dependencies.length > 0 ? 'border-l-4 border-blue-500' : ''}`}
            >
              <div className="flex items-start space-x-4">
                {/* Image Section */}
                <div className="flex-shrink-0">
                  {todo.imageUrl && (
                    <div className="relative w-16 h-16 rounded-lg overflow-hidden bg-gray-200">
                      {loadingTodos.has(todo.id) && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600"></div>
                        </div>
                      )}
                      <Image
                        src={todo.imageUrl}
                        alt={`Visualization for: ${todo.title}`}
                        fill
                        className="object-cover"
                        onLoad={() => handleImageLoad(todo.id)}
                        onError={() => handleImageError(todo.id)}
                        sizes="64px"
                      />
                    </div>
                  )}
                </div>
                
                {/* Content Section */}
                <div className="flex-grow min-w-0">
                  <div className="flex justify-between items-start">
                    <div className="flex-grow">
                      <span className="text-gray-800 font-medium">{todo.title}</span>
                      
                      {/* Duration */}
                      {todo.duration && (
                        <span className="ml-2 text-xs bg-gray-200 px-2 py-1 rounded text-black font-medium">
                          {todo.duration}h
                        </span>
                      )}
                      
                      {/* Due Date */}
                      {todo.dueDate && (
                        <div className={`text-sm mt-1 ${
                          isOverdue(new Date(todo.dueDate).toISOString()) ? 'text-red-600 font-semibold' : 'text-gray-600'
                        }`}>
                          Due: {formatDate(new Date(todo.dueDate).toISOString())}
                          {isOverdue(new Date(todo.dueDate).toISOString()) && ' (Overdue)'}
                        </div>
                      )}
                      
                      {/* Dependencies */}
                      {dependencies.length > 0 && (
                        <div className="text-xs text-blue-600 mt-1">
                          <span className="font-semibold">Depends on:</span>
                          {dependencies.map(depId => {
                            const depTodo = getTodoById(depId);
                            return depTodo ? (
                              <span key={depId} className="ml-1 bg-blue-100 px-2 py-1 rounded">
                                {depTodo.title}
                              </span>
                            ) : null;
                          })}
                        </div>
                      )}
                      
                      {/* Dependent Tasks */}
                      {dependentTodos.length > 0 && (
                        <div className="text-xs text-green-600 mt-1">
                          <span className="font-semibold">Blocks:</span>
                          {dependentTodos.map(depTodo => (
                            <span key={depTodo.id} className="ml-1 bg-green-100 px-2 py-1 rounded">
                              {depTodo.title}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    
                    <button
                      onClick={() => handleDeleteTodo(todo.id)}
                      className="text-red-500 hover:text-red-700 transition duration-300 ml-2"
                    >
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
