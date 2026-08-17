const API_BASE = import.meta.env.VITE_API_URL || '';

export async function queryChat(question) {
  if (!question || question.trim() === '') {
    return { success: false, error: "Question cannot be empty." };
  }

  const url = `${API_BASE}/api/chat/query`;
  const headers = {
    'Content-Type': 'application/json',
  };

  const token = localStorage.getItem('token');
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({ question }),
    });

    let data;
    try {
      data = await res.json();
    } catch (e) {
      data = null;
    }

    if (!res.ok) {
      return { 
        success: false, 
        error: data?.error || `Failed to process your question (HTTP ${res.status})` 
      };
    }
    
    return data;
  } catch (err) {
    return { success: false, error: err.message || 'Network error' };
  }
}
