import { Request, Response } from 'express';
import { supabase } from '../config/supabase';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { decryptApiKey } from '../services/CryptoService';

interface ChatRequest {
    query: string;
    conversationHistory?: Array<{
        role: 'user' | 'assistant';
        content: string;
    }>;
}

export class ChatController {
    private async getUserApiKey(userId: string, provider: 'GEMINI' | 'OPENAI'): Promise<string | null> {
        try {
            const { data: apiKey, error } = await supabase
                .from('user_api_keys')
                .select('encrypted_api_key')
                .eq('user_id', userId)
                .eq('provider', provider)
                .single();

            if (error || !apiKey) {
                return null;
            }

            // Decrypt the API key (backward-compatible with plaintext records)
            return decryptApiKey(apiKey.encrypted_api_key);
        } catch (error) {
            console.error(`[ChatController] Error getting ${provider} API key:`, error);
            return null;
        }
    }

    private async getProjectContext(projectId: string): Promise<string> {
        try {
            // Get project details
            const { data: project, error: projectError } = await supabase
                .from('projects')
                .select('title, one_line_summary, description, introduction')
                .eq('id', projectId)
                .single();

            if (projectError || !project) {
                return '';
            }

            // Get project documents
            const { data: documents, error: docsError } = await supabase
                .from('documents')
                .select('original_filename, content')
                .eq('project_id', projectId)
                .eq('is_active', true);

            let context = `Project: ${project.title}\n`;
            if (project.one_line_summary) context += `Summary: ${project.one_line_summary}\n`;
            if (project.description) context += `Description: ${project.description}\n`;
            if (project.introduction) context += `Introduction: ${project.introduction}\n\n`;

            if (documents && documents.length > 0) {
                context += `Project Documents:\n`;
                documents.forEach(doc => {
                    context += `\n--- ${doc.original_filename} ---\n`;
                    context += doc.content?.substring(0, 2000) || 'No content available';
                    context += '\n';
                });
            }

            return context;
        } catch (error) {
            console.error('[ChatController] Error getting project context:', error);
            return '';
        }
    }

    async chatWithProject(req: Request, res: Response) {
        try {
            const { id: projectId } = req.params;
            const { query, conversationHistory = [] }: ChatRequest = req.body;

            console.log('[ChatController] Chat request for project:', projectId);

            if (!query || query.trim().length === 0) {
                return res.status(400).json({ error: 'Query is required' });
            }

            if (query.length > 2000) {
                return res.status(400).json({ error: 'Query too long (max 2000 characters)' });
            }

            // Verify project exists and user has access
            const { data: project, error: projectError } = await supabase
                .from('projects')
                .select('id, title')
                .eq('id', projectId)
                .eq('owner_id', req.user?.id)
                .single();

            if (projectError || !project) {
                return res.status(404).json({ error: 'Project not found' });
            }

            // Get user's Gemini API key or use system default
            const userGeminiKey = await this.getUserApiKey(req.user?.id!, 'GEMINI');
            const geminiApiKey = userGeminiKey || process.env.GEMINI_API_KEY;

            if (!geminiApiKey) {
                return res.status(400).json({
                    error: 'No Gemini API key available. Please add your API key in settings.'
                });
            }

            console.log('[ChatController] Using Gemini API key:', geminiApiKey ? 'Present' : 'Missing');
            console.log('[ChatController] Key source:', userGeminiKey ? 'User' : 'System');

            // Get project context
            const projectContext = await this.getProjectContext(projectId);

            // Initialize Gemini with working model from your API key
            const genAI = new GoogleGenerativeAI(geminiApiKey);
            const model = genAI.getGenerativeModel({ model: 'models/gemini-2.5-flash' });

            // Build conversation context
            let conversationContext = '';
            if (conversationHistory.length > 0) {
                conversationContext = conversationHistory
                    .slice(-10) // Keep last 10 messages for context
                    .map(msg => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`)
                    .join('\n');
                conversationContext += '\n\n';
            }

            // Create prompt
            const prompt = `You are an AI assistant helping users understand and work with their project: "${project.title}".

Project Context:
${projectContext}

Previous Conversation:
${conversationContext}

Current User Question: ${query}

Please provide a helpful, accurate response based on the project context and conversation history. Keep it focused on the project.`;

            let answer: string;
            try {
                if (geminiApiKey) {
                    const genAI = new GoogleGenerativeAI(geminiApiKey);
                    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
                    const result = await model.generateContent(prompt);
                    answer = result.response.text();
                } else {
                    throw new Error('No Gemini key');
                }
            } catch (llmErr) {
                console.warn('[ChatController] Gemini unavailable, falling back to OpenAI...');
                if (process.env.OPENAI_API_KEY) {
                    const res = await fetch('https://api.openai.com/v1/chat/completions', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
                        },
                        body: JSON.stringify({
                            model: 'gpt-4o-mini',
                            messages: [{ role: 'user', content: prompt }],
                            max_tokens: 600
                        })
                    });
                    const json: any = await res.json();
                    answer = json.choices?.[0]?.message?.content || 'I could not generate an answer right now.';
                } else {
                    throw llmErr;
                }
            }

            console.log('[ChatController] Generated response length:', answer.length);

            res.json({
                answer,
                projectId,
                query,
                timestamp: new Date().toISOString()
            });

        } catch (error) {
            console.error('[ChatController] Error in chat:', error);
            res.status(500).json({ error: 'Failed to generate response' });
        }
    }

    async publicChatWithProject(req: Request, res: Response) {
        try {
            const { id: projectId } = req.params;
            const { query }: ChatRequest = req.body;

            console.log('[ChatController] Public chat request for project:', projectId);

            if (!query || query.trim().length === 0) {
                return res.status(400).json({ error: 'Query is required' });
            }

            // Verify project exists (no user auth required for public endpoint)
            const { data: project, error: projectError } = await supabase
                .from('projects')
                .select('id, title')
                .eq('id', projectId)
                .single();

            if (projectError || !project) {
                return res.status(404).json({ error: 'Project not found' });
            }

            // Use system Gemini API key for public chats
            const geminiApiKey = process.env.GEMINI_API_KEY;

            if (!geminiApiKey) {
                return res.status(500).json({
                    error: 'Chat service temporarily unavailable'
                });
            }

            // Get project context
            const projectContext = await this.getProjectContext(projectId);

            // Initialize Gemini with most basic model name
            const genAI = new GoogleGenerativeAI(geminiApiKey);
            const model = genAI.getGenerativeModel({ model: 'models/gemini-1.5-flash' });

            // Create prompt for public chat (simpler, no conversation history)
            const prompt = `You are a chatbot for the project: "${project.title}".

Project Information:
${projectContext}

User Question: ${query}

Please provide a helpful response about this project. Keep it concise and relevant to the project.`;

            let answer: string;
            try {
                if (geminiApiKey) {
                    const genAI = new GoogleGenerativeAI(geminiApiKey);
                    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
                    const result = await model.generateContent(prompt);
                    answer = result.response.text();
                } else {
                    throw new Error('No Gemini key');
                }
            } catch (llmErr) {
                console.warn('[ChatController] Gemini public chat failed, falling back to OpenAI...');
                if (process.env.OPENAI_API_KEY) {
                    const res = await fetch('https://api.openai.com/v1/chat/completions', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
                        },
                        body: JSON.stringify({
                            model: 'gpt-4o-mini',
                            messages: [{ role: 'user', content: prompt }],
                            max_tokens: 500
                        })
                    });
                    const json: any = await res.json();
                    answer = json.choices?.[0]?.message?.content || 'I am ready to assist with any questions about this project.';
                } else {
                    throw llmErr;
                }
            }

            res.json({
                answer,
                projectId,
                query,
                timestamp: new Date().toISOString()
            });

        } catch (error) {
            console.error('[ChatController] Error in public chat:', error);
            res.status(500).json({ error: 'Failed to generate response' });
        }
    }
}