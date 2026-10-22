import React, { useState, useEffect } from 'react';
import { AnimatePresence } from 'motion/react';
import { AgentConfig, ChatMessage } from './types';
import { INITIAL_AGENTS } from './lib/agents';
import { Navbar } from './components/Navbar';
import { Hero } from './components/Hero';
import { Capabilities } from './components/Capabilities';
import { RunYourWay } from './components/RunYourWay';
import { Footer } from './components/Footer';
import { ChatWindow } from './components/ChatWindow';
import { RunLocallyModal } from './components/RunLocallyModal';

export default function App() {
  // Load agents from storage or use default 4 agents with updated flexible prompts & live market grounding
  const [agents] = useState<AgentConfig[]>(() => {
    try {
      const saved = localStorage.getItem('openbots_agents_v11_live_market_grounding');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.some(a => a.id === 'vex' || a.id === 'byte')) {
          // Merge with latest agent definitions (names, prompts, avatars); keep only the user's custom prompt from cache
          return parsed.map((p: AgentConfig) => {
            const init = INITIAL_AGENTS.find(a => a.id === p.id);
            if (!init) return p;
            return {
              ...p,
              ...init,
              customPrompt: p.customPrompt ?? init.customPrompt
            };
          });
        }
      }
    } catch (e) {
      console.warn('Failed to parse cached agents', e);
    }
    return INITIAL_AGENTS;
  });

  // Selected agent for expanded chat view
  const [selectedAgent, setSelectedAgent] = useState<AgentConfig | null>(null);
  const [pendingPrompt, setPendingPrompt] = useState<string | undefined>(undefined);

  // Conversations history mapped by agentId
  const [conversations, setConversations] = useState<Record<string, ChatMessage[]>>(() => {
    try {
      const saved = localStorage.getItem('openbots_conversations_v6');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.warn('Failed to parse cached conversations', e);
    }
    return {};
  });

  const [isLoading, setIsLoading] = useState(false);
  const [isRunLocallyOpen, setIsRunLocallyOpen] = useState(false);

  // Persist agents
  useEffect(() => {
    try {
      localStorage.setItem('openbots_agents_v11_live_market_grounding', JSON.stringify(agents));
    } catch (e) {
      console.warn('Could not save agents to localStorage', e);
    }
  }, [agents]);

  // Persist conversations
  useEffect(() => {
    try {
      localStorage.setItem('openbots_conversations_v6', JSON.stringify(conversations));
    } catch (e) {
      console.warn('Could not save conversations to localStorage', e);
    }
  }, [conversations]);

  // Select agent to talk to (with optional initial prompt from hover popup)
  const handleSelectAgent = (agent: AgentConfig, initialPrompt?: string) => {
    setSelectedAgent(agent);
    setPendingPrompt(initialPrompt);
  };

  // Clear conversation history for an agent
  const handleClearHistory = (agentId: string) => {
    setConversations((prev) => ({
      ...prev,
      [agentId]: []
    }));
  };

  // Send message to the backend
  const handleSendMessage = async (text: string) => {
    if (!selectedAgent) return;

    const agentId = selectedAgent.id;
    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      agentId,
      text,
      timestamp: Date.now()
    };

    // Update conversation state with user message
    const currentMessages = conversations[agentId] || [];
    const updatedMessages = [...currentMessages, userMsg];

    setConversations((prev) => ({
      ...prev,
      [agentId]: updatedMessages
    }));

    setIsLoading(true);

    try {
      // Build request payload for server-side Agnes 2.5 Pro Alpha API
      const payload = {
        agentId: selectedAgent.id,
        agentName: selectedAgent.name,
        systemPrompt: selectedAgent.systemPrompt,
        customPrompt: selectedAgent.customPrompt,
        messages: updatedMessages.map((m) => ({
          role: m.sender === 'user' ? 'user' : 'assistant',
          content: m.text
        }))
      };

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const rawText = await response.text();
      let data: any = {};
      try {
        data = rawText ? JSON.parse(rawText) : {};
      } catch (parseErr) {
        data = { reply: rawText };
      }

      // If we got a reply (from xAI, Gemini, or Autonomous engine), use it
      const replyText = data.reply || (data.error ? `${data.error}${data.details ? `\n\n💡 ${data.details}` : ''}` : rawText);

      if (!replyText && !response.ok) {
        throw new Error(`Server returned HTTP ${response.status}. Please check Vercel Logs.`);
      }

      const agentMsg: ChatMessage = {
        id: `agent-${Date.now()}`,
        sender: 'agent',
        agentId,
        text: replyText || 'Agent responded.',
        timestamp: Date.now(),
        toolsUsed: data.toolsUsed
      };

      setConversations((prev) => ({
        ...prev,
        [agentId]: [...(prev[agentId] || []), agentMsg]
      }));

    } catch (err: any) {
      console.error('Chat execution failed:', err);
      const errorMsg: ChatMessage = {
        id: `err-${Date.now()}`,
        sender: 'agent',
        agentId,
        text: err.message || 'Something went wrong. Try again.',
        timestamp: Date.now(),
        error: true
      };

      setConversations((prev) => ({
        ...prev,
        [agentId]: [...(prev[agentId] || []), errorMsg]
      }));
    } finally {
      setIsLoading(false);
    }
  };

  const openRunLocally = () => setIsRunLocallyOpen(true);

  return (
    <div className="relative w-full bg-ink text-fg font-sans">

      <Navbar onOpenRunLocally={openRunLocally} />

      <main>
        {/* Hero with the four agents orbiting the source in 3D */}
        <Hero agents={agents} onSelectAgent={handleSelectAgent} onOpenRunLocally={openRunLocally} chatOpen={!!selectedAgent} />
        <Capabilities />
        <RunYourWay agents={agents} onSelectAgent={(a) => handleSelectAgent(a)} onOpenRunLocally={openRunLocally} />
      </main>

      <Footer onOpenRunLocally={openRunLocally} />

      {/* Chat window */}
      <AnimatePresence>
        {selectedAgent && (
          <ChatWindow
            agent={selectedAgent}
            messages={conversations[selectedAgent.id] || []}
            isLoading={isLoading}
            initialPrompt={pendingPrompt}
            onSendMessage={handleSendMessage}
            onClose={() => {
              setSelectedAgent(null);
              setPendingPrompt(undefined);
            }}
            onClearHistory={() => handleClearHistory(selectedAgent.id)}
          />
        )}
      </AnimatePresence>

      {/* Run Locally / Open Source Guide Modal */}
      <RunLocallyModal
        isOpen={isRunLocallyOpen}
        onClose={() => setIsRunLocallyOpen(false)}
      />
    </div>
  );
}
