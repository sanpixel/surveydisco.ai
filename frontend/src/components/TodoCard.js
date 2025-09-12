import React, { useState, useEffect } from 'react';
import './TodoCard.css';

const TodoCard = () => {
  const [todos, setTodos] = useState([]);
  const [newTodo, setNewTodo] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editValue, setEditValue] = useState('');

  useEffect(() => {
    loadTodos();
  }, []);

  const loadTodos = async () => {
    try {
      const response = await fetch('/api/todos');
      if (response.ok) {
        const data = await response.json();
        setTodos(data);
      }
    } catch (error) {
      console.error('Error loading todos:', error);
    }
  };

  const addTodo = async (e) => {
    e.preventDefault();
    if (!newTodo.trim()) return;

    try {
      const response = await fetch('/api/todos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ description: newTodo }),
      });

      if (response.ok) {
        const todo = await response.json();
        setTodos(prev => [...prev, todo]);
        setNewTodo('');
      }
    } catch (error) {
      console.error('Error adding todo:', error);
    }
  };

  const updateTodo = async (id, updates) => {
    try {
      const response = await fetch(`/api/todos/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });

      if (response.ok) {
        const updatedTodo = await response.json();
        setTodos(prev => prev.map(todo => todo.id === id ? updatedTodo : todo));
      }
    } catch (error) {
      console.error('Error updating todo:', error);
    }
  };

  const deleteTodo = async (id) => {
    try {
      const response = await fetch(`/api/todos/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setTodos(prev => prev.filter(todo => todo.id !== id));
      }
    } catch (error) {
      console.error('Error deleting todo:', error);
    }
  };

  const startEdit = (id, description) => {
    setEditingId(id);
    setEditValue(description);
  };

  const finishEdit = () => {
    if (editingId && editValue.trim()) {
      updateTodo(editingId, { description: editValue.trim() });
    }
    setEditingId(null);
    setEditValue('');
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditValue('');
  };

  return (
    <div className="todo-card">
      <div className="card-header">
        <div className="todo-title">📝 TODO</div>
        <div className="todo-count">{todos.length} items</div>
      </div>

      <div className="todo-body">
        <form onSubmit={addTodo} className="add-todo-form">
          <input
            type="text"
            value={newTodo}
            onChange={(e) => setNewTodo(e.target.value)}
            placeholder="Add new todo item..."
            className="todo-input"
          />
          <button type="submit" className="add-btn">Add</button>
        </form>

        <div className="todo-list">
          {todos.map((todo) => (
            <div key={todo.id} className={`todo-item ${todo.completed ? 'completed' : ''}`}>
              <span className="todo-number">{todo.item_number}.</span>
              
              {editingId === todo.id ? (
                <input
                  type="text"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  onBlur={finishEdit}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') finishEdit();
                    if (e.key === 'Escape') cancelEdit();
                  }}
                  className="edit-todo-input"
                  autoFocus
                />
              ) : (
                <span
                  className="todo-text"
                  onClick={() => startEdit(todo.id, todo.description)}
                  title="Click to edit"
                >
                  {todo.description}
                </span>
              )}

              <div className="todo-actions">
                <input
                  type="checkbox"
                  checked={todo.completed}
                  onChange={(e) => updateTodo(todo.id, { completed: e.target.checked })}
                  className="todo-checkbox"
                />
                <button
                  onClick={() => deleteTodo(todo.id)}
                  className="delete-todo-btn"
                  title="Delete"
                >
                  ✕
                </button>
              </div>
            </div>
          ))}
        </div>

        {todos.length === 0 && (
          <div className="empty-todos">
            No TODO items yet. Add one above to get started!
          </div>
        )}
      </div>
    </div>
  );
};

export default TodoCard;
