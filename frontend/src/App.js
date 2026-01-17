import React, { useState, useEffect } from 'react';
import './App.css';
import TextInput from './components/TextInput';
import ProjectCards from './components/ProjectCards';
import TodoCard from './components/TodoCard';
import { AdminProvider, useAdmin } from './contexts/AdminContext';

function AppContent() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [webDevText, setWebDevText] = useState('Each field in Job Cards below are editable. TODO card holds enhancement ideas.');
  const { toggleAdmin } = useAdmin();

  useEffect(() => {
    loadProjects();
    loadWebDevText();
  }, []);

  const loadProjects = async () => {
    try {
      const response = await fetch('/api/projects');
      if (response.ok) {
        const data = await response.json();
        setProjects(data);
      }
    } catch (error) {
      console.error('Error loading projects:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadWebDevText = async () => {
    try {
      const response = await fetch('/api/settings/webdevtxt');
      if (response.ok) {
        const data = await response.json();
        setWebDevText(data.value);
      }
    } catch (error) {
      console.error('Error loading web dev text:', error);
    }
  };

  const updateWebDevText = async (newText) => {
    try {
      const response = await fetch('/api/settings/webdevtxt', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ value: newText }),
      });
      
      if (response.ok) {
        setWebDevText(newText);
      }
    } catch (error) {
      console.error('Error updating web dev text:', error);
    }
  };

  const handleTextInput = async (text) => {
    if (!text.trim()) return;

    try {
      const response = await fetch('/api/projects/parse', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text }),
      });

      if (response.ok) {
        const newProject = await response.json();
        setProjects(prev => [newProject, ...prev]);
      }
    } catch (error) {
      console.error('Error parsing text:', error);
    }
  };

  const updateProject = async (id, field, value) => {
    try {
      const response = await fetch(`/api/projects/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ [field]: value }),
      });

      if (response.ok) {
        const updatedProject = await response.json();
        setProjects(prev => prev.map(p => p.id === id ? updatedProject : p));
      }
    } catch (error) {
      console.error('Error updating project:', error);
    }
  };

  const deleteProject = async (id, password) => {
    try {
      const response = await fetch(`/api/projects/${id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ password }),
      });

      if (response.ok) {
        setProjects(prev => prev.filter(p => p.id !== id));
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to delete project');
      }
    } catch (error) {
      console.error('Error deleting project:', error);
      alert('Failed to delete project');
    }
  };

  const sendMissingDataEmail = async () => {
    try {
      const response = await fetch('/api/send-missing-data-emails', {
        method: 'POST'
      });
      
      if (response.ok) {
        const result = await response.json();
        alert(result.message);
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to send email');
      }
    } catch (error) {
      console.error('Error sending email:', error);
      alert('Failed to send email');
    }
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1 onClick={toggleAdmin}>SurveyDisco.ai</h1>
        <p>Project Management</p>
        <div 
          contentEditable 
          suppressContentEditableWarning={true}
          style={{
            fontSize: '12px', 
            opacity: '0.8', 
            fontStyle: 'italic',
            border: '1px dashed transparent',
            padding: '4px',
            borderRadius: '3px',
            cursor: 'text'
          }}
          onFocus={(e) => e.target.style.border = '1px dashed rgba(255,255,255,0.5)'}
          onBlur={(e) => {
            e.target.style.border = '1px dashed transparent';
            const newText = e.target.textContent;
            if (newText !== webDevText) {
              updateWebDevText(newText);
            }
          }}
        >
          {webDevText}
        </div>
      </header>
      <main className="App-main">
        <TextInput onSubmit={handleTextInput} />
        {loading ? (
          <div className="loading">Loading projects...</div>
        ) : (
          <>
            <ProjectCards 
              projects={projects} 
              onUpdate={updateProject}
              onDelete={deleteProject}
            />
            <TodoCard />
            <div style={{ textAlign: 'center', margin: '20px 0' }}>
              <button 
                onClick={sendMissingDataEmail}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#007bff',
                  color: 'white',
                  border: 'none',
                  borderRadius: '5px',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                Send Missing Data Email
              </button>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

function App() {
  return (
    <AdminProvider>
      <AppContent />
    </AdminProvider>
  );
}

export default App;
