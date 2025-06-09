import { useState, useEffect, useRef } from 'react';
import './App.css';

function App() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const chatEndRef = useRef(null);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim()) return;

    const userMessage = { role: 'user', text: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setMessages((prev) => [...prev, { role: 'bot', text: 'Typing...' }]);

    let fullResponse = '';

    try {
      const response = await fetch('http://localhost:11434/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'studybot',
          prompt: `
          SYSTEM: You are an AI that responds using clean HTML5. Use proper <h2>, <h3>, <table>, <tr>, <td>, <p>, <ul>, <li>, <br> tags.
          The user question is below. Please explain using:
          - Headings for main topics
          - Subheadings for subtopics
          - Use only one line break after subheading
          - Use <p> for paragraphs
          - use code <code> only for programs and equations
          - Paragraphs for definitions
          - A <table> for comparisions
          - Use <ul><li> for lists when needed
          Do NOT use Markdown.
          USER: ${input}
          `,
          stream: true
        })
      });

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let done = false;

      while (!done) {
        const { value, done: readerDone } = await reader.read();
        if (value) {
          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n').filter(Boolean);
          for (const line of lines) {
            try {
              const json = JSON.parse(line);
              if (json.response) {
                fullResponse += json.response;
                setMessages((prev) => {
                  const newMessages = [...prev];
                  newMessages.pop();
                  return [...newMessages, { role: 'bot', text: fullResponse }];
                });
              }
            } catch (err) {
              console.error('JSON parse error:', err);
            }
          }
        }
        done = readerDone;
      }

    } catch (error) {
      console.error('Error:', error);
      setMessages((prev) => {
        const newMessages = [...prev];
        newMessages.pop();
        return [...newMessages, { role: 'bot', text: '⚠️ Error connecting to LLaMA.' }];
      });
    }
  };

  return (
    <div className="chat-container">
      <div className="chat-header">StudyBot 1.0</div>
      <div className="chat-window">
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`message ${msg.role}`}
            {...(msg.role === 'bot'
              ? { dangerouslySetInnerHTML: { __html: msg.text } }
              : { children: msg.text })}
          />
        ))}
        <div ref={chatEndRef} />
      </div>
      <div className="chat-input">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type your question..."
          onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
        />
        <button onClick={sendMessage}>Send</button>
      </div>
    </div>
  );
}

export default App;
