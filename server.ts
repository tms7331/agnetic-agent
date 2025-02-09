import express, { RequestHandler } from 'express';
import cors from 'cors';
import { HumanMessage } from "@langchain/core/messages";
import { initializeAgent } from './chatbot';

const app = express();
app.use(express.json());
app.use(cors());

// Initialize agent when server starts
let agent: any;
let config: any;

async function setupAgent() {
    try {
        const agentSetup = await initializeAgent();
        agent = agentSetup.agent;
        config = agentSetup.config;
        console.log('Agent initialized successfully');
    } catch (error) {
        console.error('Failed to initialize agent:', error);
        process.exit(1);
    }
}

// Create POST endpoint for chat interactions
const chatHandler: RequestHandler = async (req, res) => {
    try {
        const { prompt } = req.body;

        if (!prompt) {
            res.status(400).json({ error: 'Prompt is required' });
            return;
        }

        if (!agent) {
            res.status(500).json({ error: 'Agent not initialized' });
            return;
        }

        const responses: string[] = [];
        const stream = await agent.stream({ messages: [new HumanMessage(prompt)] }, config);

        for await (const chunk of stream) {
            if ("agent" in chunk) {
                responses.push(chunk.agent.messages[0].content);
            } else if ("tools" in chunk) {
                responses.push(chunk.tools.messages[0].content);
            }
        }

        res.json({ responses });
    } catch (error) {
        console.error('Chat error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

app.post('/chat', chatHandler);

const PORT = process.env.PORT || 3000;

// Initialize agent before starting server
setupAgent().then(() => {
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
});